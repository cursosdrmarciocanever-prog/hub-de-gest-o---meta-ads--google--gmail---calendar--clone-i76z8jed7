/// <reference path="../pb_data/types.d.ts" />
routerAdd(
  'POST',
  '/backend/v1/meta-ads/sync',
  (e) => {
    const userId = e.auth && e.auth.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const requestedAccount = String(body.account_id || '')
      .trim()
      .replace(/^act_/, '')

    let conns = []
    try {
      conns = requestedAccount
        ? $app.findRecordsByFilter(
            'meta_connections',
            "user_id = {:uid} && account_id = {:aid} && status = 'connected'",
            '',
            1,
            0,
            { uid: userId, aid: requestedAccount },
          )
        : $app.findRecordsByFilter(
            'meta_connections',
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
      return e.json(404, { error: 'Meta Ads nao conectado. Conecte em /connect primeiro.' })
    }

    const conn = conns[0]
    const token = conn.get('access_token') || ''
    const accountId = conn.get('account_id') || ''
    if (!token || !accountId) {
      return e.json(400, { error: 'Conexao Meta invalida. Reconecte a conta.' })
    }

    const baseUrl = 'https://graph.facebook.com/v21.0'
    const acct = baseUrl + '/act_' + accountId
    const authHeader = { Authorization: 'Bearer ' + token }
    const syncErrors = []

    function lc(s) {
      return (s || '').toLowerCase()
    }
    // insights numéricos podem vir como arrays de {action_type, value}
    function num(v) {
      if (v === undefined || v === null) return 0
      if (Array.isArray(v)) {
        let total = 0
        for (let x = 0; x < v.length; x++) total += parseFloat(v[x] && v[x].value) || 0
        return total
      }
      return parseFloat(v) || 0
    }
    function int(v) {
      return Math.round(num(v))
    }
    function mapStatus(s) {
      const v = lc(s)
      if (v === 'paused' || v === 'archived') return 'paused'
      if (v === 'deleted') return 'draft'
      return 'active'
    }
    function mapObjective(s) {
      const v = lc(s).replace('outcome_', '')
      const map = {
        awareness: 'awareness',
        brand_awareness: 'awareness',
        reach: 'awareness',
        traffic: 'traffic',
        link_clicks: 'traffic',
        engagement: 'engagement',
        post_engagement: 'engagement',
        page_likes: 'engagement',
        event_responses: 'engagement',
        video_views: 'engagement',
        messages: 'engagement',
        leads: 'leads',
        lead_generation: 'leads',
        sales: 'sales',
        conversions: 'sales',
        product_catalog_sales: 'sales',
        store_visits: 'sales',
        app_promotion: 'app_promotion',
        app_installs: 'app_promotion',
      }
      return map[v] || ''
    }
    function mapOptGoal(s) {
      const v = lc(s)
      const direct = { reach: 1, link_clicks: 1, conversions: 1, app_installs: 1, video_views: 1 }
      if (direct[v]) return v
      const map = {
        offsite_conversions: 'conversions',
        landing_page_views: 'link_clicks',
        impressions: 'reach',
        thruplay: 'video_views',
        lead_generation: 'conversions',
        quality_lead: 'conversions',
        quality_call: 'conversions',
        page_likes: 'reach',
        post_engagement: 'reach',
        value: 'conversions',
      }
      return map[v] || ''
    }
    function mapBilling(s) {
      const v = lc(s)
      const direct = { impressions: 1, link_clicks: 1, app_installs: 1 }
      if (direct[v]) return v
      return v ? 'impressions' : ''
    }
    function mapBid(s) {
      const v = lc(s)
      const map = {
        lowest_cost: 'lowest_cost',
        lowest_cost_without_cap: 'lowest_cost',
        lowest_cost_with_min_roas: 'lowest_cost',
        lowest_cost_with_bid_cap: 'bid_cap',
        bid_cap: 'bid_cap',
        cost_cap: 'cost_cap',
      }
      return map[v] || ''
    }
    function mapRanking(s) {
      const v = lc(s)
      if (v.indexOf('above') === 0) return 'above_average'
      if (v.indexOf('below') === 0) return 'below_average'
      return 'average'
    }

    // Segue paging.next; cap pra não rodar pra sempre em conta gigante.
    function fetchAll(url, cap) {
      const out = []
      let next = url
      let pages = 0
      const max = cap || 12
      while (next && pages < max) {
        pages++
        try {
          const resp = $http.send({ url: next, method: 'GET', headers: authHeader, timeout: 30 })
          const json = resp.json || {}
          if (json.error) {
            if (pages === 1)
              syncErrors.push('Meta: ' + (json.error.message || 'erro ao buscar dados'))
            break
          }
          const data = json.data || []
          for (let i = 0; i < data.length; i++) out.push(data[i])
          next = json.paging && json.paging.next ? json.paging.next : ''
        } catch (err) {
          console.error('fetchAll error:', err)
          break
        }
      }
      return out
    }
    function indexBy(rows, key) {
      const m = {}
      for (let i = 0; i < rows.length; i++) {
        const id = rows[i][key]
        if (id) m[id] = rows[i]
      }
      return m
    }

    // 1. Info da conta
    const accResp = $http.send({
      url: acct + '?fields=name,currency,account_status',
      method: 'GET',
      headers: authHeader,
      timeout: 30,
    })
    const accInfo = accResp.json || {}
    if (accInfo.error) {
      return e.json(400, {
        error: 'Meta recusou o token: ' + (accInfo.error.message || 'token invalido ou expirado'),
      })
    }

    const accountsCol = $app.findCollectionByNameOrId('ad_accounts')
    const campaignsCol = $app.findCollectionByNameOrId('campaigns')
    const adSetsCol = $app.findCollectionByNameOrId('ad_sets')
    const adsCol = $app.findCollectionByNameOrId('ads')
    const metricsCol = $app.findCollectionByNameOrId('daily_metrics')

    let existingAccounts = []
    try {
      existingAccounts = $app.findRecordsByFilter(
        'ad_accounts',
        'account_id = {:aid} && user_id = {:uid}',
        '',
        1,
        0,
        { aid: accountId, uid: userId },
      )
    } catch (err) {
      /* ignore */
    }
    let accountRecord
    if (existingAccounts.length > 0) {
      accountRecord = existingAccounts[0]
      accountRecord.set('name', accInfo.name || accountRecord.get('name'))
      accountRecord.set('currency', accInfo.currency || accountRecord.get('currency') || 'BRL')
      $app.save(accountRecord)
    } else {
      accountRecord = new Record(accountsCol, {
        account_id: accountId,
        name: accInfo.name || 'Meta Ads - ' + accountId,
        currency: accInfo.currency || 'BRL',
        status: 'active',
        user_id: userId,
      })
      $app.save(accountRecord)
    }

    // Conta REAL → remove dados de demonstração do seed
    if (accountId !== '1234567890') {
      try {
        const demoAccts = $app.findRecordsByFilter(
          'ad_accounts',
          "user_id = {:uid} && account_id = '1234567890'",
          '',
          5,
          0,
          { uid: userId },
        )
        for (let da = 0; da < demoAccts.length; da++) {
          let demoCamps = []
          try {
            demoCamps = $app.findRecordsByFilter('campaigns', 'account_id = {:acc}', '', 500, 0, {
              acc: demoAccts[da].id,
            })
          } catch (err) {
            /* ignore */
          }
          for (let dc = 0; dc < demoCamps.length; dc++) {
            const cid = demoCamps[dc].id
            try {
              const ms = $app.findRecordsByFilter(
                'daily_metrics',
                'campaign_id = {:c}',
                '',
                1000,
                0,
                {
                  c: cid,
                },
              )
              for (let x = 0; x < ms.length; x++) $app.delete(ms[x])
            } catch (err) {
              /* ignore */
            }
            try {
              const asets = $app.findRecordsByFilter('ad_sets', 'campaign_id = {:c}', '', 500, 0, {
                c: cid,
              })
              for (let x = 0; x < asets.length; x++) {
                try {
                  const adz = $app.findRecordsByFilter('ads', 'adset_id = {:a}', '', 500, 0, {
                    a: asets[x].id,
                  })
                  for (let y = 0; y < adz.length; y++) $app.delete(adz[y])
                } catch (err) {
                  /* ignore */
                }
                $app.delete(asets[x])
              }
            } catch (err) {
              /* ignore */
            }
            $app.delete(demoCamps[dc])
          }
          $app.delete(demoAccts[da])
        }
      } catch (err) {
        console.error('demo cleanup error:', err)
      }
    }

    const insFields =
      'spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,conversions,cost_per_conversion,purchase_roas'
    const syncCount = { campaigns: 0, adsets: 0, ads: 0, metrics: 0 }
    const totals = { campaigns: 0, adsets: 0, ads: 0 }
    let lastActivity = ''

    // helper de upsert genérico (por meta_id, com fallback por nome pra migrar antigos)
    function loadExisting(collection, filter, params) {
      const byMeta = {}
      const byName = {}
      try {
        const recs = $app.findRecordsByFilter(collection, filter, '', 2000, 0, params)
        for (let i = 0; i < recs.length; i++) {
          const mid = recs[i].get('meta_id')
          if (mid) byMeta[mid] = recs[i]
          byName[recs[i].get('name')] = recs[i]
        }
      } catch (err) {
        /* ignore */
      }
      return { byMeta, byName }
    }

    // ===== 2. CAMPANHAS (1 lista + 1 insights agregado, paginados) =====
    const campaigns = fetchAll(
      acct +
        '/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,buying_type&limit=200',
    )
    totals.campaigns = campaigns.length
    const campInsMap = indexBy(
      fetchAll(
        acct +
          '/insights?level=campaign&fields=campaign_id,' +
          insFields +
          '&date_preset=maximum&limit=500',
      ),
      'campaign_id',
    )
    const existingCamps = loadExisting('campaigns', 'account_id = {:acc}', {
      acc: accountRecord.id,
    })
    const metaCampToRec = {} // meta campaign id -> nosso record id

    for (let i = 0; i < campaigns.length; i++) {
      const c = campaigns[i]
      const ins = campInsMap[c.id] || {}
      let rec = existingCamps.byMeta[c.id] || existingCamps.byName[c.name]
      try {
        if (!rec) {
          rec = new Record(campaignsCol, { account_id: accountRecord.id })
          syncCount.campaigns++
        }
        rec.set('meta_id', c.id)
        rec.set('name', c.name)
        rec.set('status', mapStatus(c.status))
        rec.set('objective', mapObjective(c.objective))
        rec.set('buying_type', lc(c.buying_type) === 'reserved' ? 'reserved' : 'auction')
        rec.set('budget', num(c.daily_budget) || num(c.lifetime_budget))
        rec.set('budget_type', c.daily_budget ? 'daily' : 'lifetime')
        rec.set('spend', num(ins.spend))
        rec.set('impressions', int(ins.impressions))
        rec.set('reach', int(ins.reach))
        rec.set('frequency', num(ins.frequency))
        rec.set('clicks', int(ins.clicks))
        rec.set('ctr', num(ins.ctr))
        rec.set('cpc', num(ins.cpc))
        rec.set('cpm', num(ins.cpm))
        rec.set('conversions', int(ins.conversions))
        rec.set('cost_per_conversion', num(ins.cost_per_conversion))
        rec.set('purchase_roas', num(ins.purchase_roas))
        rec.set('roas', num(ins.purchase_roas))
        $app.save(rec)
        metaCampToRec[c.id] = rec.id
      } catch (err) {
        if (syncErrors.length < 5) syncErrors.push('campanha "' + c.name + '": ' + err.message)
      }
    }

    // ===== 3. CONJUNTOS =====
    const adsets = fetchAll(
      acct +
        '/adsets?fields=name,status,campaign_id,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_strategy&limit=500',
    )
    totals.adsets = adsets.length
    const adsetInsMap = indexBy(
      fetchAll(
        acct +
          '/insights?level=adset&fields=adset_id,' +
          insFields +
          '&date_preset=maximum&limit=500',
      ),
      'adset_id',
    )
    const existingAdsets = loadExisting('ad_sets', "id != ''", {})
    const metaAdsetToRec = {}

    for (let i = 0; i < adsets.length; i++) {
      const a = adsets[i]
      const campRecId = metaCampToRec[a.campaign_id]
      if (!campRecId) continue // conjunto de campanha que não veio (fora do escopo)
      const ins = adsetInsMap[a.id] || {}
      let rec = existingAdsets.byMeta[a.id]
      try {
        if (!rec) {
          rec = new Record(adSetsCol, {})
          syncCount.adsets++
        }
        rec.set('meta_id', a.id)
        rec.set('name', a.name)
        rec.set('status', mapStatus(a.status))
        rec.set('campaign_id', campRecId)
        rec.set('daily_budget', num(a.daily_budget))
        rec.set('optimization_goal', mapOptGoal(a.optimization_goal))
        rec.set('billing_event', mapBilling(a.billing_event))
        rec.set('bid_strategy', mapBid(a.bid_strategy))
        rec.set('spend', num(ins.spend))
        rec.set('impressions', int(ins.impressions))
        rec.set('reach', int(ins.reach))
        rec.set('frequency', num(ins.frequency))
        rec.set('clicks', int(ins.clicks))
        rec.set('ctr', num(ins.ctr))
        rec.set('cpc', num(ins.cpc))
        rec.set('cpm', num(ins.cpm))
        rec.set('conversions', int(ins.conversions))
        rec.set('cost_per_conversion', num(ins.cost_per_conversion))
        rec.set('purchase_roas', num(ins.purchase_roas))
        $app.save(rec)
        metaAdsetToRec[a.id] = rec.id
      } catch (err) {
        if (syncErrors.length < 5) syncErrors.push('conjunto "' + a.name + '": ' + err.message)
      }
    }

    // ===== 4. ANÚNCIOS =====
    const ads = fetchAll(acct + '/ads?fields=name,status,adset_id&limit=500')
    totals.ads = ads.length
    const adInsMap = indexBy(
      fetchAll(
        acct +
          '/insights?level=ad&fields=ad_id,' +
          insFields +
          ',quality_ranking,engagement_rate_ranking,conversion_rate_ranking&date_preset=maximum&limit=500',
      ),
      'ad_id',
    )
    const existingAds = loadExisting('ads', "id != ''", {})

    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i]
      const adsetRecId = metaAdsetToRec[ad.adset_id]
      if (!adsetRecId) continue
      const ins = adInsMap[ad.id] || {}
      let rec = existingAds.byMeta[ad.id]
      try {
        if (!rec) {
          rec = new Record(adsCol, { creative_type: 'image' })
          syncCount.ads++
        }
        rec.set('meta_id', ad.id)
        rec.set('name', ad.name)
        rec.set('status', mapStatus(ad.status))
        rec.set('adset_id', adsetRecId)
        rec.set('spend', num(ins.spend))
        rec.set('impressions', int(ins.impressions))
        rec.set('reach', int(ins.reach))
        rec.set('frequency', num(ins.frequency))
        rec.set('clicks', int(ins.clicks))
        rec.set('ctr', num(ins.ctr))
        rec.set('cpc', num(ins.cpc))
        rec.set('cpm', num(ins.cpm))
        rec.set('conversions', int(ins.conversions))
        rec.set('cost_per_conversion', num(ins.cost_per_conversion))
        rec.set('purchase_roas', num(ins.purchase_roas))
        rec.set('quality_ranking', mapRanking(ins.quality_ranking))
        rec.set('engagement_rate_ranking', mapRanking(ins.engagement_rate_ranking))
        rec.set('conversion_rate_ranking', mapRanking(ins.conversion_rate_ranking))
        $app.save(rec)
      } catch (err) {
        if (syncErrors.length < 5) syncErrors.push('anuncio "' + ad.name + '": ' + err.message)
      }
    }

    // ===== 5. MÉTRICAS DIÁRIAS (1 chamada por conta, todas as campanhas) =====
    try {
      let dailyRows = fetchAll(
        acct +
          '/insights?level=campaign&time_increment=1&fields=campaign_id,spend,impressions,reach,clicks,ctr,cpc,cpm,conversions,cost_per_conversion,purchase_roas&date_preset=maximum&limit=500',
      )
      // time_increment=1 tem limite ~37 meses; se veio vazio por erro, tenta 35 meses
      if (dailyRows.length === 0) {
        const nowD = new Date()
        const sinceD = new Date(nowD.getFullYear(), nowD.getMonth() - 35, 1)
        dailyRows = fetchAll(
          acct +
            '/insights?level=campaign&time_increment=1&fields=campaign_id,spend,impressions,reach,clicks,ctr,cpc,cpm,conversions,cost_per_conversion,purchase_roas&limit=500&time_range=' +
            encodeURIComponent(
              '{"since":"' +
                sinceD.toISOString().split('T')[0] +
                '","until":"' +
                nowD.toISOString().split('T')[0] +
                '"}',
            ),
        )
      }

      // métricas existentes indexadas por campaign_id + date, pra upsert sem N queries
      const existingMetrics = {}
      try {
        const recs = $app.findRecordsByFilter(
          'daily_metrics',
          'campaign_id.account_id = {:acc}',
          '',
          5000,
          0,
          { acc: accountRecord.id },
        )
        for (let i = 0; i < recs.length; i++) {
          const cid =
            typeof recs[i].get('campaign_id') === 'string'
              ? recs[i].get('campaign_id')
              : (recs[i].get('campaign_id') || {}).id || ''
          existingMetrics[cid + '|' + (recs[i].get('date') || '').split(' ')[0]] = recs[i]
        }
      } catch (err) {
        /* ignore */
      }

      for (let m = 0; m < dailyRows.length; m++) {
        const ins = dailyRows[m]
        const dateKey = ins.date_start
        const campRecId = metaCampToRec[ins.campaign_id]
        if (!dateKey || !campRecId) continue
        if (dateKey > lastActivity) lastActivity = dateKey
        if (existingMetrics[campRecId + '|' + dateKey]) continue

        const metric = new Record(metricsCol, {
          date: dateKey,
          campaign_id: campRecId,
          level: 'campaign',
          spend: num(ins.spend),
          conversions: int(ins.conversions),
          ctr: num(ins.ctr),
          impressions: int(ins.impressions),
          reach: int(ins.reach),
          clicks: int(ins.clicks),
          cpc: num(ins.cpc),
          cpm: num(ins.cpm),
          purchase_roas: num(ins.purchase_roas),
          cost_per_conversion: num(ins.cost_per_conversion),
        })
        try {
          $app.save(metric)
          syncCount.metrics++
        } catch (err) {
          /* pula métrica ruim */
        }
      }
    } catch (dailyErr) {
      console.error('daily insights error:', dailyErr)
    }

    conn.set('last_sync', new Date().toISOString())
    conn.set('status', 'connected')
    conn.set('account_name', accInfo.name || '')
    conn.set('currency', accInfo.currency || '')
    $app.save(conn)

    return e.json(200, {
      ok: true,
      account: accInfo.name,
      synced: {
        campaigns: totals.campaigns,
        adsets: totals.adsets,
        ads: totals.ads,
        metrics: syncCount.metrics,
      },
      new_records: syncCount,
      last_activity: lastActivity,
      errors: syncErrors,
    })
  },
  $apis.requireAuth(),
)
