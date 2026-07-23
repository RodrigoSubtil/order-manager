# Inventário do sistema atual

> Este documento preserva a fotografia técnica levantada antes das refatorações. A estrutura atual do frontend após a Etapa 16A está em `docs/architecture/frontend-features.md`.

Data do inventário: 15 de julho de 2026  
Escopo: análise somente de leitura do projeto local. Nenhum comportamento, dado ou configuração foi alterado.

## Visão geral

O Order Manager é uma aplicação web de página única (SPA) para registar e organizar encomendas de pastelaria, padaria e salgados. O projeto é um frontend React + TypeScript criado com Vite. Não existe backend Node.js/NestJS neste repositório: o navegador comunica diretamente com Supabase através de `@supabase/supabase-js`.

As funcionalidades de autenticação, catálogo, responsáveis, encomendas e impressão estão concentradas principalmente em um único componente React. O estado do utilizador atual é mantido no `localStorage`; os dados de negócio são obtidos e gravados diretamente nas tabelas e RPCs Supabase.

## Estrutura de pastas e arquivos

```text
order-manager-main/
├── .env.example                 # URL e anon key do Supabase
├── .gitignore
├── eslint.config.js             # ESLint para TypeScript e React Hooks
├── index.html
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.app.json
└── src/
    ├── App.tsx                  # Tela, estado, regras de UI, impressão e modais
    ├── App.css                  # Estilos da aplicação e impressão
    ├── authApi.ts               # Login, restauração e logout locais
    ├── index.css                # Estilos globais mínimos
    ├── main.tsx                 # Bootstrap React
    ├── ordersApi.ts             # Acesso direto a Supabase para dados de negócio
    ├── supabaseClient.ts         # Cliente Supabase e validação de configuração
    ├── types.ts                  # Tipos de domínio usados pelo frontend
    └── vite-env.d.ts
```

Observações quantitativas:

- `src/App.tsx`: 1.774 linhas.
- `src/App.css`: 1.930 linhas.
- `src/ordersApi.ts`: 323 linhas.
- `src/authApi.ts`: 82 linhas.
- Não há diretórios de testes, migrations, documentação de banco, CI/CD, Docker ou API backend.

## Dependências e scripts

Dependências de produção atuais:

- React 19.1.
- React DOM 19.1.
- `@supabase/supabase-js` 2.108.

Ferramentas de desenvolvimento atuais:

- Vite 7.
- TypeScript 5.8 com `strict: true`.
- ESLint 9, `typescript-eslint`, regras React Hooks e React Refresh.

Scripts disponíveis:

| Script            | Finalidade                                     |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Servidor Vite de desenvolvimento.              |
| `npm run build`   | Typecheck TypeScript e build de produção Vite. |
| `npm run lint`    | Lint do projeto inteiro.                       |
| `npm run preview` | Pré-visualização do build Vite.                |

Não existem scripts para testes, formatação, typecheck isolado, geração de API, migrations, containers ou deploy.

## Estado de Git e documentação

- Esta cópia não é um repositório Git: `git status` e `git rev-parse` retornam erro de repositório inexistente.
- Não foi encontrado `AGENTS.md`.
- O `README.md` contém apenas uma descrição curta e instruções para `npm install` e `npm run dev`.
- Não existem documentos sobre arquitetura, banco de dados, segurança, operações ou deploy.

## Configuração de ambiente

O arquivo `.env.example` documenta duas variáveis:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

`src/supabaseClient.ts` impede as operações quando essas variáveis não estão definidas e cria um cliente placeholder quando faltam. A chave configurada tem prefixo `VITE_`, logo é incluída no bundle do frontend. Isso é adequado apenas para uma chave pública/anon; qualquer chave privilegiada não pode usar esse prefixo nem ser exposta no navegador.

## Componentes e responsabilidades atuais

| Arquivo                 | Responsabilidade atual                                                                                                  | Observação                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `src/main.tsx`          | Monta React em `StrictMode`.                                                                                            | Simples e apropriado.                                |
| `src/App.tsx`           | Login, dashboard, formulário, filtros, modais, impressão, regras de quantidade, chamadas de UI e apresentação.          | Responsabilidades excessivamente concentradas.       |
| `src/ordersApi.ts`      | Leitura e escrita direta de `orders`, `order_products`, `catalog_products`, `order_responsibles` e RPC de responsáveis. | Mistura contrato Supabase com o domínio do frontend. |
| `src/authApi.ts`        | Chama RPC de login e guarda/restaura utilizador no navegador.                                                           | Não administra uma sessão autenticada verificável.   |
| `src/supabaseClient.ts` | Instancia o cliente Supabase.                                                                                           | O frontend é o único cliente de infraestrutura.      |
| `src/types.ts`          | Tipos de encomenda, produto, responsável, catálogo e categoria.                                                         | Tipos de UI também representam o contrato de dados.  |
| `src/App.css`           | Tokens, layout, componentes, responsividade e impressão.                                                                | CSS global centralizado em arquivo muito grande.     |

