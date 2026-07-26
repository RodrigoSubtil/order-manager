# Desenho alvo do banco multi-tenant

Data: 15 de julho de 2026  
Estado: arquitetura proposta; não é migration nem SQL executável. Nenhuma tabela, política, função ou dado foi alterado.

## Decisões de base

- Banco PostgreSQL partilhado: todas as empresas usam o mesmo banco e as tabelas de negócio possuem `tenant_id`.
- Identidade: `auth.users` (Supabase Auth) é a origem de autenticação. A tabela de aplicação `users` é apenas o perfil e referencia o mesmo `id`.
- Escopo: o backend NestJS valida a sessão e resolve a membership/tenant ativo no servidor. **O frontend nunca escolhe, envia ou persiste `tenant_id` em operações de negócio.**
- Integridade: relações entre recursos de tenant incluem `tenant_id` na FK, impedindo por constraint uma encomenda do tenant A apontar para um responsável do tenant B.
- Acesso: API NestJS é a fronteira de negócio; RLS no Supabase é a camada adicional de defesa. O browser deixa de consultar tabelas diretamente.
- Auditoria e apagamento: dados de negócio usam exclusão lógica e rastreabilidade de criador/alterador; `audit_logs` é apenas append.

## Diagrama lógico

```text
auth.users
  └─ 1:1 users

tenants ──< tenant_memberships >── users
   │
   ├── 1:1 tenant_settings
   ├──< catalog_products
   ├──< responsibles
   ├──< orders ──< order_items
   └──< audit_logs

orders.responsible_id ──> responsibles
```

## Convenções comuns

| Convenção       | Definição                                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identificadores | `uuid` gerado no banco; nunca sequencial exposto como chave primária.                                                                                          |
| Tempo           | `timestamptz`, em UTC, com `created_at` e `updated_at`.                                                                                                        |
| Autor           | `created_by`, `updated_by` e, ao apagar, `deleted_by` referenciam `users.id`; valores podem ser nulos apenas para importação inicial ou automação documentada. |
| Exclusão lógica | `deleted_at timestamptz null` e `deleted_by uuid null`; consultas normais filtram `deleted_at is null`.                                                        |
| Concorrência    | `version integer not null default 1` nas entidades editáveis; atualização exige a versão recebida e incrementa-a atomicamente.                                 |
| Campos livres   | Texto de cliente, telefone e notas são validados no backend. Dados de payload de auditoria usam `jsonb`, sem palavras-passe ou tokens.                         |

## Tabelas propostas

### `tenants`

Representa uma empresa/organização.

| Coluna                     | Tipo proposto | Regra                                                  |
| -------------------------- | ------------- | ------------------------------------------------------ |
| `id`                       | `uuid`        | PK.                                                    |
| `slug`                     | `text`        | Identificador público estável; único case-insensitive. |
| `name`                     | `text`        | Obrigatório.                                           |
| `status`                   | `text`        | `ACTIVE`, `SUSPENDED` ou `ARCHIVED`; check constraint. |
| `next_order_number`        | `bigint`      | Obrigatório, mínimo `1`; contador interno por tenant.  |
| `created_at`, `updated_at` | `timestamptz` | Obrigatórios, UTC.                                     |
| `created_by`, `updated_by` | `uuid`        | FK para `users.id`, quando aplicável.                  |

Índices/constraints: PK (`id`), unique index para `lower(slug)`, check `next_order_number >= 1`.

### `users`

Perfil de aplicação global. Não contém password, `tenant_id` ou papel global.

| Coluna                     | Tipo proposto | Regra                                                              |
| -------------------------- | ------------- | ------------------------------------------------------------------ |
| `id`                       | `uuid`        | PK e FK 1:1 para `auth.users.id`.                                  |
| `display_name`             | `text`        | Obrigatório.                                                       |
| `email`                    | `text`        | Cache de apresentação opcional; fonte de verdade continua em Auth. |
| `status`                   | `text`        | `ACTIVE` ou `DISABLED`; check constraint.                          |
| `created_at`, `updated_at` | `timestamptz` | Obrigatórios.                                                      |

Índices/constraints: PK (`id`); unique case-insensitive de `email` apenas se o produto precisar pesquisar por email e a sincronização com Auth estiver definida.

### `tenant_memberships`

Associação entre pessoa e empresa. É a fonte de autorização de negócio.

| Coluna                     | Tipo proposto         | Regra                                                 |
| -------------------------- | --------------------- | ----------------------------------------------------- |
| `tenant_id`                | `uuid`                | FK para `tenants.id`.                                 |
| `user_id`                  | `uuid`                | FK para `users.id`.                                   |
| `role`                     | `text`                | `OWNER`, `ADMIN` ou `OPERATOR`; check/enum.           |
| `status`                   | `text`                | `ACTIVE`, `INVITED`, `SUSPENDED` ou `REVOKED`; check. |
| `created_at`, `updated_at` | `timestamptz`         | Obrigatórios.                                         |
| `created_by`, `updated_by` | `uuid`                | FK para `users.id`.                                   |
| `revoked_at`, `revoked_by` | `timestamptz`, `uuid` | Preenchidos ao revogar.                               |

