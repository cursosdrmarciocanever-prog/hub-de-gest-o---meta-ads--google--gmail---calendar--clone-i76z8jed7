/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Check if ad_sets already exist
    var existingAdSets = app.findRecordsByFilter('ad_sets', '1=1', '', 1, 0)
    if (existingAdSets.length > 0) {
      console.log('Full seed already exists, skipping')
      return
    }

    // Get first campaign to attach ad sets to
    var campaigns = app.findRecordsByFilter('campaigns', "status = 'active'", '', 10, 0)
    if (campaigns.length === 0) {
      console.log('No active campaigns found, skipping')
      return
    }

    var adSetsCol = app.findCollectionByNameOrId('ad_sets')
    var adsCol = app.findCollectionByNameOrId('ads')

    // Ad set templates per campaign objective
    var adSetTemplates = [
      {
        name: 'Prospecting - Lookalike 1%',
        opt: 'conversions',
        billing: 'impressions',
        bid: 'lowest_cost',
        budget: 200,
        age_min: 25,
        age_max: 55,
        genders: [0, 1],
        locations: ['Brazil'],
        interests: ['marketing', 'business'],
      },
      {
        name: 'Retargeting - 30 days',
        opt: 'conversions',
        billing: 'impressions',
        bid: 'lowest_cost',
        budget: 150,
        age_min: 18,
        age_max: 65,
        genders: [0, 1],
        locations: ['Brazil'],
        interests: [],
      },
      {
        name: 'Prospecting - Interest Based',
        opt: 'link_clicks',
        billing: 'impressions',
        bid: 'lowest_cost',
        budget: 180,
        age_min: 22,
        age_max: 45,
        genders: [0, 1],
        locations: ['Brazil', 'Portugal'],
        interests: ['technology', 'startups'],
      },
      {
        name: 'Broad Audience',
        opt: 'reach',
        billing: 'impressions',
        bid: 'lowest_cost',
        budget: 100,
        age_min: 18,
        age_max: 65,
        genders: [0, 1],
        locations: ['Brazil'],
        interests: [],
      },
    ]

    var adTemplates = [
      {
        name: 'Video Ad - Product Demo',
        type: 'video',
        cta: 'learn_more',
        headline: 'Conheca o produto',
        body: 'Veja como funciona em 30 segundos',
      },
      {
        name: 'Image Ad - Benefits',
        type: 'image',
        cta: 'shop_now',
        headline: 'Compre agora',
        body: 'Oferta especial por tempo limitado',
      },
      {
        name: 'Carousel - Features',
        type: 'carousel',
        cta: 'learn_more',
        headline: 'Descubra os recursos',
        body: 'Tudo o que voce precisa em um so lugar',
      },
      {
        name: 'Image Ad - Social Proof',
        type: 'image',
        cta: 'sign_up',
        headline: 'Junte-se a milhares',
        body: 'Veja o que nossos clientes dizem',
      },
    ]

    var totalAdSets = 0
    var totalAds = 0

    // Create 2-3 ad sets per campaign
    for (var c = 0; c < campaigns.length && c < 5; c++) {
      var campaign = campaigns[c]
      var campSpend = campaign.get('spend') || 1000
      var numAdSets = Math.min(3, adSetTemplates.length)

      for (var a = 0; a < numAdSets; a++) {
        var t = adSetTemplates[a]
        var adsetSpend = Math.round(campSpend * (0.4 - a * 0.1) * 100) / 100
        var adsetImps = Math.round(adsetSpend * 40)
        var adsetReach = Math.round(adsetImps * 0.7)
        var adsetClicks = Math.round(adsetImps * 0.018)
        var adsetConv = Math.round(adsetClicks * 0.15)
        var adsetCtr = Math.round((adsetClicks / adsetImps) * 10000) / 100
        var adsetCpc = Math.round((adsetSpend / adsetClicks) * 100) / 100
        var adsetCpm = Math.round((adsetSpend / adsetImps) * 1000 * 100) / 100
        var adsetRoas = adsetConv > 0 ? Math.round(((adsetSpend * 3) / adsetSpend) * 10) / 10 : 0
        var adsetCpa = adsetConv > 0 ? Math.round((adsetSpend / adsetConv) * 100) / 100 : 0

        var adset = new Record(adSetsCol, {
          name: t.name,
          status: a === 2 ? 'paused' : 'active',
          campaign_id: campaign.id,
          daily_budget: t.budget,
          optimization_goal: t.opt,
          billing_event: t.billing,
          bid_strategy: t.bid,
          targeting_age_min: t.age_min,
          targeting_age_max: t.age_max,
          targeting_genders: JSON.stringify(t.genders),
          targeting_locations: JSON.stringify(t.locations),
          targeting_interests: JSON.stringify(t.interests),
          spend: adsetSpend,
          impressions: adsetImps,
          reach: adsetReach,
          frequency: Math.round((adsetImps / adsetReach) * 100) / 100,
          clicks: adsetClicks,
          ctr: adsetCtr,
          cpc: adsetCpc,
          cpm: adsetCpm,
          conversions: adsetConv,
          cost_per_conversion: adsetCpa,
          purchase_roas: adsetRoas,
        })
        app.save(adset)
        totalAdSets++

        // Create 2 ads per ad set
        for (var ad = 0; ad < 2; ad++) {
          var at = adTemplates[ad % adTemplates.length]
          var adSpend = Math.round(adsetSpend * (0.6 - ad * 0.1) * 100) / 100
          var adImps = Math.round(adSpend * 40)
          var adReach = Math.round(adImps * 0.75)
          var adClicks = Math.round(adImps * (0.015 + Math.random() * 0.01))
          var adConv = Math.round(adClicks * (0.1 + Math.random() * 0.1))
          var adCtr = Math.round((adClicks / adImps) * 10000) / 100
          var adCpc = Math.round((adSpend / adClicks) * 100) / 100
          var adCpm = Math.round((adSpend / adImps) * 1000 * 100) / 100
          var adRoas = adConv > 0 ? Math.round((2.5 + Math.random() * 2) * 10) / 10 : 0
          var adCpa = adConv > 0 ? Math.round((adSpend / adConv) * 100) / 100 : 0

          var rankings = ['above_average', 'average', 'below_average']

          var adRecord = new Record(adsCol, {
            name: at.name + ' - V' + (ad + 1),
            status: ad === 1 && a === 2 ? 'paused' : 'active',
            adset_id: adset.id,
            creative_type: at.type,
            headline: at.headline,
            body_text: at.body,
            call_to_action: at.cta,
            spend: adSpend,
            impressions: adImps,
            reach: adReach,
            frequency: Math.round((adImps / adReach) * 100) / 100,
            clicks: adClicks,
            ctr: adCtr,
            cpc: adCpc,
            cpm: adCpm,
            conversions: adConv,
            cost_per_conversion: adCpa,
            purchase_roas: adRoas,
            quality_ranking: rankings[Math.floor(Math.random() * 3)],
            engagement_rate_ranking: rankings[Math.floor(Math.random() * 3)],
            conversion_rate_ranking: rankings[Math.floor(Math.random() * 3)],
            video_views: at.type === 'video' ? Math.round(adImps * 0.45) : 0,
            video_play_rate:
              at.type === 'video' ? Math.round((0.3 + Math.random() * 0.2) * 100) / 100 : 0,
            likes: Math.round(adImps * 0.005),
            comments: Math.round(adImps * 0.001),
            shares: Math.round(adImps * 0.0008),
          })
          app.save(adRecord)
          totalAds++
        }
      }
    }

    console.log('Full seed: ' + totalAdSets + ' ad sets, ' + totalAds + ' ads')
  },
  (app) => {
    try {
      var ads = app.findRecordsByFilter('ads', '1=1', '', 500, 0)
      for (var i = 0; i < ads.length; i++) app.delete(ads[i])
    } catch (e) {}
    try {
      var adsets = app.findRecordsByFilter('ad_sets', '1=1', '', 500, 0)
      for (var i = 0; i < adsets.length; i++) app.delete(adsets[i])
    } catch (e) {}
  },
)
