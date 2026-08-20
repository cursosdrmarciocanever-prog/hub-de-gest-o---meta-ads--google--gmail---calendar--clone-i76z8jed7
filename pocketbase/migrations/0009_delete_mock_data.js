/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Delete all records from all collections (mock + real)
    // User will re-sync from Meta to get only real data

    var collections = ['daily_metrics', 'ads', 'ad_sets', 'campaigns', 'ad_accounts']
    var deleted = {}

    for (var i = 0; i < collections.length; i++) {
      var colName = collections[i]
      try {
        var records = app.findRecordsByFilter(colName, '1=1', '', 1000, 0)
        deleted[colName] = records.length
        for (var j = 0; j < records.length; j++) {
          app.delete(records[j])
        }
      } catch (err) {
        deleted[colName] = 0
      }
    }

    console.log('Deleted mock data: ' + JSON.stringify(deleted))
  },
  (app) => {
    // No rollback
  },
)
