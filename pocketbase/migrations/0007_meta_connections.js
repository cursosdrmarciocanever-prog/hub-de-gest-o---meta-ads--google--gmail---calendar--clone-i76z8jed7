/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    var connections = new Collection({
      name: 'meta_connections',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'access_token', type: 'text', required: true },
        { name: 'account_id', type: 'text', required: true },
        { name: 'account_name', type: 'text' },
        { name: 'currency', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['connected', 'disconnected', 'error'],
          maxSelect: 1,
        },
        { name: 'last_sync', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(connections)
    console.log('meta_connections collection created')
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('meta_connections'))
    } catch (e) {
      /* ignore */
    }
  },
)
