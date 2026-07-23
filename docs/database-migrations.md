# Banco de desenvolvimento e migrations Prisma

Atualizado em 17 de julho de 2026. Este procedimento é exclusivo para ambiente local. Nenhum comando foi ou deve ser executado no Supabase de produção.

## Componentes

- `compose.dev.yml`: PostgreSQL 16 Alpine, publicado somente em `127.0.0.1:5432`.
- `apps/api/prisma/schema.prisma`: modelo PostgreSQL multi-tenant.
- `apps/api/prisma/migrations`: migrations versionadas.
- `apps/api/prisma/seed.ts`: fixtures determinísticas para dois tenants.
- `apps/api/prisma/development-database.ts`: bloqueio de hosts, bancos e ambiente não permitidos.
- `apps/api/src/prisma`: cliente Prisma, transações serializáveis e reserva de número de encomenda.

O schema inclui `tenants`, `users`, `tenant_memberships`, `tenant_settings`, `orders`, `order_items`, `catalog_products`, `responsibles` e `audit_logs`. Chaves compostas com `tenant_id`, índices, checks e `unique(tenant_id, order_number)` protegem a integridade multi-tenant.

Desde a Etapa 19, as migrations também versionam RLS, grants, triggers de memberships e sincronização condicional de `auth.users`. O histórico aplicado nunca deve ser reescrito: correções entram numa migration posterior e passam novamente por `db:reset` e `test:db`.

## Subir e preparar

O `apps/api/.env` deve conter somente a URL local:

```text
DATABASE_URL=postgresql://order_manager:order_manager@localhost:5432/order_manager_dev?schema=public
```

Execute na raiz:

```bash
npm run db:up
npm run prisma:migrate:dev --workspace @order-manager/api
npm run prisma:seed --workspace @order-manager/api
npm run db:check --workspace @order-manager/api
```

O seed é idempotente e cria `Alpha Bakery` e `Beta Bakery`, cada uma com catálogo, responsável e encomenda próprios.

## Recriação completa

```bash
npm run db:reset
npm run test:db
```

`db:reset` executa explicitamente dois passos: `prisma migrate reset --force` e `prisma db seed`. Essa composição é necessária porque o Prisma 7 não executa o seed automaticamente no reset.

O reset apaga todos os dados de `order_manager_dev`, reaplica as migrations e repõe apenas dados fictícios. O guarda rejeita `NODE_ENV=production`, hosts remotos e nomes de banco fora de `order_manager_dev`/`order_manager_test`.

## Parar o ambiente

```bash
npm run db:down
```

Esse comando para e remove o container/rede, mas preserva o volume. A remoção do volume é destrutiva e não faz parte do comando normal.

## Staging e produção

Staging exige URL entregue por gestor de segredos, backup verificado, revisão do SQL e autorização explícita. Produção não possui script de migration neste repositório.

Antes de uma migration real:

1. criar backup consistente;
2. testar restauração num banco isolado;
3. revisar locks, duração, espaço e transformação de dados;
4. aplicar primeiro em staging;
5. validar isolamento, contagens e consultas críticas.

Consulte [database-rollback.md](database-rollback.md) e [database-integration.md](database-integration.md).
