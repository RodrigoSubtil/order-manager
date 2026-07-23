# Order Manager

Aplicação React para gerir encomendas de pastelaria, publicada no Vercel e ligada diretamente ao Supabase.

## Arquitetura atual

```text
Browser (React + Vite)
  -> Supabase Auth
  -> Supabase PostgreSQL + RLS + RPCs
```

Não há API NestJS, Prisma, Docker, Compose ou Render nesta versão. A chave usada no browser é somente a chave pública do Supabase; nunca coloque `service_role`, `DATABASE_URL` ou passwords em variáveis `VITE_*`.

## Papéis

- `OWNER`: gere catálogo, responsáveis e exclusões.
- `OPERATOR`: cria, consulta, edita e imprime encomendas.

O tenant é resolvido pelo Supabase através da sessão e membership ativa. O frontend não envia `tenant_id`.

## Desenvolvimento

```bash
npm install
copy apps\web\.env.example apps\web\.env
npm run dev
```

Defina em `apps/web/.env`:

```dotenv
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
VITE_APP_URL=http://localhost:5173
```

## Qualidade

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

## Publicação

No Vercel, configure as mesmas variáveis `VITE_SUPABASE_*` com a URL e a chave pública do projeto Supabase. A configuração segura do banco, incluindo schema, RLS, RPCs e primeiro OWNER, está em [docs/supabase-setup.md](docs/supabase-setup.md).
