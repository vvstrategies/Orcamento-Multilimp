import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Jimp} from 'jimp';
import {Repository} from '../backend/database.js';
import {profileOf,profilePhotoFrom} from '../backend/avatars.js';

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'budget-profile-')),repo=new Repository(dir);
try{
 assert.equal(profileOf(repo).name,'');assert.equal(profileOf(repo).hasPhoto,false);
 repo.setConfig('user-profile',{name:'Pessoa da equipe',subtitle:'Empresa de teste'});
 assert.equal(profileOf(repo).name,'Pessoa da equipe');
 const big=new Jimp({width:900,height:500,color:0x044c3aff}),url='data:image/png;base64,'+(await big.getBuffer('image/png')).toString('base64');
 const out=await profilePhotoFrom(url),img=await Jimp.read(Buffer.from(out.split(',')[1],'base64'));
 assert.ok(out.startsWith('data:image/jpeg;base64,'));assert.equal(img.width,256);assert.equal(img.height,256);
 await assert.rejects(profilePhotoFrom('data:text/html;base64,PGI+'),e=>e.status===400);
 console.log('PASS: perfil próprio preservado, nenhuma pessoa pré-cadastrada, foto 256×256 e tipos inválidos recusados.');
}finally{repo.close();fs.rmSync(dir,{recursive:true,force:true})}
