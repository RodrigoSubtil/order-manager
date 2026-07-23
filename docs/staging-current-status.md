# Etapa 31 — Estado atual de staging

Atualizado em 23 de julho de 2026.

## Decisões registadas

- Onboarding: controlado pelo suporte.
- Encomendas: será introduzido o estado `CANCELLED` numa alteração de domínio própria; não será confundido com exclusão lógica.

## Preparação concluída localmente

- As migrations versionadas candidatas são `20260716000000_init`, `20260720000000_auth_tenant_rls` e `20260720010000_rls_policy_corrections`.
- O workflow de staging passa também a receber `SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL` como variável não secreta do ambiente GitHub.
- Os requisitos de Auth, RLS, CORS, Sentry, backup e piloto estão documentados em `authentication-rls.md`, `deployment.md`, `backup-and-restore.md` e `staging-pilot.md`.

## Staging Supabase criado e preparado

O utilizador criou o projeto Supabase isolado `otwriruoqqwjwzzgicru` para staging. Em 23 de julho de 2026 foram aplicadas, pelo SQL Editor desse projeto e nesta ordem, as migrations versionadas:

1. `20260716000000_init`;
2. `20260720000000_auth_tenant_rls`;
3. `20260720010000_rls_policy_corrections`.

O schema foi confirmado por uma consulta de leitura: as 9 tabelas esperadas existem, as 9 têm RLS e `FORCE ROW LEVEL SECURITY`, existem 26 políticas e a role interna `order_manager_api` foi criada. Não foi aplicado nada ao projeto Supabase antigo nem a produção, e nenhum segredo foi registado neste repositório.

O primeiro envio da segunda migration foi rejeitado pelo SQL Editor por conter por engano o texto da migration anterior no mesmo editor. O PostgreSQL recusou a consulta por sintaxe antes de a executar; após limpar o editor, foi aplicada exclusivamente a migration correta com sucesso.

> Importante: como a aplicação foi feita pelo SQL Editor, as três migrations ainda não constam do histórico interno do Prisma (`_prisma_migrations`). Antes do primeiro `prisma migrate deploy` neste projeto, será necessário fornecer a `DATABASE_URL` de staging de forma temporária e executar `prisma migrate resolve --applied` para cada uma das três migrations. Não se deve executar `migrate deploy` antes dessa reconciliação, pois ele tentaria reaplicar tabelas que já existem.

## Pendências externas para concluir a etapa

- Definir e publicar a URL HTTPS do frontend de staging, antes de configurar as URLs autorizadas e o redirecionamento de recuperação de palavra-passe no Supabase Auth.
- Configurar os segredos exclusivamente no ambiente de staging (API, sessão, Supabase e Sentry), sem os colocar no Git.
- Criar dois tenants e utilizadores fictícios após a configuração de Auth e dos redirects.
- Configurar CORS da API com a origem HTTPS de staging, Sentry, alertas e retenção/backup do projeto.
- Ligar um repositório Git remoto válido e executar o GitHub Actions real. Este checkout ainda não tem `.git` funcional; não será feito `git init` nem criado remoto sem autorização explícita e URL de destino.

## Correção da Etapa 32

Foi corrigida a passagem de `SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL` para o
serviço `api` em `deploy/compose.staging.yml`. Antes dessa correção, o workflow
de staging recebia a variável, mas a API em container não a recebia; a
recuperação de palavra-passe poderia usar o redirect padrão incorreto. A
correção está validada por revisão local e testes, mas ainda precisa ser
publicada no ambiente HTTPS de staging para ser homologada com Supabase Auth
real.