Índices/constraints: PK composta (`tenant_id`, `user_id`); índice (`user_id`, `status`) para resolver memberships da sessão; índice (`tenant_id`, `status`, `role`); check que `revoked_at` acompanha status `REVOKED`.

### `orders`

Cabeçalho da encomenda, isolado por tenant.

| Coluna                                   | Tipo proposto | Regra                                                                      |
| ---------------------------------------- | ------------- | -------------------------------------------------------------------------- |
| `id`                                     | `uuid`        | PK.                                                                        |
| `tenant_id`                              | `uuid`        | Obrigatório, FK para `tenants.id`.                                         |
| `order_number`                           | `bigint`      | Obrigatório e sequencial apenas dentro do tenant.                          |
| `client_name`                            | `text`        | Obrigatório.                                                               |
| `phone`                                  | `text`        | Nulo permitido.                                                            |
| `responsible_id`                         | `uuid`        | Nulo permitido; referência composta ao responsável do mesmo tenant.        |
| `delivery_date`                          | `date`        | Obrigatório.                                                               |
| `delivery_time`                          | `time`        | Nulo permitido.                                                            |
| `version`                                | `integer`     | Obrigatório, `>= 1`, para controlo otimista.                               |
| `created_at`, `updated_at`, `deleted_at` | `timestamptz` | `created_at`/`updated_at` obrigatórios; `deleted_at` nulo até soft delete. |
| `created_by`, `updated_by`, `deleted_by` | `uuid`        | FKs para `users.id`.                                                       |

Índices/constraints:

- PK (`id`) e unique (`tenant_id`, `id`) para suportar FKs compostas;
- `unique (tenant_id, order_number)`;
- FK (`tenant_id`, `responsible_id`) para `responsibles (tenant_id, id)` quando `responsible_id` não for nulo;
- check `version >= 1`;
- índice parcial (`tenant_id`, `delivery_date`, `delivery_time`, `id`) `where deleted_at is null` para agenda/listagem;
- índice parcial (`tenant_id`, `created_at desc`) `where deleted_at is null`;
- pesquisa por cliente/telefone deve usar um índice apropriado à decisão de busca (por exemplo `pg_trgm`), validado por plano de consulta antes da criação.

### `order_items`

Linhas de produto da encomenda.

| Coluna                                   | Tipo proposto   | Regra                                                  |
| ---------------------------------------- | --------------- | ------------------------------------------------------ |
| `id`                                     | `uuid`          | PK.                                                    |
| `tenant_id`                              | `uuid`          | Obrigatório.                                           |
| `order_id`                               | `uuid`          | Obrigatório; FK composta para `orders`.                |
| `category`                               | `text`          | Obrigatório; enum/check de categorias aprovadas.       |
| `product_name`                           | `text`          | Obrigatório; snapshot do nome no momento da encomenda. |
| `quantity_value`                         | `numeric(12,3)` | Obrigatório, maior que zero.                           |
| `quantity_unit`                          | `text`          | Obrigatório; enum/check, por exemplo `UN`, `KG`, `G`.  |
| `notes`                                  | `text`          | Nulo permitido.                                        |
| `position`                               | `integer`       | Obrigatório, `>= 0`.                                   |
| `created_at`, `updated_at`, `deleted_at` | `timestamptz`   | Conforme convenção.                                    |
| `created_by`, `updated_by`, `deleted_by` | `uuid`          | Conforme convenção.                                    |

Índices/constraints: FK (`tenant_id`, `order_id`) -> `orders (tenant_id, id)`; unique parcial (`tenant_id`, `order_id`, `position`) `where deleted_at is null`; índice parcial (`tenant_id`, `order_id`, `position`) `where deleted_at is null`; check de quantidade/unidade. `catalog_product_id` pode ser acrescentado opcionalmente como referência histórica, mas o snapshot do nome é obrigatório para preservar a encomenda se o catálogo mudar.

### `catalog_products`

Catálogo específico da empresa no desenho inicial. Um catálogo global futuro deve ser uma entidade separada, nunca registros sem tenant misturados nesta tabela.

| Coluna             | Tipo proposto      | Regra                            |
| ------------------ | ------------------ | -------------------------------- |
| `id`, `tenant_id`  | `uuid`             | PK e escopo obrigatório.         |
| `category`, `name` | `text`             | Obrigatórios.                    |
| `is_active`        | `boolean`          | `true` por padrão.               |
| `position`         | `integer`          | `0` por padrão, `>= 0`.          |
| `version`          | `integer`          | Controlo otimista.               |
| auditoria/exclusão | conforme convenção | Obrigatórios conforme aplicável. |

Índices/constraints: unique (`tenant_id`, `id`); unique index parcial (`tenant_id`, `category`, `lower(name)`) `where deleted_at is null`; índice parcial (`tenant_id`, `category`, `position`, `name`) `where is_active and deleted_at is null`. O catálogo não define unidade: `UN`, `KG` ou `G` é escolhida em cada item da encomenda.

### `responsibles`

Responsáveis disponíveis numa empresa.

