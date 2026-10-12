import {Jimp} from 'jimp';
import {modelo} from '../utils/proposta.js';
import {fail} from './database.js';
const U=globalThis.UniversalCompany;
export function candidate(repo){
 const previous=repo.config('settings'),c=U.normalize(previous?.company);
 return {company:c,terms:modelo.terms(),services:U.defaultServices()};
}
export function initializeInstallation(repo){
 if(repo.config('universal-onboarding-v1'))return;
 repo.transaction(()=>{
  repo.setConfig('universal-before-onboarding',{settings:repo.config('settings'),draft:repo.config('draft')});
  repo.setConfig('companySetupDraft',candidate(repo));
  repo.setConfig('universal-onboarding-v1',true);
 });
}
export const completed=repo=>repo.config('companySetup')?.completed===true;
export async function validateSettings(input){
 let company;try{company=U.validate(input.company)}catch(e){throw fail(400,e.message)}
 if(company.logo){try{const img=await Jimp.read(Buffer.from(company.logo.split(',')[1],'base64'));if(img.bitmap.width>8000||img.bitmap.height>8000)throw Error()}catch{throw fail(400,'Não foi possível abrir o logo. Envie um PNG, JPEG ou WebP válido.')}}
 const services=U.catalog(input.services);
 if(!services.length||!Array.isArray(input.services)||!input.services.length||input.services.length>100||input.services.some(s=>!s||typeof s.name!=='string'||!s.name.trim()))throw fail(400,'Cadastre pelo menos um serviço com nome.');
 if(new Set(services.map(s=>s.name.toLowerCase())).size!==services.length)throw fail(400,'Não repita nomes no catálogo de serviços.');
 const terms=modelo.normalizeTerms(input.terms);
 if(!Number.isInteger(Number(input.terms?.installments))||Number(input.terms.installments)<1||Number(input.terms.installments)>21)throw fail(400,'Informe de 1 a 21 parcelas.');
 if(!Number.isInteger(Number(input.terms?.validity))||Number(input.terms.validity)<1||Number(input.terms.validity)>365)throw fail(400,'Informe a validade entre 1 e 365 dias.');
 for(const key of ['fixedFee','rate1','rate6','rate12','rate21','anticipationRate','anticipationRate1'])if(input.terms?.[key]!=null&&(!Number.isFinite(Number(input.terms[key]))||Number(input.terms[key])<0||Number(input.terms[key])>(key==='fixedFee'?100:10)))throw fail(400,'Confira as taxas de pagamento.');
 return {company,terms,services};
}
export async function finishSetup(repo,input){
 if(completed(repo))throw fail(409,'A empresa já foi configurada. Use Configurações para alterar os dados.');
 const settings=await validateSettings(input);
 return repo.transaction(()=>{
  if(completed(repo))throw fail(409,'A configuração já foi concluída em outra aba.');
  const draft=repo.config('draft');
  if(draft?.quote){
   const meaningful=draft.quote.client||draft.quote.address||draft.quote.items?.some(i=>i.price!==''&&i.price!=null||i.photos?.length);
   draft.quote.company=settings.company;draft.quote.terms=settings.terms;
   if(!meaningful)draft.quote.items=[{...modelo.item(),service:settings.services[0].name,unit:settings.services[0].unit,description:settings.services[0].description}];
   repo.setConfig('draft',draft);
  }
  repo.setConfig('settings',settings);repo.setConfig('companySetup',{completed:true,completedAt:new Date().toISOString()});repo.setConfig('companySetupDraft',null);
  return settings;
 });
}
