# Validação final da preparação · 05/10/2026

Este registo continua a [auditoria inicial](homologacao-audit-2026-10-05.md). O utilizador autorizou testes nos dois projetos antes da chegada de clientes, recuperação lógica, reconciliação e publicação de homologação para produção, sem custo extra. Impressora e telemóvel físicos foram excluídos da rodada por sua decisão.

## Evidência concluída antes da publicação

| Verificação                            | Resultado comprovado                                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Recuperação lógica                     | Duas bases PostgreSQL 17.11 locais restauradas; todas as linhas iguais aos exports (15 tabelas de produção e 13 de homologação, incluindo Auth) |
| Preservação durante migrations         | Igualdade dos dados repetida após aplicação/repetição das migrations nas cópias restauradas                                                     |
| Instalação limpa                       | Base vazia recebeu a mesma sequência canónica e passou nos testes SQL                                                                           |
| Schema remoto                          | 13 tabelas, 31 funções públicas e 6 privadas; colunas, constraints, índices, políticas, RLS, funções e grants idênticos nos dois projetos       |
| Histórico ativo                        | As mesmas três versões locais/remotas, realmente aplicadas; histórico antigo guardado em backup privado                                         |
| Segurança do banco                     | Todas as tabelas com RLS; zero acesso direto de anon/authenticated; zero funções públicas executáveis por anon; 17 RPCs autenticadas            |
| Integridade SQL                        | Idempotência, versão, tenant, janela de entrega, edição/conclusão/exclusão e preservação de cadastros aprovados nas três bases locais           |
| Concorrência SQL                       | Duas sessões reais com papel authenticated; pedidos distintos e repetição simultânea do mesmo requestId sem duplicação                          |
| Aplicação local                        | npm ci limpo; formatação, lint, tipos, 151 testes e cobertura/build aprovados                                                                   |
| Cabeçalho local                        | Order Manager e v1.0.0 com a mesma coordenada inferior (44 px)                                                                                  |
| Site de homologação após reconciliação | Pedido criado pela interface, encontrado no banco, editado com versão 1→2 e concluído; itens removidos; catálogo e responsáveis preservados     |

As bases locais usaram a fachada mínima de Auth para testar SQL; o login real foi verificado separadamente no site de homologação. Uma recuperação lógica não certifica a restauração física gerenciada ou todos os serviços do Supabase.

## O que mudou e por quê

- A versão permanece v1.0.0. O cabeçalho passou a usar uma linha flex para alinhar o número com a base da marca, sem posição absoluta.
- Os 20 SQLs históricos foram movidos sem alteração para legacy_migrations. A base ativa, gerada pela CLI, não contém encomendas, senhas, utilizadores, seeds ou cron. Os registros anteriores foram exportados antes de consolidar o histórico; a antiga 008 não foi falsamente marcada como aplicada integralmente.
- A reconciliação preservou estruturas legadas de produção também em homologação. Constraints equivalentes foram renomeadas; somente FKs individualmente identificadas foram substituídas quando diferiam em ON UPDATE CASCADE. Uma definição inesperada aborta a transação. Uma proposta inicial mais ampla foi recusada pela revisão automática e não foi aplicada.
- Uma migration separada removeu cinco índices não únicos comprovadamente duplicados, mantendo seus equivalentes, e adicionou oito índices de apoio a FKs. A primeira tentativa em produção sofreu deadlock e foi inteiramente desfeita; a repetição em janela sem consultas das abas de teste passou. A auditoria final não mostrou duplicação de índices ou FK sem índice.
- Quality passou a rodar em PRs e pushes de main/homologacao, com jobs de aplicação e PostgreSQL descartável. O build do Vercel passou a executar verify:release, impedindo novo Ready se formatação, lint, tipos, testes ou build falharem. Node 22.x é fixado no package.json para coincidir com desenvolvimento e CI.
- PostCSS, Vitest/coverage e dependências compatíveis foram atualizados após audit. A instalação npm ci foi repetida e validada. Não houve downgrade forçado de Stylelint nem alteração das dependências funcionais do frontend.