| Coluna             | Tipo proposto      | Regra                            |
| ------------------ | ------------------ | -------------------------------- |
| `id`, `tenant_id`  | `uuid`             | PK e escopo obrigatório.         |
| `name`             | `text`             | Obrigatório.                     |
| `is_active`        | `boolean`          | `true` por padrão.               |
| `position`         | `integer`          | `0` por padrão, `>= 0`.          |
| `version`          | `integer`          | Controlo otimista.               |
| auditoria/exclusão | conforme convenção | Obrigatórios conforme aplicável. |

Índices/constraints: unique (`tenant_id`, `id`); unique index parcial (`tenant_id`, `lower(name)`) `where deleted_at is null`; índice parcial (`tenant_id`, `position`, `name`) `where is_active and deleted_at is null`.

### `tenant_settings`

Configuração de uma empresa. Não é uma tabela de permissões.

| Coluna                                                 | Tipo proposto      | Regra                                                                     |
| ------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------- |
| `tenant_id`                                            | `uuid`             | PK e FK para `tenants.id`; exatamente uma linha por tenant.               |
| `timezone`                                             | `text`             | Obrigatória, IANA válida validada no backend.                             |
| `locale`                                               | `text`             | Obrigatória.                                                              |
| `order_retention_days`                                 | `integer`          | Nulo ou `>= 1`; política de retenção configurável dentro do mínimo legal. |
| `print_preferences`                                    | `jsonb`            | Apenas preferências não sensíveis, com schema validado no backend.        |
| `version`                                              | `integer`          | Controlo otimista.                                                        |
| `created_at`, `updated_at`, `created_by`, `updated_by` | conforme convenção | Obrigatórios.                                                             |

Índices/constraints: PK (`tenant_id`); check `order_retention_days is null or order_retention_days >= 1`.

### `audit_logs`

Registo imutável de ações de segurança e negócio relevantes.

| Coluna                     | Tipo proposto  | Regra                                                        |
| -------------------------- | -------------- | ------------------------------------------------------------ |
| `id`                       | `uuid`         | PK.                                                          |
| `tenant_id`                | `uuid`         | Obrigatório, FK para `tenants.id`.                           |
| `actor_user_id`            | `uuid`         | Nulo apenas para automação documentada.                      |
| `action`                   | `text`         | Ex.: `ORDER_CREATED`, `ORDER_UPDATED`, `MEMBERSHIP_REVOKED`. |
| `entity_type`, `entity_id` | `text`, `uuid` | Recurso afetado.                                             |
| `occurred_at`              | `timestamptz`  | Obrigatório.                                                 |
| `request_id`               | `uuid`         | Correlação da requisição, quando existir.                    |
| `metadata`                 | `jsonb`        | Delta mínimo e redigido; nunca password, token ou segredo.   |

Índices/constraints: índice (`tenant_id`, `occurred_at desc`); índice (`tenant_id`, `entity_type`, `entity_id`, `occurred_at desc`); índice opcional (`actor_user_id`, `occurred_at desc`). A aplicação e a permissão de banco não permitem `UPDATE` ou `DELETE` em logs operacionais.

## Sequência de número de encomenda por tenant

`order_number` não usa uma sequência PostgreSQL global. Na mesma transação que cria a encomenda, o serviço bloqueia a linha de `tenants` correspondente, lê `next_order_number`, incrementa-o e insere a encomenda com o valor reservado. A transação inteira confirma ou reverte junta.

Assim, dois pedidos simultâneos no mesmo tenant não recebem o mesmo número; tenants diferentes não bloqueiam um ao outro. A constraint `unique (tenant_id, order_number)` continua obrigatória como última defesa. Números podem ter lacunas após uma transação abortada ou política de reserva; isso é aceitável e não deve ser reutilizado para preservar rastreabilidade.

## Edição simultânea (versionamento otimista)

1. A API devolve `version` com a encomenda.
2. O cliente envia a versão recebida como precondição da edição, não como autoridade de tenant.
3. O backend resolve o tenant pela sessão e atualiza com condição `id + tenant_id + version + deleted_at is null`.
4. Se nenhuma linha for atualizada, devolve conflito (`409`) e a interface apresenta opção de recarregar/comparar.
5. Em sucesso, incrementa `version`, atualiza itens e grava auditoria numa única transação.

## Exclusão lógica e retenção

- Apagar uma encomenda marca `deleted_at`/`deleted_by`, incrementa `version` e gera audit log; não apaga itens fisicamente nessa operação.
- Listagens normais excluem registros apagados. Restaurar é ação autorizada e auditada, sujeita à retenção.
- Um job administrativo de retenção só pode remover fisicamente registros depois do período aprovado, backups confirmados e retenção legal/contratual satisfeita.
- `audit_logs` têm retenção própria, normalmente maior que a das encomendas; a duração final requer decisão legal e de negócio.

## Requisitos de implementação futuros

Antes de materializar este desenho: validar o schema atual, testar migrations em staging, aplicar constraints gradualmente para dados legados e criar testes de autorização entre dois tenants. Nenhuma migração é fornecida ou executada por este documento.
