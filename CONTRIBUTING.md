# Como contribuir

Leia [AGENTS.md](AGENTS.md) e [docs/development/workflow.md](docs/development/workflow.md) para o mapa do projeto e as regras atuais.

- Preserve o comportamento do frontend e valide as alterações.
- Nunca coloque passwords, `service_role`, `DATABASE_URL` ou dados reais no Git.
- O browser usa apenas a chave pública do Supabase.
- O frontend não envia `tenant_id`; o Supabase resolve o acesso a partir da sessão autenticada.
- Papéis permitidos: `OWNER` e `OPERATOR`.

Antes de entregar:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```
