/// <reference path="../pb_data/types.d.ts" />
// Guarda o id real da Meta (Graph API) em campanhas/conjuntos/anúncios, pra
// dedup por id em vez de por nome — renomear no Ads Manager para de duplicar.
migrate(
  (app) => {
    const cols = ['campaigns', 'ad_sets', 'ads']
    for (let i = 0; i < cols.length; i++) {
      const col = app.findCollectionByNameOrId(cols[i])
      if (!col.fields.getByName('meta_id')) {
        col.fields.add(new Field({ name: 'meta_id', type: 'text' }))
        app.save(col)
      }
    }
  },
  (app) => {
    const cols = ['campaigns', 'ad_sets', 'ads']
    for (let i = 0; i < cols.length; i++) {
      const col = app.findCollectionByNameOrId(cols[i])
      const f = col.fields.getByName('meta_id')
      if (f) {
        col.fields.removeById(f.id)
        app.save(col)
      }
    }
  },
)
