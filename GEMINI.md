# Deploy Tracker — Contexto do Projeto (para IAs)

> Leia este arquivo antes de alterar o código. Mantenha-o atualizado quando a arquitetura mudar.

## 1. Objetivo
Commit/deploy tracker. Recebe eventos de **push** via **webhook do GitHub** (de um ou vários repositórios), grava cada um como um "deployment" no PostgreSQL e exibe o histórico em um dashboard React.

Fluxo: `GitHub push → (Ngrok em dev) → POST /webhooks/github (API Express) → Prisma → PostgreSQL ← GET /deployments ← Front-end React (Nginx)`
Diagrama: `arquitetura.png`. README em português (idioma do projeto: **pt-BR** para comentários, mensagens e UI parcial).

## 2. Stack
- **Back-end** (`back-end/`): Node.js 22, Express 5, TypeScript, Prisma 6 (`prisma-client-js`), prom-client (métricas Prometheus), dotenv, cors. Scripts: `dev` (ts-node-dev), `build` (tsc), `start` (`node dist/server.js`).
- **Front-end** (`front-end/`): React + Vite + TypeScript, lucide-react, CSS puro (dark mode, glassmorphism), servido por Nginx (`nginx.conf`). Lint com oxlint.
- **Banco**: PostgreSQL 17, tabela criada por `postgresql/init.sql` (montado em `docker-entrypoint-initdb.d`), volume `pgdata`.
- **Infra & Observabilidade**:
  - Docker Compose: 3 serviços base (`database`, `api`, `front-end`) + perfil `monitoring` com 6 serviços de observabilidade.
  - CI no GitHub Actions.
  - **Métricas**: Prometheus v3 (`:9090`), Node Exporter (`:9100`), cAdvisor (`:8085` no host para evitar colisão com o front-end), endpoint nativo da API em `/metrics`.
  - **Logs**: Loki v3 (`:3100`), Promtail v3 (coleta automática de contêineres Docker via socket `/var/run/docker.sock`).
  - **Visualização**: Grafana 11 (`:3001` no host para evitar colisão com a API em `:3000`), com datasources Prometheus e Loki pré-provisionados.

### Detalhes de build e infraestrutura
- **Versões**: back-end — `@prisma/client`/`prisma` ^6.19, express ^5.2, typescript ^7; front-end — react ^19.2, vite ^8, typescript ~6.0, lucide-react ^1.x. Scripts do front: `dev` (vite), `build` (`tsc -b && vite build`), `lint` (oxlint), `preview`. Front é ESM (`"type": "module"`); back compila para **CommonJS** (target es2022).
- **tsconfig do back-end**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `isolatedModules`; `rootDir ./src` → `outDir ./dist`. Esses flags rígidos podem quebrar o `npm run build` (e o CI) ao passar `undefined` para campos opcionais do Prisma.
- **Dockerfile da API** (multi-stage, `node:22-alpine`): estágio build faz `npm ci`, `prisma generate`, `npm run build`; runtime instala só deps de produção, roda `prisma generate` de novo, copia `dist`, executa como usuário `node`, `EXPOSE 3000`, `HEALTHCHECK` via `wget` em `/`. **Não roda migrations** (`prisma migrate`/`db push`) — a tabela vem só do `init.sql`.
- **Dockerfile do front** (multi-stage): build Vite (`node:22-alpine`) → `nginx:alpine` servindo `dist` em `/usr/share/nginx/html`, porta 80 (mapeada para 8080).
- **nginx.conf**: SPA fallback (`try_files ... /index.html`), gzip, cache de 1 ano para estáticos (js/css/imagens). **Não há proxy reverso para a API** — o navegador chama `localhost:3000` direto.
- **docker-compose**: variáveis lidas do `.env` na raiz (`DATABASE_URL`, `GITHUB_WEBHOOK_SECRET`, `POSTGRES_*`); a API só sobe após o healthcheck do banco; todos com `restart: unless-stopped`. Na `DATABASE_URL`, o host é `database` (nome do serviço), não `localhost`. `.env` está no `.gitignore` (só `.env.example` é versionado).
- **Estilo (front)**: `src/index.css` define o tema via CSS variables (`--bg-color #0A0F1C`, `--accent #3B82F6`, `--status-success/error/pending` e variantes `-bg`), fonte Inter (Google Fonts), cards com `backdrop-filter: blur`. Classes principais: `.dashboard-container`, `.stats-grid`, `.stat-card`, `.table-container`, `.status-badge` (`.status-success`/`.status-error`), `.environment-tag`, `.btn-primary`, `.empty-state`, `.loading`. Estilos do `CommitViewer` ficam em `CommitViewer.css`. Existe `--status-pending`, mas a UI hoje só distingue success vs. erro (qualquer status ≠ `success` aparece como erro).

