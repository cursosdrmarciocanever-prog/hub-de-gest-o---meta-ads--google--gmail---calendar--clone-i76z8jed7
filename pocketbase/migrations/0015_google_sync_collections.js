/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // calendar_events collection
    var calCol = new Collection({
      name: 'calendar_events',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'user_id', type: 'text' },
        { name: 'event_id', type: 'text' },
        { name: 'title', type: 'text' },
        { name: 'start_time', type: 'date' },
        { name: 'end_time', type: 'date' },
        { name: 'location', type: 'text' },
        { name: 'description', type: 'text' },
        { name: 'attendees', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(calCol)

    // gmail_messages collection
    var gmailCol = new Collection({
      name: 'gmail_messages',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'user_id', type: 'text' },
        { name: 'message_id', type: 'text' },
        { name: 'from_email', type: 'text' },
        { name: 'subject', type: 'text' },
        { name: 'snippet', type: 'text' },
        { name: 'date', type: 'date' },
        { name: 'is_unread', type: 'bool' },
        { name: 'needs_reply', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(gmailCol)

    console.log('calendar_events and gmail_messages collections created')
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('calendar_events'))
    } catch (e) {
      /* ignore */
    }
    try {
      app.delete(app.findCollectionByNameOrId('gmail_messages'))
    } catch (e) {
      /* ignore */
    }
  },
)
