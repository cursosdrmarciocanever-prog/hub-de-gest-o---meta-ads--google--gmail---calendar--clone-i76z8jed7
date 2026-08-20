/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('google_connections')
    var field = col.fields.getByName('refresh_token')
    if (field) {
      field.required = false
    }
    app.save(col)
    console.log('Made refresh_token optional')
  },
  (app) => {
    /* no rollback */
  },
)
