# Auditoria e preparação de homologação · 05/10/2026

Este registo distingue código, SQL no banco real, simulação de identidade autenticada e interação no site publicado. Não representa garantia de ausência de riscos ou de compatibilidade de uma alteração futura. A configuração operacional atual está em [Ambientes](environments.md).

> Este documento registra a preparação inicial. A reconciliação posterior, novos checks e publicação estão no [relatório final](readiness-2026-10-05.md); as diferenças e pendências abaixo correspondem ao instante inicial.

## Alterações realizadas

- A branch remota `staging` foi renomeada para `homologacao` e sincronizada com `main`. Na última consulta pelo GitHub, ambas mostraram 3/3 checks aprovados, e homologação mostrou zero commits à frente/atrás.
- O commit de referência dos dois ambientes foi `127f535f10b70e4119d77fa858cb9b51e102ba1c`, produto 1.0.0. O checkout local ainda conserva uma branch `staging` antiga; essa referência local não é prova de uma branch remota em uso.
- Foi criado `order-manager-homologacao` numa organização Free separada, após recusa pelo utilizador da alternativa com custo adicional. A proposta de criação observada foi US$ 0/mês; não foi contratado um projeto pago extra.
- Foram preparadas as migrations necessárias e os dados de catálogo, sem copiar clientes/encomendas de produção e sem instalar o antigo job de exclusão automática. A `008` foi aplicada parcialmente de forma deliberada, seguida das migrations posteriores.
- O Preview da branch passou a usar exclusivamente a URL/chave pública do novo Supabase. As duas variáveis originais de Production foram preservadas.
- O domínio curto de homologação foi associado a Preview/`homologacao`; o domínio de produção permaneceu associado a Production. Foram removidos os três aliases descritos em [Ambientes](environments.md).
- Foi configurado o Site URL de homologação e corrigido o Site URL de produção para os respectivos endereços publicados. Nenhuma lista ampla de redirects foi criada.
- O utilizador escolheu inicialmente as senhas diretamente na interface. Na revisão final pediu a troca do login para `pastelaria_teste` e uma nova senha. A alteração administrativa preservou o ID Auth e o `OWNER`, sincronizou email técnico/identidade/metadata/perfil e guardou somente o hash da senha. Foram removidas as sessões e refresh tokens anteriores da conta e seus desbloqueios gerenciais. A senha gerencial permaneceu configurada.
- Os nove responsáveis fictícios de homologação foram substituídos por **Rodrigo** e **Maria Eduarda**.
- Foram limpos os registos identificados de QA e reiniciados os contadores dos dois tenants em 1, com verificação de ausência de encomendas antes da alteração. Produção conservou seu cliente, seus 216 produtos e seus nove responsáveis.

Na preparação inicial, não foram modificados código da aplicação, migrations históricas ou versão do produto nesta revisão final. Não houve merge/push ou novo deployment por causa dos resets ou desta documentação.

## Evidência de publicação

| Ambiente    | Deployment observado           | Estado | Origem                                        |
| ----------- | ------------------------------ | ------ | --------------------------------------------- |
| Produção    | `4MPGv5A2JLKKsBhYQN9KDPmYawMj` | Ready  | `main`, commit de referência                  |
| Homologação | `3ijaajh7ofbJY9b8PACrDKCHLwDo` | Ready  | Preview / `homologacao`, commit de referência |

A consulta final do GitHub mostrou ausência de proteção clássica e de rulesets. A tela de rulesets informou que não seriam aplicados neste repositório privado até migrar para uma organização Team. Nenhum plano foi alterado; o gate de publicação permanece uma revisão manual de PR/checks.

Os dois domínios principais foram conferidos com configuração válida no Vercel. O alias longo antigo de homologação devolveu 404 após sua remoção. URLs automáticas podem reaparecer em deployments futuros; não confundir alias com banco ou projeto.

## Código e testes locais

Foi testada uma cópia isolada do commit exato, com finais de linha LF, Node.js 22.15.0 e npm 10.9.2. As dependências vieram da instalação local existente; não foi executado um novo `npm ci` nessa cópia.

