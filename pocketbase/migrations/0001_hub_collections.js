/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // --- ad_accounts ---
    const adAccounts = new Collection({
      name: 'ad_accounts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'account_id', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'currency', type: 'text', required: true },
        { name: 'status', type: 'select', values: ['active', 'inactive'], maxSelect: 1 },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(adAccounts)

    // --- campaigns ---
    const adAccountsId = app.findCollectionByNameOrId('ad_accounts').id
    const campaigns = new Collection({
      name: 'campaigns',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'status', type: 'select', values: ['active', 'paused', 'draft'], maxSelect: 1 },
        { name: 'spend', type: 'number' },
        { name: 'impressions', type: 'number', onlyInt: true },
        { name: 'conversions', type: 'number', onlyInt: true },
        { name: 'roas', type: 'number' },
        {
          name: 'account_id',
          type: 'relation',
          required: true,
          collectionId: adAccountsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(campaigns)

    // --- daily_metrics ---
    const campaignsId = app.findCollectionByNameOrId('campaigns').id
    const metrics = new Collection({
      name: 'daily_metrics',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'date', type: 'date', required: true },
        { name: 'spend', type: 'number' },
        { name: 'conversions', type: 'number', onlyInt: true },
        { name: 'ctr', type: 'number' },
        {
          name: 'campaign_id',
          type: 'relation',
          required: true,
          collectionId: campaignsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(metrics)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('daily_metrics'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('campaigns'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('ad_accounts'))
    } catch (e) {}
  },
)
