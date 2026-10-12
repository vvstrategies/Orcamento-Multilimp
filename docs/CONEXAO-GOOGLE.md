# Conexão Google

Cadastre um cliente OAuth do tipo Aplicativo Web para esta instalação. Habilite Google Calendar API e Google Drive API no projeto correspondente.

Com APP_ORIGIN=http://localhost:3102, o callback é:

http://localhost:3102/api/google/callback

Em produção, use a URL HTTPS pública exata seguida de /api/google/callback. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI e GOOGLE_CALENDAR_ID somente no ambiente do servidor.

No aplicativo, abra Configurações e conecte a conta Google. Os tokens ficam criptografados no diretório de dados desta instalação; não copie banco ou chave de outra empresa.