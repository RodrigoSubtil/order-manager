# Order Manager

Aplicação da Pastelaria Vénus para criar, acompanhar e imprimir encomendas. A versão do produto nesta árvore de código é **1.0.0**; a versão publicada deve ser confirmada no cabeçalho do próprio site.

```text
React + Vite (Vercel) → Supabase Auth → RPCs PostgreSQL → tabelas com RLS
```

Não há API NestJS, Prisma ou Docker em uso. O navegador recebe apenas a URL e a chave pública do Supabase; `service_role`, credenciais e `DATABASE_URL` nunca entram em variáveis `VITE_*`.

## Começar

Requer Node.js 22 e acesso autorizado a um projeto Supabase de desenvolvimento.

```powershell
npm ci
Copy-Item apps\web\.env.example apps\web\.env
npm run dev
```

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `apps/web/.env`. O endereço local é `http://localhost:5173`.

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

A documentação para utilizadores, operadores e manutenção começa em [docs/README.md](docs/README.md). Quem alterar o projeto deve ler também [AGENTS.md](AGENTS.md).

## Ambientes

- [Produção](https://order-manager-rs.vercel.app/): branch `main`, banco Supabase de produção.
- [Homologação](https://homologacao-order-manager-rs.vercel.app/): branch `homologacao`, banco Supabase separado, utilizador `pastelaria_teste`.

Consulte [ambientes e publicação segura](docs/operations/environments.md) para project refs, variáveis, acessos sem senhas e o caminho de PR de homologação para produção. A [auditoria de 05/10/2026](docs/operations/homologacao-audit-2026-10-05.md) registra configuração, testes reais, resets autorizados e limites. Deployments normais preservam dados e numeração.

A [validação final da preparação](docs/operations/readiness-2026-10-05.md) registra reconciliação, recuperação lógica, checks e publicação. Use npm run verify:release para os checks de aplicação; os testes SQL estão em [supabase/tests](supabase/tests/README.md).
