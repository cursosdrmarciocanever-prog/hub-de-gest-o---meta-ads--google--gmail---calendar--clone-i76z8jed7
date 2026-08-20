/// <reference path="../pb_data/types.d.ts" />
// Conecta uma conta Meta Ads: valida o token contra a Graph API e guarda a
// conexao server-side. O access_token e campo hidden — nunca volta pro client.
routerAdd(
  'POST',
  '/backend/v1/meta-ads/connect',
  (e) => {
    const userId = e.auth && e.auth.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const token = String(body.token || '').trim()
    const accountId = String(body.account_id || '')
      .trim()
      .replace(/^act_/, '')

    if (!token || !accountId) {
      return e.badRequestError('token e account_id sao obrigatorios')
    }

    const resp = $http.send({
      url:
        'https://graph.facebook.com/v21.0/act_' +
        accountId +
        '?fields=name,currency,account_status',
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token },
      timeout: 30,
    })
    const info = resp.json || {}
    if (info.error) {
      return e.json(400, {
        error: 'Meta recusou as credenciais: ' + (info.error.message || 'token invalido'),
      })
    }

    const col = $app.findCollectionByNameOrId('meta_connections')
    let existing = []
    try {
      existing = $app.findRecordsByFilter(
        'meta_connections',
        'user_id = {:uid} && account_id = {:aid}',
        '',
        1,
        0,
        { uid: userId, aid: accountId },
      )
    } catch (err) {
      /* ignore */
    }

    let conn
    if (existing.length > 0) {
      conn = existing[0]
    } else {
      conn = new Record(col, { user_id: userId, account_id: accountId, access_token: token })
    }
    conn.set('access_token', token)
    conn.set('account_id', accountId)
    conn.set('account_name', info.name || '')
    conn.set('currency', info.currency || '')
    conn.set('status', 'connected')
    $app.save(conn)

    return e.json(200, {
      ok: true,
      account_id: accountId,
      account_name: info.name || '',
      currency: info.currency || '',
    })
  },
  $apis.requireAuth(),
)
