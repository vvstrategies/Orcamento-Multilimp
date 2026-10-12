# Orçamento Multilimp

Sistema da Multilimp Higienização para criar orçamentos com fotos, gerar PDFs, acompanhar propostas, calcular rentabilidade, agendar serviços e integrar pagamentos e calendários.

Esta é uma instalação independente, iniciada sem senha, propostas, PDFs, conexões externas ou credenciais de outra empresa.

## Início local

1. Instale Node.js 24 ou superior.
2. Copie .env.example para .env e defina somente as variáveis que a instalação utilizará.
3. Execute npm ci.
4. Execute npm start.
5. Abra http://localhost:3102.

No primeiro acesso, defina uma senha de administrador. Em seguida, revise a identidade já preenchida da Multilimp Higienização antes de começar a criar propostas.

## Dados iniciais da empresa

- Multilimp Higienização
- Telefone: (19) 98152-7537
- Endereço: Rua Ataulfo Alves, 451, Residencial Jaguari, 13473-676, Americana - SP
- Site: https://multilimpsp.com.br/

O logo fornecido fica em public/assets/multilimp-logo.png. A identidade pode ser ajustada depois em Configurações, sem alterar código ou PDF.

## Serviços disponíveis

O catálogo inicial mantém os serviços de higienização: limpeza de carpete, cadeiras estofadas, colchão, sofá, poltronas, banco automotivo, tapete, persiana, cortinas e impermeabilização. Carpetes e tapetes usam m²; os demais usam unidade.

## Dados e segurança

O banco SQLite, PDFs, sessões, chaves locais e integrações ficam em data, diretório ignorado pelo Git. Não copie o diretório de dados de outra empresa para esta instalação.

As credenciais de Google, Asaas, HeiGIT, Google Ads e Meta Ads são opcionais e devem ser cadastradas somente no arquivo .env privado ou no gerenciador de secrets da hospedagem. Nunca as inclua no Git.

## Integrações

Consulte INTEGRATIONS_SETUP.md para configurar Google Calendar e Drive, Asaas, rotas HeiGIT/openrouteservice, Google Ads e Meta Ads. Os callbacks locais usam a origem configurada em APP_ORIGIN. Com a configuração padrão, eles começam em http://localhost:3102.

## Verificação

- npm run check valida a sintaxe.
- npm test valida orçamento, PDF, sessão, financeiro, rotas, integrações e pagamentos com dados de teste.

Para publicar, use armazenamento persistente, HTTPS e APP_ORIGIN com a URL pública exata. O diretório DATA_DIR e a chave GOOGLE_TOKEN_ENCRYPTION_KEY precisam permanecer estáveis após a primeira conexão Google.