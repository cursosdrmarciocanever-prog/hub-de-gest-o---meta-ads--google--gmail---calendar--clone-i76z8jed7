/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      var records = app.findRecordsByFilter('google_connections', '1=1', '', 100, 0)
      for (var i = 0; i < records.length; i++) {
        app.delete(records[i])
      }
      console.log('Cleaned ' + records.length + ' google_connections records')
    } catch (e) {
      /* ignore */
    }
  },
  (app) => {
    /* no rollback */
  },
)
