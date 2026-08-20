#!/usr/bin/env bash
# Atalho para atualizar o HUB na VPS: puxa o codigo, rebuilda, sobe e CONFERE.
# Uso:  cd /docker/apps/hub && ./atualizar.sh
#
# A conferencia existe porque uma migration com erro derruba o PocketBase, e a
# versao antiga deste script (no CRM) imprimia "Pronto!" mesmo assim. Aqui o
# script so' diz que deu certo depois de a API responder.
#
# ISOLAMENTO: todo `docker compose` daqui roda com `-p hub`. Nada neste script
# alcanca os containers do CRM, que vivem no projeto Compose `deploy`.
#
set -e

REPO_DIR="/docker/apps/hub"
DEPLOY_DIR="$REPO_DIR/deploy"
TENTATIVAS=30   # 30 x 2s = ate 60s esperando a API subir

VERMELHO=$'\033[1;31m'
VERDE=$'\033[1;32m'
AMARELO=$'\033[1;33m'
FIM=$'\033[0m'

cd "$REPO_DIR"

echo "==> [1/5] Puxando o codigo mais recente..."
git pull

cd "$DEPLOY_DIR"

echo "==> [2/5] Fixando o projeto Compose em 'hub' (isolamento do CRM)..."
# Todo comando abaixo passa `-p hub` explicitamente. Sem isso o Compose derivaria
# o nome do projeto da PASTA (`deploy`) — que e' exatamente o nome que o CRM ja'
# usa nesta VPS (containers `deploy-web-1`/`deploy-pocketbase-1`, volume
# `deploy_pb_data`). O `up` recriaria os containers do CRM e o hub montaria o
# banco dele. Com `-p hub` isso e' impossivel, mesmo que alguem apague a linha
# `name: hub` do docker-compose.yml.
COMPOSE="docker compose -p hub --env-file .env"

echo "==> [3/5] Rebuild e subida dos containers..."
$COMPOSE up -d --build

echo "==> [4/5] Aguardando a API do PocketBase responder..."
# A partir daqui os erros sao tratados na mao: o objetivo e' diagnosticar.
set +e

ok=0
for i in $(seq 1 "$TENTATIVAS"); do
  codigo=$($COMPOSE exec -T pocketbase \
    wget -q -T 3 -O /dev/null -S http://127.0.0.1:8090/api/health 2>&1 </dev/null \
    | grep -o 'HTTP/1.1 [0-9]*' | head -1 | awk '{print $2}')
  if [ "$codigo" = "200" ]; then
    ok=1
    break
  fi
  sleep 2
done

if [ "$ok" != "1" ]; then
  echo ""
  echo "${VERMELHO}==> FALHOU: o PocketBase do hub nao subiu.${FIM}"
  echo "${VERMELHO}    O site abre, mas nada carrega — a API esta fora.${FIM}"
  echo "${AMARELO}    (O CRM nao foi afetado: e' outro projeto, outro volume.)${FIM}"
  echo ""
  echo "${AMARELO}Estado dos containers do hub:${FIM}"
  $COMPOSE ps --format 'table {{.Name}}\t{{.Status}}'
  echo ""
  echo "${AMARELO}Motivo provavel (ultimas linhas do log):${FIM}"
  $COMPOSE logs pocketbase --tail 20 | grep -iE 'error|panic|failed|migration' | tail -10
  echo ""
  echo "${AMARELO}Log completo:${FIM} docker compose -p hub -f $DEPLOY_DIR/docker-compose.yml logs pocketbase --tail 60"
  echo "${AMARELO}Erro em migration?${FIM} corrija o arquivo, faca push e rode este script de novo."
  exit 1
fi

echo "==> [5/5] Conferindo os containers..."
reiniciando=$($COMPOSE ps --format '{{.Name}} {{.Status}}' | grep -ci 'restarting')
$COMPOSE ps --format 'table {{.Name}}\t{{.Status}}'

if [ "$reiniciando" -gt 0 ]; then
  echo ""
  echo "${VERMELHO}==> ATENCAO: algum container do hub esta reiniciando em ciclo.${FIM}"
  echo "${AMARELO}    Veja: docker compose -p hub -f $DEPLOY_DIR/docker-compose.yml logs --tail 40${FIM}"
  exit 1
fi

echo ""
echo "${VERDE}==> Pronto! API do hub respondendo e containers estaveis.${FIM}"
echo "    Abra https://hub.clinicacanever.com.br com Cmd + Shift + R."
