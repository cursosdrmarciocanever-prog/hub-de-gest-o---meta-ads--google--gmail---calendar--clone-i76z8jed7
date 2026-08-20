/// <reference path="../pb_data/types.d.ts" />
// Envia um resumo de metricas (daily_metrics) por email para o usuario logado.
// Disparado on-demand pela pagina /Emails. Entrega via relay do Skip
// ($app.newMailClient()). Todos os helpers vivem DENTRO do callback porque o
// runtime do hook roda num VM separado que nao enxerga declaracoes de topo.
routerAdd(
  'POST',
  '/backend/v1/report/email',
  (e) => {
    const userId = e.auth && e.auth.id
    if (!userId) return e.unauthorizedError('auth required')

    // ---- helpers de formatacao BR (sem Intl: Goja nao suporta pt-BR) ----
    function group(intStr) {
      let out = ''
      let c = 0
      for (let i = intStr.length - 1; i >= 0; i--) {
        out = intStr.charAt(i) + out
        c++
        if (c % 3 === 0 && i > 0) out = '.' + out
      }
      return out
    }
    function fmtInt(n) {
      n = Math.round(n || 0)
      const neg = n < 0
      n = Math.abs(n)
      return (neg ? '-' : '') + group(String(n))
    }
    function fmtMoney(n) {
      n = n || 0
      const neg = n < 0
      n = Math.abs(n)
      const p = n.toFixed(2).split('.')
      return (neg ? '-' : '') + 'R$ ' + group(p[0]) + ',' + p[1]
    }
    function fmtDec(n, d) {
      return (n || 0).toFixed(d === undefined ? 2 : d).replace('.', ',')
    }
    function br(d) {
      const dd = ('0' + d.getDate()).slice(-2)
      const mm = ('0' + (d.getMonth() + 1)).slice(-2)
      return dd + '/' + mm + '/' + d.getFullYear()
    }
    function trend(cur, prev) {
      if (prev === 0) return { txt: cur > 0 ? '+100%' : '0%', up: cur >= 0 }
      const p = ((cur - prev) / Math.abs(prev)) * 100
      return { txt: (p >= 0 ? '+' : '') + fmtDec(p, 1) + '%', up: p >= 0 }
    }
    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    }

    // ---- input ----
    const reqBody = e.requestInfo().body || {}
    const period = reqBody.period === '30d' ? '30d' : '7d'
    const days = period === '30d' ? 30 : 7
    let siteUrl = String(reqBody.site_url || '').trim()
    if (siteUrl && siteUrl.charAt(siteUrl.length - 1) === '/') siteUrl = siteUrl.slice(0, -1)

    const now = new Date()

    // ---- busca metricas do usuario (hook bypassa RLS; filtra explicito) ----
    let rows = []
    try {
      rows = $app.findRecordsByFilter(
        'daily_metrics',
        'campaign_id.account_id.user_id = {:uid}',
        '-date',
        5000,
        0,
        { uid: userId },
      )
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar metricas: ' + err.message })
    }

    if (rows.length === 0) {
      return e.json(200, { ok: true, sent: false, reason: 'no_metrics' })
    }

    // Ancora a janela na data mais recente disponivel (rows vem por -date),
    // nao em "hoje" — assim o relatorio funciona mesmo com sync defasado ou
    // dados de seed estatico. O periodo real aparece no cabecalho do email.
    let latest = new Date(String(rows[0].getString('date')).replace(' ', 'T'))
    if (isNaN(latest.getTime())) latest = new Date()
    const endCur = new Date(latest.getTime())
    endCur.setHours(23, 59, 59, 999)
    const startCur = new Date(endCur.getTime() - days * 86400000)
    const endPrev = new Date(startCur.getTime() - 1)
    const startPrev = new Date(endPrev.getTime() - days * 86400000)

    function inRange(dstr, s, en) {
      const d = new Date(String(dstr).replace(' ', 'T'))
      return d >= s && d <= en
    }

    // Mesma agregacao do dashboard: soma spend/impressoes/cliques/conversoes,
    // media de ctr e roas. Mantem os numeros do email iguais aos da tela.
    function agg(s, en) {
      let spend = 0,
        impressions = 0,
        clicks = 0,
        conversions = 0,
        ctrSum = 0,
        ctrCount = 0,
        roasSum = 0,
        roasCount = 0,
        count = 0
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        if (!inRange(r.getString('date'), s, en)) continue
        count++
        spend += r.getFloat('spend')
        impressions += r.getInt('impressions')
        clicks += r.getInt('clicks')
        conversions += r.getInt('conversions')
        const ctr = r.getFloat('ctr')
        if (ctr) {
          ctrSum += ctr
          ctrCount++
        }
        const roas = r.getFloat('purchase_roas')
        if (roas) {
          roasSum += roas
          roasCount++
        }
      }
      return {
        count: count,
        spend: spend,
        impressions: impressions,
        clicks: clicks,
        conversions: conversions,
        ctr: ctrCount ? ctrSum / ctrCount : 0,
        roas: roasCount ? roasSum / roasCount : 0,
      }
    }

    const cur = agg(startCur, endCur)
    const prev = agg(startPrev, endPrev)

    if (cur.count === 0) {
      return e.json(200, { ok: true, sent: false, reason: 'no_data' })
    }

    // ---- KPIs ----
    const kpis = [
      { label: 'Investimento', value: fmtMoney(cur.spend), t: trend(cur.spend, prev.spend) },
      {
        label: 'Impressões',
        value: fmtInt(cur.impressions),
        t: trend(cur.impressions, prev.impressions),
      },
      { label: 'Cliques', value: fmtInt(cur.clicks), t: trend(cur.clicks, prev.clicks) },
      {
        label: 'Conversões',
        value: fmtInt(cur.conversions),
        t: trend(cur.conversions, prev.conversions),
      },
      { label: 'CTR médio', value: fmtDec(cur.ctr) + '%', t: trend(cur.ctr, prev.ctr) },
      { label: 'ROAS médio', value: fmtDec(cur.roas) + 'x', t: trend(cur.roas, prev.roas) },
    ]

    let cards = ''
    for (let i = 0; i < kpis.length; i += 2) {
      cards += '<tr>'
      for (let j = i; j < i + 2 && j < kpis.length; j++) {
        const k = kpis[j]
        const col = k.t.up ? '#059669' : '#dc2626'
        cards +=
          '<td width="50%" valign="top" style="background:#fafafa;border:1px solid #f1f1f4;border-radius:12px;padding:14px 16px;">' +
          '<div style="font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:.5px;">' +
          esc(k.label) +
          '</div>' +
          '<div style="font-size:20px;font-weight:700;color:#18181b;margin-top:4px;">' +
          esc(k.value) +
          '</div>' +
          '<div style="font-size:12px;color:' +
          col +
          ';margin-top:2px;">' +
          esc(k.t.txt) +
          ' vs. período anterior</div>' +
          '</td>'
      }
      cards += '</tr>'
    }

    const periodLabel = br(startCur) + ' a ' + br(endCur) + ' (' + days + ' dias)'
    const cta = siteUrl
      ? '<a href="' +
        esc(siteUrl) +
        '" style="display:inline-block;margin-top:14px;padding:11px 20px;background:#18181b;color:#ffffff;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600;">Abrir o Hub</a>'
      : ''

    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;padding:24px 0;margin:0;">' +
      '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">' +
      '<div style="padding:24px 28px;border-bottom:1px solid #f1f1f4;">' +
      '<div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#7c3aed;font-weight:700;">Adapta Summit</div>' +
      '<h1 style="font-size:20px;color:#18181b;margin:6px 0 2px;">Relatório de desempenho</h1>' +
      '<div style="font-size:13px;color:#71717a;">' +
      periodLabel +
      '</div>' +
      '</div>' +
      '<div style="padding:18px 20px 8px;">' +
      '<table width="100%" style="border-collapse:separate;border-spacing:8px;">' +
      cards +
      '</table>' +
      '<div style="padding:0 8px;">' +
      cta +
      '</div>' +
      '</div>' +
      '<div style="padding:16px 28px;border-top:1px solid #f1f1f4;font-size:11px;color:#a1a1aa;">Gerado automaticamente em ' +
      br(now) +
      ' · Adapta Summit — Hub de Gestão</div>' +
      '</div></div>'

    // ---- destinatario: o proprio usuario logado ----
    let toEmail = ''
    try {
      toEmail = e.auth.email()
    } catch (_) {
      toEmail = e.auth.getString('email')
    }
    if (!toEmail) return e.json(400, { error: 'Usuário logado sem email' })

    // ---- remetente: no relay o From e reescrito p/ o sender verificado ----
    let fromAddr = 'noreply@mail.goskip.dev'
    let fromName = 'Adapta Summit'
    try {
      const st = $app.settings()
      if (st && st.meta) {
        if (st.meta.senderAddress) fromAddr = st.meta.senderAddress
        if (st.meta.senderName) fromName = st.meta.senderName
      }
    } catch (_) {
      /* usa defaults */
    }

    const message = new MailerMessage({
      from: { address: fromAddr, name: fromName },
      to: [{ address: toEmail }],
      subject: 'Relatório de desempenho · últimos ' + days + ' dias — Adapta Summit',
      html: html,
    })

    try {
      $app.newMailClient().send(message)
    } catch (err) {
      return e.json(500, { error: 'Falha ao enviar email: ' + err.message })
    }

    return e.json(200, { ok: true, sent: true, to: toEmail, period: period, metrics: cur.count })
  },
  $apis.requireAuth(),
)
