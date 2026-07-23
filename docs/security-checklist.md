# Segurança - checklist verificável

Atualizado em 22 de julho de 2026. Este documento é a baseline de segurança do Order Manager, alinhada às categorias do [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/). Ele não substitui uma auditoria independente nem uma decisão jurídica.

## Evidências técnicas

| Controle               | Estado                               | Evidência verificável                                                                                                                                      |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isolamento por empresa | Implementado e testado localmente    | `tenant_id`, membership assinada, `PrismaService.withTenantContext`, RLS e `apps/api/test/rls-integration.test.ts`.                                        |
| Autenticação           | Implementado                         | `AuthGuard` valida token com Supabase Auth; cookies de token são `HttpOnly`.                                                                               |
| Autorização por papel  | Implementado e testado               | `RoleGuard`, roles `OWNER`, `ADMIN`, `OPERATOR` e testes de negação.                                                                                       |
| CSRF                   | Implementado e testado               | Double-submit cookie + `X-CSRF-Token`; Bearer é isento por não usar cookies.                                                                               |
| Sessão e cookies       | Implementado e testado               | `Secure` em produção, `SameSite=Lax`, paths restritos e refresh separado.                                                                                  |
| CORS                   | Implementado                         | Allowlist configurável; produção rejeita `*` e origens sem HTTPS.                                                                                          |
| Headers                | Implementado                         | Helmet é aplicado globalmente em `apps/api/src/bootstrap.ts`.                                                                                              |
| Rate limiting          | Implementado                         | `@nestjs/throttler`, TTL e limite validados por ambiente.                                                                                                  |
| Validação de entrada   | Implementado                         | `ValidationPipe` com whitelist, `forbidNonWhitelisted` e DTOs.                                                                                             |
| Segredos no browser    | Implementado e testado estaticamente | `npm run security:check` rejeita service role, cliente Supabase e `VITE_SUPABASE_*` no frontend.                                                           |
| Logs sem PII           | Implementado e testado               | `StructuredLogger` mascara email, telefone, nome, cookies, credenciais e tokens; não registra stack trace.                                                 |
| SQL e transações       | Implementado e testado               | Prisma, transactions seriais, constraints e testes de atomicidade/concorrência.                                                                            |
| Dependências           | Parcialmente verificável             | `npm ls --omit=dev --depth=0` inventaria produção; `npm audit --omit=dev --json` deve ser executado com autorização para enviar metadados ao registry npm. |

## Regras obrigatórias de produção

1. `NODE_ENV=production` exige CORS explícito e somente HTTPS.
2. Swagger deve estar desativado (`API_SWAGGER_ENABLED=false`).
3. `SUPABASE_URL`, URL de convite e segredos não podem usar HTTP, exemplos ou placeholders.
4. `SUPABASE_SERVICE_ROLE_KEY` fica exclusivamente no backend/gestor de segredos; não entra em logs, OpenAPI, variáveis `VITE_*` ou browser.
5. O frontend nunca envia `tenant_id`; a API resolve tenant a partir da identidade e da membership assinada.
6. Nenhuma consulta de negócio pode usar apenas `id`; ela deve operar no tenant context e RLS continua como defesa adicional.

## Execução antes de cada release

```bash
npm run security:check
npm run lint
npm run typecheck
npm run test
npm run test:db
npm run test:e2e
npm run build
```

O workflow `.github/workflows/quality.yml` executa essa base numa pull request com PostgreSQL efémero. O repositório atual não possui Git válido, portanto o workflow ainda não foi executado num remoto.

## Evidência externa obrigatória antes de dados reais

- resultado datado de `npm audit --omit=dev --json`, revisto e com plano para severidades alta/crítica;
- projeto Supabase de staging separado, com RLS, grants, cookies, refresh, logout e CSRF testados contra Auth real;
- revisão de acessos administrativos, MFA e contas do fornecedor;
- prova de configuração do gestor de segredos, rotação e mínimo privilégio;
- pentest ou revisão independente proporcional ao volume e ao tipo de dados.

## Aceitação OWASP ASVS

O alvo inicial é ASVS nível 1 para todas as funcionalidades públicas e nível 2 para autenticação, autorização, sessão, multitenancy, logs e dados pessoais. Cada evidência deve ficar anexada ao ticket/release correspondente; uma marcação de "conforme" sem comando, teste, configuração ou relatório não é evidência.
