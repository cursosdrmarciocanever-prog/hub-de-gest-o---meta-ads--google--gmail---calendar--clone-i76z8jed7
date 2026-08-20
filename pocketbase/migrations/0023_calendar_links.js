/// <reference path="../pb_data/types.d.ts" />
// Links do evento (abrir no Google Calendar / entrar no Meet) para o detalhe
// rico da Agenda — preenchidos pelo google_sync.
migrate(
  (app) => {
    var cal = app.findCollectionByNameOrId('calendar_events')
    if (!cal.fields.getByName('html_link')) {
      cal.fields.add(new Field({ name: 'html_link', type: 'text' }))
    }
    if (!cal.fields.getByName('meet_link')) {
      cal.fields.add(new Field({ name: 'meet_link', type: 'text' }))
    }
    app.save(cal)
  },
  (app) => {
    var cal = app.findCollectionByNameOrId('calendar_events')
    var names = ['html_link', 'meet_link']
    for (var i = 0; i < names.length; i++) {
      var f = cal.fields.getByName(names[i])
      if (f) cal.fields.removeById(f.id)
    }
    app.save(cal)
  },
)
