/// <reference path="../pb_data/types.d.ts" />
// O sync de Gmail/Calendar roda em /backend/v1/google/sync (o ChatPanel dispara
// ao abrir). Aqui so conversamos com o agente — resposta rapida, sem N chamadas
// HTTP antes do primeiro token.
routerAdd(
  'POST',
  '/backend/v1/genie/chat',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const userId = e.auth && e.auth.id
      if (!userId) return e.unauthorizedError('auth required')
      if (!body.message || !String(body.message).trim())
        return e.badRequestError('message is required')

      const conv = $ai.agent('hub-genie').getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
      })

      const iter = $ai.agent('hub-genie').chat({
        user_id: userId,
        conversation_id: conv.id,
        message: String(body.message).trim(),
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)
      $response.stream(e, iter)
    } catch (err) {
      if (err instanceof SkipAiConfigError)
        return e.json(503, { error: 'AI temporariamente indisponivel' })
      if (err instanceof SkipAiAgentsError) {
        var status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'falha na requisicao do agente' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        var status2 = err.status || 502
        return e.json(status2, {
          error: status2 >= 500 ? 'AI temporariamente indisponivel' : err.message,
        })
      }
      throw err
    }
  },
  $apis.requireAuth(),
)
