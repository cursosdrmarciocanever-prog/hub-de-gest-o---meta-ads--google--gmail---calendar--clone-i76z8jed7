/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // --- users: cadastro aberto (multi-tenant) ---
    var users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    app.save(users)

    // --- ad_accounts: somente o dono ---
    var acc = app.findCollectionByNameOrId('ad_accounts')
    acc.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    acc.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    acc.createRule = "@request.auth.id != '' && user_id = @request.auth.id"
    acc.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    acc.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(acc)

    // --- campaigns: leitura do dono via relacao; escrita apenas por hooks ---
    var camp = app.findCollectionByNameOrId('campaigns')
    camp.listRule = "@request.auth.id != '' && account_id.user_id = @request.auth.id"
    camp.viewRule = "@request.auth.id != '' && account_id.user_id = @request.auth.id"
    camp.createRule = null
    camp.updateRule = null
    camp.deleteRule = null
    app.save(camp)

    // --- ad_sets ---
    var adsets = app.findCollectionByNameOrId('ad_sets')
    adsets.listRule = "@request.auth.id != '' && campaign_id.account_id.user_id = @request.auth.id"
    adsets.viewRule = "@request.auth.id != '' && campaign_id.account_id.user_id = @request.auth.id"
    adsets.createRule = null
    adsets.updateRule = null
    adsets.deleteRule = null
    app.save(adsets)

    // --- ads ---
    var ads = app.findCollectionByNameOrId('ads')
    ads.listRule =
      "@request.auth.id != '' && adset_id.campaign_id.account_id.user_id = @request.auth.id"
    ads.viewRule =
      "@request.auth.id != '' && adset_id.campaign_id.account_id.user_id = @request.auth.id"
    ads.createRule = null
    ads.updateRule = null
    ads.deleteRule = null
    app.save(ads)

    // --- daily_metrics ---
    var metrics = app.findCollectionByNameOrId('daily_metrics')
    metrics.listRule = "@request.auth.id != '' && campaign_id.account_id.user_id = @request.auth.id"
    metrics.viewRule = "@request.auth.id != '' && campaign_id.account_id.user_id = @request.auth.id"
    metrics.createRule = null
    metrics.updateRule = null
    metrics.deleteRule = null
    app.save(metrics)

    // --- meta_connections: dono le/apaga; criacao/edicao apenas via hook (token nunca vem do client) ---
    var meta = app.findCollectionByNameOrId('meta_connections')
    meta.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    meta.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    meta.createRule = null
    meta.updateRule = null
    meta.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
    var metaToken = meta.fields.getByName('access_token')
    if (metaToken) metaToken.hidden = true
    app.save(meta)

    // --- google_connections: dono le status/email; tokens ocultos; escrita apenas via hooks ---
    var goog = app.findCollectionByNameOrId('google_connections')
    goog.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    goog.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    goog.createRule = null
    goog.updateRule = null
    goog.deleteRule = null
    var gAccess = goog.fields.getByName('access_token')
    if (gAccess) gAccess.hidden = true
    var gRefresh = goog.fields.getByName('refresh_token')
    if (gRefresh) gRefresh.hidden = true
    // campos legados de credencial por-registro: credenciais vivem em $secrets
    var legacy = ['client_id', 'client_secret', 'redirect_uri']
    for (var i = 0; i < legacy.length; i++) {
      var f = goog.fields.getByName(legacy[i])
      if (f) goog.fields.removeById(f.id)
    }
    app.save(goog)

    // --- calendar_events / gmail_messages: leitura do dono; escrita apenas via hooks ---
    var cal = app.findCollectionByNameOrId('calendar_events')
    cal.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    cal.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    cal.createRule = null
    cal.updateRule = null
    cal.deleteRule = null
    app.save(cal)

    var gmail = app.findCollectionByNameOrId('gmail_messages')
    gmail.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    gmail.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    gmail.createRule = null
    gmail.updateRule = null
    gmail.deleteRule = null
    app.save(gmail)
  },
  (app) => {
    var users = app.findCollectionByNameOrId('users')
    users.createRule = null
    app.save(users)

    var open = "@request.auth.id != ''"
    var names = ['ad_accounts', 'campaigns', 'ad_sets', 'ads', 'daily_metrics']
    for (var i = 0; i < names.length; i++) {
      var col = app.findCollectionByNameOrId(names[i])
      col.listRule = open
      col.viewRule = open
      col.createRule = open
      col.updateRule = open
      col.deleteRule = open
      app.save(col)
    }

    var meta = app.findCollectionByNameOrId('meta_connections')
    meta.listRule = "@request.auth.id != '' && user_id = @request.auth.id"
    meta.viewRule = "@request.auth.id != '' && user_id = @request.auth.id"
    meta.createRule = "@request.auth.id != ''"
    meta.updateRule = "@request.auth.id != '' && user_id = @request.auth.id"
    meta.deleteRule = "@request.auth.id != '' && user_id = @request.auth.id"
    var metaToken = meta.fields.getByName('access_token')
    if (metaToken) metaToken.hidden = false
    app.save(meta)

    var goog = app.findCollectionByNameOrId('google_connections')
    goog.listRule = open
    goog.viewRule = open
    goog.createRule = open
    goog.updateRule = open
    goog.deleteRule = open
    var gAccess = goog.fields.getByName('access_token')
    if (gAccess) gAccess.hidden = false
    var gRefresh = goog.fields.getByName('refresh_token')
    if (gRefresh) gRefresh.hidden = false
    goog.fields.add(new Field({ name: 'client_id', type: 'text' }))
    goog.fields.add(new Field({ name: 'client_secret', type: 'text' }))
    goog.fields.add(new Field({ name: 'redirect_uri', type: 'text' }))
    app.save(goog)

    var others = ['calendar_events', 'gmail_messages']
    for (var j = 0; j < others.length; j++) {
      var c = app.findCollectionByNameOrId(others[j])
      c.listRule = open
      c.viewRule = open
      c.createRule = open
      c.updateRule = open
      c.deleteRule = open
      app.save(c)
    }
  },
)
