/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    var col = new Collection({
      name: 'google_connections',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'refresh_token', type: 'text', required: true },
        { name: 'access_token', type: 'text' },
        { name: 'token_expiry', type: 'date' },
        { name: 'email', type: 'text' },
        { name: 'scope', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['connected', 'disconnected', 'error'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(col)
    console.log('google_connections collection created')
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('google_connections'))
    } catch (e) {
      /* ignore */
    }
  },
)
