/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Find demo user
    var users = app.findRecordsByFilter('_pb_users_auth_', "email = 'demo@hub.com'", '', 1, 0)
    if (users.length === 0) {
      console.log('Demo user not found, skipping reseed')
      return
    }
    var userId = users[0].id

    // Check if data already exists
    var existingCamps = app.findRecordsByFilter('campaigns', '1=1', '', 1, 0)
    if (existingCamps.length > 0) {
      console.log('Campaigns already exist, skipping reseed')
      return
    }

    // --- Ad account ---
    var acctCol = app.findCollectionByNameOrId('ad_accounts')
    var acct = new Record(acctCol, {
      account_id: 'act_1234567890',
      name: 'Adapta MED - Principal',
      currency: 'BRL',
      status: 'active',
      user_id: userId,
    })
    app.save(acct)

    // --- Campaigns + daily metrics ---
    var campCol = app.findCollectionByNameOrId('campaigns')
    var metCol = app.findCollectionByNameOrId('daily_metrics')

    var camps = [
      {
        name: 'Summer Sale 2026',
        status: 'active',
        spend: 3200,
        impressions: 125000,
        conversions: 65,
        roas: 2.8,
      },
      {
        name: 'Back to School',
        status: 'paused',
        spend: 1500,
        impressions: 48000,
        conversions: 28,
        roas: 1.9,
      },
      {
        name: 'New Product Launch',
        status: 'active',
        spend: 4750,
        impressions: 198000,
        conversions: 92,
        roas: 3.5,
      },
      {
        name: 'Retargeting Q3',
        status: 'active',
        spend: 2100,
        impressions: 87000,
        conversions: 41,
        roas: 2.2,
      },
      {
        name: 'Holiday Campaign',
        status: 'draft',
        spend: 0,
        impressions: 0,
        conversions: 0,
        roas: 0,
      },
    ]

    var savedCamps = []
    for (var i = 0; i < camps.length; i++) {
      var c = camps[i]
      var camp = new Record(campCol, {
        name: c.name,
        status: c.status,
        spend: c.spend,
        impressions: c.impressions,
        conversions: c.conversions,
        roas: c.roas,
        objective:
          i === 0
            ? 'conversions'
            : i === 1
              ? 'traffic'
              : i === 2
                ? 'sales'
                : i === 3
                  ? 'conversions'
                  : 'reach',
        start_date: '2026-07-01',
        end_date: '2026-07-31',
        account_id: acct.get('account_id'),
        user_id: userId,
      })
      app.save(camp)
      savedCamps.push(camp)
    }

    // Daily metrics for last 14 days
    var now = new Date()
    for (var day = 13; day >= 0; day--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
      var dateStr = d.toISOString().split('T')[0]
      var base = 50 + Math.floor(Math.random() * 30 + day * 15)
      var met = new Record(metCol, {
        date: dateStr,
        spend: base * 1.2,
        impressions: base * 50,
        clicks: Math.floor(base * 0.8),
        conversions: Math.floor(base * 0.05),
        ctr: 1.2 + Math.random() * 0.8,
        cpc: 0.5 + Math.random() * 0.4,
        roas: 1.5 + Math.random() * 3,
        account_id: acct.get('account_id'),
        user_id: userId,
      })
      app.save(met)
    }

    // --- Ad Sets ---
    var adSetCol = app.findCollectionByNameOrId('ad_sets')
    var adsCol = app.findCollectionByNameOrId('ads')

    var adSetNames = [
      'Prospecting - Lookalike 1%',
      'Retargeting - 30 dias',
      'Prospecting - Interesses',
      'Broad Audience',
    ]
    var adNames = [
      'Video - Demo',
      'Imagem - Beneficios',
      'Carrossel - Features',
      'Imagem - Social Proof',
    ]

    for (var ci = 0; ci < savedCamps.length; ci++) {
      var camp = savedCamps[ci]
      if (camp.get('status') === 'draft') continue
      for (var ai = 0; ai < (ci < 3 ? 3 : 2); ai++) {
        var adset = new Record(adSetCol, {
          name: adSetNames[ai % 4],
          status: camp.get('status'),
          campaign_id: camp.id,
          opt: 'conversions',
          billing: 'impressions',
          bid: 'lowest_cost',
          budget: 150 + ci * 30,
          age_min: 22,
          age_max: 55,
          genders: [0, 1],
          spend: Math.floor(camp.get('spend') / (ci < 3 ? 3 : 2)),
          impressions: Math.floor(camp.get('impressions') / (ci < 3 ? 3 : 2)),
          impressions_ranking: new Date().toISOString(),
          spend_ranking: new Date().toISOString(),
          conversions_ranking: new Date().toISOString(),
          account_id: acct.get('account_id'),
          user_id: userId,
        })
        app.save(adset)

        for (var adi = 0; adi < 2; adi++) {
          var ad = new Record(adsCol, {
            name: adNames[(ai + adi) % 4],
            status: camp.get('status'),
            adset_id: adset.id,
            type: adi === 0 ? 'video' : 'image',
            cta: 'learn_more',
            headline: 'Conheca mais',
            body: 'Clique e saiba mais',
            spend: Math.floor(adset.get('spend') / 2),
            impressions: Math.floor(adset.get('impressions') / 2),
            clicks: Math.floor((adset.get('impressions') / 2) * 0.015),
            impressions_ranking: new Date().toISOString(),
            spend_ranking: new Date().toISOString(),
            clicks_ranking: new Date().toISOString(),
            account_id: acct.get('account_id'),
            user_id: userId,
          })
          app.save(ad)
        }
      }
    }

    console.log(
      'Reseed complete: ' + savedCamps.length + ' campaigns with metrics, ad sets, and ads',
    )
  },
  (app) => {
    /* no rollback */
  },
)
