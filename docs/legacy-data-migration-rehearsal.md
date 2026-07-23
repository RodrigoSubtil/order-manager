# Etapa 20 — Ensaio da migração dos dados antigos

Data: 20 de julho de 2026  
Estado: concluído com dados sintéticos. O proprietário declarou os dados legados fictícios e descartáveis; o export de linhas deixou de ser necessário.

## Resultado executivo

Foi criada uma migração de dados idempotente, com validação antes da escrita, transação única e relatório de reconciliação. O processo foi executado duas vezes numa base PostgreSQL local descartável com dados fictícios:

- primeira importação: `MIGRATED`;
- segunda importação: `MIGRATED`, reconhecida como repetição idempotente;
- contagens de encomendas, itens, responsáveis, catálogo, utilizadores e memberships iguais;
- zero itens órfãos;
- zero encomendas sem itens;
- zero registos associados a outro tenant;
- tenant sentinela permaneceu igual no fingerprint funcional;
- número seguinte de encomenda calculado como `43`;
- restauração do snapshot local validada;
- base e snapshot descartáveis eliminados ao terminar.

Este resultado prova o mecanismo, não os dados reais. Depois do primeiro ensaio, foi concedido acesso autorizado ao painel e o schema, RPCs, triggers, grants, RLS e contagens agregadas foram confirmados. A auditoria está em `docs/reports/stage20/production-metadata-audit.md`. Nenhuma linha com nomes foi exportada.

Depois da auditoria, o proprietário decidiu que os dados atuais são fictícios e não precisam ser preservados. A decisão está registrada em `docs/reports/stage20/legacy-data-disposition.md`. Portanto, não haverá export de linhas nem migração desse conteúdo.

## Limites e proteção

- A ligação autorizada ao Supabase executou apenas consultas `SELECT` de metadata e contagens agregadas no ambiente identificado como produção.
- Nenhuma migration foi executada em produção.
- `order_manager_dev` não foi alterada.
- O ensaio criou temporariamente apenas `order_manager_migration_test` e `order_manager_migration_backup` em `localhost`.
- A fixture é sintética e usa endereços `example.test`.
- O export real deve ficar fora do Git. O diretório `apps/api/prisma/legacy/private/` e o padrão `*.authorized-legacy-export.json` estão ignorados.
- Passwords e hashes de `app_users` não são exportados nem migrados.

## Evidência atualmente disponível

O estado confirmado substitui as inferências abaixo nos pontos em que houver diferença:

- `order_responsibles` possui `app_user_id` obrigatório;
- existem 2 utilizadores legados, 2 nomes distintos de padaria e 0 identidades Supabase Auth;
- existem 0 encomendas, 0 itens, 10 responsáveis e 30 produtos de catálogo;
- RLS está desligado em `orders`, `order_products` e `catalog_products`;
- o catálogo é global no legado;
- o frontend/RPC atual não estabelece uma sessão Supabase Auth.

O contrato legado foi inferido do frontend e da auditoria em `docs/database-current-state.md`:

| Origem inferida      | Campos consumidos                                                                      |
| -------------------- | -------------------------------------------------------------------------------------- |
| `app_users`          | `id`, `username`, `bakery_name`                                                        |
| `orders`             | `id`, `order_number`, `app_user_id`, cliente, telefone, responsável, entrega e criação |
| `order_products`     | `id`, `order_id`, categoria, produto, quantidade textual, notas e posição              |
| `order_responsibles` | `id`, `app_user_id`, nome, estado e posição                                            |
| `catalog_products`   | `id`, categoria, nome, estado e posição                                                |
| RPCs                 | `login_app_user` e `list_order_responsibles`                                           |

O inventário autorizado confirmou essas tabelas e revelou campos adicionais documentados no relatório de produção. Os scripts continuam bloqueando a migração se uma cópia futura divergir do inventário confirmado.

## Artefactos do processo

