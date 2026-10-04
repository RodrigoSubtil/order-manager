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
