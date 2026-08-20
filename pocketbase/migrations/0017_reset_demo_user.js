/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var existing = app.findRecordsByFilter('_pb_users_auth_', "email = 'demo@hub.com'", '', 1, 0)

    if (existing.length > 0) {
      var user = existing[0]
      user.set('password', 'demo123456')
      user.set('passwordConfirm', 'demo123456')
      user.set('name', 'Fabiano')
      user.set('email', 'demo@hub.com')
      app.save(user)
      console.log('Demo user password reset')
    } else {
      var user = new Record(usersCol, {
        email: 'demo@hub.com',
        password: 'demo123456',
        passwordConfirm: 'demo123456',
        name: 'Fabiano',
      })
      app.save(user)
      console.log('Demo user created')
    }
  },
  (app) => {
    /* no rollback */
  },
)
