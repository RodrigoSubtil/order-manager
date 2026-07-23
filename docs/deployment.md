# Docker, CI/CD e ambientes

## Piloto de staging

Antes de qualquer promoção, execute a matriz e a aprovação formal em
[staging-pilot.md](./staging-pilot.md). Registe cada defeito no
[pilot-bug-register.md](./pilot-bug-register.md). Os artefactos de deploy não
substituem a validação do piloto nem autorizam deploy de produção.

Atualizado em 22 de julho de 2026. Este documento prepara artefatos reproduzíveis; não autoriza nem executa deploy ou migration em produção.

## Matriz de ambientes

| Ambiente    | Finalidade              | Banco                                                  | Regras importantes                                                            |
| ----------- | ----------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Development | Desenvolvimento local   | `order_manager_dev` em Docker/local                    | Dados fictícios; Swagger permitido; comandos locais bloqueiam host remoto.    |
| Test        | Testes automatizados    | PostgreSQL efémero do CI ou `order_manager_test` local | Sem dados reais; não partilha variáveis de staging/produção.                  |
| Staging     | Validação pré-comercial | Projeto/banco isolado                                  | HTTPS, cookies Secure, RLS, backup recente, migration controlada e aprovação. |
| Production  | Dados reais             | Projeto/banco aprovado                                 | Template apenas; não existe workflow nem migration automática nesta etapa.    |

`NODE_ENV=staging` recebe as mesmas proteções de ambiente que produção: CORS HTTPS explícito, Swagger desligado, secrets sem placeholders, sessão Secure e tenant context obrigatório no Prisma.

## Imagens Docker

- `apps/api/Dockerfile`: target `runtime`, Node 22 Alpine, dependências de produção, utilizador não-root e healthcheck de liveness.
- `apps/api/Dockerfile --target migrate`: contém Prisma CLI e migrations; é exclusivo para a migration aprovada de staging.
- `apps/web/Dockerfile`: compila Vite e serve o resultado estático em Nginx não-root, com fallback SPA e `/healthz`.
- `.dockerignore`: exclui segredos, `node_modules`, relatórios e exports privados do contexto de build.

Builds locais, sem iniciar containers:

```bash
docker build -f apps/api/Dockerfile --target runtime -t order-manager-api:local .
docker build -f apps/web/Dockerfile -t order-manager-web:local .
```

## Compose

```bash
# Apenas PostgreSQL local, como antes.
npm run db:up

# API e web em containers; requer apps/api/.env local válido.
npm run docker:dev

# Testes unitários da API em rede Docker isolada.
npm run docker:test
```

`compose.dev.yml` mantém PostgreSQL em `127.0.0.1` e só inicia API/web com o profile `app`. `compose.test.yml` é isolado e não recebe secrets externos. Os testes de integração RLS continuam no runner local/CI porque as proteções de migration recusam hosts não-locais fora de um fluxo explicitamente aprovado.

## CI obrigatório

`.github/workflows/quality.yml` bloqueia pull requests e `main` quando falha qualquer um destes itens:

1. formatação, lint e boundary check;
2. verificação de segredos/browser;
3. typecheck, OpenAPI/Orval sincronizado e scan `npm audit` de dependências de produção;
4. testes unitários, cobertura, Playwright e integração PostgreSQL;
5. build web/API.

O comando `api:check` usa Git para confirmar que DTOs não geraram mudanças esquecidas. Nesta cópia local `.git` não é um repositório válido, mas o comando executa corretamente num checkout GitHub Actions normal.

## Fluxo de staging com aprovação

O workflow manual `.github/workflows/staging.yml` só continua se o operador escrever `deploy`. Configure também o GitHub Environment `staging` com reviewers obrigatórios: essa é a aprovação humana que pausa os jobs `migrate_staging` e `deploy_staging`.

Fluxo:

```text
verificações -> imagens imutáveis GHCR por SHA -> aprovação staging
-> backup verificado -> migration staging -> API/web -> smoke readiness
```

Pré-requisitos do runner `self-hosted, staging`:

- Docker Engine e Docker Compose v2;
- acesso de rede somente ao banco/serviços de staging necessários;
- acesso de leitura ao GHCR;
- diretório persistente para `deploy/compose.staging.yml`;
- firewall/reverse proxy que exponha apenas web e API conforme a topologia aprovada.

Secrets do GitHub Environment: `STAGING_DATABASE_URL`, `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`, `STAGING_SUPABASE_SERVICE_ROLE_KEY` quando convites forem usados, `STAGING_SESSION_CONTEXT_SECRET`, métricas e Sentry quando ativados. Variables não secretas: origem web, URL pública API, referência do backup e timestamp ISO de verificação.

## Migration, backup e rollback

O container `migrate` não inicia sem `MIGRATION_TARGET=staging`, `ALLOW_STAGING_MIGRATIONS=true`, `BACKUP_REFERENCE` e `BACKUP_VERIFIED_AT` com menos de 24 horas. Ele não cria backup: apenas exige evidência de que o backup foi validado antes de executar `prisma migrate deploy`.

Rollback de aplicação em staging significa reimplantar as imagens imutáveis da última release aprovada. Rollback de schema nunca é `prisma migrate reset`: exige migration compensatória ou restauração aprovada, como documentado em [database-rollback.md](database-rollback.md) e [backup-and-restore.md](backup-and-restore.md).

Se o smoke test falhar após a migration, pausar o rollout, preservar logs/trace IDs e seguir [incident-response.md](incident-response.md). Não automatizar restauração de backup, pois ela pode eliminar dados posteriores ao ponto recuperado.

## Produção

`deploy/compose.production.yml` é um template endurecido de runtime, sem job GitHub Actions associado. Antes de qualquer uso real, exige aprovação de arquitetura, owner operacional, ambiente de secrets, teste de restore, RPO/RTO aprovados, observabilidade ativa e runbook de cutover. Esta etapa não faz deploy de produção.

O procedimento completo, gate de promoção, rollback e operação está em
[production-runbook.md](./production-runbook.md). Ele exige staging aprovado,
backup verificado e plano de rollback confirmado antes de qualquer produção.
