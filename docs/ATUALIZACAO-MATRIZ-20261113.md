# Atualização de Multilimp Higienização — 13/11/2026

Base: `vvstrategies/Or-amento-Herboclean`, commit `72ab6d9`, de 12/11/2026. Os documentos históricos da matriz foram conferidos com o código e o histórico de commits; não são instruções para executar migrações ou copiar dados de outra empresa.

## Recursos aplicados

- Navegação superior contextual, atalhos de criação, seis abas no celular e filtros combináveis com mês atual e datas personalizadas.
- Vendas & Receita, Tráfego pago e Custos e financeiro com novas visões, tabelas responsivas, avisos fecháveis e detalhes dos atendimentos.
- Importação de contatos (Google, arquivos e aparelho quando suportado), preenchimento da ficha e deduplicação por telefone/e-mail.
- Fotos proporcionais nos PDFs A4/celular, miniaturas nos cards e perfil editável com foto.
- Comprovantes de despesas em imagem/PDF com leitura local no servidor; sugestões precisam de revisão.
- Melhorias de renovação OAuth, escopos incrementais, custos por canal/tag e contas a receber vencidas.
- Login com a marca da empresa, ícones próprios, instalação como PWA e páginas públicas de privacidade/termos.
- Página opcional `/abordagens` autenticada, sem clientes, mensagens ou campanha importados da matriz. Nenhum envio automático.
- Busca de endereços com abreviações, complemento separado, consultas alternativas e reserva OpenStreetMap quando habilitada.

## Adaptações e preservação

Não são transferidos `.env`, senhas, tokens, bancos, PDFs, clientes, perfil/foto de Gabriel, prefixo HERBO, contas externas ou redirecionamentos específicos da Herboclean. Cada instalação mantém sua função de seed, cookies, armazenamento do navegador, porta, identidade e diretório de dados. O seed só atua na instalação vazia. As chaves existentes não devem ser trocadas.

A proteção anterior contra homônimos foi mantida: rua, município, UF e CEP (se retornado pelo mapa) precisam ser compatíveis. Centro de cidade não é aceito como rua. O número retornado não pode contradizer o cadastro; precisão de rua é informada como aproximada. O cache recebe uma nova versão. Recálculos usam a origem atualmente cadastrada e preservam os custos previamente definidos; snapshots/PDFs históricos permanecem intactos.

## Configuração

As variáveis existentes continuam válidas. `GEOCODER_OSM_FALLBACK=0` desliga a reserva Nominatim; habilitada, respeita o espaçamento entre consultas e usa cache. Só endereços são enviados à geocodificação. Google Contatos requer People API e autorização adicional da própria conta ao usar a função. Nenhuma conta foi conectada automaticamente.

`APP_LEGACY_HOSTS` é opcional e fica vazio; só cadastre domínios antigos da própria empresa. Mantenha o `DATA_DIR` persistente e exclusivo, `APP_ORIGIN`, callbacks e a chave de criptografia já utilizados.

## Validação e publicação

`npm run check`, `npm test` e os testes específicos da empresa verificam domínio, dados, PDFs, OAuth, contatos, filtros, perfil, OCR, rotas e isolamento da marca. Os testes usam dados temporários e integrações simuladas. O teste real de rota da PJ usa apenas os endereços de validação, sem gerar orçamento.

O relatório do Git registra a versão de código; a atualização no repositório não comprova por si só a implantação na Hostinger. No painel, publique o novo commit de `main`, preserve todas as variáveis e confirme `/api/health`, login, manifesto e cálculo da sede. Para reverter o código, use o commit anterior; preserve os dados persistentes e os backups.
