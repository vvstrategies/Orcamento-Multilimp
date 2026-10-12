import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../backend/app.js';
import {Repository} from '../backend/database.js';
import {migrateServiceCatalog} from '../backend/service-catalog.js';
import {initializeInstallation,finishSetup} from '../backend/onboarding.js';
import {passwordHash,checkPassword} from '../backend/security.js';
import {modelo} from '../utils/proposta.js';
import {settings,image} from './test-company.mjs';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'universal-onboarding-'));
const origin='http://localhost:3197',system=createApp({origin,dataDir:dir});
const server=system.app.listen(3197,'127.0.0.1');await new Promise(r=>server.once('listening',r));
let cookie='',csrf='';
async function request(url,body,method=body?'POST':'GET'){
 return fetch(origin+url,{method,headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'manual'});
}
async function data(url,body,method){const r=await request(url,body,method),v=await r.json();assert.equal(r.status,200,JSON.stringify(v));return v}
try{
 const state=await data('/api/session');assert.equal(state.needsSetup,true);assert.equal(state.authenticated,false);
 const html=await(await request('/')).text();assert.ok(html.includes('Multilimp Higienização | Orçamentos e agendamentos'));
 // Logos desta instalação consolidada são assets públicos; isolamento é testado na base universal.
 assert.equal((await request('/api/onboarding')).status,401);
 const created=await request('/api/setup',{password:'universal-admin-test'});assert.equal(created.status,200);cookie=created.headers.get('set-cookie').split(';')[0];csrf=(await created.json()).csrf;
 assert.equal((await data('/api/session')).needsCompanySetup,true);
 const initial=await data('/api/onboarding');
 assert.equal(initial.settings.services.length,10);for(const s of initial.settings.services)assert.equal(s.unit,['Tapete','Limpeza de carpete'].includes(s.name)?'m²':'un.');assert.ok(initial.settings.services.some(s=>s.name==='Poltronas'));assert.equal(initial.required,true);assert.equal(initial.settings.company.name,'Multilimp Higienização');assert.equal(initial.settings.company.phone,'(19) 98152-7537');assert.equal(initial.settings.company.location,'Rua Ataulfo Alves, 451, Residencial Jaguari, 13473-676, Americana - SP');assert.equal(initial.settings.company.website,'https://multilimpsp.com.br/');assert.match(initial.settings.company.logo,/^data:image\/png;base64,/);assert.equal(initial.settings.company.primaryColor,'#07111f');assert.equal(initial.settings.company.accentColor,'#5b747a');assert.equal(initial.settings.terms.rate6,3.49);assert.equal(initial.settings.terms.fixedFee,.49);assert.equal(initial.settings.terms.installments,3);assert.equal(initial.settings.services[0].name,'Limpeza de carpete');
 for(const [url,body,method] of [
  ['/api/settings'],['/api/proposals'],['/api/pdfs/anything'],['/api/draft'],['/api/google/status'],['/api/backup'],
  ['/api/settings',settings,'PUT'],['/api/import',{version:4,proposals:[]}],['/api/google/connect',{}],
  ['/api/proposals/test/schedule',{}],['/api/preview-pdf',{}]
 ])assert.equal((await request(url,body,method)).status,428,url);
 for(const bad of [
  {...settings,company:{...settings.company,name:''}},
  {...settings,company:{...settings.company,phone:'',email:''}},
  {...settings,company:{...settings.company,primaryColor:'red'}},
  {...settings,company:{...settings.company,website:'javascript:alert(1)'}},
  {...settings,company:{...settings.company,logo:'data:image/png;base64,YWJjZA=='}},
  {...settings,company:{...settings.company,useInitials:false}},
  {...settings,services:[]},{...settings,services:[{name:' '}]},
  {...settings,terms:{...settings.terms,rate6:-1}}
 ])assert.equal((await request('/api/onboarding',bad)).status,400);
 assert.equal((await data('/api/onboarding')).required,true);
 await data('/api/logout',{});assert.equal((await request('/api/settings')).status,401);
 const login=await request('/api/login',{password:'universal-admin-test'});cookie=login.headers.get('set-cookie').split(';')[0];csrf=(await login.json()).csrf;
 assert.equal((await data('/api/onboarding')).required,true);
 const chosen={...settings,company:{...settings.company,logo:image}};
 const results=await Promise.all([request('/api/onboarding',chosen),request('/api/onboarding',chosen)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 assert.equal((await data('/api/session')).needsCompanySetup,false);
 assert.equal((await data('/api/settings')).company.name,settings.company.name);
 modelo.configure(chosen);let q=modelo.quote(chosen);q.client='Cliente de teste';q.address='Endereço de teste';q.items[0].price=200;
 q=await data('/api/proposals/'+q.id,q,'PUT');await data('/api/draft',{id:'current',quote:q},'PUT');
 const pdf=await data('/api/proposals/'+q.id+'/pdf',{revision:q.revision});
 const bytes=Buffer.from(await(await request(pdf.url)).arrayBuffer());assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
 const next={...chosen,company:{...chosen.company,name:'Horizonte Engenharia',primaryColor:'#a21caf',accentColor:'#0369a1',logo:''}};
 await data('/api/settings',next,'PUT');
 assert.equal((await data('/api/draft')).quote.company.name,'Horizonte Engenharia');
 assert.equal((await data('/api/proposals/'+q.id)).company.name,chosen.company.name);
 assert.deepEqual(Buffer.from(await(await request(pdf.url)).arrayBuffer()),bytes);
 assert.equal(system.repo.pdf(pdf.id).snapshot.company.primaryColor,chosen.company.primaryColor);
 const backup=await data('/api/backup');await data('/api/import',{...backup,settings:{...chosen,company:{...chosen.company,name:'Outra empresa'}}});
 assert.equal((await data('/api/settings')).company.name,'Horizonte Engenharia');
 const reopen=new Repository(dir);initializeInstallation(reopen);assert.equal(reopen.config('companySetup').completed,true);assert.equal(reopen.config('settings').company.name,'Horizonte Engenharia');assert.equal(reopen.list().length,2);reopen.close();
}finally{await new Promise(r=>server.close(r));system.repo.close()}

console.log('PASS: acesso inicial Multilimp, configuração obrigatória, catálogo padrão, dados isolados, PDFs históricos e configuração concorrente.');
