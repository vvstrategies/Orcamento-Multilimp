# Atualização da base Multilimp

Base incorporada: vvstrategies/Or-amento-Herboclean, commit 614d349.

A integração inclui painel inicial, indicadores e gráficos, kanban comercial e funis, clientes, distribuição de lucros, financeiro redesenhado, configurações em abas, menu retrátil, navegação móvel, formulário de orçamento e propostas/PDFs A4 e celular. Os recursos estáticos são versionados no caminho para evitar arquivos antigos no cache da hospedagem.

Continuam próprios da Multilimp: dados e logo, cores, banco multilimp.sqlite, cookies, armazenamento local, configuração inicial, credenciais e vínculos externos. Sócios da instalação de origem não são cadastrados automaticamente. O primeiro administrador continua podendo ser criado pelo domínio; erros de preenchimento não consomem o limite de login.

Validação: npm test e npm run check; inspeção no navegador do painel, kanban, clientes, configurações e formulário em desktop e celular. Uma cópia do banco existente foi aberta com a atualização, preservando suas 17 configurações e as contagens dos registros comerciais. O roteiro antigo de navegador não concluiu dentro do tempo limite; a inspeção visual foi feita diretamente no Chrome em uma instalação isolada.

Na publicação, manter DATA_DIR e todas as variáveis de integração existentes. A cópia dos dados da empresa deve permanecer fora de hbuilds/public_html.
