# Testes de banco

O job Database do workflow Quality usa PostgreSQL 17.11 descartável. Não recebe connection string de produção ou de homologação. Os scripts com fixtures são somente para uma base isolada.

1. Execute `ci_auth_bootstrap.sql` para criar a fachada mínima do Auth local. Ela permite testar SQL e claims; não executa o servidor Supabase Auth.
2. Aplique os quatro arquivos de `supabase/migrations` em ordem, cada um em uma transação própria. A adição de um enum precisa ser confirmada antes do segundo arquivo.
3. Execute `schema_contract.sql`, `ci_order_flows.sql` e `ci_order_scan.sql` com `psql -X -v ON_ERROR_STOP=1`.
4. Execute `node supabase/tests/concurrent_orders.mjs` com PGHOST, PGPORT, PGUSER e PGDATABASE configurados para a base descartável. Use PGPASSWORD somente no ambiente do processo, sem registrá-lo.

O teste de concorrência aceita somente `order_manager_test` ou nomes iniciados por `om_`, cria uma empresa/utilizador exclusivos e os remove no finally. Verifica duas gravações simultâneas, identidade única de cliente/produto e repetição simultânea do mesmo requestId. O teste de fluxos verifica idempotência, versão, isolamento por tenant, janela de entrega, edição, conclusão/exclusão e preservação de cadastros.

`schema_contract.sql` consulta o catálogo e lança erro se encontrar RLS desligado, acesso direto de browser, funções anónimas, RPCs inesperadas, papel legado privilegiado ou purge/cron ativo. Pode ser usado na auditoria de um projeto real; os outros scripts não devem ser executados nele.

Passar neste job não certifica login no servidor Auth, deploy, domínio, impressora ou dispositivo físico. Esses caminhos são verificados separadamente em [release](../../docs/operations/release.md).
