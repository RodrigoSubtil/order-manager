# Order Manager API

API NestJS modular com contrato REST `/api/v1`, Swagger/OpenAPI, autenticação Supabase, contexto de tenant, Prisma e PostgreSQL.

## Configuração local

Crie `apps/api/.env` com base em `.env.example`. A URL do banco deve permanecer local:

```text
DATABASE_URL=postgresql://order_manager:order_manager@localhost:5432/order_manager_dev?schema=public
```

Os comandos destrutivos de desenvolvimento verificam:

- host `localhost`, `127.0.0.1` ou `::1`;
- banco `order_manager_dev` ou `order_manager_test`;
- `NODE_ENV` diferente de `production`.

## Executar

Na raiz do repositório:

```bash
npm run db:up
npm run prisma:migrate:dev --workspace @order-manager/api
npm run prisma:seed --workspace @order-manager/api
npm run dev:api
```

- Health: `GET http://localhost:3000/api/v1/health`
- Readiness (Prisma + PostgreSQL): `GET http://localhost:3000/api/v1/health/ready`
- Metrics (operations-only): `GET http://localhost:3000/api/v1/health/metrics` with `X-Metrics-Token`
- Swagger UI: `http://localhost:3000/api/v1/docs`
- OpenAPI JSON: `http://localhost:3000/api/v1/docs-json`

## Recriar e testar o banco

```bash
npm run db:reset
npm run db:check --workspace @order-manager/api
npm run test:db
```

O teste de integração usa apenas o PostgreSQL local, limpa seus próprios dados e preserva o seed determinístico. Ele cobre conexão Prisma, isolamento entre tenants, catálogo, responsáveis, transações de encomendas, rollback, sequência, concorrência, relatórios e soft delete.

As migrations da Etapa 19 também ativam RLS, bloqueiam `DELETE` físico e criam o papel restrito `order_manager_api`. Cada requisição de negócio usa uma transação com identidade e tenant verificados. Execute `npm run test:db` para validar consultas sem filtro, UUIDs cruzados, papéis e policies.

Autenticação e troca de empresa exigem `SESSION_CONTEXT_SECRET` com pelo menos 32 caracteres. Convites reais exigem `SUPABASE_SERVICE_ROLE_KEY` somente no backend; sem essa variável o endpoint falha de forma segura e nenhum serviço externo é chamado. Consulte `docs/authentication-rls.md`.

Não use URL Supabase de produção nem `service_role` neste ambiente.
