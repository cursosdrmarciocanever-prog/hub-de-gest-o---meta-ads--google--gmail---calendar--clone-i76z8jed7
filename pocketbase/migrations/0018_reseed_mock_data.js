/// <reference path="../pb_data/types.d.ts" />
// DESATIVADA de proposito. Nao apagar o arquivo: a numeracao das migrations e'
// a ordem de execucao, e remover um numero ja' aplicado no goskip quebraria o
// historico.
//
// Esta migration semeava dados de demonstracao contra um schema ANTIGO:
// gravava texto em campos de relacao, usava nomes de campos que nao existem
// mais e nao preenchia `daily_metrics.campaign_id`. O diagnostico esta escrito
// pelo proprio autor no cabecalho da 0020_fix_demo_seed.js — que APAGA tudo o
// que esta aqui e resemeia alinhado ao schema atual.
//
// No goskip isso nunca apareceu: la' a colecao `campaigns` ja' tinha registros
// e a migration caia no atalho "Campaigns already exist, skipping reseed".
// Num banco do zero — que e' o caso do deploy proprio — o atalho nao pega, os
// erros de schema aparecem, o PocketBase nao sobe e NENHUMA migration seguinte
// aplica (incluindo a 0019, que define as regras de acesso, e a 0026, que o
// sync da Meta usa).
//
// Corrigir o seed seria reconstruir algo que a 0020 deleta em seguida. Pular e'
// o comportamento que ja' vale na pratica. O conteudo original esta no
// historico do git.
migrate(
  (app) => {
    console.log('0018: seed antigo desativado — quem semeia o demo e a 0020')
  },
  (app) => {
    /* no rollback */
  },
)
