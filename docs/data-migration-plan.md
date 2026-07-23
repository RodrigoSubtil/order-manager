# Plano de migração dos dados atuais para multi-tenancy

> Atualização da Etapa 20 (20 de julho de 2026): o migrador idempotente e o
> ensaio sintético local estão documentados em
> `docs/legacy-data-migration-rehearsal.md`. O ensaio com dados antigos reais
> continua bloqueado porque não foi disponibilizado um export autorizado.

Data: 15 de julho de 2026  
Estado: plano sem execução. Não cria tenant, não altera dados, não executa migrations e não contacta produção.

## Objetivo e premissas

Migrar o modelo atual (`app_user_id`, `orders`, `order_products`, `catalog_products`, `order_responsibles`) para o desenho com `tenant_id`, preservando encomendas, itens, responsáveis e catálogo. Como o schema e os dados reais não foram disponibilizados, todo mapeamento abaixo deve ser validado em cópia restaurada antes de produção.

O primeiro tenant será criado somente na migração aprovada, representando a empresa/padaria atualmente em operação. O seu nome, slug e OWNER inicial devem ser confirmados pelo responsável do negócio; não serão inferidos automaticamente de texto ou dados de login.

## Mapeamento proposto

| Origem atual observada                    | Destino                                     | Regra de migração                                                                                                                                                                     |
| ----------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| utilizador retornado por `login_app_user` | `auth.users`, `users`, `tenant_memberships` | Mapear após confirmar origem e modelo de password; não copiar hashes sem revisão de segurança.                                                                                        |
| `orders.app_user_id`                      | `orders.tenant_id` e auditoria              | No primeiro tenant, todas as encomendas validadas recebem o ID do tenant inicial; `app_user_id` é preservado temporariamente em tabela de reconciliação, não como autorização futura. |
| `orders.order_number`                     | `orders.order_number`                       | Preservar quando único no tenant; resolver nulos/duplicados com regra aprovada e relatório.                                                                                           |
| `orders.responsible_id`                   | `orders.responsible_id`                     | Migrar somente se o responsável existir no tenant inicial; órfãos entram em relatório de exceções.                                                                                    |
| `order_products`                          | `order_items`                               | Preservar posição, categoria, produto, quantidade e notas; converter quantidade textual apenas com regra validada.                                                                    |
| `catalog_products`                        | `catalog_products.tenant_id`                | Associar ao tenant inicial, após confirmar se o catálogo é realmente exclusivo da empresa.                                                                                            |
| `order_responsibles`                      | `responsibles.tenant_id`                    | Associar ao tenant inicial e deduplicar apenas com aprovação explícita.                                                                                                               |

## Estratégia em fases

### 1. Preparação e descoberta somente de leitura

- Exportar schema, RLS, funções e grants por canal autorizado.
- Obter contagens agregadas por tabela e identificar nulos, duplicados, responsáveis órfãos, produtos sem encomenda e números de encomenda repetidos.
- Confirmar ambiente de produção, responsável pelo banco, retenção e classificação de PII.
- Confirmar backup utilizável e restaurar uma cópia isolada para ensaio.

Nenhuma correção manual em produção é permitida nesta fase.

### 2. Definir o tenant inicial e identidade

- Registar em runbook o `name`, `slug`, timezone, locale e OWNER inicial aprovados.
- Criar/confirmar a identidade no mecanismo de Auth escolhido sem expor ou exportar palavras-passe.
- Criar o perfil `users` e a membership OWNER ativa no tenant inicial.
- Definir o mapeamento de cada `app_user_id` legado para `users.id`; casos sem correspondência vão para fila de exceções, nunca para uma conta genérica silenciosa.

### 3. Ensaio em base restaurada

1. Aplicar migrations versionadas apenas no ambiente isolado.
2. Criar o tenant inicial e settings mínimos.
3. Migrar responsáveis e catálogo para esse tenant.
4. Migrar encomendas, atribuindo `tenant_id`, preservando UUIDs quando tecnicamente seguro e mapeando criadores quando possível.
5. Migrar itens por FK composta para a encomenda do mesmo tenant.
6. Inicializar `tenants.next_order_number` como `max(order_number válido) + 1`, ou `1` se não houver encomendas.
7. Criar memberships dos utilizadores mapeados com papel mínimo; promover apenas OWNER aprovado.
8. Criar entradas de auditoria de migração com `request_id`/lote, sem copiar PII desnecessária.

### 4. Reconciliação e aceitação

Comparar origem e destino por tenant:

| Verificação  | Critério                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------- |
| Encomendas   | Contagem igual, exceto linhas explicitamente rejeitadas e aprovadas.                     |
| Itens        | Contagem e associação por encomenda preservadas; nenhum órfão.                           |
| Responsáveis | Todas as referências válidas resolvem no mesmo tenant.                                   |
| Catálogo     | Quantidade, status ativo e ordenação preservados conforme decisão de negócio.            |
| Números      | `unique (tenant_id, order_number)` válido; exceções documentadas.                        |
| Soft delete  | Não introduzir apagamentos silenciosos; dados excluídos legados devem ser identificados. |
| Acesso       | Testes A/B comprovam isolamento entre dois tenants sintéticos.                           |

Gerar relatório de reconciliação com: tabela, contagem origem, contagem destino, chaves não migradas, motivo, responsável pela decisão e aprovação. Não avançar com discrepância sem aceite escrito.

### 5. Corte futuro de produção, sob nova autorização

O runbook de corte deverá prever janela de manutenção, backup imediatamente anterior, congelamento de escrita ou estratégia de sincronização validada, execução na ordem ensaiada, smoke tests, observação e critérios objetivos de rollback. Esta etapa não autoriza nem executa esse corte.

## Dados problemáticos e decisões necessárias

| Situação                            | Tratamento proposto                                                                           | Decisão exigida                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `order_number` nulo/duplicado       | Preservar identificador técnico; atribuir novo número apenas com tabela de correspondência.   | Regra de negócio e comunicação aos utilizadores. |
| `responsible_id` sem responsável    | Manter encomenda e marcar referência nula/“legado”, com relatório.                            | Aprovação do negócio.                            |
| Quantidade textual inválida         | Preservar texto em campo de legado durante ensaio; não converter silenciosamente para número. | Regra de normalização por categoria/unidade.     |
| Utilizador legado sem Auth          | Criar processo de convite/reset seguro; não recriar password.                                 | Estratégia de ativação.                          |
| Duplicados de catálogo/responsáveis | Não deduplicar automaticamente.                                                               | Critério e aprovação.                            |
| Dados sem data de criação           | Usar timestamp de migração apenas com marcador de origem desconhecida.                        | Aceite de auditoria.                             |

## Rollback e retenção

O rollback primário é restaurar o backup validado anterior ao corte; não se deve depender de “desfazer” manualmente uma migração de dados. O ensaio mede o tempo de restauro e reconciliação para confirmar RTO. As cópias usadas em testes devem ser anonimizadas quando possível e eliminadas segundo política de retenção.

## Critérios de bloqueio

Não executar produção sem schema/RLS confirmados, backup restaurado em teste, reconciliação aprovada, estratégia de login aprovada, testes de isolamento aprovados e autorização explícita do proprietário do sistema.
