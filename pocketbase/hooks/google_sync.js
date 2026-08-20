/// <reference path="../pb_data/types.d.ts" />
routerAdd(
  'POST',
  '/backend/v1/google/sync',
  (e) => {
    const userId = e.auth && e.auth.id
    if (!userId) return e.unauthorizedError('auth required')

    // O ChatPanel chama esta rota ao abrir, em toda tela. `$secrets` e' do
    // goskip; no PocketBase puro ele nao existe e o handler estouraria
    // ReferenceError a cada abertura de tela. Aqui a resposta e' a mesma de
    // "sem credencial", que o front ja' sabe tratar.
    if (typeof $secrets === 'undefined') {
      return e.json(500, { error: 'Google credentials not configured' })
    }
    const clientId = $secrets.get('GOOGLE_CLIENT_ID') || ''
    const clientSecret = $secrets.get('GOOGLE_CLIENT_SECRET') || ''
    if (!clientId || !clientSecret) {
      return e.json(500, { error: 'Google credentials not configured' })
    }

    // Horario local direto da string do Google (que vem com offset), sem
    // conversao de Date — "2026-07-23T10:45:00-03:00" -> "23/07/2026 10:45".
    // O PocketBase normaliza date fields pra UTC; este label preserva o fuso.
    // "Precisa responder" de verdade: nao lido + humano + nao-automatico.
    // Aceites de convite, notas do Gemini, newsletters e lembretes ficam fora.
    const AUTO_FROM =
      /(no-?_?reply|donotreply|nao.?responda|bounce|mailer-daemon|notifica|newsletter|marketing@|@google\.com|calendar-notification|drive-shares|gemini)/i
    const AUTO_SUBJECT =
      /^(aceito:|aceita:|accepted:|recusado:|declined:|talvez:|tentative:|convite:|invitation:|invite:|atualiza[çc][ãa]o de convite|updated invitation|cancelad[oa]:|cancell?ed:|notas:|notes:|anota[çc][õo]es|resumo da reuni[ãa]o|meeting notes|lembrete:|reminder:|confirma[çc][ãa]o|confirmation|recibo|receipt|fatura|invoice|out of office|ausente:)/i
    function isAutomatedEmail(from, subject, hasListUnsub) {
      if (hasListUnsub) return true
      return AUTO_FROM.test(from || '') || AUTO_SUBJECT.test((subject || '').trim())
    }

    // Descricao de evento pode vir em HTML (convites do HubSpot etc.)
    function stripHtml(s) {
      return String(s || '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n• ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }

    function localLabel(startRaw, endRaw) {
      if (!startRaw) return ''
      if (startRaw.indexOf('T') === -1) {
        return startRaw.split('-').reverse().join('/') + ' (dia inteiro)'
      }
      const day = startRaw.split('T')[0].split('-').reverse().join('/')
      const st = startRaw.split('T')[1].substring(0, 5)
      const et = endRaw && endRaw.indexOf('T') !== -1 ? endRaw.split('T')[1].substring(0, 5) : ''
      return day + ' ' + st + (et ? '-' + et : '')
    }

    // PocketBase só aceita && em filtros — "AND" estoura e era engolido pelo
    // catch, fazendo o sync responder "Google not connected" com conexão válida.
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

    if (conns.length === 0) {
      return e.json(404, { error: 'Google not connected' })
    }

    const conn = conns[0]
    let accessToken = conn.get('access_token') || ''
    const refreshToken = conn.get('refresh_token') || ''
    if (!refreshToken) {
      return e.json(400, { error: 'No refresh token' })
    }

    // Refresh token if needed
    const expiry = conn.get('token_expiry')
    const now = new Date()
    if (expiry) {
      const expiryDate = new Date(expiry)
      if (expiryDate <= now || !accessToken) {
        try {
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
          } else {
            return e.json(401, { error: 'Token refresh failed' })
          }
        } catch (err) {
          return e.json(500, { error: 'Token refresh error: ' + err.message })
        }
      }
    }

    var syncedEvents = 0
    var syncedMessages = 0

    // === Sync Calendar ===
    try {
      const timeMin = now.toISOString()
      const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const timeMax = endTime.toISOString()

      const eventsResp = $http.send({
        url:
          'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' +
          encodeURIComponent(timeMin) +
          '&timeMax=' +
          encodeURIComponent(timeMax) +
          '&maxResults=25&singleEvents=true&orderBy=startTime',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        timeout: 30,
      })

      const eventsData = eventsResp.json || {}
      const events = eventsData.items || []
      const calCol = $app.findCollectionByNameOrId('calendar_events')

      // Delete old events for this user
      try {
        const oldEvents = $app.findRecordsByFilter(
          'calendar_events',
          "user_id = '" + userId + "'",
          '',
          200,
          0,
        )
        for (let j = 0; j < oldEvents.length; j++) {
          $app.delete(oldEvents[j])
        }
      } catch (err) {
        /* ignore */
      }

      for (let j = 0; j < events.length; j++) {
        const item = events[j]
        const startRaw = item.start?.dateTime || item.start?.date || ''
        const endRaw = item.end?.dateTime || item.end?.date || ''
        const rec = new Record(calCol, {
          user_id: userId,
          event_id: item.id || '',
          title: item.summary || '(Sem titulo)',
          start_time: startRaw,
          end_time: endRaw,
          when_local: localLabel(startRaw, endRaw),
          html_link: item.htmlLink || '',
          meet_link:
            item.hangoutLink ||
            (item.conferenceData &&
              item.conferenceData.entryPoints &&
              item.conferenceData.entryPoints[0] &&
              item.conferenceData.entryPoints[0].uri) ||
            '',
          location: item.location || '',
          description: stripHtml(item.description || '').substring(0, 800),
          attendees: (item.attendees || [])
            .map(function (a) {
              return a.email
            })
            .join(', '),
          status: item.status || 'confirmed',
        })
        $app.save(rec)
        syncedEvents++
      }
    } catch (err) {
      /* calendar sync failed, continue */
    }

    // === Sync Gmail ===
    try {
      const listResp = $http.send({
        url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox&maxResults=20',
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        timeout: 30,
      })

      const listData = listResp.json || {}
      const messageIds = listData.messages || []
      const gmailCol = $app.findCollectionByNameOrId('gmail_messages')

      // Delete old messages
      try {
        const oldMsgs = $app.findRecordsByFilter(
          'gmail_messages',
          "user_id = '" + userId + "'",
          '',
          200,
          0,
        )
        for (let j = 0; j < oldMsgs.length; j++) {
          $app.delete(oldMsgs[j])
        }
      } catch (err) {
        /* ignore */
      }

      for (let j = 0; j < messageIds.length && j < 20; j++) {
        try {
          const msgResp = $http.send({
            url:
              'https://gmail.googleapis.com/gmail/v1/users/me/messages/' +
              messageIds[j].id +
              '?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=List-Unsubscribe',
            method: 'GET',
            headers: { Authorization: 'Bearer ' + accessToken },
            timeout: 15,
          })
          const msgData = msgResp.json || {}
          const headers = msgData.payload?.headers || []
          let from = '',
            subject = '',
            date = '',
            hasListUnsub = false
          for (let k = 0; k < headers.length; k++) {
            if (headers[k].name === 'From') from = headers[k].value
            else if (headers[k].name === 'Subject') subject = headers[k].value
            else if (headers[k].name === 'Date') date = headers[k].value
            else if (headers[k].name === 'List-Unsubscribe') hasListUnsub = true
          }
          const isUnread = msgData.labelIds?.includes('UNREAD') || false
          const needsReply = isUnread && !isAutomatedEmail(from, subject, hasListUnsub)

          const rec = new Record(gmailCol, {
            user_id: userId,
            message_id: msgData.id || '',
            from_email: from,
            subject: subject,
            snippet: msgData.snippet || '',
            date: date,
            is_unread: isUnread,
            needs_reply: needsReply,
          })
          $app.save(rec)
          syncedMessages++
        } catch (err) {
          /* skip individual errors */
        }
      }
    } catch (err) {
      /* gmail sync failed, continue */
    }

    return e.json(200, { ok: true, events: syncedEvents, messages: syncedMessages })
  },
  $apis.requireAuth(),
)
