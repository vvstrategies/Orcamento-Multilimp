import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {createApp} from '../backend/app.js';
import {checkPassword} from '../backend/security.js';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'multilimp-access-'));
const origin='https://multilimp.example',host=new URL(origin).host;
const options={origin,production:true,dataDir:dir,encryptionKey:crypto.randomBytes(32).toString('base64')};
let system,server,base;
async function start(){
  system=createApp(options);
  server=system.app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  base='http://127.0.0.1:'+server.address().port;
}
async function stop(){await new Promise(resolve=>server.close(resolve));system.repo.close();server=null;system=null;}
async function request(url,{body,headers={},method=body?'POST':'GET'}={}){
  return new Promise((resolve,reject)=>{
    const req=http.request(base+url,{method,headers:{Host:host,Origin:origin,'Content-Type':'application/json',...headers}},res=>{
      const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('error',reject);
      res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:Object.fromEntries(Object.entries(res.headers).map(([name,value])=>[name,Array.isArray(value)?value.join(', '):value]))})));
    });
    req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
  });
}
try{
  assert.throws(()=>createApp({...options,origin:'http://multilimp.example'}),/HTTPS/);
  await start();
  assert.equal((await(await request('/api/session')).json()).needsSetup,true);
  assert.equal((await request('/api/onboarding')).status,401);
  const passwords=['multilimp-first-admin-01','multilimp-first-admin-02'];
  assert.equal((await request('/api/setup',{body:{password:passwords[0]},headers:{Origin:'https://outside.example'}})).status,403);
  assert.equal((await request('/api/setup',{body:{password:passwords[0]},headers:{Host:'outside.example'}})).status,421);
  assert.equal((await request('/api/setup',{body:{password:'short'}})).status,400);
  assert.equal(system.repo.config('adminPassword'),null);

  // Two browser tabs must never create two administrators or overwrite the winner.
  const responses=await Promise.all(passwords.map(password=>request('/api/setup',{body:{password}})));
  assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);
  const winner=responses.findIndex(response=>response.status===200),setup=responses[winner];
  const cookieHeader=setup.headers.get('set-cookie'),cookie=cookieHeader.split(';')[0];
  assert.match(cookieHeader,/^__Host-multilimp=/);
  for(const attribute of ['HttpOnly','Secure','SameSite=Lax','Path=/'])assert.ok(cookieHeader.includes(attribute),attribute);
  const session=await setup.json();
  assert.equal(session.authenticated,true);
  assert.ok(session.csrf);
  const storedHash=system.repo.config('adminPassword');
  assert.notEqual(storedHash,passwords[winner]);
  assert.equal(await checkPassword(passwords[winner],storedHash),true);
  assert.equal(await checkPassword(passwords[1-winner],storedHash),false);
  const status=await(await request('/api/session',{headers:{Cookie:cookie}})).json();
  assert.equal(status.authenticated,true);
  assert.equal(status.needsSetup,false);
  assert.equal(status.needsCompanySetup,true);
  const onboarding=await(await request('/api/onboarding',{headers:{Cookie:cookie}})).json();
  assert.equal(onboarding.settings.company.name,'Multilimp Higienização');
  assert.equal((await request('/api/logout',{body:{},headers:{Cookie:cookie}})).status,403);
  assert.equal((await request('/api/logout',{body:{},headers:{Cookie:cookie,'X-CSRF-Token':session.csrf}})).status,200);
  assert.equal((await request('/api/onboarding',{headers:{Cookie:cookie}})).status,401);

  await stop();
  await start();
  assert.equal((await(await request('/api/session')).json()).needsSetup,false);
  assert.equal((await request('/api/setup',{body:{password:'different-admin-password'}})).status,409);
  assert.equal(system.repo.config('adminPassword'),storedHash);
  assert.equal((await request('/api/login',{body:{password:passwords[1-winner]}})).status,401);
  const login=await request('/api/login',{body:{password:passwords[winner]}});
  assert.equal(login.status,200);
  assert.equal((await login.json()).authenticated,true);
  console.log('PASS: primeiro acesso pelo domínio em produção, HTTPS, origem, senha, sessão segura, concorrência, persistência e bloqueio de novo cadastro.');
}finally{
  if(server)await stop();
  fs.rmSync(dir,{recursive:true,force:true});
}
