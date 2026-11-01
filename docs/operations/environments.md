# Ambientes e publicação segura

Configuração verificada em **05/10/2026**. As contagens abaixo são um retrato da conclusão da preparação, não valores permanentes. Consulte a [auditoria inicial](homologacao-audit-2026-10-05.md) e a [validação final](readiness-2026-10-05.md).

## Estado do ciclo em 01/11/2026

O utilizador testou a versão **1.1.0** em homologação e aprovou a promoção para `main` e produção em 01/11/2026, incluindo IA e novo design. A promoção mantém **1.1.0** e exige um novo build Production com as variáveis de produção. O banco recebeu a migration de limites e a função de IA separadamente; a publicação do frontend não as instala. Consulte [release](release.md) para a preparação e a evidência da publicação. Não aumentar a versão sem instrução explícita do utilizador.

## Endereços e identidade dos ambientes

| Configuração                   | Produção                                                                | Homologação                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Aplicação                      | [order-manager-rs.vercel.app](https://order-manager-rs.vercel.app/)     | [homologacao-order-manager-rs.vercel.app](https://homologacao-order-manager-rs.vercel.app/) |
| Branch GitHub                  | `main`                                                                  | `homologacao`                                                                               |
| Ambiente Vercel                | Production                                                              | Preview restrito à branch `homologacao`                                                     |
| Projeto Supabase               | `order-manager`                                                         | `order-manager-homologacao`                                                                 |
| Project ref                    | `otwriruoqqwjwzzgicru`                                                  | `czbrnxrpofdbbgbdyrad`                                                                      |
| Console Supabase               | [Produção](https://supabase.com/dashboard/project/otwriruoqqwjwzzgicru) | [Homologação](https://supabase.com/dashboard/project/czbrnxrpofdbbgbdyrad)                  |
| Organização e plano observados | RodrigoSubtil / Pro                                                     | Order Manager Homologacao / Free                                                            |
| Utilizador da aplicação        | `pastelaria_venus`                                                      | `pastelaria_teste`                                                                          |
| Região                         | `eu-north-1`                                                            | `eu-north-1`                                                                                |

O mesmo [projeto Vercel](https://vercel.com/rodrigo-freitas-subtils-projects/order-manager) publica os dois frontends. Os bancos, utilizadores Auth e chaves pertencem a projetos Supabase distintos. O identificador de tenant coincide nos dois bancos; isso não significa que partilhem dados. A separação efetiva vem do project ref, da URL e da chave correspondente.

As senhas ficam fora do repositório. O login de homologação foi alterado mantendo o ID da conta, a membership `OWNER` e a senha gerencial já configurada. A senha de **Gerenciar** é independente da senha do login. Contas de GitHub, Vercel e Supabase continuam a usar os acessos administrativos próprios do responsável pelo projeto.

O frontend converte `_` em `-` na identidade técnica do Auth: `pastelaria_teste` corresponde a `pastelaria-teste@users.order-manager.invalid`. Esse endereço não recebe mensagens e não é um contacto de cliente. Futuras alterações de login devem manter Auth, identidade de email, metadata e perfil público consistentes, preferindo a API administrativa oficial.

## Variáveis e domínios

Em [Environment Variables](https://vercel.com/rodrigo-freitas-subtils-projects/order-manager/settings/environment-variables), cada ambiente tem seu par de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`:

- Production aponta para `https://otwriruoqqwjwzzgicru.supabase.co` com a chave pública do projeto de produção.
- Preview, com filtro de branch `homologacao`, aponta para `https://czbrnxrpofdbbgbdyrad.supabase.co` com a chave publishable de homologação.
- A digitalização usa `VITE_ORDER_SCAN_ENABLED=true` no build de cada ambiente habilitado. A chave OpenAI, a ativação do backend e as origens permitidas ficam somente nos secrets do projeto Supabase correspondente; consulte [digitalização](order-scan.md).

As três variáveis de Production são campos diferentes, URL e chave; não são dois ambientes de produção. Não remova uma delas para tentar reduzir a lista a um único campo. Nunca coloque `service_role`, uma chave secreta ou a senha do banco em `VITE_*`.

Em [Domains](https://vercel.com/rodrigo-freitas-subtils-projects/order-manager/settings/domains), ficaram apenas os dois endereços da tabela, ambos com configuração válida. Foram desvinculados `order-manager-beryl-six.vercel.app`, o domínio com configuração inválida `order-manager.app` e o alias longo antigo de homologação. Não foi cancelado o registo de um domínio nem apagado um deployment. O alias antigo de homologação devolveu `404 DEPLOYMENT_NOT_FOUND` após a remoção.

O Vercel também cria URLs automáticas de deployment/branch. Um novo deployment pode gerar novamente um alias longo; use o endereço curto como referência e confira aliases após novas publicações. Consulte a [documentação de URLs geradas](https://vercel.com/docs/deployments/generated-urls).

O **Site URL** do Supabase Auth foi definido como o endereço da aplicação correspondente nos dois projetos. A configuração antiga de produção, `http://localhost:3000`, foi corrigida. Não foram adicionados redirects genéricos ou wildcards. O login atual usa senha; recuperação por email, magic link e OAuth precisam de desenho próprio, pois as identidades técnicas não recebem email.

## Estado inicial autorizado

| Dado                                      |        Produção |                Homologação |
| ----------------------------------------- | --------------: | -------------------------: |
| Encomendas, incluindo concluídas/apagadas |               0 |                          0 |
| Itens de encomenda                        |               0 |                          0 |
| Recibos de idempotência de gravação       |               0 |                          0 |
| Próximo número de encomenda               |               1 |                          1 |
| Clientes                                  |    1 preservado |                          0 |
| Produtos de catálogo                      | 216 preservados |                 215 ativos |
| Responsáveis                              |   9 preservados | 2: Rodrigo e Maria Eduarda |

A reinicialização foi uma operação pontual autorizada. Não faz parte do deployment, de uma migration ou de um job automático. Novos deployments devem preservar encomendas e numeração. Os nove responsáveis sintéticos de homologação foram removidos; o catálogo e os acessos foram preservados.

## Caminho de homologação para produção

1. Desenvolva uma alteração isolada e abra PR para `homologacao`, mantendo-a compatível com `main`.
2. Passe pelos checks, revise o diff e publique o Preview da branch com as variáveis de homologação.
3. Se houver SQL novo, valide primeiro no banco de homologação e registe o que realmente foi aplicado. O Vercel não migra bancos.
4. Valide login, leitura, gravação, edição, conclusão, exclusão, gestão e impressão no endereço de homologação, com dados fictícios.
5. Abra PR de `homologacao` para `main`. Confira o commit validado, os checks do PR e eventuais migrations pendentes em produção.
6. Para alterações de banco, faça backup recuperável e aplique somente o SQL pendente revisado, no projeto correto, respeitando a compatibilidade entre frontend e banco.
7. Depois da revisão/aprovação da release, faça merge em `main`. O Vercel deve produzir **um build Production** com as variáveis de produção.
8. Confirme deployment Ready, commit, domínio, projeto Supabase utilizado e smoke test de produção. Registe o resultado em [release](release.md).

Não promova diretamente um bundle Preview compilado com as variáveis do banco de homologação para o domínio de produção. Essas variáveis entram no bundle durante o build. Não copie dados, senhas ou chaves de homologação para produção.

O Quality roda em PRs e pushes para main e homologacao. Contém os jobs quality (formatação, lint, tipos, 151 testes/cobertura e build) e database (PostgreSQL descartável, migrations, isolamento, gravação e concorrência). O Vercel também executa npm run verify:release antes de gerar o bundle: erro nesses checks impede um novo deployment Ready.

O GitHub confirmou que proteção obrigatória não é aplicada ao repositório privado no plano atual. Nenhuma assinatura foi alterada. A revisão e o merge continuam manuais; o build Vercel não substitui proteção de branch e não executa o job database. Confira ambos os jobs antes de mergear.

## Limites antes de uma mudança de banco

O schema de aplicação foi reconciliado: 13 tabelas e 37 funções com colunas, constraints, índices, políticas e privilégios iguais. Os históricos ativos têm as mesmas três versões dos arquivos da CLI. Configurações Auth, API keys, dados e versão PostgreSQL continuam próprias de cada projeto. Uma migration futura ainda precisa de ensaio e revisão.

Os registros antigos de homologação foram guardados em backup privado antes da consolidação. Os 20 SQLs históricos foram movidos sem mudança para legacy_migrations, fora do caminho do db push. A base ativa não contém dados específicos de uma pastelaria.

A migration histórica `008` contém um job que apaga encomendas concluídas após sete dias. Em homologação foram aplicadas apenas suas colunas/índice necessários, sem criar o job; a `014` remove esse mecanismo no fluxo atual. A revisão automática recusou a execução integral da `008` pelo agendamento destrutivo persistente; a alternativa sem agendamento foi aplicada. Não altere a migration histórica para esconder essa decisão e não a execute isoladamente num banco em uso.

O comportamento atual de **Concluir** e **Apagar** remove imediatamente a encomenda e seus itens. Preservar histórico comercial requer uma mudança específica de produto e banco. A recuperação lógica da aplicação foi testada em bases locais e os dados comparados linha a linha. Restauração física gerenciada não foi executada. Impressora e telemóvel físicos foram excluídos desta rodada a pedido do utilizador; não estão certificados, conforme [release](release.md) e [backup](backup.md).