| Artefacto                                         | Função                                                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/legacy/export-schema-inventory.sql`       | Exporta, somente para leitura, colunas, tipos, PKs, FKs, índices, constraints, RLS, RPCs, triggers e policies.                   |
| `prisma/legacy/export-data.sql`                   | Exporta apenas os campos de dados necessários; exclui passwords e hashes.                                                        |
| `prisma/legacy/types.ts`                          | Define o contrato explícito do export e do relatório.                                                                            |
| `prisma/legacy/analyze.ts`                        | Valida metadata, mapeamentos, IDs, referências, números, datas, posições, categorias e quantidades antes de abrir uma transação. |
| `prisma/legacy/migrate.ts`                        | Executa upserts idempotentes e uma transação única, calcula a sequência e reconcilia o resultado.                                |
| `prisma/legacy/cli.ts`                            | Fornece dry-run e aplicação local controlada.                                                                                    |
| `prisma/legacy/rehearse.ts`                       | Cria a base isolada, aplica migrations, injeta anomalias, migra, repete, restaura e limpa.                                       |
| `prisma/legacy/fixtures/legacy-export.valid.json` | Cópia sintética usada no ensaio, nunca apresentada como export real.                                                             |
| `docs/reports/stage20/`                           | Evidências JSON reproduzíveis do ensaio sintético.                                                                               |

## Contrato e mapeamento

O JSON de entrada possui quatro blocos:

1. `export`: referência da autorização, instante, origem, projeto e indicação de sanitização.
2. `schema`: inventário completo das tabelas, RPCs, triggers e policies.
3. `migration`: lote, tenant aprovado, unidade padrão do catálogo e mapeamento de utilizadores.
4. `data`: registos legados necessários.

### Utilizadores, tenant e memberships

- Cada `app_users.id` deve possuir exatamente um `userMappings.appUserId`.
- `userId` é o UUID de uma identidade Supabase Auth controlada; passwords antigas não são copiadas.
- Exatamente uma membership deve ser `OWNER` no primeiro lote.
- Os outros utilizadores recebem `ADMIN` ou `OPERATOR` somente após decisão aprovada.
- `orders.created_by` e `orders.updated_by` usam o utilizador mapeado de `app_user_id`.
- O tenant é informado pela configuração aprovada do lote. Ele nunca é inferido do browser ou enviado como decisão do frontend.

### Entidades

| Origem               | Destino            | Regra                                                                                                                    |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `order_responsibles` | `responsibles`     | Preserva UUID quando válido, estado e posição; associa ao tenant do lote.                                                |
| `catalog_products`   | `catalog_products` | Preserva UUID quando válido, categoria, estado e posição; unidade padrão vem de `migration.defaults.catalogProductUnit`. |
| `orders`             | `orders`           | Preserva UUID, número, cliente, telefone, responsável, entrega e criação; inicializa versionamento do schema alvo.       |
| `order_products`     | `order_items`      | Preserva UUID quando válido, ordem, categoria, produto, notas e posição; converte quantidade e unidade.                  |

IDs legados que não são UUID recebem UUID v5 determinístico e entram em `idMappings`. Não há deduplicação silenciosa. Nomes repetidos são preservados e geram aviso para decisão de negócio.

## Conversão de quantidades

São aceites valores positivos com até três casas decimais:

- sem unidade, `un`, `uni`, `unidade`, `unidades` → `UN`;
- `kg`, `quilo`, `quilos` → `KG`;
- `g`, `grama`, `gramas` → `G`;
- vírgula ou ponto como separador decimal.

Valor vazio, zero, negativo, unidade desconhecida, texto não numérico ou precisão maior que três casas gera `QUANTITY_UNCONVERTIBLE`. O valor original aparece no relatório e nenhuma linha é escrita.

## Condições que bloqueiam antes da escrita

- export sem referência de autorização ou timestamp;
- tabela, coluna, RPC ou metadata de segurança ausente;
- utilizador legado sem mapeamento ou mapeamento duplicado;
- nomes de padaria diferentes no mesmo lote/tenant;
- utilizador legado sem nome de padaria;
- OWNER ausente ou múltiplo;
- UUID de Auth ou tenant inválido;
- ID duplicado ou vazio;
- número de encomenda nulo, inválido ou duplicado;
- responsável ou item órfão;
- encomenda sem item;
- data, hora, posição, categoria ou quantidade inválida;
- ID, slug, número de encomenda ou utilizador conflitante no destino.

Um lote com qualquer item `BLOCKING` retorna `BLOCKED` sem abrir a transação de escrita.

## Idempotência, atomicidade e reconciliação

Toda a importação é executada numa transação Prisma. Se qualquer escrita falhar, tenant, memberships, catálogo, responsáveis, encomendas, itens, sequência e auditoria são revertidos juntos.

Os UUIDs preservados ou determinísticos e o `batchId` geram chaves estáveis. Reexecutar o mesmo lote atualiza os mesmos registos, não cria duplicados. Uma auditoria `LEGACY_DATA_MIGRATED` determinística marca a repetição.

O relatório compara:

- contagem origem/destino por entidade;
- órfãos na origem e no destino;
- encomendas sem itens;
- IDs que foram preservados ou remapeados;
- duplicados encontrados;
- qualquer registo migrado que tenha outro `tenant_id`;
- `next_order_number = max(order_number) + 1`.

A situação só recebe `MIGRATED` quando todos os checks forem verdadeiros.

## Resultado medido do ensaio sintético

| Medida                        | Resultado                                              |
| ----------------------------- | ------------------------------------------------------ |
| Tempo total                   | 7 915 ms                                               |
| Primeira importação           | 646 ms                                                 |
| Repetição idempotente         | 350 ms                                                 |
| Restauração local             | 286 ms                                                 |
| Utilizadores / memberships    | 2 / 2                                                  |
| Encomendas / itens            | 2 / 4                                                  |
| Responsáveis / catálogo       | 2 / 3                                                  |
| Órfãos / encomendas sem itens | 0 / 0                                                  |
| Linhas noutro tenant          | 0                                                      |
| Segundo tenant sentinela      | Sem alteração                                          |
| IDs remapeados                | 1 ID textual sintético, com correspondência registrada |

Uma fixture deliberadamente inválida foi recusada por cinco motivos: número duplicado, quantidade não convertível, responsável órfão, item órfão e encomenda sem itens.

## Validação executada

| Comando                                   | Resultado                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run migration:legacy:rehearse`       | Passou; migrations, dois tenants, importação, repetição, reconciliação, restauração e limpeza.     |
| `npm run legacy:migrate ...` sem `apply`  | Passou com `DRY_RUN_READY`.                                                                        |
| `npm run test`                            | Passou: 35 testes web e 49 testes API.                                                             |
| `npm run test:db`                         | Passou: 23 testes PostgreSQL/RLS.                                                                  |
| `npm run lint`                            | Passou para React, CSS e API.                                                                      |
| `npm run typecheck`                       | Passou para cliente gerado, web e API.                                                             |
| `npm run build`                           | Passou para web e API.                                                                             |
| Prettier apenas nos ficheiros da Etapa 20 | Passou.                                                                                            |
| `npm run format:check` global             | Falhou nos mesmos 37 ficheiros preexistentes/gerados; nenhum ficheiro da Etapa 20 consta na falha. |

