/// <reference path="../pb_data/types.d.ts" />
routerAdd(
  'POST',
  '/backend/v1/calendar/events',
  (e) => {
    const userId = e.auth && e.auth.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const max = body.max || 10
    const daysAhead = body.days || 7

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

    const timeMin = now.toISOString()
    const endTime = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
    const timeMax = endTime.toISOString()

    const eventsResp = $http.send({
      url:
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' +
        encodeURIComponent(timeMin) +
        '&timeMax=' +
        encodeURIComponent(timeMax) +
        '&maxResults=' +
        max +
        '&singleEvents=true&orderBy=startTime',
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken },
      timeout: 30,
    })

    const eventsData = eventsResp.json || {}
    const events = (eventsData.items || []).map(function (item) {
      return {
        id: item.id,
        summary: item.summary || '(Sem titulo)',
        start: item.start?.dateTime || item.start?.date || '',
        end: item.end?.dateTime || item.end?.date || '',
        location: item.location || '',
        attendees: (item.attendees || []).map(function (a) {
          return a.email
        }),
      }
    })

    return e.json(200, { events: events })
  },
  $apis.requireAuth(),
)