## 3. Estrutura
```
deploytracker/
├── docker-compose.yml        # front-end:8080, api:3000, database:5432 + profile "monitoring"
├── .env.example              # POSTGRES_*, DATABASE_URL, GITHUB_WEBHOOK_SECRET
├── postgresql/init.sql       # DDL da tabela deployments
├── .github/workflows/ci.yml  # push/PR na main: npm ci, tsc build, docker compose config, docker build da API
├── back-end/
│   ├── prisma/schema.prisma  # model deployments
│   └── src/
│       ├── server.ts         # app Express, cors, json, rotas, 404 JSON; GET / = health, GET /metrics
│       ├── metrics.ts        # instrumentação com prom-client (histograma de latência e contadores HTTP)
│       ├── prisma.ts         # instância do PrismaClient
│       ├── routes/           # deployment.routes.ts, webhook.routes.ts
│       └── controllers/      # DeploymentController.ts, WebhookController.ts
├── front-end/src/
│   ├── App.tsx               # dashboard: stats + tabela
│   └── components/CommitViewer/  # hash curto, badge de branch, mensagem com "Ler mais"
└── observability/            # Configurações da stack de observabilidade (profile "monitoring")
    ├── prometheus/
    │   └── prometheus.yml    # Scrape configs (prometheus, node-exporter, cadvisor, loki, promtail)
    ├── loki/
    │   └── loki-config.yaml  # Loki TSDB filesystem storage, retenção de 7 dias e compactor
    ├── promtail/
    │   └── promtail-config.yaml # Scrape de logs docker via /var/run/docker.sock
    └── grafana/
        └── provisioning/
            └── datasources/
                └── datasources.yaml # Provisionamento automático de Prometheus e Loki com data links
```

## 4. Modelo de dados (`deployments`)
| Campo | Tipo | Obs |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| application | varchar(100) | nome do repositório |
| version | varchar(100) | hash curto (7 chars) |
| environment | varchar(100) | `production` / `development` |
| status | varchar(100) | hoje sempre `success` via webhook |
| responsible | varchar(100) | autor do commit |
| commit_hash | varchar(100)? | hash completo |
| commit_message | text? | |
| failure_reason | text? | ainda não usado pelo webhook |
| rollback | boolean? | default false |
| created_at | timestamp | default now |

⚠️ O schema existe em **dois lugares** (`init.sql` e `schema.prisma`); não há migrations do Prisma. Alterações devem ser feitas nos dois manualmente (e o volume `pgdata` precisa ser recriado para o init.sql rodar de novo).

## 5. API
- `GET /` — health check.
- `GET /metrics` — métricas Prometheus (`prom-client`): latência HTTP, throughput, status codes, métricas do Node.js.
- `GET /deployments?application=&environment=&status=` — lista, ordenada por `created_at desc`.
- `POST /deployments` — cria manualmente (body com os campos acima).
- `POST /webhooks/github` — recebe webhook do GitHub:
  1. Se `GITHUB_WEBHOOK_SECRET` **e** header `x-hub-signature-256` existirem, valida HMAC-SHA256 sobre `JSON.stringify(req.body)`; inválido → 401.
  2. Ignora eventos ≠ `push` (200) e pushes sem `head_commit` (200).
  3. Branch = `ref` sem `refs/heads/`; `main`/`master` → `production`, demais → `development`.
  4. Cria deployment (`application`=repository.name, `version`=id[0:7], `status`="success", `responsible`=head_commit.author.name || pusher.name, hash e mensagem) e responde 201.

## 6. Front-end
- `App.tsx` busca `http://localhost:3000/deployments` (URL **hardcoded**) ao montar e no botão Refresh (sem polling/tempo real, apesar do README dizer "tempo real").
- Cards: total de deploys, taxa de sucesso, nº de ambientes. Tabela: status, app, versão, ambiente, commit, responsável, data (pt-BR).
- A branch exibida no `CommitViewer` é **inferida** do ambiente (production→main, development→develop), pois o banco não tem coluna `branch`.

## 7. Rodando

### Aplicação Base (Deploy Tracker)
```bash
cp .env.example .env   # preencher valores
docker compose up -d --build
# Painel: http://localhost:8080 | API: http://localhost:3000
npx ngrok http 3000    # URL pública para o webhook
```
GitHub → Settings → Webhooks: Payload URL `https://<ngrok>/webhooks/github`, `application/json`, evento push.

### Observabilidade (Grafana, Prometheus, Loki, cAdvisor, Promtail, Node Exporter)
A stack de observabilidade está integrada via perfil `monitoring`:
```bash
# Subir aplicação + stack de observabilidade completa:
docker compose --profile monitoring up -d

# Ou subir APENAS a observabilidade:
docker compose --profile monitoring up -d prometheus loki promtail node-exporter cadvisor grafana
```

**Portas da Observabilidade:**
- **Grafana:** `http://localhost:3001` (login: `admin` / senha: `admin_strong_observability_pwd`)
- **Prometheus:** `http://localhost:9090`
- **cAdvisor:** `http://localhost:8085` (mapeado na 8085 para não colidir com o front-end na 8080)
- **Loki:** `http://localhost:3100`
- **Node Exporter:** `http://localhost:9100`
- **Promtail:** `http://localhost:9080`
