# Google Agenda e Drive da Multilimp

1. No projeto Google Cloud da Multilimp, ative Google Calendar API e Google Drive API.
2. Configure um cliente OAuth do tipo Aplicativo da Web.
3. Cadastre o redirecionamento autorizado exatamente como a variável GOOGLE_REDIRECT_URI do servidor.
   - Produção: https://green-chinchilla-997762.hostingersite.com/api/google/callback
   - Local: http://localhost:3102/api/google/callback
4. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET com as credenciais desse cliente. GOOGLE_CALENDAR_ID=primary usa a agenda principal da conta conectada.
5. Mantenha GOOGLE_TOKEN_ENCRYPTION_KEY estável entre publicações. As credenciais e essa chave ficam somente nas variáveis do servidor.
6. No aplicativo, abra Configurações → Integrações → Conectar Google e autorize a conta da Multilimp.

Google Ads utiliza a conexão separada em Configurações → Integrações e o callback /api/integrations/google-ads/callback no mesmo domínio. Configure as credenciais em GOOGLE_ADS_CLIENT_ID e GOOGLE_ADS_CLIENT_SECRET.

Se o Google retornar redirect_uri_mismatch, confira o domínio, HTTPS, caminho completo e ausência de barra adicional no redirecionamento autorizado. O valor deve coincidir exatamente com o enviado pelo aplicativo.
