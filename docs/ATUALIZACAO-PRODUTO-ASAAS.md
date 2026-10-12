# Pagamentos Asaas

Quando ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN são configurados no servidor, cada orçamento pode gerar links PIX e cartão. O valor PIX mantém a base comercial; o cartão usa as taxas configuradas nas condições da proposta.

O webhook deve apontar para APP_ORIGIN/api/webhooks/asaas e usar o mesmo token definido no servidor. Não inclua chaves da Asaas em arquivos públicos ou no Git.