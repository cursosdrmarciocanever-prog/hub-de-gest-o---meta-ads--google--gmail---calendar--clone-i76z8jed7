/// <reference path="../pb_data/types.d.ts" />
// Diz ao front se as credenciais do Google OAuth já foram configuradas neste
// projeto (sem expor os valores). Num template recém-duplicado elas não existem,
// então o front mostra o setup de admin em vez do botão de conectar.
routerAdd(
  'GET',
  '/backend/v1/config/status',
  (e) => {
    const userId = e.auth && e.auth.id
    if (!userId) return e.unauthorizedError('auth required')
    const id = $secrets.get('GOOGLE_CLIENT_ID') || ''
    const secret = $secrets.get('GOOGLE_CLIENT_SECRET') || ''
    const redirect = $secrets.get('GOOGLE_REDIRECT_URI') || ''
    return e.json(200, {
      google_configured: !!(id && secret && redirect),
    })
  },
  $apis.requireAuth(),
)
