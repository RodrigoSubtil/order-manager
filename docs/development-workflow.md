# Fluxo de desenvolvimento local

Data: 16 de julho de 2026  
Escopo: fundação de qualidade, npm workspaces, API NestJS e banco PostgreSQL local versionado. O frontend atual está em `apps/web`; a API em `apps/api` ainda não foi ligada ao Supabase nem recebeu regras de negócio.

## Estado do Git nesta cópia

Foi encontrada uma pasta `.git`, mas ela não é um repositório Git válido: `git status`, `git remote -v`, `git branch` e `git log` falham. Não há remoto ou histórico verificável nesta cópia. Nenhum `git init`, commit ou alteração na pasta `.git` foi executado.

Antes de publicar o projeto, confirme com o responsável se existe um repositório remoto oficial e recupere/clonar a cópia correta. Se a decisão for inicializar um novo repositório, obtenha autorização explícita e defina branch principal, proteção, proprietário e remoto antes do primeiro commit.

## Requisitos locais

- Node.js e npm conforme registado em `docs/baseline.md`.
- VS Code recomendado, com as extensões sugeridas em `.vscode/extensions.json`.
- Um `.env` local apenas quando for necessário executar contra um ambiente permitido. Nunca copie chaves privilegiadas para variáveis `VITE_*`.

## Instalar e executar

```bash
npm ci
npm run dev:web
```

O servidor Vite abre normalmente em `http://localhost:5173`. `npm run dev` continua como atalho para `npm run dev:web`. Também há uma configuração de debug Chrome em `.vscode/launch.json` e tasks em `.vscode/tasks.json`.

Para executar a interface com dados fictícios e sem iniciar a API, defina `VITE_ENABLE_MSW=true` num `.env.local`. A flag funciona apenas em desenvolvimento; detalhes do design system, acessibilidade e validação visual estão em [design-system-accessibility.md](C:/Users/rodri/Desktop/order-manager-main/docs/design-system-accessibility.md).

### API NestJS

Copie `apps/api/.env.example` para `apps/api/.env` e ajuste somente valores locais. Não use chaves de banco remoto, service-role ou produção.

```bash
npm run dev:api
```

Endpoints disponíveis:

- Health: `GET http://localhost:3000/api/v1/health`
- Swagger: `http://localhost:3000/api/v1/docs` (desative com `API_SWAGGER_ENABLED=false`)
- OpenAPI JSON: `http://localhost:3000/api/v1/docs-json`

A API valida configuração de ambiente, aplica Helmet, CORS configurável, rate limiting, ValidationPipe, request ID, logs JSON e formato de erro padronizado. Prisma está preparado para PostgreSQL local; os módulos de negócio continuam sem controllers ou regras migradas.

### Banco local

O banco local versionado, seed, verificação de conexão e regras de rollback estão em [database-migrations.md](C:/Users/rodri/Desktop/order-manager-main/docs/database-migrations.md) e [database-rollback.md](C:/Users/rodri/Desktop/order-manager-main/docs/database-rollback.md). Os comandos de reset/migration local aceitam somente a base local nominalmente segura; nenhuma migration de produção foi configurada.

## Estrutura de workspaces

```text
apps/
  web/                 # React + TypeScript + Vite existente
  api/                 # Fundação NestJS, ainda sem persistência
packages/
  api-client/          # Placeholder do cliente Orval
  eslint-config/       # Configuração ESLint partilhada
  tsconfig/            # Configurações TypeScript partilhadas
docs/                  # Decisões e guias
tests/                 # Reservado para testes cross-workspace/E2E
.github/               # Reservado para GitHub Actions
.vscode/               # Configurações de desenvolvimento
```

O `package.json` da raiz é o orquestrador. Os scripts `lint`, `typecheck`, `test` e `build` agora validam web e API. A API também pode ser executada isoladamente com `npm run <script> --workspace @order-manager/api`.

## Scripts de qualidade

