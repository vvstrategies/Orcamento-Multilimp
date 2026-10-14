# Atualização da base Multilimp

Base incorporada: vvstrategies/Or-amento-Herboclean, commit 614d349.

A integração inclui painel inicial, indicadores e gráficos, kanban comercial e funis, clientes, distribuição de lucros, financeiro redesenhado, configurações em abas, menu retrátil, navegação móvel, formulário de orçamento e propostas/PDFs A4 e celular. Os recursos estáticos são versionados no caminho para evitar arquivos antigos no cache da hospedagem.

Continuam próprios da Multilimp: dados e logo, cores, banco multilimp.sqlite, cookies, armazenamento local, configuração inicial, credenciais e vínculos externos. Sócios da instalação de origem não são cadastrados automaticamente. O primeiro administrador continua podendo ser criado pelo domínio; erros de preenchimento não consomem o limite de login.

Validação: npm test e npm run check; inspeção no navegador do painel, kanban, clientes, configurações e formulário em desktop e celular. Uma cópia do banco existente foi aberta com a atualização, preservando suas 17 configurações e as contagens dos registros comerciais. O roteiro antigo de navegador não concluiu dentro do tempo limite; a inspeção visual foi feita diretamente no Chrome em uma instalação isolada.

Na publicação, manter DATA_DIR e todas as variáveis de integração existentes. A cópia dos dados da empresa deve permanecer fora de hbuilds/public_html.

## Atualização de 14/10/2026

Base incorporada: vvstrategies/Or-amento-Herboclean, de 614d349 até 0df7e20 (oito commits).

Inclui seleção e edição em massa de origem/tags no kanban, atalhos de seleção, fotos de clientes, indicadores entre etapas, ajustes de arraste e sombras, seletores com ícones, menu com contorno e destaque, Configurações reorganizadas e Financeiro compacto com períodos automáticos e apresentação móvel.

O prefixo HBC e a migração de identidade da Herboclean foram excluídos; o prefixo MLP e todas as personalizações da Multilimp permanecem. O registro local do último backup usa uma chave própria da Multilimp. O gráfico móvel usa a cor configurada da empresa. Na validação móvel, foram corrigidos o texto do seletor de período e o espaço dos controles Realizado/Projetado.

Validação: npm test passou, incluindo edição em massa e miniaturas; npm run check passou em 107 arquivos. Uma cópia do banco de produção foi aberta e sincronizada preservando as 20 configurações existentes, 8 orçamentos, 11 versões, 7 PDFs, 6 operações, 10 clientes e 2 conexões de integração. Backup do banco realizado no diretório privado da hospedagem antes do deploy.

Verificação direta no Chrome: edição em massa em dados fictícios (2 orçamentos), organização das Configurações, Financeiro em desktop e celular de 390 px, troca automática de período e ausência de erros de console. Nenhum dado de teste foi criado na produção.
