/// <reference path="../pb_data/types.d.ts" />
routerAdd(
  'POST',
  '/backend/v1/gmail/messages',
  (e) => {
    const userId = e.auth && e.auth.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const max = body.max || 10
    const query = body.query || 'in:inbox'

    let conns = []
    try {
      conns = $app.findRecordsByFilter('google_connections', 'user_id = {:uid}', '', 1, 0, {
        uid: userId,
      })
    } catch (err) {
      /* ignore */
    }

    if (conns.length === 0) return e.json(404, { error: 'No Google connection found' })

    const conn = conns[0]
    let accessToken = conn.get('access_token') || ''
    const expiry = conn.get('token_expiry')
    const now = new Date()

    if (expiry) {
      const expiryDate = new Date(expiry)
      if (expiryDate <= now) {
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

    const listResp = $http.send({
      url:
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=' +
        encodeURIComponent(query) +
        '&maxResults=' +
        max,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken },
      timeout: 30,
    })

    const listData = listResp.json || {}
    const messageIds = listData.messages || []
    const messages = []

    for (let i = 0; i < messageIds.length && i < max; i++) {
      const msgResp = $http.send({
        url:
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/' +
          messageIds[i].id +
          '?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        timeout: 15,
      })
      const msgData = msgResp.json || {}
      const headers = msgData.payload?.headers || []
      let from = '',
        subject = '',
        date = ''
      for (let j = 0; j < headers.length; j++) {
        if (headers[j].name === 'From') from = headers[j].value
        else if (headers[j].name === 'Subject') subject = headers[j].value
        else if (headers[j].name === 'Date') date = headers[j].value
      }
      messages.push({
        id: msgData.id,
        from: from,
        subject: subject,
        date: date,
        unread: msgData.labelIds?.includes('UNREAD') || false,
        snippet: msgData.snippet || '',
      })
    }

    return e.json(200, { messages: messages })
  },
  $apis.requireAuth(),
)
