# Estado atual do banco e Supabase

> Atualização de 20 de julho de 2026: o schema real, RLS, RPCs, grants e
> contagens agregadas foram auditados com autorização no projeto Supabase
> `order-manager / main / Production`. A evidência confirmada está em
> `docs/reports/stage20/production-metadata-audit.md`. As afirmações abaixo
> marcadas como inferidas representam o estado anterior à auditoria.

Data da auditoria: 15 de julho de 2026  
Escopo: auditoria estritamente de leitura baseada no código e nos artefatos locais disponíveis. Nenhuma ligação ao banco foi possível e nenhuma operação foi executada no Supabase.

## Evidência disponível e limites

O repositório contém apenas o cliente web que consome Supabase. Não foram encontrados:

- arquivo `.env` com configuração de acesso (somente `.env.example`);
- projeto/configuração Supabase local, CLI Supabase, migrations, SQL, dump ou backup;
- repositório Git nesta cópia, portanto também não há histórico local de migrations;
- export do schema, políticas RLS, funções, utilizadores, logs ou configuração de backups.

Por isso, as seções marcadas como **observado no cliente** descrevem o contrato que o frontend espera. Elas não confirmam a existência, tipo SQL, constraint, política ou conteúdo real no ambiente Supabase.

## Configuração e caminho de acesso atual

O cliente é criado em `src/supabaseClient.ts` com as variáveis públicas de build:

| Variável documentada     | Finalidade                               | Estado local                                            |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL do projeto Supabase                  | Documentada em `.env.example`; valor real indisponível. |
| `VITE_SUPABASE_ANON_KEY` | Chave anónima/pública usada pelo browser | Documentada em `.env.example`; valor real indisponível. |

Como ambas usam o prefixo `VITE_`, ficam disponíveis no bundle do navegador. Apenas uma chave anónima/publicável pode ser usada nesse local; uma service-role key nunca deve ser adicionada ao frontend.

```text
Browser React
  -> @supabase/supabase-js com anon key
  -> PostgREST (tabelas) e RPCs PostgreSQL
  -> Supabase/PostgreSQL
```

Não existe API própria, backend NestJS, proxy ou autenticação de servidor entre o navegador e o banco.

## Tabelas e relacionamento inferidos

### `orders` — observado no cliente

| Coluna esperada  | Uso observado                                  | Tipo SQL / constraint real |
| ---------------- | ---------------------------------------------- | -------------------------- |
| `id`             | Identificador da encomenda.                    | Não verificável.           |
| `order_number`   | Número apresentado; pode ser nulo.             | Não verificável.           |
| `app_user_id`    | Filtro de leitura, propriedade e escrita.      | Não verificável.           |
| `client_name`    | Nome do cliente.                               | Não verificável.           |
| `phone`          | Telefone; o cliente grava `null` quando vazio. | Não verificável.           |
| `responsible_id` | Referência ao responsável; pode ser nulo.      | Não verificável.           |
| `delivery_date`  | Data de entrega e filtro por período.          | Não verificável.           |
| `delivery_time`  | Hora de entrega; pode ser nula.                | Não verificável.           |
| `created_at`     | Data de criação apresentada ao frontend.       | Não verificável.           |

Operações observadas: `select`, `insert`, `update` e `delete`. As leituras filtram `app_user_id`; a atualização e exclusão também aplicam esse filtro no cliente.

### `order_products` — observado no cliente

| Coluna esperada | Uso observado                                    | Tipo SQL / constraint real |
| --------------- | ------------------------------------------------ | -------------------------- |
| `id`            | Identificador do item.                           | Não verificável.           |
| `order_id`      | Associação a `orders.id`.                        | Não verificável.           |
| `category`      | Categoria do produto.                            | Não verificável.           |
| `product`       | Nome do produto.                                 | Não verificável.           |
| `quantity`      | Texto de quantidade/unidade.                     | Não verificável.           |
| `notes`         | Observação; o cliente grava `null` quando vazia. | Não verificável.           |
| `position`      | Ordem dos itens; pode ser nula na leitura.       | Não verificável.           |

O cliente carrega `order_products` como relacionamento aninhado de `orders`, apaga todos os itens de uma encomenda durante a edição e reinsere a lista completa. Isto sugere, mas não comprova, uma chave estrangeira `order_products.order_id -> orders.id`.

### `order_responsibles` — observado no cliente

| Coluna esperada | Uso observado                               | Tipo SQL / constraint real |
| --------------- | ------------------------------------------- | -------------------------- |
| `id`            | Identificador do responsável.               | Não verificável.           |
| `name`          | Nome apresentado e usado no relacionamento. | Não verificável.           |
| `is_active`     | Filtro do fallback direto.                  | Não verificável.           |
| `position`      | Ordenação do fallback direto.               | Não verificável.           |

O `select` de encomendas usa o nome explícito de relação `order_responsibles!orders_responsible_id_fkey`. Isso indica que o cliente espera uma FK chamada `orders_responsible_id_fkey` entre `orders.responsible_id` e esta tabela, mas o destino, a opcionalidade e as ações de cascata precisam ser confirmados no catálogo PostgreSQL.

### `catalog_products` — observado no cliente

