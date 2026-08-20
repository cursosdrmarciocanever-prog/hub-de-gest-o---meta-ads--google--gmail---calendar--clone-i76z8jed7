/// <reference path="../pb_data/types.d.ts" />
// Desconecta o Google do usuario logado: limpa tokens (campos hidden, o client
// nao consegue tocar neles) e apaga os dados sincronizados de Gmail/Calendar.
routerAdd(
  'POST',
  '/backend/v1/google/disconnect',
  (e) => {
    const userId = e.auth && e.auth.id
    if (!userId) return e.unauthorizedError('auth required')

    try {
      const conns = $app.findRecordsByFilter('google_connections', 'user_id = {:uid}', '', 10, 0, {
        uid: userId,
      })
      for (let i = 0; i < conns.length; i++) {
        conns[i].set('status', 'disconnected')
        conns[i].set('access_token', '')
        conns[i].set('refresh_token', '')
        conns[i].set('token_expiry', '')
        $app.save(conns[i])
      }
    } catch (err) {
      /* ignore */
    }

    const synced = ['calendar_events', 'gmail_messages']
    for (let c = 0; c < synced.length; c++) {
      try {
        const recs = $app.findRecordsByFilter(synced[c], 'user_id = {:uid}', '', 500, 0, {
          uid: userId,
        })
        for (let i = 0; i < recs.length; i++) {
          $app.delete(recs[i])
        }
      } catch (err) {
        /* ignore */
      }
    }

    return e.json(200, { ok: true })
  },
  $apis.requireAuth(),
)
