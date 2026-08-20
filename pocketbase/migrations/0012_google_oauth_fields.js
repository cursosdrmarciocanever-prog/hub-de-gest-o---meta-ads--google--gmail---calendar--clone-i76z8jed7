/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('google_connections')
    if (!col.fields.getByName('client_id')) {
      col.fields.add(new TextField({ name: 'client_id' }))
    }
    if (!col.fields.getByName('client_secret')) {
      col.fields.add(new TextField({ name: 'client_secret' }))
    }
    if (!col.fields.getByName('redirect_uri')) {
      col.fields.add(new TextField({ name: 'redirect_uri' }))
    }
    app.save(col)
    console.log('Added OAuth fields to google_connections')
  },
  (app) => {
    var col = app.findCollectionByNameOrId('google_connections')
    try {
      col.fields.removeByName('client_id')
    } catch (e) {
      /* ignore */
    }
    try {
      col.fields.removeByName('client_secret')
    } catch (e) {
      /* ignore */
    }
    try {
      col.fields.removeByName('redirect_uri')
    } catch (e) {
      /* ignore */
    }
    app.save(col)
  },
)