| Check                   | Resultado                           |
| ----------------------- | ----------------------------------- |
| `npm run format:check`  | Passou                              |
| `npm run lint`          | Passou, ESLint e Stylelint          |
| `npm run typecheck`     | Passou                              |
| `npm run test:coverage` | 34 ficheiros / 151 testes aprovados |
| `npm run build`         | Passou                              |

A cobertura global de statements foi 57,19%. Existem testes com mocks; esse número e os testes locais não substituem a integração publicada. Problemas iniciais de finais de linha e aliases de workspaces ocorreram na preparação da cópia de QA e foram resolvidos sem alterar a aplicação original.

## Testes no site publicado de homologação

| Fluxo                              | Evidência                                                                                                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login inválido                     | Rejeitado; resposta Auth 400 observada no projeto de homologação                                                                                                                 |
| Login válido                       | Painel autenticado, papel OWNER e dados carregados                                                                                                                               |
| Novo login `pastelaria_teste`      | Login real aprovado no domínio curto; cabeçalho Pastelaria Teste e indicadores zero                                                                                              |
| Responsáveis finais                | Formulário novo mostrou somente Rodrigo e Maria Eduarda; fechado sem salvar                                                                                                      |
| Criar encomenda                    | Duas encomendas fictícias na primeira bateria e uma terceira, número 1, após o reset; empresa/autor corretos confirmados no banco                                                |
| Campos obrigatórios                | Formulário impediu gravação incompleta                                                                                                                                           |
| Cliente e telefone                 | Autocomplete reutilizou cliente; telefone internacional persistiu em dígitos                                                                                                     |
| Edição                             | Quantidade alterada e versão incrementada de 1 para 2 no banco                                                                                                                   |
| Filtros/pesquisa                   | Datas, cliente e contagens conferidos com os dados de teste                                                                                                                      |
| Concluir encomenda                 | Confirmação pela tela; encomenda/itens removidos e sucesso confirmado no banco                                                                                                   |
| Responsável novo ao salvar         | Criação atômica na mesma gravação da encomenda                                                                                                                                   |
| Gerenciar                          | Utilizador configurou/desbloqueou a segunda senha; gestão real de catálogo/responsáveis funcionou                                                                                |
| Catálogo                           | Criar, editar nome/área, filtrar e apagar pela tela; soft delete e versões confirmados                                                                                           |
| Responsável                        | Editar e apagar pela tela; soft delete preservou a encomenda que o referenciava                                                                                                  |
| Apagar encomenda pela tela         | Teste retomado após a interrupção: encomenda fictícia #1 com Rodrigo criada e apagada pela confirmação final; sucesso no site e ausência de encomenda/itens comprovados no banco |
| Exclusão pela função do aplicativo | `web_delete_order` executada com papel authenticated/claims simulados na limpeza e nos testes finais; encomenda/itens removidos                                                  |
| Impressão individual               | Ação de impressão disparada; impressora física e saída final não aprovadas nesta auditoria                                                                                       |

O preenchimento automatizado de hora precisou de evento real de teclado para atualizar o formulário. Esse ajuste foi no teste, sem mudança no produto.

## Testes de autorização e integridade no banco

Com papel `authenticated` e claims simulados, foram verificados bloqueio sem membership, isolamento entre empresas, restrição gerencial do `OPERATOR`, necessidade da senha gerencial, prazo do desbloqueio, bloqueio após cinco erros e recusa de versão desatualizada. As fixtures dessas verificações foram desfeitas por rollback; o `OWNER` original e sua credencial gerencial permaneceram válidos.

Foram verificados gravação idempotente por `requestId`, empresa/autor derivados da membership, edição versionada, exclusão física e recusa de entrega às 23:00. A janela atual é 08:00 a 21:00.

Depois do reset, **em cada banco**, uma transação criou a encomenda número 1 pela RPC com papel authenticated, repetiu o mesmo request de modo idempotente e apagou pela RPC. Assertions confirmaram o número 1 e ausência de itens órfãos. O rollback desfez encomenda, cliente sintético, recibo e incremento do contador. Consulta posterior confirmou zero encomendas/itens/recibos e contador novamente 1. Isso valida o caminho SQL com identidade simulada; não equivale a um novo login real de produção.