`App.tsx` mantém cerca de 30 estados locais, incluindo autenticação, dados remotos, formulário, filtros, impressão, dropdowns e todos os modais. Também contém utilitários de datas, quantidades e agrupamento de produtos.

## Fluxo atual de dados

```text
Utilizador
  -> React / App.tsx
  -> authApi.ts ou ordersApi.ts
  -> Supabase JavaScript client no navegador
  -> Supabase RPCs e tabelas PostgreSQL
  -> React atualiza estados locais
```

Não há camada HTTP própria, controller, DTO, service de backend, repository, contrato OpenAPI nem autenticação backend entre o navegador e o banco.

## Fluxos funcionais atuais

### Inicialização e sessão

1. `main.tsx` monta `App` com `StrictMode`.
2. `App` chama `getCurrentAppUser()`.
3. `authApi.ts` lê a chave `order-manager-user` do `localStorage`.
4. Se o objeto possuir `id` e `username`, a interface considera o utilizador autenticado.
5. Com utilizador presente, a aplicação carrega catálogo, responsáveis e encomendas.

### Login e logout

1. O formulário solicita identificador apresentado como e-mail e palavra-passe.
2. `loginAppUser()` chama a RPC Supabase `login_app_user`, com `p_username` e `p_password`.
3. A resposta esperada contém `user_id`, `user_username` e `user_bakery_name`.
4. O objeto retornado é armazenado no `localStorage`.
5. Logout remove somente essa chave local.

### Carregamento de encomendas

1. `fetchOrders(appUserId)` consulta `orders` diretamente.
2. O filtro é `app_user_id = appUserId`.
3. A consulta inclui relacionamento com `order_responsibles` e `order_products`.
4. Produtos são ordenados em memória pela posição e mapeados para os tipos da UI.
5. A aplicação carrega todas as encomendas desse utilizador e só então filtra, pesquisa e ordena no navegador.

### Catálogo e responsáveis

- `fetchCatalogProducts()` lê produtos ativos de `catalog_products`, ordenando por categoria, posição e nome.
- `fetchOrderResponsibles(appUserId)` chama a RPC `list_order_responsibles`.
- Se a RPC falhar, existe fallback direto para `order_responsibles` ativos, sem filtro visível por utilizador ou empresa. O isolamento dessa consulta depende de RLS ou de regras não presentes no repositório.

### Criação e edição de encomendas

1. O formulário usa estados manuais em `App.tsx`.
2. Uma encomenda possui cliente, telefone, responsável, data/hora e uma ou mais linhas de produto.
3. A criação insere primeiro a linha principal em `orders` com `app_user_id`.
4. Os produtos são inseridos em `order_products` numa operação posterior.
5. A edição confirma previamente a propriedade pelo `app_user_id`.
6. Depois atualiza a encomenda, apaga todos os produtos existentes e reinsere a lista recebida.

### Exclusão

- Uma encomenda individual é apagada permanentemente após confirmação.
- Existe exclusão em lote por intervalo de datas, limitada por `app_user_id`.
- Não há exclusão lógica, restauração, auditoria ou regra de retenção explícita no código.

### Filtros, indicadores e pesquisa

- Filtro por data, inicialmente no dia atual.
- Filtro por categoria: Pastelaria, Padaria, Salgados ou todas.
- Pesquisa por cliente, responsável, telefone, produtos e observações.
- Contadores de encomendas anteriores, de hoje, futuras e total.
- Todos esses cálculos ocorrem em memória no frontend.

### Impressão e relatórios

- Impressão individual ou de várias encomendas por período.
- Modo detalhado por encomenda ou resumo agrupado por categoria/produto.
- Quantidades em `un` são somadas; outras unidades têm tratamento separado.
- A impressão usa `window.print()` e CSS dedicado no mesmo `App.css`.

## Modelo de dados inferido

O código permite inferir, mas não confirmar, as entidades abaixo:

| Entidade             | Campos observados                                                                                                             | Relações inferidas                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `orders`             | `id`, `order_number`, `app_user_id`, `client_name`, `phone`, `responsible_id`, `delivery_date`, `delivery_time`, `created_at` | Uma encomenda possui produtos e um responsável.   |
| `order_products`     | `id`, `order_id`, `category`, `product`, `quantity`, `notes`, `position`                                                      | Muitos produtos por encomenda.                    |
| `order_responsibles` | `id`, `name`, `is_active`, `position`                                                                                         | Referenciado por `orders.responsible_id`.         |
| `catalog_products`   | `id`, `category`, `name`, `is_active`, `position`                                                                             | Catálogo utilizado para sugestões no formulário.  |
| `app users`          | `id`, `username`, `bakery_name`                                                                                               | Retornado por RPC, schema e origem desconhecidos. |

Não há evidência no repositório de `tenant_id`, memberships, roles, auditoria ou configurações por empresa.

