# Order Manager

Aplicação da Pastelaria Vénus para criar, acompanhar e imprimir encomendas. A versão **1.1.0** reúne a digitalização por IA e o novo design. Após testar homologação, o utilizador aprovou a promoção para `main` e produção em 01/11/2026, mantendo esta numeração. Consulte o [registo de release](docs/operations/release.md) para a preparação e a evidência da publicação.

```text
React + Vite (Vercel) → Supabase Auth → RPCs PostgreSQL → tabelas com RLS
```

Não há API NestJS, Prisma ou Docker em uso. O navegador recebe apenas a URL e a chave pública do Supabase; `service_role`, credenciais e `DATABASE_URL` nunca entram em variáveis `VITE_*`.

## Começar

Requer Node.js 22 e acesso autorizado a um projeto Supabase de desenvolvimento.

```powershell
npm ci
Copy-Item apps\web\.env.example apps\web\.env.development.local
npm run dev
```

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` de homologação em `apps/web/.env.development.local`. O endereço local é `http://localhost:5174`; o modo dev recusa outro projeto Supabase.

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

A documentação para utilizadores, operadores e manutenção começa em [docs/README.md](docs/README.md). Quem alterar o projeto deve ler também [AGENTS.md](AGENTS.md).

## Ambientes

- [Produção](https://order-manager-rs.vercel.app/): promoção aprovada da **1.1.0**, branch `main`, banco Supabase de produção. Exige build Production com as suas próprias variáveis.
- [Homologação](https://homologacao-order-manager-rs.vercel.app/): ciclo **1.1.0** de IA e redesign, branch `homologacao`, banco Supabase separado, utilizador `pastelaria_teste`. Ajustes desta fase mantêm 1.1.0; publicação em homologação não significa publicação em produção.

Consulte [ambientes e publicação segura](docs/operations/environments.md) para project refs, variáveis, acessos sem senhas e o caminho de PR de homologação para produção. A [auditoria de 05/10/2026](docs/operations/homologacao-audit-2026-10-05.md) registra configuração, testes reais, resets autorizados e limites. Deployments normais preservam dados e numeração.

A [validação final da preparação](docs/operations/readiness-2026-10-05.md) registra reconciliação, recuperação lógica, checks e publicação. Use npm run verify:release para os checks de aplicação; os testes SQL estão em [supabase/tests](supabase/tests/README.md).
