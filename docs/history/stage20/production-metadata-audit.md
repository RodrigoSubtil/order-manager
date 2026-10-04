# Auditoria autorizada de metadata do Supabase legado

Data: 20 de julho de 2026  
Projeto: `order-manager`, branch `main`, identificado pelo painel como `Production`  
Escopo: consultas `SELECT` ao catálogo PostgreSQL e contagens agregadas.  
Alterações externas: nenhuma tabela, linha, função, trigger, policy, grant ou configuração foi alterada.

## Limites

Esta auditoria não exportou nomes de utilizadores, nomes de responsáveis, nomes de produtos, passwords, hashes, encomendas ou outros dados pessoais. O SQL Editor estava autenticado como `postgres`, mas todas as consultas executadas foram somente de leitura.

O painel indica que este é o ambiente de produção. Por isso, a reestruturação das tabelas não foi executada, mesmo após autorização genérica para melhorar o schema. Uma alteração de produção exige backup, ensaio numa cópia isolada, reconciliação e confirmação específica do impacto.

## Inventário confirmado

### `app_users`

| Coluna          | Tipo          | Nulo | Default                        |
| --------------- | ------------- | ---- | ------------------------------ |
| `id`            | `uuid`        | não  | `extensions.gen_random_uuid()` |
| `username`      | `text`        | não  | —                              |
| `password_hash` | `text`        | não  | —                              |
| `bakery_name`   | `text`        | sim  | —                              |
| `is_active`     | `boolean`     | não  | `true`                         |
| `last_login_at` | `timestamptz` | sim  | —                              |
| `created_at`    | `timestamptz` | não  | `now()`                        |
| `updated_at`    | `timestamptz` | não  | `now()`                        |

- PK: `id`.
- `username` é globalmente único.
- RLS: habilitado, não forçado.
- Não foram encontradas policies para esta tabela no inventário.
- Grants de tabela encontrados apenas para `postgres` e `service_role`.

### `orders`

| Coluna           | Tipo          | Nulo | Default                              |
| ---------------- | ------------- | ---- | ------------------------------------ |
| `id`             | `uuid`        | não  | `gen_random_uuid()`                  |
| `client_name`    | `text`        | não  | —                                    |
| `phone`          | `text`        | sim  | —                                    |
| `delivery_date`  | `date`        | não  | —                                    |
| `delivery_time`  | `time`        | sim  | —                                    |
| `created_at`     | `timestamptz` | não  | `now()`                              |
| `updated_at`     | `timestamptz` | não  | `now()`                              |
| `app_user_id`    | `uuid`        | não  | —                                    |
| `responsible_id` | `uuid`        | sim  | —                                    |
| `order_number`   | `bigint`      | não  | `nextval('orders_order_number_seq')` |

- PK: `id`.
- FK `app_user_id -> app_users.id`, com `ON DELETE CASCADE`.
- FK `responsible_id -> order_responsibles.id`, com `ON DELETE SET NULL`.
- `order_number` é globalmente único.
- Sequência global `orders_order_number_seq`, incremento 1, sem ciclo.
- Trigger `set_orders_updated_at`.
- RLS: **desabilitado**.
- Existem policies por `auth.uid()`, mas elas não protegem a tabela enquanto RLS estiver desabilitado.

### `order_products`

- Colunas: `id uuid`, `order_id uuid`, `category text`, `product text`, `quantity text`, `notes text?`, `position integer`, `created_at timestamptz`.
- FK `order_id -> orders.id`, com `ON DELETE CASCADE`.
- Constraint de categoria: `Pastelaria`, `Padaria` ou `Salgados`.
- RLS: **desabilitado**.
- Existem policies de `SELECT`, `INSERT` e `DELETE`, mas são ineficazes com RLS desligado.
- Não foi encontrada policy de `UPDATE`.

### `order_responsibles`

- Colunas: `id uuid`, `app_user_id uuid`, `name text`, `is_active boolean`, `position integer`, `created_at` e `updated_at`.
- FK `app_user_id -> app_users.id`, com `ON DELETE CASCADE`.
- Unique: `(app_user_id, name)`.
- RLS: habilitado, não forçado.
- Não foram encontradas policies diretas.

O campo `app_user_id` não estava visível no contrato inferido anteriormente. O migrador da Etapa 20 foi corrigido para preservá-lo como origem do tenant/membership e para bloquear uma encomenda que referencie responsável pertencente a outro utilizador legado.

### `catalog_products`

- Colunas: `id uuid`, `category text`, `name text`, `is_active boolean`, `position integer`, `created_at` e `updated_at`.
- Unique global: `(category, name)`.
- Constraint das três categorias conhecidas.
- Não possui `app_user_id` nem `tenant_id`.
- RLS: **desabilitado**.
- O catálogo atual é global.

## RPCs e funções

### `login_app_user(p_username text, p_password text)`

