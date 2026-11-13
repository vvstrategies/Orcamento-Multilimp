import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createApp} from '../backend/app.js';
import {modelo} from '../utils/proposta.js';

const product=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url))).name.replace('orcamento-','');
const name=product==='pj'?'PJ Higienização':'Multilimp Higienização';
const prefix=product==='pj'?'PJ':'MLP';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),product+'-upgrade-'));
let system,server;
try{
 system=createApp({dataDir:dir,origin:'http://localhost:3000'});
 assert.equal(system.repo.config('settings').company.name,name);
 assert.equal(system.repo.config('settings').company.proposalPrefix,prefix);
 assert.equal(system.repo.config('user-profile'),null);
 assert.equal(system.repo.list().length,0);
 const settings=system.repo.config('settings');settings.company.phone='(11) 90000-1234';
 system.repo.setConfig('settings',settings);
 system.repo.setConfig('adminPassword',{salt:'unchanged-salt',hash:'unchanged-hash'});
 system.repo.setConfig('user-profile',{name:'Administrador próprio',subtitle:name});
 const q=modelo.quote(settings);q.client='Cliente preservado';q.items=[{...modelo.item('Sofá'),price:250}];
 const saved=system.repo.saveProposal(q);
 const before=JSON.stringify(system.repo.proposal(saved.id));
 system.repo.close();system=createApp({dataDir:dir,origin:'http://localhost:3000'});
 assert.equal(JSON.stringify(system.repo.proposal(saved.id)),before);
 assert.deepEqual(system.repo.config('settings'),settings);
 assert.equal(system.repo.config('adminPassword').hash,'unchanged-hash');
 assert.equal(system.repo.config('user-profile').name,'Administrador próprio');
 assert.equal(system.repo.config('herboclean-profile-v1'),null);
 assert.equal(system.repo.config('abordagens-bf-2026'),null);
 server=system.app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const get=p=>new Promise((resolve,reject)=>{const req=http.get({host:'127.0.0.1',port:server.address().port,path:p,headers:{Host:'localhost:3000'}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});req.on('error',reject);});
 const manifest=await (await get('/manifest.webmanifest')).json();assert.ok(manifest.name.includes(name));
 assert.ok(!JSON.stringify(manifest).includes('Herboclean'));
 for(const icon of manifest.icons){const r=await get(icon.src);assert.equal(r.status,200,icon.src);assert.ok(r.headers.get('content-type').startsWith('image/png'));}
 const html=await (await get('/')).text();assert.ok(html.includes(name));assert.ok(!/herboclean|gabriel/i.test(html));
 for(const [,asset] of html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css|png|jpg))"/g)){
  if(/^https?:/.test(asset))continue;
  assert.equal((await get('/'+asset.replace(/^\//,''))).status,200,asset);
 }
 const privacy=await (await get('/privacidade')).text();assert.ok(privacy.includes(name));
 assert.equal((await get('/api/clients')).status,401);
 console.log('PASS: atualização preserva marca, senha, perfil, cliente, prefixo e configurações; PWA/assets válidos e APIs privadas.');
}finally{if(server)await new Promise(r=>server.close(r));system?.repo.close();fs.rmSync(dir,{recursive:true,force:true});}
