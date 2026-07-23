# Plano de migração Supabase sem execução

Data: 15 de julho de 2026  
Estado: plano preparatório. Não autoriza migrations, alterações em políticas, funções, dados, utilizadores ou backups.

## Objetivo

Evoluir o modelo atual, baseado em `app_user_id` e acesso direto do browser, para uma solução multiempresa com autenticação verificável, tenant explícito, autorização no servidor, operações atómicas e recuperação comprovada, sem perda de encomendas, produtos, catálogo ou responsáveis.

## Pré-condições obrigatórias

1. Obter e versionar de forma segura o schema atual, migrations existentes (se houver), RPCs, grants e RLS — nunca chaves secretas.
2. Classificar o ambiente atual e bloquear qualquer ação em produção até existir aprovação formal, janela de manutenção e plano de rollback.
3. Criar ambiente separado de desenvolvimento e staging com dados sintéticos ou anonimizados.
4. Confirmar backup utilizável e realizar restauro de teste fora de produção; documentar RPO e RTO aceites.
5. Definir dono do banco, responsáveis por aprovação, política RGPD e período de retenção.
6. Inventariar contagens e integridade dos dados de origem com consultas somente de leitura.

## Fase 1 — descoberta e modelo alvo

Sem alterar produção:

- Confirmar tipos, PKs, FKs, índices, constraints, triggers, RLS, grants, funções e dependências.
- Definir o modelo `tenants`, `tenant_memberships`, papéis e matriz de autorização.
- Decidir se `catalog_products` é global, por tenant ou híbrido; decidir o mesmo para responsáveis.
- Definir como migrar os atuais `app_user_id` para `auth.users` e memberships.
- Definir campos de auditoria e exclusão: `created_by`, `updated_by`, `deleted_at`, quando aplicável.
- Medir dados órfãos, responsáveis inexistentes, produtos sem encomenda, duplicados e valores inválidos antes de desenhar a transformação.

Critério de saída: diagrama ER aprovado, matriz de papéis aprovada e inventário de dados sem lacunas críticas.

## Fase 2 — construir e testar fora de produção

Em desenvolvimento/staging, com migrations versionadas e reversíveis:

1. Criar estruturas de tenant e memberships.
2. Adicionar `tenant_id` inicialmente de forma compatível, com estratégia de preenchimento validada.
3. Implementar constraints/FKs necessárias sem assumir que os dados legados já são válidos.
4. Criar índices baseados em consultas reais, por exemplo `tenant_id` + campos de filtro/ordenação, após validar planos de execução.
5. Substituir a escrita multipartes por operação transacional (RPC cuidadosamente auditada ou serviço NestJS).
6. Implementar RLS por tenant e papel, com testes positivos e negativos de isolamento.
7. Migrar a autenticação para uma sessão verificável; não manter o `localStorage` como prova de identidade.
8. Criar endpoint/API contratual para o frontend e testes de integração com banco efémero ou projeto de testes.

Critério de saída: testes automatizados comprovam que um utilizador de tenant A não lê, cria, edita nem apaga dados de tenant B; fluxos críticos passam em staging.

## Fase 3 — ensaio de migração de dados

1. Restaurar cópia de backup para ambiente isolado.
2. Executar migrations e scripts idempotentes apenas nessa cópia.
3. Gerar tabela de reconciliação por entidade: origem, destino, contagem, órfãos, rejeitados e motivo.
4. Validar amostra funcional com responsáveis de negócio sem expor dados além do necessário.
5. Testar rollback pela restauração do backup e medir tempo real.
6. Corrigir o plano até não existirem perdas não aprovadas nem cruzamento de tenants.

Critério de saída: reconciliação aprovada, restauro testado e rollback dentro do RTO definido.

## Fase 4 — preparação de produção

Antes de executar qualquer mudança:

- aprovação explícita do proprietário do sistema;
- backup verificado imediatamente antes da janela;
- plano de comunicação, manutenção e rollback;
- monitorização, logs e alertas definidos;
- migração testada na mesma versão de schema e aplicação;
- congelamento de alterações concorrentes ou estratégia de dual-write claramente validada.

## Fase 5 — migração de produção (futura, sob aprovação)

Esta fase não é executada nesta etapa. Quando autorizada, deve seguir um runbook aprovado com checkpoints: criar backup, aplicar migrations de baixo risco, preencher dados, validar reconciliação, habilitar políticas/serviços gradualmente, monitorizar e reverter se um critério de segurança ou integridade falhar.

## Preservação e validação de dados

| Entidade atual       | Preservação necessária                                               | Validação pós-migração                          |
| -------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| `orders`             | Identificador, cliente, telefone, entrega, responsável e criação.    | Contagem por tenant, datas e amostra de campos. |
| `order_products`     | Todos os itens, posição, categoria, quantidade e notas.              | Contagem por encomenda e ausência de órfãos.    |
| `catalog_products`   | Nome, categoria, posição e estado ativo, conforme escopo decidido.   | Contagem e visibilidade no tenant correto.      |
| `order_responsibles` | Nome, estado e posição, conforme escopo decidido.                    | Referências de encomendas preservadas.          |
| utilizadores         | Associação a empresa e papel, sem migrar passwords de modo inseguro. | Login, membership e negação entre tenants.      |

## Critérios de não avanço

Não avançar para produção se qualquer um ocorrer:

- ausência de backup/restauro comprovado;
- RLS, grants ou RPCs desconhecidos;
- existência de dados órfãos sem decisão de tratamento;
- reconciliação com perda não aprovada;
- teste de acesso cruzado entre tenants bem-sucedido;
- ausência de aprovação de negócio, segurança e operação.

## Resultado desta etapa

Este plano é deliberadamente independente da implementação final (Supabase direto, API NestJS ou combinação). A escolha só deve ser consolidada depois da auditoria real de schema e segurança; nenhuma migration foi criada ou executada.