| Coluna esperada | Uso observado                         | Tipo SQL / constraint real |
| --------------- | ------------------------------------- | -------------------------- |
| `id`            | Identificador do produto de catálogo. | Não verificável.           |
| `category`      | Categoria do catálogo.                | Não verificável.           |
| `name`          | Nome do produto.                      | Não verificável.           |
| `is_active`     | Filtro de produtos ativos.            | Não verificável.           |
| `position`      | Ordenação do catálogo.                | Não verificável.           |

Não há filtro explícito por utilizador, padaria ou tenant nesta consulta. A abrangência real (global ou por empresa) depende do schema e de RLS, ambos indisponíveis.

### Utilizadores da aplicação — parcialmente observados

O cliente não consulta uma tabela de utilizadores. A RPC de login devolve `user_id`, `user_username` e `user_bakery_name`. Pode existir uma tabela própria de utilizadores, Supabase Auth, ou ambos; não há evidência suficiente para afirmar qual modelo está em uso.

### Diagrama de relação inferida

```text
app user (origem desconhecida)
  1 ──< orders (app_user_id)
              |
              ├──< order_products (order_id)
              |
              └──> order_responsibles (responsible_id)

catalog_products (consulta independente; escopo desconhecido)
```

## Chaves, índices, constraints, triggers e funções

| Elemento            | Estado da auditoria                    | Evidência local                                                                                                                   |
| ------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Chaves primárias    | Não verificável para todas as tabelas. | Campos `id` são consumidos como identificadores.                                                                                  |
| Chaves estrangeiras | Não verificável.                       | Relações inferidas por `order_id`, `responsible_id` e `app_user_id`; nome esperado `orders_responsible_id_fkey`.                  |
| Índices             | Não verificável.                       | O cliente filtra por `app_user_id`, intervalo de `delivery_date`, `is_active` e ordena por datas/posição, mas não revela índices. |
| Constraints         | Não verificável.                       | Não há SQL nem mensagens de constraint versionadas.                                                                               |
| Triggers            | Não verificável.                       | Nenhuma chamada ou definição local.                                                                                               |
| Functions/RPCs      | Duas RPCs observadas abaixo.           | `src/authApi.ts` e `src/ordersApi.ts`.                                                                                            |

## RPCs e autenticação

### `login_app_user(p_username, p_password)`

**Contrato esperado pelo cliente:** recebe o identificador e a palavra-passe em texto; em sucesso retorna uma lista cujo primeiro elemento tem `user_id`, `user_username` e `user_bakery_name`. Erro da RPC ou lista vazia é tratado como falha de login.

**Fluxo atual observado:**

1. O browser chama a RPC com a anon key.
2. O frontend armazena apenas `{ id, username, bakeryName }` no `localStorage` sob `order-manager-user`.
3. Ao reiniciar, a presença de `id` e `username` nesse objeto é considerada uma sessão válida.
4. Não há chamada a `supabase.auth`, JWT, refresh token, expiração ou validação de sessão no cliente.

**O que não foi possível confirmar:** implementação SQL, `SECURITY DEFINER/INVOKER`, `search_path`, hashing/verificação da palavra-passe, limitação de tentativas, origem de `user_id`, grants a `anon`, auditoria e se a função revela informação sobre utilizadores.

### `list_order_responsibles(p_app_user_id)`

**Contrato esperado pelo cliente:** retorna responsáveis com `id`/`name` ou `responsible_id`/`responsible_name`.

Em caso de falha, o cliente consulta diretamente `order_responsibles` ativos, sem filtro explícito por utilizador ou empresa. Não é possível confirmar se RLS impede exposição indevida nesse fallback.

## RLS, permissões e papéis

Não há export de políticas, grants, roles PostgreSQL ou configuração de Supabase Auth. Portanto não é possível confirmar:

- se RLS está ativado em cada tabela;
- políticas para `anon`, `authenticated`, `service_role` ou papéis próprios;
- grants de execução das RPCs;
- se utilizadores de aplicação correspondem a `auth.users`;
- permissões administrativas e respetivos proprietários.

O frontend executa acessos a tabelas com a anon key. Qualquer proteção baseada apenas no filtro `app_user_id` do browser é insuficiente: uma pessoa pode alterar a requisição. A base de dados deve aplicar a autorização independentemente do cliente.

## Dados existentes, backups e recuperação

Nenhum dado real foi consultado. Não foi obtida informação sobre volume, dados pessoais, retenção, backups automáticos, PITR, região, plano, testes de restauro, RPO ou RTO.

Como `orders` contém nome e telefone de clientes, presume-se tratamento de dados pessoais; a classificação, base legal, retenção e procedimentos RGPD devem ser definidos antes de comercializar a solução.

## Perguntas e evidências bloqueadoras

Para completar esta auditoria com uma fonte autorizada e de leitura, são necessários:

1. Export SQL do schema (ou acesso de leitura ao catálogo `pg_catalog`/`information_schema`).
2. Definição SQL, owner, atributos de segurança e grants de `login_app_user` e `list_order_responsibles`.
3. Export das políticas RLS e estado de RLS por tabela.
4. Lista de roles/permissões, sem segredos ou palavras-passe.
5. Confirmação do modelo de utilizadores e integração (ou não) com Supabase Auth.
6. Inventário agregado de dados por tabela e uma amostra anonimizada, se necessária para planeamento.
7. Documentação de backups, retenção, PITR, RPO, RTO e pelo menos um teste de restauro não produtivo.

Nenhuma dessas informações deve ser obtida com service-role key no frontend nem copiada para o repositório.
