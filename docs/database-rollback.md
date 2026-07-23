# Rollback e backup de migrations

Data: 16 de julho de 2026

## Regra principal

Migrations Prisma são incrementais: depois de aplicadas em staging ou produção, não se edita nem se apaga a migration publicada. Uma reversão é uma **nova migration compensatória**, revisada e testada num clone dos dados. O reset Prisma é permitido apenas para os bancos locais protegidos.

## Local

- Para descartar dados fictícios e reconstruir: `npm run prisma:migrate:reset --workspace @order-manager/api`.
- Para desfazer uma alteração ainda não partilhada: apague somente a migration local ainda não aplicada e regenere-a. Se já foi aplicada por outra pessoa, escreva migration compensatória.

## Antes de staging ou produção

1. Confirmar ambiente, URL e versão de migration a aplicar; nunca imprimir a URL em logs.
2. Criar backup consistente pelo procedimento autorizado do fornecedor (Supabase backup/PITR ou `pg_dump` executado em ambiente seguro).
3. Guardar identificador, hora, responsável e resultado do teste de restauração do backup.
4. Fazer restore de ensaio num banco isolado e aplicar a migration nesse clone.
5. Revisar impacto: locks, tempo, espaço, dados transformados e plano de comunicação.
6. Só então aplicar em staging, validar health checks, contagens e consultas críticas.

Produção não recebe migrations por este repositório nesta etapa. Não há rollback automático e não se deve restaurar backup sem aprovar impacto nos dados posteriores ao backup.

## Falha após uma migration

1. Pare a rollout da aplicação que depende da mudança.
2. Preserve logs, `migration_name`, hora, erro e métricas.
3. Avalie se uma migration compensatória segura resolve. Se não, use o backup/PITR de acordo com o plano aprovado.
4. Valide isolamento de tenant, contagens e fluxos de encomendas antes de reabrir o serviço.
5. Registe o incidente no audit/processo operacional.
