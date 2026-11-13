import {placeFromAddress} from './address.js';
import {sameStreet} from './geocode-address.js';
// Confidence rates the provider's match, not compliance with the requested municipality.
const normalizePlace=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const postcode=value=>String(value||'').replace(/\D/g,'');
// Expand Brazilian street types before Pelias parses them ("R." can become a city fallback).
const streetTypes={r:'Rua',av:'Avenida',al:'Alameda',tv:'Travessa',trav:'Travessa',est:'Estrada',rod:'Rodovia',pca:'Praça',pç:'Praça'};
const expandStreet=value=>String(value||'').trim().replace(/^(r|av|al|tv|trav|est|rod|pca|pç)\.?\s+/i,(_,type)=>streetTypes[type.toLowerCase()]+' ');
const streetFromAddress=address=>{
 const first=expandStreet(String(address||'').split(',')[0]);
 return /^(rua|avenida|alameda|travessa|estrada|rodovia|praça|praca)\s/i.test(first)?first:'';
};
const streetKey=value=>normalizePlace(expandStreet(value)).replace(/[^\p{L}\p{N}]+/gu,' ').trim();
// Pelias may interpret a Brazilian neighborhood/CEP as a different municipality.
// Query only the structured street/number/city/UF; validate against the full address below.
export function geocodingQuery(address){
 const place=placeFromAddress(address),parts=address.split(',').map(v=>v.trim()),street=streetFromAddress(address);
 if(!place.city||!place.state||parts.length<3||!street)return address;
 const number=/^(?:n[º°o.]?\s*)?(\d+[A-Za-z]?)(?=\s|$|[-/])/i.exec(parts[1])?.[1];
 if(!number)return address;
 return [street,number,place.city,place.state,'Brasil'].join(', ');
}
export function matchesRequestedPlace(address,result){
 const expected=placeFromAddress(address),actual=result.place||{},label=placeFromAddress(result.label);
 const state=String(actual.state||label.state||'').toUpperCase().replace(/^BR-/,''),cities=[actual.city,actual.municipality,label.city].filter(Boolean).map(normalizePlace);
 if(expected.state&&state!==expected.state)return false;
 if(expected.city&&!cities.includes(normalizePlace(expected.city)))return false;
 const zip=/(?:^|[\s,])([0-9]{5}-?[0-9]{3})(?=$|[\s,])/.exec(address)?.[1];
 if(zip&&actual.postalCode&&postcode(zip)!==postcode(actual.postalCode))return false;
 // A city/state centroid cannot stand in for a street address.
 if(actual.layer&&!['address','street','venue'].includes(actual.layer))return false;
 const street=streetFromAddress(address);
 if(street){
  // Incomplete addresses cannot safely distinguish homonymous streets in different states.
  if(!expected.city||!expected.state)return false;
  const found=actual.street||String(result.label||'').split(',')[0].replace(/\s+\d+[A-Za-z]?$/,'');
  if(!sameStreet(street,found))return false;
  const requestedNumber=/^\s*(?:n[º°o.]?\s*)?(\d+[A-Za-z]?)(?=\s|$|[-/])/i.exec(String(address).split(',')[1]||'')?.[1];
  if(requestedNumber&&actual.number&&normalizePlace(requestedNumber)!==normalizePlace(actual.number))return false;
 }
 return true;
}
