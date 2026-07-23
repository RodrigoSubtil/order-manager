# ADR 004 — Supabase Auth, sessão verificável e autorização no backend

- Estado: Aceite para arquitetura alvo; implementação pendente e condicionada à auditoria da autenticação atual.
- Data: 15 de julho de 2026

## Contexto

O fluxo atual usa uma RPC própria e considera um objeto no `localStorage` como sessão. Isso não fornece prova verificável de identidade nem contexto seguro de tenant.

## Decisão

Usar Supabase Auth como origem de identidade. O NestJS valida cada access token, resolve `users` e `tenant_memberships`, e aplica o tenant e papel no contexto da requisição. Passwords são geridas exclusivamente pelo provedor de Auth; a aplicação não lê, armazena ou migra passwords sem processo de segurança específico.

## Regras

- O frontend guarda somente o material de sessão suportado pelo SDK/provedor e nunca prova autorização com dados do `localStorage`.
- `tenant_id`, papel e actor são derivados no backend; DTOs que tentarem informá-los são rejeitados.
- O backend retorna `401` para sessão inválida/expirada e `403` para papel insuficiente.
- RLS no Supabase replica a restrição de tenant como defesa adicional.
- Service-role, se necessária para operação restrita, fica apenas no backend/CI seguro, não no browser.

## Consequências

- Login, logout, expiração, recuperação e convite passam a seguir um ciclo verificável.
- Exige plano de migração dos utilizadores legados, reset/invite seguro e testes de segurança antes do corte.
