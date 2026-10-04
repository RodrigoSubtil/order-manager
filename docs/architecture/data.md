# Dados, segurança e migrations

## Modelo atual

`tenants`, `users` e `tenant_memberships` definem identidade, papel e isolamento. `orders` e `order_items` guardam encomendas e itens; `customers`, `responsibles` e `catalog_products` são cadastros por empresa. `tenant_settings` e estruturas de auditoria apoiam configuração e rastreabilidade. Para colunas, índices e constraints exatos, consulte as migrations em [`supabase/migrations`](../../supabase/migrations), não um desenho antigo.

O frontend chama RPCs por [`supabaseData.ts`](../../apps/web/src/shared/lib/supabaseData.ts). O contrato inclui `web_list_orders`, `web_search_customers`, `web_save_order_with_responsible`, `web_delete_order`, `web_complete_order` e operações gerenciais de catálogo/responsáveis. As leituras e escritas comerciais resolvem empresa e permissão a partir da sessão Auth. Não enviam `tenant_id` do browser.

## Integridade

- RLS protege as tabelas; privilégios diretos do cliente são limitados. Funções `SECURITY DEFINER` expostas precisam validar sessão, membership, tenant e papel internamente.
- Encomendas usam `version` para detetar edição concorrente e `requestId` para tornar a repetição de uma gravação segura. Responsável novo e encomenda são gravados na mesma transação.
- Concluir/apagar removem a encomenda e os itens. A numeração não é reiniciada por estas operações.
- O telefone persiste como dígitos internacionais (`351912345678`, por exemplo). A interface separa prefixo e número nacional e usa metadados por país para exibir `+351 912 345 678`. A formatação não deve entrar na coluna nem nas comparações de clientes.
- Produtos e responsáveis têm identidade normalizada por empresa. Uma migration pode recusar dados duplicados antigos antes de alterar o schema; resolver o conflito é uma operação própria.

## Evolução do schema

As migrations SQL são numeradas e aplicadas **na ordem**. O conjunto atual vai de `20260723_000_schema.sql` até `20260930_019_order_responsible_creation.sql`. As mudanças mais relevantes após a base são:

| Migration                                           | Mudança                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `014_order_lifecycle_customers`                     | Clientes, identidade dos produtos, remoção física de pedidos, `requestId` e janela de entrega |
| `015_customer_search_one_letter`                    | Sugestões de cliente a partir de uma letra                                                    |
| `016_add_lunch_category` / `017_seed_lunch_catalog` | Área Almoço e catálogo opcional da Vénus                                                      |
| `018_international_phone`                           | Telefones internacionais                                                                      |
| `019_order_responsible_creation`                    | Responsável novo criado ao guardar a encomenda                                                |

O conteúdo exato e a aplicabilidade de cada SQL estão em [`supabase/migrations`](../../supabase/migrations). Nunca edite uma migration já aplicada. O repositório não prova quais estão aplicadas em produção; compare o histórico do projeto Supabase antes de publicar código dependente delas. Scripts de manutenção histórica em [`supabase/maintenance`](../../supabase/maintenance) não fazem parte do fluxo normal de migrations.

## Segredos e acessos

Apenas `VITE_SUPABASE_URL` e a chave pública entram no frontend. `service_role`, connection strings, passwords, dumps e dados de clientes ficam fora do Git e do bundle. O desbloqueio de **Gerenciar** é validado no banco, tem prazo e limite de tentativas; esconder o botão no React não é a proteção.
