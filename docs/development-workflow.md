# Desenvolvimento local

Atualizado em 25 de julho de 2026.

## Requisitos

- Node.js 22;
- npm;
- VS Code com as extensões sugeridas em `.vscode/extensions.json`;
- um projeto Supabase permitido para desenvolvimento ou staging.

Não é necessário instalar PostgreSQL, Docker, Prisma ou NestJS.

## Preparação

```powershell
npm ci
Copy-Item apps\web\.env.example apps\web\.env
```

Configure `apps/web/.env`:

```dotenv
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

Somente a chave pública pode ser exposta ao Vite. Nunca use `service_role`, password do banco ou
connection string numa variável `VITE_*`.

## Executar

```powershell
npm run dev
```

O endereço normal é `http://localhost:5173`. A task **npm: dev** e o debug Chrome do VS Code usam
esse endereço.

## Qualidade

| Comando                 | O que valida                     |
| ----------------------- | -------------------------------- |
| `npm run format`        | aplica Prettier                  |
| `npm run format:check`  | confirma formatação sem escrever |
| `npm run lint`          | ESLint e Stylelint               |
| `npm run typecheck`     | TypeScript                       |
| `npm run test`          | Vitest e React Testing Library   |
| `npm run test:coverage` | cobertura local                  |
| `npm run build`         | bundle de produção Vite          |
| `npm run preview`       | serve o build localmente         |

Antes de enviar alterações:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

O workflow `.github/workflows/quality.yml` executa a mesma sequência em pushes para `main` e pull
requests.

## Convenções

- features importam componentes e libs compartilhados, não o contrário;
- chamadas Supabase ficam em `shared/lib/supabaseData.ts`;
- componentes não recebem nem constroem `tenant_id`;
- migrations novas recebem timestamp e nunca alteram uma migration já aplicada;
- dados de teste são sintéticos;
- nenhuma password, token, export de clientes ou `.env` entra no Git;
- mudanças funcionais recebem teste proporcional ao risco.

## Migrations

Os SQLs ficam em `supabase/migrations`. A ordem e o objetivo estão em
[supabase-setup.md](supabase-setup.md). Aplicar uma migration num projeto externo muda o banco e
exige confirmação do ambiente, cópia de segurança e validação posterior.

## VS Code

- format on save está ativo;
- ESLint e Stylelint podem corrigir explicitamente ao salvar;
- **npm: quality** executa a sequência local completa;
- o launch **Debug Order Manager Web in Chrome** inicia o Vite e abre o browser.