O build mantém avisos já existentes do Vite sobre diretivas `use client` ignoradas em dependências e bundle principal com aproximadamente 621 kB, acima do limiar de 500 kB. Não foram alterados nesta etapa porque não pertencem à migração de dados.

## Procedimento arquivado para um eventual export

Este procedimento não será executado porque os dados legados foram declarados
fictícios e descartáveis. Ele permanece documentado apenas como contingência caso
essa decisão seja formalmente revertida. Nesse caso, será necessária nova
autorização antes de contactar o Supabase:

1. Registar quem autorizou, âmbito, ambiente, data, retenção e local cifrado do ficheiro.
2. Executar `export-schema-inventory.sql` com uma identidade somente de leitura.
3. Revisar o resultado. Se os nomes diferirem, corrigir o contrato e os scripts antes de exportar dados.
4. Executar `export-data.sql`; proteger o resultado como PII e nunca o colar em issues, logs ou Git.
5. Criar as identidades no Supabase Auth por convite/reset seguro e preencher `userMappings`. Não migrar hashes antigos.
6. Preencher tenant, papéis e unidade padrão aprovados.
7. Executar primeiro sem `--apply`:

```powershell
npm run legacy:migrate --workspace @order-manager/api -- `
  C:\caminho-seguro\lote.authorized-legacy-export.json `
  C:\caminho-seguro\dry-run-report.json
```

8. Resolver todas as ocorrências `BLOCKING` com decisão registrada.
9. Restaurar uma cópia isolada do destino, confirmar que `DATABASE_URL` aponta para localhost e acrescentar o argumento `apply` ao comando.
10. Repetir o lote, comparar os relatórios, obter aceite do negócio e testar restauração do backup.

O CLI recusa aplicação fora de `localhost` e fora dos nomes de base permitidos. Isso impede que este script seja usado diretamente contra produção.

## Rollback

O rollback da migração de dados é a restauração do snapshot criado antes do lote, não uma sequência manual de `DELETE`. O ensaio local criou uma cópia vazia já migrada, importou os dados e depois recriou a base de teste a partir dessa cópia. Após restauração havia 3 migrations aplicadas e 0 tenants.

Essa prova local não valida o mecanismo do fornecedor. Antes de qualquer migração real, é obrigatório testar um backup/PITR do Supabase numa instância isolada, medir RPO/RTO e obter aprovação operacional.

## Riscos pendentes

| Risco                                    | Estado / mitigação                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| Schema legado inseguro ou incompatível   | Não será promovido ao alvo; o corte futuro usará o schema Prisma aprovado. |
| Frontend antigo ainda usa tabelas e RPCs | Manter temporariamente até o frontend e a API nova estarem prontos.        |
| Reset prematuro do projeto Supabase      | Proibido nesta etapa, pois quebraria a aplicação legada em funcionamento.  |
| Backup/PITR Supabase não ensaiado        | Bloqueador antes do corte e da recriação controlada do ambiente.           |
| Dados fictícios ainda presentes          | Descartar somente na etapa de cutover, com confirmação do ambiente-alvo.   |

## Critério de conclusão

O mecanismo técnico está pronto e reproduzível com fixtures sintéticas. Como o proprietário aprovou o descarte dos dados legados fictícios, não existe perda não aprovada a reconciliar. A Etapa 20 está concluída sem alterar o schema ou os dados do Supabase de produção.
