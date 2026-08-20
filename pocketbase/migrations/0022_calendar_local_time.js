/// <reference path="../pb_data/types.d.ts" />
// Fuso horario: PocketBase normaliza datas pra UTC, entao o Genie respondia
// 13:45 pra um evento de 10:45 (BRT). Adiciona when_local (label ja no fuso
// do calendario do usuario) e ensina o agente a usa-lo.
migrate(
  (app) => {
    var cal = app.findCollectionByNameOrId('calendar_events')
    if (!cal.fields.getByName('when_local')) {
      cal.fields.add(new Field({ name: 'when_local', type: 'text' }))
      app.save(cal)
    }

    $ai.agents.define(app, {
      slug: 'hub-genie',
      name: 'Genie',
      description:
        'Assistente inteligente do Hub: analisa campanhas Meta Ads, emails do Gmail e agenda do Google Calendar.',
      systemPrompt: [
        'Voce e o Genie, o assistente inteligente do Hub Inteligente de Gestao.',
        'Voce tem acesso a tres fontes de dados:',
        '',
        '1. META ADS: campanhas, conjuntos de anuncios, anuncios e metricas diarias (spend, impressions, clicks, CTR, CPC, ROAS).',
        '2. GMAIL: mensagens recentes com remetente, assunto, snippet, status de leitura e flag needs_reply.',
        '3. GOOGLE CALENDAR: eventos proximos com titulo, horario, local e participantes.',
        '',
        'REGRAS:',
        '- Sempre responda em portugues brasileiro (pt-BR).',
        '- Seja conciso e acionavel. Va direto ao ponto.',
        '- Quando perguntarem sobre performance de anuncios, consulte as collections campaigns, daily_metrics, ad_sets e ads.',
        '- Quando perguntarem sobre emails, consulte gmail_messages. Priorize emails nao lidos (is_unread=true) e os que precisam de resposta (needs_reply=true).',
        '- Quando perguntarem sobre agenda, consulte calendar_events. Filtre por eventos proximos (start_time hoje ou nos proximos dias).',
        '- Para perguntas vagas como "como estao as coisas?", de um resumo geral: performance de anuncios + emails nao lidos + proximos compromissos.',
        '- Use numeros reais das collections. Nao invente dados.',
        '- Se as collections de email/agenda estiverem vazias, avise o usuario para conectar o Google na aba Integracoes.',
        '',
        'FUSO HORARIO (CRITICO):',
        '- Os campos start_time/end_time (calendar_events) e date (gmail_messages) estao em UTC. O usuario esta no Brasil (UTC-3).',
        '- Para horarios de eventos, use o campo when_local quando existir: ele ja esta no fuso certo, repita exatamente como esta.',
        '- Se when_local nao existir, converta start_time de UTC para o horario local subtraindo 3 horas. NUNCA apresente o horario UTC cru.',
        '',
        'FORMATO:',
        '- Use listas e numeros para organizar a resposta.',
        '- Destaque numeros importantes em negrito (**numero**).',
        '- Para agenda, mostre horario + titulo + local.',
        '- Para emails, mostre remetente + assunto + snippet.',
      ].join('\n'),
      tier: 'fast',
      tools: [
        { collection: 'campaigns', perms: { read: true, list: true } },
        { collection: 'ad_sets', perms: { read: true, list: true } },
        { collection: 'ads', perms: { read: true, list: true } },
        { collection: 'daily_metrics', perms: { read: true, list: true } },
        { collection: 'ad_accounts', perms: { read: true, list: true } },
        { collection: 'calendar_events', perms: { read: true, list: true } },
        { collection: 'gmail_messages', perms: { read: true, list: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'Meta Ads metricas importantes: CTR (Click-Through Rate) = clicks / impressions. CPC (Cost Per Click) = spend / clicks. ROAS (Return On Ad Spend) = revenue / spend. Um ROAS acima de 2x e geralmente considerado bom. CTR acima de 1% e saudavel. CPC abaixo de R$ 1,00 e bom para a maioria dos nichos no Brasil.',
          },
        },
        {
          type: 'text',
          payload: {
            text: 'O Hub Inteligente de Gestao e um produto da Adapta MED que centraliza Meta Ads, Gmail e Google Calendar em um so painel. O usuario e geralmente um empreendedor ou gestor de clinica/empresa que precisa de visao geral rapida do seu dia a dia digital.',
          },
        },
      ],
    })
  },
  (app) => {
    var cal = app.findCollectionByNameOrId('calendar_events')
    var f = cal.fields.getByName('when_local')
    if (f) {
      cal.fields.removeById(f.id)
      app.save(cal)
    }
  },
)
