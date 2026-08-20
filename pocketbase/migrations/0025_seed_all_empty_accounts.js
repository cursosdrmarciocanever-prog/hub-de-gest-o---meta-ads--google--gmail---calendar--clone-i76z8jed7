/// <reference path="../pb_data/types.d.ts" />
// Back-fill: garante que TODA conta de usuario tenha dados de trafego, para que
// o dashboard e o relatorio por email funcionem em qualquer login (nao so na
// conta demo). Para cada usuario SEM ad_account, semeia ad_account + campanhas
// + daily_metrics (14 dias ancorados em now) + ad_sets + ads, escopado ao seu
// user_id (RLS). Idempotente: quem ja tem ad_account e pulado. Nao mexe em
// dados existentes de ninguem.
migrate(
  (app) => {
    var camps = [
      {
        name: 'Summer Sale 2026',
        status: 'active',
        objective: 'sales',
        budget_type: 'daily',
        budget: 150,
        spend: 3200,
        impressions: 125000,
        reach: 98000,
        frequency: 1.28,
        clicks: 2375,
        ctr: 1.9,
        cpc: 1.35,
        cpm: 25.6,
        conversions: 65,
        cost_per_conversion: 49.2,
        purchase_roas: 2.8,
      },
      {
        name: 'Back to School',
        status: 'paused',
        objective: 'traffic',
        budget_type: 'daily',
        budget: 80,
        spend: 1500,
        impressions: 48000,
        reach: 39000,
        frequency: 1.23,
        clicks: 1104,
        ctr: 2.3,
        cpc: 1.36,
        cpm: 31.2,
        conversions: 28,
        cost_per_conversion: 53.6,
        purchase_roas: 1.9,
      },
      {
        name: 'New Product Launch',
        status: 'active',
        objective: 'sales',
        budget_type: 'daily',
        budget: 200,
        spend: 4750,
        impressions: 198000,
        reach: 151000,
        frequency: 1.31,
        clicks: 3366,
        ctr: 1.7,
        cpc: 1.41,
        cpm: 24.0,
        conversions: 92,
        cost_per_conversion: 51.6,
        purchase_roas: 3.5,
      },
      {
        name: 'Retargeting Q3',
        status: 'active',
        objective: 'leads',
        budget_type: 'daily',
        budget: 100,
        spend: 2100,
        impressions: 87000,
        reach: 52000,
        frequency: 1.67,
        clicks: 2088,
        ctr: 2.4,
        cpc: 1.01,
        cpm: 24.1,
        conversions: 41,
        cost_per_conversion: 51.2,
        purchase_roas: 2.2,
      },
      {
        name: 'Holiday Campaign',
        status: 'draft',
        objective: 'awareness',
        budget_type: 'lifetime',
        budget: 5000,
        spend: 0,
        impressions: 0,
        reach: 0,
        frequency: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        conversions: 0,
        cost_per_conversion: 0,
        purchase_roas: 0,
      },
    ]

    var weights = [0.6, 0.8, 0.7, 0.9, 1.0, 1.1, 0.9, 1.0, 1.2, 1.1, 1.3, 1.2, 1.4, 1.3]
    var sumW = 0
    for (var s = 0; s < weights.length; s++) sumW += weights[s]

    var adSetNames = [
      'Prospecting - Lookalike 1%',
      'Retargeting - 30 dias',
      'Prospecting - Interesses',
    ]
    var adSetSplits = [0.5, 0.3, 0.2]
    var adNames = ['Video - Demo', 'Imagem - Beneficios', 'Carrossel - Features']
    var adTypes = ['video', 'image', 'carousel']
    var rankings = ['above_average', 'average', 'average']

    var acctCol = app.findCollectionByNameOrId('ad_accounts')
    var campCol = app.findCollectionByNameOrId('campaigns')
    var adSetCol = app.findCollectionByNameOrId('ad_sets')
    var adsCol = app.findCollectionByNameOrId('ads')
    var metCol = app.findCollectionByNameOrId('daily_metrics')

    var users = app.findRecordsByFilter('_pb_users_auth_', "id != ''", '', 500, 0)
    var seededCount = 0

    for (var ui = 0; ui < users.length; ui++) {
      var userId = users[ui].id

      // idempotencia: se ja tem ad_account, nao mexe
      var existingAcct = []
      try {
        existingAcct = app.findRecordsByFilter(
          'ad_accounts',
          "user_id = '" + userId + "'",
          '',
          1,
          0,
        )
      } catch (e) {
        /* colecao vazia */
      }
      if (existingAcct.length > 0) continue

      var acct = new Record(acctCol, {
        account_id: 'act_seed_' + userId,
        name: 'Conta de Anuncios - Principal',
        currency: 'BRL',
        status: 'active',
        user_id: userId,
      })
      app.save(acct)

      var savedCamps = []
      for (var i = 0; i < camps.length; i++) {
        var c = camps[i]
        var camp = new Record(campCol, {
          name: c.name,
          status: c.status,
          objective: c.objective,
          buying_type: 'auction',
          budget_type: c.budget_type,
          budget: c.budget,
          spend: c.spend,
          impressions: c.impressions,
          reach: c.reach,
          frequency: c.frequency,
          clicks: c.clicks,
          ctr: c.ctr,
          cpc: c.cpc,
          cpm: c.cpm,
          conversions: c.conversions,
          cost_per_conversion: c.cost_per_conversion,
          purchase_roas: c.purchase_roas,
          roas: c.purchase_roas,
          account_id: acct.id,
        })
        app.save(camp)
        savedCamps.push(camp)
      }

      for (var ci = 0; ci < savedCamps.length; ci++) {
        var cData = camps[ci]
        if (cData.status === 'draft') continue
        for (var day = 13; day >= 0; day--) {
          var d = new Date(Date.now() - day * 24 * 60 * 60 * 1000)
          var dateStr = d.toISOString().split('T')[0]
          var frac = weights[(13 - day + ci) % 14] / sumW
          var met = new Record(metCol, {
            date: dateStr,
            campaign_id: savedCamps[ci].id,
            level: 'campaign',
            spend: Math.round(cData.spend * frac * 100) / 100,
            impressions: Math.round(cData.impressions * frac),
            reach: Math.round(cData.reach * frac),
            clicks: Math.round(cData.clicks * frac),
            conversions: Math.round(cData.conversions * frac),
            ctr: cData.ctr,
            cpc: cData.cpc,
            cpm: cData.cpm,
            cost_per_conversion: cData.cost_per_conversion,
            purchase_roas: cData.purchase_roas,
          })
          app.save(met)
        }
      }

      for (var pi = 0; pi < savedCamps.length; pi++) {
        var parent = savedCamps[pi]
        var pData = camps[pi]
        if (pData.status === 'draft') continue
        var nSets = pi < 3 ? 3 : 2
        for (var si = 0; si < nSets; si++) {
          var setFrac = adSetSplits[si] / (nSets === 3 ? 1 : adSetSplits[0] + adSetSplits[1])
          var adset = new Record(adSetCol, {
            name: adSetNames[si],
            status: pData.status,
            campaign_id: parent.id,
            daily_budget: Math.round(pData.budget * setFrac),
            optimization_goal: 'conversions',
            billing_event: 'impressions',
            bid_strategy: 'lowest_cost',
            targeting_age_min: 22,
            targeting_age_max: 55,
            targeting_genders: [1, 2],
            targeting_locations: ['BR'],
            spend: Math.round(pData.spend * setFrac * 100) / 100,
            impressions: Math.round(pData.impressions * setFrac),
            reach: Math.round(pData.reach * setFrac),
            frequency: pData.frequency,
            clicks: Math.round(pData.clicks * setFrac),
            ctr: pData.ctr,
            cpc: pData.cpc,
            cpm: pData.cpm,
            conversions: Math.round(pData.conversions * setFrac),
            cost_per_conversion: pData.cost_per_conversion,
            purchase_roas: pData.purchase_roas,
          })
          app.save(adset)

          for (var adi = 0; adi < 2; adi++) {
            var adFrac = adi === 0 ? 0.6 : 0.4
            var ad = new Record(adsCol, {
              name: adNames[(si + adi) % 3],
              status: pData.status,
              adset_id: adset.id,
              creative_type: adTypes[(si + adi) % 3],
              headline: 'Conheca o ' + pData.name,
              body_text: 'Clique e saiba mais sobre nossa oferta.',
              call_to_action: 'learn_more',
              spend: Math.round(adset.get('spend') * adFrac * 100) / 100,
              impressions: Math.round(adset.get('impressions') * adFrac),
              reach: Math.round(adset.get('reach') * adFrac),
              frequency: pData.frequency,
              clicks: Math.round(adset.get('clicks') * adFrac),
              ctr: pData.ctr,
              cpc: pData.cpc,
              cpm: pData.cpm,
              conversions: Math.round(adset.get('conversions') * adFrac),
              cost_per_conversion: pData.cost_per_conversion,
              purchase_roas: pData.purchase_roas,
              quality_ranking: rankings[(si + adi) % 3],
              engagement_rate_ranking: rankings[(si + adi + 1) % 3],
              conversion_rate_ranking: rankings[(si + adi + 2) % 3],
            })
            app.save(ad)
          }
        }
      }

      seededCount++
      console.log('Back-fill seeded ad data for user ' + userId)
    }

    console.log('Back-fill complete: seeded ' + seededCount + ' account(s)')
  },
  (app) => {
    /* seed de back-fill — sem rollback */
  },
)
