# Integrações do Orçamento Multilimp

Esta instalação começa sem credenciais, tokens ou vínculos de serviços externos. Configure somente as integrações que a Multilimp for utilizar, por meio de variáveis privadas no ambiente do servidor.

## Configuração local

A configuração padrão é:

- APP_ORIGIN: http://localhost:3102
- Calendar e Drive: http://localhost:3102/api/google/callback
- Google Ads: http://localhost:3102/api/integrations/google-ads/callback
- Meta Ads: http://localhost:3102/api/integrations/meta-ads/callback

Em produção, substitua localhost pela URL pública HTTPS exata e cadastre novamente os callbacks no provedor correspondente.

## Variáveis

- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI e GOOGLE_CALENDAR_ID para Calendar e Drive.
- GOOGLE_TOKEN_ENCRYPTION_KEY para criptografar tokens no servidor.
- HEIGIT_API_KEY para geocodificação e cálculo de rotas.
- ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN para links de pagamento e atualizações.
- GOOGLE_ADS_CLIENT_ID e GOOGLE_ADS_CLIENT_SECRET para leitura de gastos de Google Ads.
- META_APP_ID e META_APP_SECRET para leitura de gastos de Meta Ads.

Mantenha todas as chaves no servidor. Depois de alterar variáveis, reinicie o processo. Preserve DATA_DIR e a chave de criptografia da própria instalação: não reutilize dados ou tokens de outra empresa.