/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Create demo user if not exists
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var existing = app.findRecordsByFilter('_pb_users_auth_', "email = 'demo@hub.com'", '', 1, 0)
    var userId

    if (existing.length > 0) {
      userId = existing[0].id
      console.log('Demo user already exists: ' + userId)
    } else {
      var user = new Record(usersCol, {
        email: 'demo@hub.com',
        password: 'demo123456',
        passwordConfirm: 'demo123456',
        name: 'Fabiano',
      })
      app.save(user)
      userId = user.id
      console.log('Created demo user: ' + userId)
    }

    // Check if data already seeded
    var existingAccounts = app.findRecordsByFilter(
      'ad_accounts',
      "user_id = '" + userId + "'",
      '',
      1,
      0,
    )
    if (existingAccounts.length > 0) {
      console.log('Data already seeded for this user, skipping')
      return
    }

    // --- Ad accounts ---
    var adAccountsCol = app.findCollectionByNameOrId('ad_accounts')

    var accounts = [
      {
        account_id: 'act_1234567890',
        name: 'Adapta MED - Principal',
        currency: 'BRL',
        status: 'active',
      },
      {
        account_id: 'act_0987654321',
        name: 'Adapta MED - Testes',
        currency: 'BRL',
        status: 'active',
      },
      {
        account_id: 'act_5555555555',
        name: 'Skip App - Launch',
        currency: 'USD',
        status: 'active',
      },
      { account_id: 'act_1111111111', name: 'Cliente XYZ', currency: 'BRL', status: 'inactive' },
    ]

    var savedAccounts = []
    for (var i = 0; i < accounts.length; i++) {
      var a = accounts[i]
      var account = new Record(adAccountsCol, {
        account_id: a.account_id,
        name: a.name,
        currency: a.currency,
        status: a.status,
        user_id: userId,
      })
      app.save(account)
      savedAccounts.push(account)
    }
    console.log('Created ' + savedAccounts.length + ' ad accounts')

    // --- Campaigns ---
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
        name: 'Brand Awareness',
        status: 'active',
        spend: 900,
        impressions: 320000,
        conversions: 19,
        roas: 1.5,
      },
      {
        name: 'Holiday Campaign',
        status: 'draft',
        spend: 0,
        impressions: 0,
        conversions: 0,
        roas: 0,
      },
      {
        name: 'Black Friday 2026',
        status: 'active',
        spend: 5800,
        impressions: 245000,
        conversions: 120,
        roas: 4.1,
      },
      {
        name: 'Lookalike Audiences',
        status: 'paused',
        spend: 1200,
        impressions: 67000,
        conversions: 22,
        roas: 2.5,
      },
    ]

    var dailyPattern = [320, 410, 380, 520, 480, 610, 550, 720, 680, 810, 760, 920, 880, 760]
    var totalMetrics = 0

    for (var c = 0; c < campaignData.length; c++) {
      var cd = campaignData[c]
      var campaign = new Record(campaignsCol, {
        name: cd.name,
        status: cd.status,
        spend: cd.spend,
        impressions: cd.impressions,
        conversions: cd.conversions,
        roas: cd.roas,
        account_id: savedAccounts[0].id,
      })
      app.save(campaign)

      // Daily metrics for active campaigns
      if (cd.status === 'active') {
        for (var d = 0; d < 14; d++) {
          var date = new Date()
          date.setDate(date.getDate() - (13 - d))
          var ratio = cd.spend / 5000
          var daySpend = Math.round(dailyPattern[d] * ratio * 100) / 100
          var dayConv = Math.round(daySpend / 80)
          var dayCtr = Math.round((1.2 + Math.random() * 1.1) * 100) / 100

          var metric = new Record(metricsCol, {
            date: date.toISOString().split('T')[0],
            spend: daySpend,
            conversions: dayConv,
            ctr: dayCtr,
            campaign_id: campaign.id,
          })
          app.save(metric)
          totalMetrics++
        }
      }
    }
    console.log('Created ' + campaignData.length + ' campaigns, ' + totalMetrics + ' daily metrics')
  },
  (app) => {
    // Cleanup
    try {
      var metrics = app.findRecordsByFilter('daily_metrics', '1=1', '', 1000, 0)
      for (var i = 0; i < metrics.length; i++) app.delete(metrics[i])
    } catch (e) {}
    try {
      var camps = app.findRecordsByFilter('campaigns', '1=1', '', 500, 0)
      for (var i = 0; i < camps.length; i++) app.delete(camps[i])
    } catch (e) {}
    try {
      var accs = app.findRecordsByFilter('ad_accounts', '1=1', '', 100, 0)
      for (var i = 0; i < accs.length; i++) app.delete(accs[i])
    } catch (e) {}
    try {
      var users = app.findRecordsByFilter('_pb_users_auth_', "email = 'demo@hub.com'", '', 1, 0)
      for (var i = 0; i < users.length; i++) app.delete(users[i])
    } catch (e) {}
  },
)
