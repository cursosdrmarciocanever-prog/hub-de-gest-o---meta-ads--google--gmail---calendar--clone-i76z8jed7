# Deploy do Hub (fase isolada)

Objetivo desta fase: subir o hub **sozinho**, em endereço e banco próprios,
conectar **só a Meta Ads**, e confirmar que campanha real chega na tela.
Nada aqui encosta no CRM.

---

## O que garante o isolamento

Três coisas, e a primeira é a que quase deu errado:

1. **Projeto Compose `hub`.** O CRM nesta VPS roda no projeto `deploy` — nome
   herdado da pasta `deploy/`. Se o hub usasse a mesma pasta sem nome explícito,
   o Compose entenderia que os containers do CRM são os do hub: recriaria os
   containers do CRM e montaria o volume `deploy_pb_data` (o banco do CRM) no
   PocketBase do hub. Por isso há `name: hub` no compose **e** `-p hub` em todo
   comando do `atualizar.sh`.
2. **Volume próprio:** `hub_pb_data`. O hub nunca aponta para o PocketBase do CRM.
3. **Subdomínio e router Traefik próprios:** `hub.clinicacanever.com.br`, router
   `hub`.

## Passo a passo na VPS (`2.24.107.183`)

```bash
mkdir -p /docker/apps/hub
git clone <URL-DO-REPO-DO-HUB> /docker/apps/hub
cd /docker/apps/hub/deploy
cp .env.example .env      # conferir HUB_HOST, HUB_URL e CERT_RESOLVER
cd /docker/apps/hub
./atualizar.sh
```

O DNS de `hub.clinicacanever.com.br` (registro A → `2.24.107.183`) precisa estar
propagando **antes**, senão o Traefik não consegue emitir o certificado.

Atualizações seguintes: `ssh root@2.24.107.183 "cd /docker/apps/hub && ./atualizar.sh"`

---

## Meta Ads não usa OAuth aqui

Vale registrar porque contraria o que se supunha: o hook `meta_connect.js` **não
faz OAuth**. Ele recebe um *access token* e o *ID da conta* digitados na tela
**Conectar**, valida contra `graph.facebook.com/v21.0/act_<id>` e guarda a
conexão. Não existe URL de retorno para a Meta.

Consequência prática: **não é preciso criar app da Meta em modo de
desenvolvimento nem cadastrar redirect URI** para esta fase. Basta um token com
permissão de leitura de anúncios da conta.

A própria tela Conectar ensina os dois caminhos:

- **Explorador da Graph API** — token expira em ~1–2 h. Serve para o primeiro
  teste.
- **Usuário de sistema** (Business Manager → Configurações → Usuários de
  sistema) — token que não expira. É o que fica.

O token é segredo: digita-se direto na tela do hub, nunca em chat ou em arquivo
do repositório. Ele fica em campo `hidden` do PocketBase e não volta para o
navegador.

O Google (Gmail/Calendar) **esse sim** usa OAuth, com os segredos
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI`. Está fora
do escopo desta fase de propósito — em app "Testing" o refresh token do Google
expira a cada 7 dias.

---

## Duas portas abertas, por enquanto de propósito

Ambas vêm das migrations do template e ficam num endereço público:

- **Cadastro aberto.** `0019_multitenant_rules.js` faz `users.createRule = ''`:
  qualquer pessoa cria conta.
- **Usuário demo.** `0003` e `0017` semeiam `demo@hub.com` com senha fixa.

Como o hub é multi-inquilino (todas as regras filtram por
`user_id = @request.auth.id`), quem entra por essas portas vê só os próprios
dados — não os do Dr. Márcio. O risco é de porta aberta, não de vazamento.

Fechar as duas é uma migration curta, mas deve vir **depois** do passo 4: ligar
o hub e mudar as regras de acesso ao mesmo tempo confunde o diagnóstico se algo
não carregar.