- `SECURITY DEFINER`.
- `search_path = public, extensions`.
- Verifica `password_hash` com `crypt`.
- Atualiza `last_login_at` depois de autenticação correta.
- Retorna ID, username e nome da padaria.
- `EXECUTE` está concedido a `PUBLIC`, `anon`, `authenticated`, `postgres` e `service_role`.

Embora a comparação use `crypt`, esta RPC não cria sessão Supabase Auth, JWT ou identidade verificável para RLS. Também não foi observada limitação de tentativas no banco.

### `list_order_responsibles(p_app_user_id uuid)`

- `SECURITY DEFINER`.
- Aceita um `app_user_id` escolhido pelo chamador.
- Se encontrar responsáveis desse utilizador, devolve-os.
- Se não encontrar, o fallback devolve responsáveis ativos de todos os utilizadores, deduplicados por nome.
- `EXECUTE` está concedido a `PUBLIC`, `anon`, `authenticated`, `postgres` e `service_role`.

O fallback confirma um risco de exposição entre empresas e deve ser removido no estado-alvo.

### `set_updated_at()`

Trigger function simples, `SECURITY INVOKER`, usada em `orders` e `app_users`.

## Grants e risco de acesso

`anon` e `authenticated` possuem os privilégios de tabela `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` e `TRIGGER` em:

- `orders`;
- `order_products`;
- `order_responsibles`;
- `catalog_products`.

Impacto:

- `orders`, `order_products` e `catalog_products` estão com RLS desligado; as policies existentes não são aplicadas.
- `order_responsibles` tem RLS ligado sem policy direta, mas a RPC `SECURITY DEFINER` permite fallback entre utilizadores.
- O filtro `app_user_id` do frontend não constitui autorização.

Este é um risco crítico confirmado, não mais uma hipótese.

## Supabase Auth

| Verificação agregada                     | Resultado |
| ---------------------------------------- | --------: |
| `auth.users`                             |         0 |
| utilizadores em `app_users`              |         2 |
| IDs presentes nos dois modelos           |         0 |
| utilizadores legados sem identidade Auth |         2 |

As duas identidades precisam ser criadas de forma segura por convite/reset. Passwords e hashes legados não devem ser copiados.

## Dados agregados

| Entidade             | Contagem |
| -------------------- | -------: |
| `app_users`          |        2 |
| `orders`             |        0 |
| `order_products`     |        0 |
| `order_responsibles` |       10 |
| `catalog_products`   |       30 |

Integridade agregada:

- 2 utilizadores ativos e 0 inativos;
- 0 utilizadores sem `bakery_name`;
- 0 encomendas e, portanto, nenhum nome/telefone de cliente para migrar neste momento;
- 0 responsáveis órfãos;
- responsáveis distribuídos por 2 utilizadores;
- 0 grupos duplicados de responsáveis dentro do mesmo utilizador;
- 0 categorias inválidas no catálogo;
- 0 grupos duplicados de catálogo por categoria.

## Agrupamento de empresas

Sem revelar nomes:

- existem 2 valores distintos de `bakery_name`;
- cada grupo contém exatamente 1 utilizador;
- não existe nome de padaria partilhado pelos dois utilizadores.

Portanto, fundir os dois utilizadores automaticamente num único tenant seria inseguro. A hipótese mais coerente é criar **dois tenants**, um por padaria, mas isso exige confirmação do negócio antes de gerar o export de dados.

O catálogo atual é global. No modelo alvo, deve ser decidido se os 30 produtos serão:

1. copiados para cada tenant;
2. atribuídos a apenas um tenant;
3. transformados num catálogo global gerido separadamente.

O schema Prisma aprovado atualmente usa catálogo por tenant. A opção mais compatível é copiar o catálogo para ambos, com IDs determinísticos por tenant e relatório de correspondência.

## Alterações que não foram executadas

- nenhuma tabela nova;
- nenhum `ALTER TABLE`;
- nenhuma ativação de RLS;
- nenhum grant/revoke;
- nenhuma alteração de RPC;
- nenhuma criação de utilizador Auth;
- nenhum tenant ou membership;
- nenhum export de linhas com nomes;
- nenhuma migration;
- nenhum backup ou restore no Supabase.

## Bloqueadores para o export real

> Decisão posterior: o proprietário declarou todos os dados atuais fictícios e
> descartáveis. Os itens abaixo ficam arquivados como referência, mas o export
> real não será executado.

1. Confirmar se os dois nomes distintos de padaria representam duas empresas/tenants.
2. Decidir a estratégia do catálogo global.
3. Definir OWNER de cada tenant e email de convite para Supabase Auth.
4. Autorizar explicitamente o export dos 2 utilizadores, 10 responsáveis e 30 produtos para uma cópia local protegida e fora do Git.
5. Confirmar backup/restauração do projeto de produção antes de qualquer alteração estrutural.
