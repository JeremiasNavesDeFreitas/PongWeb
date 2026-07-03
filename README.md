# PongWeb

Jogo de Pong para navegador, com IA ou 2 jogadores locais, ranking persistente e
loja de personalizacao (skins, fundos, fontes e efeitos) desbloqueada por score.

## Stack

- **Frontend**: HTML5 Canvas + JavaScript puro (sem framework)
- **Backend**: Node.js + Express
- **Banco de dados**: SQLite via `better-sqlite3`

## Estrutura

```
/PongWeb
  /public
    index.html
    game.js
    style.css
    /assets
      /skins
      /backgrounds
      /fonts
      /effects
  server.js
  scores.db        (gerado automaticamente na primeira execucao, nao versionado)
  package.json
  .gitignore
  README.md
```

As pastas em `public/assets` estao vazias por padrao (apenas com `.gitkeep`).
A personalizacao hoje e feita via cor/estilo definido em `public/game.js`
(constantes `SKIN_CORES`, `BG_ESTILO`, `FONTE_MAP`). Para usar imagens/fontes
reais, coloque os arquivos nessas pastas e referencie-os nesses mapas.

## Como rodar localmente

```bash
npm install
npm start
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`).

## Endpoints da API

| Metodo | Rota      | Descricao                                                        |
|--------|-----------|-------------------------------------------------------------------|
| POST   | `/score`  | Body `{ nome, score }`. Cria o usuario se nao existir e soma `score` ao `score_total`. |
| GET    | `/scores` | Retorna o ranking (top 20 por `score_total`).                     |
| GET    | `/items`  | `?nome=` ou `?user_id=` opcional. Lista itens da loja com `desbloqueado` calculado para o usuario informado. |
| POST   | `/unlock` | Body `{ nome ou user_id, item_id }`. Desbloqueia se `score_total >= custo_score`. |

## Banco de dados

- `users (id, nome, score_total)`
- `items (id, tipo['skin'|'background'|'fonte'|'efeito'], nome, custo_score)`
- `unlocks (id, user_id, item_id, data_unlock)`

Os itens padrao sao inseridos automaticamente na primeira execucao (`seedItems`
em `server.js`). Para adicionar novos itens, insira direto na tabela `items`
com o `tipo`, `nome` e `custo_score` desejados.

## Como jogar

- Jogador 1: `W` / `S`
- Jogador 2 (modo 2 jogadores): `Seta para cima` / `Seta para baixo`
- `Espaco`: pausar / retomar
- Vence quem chegar a 5 pontos primeiro

Ao final da partida, o score de cada jogador humano e enviado para `/score`
automaticamente. A tela de Game Over tem botoes para jogar novamente, abrir a
loja de personalizacao e (opcional) "Apoiar o criador" — configure a URL na
constante `APOIAR_URL` no topo de `public/game.js`; o botao fica oculto se
estiver vazia.

## Deploy com PM2 + Nginx

Scripts prontos em `package.json`:

```bash
npm install -g pm2
npm install
npm run pm2:start     # inicia via PM2
npm run pm2:restart   # reinicia
npm run pm2:stop      # para
npm run pm2:logs      # ve os logs
```

Exemplo de configuracao Nginx como proxy reverso (ajuste `server_name` e a porta):

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
