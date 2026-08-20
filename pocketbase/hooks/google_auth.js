/// <reference path="../pb_data/types.d.ts" />
routerAdd(
  'POST',
  '/backend/v1/google/auth',
  (e) => {
    // identidade vem da sessao autenticada, nunca do body
    const userId = e.auth && e.auth.id
    if (!userId) return e.unauthorizedError('auth required')

    if (typeof $secrets === 'undefined') {
      return e.json(501, { error: 'Google OAuth nao esta disponivel neste deploy.' })
    }
    const clientId = $secrets.get('GOOGLE_CLIENT_ID') || ''
    const redirectUri = $secrets.get('GOOGLE_REDIRECT_URI') || ''

    if (!clientId) {
      return e.json(500, { error: 'GOOGLE_CLIENT_ID secret not configured' })
    }
    if (!redirectUri) {
      return e.json(500, { error: 'GOOGLE_REDIRECT_URI secret not configured' })
    }

    const scopes =
      'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly openid email profile'
    const authUrl =
      'https://accounts.google.com/o/oauth2/v2/auth' +
      '?client_id=' +
      encodeURIComponent(clientId) +
      '&redirect_uri=' +
      encodeURIComponent(redirectUri) +
      '&response_type=code' +
      '&scope=' +
      encodeURIComponent(scopes) +
      '&access_type=offline' +
      '&prompt=consent' +
      '&state=' +
      encodeURIComponent(userId)

    return e.json(200, { authUrl: authUrl })
  },
  $apis.requireAuth(),
)
