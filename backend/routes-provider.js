import {integrationError} from './integration-domain.js';
import {placeFromAddress} from './address.js';

export const HEIGIT_DEFAULT_BASE_URL='https://api.heigit.org';
const timeoutMs=10000;
const cleanBase=value=>{
 try{
  const url=new URL(value||HEIGIT_DEFAULT_BASE_URL);
  if(url.protocol!=='https:'||url.username||url.password)throw Error('invalid');
  return url.origin;
 }catch{return HEIGIT_DEFAULT_BASE_URL;}
};
const quota=response=>{
 const get=name=>typeof response?.headers?.get==='function'?response.headers.get(name):null;
 const number=name=>{const raw=get(name);const value=raw===null?null:Number(raw);return Number.isFinite(value)&&value>=0?value:null;};
 const reset=number('x-ratelimit-reset');
 return {limit:number('x-ratelimit-limit'),remaining:number('x-ratelimit-remaining'),reset};
};
const requestError=(response,body)=>{
 const status=Number(response?.status)||503;
 if(status===429)return integrationError('QUOTA',429);
 if(status===401||status===403)return integrationError('INVALID_KEY',503);
 if(status===400||status===404)return integrationError(body?.error?.code==='2010'?'NO_ROUTE':'INVALID_ADDRESS',400);
 return integrationError('EXTERNAL',503);
};
const responseBody=async response=>{try{return await response.json();}catch{return {};}};
const coordinates=value=>{
 const longitude=Number(value?.longitude??value?.[0]),latitude=Number(value?.latitude??value?.[1]);
 if(!Number.isFinite(longitude)||!Number.isFinite(latitude)||longitude<-180||longitude>180||latitude<-90||latitude>90)throw integrationError('INVALID_DATA');
 return {longitude,latitude};
};
const safeAddress=value=>{
 if(typeof value!=='string'||!value.trim()||value.length>800)throw integrationError('INVALID_ADDRESS',400);
 return value.trim().replace(/\s+/g,' ');
};

// Confidence rates the provider's match, not compliance with the requested municipality.
const normalizePlace=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const postcode=value=>String(value||'').replace(/\D/g,'');
export function matchesRequestedPlace(address,result){
 const expected=placeFromAddress(address),actual=result.place||{},label=placeFromAddress(result.label);
 const state=String(actual.state||label.state||'').toUpperCase().replace(/^BR-/,''),cities=[actual.city,actual.municipality,label.city].filter(Boolean).map(normalizePlace);
 if(expected.state&&state!==expected.state)return false;
 if(expected.city&&!cities.includes(normalizePlace(expected.city)))return false;
 const zip=/(?:^|[\s,])([0-9]{5}-?[0-9]{3})(?=$|[\s,])/.exec(address)?.[1];
 if(zip&&actual.postalCode&&postcode(zip)!==postcode(actual.postalCode))return false;
 // A city/state centroid cannot stand in for a street address.
 if(actual.layer&&!['address','street','venue'].includes(actual.layer))return false;
 return true;
}

/** Decoupled contract for providers that turn a full address into coordinates. */
export class GeocodingProvider {
 constructor(){this.id='manual';this.configured=false;}
 async geocode(){throw integrationError('NOT_CONFIGURED',503);}
}

