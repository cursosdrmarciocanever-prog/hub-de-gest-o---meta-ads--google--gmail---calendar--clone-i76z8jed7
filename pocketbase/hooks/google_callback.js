/// <reference path="../pb_data/types.d.ts" />
routerAdd('GET', '/backend/v1/google/callback', (e) => {
  const code = e.requestInfo().query['code'] || ''
  const error = e.requestInfo().query['error'] || ''
  const state = e.requestInfo().query['state'] || ''

  if (error) {
    return e.html(
      200,
      '<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Erro: ' +
        error +
        '</h2><p>' +
        (e.requestInfo().query['error_description'] || '') +
        '</p><script>setTimeout(function(){window.close()},3000);</script></body></html>',
    )
  }

  if (!code) {
    return e.html(
      200,
      '<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Codigo de autorizacao nao recebido</h2></body></html>',
    )
  }

  const clientId = $secrets.get('GOOGLE_CLIENT_ID') || ''
  const clientSecret = $secrets.get('GOOGLE_CLIENT_SECRET') || ''
  const redirectUri = $secrets.get('GOOGLE_REDIRECT_URI') || ''

  if (!clientId || !clientSecret || !redirectUri) {
    return e.html(
      200,
      '<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Erro de configuracao</h2><p>As credenciais do Google nao estao configuradas no servidor. Contate o administrador.</p></body></html>',
    )
  }

  // Exchange code for tokens
  const tokenResp = $http.send({
    url: 'https://oauth2.googleapis.com/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:
      'code=' +
      code +
      '&client_id=' +
      clientId +
      '&client_secret=' +
      clientSecret +
      '&redirect_uri=' +
      redirectUri +
      '&grant_type=authorization_code',
    timeout: 30,
  })

  const tokenData = tokenResp.json || {}

  if (tokenData.error) {
    return e.html(
      200,
      '<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>Erro: ' +
        tokenData.error +
        '</h2><p>' +
        (tokenData.error_description || '') +
        '</p></body></html>',
    )
  }

  // Get user info
  const userResp = $http.send({
    url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    method: 'GET',
    headers: { Authorization: 'Bearer ' + tokenData.access_token },
    timeout: 15,
  })
  const userInfo = userResp.json || {}
  const userEmail = userInfo.email || ''

  // Save to PocketBase — use state as user_id
  const userId = state
  const connsCol = $app.findCollectionByNameOrId('google_connections')

  // Check if connection already exists for this user
  let existing = []
  try {
    existing = $app.findRecordsByFilter(
      'google_connections',
      "user_id = '" + userId + "'",
      '',
      1,
      0,
    )
  } catch (err) {
    /* ignore */
  }

  let conn
  if (existing.length > 0) {
    conn = existing[0]
  } else {
    conn = new Record(connsCol, {
      user_id: userId,
      email: userEmail,
      scope: tokenData.scope || '',
      status: 'connected',
    })
  }

  conn.set('access_token', tokenData.access_token || '')
  const expiry = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000)
  conn.set('token_expiry', expiry.toISOString())
  if (tokenData.refresh_token) {
    conn.set('refresh_token', tokenData.refresh_token)
  }
  conn.set('email', userEmail)
  conn.set('scope', tokenData.scope || '')
  conn.set('status', 'connected')
  $app.save(conn)

  // Return HTML that closes popup and notifies parent window
  return e.html(
    200,
    '<html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2 style="color:#16a34a">Google conectado!</h2><p>Email: ' +
      userEmail +
      '</p><p>Voce pode fechar esta janela.</p><script>window.opener.postMessage({type:"google_connected",email:"' +
      userEmail +
      '"},"*");setTimeout(function(){window.close()},2000);</script></body></html>',
  )
})