## Migrations realmente aplicadas

| Versão         | Nome                            |
| -------------- | ------------------------------- |
| 20261005205508 | readiness_schema_baseline       |
| 20261005205821 | readiness_schema_reconciliation |
| 20261005214152 | readiness_index_cleanup         |

Tipos/enums precisam de uma transação confirmada antes do schema. Uma mudança futura exige um novo arquivo de CLI, ensaio em homologação/cópia restaurada, revisão e aplicação apenas do SQL pendente. Vercel não executa SQL nem transfere dados entre bancos.

## Publicação e limpeza

O commit inicial ecbc29c passou nos dois jobs do GitHub. Seu Preview foi bloqueado no Vercel exclusivamente por formatação de vercel.json. O build foi ajustado para formatar apenas esse JSON antes de verify:release; a verificação do arquivo original continua no GitHub. As Actions foram atualizadas para v6 e o runner fixado em Ubuntu 24.04 para retirar os avisos de runtime antigo e evitar uma troca automática de imagem durante a operação.

Este registro inicial comprova as etapas acima. A publicação desta alteração e o smoke test após deploy serão registrados aqui somente depois de confirmar o commit, os dois jobs do GitHub, Ready do Vercel e os domínios. Consulte [release](release.md) para o procedimento; não inferir deploy a partir de testes locais.

Os testes usam nomes QA identificáveis. A limpeza remove somente os IDs criados pelo teste e reinicia o contador apenas enquanto não houver encomendas, conforme autorização pontual. Deploys comuns preservam dados e numeração. Produção mantém seus cadastros operacionais anteriores; homologação mantém Rodrigo/Maria Eduarda e seu catálogo.

## Limites e riscos conhecidos

- O GitHub informou que proteção obrigatória de branches não é aplicada a este repositório privado no plano atual. A revisão e o merge são manuais. Nenhum plano, visibilidade ou conta paga foi alterado; CI e build Vercel reduzem o risco, mas não substituem essa proteção.
- npm audit --omit=dev retornou zero vulnerabilidades nas dependências de produção. O audit completo ainda mostrou sete avisos altos derivados de braces 3.0.3 na cadeia de ferramentas Stylelint, sem correção compatível disponível observada. São ferramentas de desenvolvimento para arquivos confiáveis; não entram no bundle publicado. Não executar lint sobre padrões/arquivos não confiáveis. Isso é um risco documentado, não uma afirmação de zero vulnerabilidades no repositório.
- Os advisors de segurança continuam sinalizando quatro tabelas com RLS sem política (sem acesso direto), 17 RPCs SECURITY DEFINER autenticadas (acesso intencional validado) e proteção contra senhas vazadas desativada. Homologação Free não dispõe dessa proteção; nenhum upgrade foi contratado. Rever esses avisos quando alterar Auth/permissões; não abrir acesso anónimo para eliminá-los.
- Índices novos podem aparecer como unused_index enquanto não houver tráfego; isso não é prova de defeito e não justifica removê-los imediatamente.
- Recuperação física gerenciada do Supabase, impressora e telemóvel físicos não foram certificados. O ensaio lógico e os testes de código não comprovam essas operações.
- Não existe garantia de ausência de falhas futuras. Antes da abertura, confirme acesso ao domínio de produção, horário Europe/Lisbon, a senha de gestão definida pelo utilizador e o destino físico de impressão, se for usado.

## Referências operacionais

- [Produção](https://order-manager-rs.vercel.app/) e [Homologação](https://homologacao-order-manager-rs.vercel.app/)
- [Ambientes e acessos sem senhas](environments.md), [Backup](backup.md), [Supabase](supabase.md) e [Testes SQL](../../supabase/tests/README.md)
- [Repositório](https://github.com/RodrigoSubtil/order-manager) e [Vercel](https://vercel.com/rodrigo-freitas-subtils-projects/order-manager)
- [RLS sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [Senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
