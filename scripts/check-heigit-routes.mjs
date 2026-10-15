import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Repository,hash} from '../backend/database.js';
import {migrateFinance} from '../backend/finance-migration.js';
import {RouteCache} from '../backend/route-cache.js';
import {FinanceService} from '../backend/finance-service.js';
import {HeiGITPeliasGeocoder,HeiGITOpenRouteServiceProvider} from '../backend/routes-provider.js';
import {addressKey,calculateEstimate,defaultEstimateInput,defaultFinancialSettings,snapshotAssumptions} from '../backend/finance-domain.js';
import {modelo} from '../utils/proposta.js';
import {settings as company,fees} from './test-company.mjs';

const headers=values=>({get:name=>values[name.toLowerCase()]??null});
let geocodeCalls=0,directionsCalls=0;
const geocoder=new HeiGITPeliasGeocoder({apiKey:'HEIGIT-TEST-KEY',fetcher:async(url,request)=>{
 geocodeCalls++;assert.equal(url.origin,'https://api.heigit.org');assert.equal(url.pathname,'/pelias/v1/search');assert.equal(request.method,'GET');assert.equal(request.headers.Authorization,'HEIGIT-TEST-KEY');assert.equal(url.searchParams.get('boundary.country'),'BR');
 const text=url.searchParams.get('text');const coordinates=text.includes('Empresa')?[-46.7001,-23.5001]:[-46.8002,-23.6002];
 return {ok:true,status:200,headers:headers({'x-ratelimit-limit':'1000','x-ratelimit-remaining':'999','x-ratelimit-reset':'12345'}),json:async()=>({features:[{geometry:{coordinates},properties:{label:text,confidence:0.9}}]})};
}});
const routes=new HeiGITOpenRouteServiceProvider({apiKey:'HEIGIT-TEST-KEY',fetcher:async(url,request)=>{
 directionsCalls++;assert.equal(url.origin,'https://api.heigit.org');assert.equal(url.pathname,'/openrouteservice/v2/directions/driving-car');assert.equal(request.method,'POST');assert.equal(request.headers.Authorization,'HEIGIT-TEST-KEY');
 const body=JSON.parse(request.body);assert.deepEqual(body,{coordinates:[[-46.7001,-23.5001],[-46.8002,-23.6002]]});
 return {ok:true,status:200,headers:headers({'x-ratelimit-limit':'2000','x-ratelimit-remaining':'1999','x-ratelimit-reset':'12345'}),json:async()=>({routes:[{summary:{distance:18000,duration:2400}}]})};
}});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'heigit-routes-')),repo=new Repository(dir);migrateFinance(repo);
try{
 const cache=new RouteCache(repo,routes,{geocoder,directionsDailyLimit:10,geocodingDailyLimit:10,ttlHours:24});
 const origin='Empresa, Rua Um, 10, São Paulo - SP, Brasil',destination='Cliente, Rua Dois, 20, Osasco - SP, Brasil';
 const first=await cache.get(origin,destination,{originRef:{type:'company',id:'operational'},destinationRef:{type:'proposal',id:'proposal-a'}});
 assert.equal(first.cached,false);assert.equal(first.provider,'heigit_ors');assert.equal(first.oneWayDistanceMeters,18000);assert.deepEqual(first.originCoordinatesSnapshot,{longitude:-46.7001,latitude:-23.5001});assert.deepEqual(first.destinationCoordinatesSnapshot,{longitude:-46.8002,latitude:-23.6002});assert.equal(geocodeCalls,2);assert.equal(directionsCalls,1);
 const cached=await cache.get('  EMPRESA, Rua Um, 10, São Paulo - SP, Brasil ','Cliente, Rua Dois, 20, Osasco - SP, Brasil',{originRef:{type:'company',id:'operational'},destinationRef:{type:'proposal',id:'proposal-a'}});
 assert.equal(cached.cached,true);assert.equal(geocodeCalls,2);assert.equal(directionsCalls,1);
 const forced=await cache.get(origin,destination,{force:true,originRef:{type:'company',id:'operational'},destinationRef:{type:'proposal',id:'proposal-a'}});
 assert.equal(forced.cached,false);assert.equal(geocodeCalls,2);assert.equal(directionsCalls,2);
 await cache.rememberCompany(origin);assert.equal(geocodeCalls,2);
 const changed='Cliente, Rua Três, 30, Osasco - SP, Brasil';await cache.get(origin,changed,{originRef:{type:'company',id:'operational'},destinationRef:{type:'proposal',id:'proposal-a'}});assert.equal(geocodeCalls,3);assert.equal(directionsCalls,3);
 const status=cache.status();assert.equal(status.usage.directionsExternal,3);assert.equal(status.usage.geocodingExternal,3);assert.ok(status.usage.cacheHits>=3);assert.equal(status.usage.manualRecalculations,1);assert.equal(status.quotas.find(x=>x.kind==='directions').remaining,1999);
 const q=modelo.quote({...company,terms:fees});q.client='Teste';q.address=destination;q.items=[{...modelo.item('Sofá'),price:200}];
 const assumptions=snapshotAssumptions({...defaultFinancialSettings(),roundTrip:true,vehicle:{...defaultFinancialSettings().vehicle,consumptionCentiKmL:1150,fuelPriceCents:600}},q.company);
 const estimate=calculateEstimate(q,assumptions,{...defaultEstimateInput(),distanceMode:'automatic',routeId:first.id},{distanceMeters:18000,durationSeconds:2400});
 assert.equal(estimate.distanceMeters,18000);assert.equal(estimate.totalDistanceMeters,36000);
 await assert.rejects(new HeiGITOpenRouteServiceProvider({apiKey:'x',fetcher:async()=>({ok:false,status:429,headers:headers({}),json:async()=>({})})}).route({longitude:0,latitude:0},{longitude:1,latitude:1}),e=>e.status===429);
 for(const statusCode of [401,403,500])await assert.rejects(new HeiGITOpenRouteServiceProvider({apiKey:'x',fetcher:async()=>({ok:false,status:statusCode,headers:headers({}),json:async()=>({})})}).route({longitude:0,latitude:0},{longitude:1,latitude:1}),e=>e.status===503);
 await assert.rejects(new HeiGITPeliasGeocoder({apiKey:'x',fetcher:async()=>{const error=Error('timeout');error.name='TimeoutError';throw error;}}).geocode(origin),e=>e.status===503);
 await assert.rejects(new HeiGITOpenRouteServiceProvider().route({longitude:0,latitude:0},{longitude:1,latitude:1}),e=>e.status===503);
 const manual=calculateEstimate(q,assumptions,{...defaultEstimateInput(),distanceMode:'manual',manualDistanceMeters:18000});assert.equal(manual.totalDistanceMeters,36000);
 const retryOrigin='Empresa Retry, Rua Um, 10, São Paulo - SP, Brasil',retryDestination='Cliente Retry, Rua Quatro, 40, Osasco - SP, Brasil';
 let retryGeocodes=0,retryDirections=0;
 const retryGeocoder={id:'retry-geocoder',configured:true,geocode:async address=>{retryGeocodes++;return {coordinates:address.includes('Empresa')?{longitude:-46.7,latitude:-23.5}:{longitude:-46.8,latitude:-23.6}};}};
 const retryProvider={id:'retry-routes',configured:true,route:async()=>{retryDirections++;return {distanceMeters:retryDirections===1?0:9600,durationSeconds:retryDirections===1?0:1200,provider:'retry-routes'};}};
 const retryCache=new RouteCache(repo,retryProvider,{geocoder:retryGeocoder,directionsDailyLimit:10,geocodingDailyLimit:10});
 const retried=await retryCache.get(retryOrigin,retryDestination,{originRef:{type:'company',id:'retry-company'},destinationRef:{type:'proposal',id:'retry-proposal'}});
 assert.equal(retried.distanceMeters,9600);assert.equal(retryDirections,2);assert.equal(retryGeocodes,4);
 const cachedDestination='Cliente Cache, Rua Cinco, 50, Osasco - SP, Brasil',cachedKey=hash(JSON.stringify([retryProvider.id,addressKey(retryOrigin),addressKey(cachedDestination),{profile:'driving-car'}]));
 repo.db.prepare('INSERT INTO finance_routes VALUES (?,?,?,?)').run('legacy-zero-route',cachedKey,JSON.stringify({id:'legacy-zero-route',distanceMeters:0,durationSeconds:0}),new Date().toISOString());
 const rebuilt=await retryCache.get(retryOrigin,cachedDestination,{originRef:{type:'company',id:'retry-company'},destinationRef:{type:'proposal',id:'retry-cache'}});
 assert.equal(rebuilt.distanceMeters,9600);assert.equal(retryDirections,3);assert.equal(repo.db.prepare('SELECT id FROM finance_routes WHERE id=?').get('legacy-zero-route'),undefined);
 // A high confidence homonym in another state must lose to the correct municipality.
 const office='Rua Ataulfo Alves, 451, Residencial Jaguari, 13473-676, Americana - SP';
 const client='Avenida de Teste, 100, Campinas - SP, 13045-603, Brasil';
 const feature=(point,properties)=>({geometry:{coordinates:point},properties});
 const wrong=feature([-48.798491,-26.278708],{label:'Rua Ataulfo Alves 451, Santa Catarina, Brasil',confidence:1,region_a:'SC',localadmin:'Joinville',locality:'Santa Catarina',postalcode:'89228-261',layer:'address'});
 const correct=feature([-47.3093,-22.71723],{label:'Rua Ataulfo Alves, Americana, SP, Brasil',confidence:0.8,region_a:'SP',locality:'Americana',layer:'street',accuracy:'centroid'});
 const otherCity=feature([-47.756432,-21.187409],{label:'Rua Ataulfo Alves, Ribeirão Preto, SP, Brasil',confidence:0.8,region_a:'SP',locality:'Ribeirão Preto',layer:'street'});
 const destinationFeature=feature([-47.036554,-22.928011],{label:'Avenida de Teste 100, Campinas, SP, Brasil',confidence:1,region_a:'SP',locality:'Campinas',postalcode:'13045-603',layer:'address'});
 const reply=features=>({ok:true,status:200,headers:headers({}),json:async()=>({features})});
 let strictCalls=0;
 const strictGeo=new HeiGITPeliasGeocoder({apiKey:'TEST',fetcher:async url=>{strictCalls++;return reply(url.searchParams.get('text').includes('Ataulfo')?[wrong,correct,otherCity]:[destinationFeature]);}});
 const checked=await strictGeo.geocode(office);assert.deepEqual(checked.coordinates,{longitude:-47.3093,latitude:-22.71723});assert.equal(checked.place.city,'Americana');
 for(const features of [[wrong],[otherCity],[{...correct,properties:{...correct.properties,postalcode:'99999-999'}}],[{...correct,properties:{...correct.properties,layer:'locality'}}]]){
  await assert.rejects(new HeiGITPeliasGeocoder({apiKey:'TEST',fetcher:async()=>reply(features)}).geocode(office),e=>e.integrationCode==='AMBIGUOUS_ADDRESS');
 }
 // Old geocoding AND route cache entries are invalidated; a normal route refresh cannot perpetuate them.
 const wrongPoint={longitude:-48.798491,latitude:-26.278708},destinationPoint={longitude:-47.036554,latitude:-22.928011};
 const strictRoutes={id:'strict-routes',configured:true,route:async(from,to)=>{assert.deepEqual(from,checked.coordinates);assert.deepEqual(to,destinationPoint);return {distanceMeters:41000,durationSeconds:3000};}};
 const strictCache=new RouteCache(repo,strictRoutes,{geocoder:strictGeo,directionsDailyLimit:100,geocodingDailyLimit:100});
 const stale={addressKey:addressKey(office),addressSnapshot:office,coordinates:wrongPoint,label:wrong.properties.label,confidence:1};
 strictCache.geocodes.save('address',addressKey(office),addressKey(office),stale);strictCache.geocodes.save('company','operational',addressKey(office),stale);
 const badRoute={id:'wrong-state-route',origin:office,destination:client,originCoordinatesSnapshot:wrongPoint,destinationCoordinatesSnapshot:destinationPoint,distanceMeters:600870,durationSeconds:27660};
 const strictKey=hash(JSON.stringify([strictRoutes.id,addressKey(office),addressKey(client),{profile:'driving-car'}]));repo.db.prepare('INSERT INTO finance_routes VALUES (?,?,?,?)').run(badRoute.id,strictKey,JSON.stringify(badRoute),new Date().toISOString());
 assert.equal(strictCache.isCurrent(badRoute),false);
 const repaired=await strictCache.get(office,client);assert.equal(repaired.distanceMeters,41000);assert.equal(strictCalls,3);assert.equal(strictCache.isCurrent(repaired),true);assert.equal(strictCache.isCurrent(badRoute),false);
 const reused=await strictCache.get(office,client);assert.equal(reused.cached,true);assert.equal(strictCalls,3);
 // Generated estimates based on the wrong coordinates need refreshing. Manual choices remain untouched.
 const finance=new FinanceService(repo,null,strictRoutes,{geocoder:strictGeo});const saved=repo.saveProposal({...q,address:client});
 const a={...assumptions,originAddressSnapshot:office};
 await finance.record(saved.id,saved,a,{...defaultEstimateInput(),distanceMode:'automatic'},badRoute);assert.equal(finance.view(saved.id).routeNeedsRefresh,true);
 await finance.record(saved.id,saved,a,{...defaultEstimateInput(),distanceMode:'manual',manualDistanceMeters:41000},null);
 const manualBefore=JSON.stringify(finance.latest(saved.id));assert.equal(finance.view(saved.id).routeNeedsRefresh,false);await finance.refreshAutomatically(saved.id);assert.equal(JSON.stringify(finance.latest(saved.id)),manualBefore);assert.equal(strictCalls,3);
 // Regression: the current commercial version has no finance snapshot and an older
 // scheduled estimate still holds the wrong SC origin, even after the geocode cache was fixed.
 repo.setConfig('settings',{...company,company:{...company.company,location:office}});
 finance.saveSettings({...a,originMode:'company',originAddress:''});
 const scheduledQuote=modelo.quote({...company,terms:fees});scheduledQuote.client='Rota antiga agendada';scheduledQuote.address=client;scheduledQuote.items=[{...modelo.item('Sofá'),quantity:1,price:300}];
 const initial=repo.saveProposal(scheduledQuote),extras={...defaultEstimateInput(),distanceMode:'automatic',materialOverrideCents:2400,tollCents:850,parkingCents:500,otherDirectCosts:[{description:'Ajudante',amountCents:5000}]};
 await finance.record(initial.id,initial,a,extras,badRoute);const frozen=finance.latest(initial.id),frozenJson=JSON.stringify(frozen);
 const revised=repo.saveProposal({...initial,items:[{...initial.items[0],quantity:2}]});assert.equal(repo.currentVersion(initial.id).financialSnapshot,null);
 const operation=repo.setOperation({id:initial.id,status:'scheduled',schedule:{start:'2026-10-15T11:30:00Z',eventId:'keep-calendar-event'}}),operationJson=JSON.stringify(operation);
 // A route repair must not silently adopt later vehicle/material settings.
 finance.saveSettings({...finance.settings(),defaultMaterialBps:4000,vehicle:{...a.vehicle,fuelPriceCents:990}});
 let scheduledView=finance.view(initial.id);assert.equal(scheduledView.editable,false);assert.equal(scheduledView.stale,true);assert.equal(scheduledView.routeNeedsRefresh,true);assert.equal(scheduledView.canRefreshAutomatically,true);
 scheduledView=await finance.refreshAutomatically(initial.id);
 assert.equal(scheduledView.latest.version,frozen.version+1);assert.equal(scheduledView.latest.proposalRevision,revised.revision);assert.equal(scheduledView.stale,false);assert.equal(scheduledView.routeNeedsRefresh,false);assert.equal(scheduledView.canRefreshAutomatically,false);
 assert.equal(scheduledView.latest.result.distanceMeters,41000);assert.equal(scheduledView.latest.result.revenue,60000);assert.deepEqual(scheduledView.latest.assumptions.vehicle,frozen.assumptions.vehicle);assert.equal(scheduledView.latest.inputs.materialOverrideCents,2400);assert.equal(scheduledView.latest.inputs.tollCents,850);assert.deepEqual(scheduledView.latest.inputs.otherDirectCosts,extras.otherDirectCosts);
 assert.equal(scheduledView.latest.correction.previousEstimateId,frozen.id);assert.equal(JSON.stringify(scheduledView.previous),frozenJson);assert.equal(repo.db.prepare('SELECT data FROM finance_estimates WHERE id=?').get(frozen.id).data,frozenJson);assert.equal(JSON.stringify(repo.operation(initial.id)),operationJson);assert.equal(repo.requireProposal(initial.id).revision,revised.revision);
 assert.equal((await finance.refreshAutomatically(initial.id)).latest.id,scheduledView.latest.id);
 // Completed/cancelled/manual records and scheduling in progress remain frozen.
 for(const status of ['completed','cancelled','scheduled']){
  repo.setOperation({...operation,status});await finance.record(initial.id,revised,a,extras,badRoute);
  if(status==='scheduled')repo.setJob(initial.id,{intent:'reschedule'});
  const before=JSON.stringify(finance.latest(initial.id));assert.equal(finance.view(initial.id).canRefreshAutomatically,false);await finance.refreshAutomatically(initial.id);assert.equal(JSON.stringify(finance.latest(initial.id)),before);
 }
 repo.db.prepare('DELETE FROM sync_jobs WHERE proposal_id=?').run(initial.id);
 await finance.record(initial.id,revised,a,{...extras,distanceMode:'manual',manualDistanceMeters:9000},null);
 const manualScheduled=JSON.stringify(finance.latest(initial.id));await finance.refreshAutomatically(initial.id);assert.equal(JSON.stringify(finance.latest(initial.id)),manualScheduled);
 // Cancellation or another estimate while the external route is pending must win.
 await finance.record(initial.id,revised,a,extras,badRoute);repo.db.prepare('DELETE FROM finance_routes').run();
 let releaseRoute;strictRoutes.route=async()=>new Promise(resolve=>{releaseRoute=()=>resolve({distanceMeters:41000,durationSeconds:3000});});
 const pending=finance.refreshAutomatically(initial.id);for(let i=0;i<30&&!releaseRoute;i++)await new Promise(resolve=>setTimeout(resolve,0));assert.equal(typeof releaseRoute,'function');
 const beforeCancel=JSON.stringify(finance.latest(initial.id));repo.setOperation({...operation,status:'cancelled'});releaseRoute();await pending;assert.equal(JSON.stringify(finance.latest(initial.id)),beforeCancel);
 repo.setOperation(operation);repo.db.prepare('DELETE FROM finance_routes').run();releaseRoute=null;
 const concurrent=finance.refreshAutomatically(initial.id);for(let i=0;i<30&&!releaseRoute;i++)await new Promise(resolve=>setTimeout(resolve,0));assert.equal(typeof releaseRoute,'function');
 await finance.record(initial.id,revised,a,{...extras,distanceMode:'manual',manualDistanceMeters:7000},null);const manualDuring=JSON.stringify(finance.latest(initial.id));releaseRoute();await concurrent;assert.equal(JSON.stringify(finance.latest(initial.id)),manualDuring);
 // Provider failures leave the old evidence intact and keep the route marked invalid.
 await finance.record(initial.id,revised,a,extras,badRoute);repo.db.prepare('DELETE FROM finance_routes').run();strictRoutes.route=async()=>{throw Error('route unavailable');};
 const failedBefore=JSON.stringify(finance.latest(initial.id)),failedView=await finance.refreshAutomatically(initial.id);assert.equal(failedView.routeNeedsRefresh,true);assert.equal(failedView.autoRouteError,'route unavailable');assert.equal(JSON.stringify(finance.latest(initial.id)),failedBefore);
 console.log('PASS: rota inválida de agendado corrigida em nova versão; histórico, premissas e custos manuais preservados; falhas e concorrência não sobrescrevem dados.');
 console.log('PASS: homônimo em outro estado/cidade/CEP rejeitado, cache incorreto invalidado, rota corrigida e distância manual preservada.');
 console.log('PASS: HeiGIT Pelias/openrouteservice, ordem longitude-latitude, cache, recálculo, quotas, erros e ida/volta.');
}finally{repo.close();fs.rmSync(dir,{recursive:true,force:true});}