/** Server-side Pelias client. Only the address is sent to HeiGIT. */
export class HeiGITPeliasGeocoder extends GeocodingProvider {
 constructor({apiKey='',baseUrl=HEIGIT_DEFAULT_BASE_URL,fetcher=fetch}={}){
  super();this.id='heigit_pelias';this.apiKey=String(apiKey||'').trim();this.baseUrl=cleanBase(baseUrl);this.fetcher=fetcher;this.configured=!!this.apiKey;
 }
 isValidResult(address,result){return matchesRequestedPlace(address,result);}
 async geocode(address){
  const query=safeAddress(address);
  if(!this.configured)throw integrationError('NOT_CONFIGURED',503);
  const url=new URL('/pelias/v1/search',this.baseUrl);
  url.searchParams.set('text',query);url.searchParams.set('size','5');url.searchParams.set('lang','pt');url.searchParams.set('boundary.country','BR');
  let response;
  try{response=await this.fetcher(url,{method:'GET',signal:AbortSignal.timeout(timeoutMs),redirect:'error',headers:{Authorization:this.apiKey,Accept:'application/json'}});}
  catch(error){throw integrationError(['TimeoutError','AbortError'].includes(error?.name)?'TIMEOUT':'EXTERNAL',503);}
  const body=await responseBody(response);
  if(!response?.ok)throw requestError(response,body);
  const matches=(Array.isArray(body.features)?body.features:[]).map(feature=>{
   try{
    const point=coordinates(feature?.geometry?.coordinates);
    const properties=feature?.properties||{},confidence=properties.confidence==null?null:Number(properties.confidence);
    return {coordinates:point,label:typeof properties.label==='string'?properties.label:'',confidence:Number.isFinite(confidence)?confidence:null,place:{city:properties.locality||'',municipality:properties.localadmin||'',state:properties.region_a||'',postalCode:properties.postalcode||'',layer:properties.layer||'',accuracy:properties.accuracy||''}};
   }catch{return null;}
  }).filter(Boolean);
  if(!matches.length)throw integrationError('INVALID_ADDRESS',400);
  const eligible=matches.filter(match=>this.isValidResult(query,match));
  if(!eligible.length)throw Object.assign(integrationError('AMBIGUOUS_ADDRESS',400),{message:'A localização encontrada não corresponde à cidade, ao estado ou ao CEP informado. Confira o endereço ou informe a distância manualmente.'});
  const first=eligible[0],second=eligible[1];
  if((first.confidence!==null&&first.confidence<0.4)||(second&&first.confidence!==null&&second.confidence!==null&&Math.abs(first.confidence-second.confidence)<0.02&&Math.abs(first.coordinates.longitude-second.coordinates.longitude)+Math.abs(first.coordinates.latitude-second.coordinates.latitude)>0.01))throw integrationError('AMBIGUOUS_ADDRESS',400);
  return {...first,provider:this.id,geocodedAt:new Date().toISOString(),quota:quota(response)};
 }
}

/** Decoupled contract for providers that return distance and duration from two points. */
export class RouteProvider {
 constructor(){this.id='manual';this.configured=false;}
 async route(){throw integrationError('NOT_CONFIGURED',503);}
}

/** Architectural fallback used when the attendant chooses manual distance. */
export class ManualRouteProvider extends RouteProvider {
 constructor(){super();this.id='manual';}
}

/** Server-side openrouteservice client hosted by HeiGIT. */
export class HeiGITOpenRouteServiceProvider extends RouteProvider {
 constructor({apiKey='',baseUrl=HEIGIT_DEFAULT_BASE_URL,fetcher=fetch}={}){
  super();this.id='heigit_ors';this.apiKey=String(apiKey||'').trim();this.baseUrl=cleanBase(baseUrl);this.fetcher=fetcher;this.configured=!!this.apiKey;
 }
 async route(origin,destination,{profile='driving-car'}={}){
  if(!this.configured)throw integrationError('NOT_CONFIGURED',503);
  if(profile!=='driving-car')throw integrationError('INVALID_DATA',400);
  const from=coordinates(origin),to=coordinates(destination),url=new URL('/openrouteservice/v2/directions/driving-car',this.baseUrl);
  let response;
  try{response=await this.fetcher(url,{method:'POST',signal:AbortSignal.timeout(timeoutMs),redirect:'error',headers:{Authorization:this.apiKey,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({coordinates:[[from.longitude,from.latitude],[to.longitude,to.latitude]]})});}
  catch(error){throw integrationError(['TimeoutError','AbortError'].includes(error?.name)?'TIMEOUT':'EXTERNAL',503);}
  const body=await responseBody(response);
  if(!response?.ok)throw requestError(response,body);
  const summary=body?.routes?.[0]?.summary,distanceMeters=Math.round(Number(summary?.distance)),durationSeconds=Math.round(Number(summary?.duration));
  if(!Number.isSafeInteger(distanceMeters)||distanceMeters<0||distanceMeters>20000000||!Number.isSafeInteger(durationSeconds)||durationSeconds<0)throw integrationError('INVALID_DATA');
  return {distanceMeters,durationSeconds,provider:this.id,calculatedAt:new Date().toISOString(),quota:quota(response)};
 }
}
