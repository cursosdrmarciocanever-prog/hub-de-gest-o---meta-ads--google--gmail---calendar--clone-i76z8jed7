/// <reference path="../pb_data/types.d.ts" />
// Remove metricas diarias duplicadas.
//
// O `meta_ads_sync` montava um indice anti-duplicata lendo a data com
// `.split(' ')` dentro de um try que engolia o erro. Quando o PocketBase nao
// devolvia a data como string, o indice ficava vazio e CADA sincronizacao
// reinseria todas as metricas. Os numeros do painel cresciam sozinhos: uma
// conta com R$ 2.428,01 na Meta aparecia com R$ 4.856,02 depois de duas
// sincronizacoes; outra, com R$ 2.887,19, chegou a R$ 8.661,57 em tres.
//
// O hook ja' foi corrigido. Esta migration limpa o que ficou para tras:
// para cada (campanha, dia, nivel) mantem o registro mais antigo e apaga o
// resto. Num banco novo nao ha duplicata e ela nao faz nada.
migrate(
  (app) => {
    function dateKeyOf(v) {
      if (!v) return ''
      var str
      if (typeof v === 'string') str = v
      else if (typeof v.string === 'function') str = v.string()
      else str = '' + v
      return String(str).slice(0, 10)
    }

    // Busca de uma vez so'. Paginar com offset enquanto se apaga desloca as
    // paginas seguintes e faria pular registros.
    var LIMITE = 50000
    var recs = []
    try {
      recs = app.findRecordsByFilter('daily_metrics', "id != ''", 'created', LIMITE, 0)
    } catch (err) {
      console.log('0027: nao foi possivel ler daily_metrics — nada a fazer')
      return
    }
    if (recs.length >= LIMITE) {
      console.log('0027: ATENCAO — ' + LIMITE + ' registros lidos, pode haver mais nao verificados')
    }

    var vistos = {}
    var apagados = 0
    for (var i = 0; i < recs.length; i++) {
      var rel = recs[i].get('campaign_id')
      var cid = typeof rel === 'string' ? rel : (rel || {}).id || ''
      var dk = dateKeyOf(recs[i].get('date'))
      if (!cid || !dk) continue
      var chave = cid + '|' + dk + '|' + (recs[i].get('level') || '')
      if (vistos[chave]) {
        try {
          app.delete(recs[i])
          apagados++
        } catch (err) {
          /* segue */
        }
      } else {
        vistos[chave] = true
      }
    }

    console.log('0027: metricas diarias duplicadas apagadas: ' + apagados)
  },
  (app) => {
    /* sem rollback: o que foi apagado era copia exata */
  },
)
