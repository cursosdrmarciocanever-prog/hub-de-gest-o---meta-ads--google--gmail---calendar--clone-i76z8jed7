/// <reference path="../pb_data/types.d.ts" />
// Corpo completo de um email sob demanda (scope readonly). Devolve o body em
// base64url — o client decodifica (atob), evitando decode base64 no Goja.
routerAdd(
  'POST',
  '/backend/v1/gmail/message',
  (e) => {
    const userId = e.auth && e.auth.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const messageId = String(body.message_id || '').trim()
    if (!messageId) return e.badRequestError('message_id required')

    let conns = []
    try {
      conns = $app.findRecordsByFilter(
        'google_connections',
        "user_id = {:uid} && status = 'connected'",
        '',
        1,
        0,
        { uid: userId },
      )
    } catch (err) {
      /* ignore */
    }
    if (conns.length === 0) return e.json(404, { error: 'Google not connected' })

    const conn = conns[0]
    let accessToken = conn.get('access_token') || ''
    const expiry = conn.get('token_expiry')
    const now = new Date()

    if (expiry) {
      const expiryDate = new Date(expiry)
      if (expiryDate <= now || !accessToken) {
        const clientId = $secrets.get('GOOGLE_CLIENT_ID') || ''
        const clientSecret = $secrets.get('GOOGLE_CLIENT_SECRET') || ''
        const refreshToken = conn.get('refresh_token') || ''
        const refreshResp = $http.send({
          url: 'https://oauth2.googleapis.com/token',
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body:
            'client_id=' +
            clientId +
            '&client_secret=' +
            clientSecret +
            '&refresh_token=' +
            refreshToken +
            '&grant_type=refresh_token',
          timeout: 30,
        })
        const refreshData = refreshResp.json || {}
        if (refreshData.access_token) {
          accessToken = refreshData.access_token
          conn.set('access_token', accessToken)
          const newExpiry = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000)
          conn.set('token_expiry', newExpiry.toISOString())
          $app.save(conn)
        }
      }
    }

    const msgResp = $http.send({
      url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/' + messageId + '?format=full',
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken },
      timeout: 30,
    })
    const msgData = msgResp.json || {}
    if (msgData.error) {
      return e.json(404, { error: 'Mensagem nao encontrada no Gmail' })
    }

    const headers = (msgData.payload && msgData.payload.headers) || []
    let from = '',
      to = '',
      subject = '',
      date = ''
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i]
      if (h.name === 'From') from = h.value
      else if (h.name === 'To') to = h.value
      else if (h.name === 'Subject') subject = h.value
      else if (h.name === 'Date') date = h.value
    }

    // prefere text/plain; cai pra text/html; por fim o body direto do payload
    let plain = null
    let html = null
    function walk(p) {
      if (!p) return
      if (p.mimeType === 'text/plain' && p.body && p.body.data && !plain) plain = p
      else if (p.mimeType === 'text/html' && p.body && p.body.data && !html) html = p
      const parts = p.parts || []
      for (let i = 0; i < parts.length; i++) walk(parts[i])
    }
    walk(msgData.payload)
    const part =
      plain ||
      html ||
      (msgData.payload && msgData.payload.body && msgData.payload.body.data
        ? msgData.payload
        : null)

    return e.json(200, {
      id: msgData.id || messageId,
      subject: subject,
      from: from,
      to: to,
      date: date,
      snippet: msgData.snippet || '',
      mime: part ? part.mimeType || 'text/plain' : '',
      body_b64: part ? part.body.data : '',
      gmail_url: 'https://mail.google.com/mail/u/0/#all/' + (msgData.id || messageId),
    })
  },
  $apis.requireAuth(),
)
