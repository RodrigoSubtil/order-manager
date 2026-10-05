# Dados, segurança e migrations

## Modelo atual

Produção e homologação têm o mesmo schema de aplicação, verificado em 05/10/2026: 13 tabelas públicas, 31 funções públicas e seis helpers privados em app_security. A comparação incluiu colunas, defaults, constraints, índices, RLS, políticas, corpos e privilégios de funções. PostgreSQL do fornecedor continua em versões diferentes (produção 17.6 e homologação 17.11); configurações gerenciadas do Supabase não são parte dessa paridade.

Identidade e isolamento: tenants, users e tenant_memberships. Encomendas: orders e order_items. Cadastros: customers, responsibles e catalog_products. Acesso de gestão: tenant_management_credentials e tenant_management_sessions. Gravação idempotente: order_save_receipts. audit_logs, tenant_settings e order_items.catalog_product_id permanecem por compatibilidade com estruturas legadas de produção, agora presentes também em homologação.

O frontend chama 17 RPCs autenticadas por [supabaseData.ts](../../apps/web/src/shared/lib/supabaseData.ts). Empresa e papel vêm de Auth e membership, não de tenant_id informado pelo browser. As tabelas não concedem SELECT/INSERT/UPDATE/DELETE a anon ou authenticated; anon não executa funções públicas. Funções SECURITY DEFINER autenticadas validam sessão e autorização internamente.

## Integridade

- version detecta edição concorrente; requestId impede duplicação em uma repetição da mesma gravação. Responsável novo e encomenda são gravados na mesma transação.
- Concluir/apagar removem imediatamente encomenda e itens. Não existe purge automático ou cron ativo, e essas ações não reiniciam a numeração.
- Telefones são dígitos internacionais no banco; formatação e prefixo pertencem à interface. A identidade de clientes, produtos e responsáveis é normalizada por empresa.
- OWNER e OPERATOR continuam os únicos papéis aceitos em memberships. ADMIN permanece como label legada do enum para compatibilidade; o CHECK impede novas memberships desse papel.
- O papel legado order_manager_api existe com NOLOGIN, sem superuser ou BYPASSRLS. Não é concedido a anon/authenticated. Suas políticas preservam compatibilidade; não são o acesso usado pelo frontend.

## Base de migrations

Os arquivos ativos em [supabase/migrations](../../supabase/migrations) são:

| Versão         | Finalidade                                                              |
| -------------- | ----------------------------------------------------------------------- |
| 20261005205508 | Tipos/enums e extensão necessários; transação própria                   |
| 20261005205821 | Schema e RPCs canónicos; reconciliação específica de objetos existentes |
| 20261005214152 | Remoção de cinco índices duplicados e oito índices de apoio a FKs       |

A base não cria utilizadores, empresas, senhas, dados de catálogo, encomendas ou agendamentos. Foi ensaiada em cópias restauradas dos dois projetos e em uma base vazia, incluindo repetição para verificar idempotência. Preserva constraints equivalentes por renomeação; substitui somente FKs individualmente identificadas que diferiam em ON UPDATE CASCADE. Definições inesperadas interrompem a transação. Não existe remoção global de constraints ou índices.

Os 20 scripts anteriores foram preservados sem alteração em [legacy_migrations](../../supabase/legacy_migrations/README.md). Não são executados por db push. O histórico anterior do conector foi guardado em backup privado; os três registros canónicos correspondem a SQL realmente aplicado, sem fingir aplicação integral da antiga 008.

Para uma nova alteração, use a CLI para gerar um novo arquivo, teste sobre a base atual e revise o diff. Nunca edite uma migration já aplicada. Vercel não migra o banco. Veja [Supabase](../operations/supabase.md), [testes SQL](../../supabase/tests/README.md) e [preparação final](../operations/readiness-2026-10-05.md).

## Segredos e recuperação

URL e chave pública pertencem ao frontend. service_role, connection strings, passwords, hashes, tokens, dumps e dados de clientes ficam fora do Git e do bundle. O desbloqueio de Gerenciar é validado no banco e tem prazo/limite de tentativas. A restauração lógica da aplicação foi ensaiada localmente; não equivale a restaurar o backup físico ou todos os serviços gerenciados do Supabase.
