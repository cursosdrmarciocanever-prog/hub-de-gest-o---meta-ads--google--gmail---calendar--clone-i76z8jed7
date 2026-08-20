/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    var campaignsId = app.findCollectionByNameOrId('campaigns').id

    // --- Add fields to campaigns ---
    var campCol = app.findCollectionByNameOrId('campaigns')
    var newCampFields = [
      {
        name: 'objective',
        type: 'select',
        values: ['awareness', 'traffic', 'engagement', 'leads', 'sales', 'app_promotion'],
        maxSelect: 1,
      },
      { name: 'buying_type', type: 'select', values: ['auction', 'reserved'], maxSelect: 1 },
      { name: 'budget_type', type: 'select', values: ['daily', 'lifetime'], maxSelect: 1 },
      { name: 'budget', type: 'number' },
      { name: 'reach', type: 'number', onlyInt: true },
      { name: 'frequency', type: 'number' },
      { name: 'clicks', type: 'number', onlyInt: true },
      { name: 'ctr', type: 'number' },
      { name: 'cpc', type: 'number' },
      { name: 'cpm', type: 'number' },
      { name: 'cost_per_conversion', type: 'number' },
      { name: 'purchase_roas', type: 'number' },
      { name: 'actions', type: 'json' },
    ]
    for (var i = 0; i < newCampFields.length; i++) {
      if (!campCol.fields.getByName(newCampFields[i].name)) {
        if (newCampFields[i].type === 'select') {
          campCol.fields.add(new SelectField(newCampFields[i]))
        } else if (newCampFields[i].type === 'json') {
          campCol.fields.add(new JSONField(newCampFields[i]))
        } else if (newCampFields[i].type === 'number') {
          campCol.fields.add(new NumberField(newCampFields[i]))
        }
      }
    }
    app.save(campCol)

    // --- ad_sets ---
    var adSets = new Collection({
      name: 'ad_sets',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'status', type: 'select', values: ['active', 'paused', 'deleted'], maxSelect: 1 },
        {
          name: 'campaign_id',
          type: 'relation',
          required: true,
          collectionId: campaignsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'daily_budget', type: 'number' },
        { name: 'lifetime_budget', type: 'number' },
        {
          name: 'optimization_goal',
          type: 'select',
          values: ['reach', 'link_clicks', 'conversions', 'app_installs', 'video_views'],
          maxSelect: 1,
        },
        {
          name: 'billing_event',
          type: 'select',
          values: ['impressions', 'link_clicks', 'app_installs'],
          maxSelect: 1,
        },
        {
          name: 'bid_strategy',
          type: 'select',
          values: ['lowest_cost', 'cost_cap', 'bid_cap'],
          maxSelect: 1,
        },
        { name: 'targeting_age_min', type: 'number', onlyInt: true },
        { name: 'targeting_age_max', type: 'number', onlyInt: true },
        { name: 'targeting_genders', type: 'json' },
        { name: 'targeting_locations', type: 'json' },
        { name: 'targeting_interests', type: 'json' },
        { name: 'spend', type: 'number' },
        { name: 'impressions', type: 'number', onlyInt: true },
        { name: 'reach', type: 'number', onlyInt: true },
        { name: 'frequency', type: 'number' },
        { name: 'clicks', type: 'number', onlyInt: true },
        { name: 'ctr', type: 'number' },
        { name: 'cpc', type: 'number' },
        { name: 'cpm', type: 'number' },
        { name: 'conversions', type: 'number', onlyInt: true },
        { name: 'cost_per_conversion', type: 'number' },
        { name: 'purchase_roas', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(adSets)

    // --- ads ---
    var adSetsId = app.findCollectionByNameOrId('ad_sets').id
    var ads = new Collection({
      name: 'ads',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'status', type: 'select', values: ['active', 'paused', 'deleted'], maxSelect: 1 },
        {
          name: 'adset_id',
          type: 'relation',
          required: true,
          collectionId: adSetsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'creative_type',
          type: 'select',
          values: ['image', 'video', 'carousel', 'collection'],
          maxSelect: 1,
        },
        { name: 'creative_url', type: 'url' },
        { name: 'headline', type: 'text' },
        { name: 'body_text', type: 'text' },
        {
          name: 'call_to_action',
          type: 'select',
          values: ['learn_more', 'shop_now', 'sign_up', 'contact_us', 'download', 'book_now'],
          maxSelect: 1,
        },
        { name: 'link_url', type: 'url' },
        { name: 'spend', type: 'number' },
        { name: 'impressions', type: 'number', onlyInt: true },
        { name: 'reach', type: 'number', onlyInt: true },
        { name: 'frequency', type: 'number' },
        { name: 'clicks', type: 'number', onlyInt: true },
        { name: 'ctr', type: 'number' },
        { name: 'cpc', type: 'number' },
        { name: 'cpm', type: 'number' },
        { name: 'conversions', type: 'number', onlyInt: true },
        { name: 'cost_per_conversion', type: 'number' },
        { name: 'purchase_roas', type: 'number' },
        {
          name: 'quality_ranking',
          type: 'select',
          values: ['above_average', 'average', 'below_average'],
          maxSelect: 1,
        },
        {
          name: 'engagement_rate_ranking',
          type: 'select',
          values: ['above_average', 'average', 'below_average'],
          maxSelect: 1,
        },
        {
          name: 'conversion_rate_ranking',
          type: 'select',
          values: ['above_average', 'average', 'below_average'],
          maxSelect: 1,
        },
        { name: 'video_views', type: 'number', onlyInt: true },
        { name: 'video_play_rate', type: 'number' },
        { name: 'likes', type: 'number', onlyInt: true },
        { name: 'comments', type: 'number', onlyInt: true },
        { name: 'shares', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(ads)

    // --- Expand daily_metrics ---
    var metricsCol = app.findCollectionByNameOrId('daily_metrics')
    var newMetricFields = [
      {
        name: 'level',
        type: 'select',
        values: ['account', 'campaign', 'adset', 'ad'],
        maxSelect: 1,
      },
      { name: 'level_id', type: 'text' },
      { name: 'impressions', type: 'number', onlyInt: true },
      { name: 'reach', type: 'number', onlyInt: true },
      { name: 'clicks', type: 'number', onlyInt: true },
      { name: 'cpc', type: 'number' },
      { name: 'cpm', type: 'number' },
      { name: 'purchase_roas', type: 'number' },
      { name: 'cost_per_conversion', type: 'number' },
    ]
    for (var j = 0; j < newMetricFields.length; j++) {
      if (!metricsCol.fields.getByName(newMetricFields[j].name)) {
        if (newMetricFields[j].type === 'select') {
          metricsCol.fields.add(new SelectField(newMetricFields[j]))
        } else if (newMetricFields[j].type === 'number') {
          metricsCol.fields.add(new NumberField(newMetricFields[j]))
        } else {
          metricsCol.fields.add(new TextField(newMetricFields[j]))
        }
      }
    }
    app.save(metricsCol)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('ads'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('ad_sets'))
    } catch (e) {}
  },
)
