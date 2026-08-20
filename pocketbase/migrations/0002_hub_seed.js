/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Find the first user (created on signup)
    var users = app.findRecordsByFilter('_pb_users_auth_', '1=1', '', 1, 0)
    if (users.length === 0) {
      console.log('No users found, skipping seed')
      return
    }
    var userId = users[0].id

    // --- Create ad account ---
    var adAccountsCol = app.findCollectionByNameOrId('ad_accounts')
    var account = new Record(adAccountsCol, {
      account_id: 'act_1234567890',
      name: 'Adapta MED - Principal',
      currency: 'BRL',
      status: 'active',
      user_id: userId,
    })
    app.save(account)

    // --- Create campaigns ---
    var campaignsCol = app.findCollectionByNameOrId('campaigns')
    var metricsCol = app.findCollectionByNameOrId('daily_metrics')

    var campaignData = [
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

    var dailySpendPattern = [320, 410, 380, 520, 480, 610, 550, 720, 680, 810, 760, 920, 880, 760]

    for (var i = 0; i < campaignData.length; i++) {
      var c = campaignData[i]
      var campaign = new Record(campaignsCol, {
        name: c.name,
        status: c.status,
        spend: c.spend,
        impressions: c.impressions,
        conversions: c.conversions,
        roas: c.roas,
        account_id: account.id,
      })
      app.save(campaign)

      // Create daily metrics for active campaigns
      if (c.status === 'active') {
        for (var d = 0; d < 14; d++) {
          var date = new Date()
          date.setDate(date.getDate() - (13 - d))
          var daySpend = dailySpendPattern[d] * (c.spend / 5000)
          var dayConv = Math.round(daySpend / 100)
          var metric = new Record(metricsCol, {
            date: date.toISOString().split('T')[0],
            spend: Math.round(daySpend * 100) / 100,
            conversions: dayConv,
            ctr: Math.round((1.5 + Math.random() * 0.8) * 100) / 100,
            campaign_id: campaign.id,
          })
          app.save(metric)
        }
      }
    }

    console.log('Seed complete: 1 account, 5 campaigns, daily metrics')
  },
  (app) => {
    try {
      var metrics = app.findRecordsByFilter('daily_metrics', '1=1', '', 500, 0)
      for (var i = 0; i < metrics.length; i++) app.delete(metrics[i])
    } catch (e) {}
    try {
      var camps = app.findRecordsByFilter('campaigns', '1=1', '', 500, 0)
      for (var i = 0; i < camps.length; i++) app.delete(camps[i])
    } catch (e) {}
    try {
      var accs = app.findRecordsByFilter('ad_accounts', '1=1', '', 500, 0)
      for (var i = 0; i < accs.length; i++) app.delete(accs[i])
    } catch (e) {}
  },
)
