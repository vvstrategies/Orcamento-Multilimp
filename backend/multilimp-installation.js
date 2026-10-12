import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {modelo} from '../utils/proposta.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const logoPath=path.join(root,'public','assets','multilimp-logo.png');

function logo(){
  return 'data:image/png;base64,'+fs.readFileSync(logoPath).toString('base64');
}

// A configuração abaixo é somente o ponto de partida da instalação Multilimp.
// A senha do administrador continua obrigatória e nunca é distribuída com o projeto.
export function seedMultilimpInstallation(repo){
  if(repo.config('multilimp-installation-v1')||repo.config('settings'))return;
  if(!fs.existsSync(logoPath))throw Error('O logotipo inicial da Multilimp não foi encontrado.');
  const company=modelo.normalizeCompany({
    name:'Multilimp Higienização',
    phone:'(19) 98152-7537',
    email:'',
    location:'Rua Ataulfo Alves, 451, Residencial Jaguari, 13473-676, Americana - SP',
    website:'https://multilimpsp.com.br/',
    tagline:'Higienização de estofados, tapetes e carpetes',
    intro:'A Multilimp Higienização apresenta uma proposta preparada para o seu atendimento.',
    benefits:'Atendimento residencial e comercial\nHigienização de estofados, tapetes e carpetes\nAtendimento em Americana e região',
    logo:logo(),
    logoBackground:'dark',
    useInitials:false,
    primaryColor:'#07111f',
    accentColor:'#5b747a',
    proposalTitle:'Proposta de Higienização',
    proposalSubtitle:'Higienização de Estofados, Tapetes e Carpetes',
    proposalPrefix:'MLP'
  });
  repo.transaction(()=>{
    repo.setConfig('settings',{company,terms:modelo.terms(),services:globalThis.UniversalCompany.defaultServices()});
    repo.setConfig('multilimp-installation-v1',true);
  });
}