| Comando                     | Finalidade                                                          |
| --------------------------- | ------------------------------------------------------------------- |
| `npm run format`            | Aplica Prettier aos arquivos não ignorados.                         |
| `npm run format:check`      | Verifica Prettier sem escrever.                                     |
| `npm run lint:js`           | Executa ESLint em TypeScript/React.                                 |
| `npm run lint:css`          | Executa Stylelint em CSS.                                           |
| `npm run lint`              | Executa lint JavaScript/TypeScript e CSS.                           |
| `npm run typecheck`         | Executa TypeScript sem gerar build final.                           |
| `npm run test`              | Executa Vitest.                                                     |
| `npm run test:coverage`     | Executa Vitest e gera cobertura local.                              |
| `npm run test:coverage:api` | Executa Jest da API com thresholds por risco.                       |
| `npm run test:e2e`          | Executa Playwright contra frontend local e MSW.                     |
| `npm run test:db`           | Executa Prisma, repositories, RLS e desempenho no PostgreSQL local. |
| `npm run build`             | Faz typecheck e build Vite de produção.                             |

O fluxo mínimo antes de revisão é:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:coverage:api
npm run test:e2e
npm run build
```

## Formatação e lint

- `.editorconfig` define UTF-8, LF, dois espaços e newline final.
- `.prettierrc.json` é a fonte de formatação; `.prettierignore` exclui artefatos gerados, dependências, lockfile e metadados Git.
- ESLint usa configuração flat em `eslint.config.js`; por isso não há `.eslintignore`. Exclusões ficam na própria configuração para evitar o arquivo legado.
- Stylelint usa `stylelint-config-standard` em arquivos CSS. Algumas regras estritamente estilísticas, sintaxe moderna de cores, prefixos de browser e compatibilidade de impressão estão desativadas temporariamente para preservar o CSS legado sem uma reescrita visual. As validações estruturais continuam ativas. Ao migrar uma feature para CSS Modules, o código novo deve usar `kebab-case`, sintaxe moderna e regras do preset; estas exceções devem ser removidas gradualmente.

Format on save está configurado no VS Code. As correções automáticas de ESLint/Stylelint são explícitas para que não alterem arquivos inesperadamente ao salvar.

## Convenções de código e commits

As convenções completas de imports, nomes, commits e pull requests estão em [CONTRIBUTING.md](C:/Users/rodri/Desktop/order-manager-main/CONTRIBUTING.md). Elas são aplicadas progressivamente: esta etapa não renomeia arquivos nem reorganiza componentes existentes.

## Segurança e dados

Não use dados reais em testes ou mocks. Não execute comandos que escrevam em Supabase de produção. Migrations, RLS, autenticação, tenant e retenção seguem os documentos em `docs/` e exigem etapas específicas, staging, backup e aprovação.

## Limites desta estrutura

Autenticação Supabase, sessão por cookies HttpOnly e contexto de tenant estão preparados no backend; consulte [authentication-multitenancy.md](C:/Users/rodri/Desktop/order-manager-main/docs/authentication-multitenancy.md). RLS, regras de negócio, GitHub Actions, Orval e testes end-to-end possuem cobertura local. Consulte [testing-performance.md](C:/Users/rodri/Desktop/order-manager-main/docs/testing-performance.md) para a matriz de risco e limites antes de staging. O `Dockerfile` apenas gera o cliente Prisma e prepara a imagem; antes de qualquer deploy é necessário definir ambientes, segredos, health/readiness operacional e pipeline.

Catálogo e responsáveis estão disponíveis na API NestJS, com escopo de tenant, roles, auditoria e testes sem banco externo. Consulte [catalog-responsibles-api.md](C:/Users/rodri/Desktop/order-manager-main/docs/catalog-responsibles-api.md).

Encomendas também estão disponíveis na API com transações, paginação, filtros de backend, auditoria e controlo otimista de versão. Consulte [orders-api.md](C:/Users/rodri/Desktop/order-manager-main/docs/orders-api.md).

Relatórios detalhados e resumos de produção agora são calculados pela API, mantendo a impressão no navegador. Consulte [reports-api.md](C:/Users/rodri/Desktop/order-manager-main/docs/reports-api.md).

O fluxo OpenAPI, Orval e MSW está documentado em [api-contract-workflow.md](C:/Users/rodri/Desktop/order-manager-main/docs/api-contract-workflow.md). Execute `npm run api:generate` após alterar DTOs ou respostas dos controllers.

A organização atual do frontend por funcionalidades está documentada em [frontend-features.md](C:/Users/rodri/Desktop/order-manager-main/docs/architecture/frontend-features.md). Durante a fase legada, execute o frontend normalmente: a mudança de pastas não altera as variáveis Supabase nem liga o React à API NestJS.
