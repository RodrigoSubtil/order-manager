# Order Manager

Sistema multi-tenant de encomendas para pastelaria, padaria e salgados, organizado como npm workspaces.

## Workspaces

- `apps/web`: frontend React + TypeScript + Vite.
- `apps/api`: API NestJS modular com Prisma e PostgreSQL.
- `packages/api-client`: cliente e hooks gerados do contrato OpenAPI.
- `packages/eslint-config`: configuração ESLint partilhada.
- `packages/tsconfig`: configurações TypeScript partilhadas.

## Início rápido

Instale as dependências e execute o frontend:

```bash
npm install
npm run dev:api
npm run dev:web
```

Copie `apps/web/.env.example` para `apps/web/.env`. O browser recebe somente
`VITE_API_BASE_URL` e comunica exclusivamente com `/api/v1`; credenciais
Supabase e `service_role` pertencem apenas ao backend.

Para usar a API com PostgreSQL real de desenvolvimento:

```bash
npm run db:up
npm run prisma:migrate:dev --workspace @order-manager/api
npm run prisma:seed --workspace @order-manager/api
npm run dev:api
```

O arquivo `apps/api/.env` deve usar exclusivamente `localhost/order_manager_dev`. Nunca coloque `service_role`, credenciais de produção ou uma URL remota nesse arquivo.

- API: `http://localhost:3000/api/v1`
- Health: `http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/api/v1/docs`

## Banco local reproduzível

```bash
npm run db:reset
npm run test:db
npm run db:down
```

`db:reset` apaga somente o banco local permitido, reaplica migrations e executa o seed determinístico dos tenants Alpha e Beta. `db:down` para o container sem remover o volume.

## Qualidade

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:coverage:api
npm run test:e2e
npm run test:db
npm run build
```

## Operação comercial

Antes de uma venda ou produção, consulte o [runbook de produção](docs/production-runbook.md), o [guia do utilizador](docs/user-guide.md), o [guia de administração](docs/administrator-guide.md), o [contrato OpenAPI](docs/openapi.md) e o [guia de suporte](docs/support-and-service.md). Produção continua bloqueada até staging aprovado, backup verificado e rollback confirmado.

Consulte [docs/development-workflow.md](docs/development-workflow.md), [docs/database-integration.md](docs/database-integration.md), [docs/authentication-rls.md](docs/authentication-rls.md), [docs/testing-performance.md](docs/testing-performance.md), [docs/security-checklist.md](docs/security-checklist.md), [docs/privacy-and-retention.md](docs/privacy-and-retention.md), [docs/backup-and-restore.md](docs/backup-and-restore.md), [docs/incident-response.md](docs/incident-response.md), [docs/observability.md](docs/observability.md), [docs/deployment.md](docs/deployment.md), [docs/staging-pilot.md](docs/staging-pilot.md) e [docs/pilot-bug-register.md](docs/pilot-bug-register.md).