Na preparação e QA de homologação, todas as 11 tabelas públicas tinham RLS, sem grants diretos para anon/authenticated; anon não tinha EXECUTE em funções públicas. Foram identificadas 17 RPCs de aplicação com EXECUTE autenticado. As funções protegidas validam membership/tenant/papel internamente. Na verificação final dos dois projetos, os alerts `rls_enabled_no_policy`, `authenticated_security_definer_function_executable` e `auth_leaked_password_protection` permanecem e exigem revisão ao alterar essa arquitetura:

- [RLS sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Funções SECURITY DEFINER autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

O último alerta indica proteção contra senhas vazadas desativada. Essa capacidade exige Pro ou superior; em homologação Free não deve ser tratada como habilitada. Produção usa Pro, mas a ativação precisa de revisão operacional própria e não foi feita nesta auditoria. Nenhum plano foi alterado.

## Comparação dos bancos

As 27 funções públicas compartilhadas tiveram definições equivalentes após normalizar espaços/comentários e os mesmos grants/configurações relevantes. Isso sustenta compatibilidade dos contratos atuais, não paridade absoluta de schema.

| Diferença observada                | Produção                                                                                              | Homologação                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Tabelas públicas                   | 13                                                                                                    | 11                                                                     |
| Estruturas adicionais              | `audit_logs`, `tenant_settings`                                                                       | Ausentes                                                               |
| Funções públicas                   | 31                                                                                                    | 27                                                                     |
| Funções adicionais                 | `enforce_membership_change`, `reserve_order_number`, `rls_auto_enable`, `upsert_invited_user_profile` | Ausentes                                                               |
| Coluna legada                      | `order_items.catalog_product_id` e FK correspondente                                                  | Ausentes                                                               |
| Políticas RLS públicas             | 26, com grants legados adicionais                                                                     | 0; RPCs como fronteira de acesso                                       |
| Trigger adicional                  | `tenant_memberships_enforce_change`                                                                   | Ausente                                                                |
| Constraints                        | Estado legado, algumas relações com ON UPDATE CASCADE                                                 | Checks/uniques/FKs da instalação nova, incluindo FK de users para Auth |
| PostgreSQL observado               | 17.6.1.155                                                                                            | 17.11.0.002                                                            |
| Histórico consultado de migrations | Sem entradas retornadas                                                                               | 20 entradas com identificadores gerados pelo conector                  |

Migrations que dependam das estruturas diferentes precisam de ensaio/reconciliação próprios. Não remover estruturas de produção para imitar homologação sem análise e autorização específicas.

## Limpeza final e limites

Homologação terminou com zero encomendas, itens, clientes e recibos; 215 produtos ativos; dois responsáveis; próximo número 1. Produção terminou com zero encomendas, itens e recibos; um cliente, 216 produtos e nove responsáveis preservados; próximo número 1. Os dois projetos Supabase estavam `ACTIVE_HEALTHY`.

Em produção foram removidos somente dois recibos de gravações antigas cujas encomendas já não existiam, e reiniciado o contador; os metadados de recuperação dessa operação foram guardados localmente fora do Git. Isso não é um backup completo do banco. As alterações posteriores explicitamente autorizadas em produção incluem também limpeza de aliases e correção do Site URL.

A homologação está funcional para os fluxos comprovados e a separação de ambientes está configurada. O frontend atual pode seguir o fluxo PR de homologação para main/build Production. Cada mudança futura ainda precisa passar por revisão e testes; não existe aprovação geral de qualquer migration futura.

Pendências: impressão em bobina de 80 mm, fluxo em telemóvel real, ensaio de restauração de backup, reconciliação do histórico de migrations antes de automação e proteção/gate de branch para obrigar checks antes do merge. A documentação registra esses limites; não os transforma em testes aprovados.

Refresh tokens/sessões antigos da conta de teste foram removidos. Access tokens já emitidos podem continuar válidos até expirar; a troca de login não deve ser descrita como invalidação instantânea de todo JWT. Nenhuma senha, chave API, hash de senha ou dado de cliente consta neste relatório.

## Continuação: validação para uso

A rodada posterior reconciliou schema/histórico, ensaiou recuperação lógica, ampliou CI/build e alinhou a versão no cabeçalho. As tabelas de diferenças deste documento foram resolvidas para o schema de aplicação. Veja [o relatório final](readiness-2026-10-05.md); hardware físico continua fora do escopo por decisão do utilizador.
