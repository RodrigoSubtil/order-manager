# Etapa 32 — Homologação real e segurança final

Atualizado em 23 de julho de 2026. Esta é uma evidência de estado, não uma
aprovação de staging ou produção.

## Evidência local concluída

| Verificação           | Resultado | Evidência                                                                                                |
| --------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| Fronteira browser/API | PASS      | `npm run security:check` impede cliente Supabase direto, `service_role` e `VITE_SUPABASE_*` no frontend. |
| Lint                  | PASS      | `npm run lint`.                                                                                          |
| Tipos                 | PASS      | `npm run typecheck`.                                                                                     |
| Testes unitários/API  | PASS      | `npm run test`: 41 testes web e 72 testes API.                                                           |
| Jornada navegador     | PASS      | `npm run test:e2e`: 2 jornadas Playwright, incluindo acessibilidade.                                     |
| Build                 | PASS      | `npm run build`; avisos conhecidos do Vite sobre diretivas `use client` não interromperam o build.       |

As jornadas Playwright usam MSW e não constituem prova de Supabase Auth,
PostgreSQL de staging ou RLS contra tokens reais.

## Correção encontrada

| ID      | Prioridade | Estado                                           | Descrição                                                                                                  |
| ------- | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| STG-001 | P1         | Corrigido localmente; aguarda reteste em staging | `SUPABASE_PASSWORD_RECOVERY_REDIRECT_URL` não era entregue pelo `compose.staging.yml` ao container da API. |

## Estado da homologação real

| Área                                                 | Estado   | Motivo verificável                                                                                   |
| ---------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| Navegador → API → PostgreSQL → Supabase Auth         | BLOCKED  | Não há API/frontend HTTPS de staging publicados; o `.env` local aponta apenas para desenvolvimento.  |
| Login, refresh, logout e CSRF reais                  | BLOCKED  | O Supabase staging não possui utilizadores de teste.                                                 |
| Roles e troca de tenant                              | BLOCKED  | Não há contas, memberships, tenants ou massa de teste no staging.                                    |
| Isolamento por UUID e consulta autorizada            | BLOCKED  | Requer API implantada, dois tenants e identidades reais.                                             |
| Volume, paginação, filtros, concorrência e impressão | BLOCKED  | Requer massa persistida e ambiente publicado.                                                        |
| Celular, desktop e impressora térmica                | BLOCKED  | Requer URL HTTPS e dispositivo/impressora representativos.                                           |
| Backup e restore isolado                             | BLOCKED  | O painel Supabase não apresenta backup de staging; restore não foi autorizado nem executado.         |
| Alertas e investigação por traceId                   | BLOCKED  | Sentry, destino de alertas e métricas de staging ainda não foram configurados.                       |
| PostgreSQL local de integração                       | BLOCKED  | Docker não está disponível no `PATH` desta máquina; `npm run test:db` não foi executado nesta etapa. |
| `npm audit --omit=dev --json`                        | PENDENTE | Requer autorização explícita porque consulta o registry npm.                                         |

O painel do Supabase confirma que o projeto `otwriruoqqwjwzzgicru` está
saudável e contém o schema/RLS aplicado, porém a configuração de Auth ainda
está incompleta: `Site URL` está em `http://localhost:3000`, não há Redirect
URLs e não há utilizadores. Não é aceitável classificá-lo como staging pronto
enquanto esses itens permanecerem assim.

## Próxima sequência obrigatória

1. Definir URL HTTPS pública para web e API, e publicar a release candidata.
2. Configurar CORS, `Site URL` e Redirect URLs de convite/recuperação no
   Supabase para a URL HTTPS real.
3. Configurar secrets somente no ambiente de staging e reconciliar o histórico
   das migrations no Prisma antes de qualquer `prisma migrate deploy`.
4. Criar dados sintéticos para dois tenants e utilizadores OWNER, ADMIN e
   OPERATOR sem usar e-mails pessoais.
5. Executar a matriz de `staging-pilot.md`, registrar trace IDs sanitizados e
   fechar ou corrigir qualquer P0/P1 antes de aprovação.
6. Com autorização operacional específica, executar `npm audit`, obter backup
   identificável e ensaiar restore em projeto isolado.

## Decisão atual

**PENDENTE / NÃO APROVADO.** Não foi identificado P0 no conjunto local, mas a
ausência de homologação real impede afirmar que não existem P0/P1 no ambiente
de staging. Produção continua bloqueada.
