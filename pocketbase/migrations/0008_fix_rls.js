/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Fix campaigns RLS - just require auth (no user_id field on campaigns)
    var campCol = app.findCollectionByNameOrId('campaigns')
    campCol.listRule = "@request.auth.id != ''"
    campCol.viewRule = "@request.auth.id != ''"
    campCol.createRule = "@request.auth.id != ''"
    campCol.updateRule = "@request.auth.id != ''"
    campCol.deleteRule = "@request.auth.id != ''"
    app.save(campCol)

    // Fix ad_sets
    var adsetCol = app.findCollectionByNameOrId('ad_sets')
    adsetCol.listRule = "@request.auth.id != ''"
    adsetCol.viewRule = "@request.auth.id != ''"
    adsetCol.createRule = "@request.auth.id != ''"
    adsetCol.updateRule = "@request.auth.id != ''"
    adsetCol.deleteRule = "@request.auth.id != ''"
    app.save(adsetCol)

    // Fix ads
    var adsCol = app.findCollectionByNameOrId('ads')
    adsCol.listRule = "@request.auth.id != ''"
    adsCol.viewRule = "@request.auth.id != ''"
    adsCol.createRule = "@request.auth.id != ''"
    adsCol.updateRule = "@request.auth.id != ''"
    adsCol.deleteRule = "@request.auth.id != ''"
    app.save(adsCol)

    // Fix daily_metrics
    var metricsCol = app.findCollectionByNameOrId('daily_metrics')
    metricsCol.listRule = "@request.auth.id != ''"
    metricsCol.viewRule = "@request.auth.id != ''"
    metricsCol.createRule = "@request.auth.id != ''"
    metricsCol.updateRule = "@request.auth.id != ''"
    metricsCol.deleteRule = "@request.auth.id != ''"
    app.save(metricsCol)

    // Fix ad_accounts - keep user_id check but make it work
    var accCol = app.findCollectionByNameOrId('ad_accounts')
    accCol.listRule = "@request.auth.id != ''"
    accCol.viewRule = "@request.auth.id != ''"
    accCol.createRule = "@request.auth.id != ''"
    accCol.updateRule = "@request.auth.id != ''"
    accCol.deleteRule = "@request.auth.id != ''"
    app.save(accCol)

    console.log('RLS rules fixed for all collections')
  },
  (app) => {
    // No rollback needed
  },
)