## Funcionalidades que precisam ser preservadas

- Login e logout.
- Carregamento da sessão previamente usada.
- Listagem de encomendas ordenada por data e hora de entrega.
- Criação, edição e exclusão de encomendas.
- Múltiplos produtos por encomenda.
- Categorias Pastelaria, Padaria e Salgados.
- Sugestões de catálogo por categoria.
- Escolha de responsável.
- Filtros por data, categoria e texto.
- Indicadores de encomendas anteriores, atuais e futuras.
- Limpeza de encomendas anteriores por período, com confirmação.
- Impressão individual.
- Impressão em lote por dia ou período.
- Resumo de produção por produto.
- Layout responsivo e layout específico para impressão.

## Riscos e dívidas técnicas

### Arquitetura e manutenção

- Um único componente concentra UI, estado, regras de domínio, filtros, operações remotas e impressão.
- O CSS global concentra quase todo o design da aplicação.
- Não existem módulos por funcionalidade, contratos de API, DTOs ou camadas de backend.
- Não existem testes automatizados.
- Não existem formatação padronizada, Stylelint, pre-commit hooks ou CI.
- Não há histórico Git nesta cópia, impossibilitando identificar origem e mudanças anteriores.

### Dados e consistência

- Criar encomenda e inserir produtos são operações separadas. Uma falha após a criação pode deixar encomenda sem produtos.
- Editar encomenda atualiza a linha principal, apaga produtos e reinsere novos produtos em operações separadas. Uma falha intermediária pode causar perda parcial de itens.
- Não há controlo de concorrência: dois utilizadores podem sobrescrever alterações um do outro.
- A aplicação busca todas as encomendas do utilizador e filtra localmente, o que não escala bem.
- Exclusões são permanentes no código visível.
- O número da encomenda é exibido e pertence ao formulário, mas não é enviado por `toOrderPayload`; a estratégia de geração não é visível.

### Segurança e multitenancy

- A sessão local contém apenas dados de utilizador no `localStorage`, sem token de sessão verificável no código do frontend.
- A aplicação depende de RPC, RLS e políticas Supabase que não estão versionadas neste projeto.
- O modelo atual usa `app_user_id`, não `tenant_id`; ele não suporta explicitamente uma empresa com vários utilizadores e papéis.
- A consulta de fallback para responsáveis não apresenta filtro explícito por empresa. A segurança depende de infraestrutura externa não auditada.
- O frontend comunica diretamente com tabelas Supabase, acoplando interface à estrutura de dados.
- Não há auditoria de quem criou, alterou ou apagou dados.

### Operação e produto

- Não há ambientes documentados de desenvolvimento, staging e produção.
- Não há migrations, backups, procedimento de recuperação ou rollback documentados.
- Não há monitorização, health checks, logs estruturados ou rastreio de erros.
- Não há política de RGPD, retenção de nomes e telefones, nem documentação de tratamento de dados pessoais.
- Não há contrato para integração futura, nem OpenAPI/Swagger.

## Perguntas bloqueadoras sobre Supabase

Antes de qualquer migration, refatoração de autenticação ou conexão Prisma, é necessário obter respostas documentadas para estas perguntas:

1. Qual é o schema SQL completo das tabelas, constraints, índices, triggers e funções existentes?
2. Qual é a implementação e o modelo de segurança da RPC `login_app_user`?
3. Qual é a implementação e o modelo de segurança da RPC `list_order_responsibles`?
4. Quais tabelas estão com RLS ativado e quais policies existem para `anon`, `authenticated` e outros papéis?
5. O login atual usa Supabase Auth, uma tabela própria de utilizadores ou ambos?
6. Como palavras-passe são armazenadas e verificadas atualmente?
7. Como `order_number` é gerado e quais garantias de unicidade existem?
8. Há triggers que criam, atualizam ou apagam registros relacionados?
9. Catálogo e responsáveis são globais, por utilizador ou por padaria?
10. Há dados reais em produção? Qual é o volume, a política de backup e a possibilidade de restaurar um backup de teste?
11. Qual região, plano e ambiente Supabase serão usados para staging e produção?
12. Quem será proprietário do projeto Supabase e como serão geridos acessos administrativos?
13. A empresa precisa que múltiplos utilizadores trabalhem na mesma padaria? Quais papéis devem existir?
14. Qual período de retenção é necessário para encomendas, nomes e telefones dos clientes?

## Limitações deste inventário

Este documento descreve o conteúdo disponível no diretório local. Ele não confirma comportamentos do banco, de RPCs, RLS, dados de produção, Supabase Auth ou deploy porque essas configurações não estão presentes no repositório e não foram acessadas nesta etapa.

## Próxima etapa autorizável

A próxima etapa do roteiro é criar a baseline verificável: instalar dependências somente após confirmação, executar lint/typecheck/build e registrar os resultados sem refatorar o código.
