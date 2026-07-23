# Regras de multi-tenancy e autorização

Data: 15 de julho de 2026  
Estado: política de arquitetura alvo. Não altera as permissões atuais do Supabase.

## Regra obrigatória

> **O frontend nunca escolhe, envia, grava ou filtra por `tenant_id`. O backend obtém o tenant a partir da sessão autenticada e da membership ativa, e aplica-o a toda operação de negócio.**

`tenant_id` não pode ser um campo editável de DTO, formulário, query string, storage local ou payload de criação/edição. Um ID recebido pelo cliente para exibição não concede acesso.

## Resolução de contexto

1. O utilizador autentica-se por Supabase Auth ou mecanismo equivalente verificável.
2. O NestJS valida assinatura, expiração e sujeito da sessão.
3. O NestJS procura uma `tenant_membership` ativa para esse sujeito.
4. O tenant ativo vem da sessão assinada pelo servidor ou do tenant padrão da membership. Se for necessário trocar de empresa, o backend valida a membership e atualiza o contexto de sessão; as APIs de recursos continuam sem aceitar `tenant_id`.
5. O serviço executa a operação já escopada ao tenant e confirma o papel exigido.

Não é permitido confiar em `app_user_id`, `tenant_id`, role ou nome de empresa vindos do navegador para autorização.

## Papéis

| Ação                                                  | OWNER | ADMIN                                  | OPERATOR                        |
| ----------------------------------------------------- | ----- | -------------------------------------- | ------------------------------- |
| Ver encomendas, catálogo e responsáveis               | Sim   | Sim                                    | Sim                             |
| Criar e editar encomendas                             | Sim   | Sim                                    | Sim                             |
| Apagar/restaurar encomendas                           | Sim   | Sim                                    | Não por padrão                  |
| Imprimir/exportar dados do tenant                     | Sim   | Sim                                    | Sim, conforme política de dados |
| Gerir catálogo e responsáveis                         | Sim   | Sim                                    | Não por padrão                  |
| Gerir configurações do tenant                         | Sim   | Sim, exceto transferência/encerramento | Não                             |
| Convidar, ativar ou suspender operadores              | Sim   | Sim                                    | Não                             |
| Promover/rebaixar ADMIN                               | Sim   | Não por padrão                         | Não                             |
| Transferir ownership, arquivar tenant, gerir retenção | Sim   | Não                                    | Não                             |
| Ver auditoria                                         | Sim   | Sim, com dados redigidos               | Não por padrão                  |

Regras adicionais: deve existir ao menos um `OWNER` ativo por tenant; a última membership OWNER não pode ser revogada nem rebaixada; `ADMIN` não pode criar ou alterar OWNER; `OPERATOR` não administra memberships.

## Política de isolamento

- Cada registro de negócio possui `tenant_id` obrigatório.
- Toda consulta do backend inicia a partir do tenant resolvido, inclusive `GET` por ID, atualização, soft delete, restauração, impressão, exportação e auditoria.
- FKs compostas com `tenant_id` impedem associações transversais, como item de tenant A em encomenda de tenant B.
- Identificadores UUID não substituem autorização: conhecer um `id` de outro tenant nunca pode devolver ou modificar o recurso.
- Cache, filas, armazenamento de arquivos, métricas e logs devem incluir tenant no escopo técnico, mas não devem expor PII desnecessária.
- Operações administrativas globais são separadas do caminho normal de aplicação, restritas e auditadas.

## Estratégia RLS (defesa adicional)

RLS deve estar ativado em `tenants`, `tenant_memberships`, `orders`, `order_items`, `catalog_products`, `responsibles`, `tenant_settings` e `audit_logs` após a migração validada.

Princípios das políticas:

1. Acesso normal só é permitido para uma membership `ACTIVE` do `auth.uid()` no tenant da linha.
2. `SELECT` limita cada tabela ao tenant ativo/verificado; acesso a `orders` não revela itens de outro tenant.
3. `INSERT` exige que o `tenant_id` da linha seja igual ao tenant validado no contexto de servidor e que o papel tenha permissão.
4. `UPDATE` usa `USING` e `WITH CHECK`, impede troca de `tenant_id`, respeita soft delete e exige versão corrente.
5. `DELETE` físico é negado ao papel de aplicação; soft delete ocorre por operação autorizada e auditada.
6. `audit_logs` permitem inserção somente pelo serviço autorizado e leitura limitada a OWNER/ADMIN do mesmo tenant; atualização/remoção são negadas.
7. Funções `SECURITY DEFINER`, se inevitáveis, usam `search_path` fixo, validação explícita de identidade/tenant, grants mínimos e testes de bypass.

Arquitetura preferida: a API valida a sessão e encaminha a identidade verificada ao Supabase para que RLS seja efetivamente aplicada. Uma service-role key, se existir para manutenção, fica exclusivamente no servidor, não é usada em pedidos normais e tem acesso operacional auditado. Service role nunca vai para `.env` de frontend, bundle ou repositório.

## Regras de dados e concorrência

- O backend define `tenant_id`, `created_by`, `updated_by`, `deleted_by`, horários de auditoria e `order_number`.
- A API ignora ou rejeita campos de ownership recebidos do frontend.
- A alteração exige `version`; conflito não sobrescreve silenciosamente dados mais recentes.
- Criação/edição de encomenda e itens ocorre numa única transação.
- Exclusão é lógica; purge físico obedece retenção, backup e autorização de OWNER.
- Erros devolvidos ao cliente não revelam a existência de recurso em outro tenant; a resposta deve ser indistinguível de “não encontrado” quando apropriado.

## Testes de segurança obrigatórios antes da produção

Para cada recurso e método HTTP, testar no mínimo:

1. utilizador do tenant A não lista nem obtém objeto do tenant B;
2. UUID conhecido de B não permite leitura, edição, soft delete, restauração, impressão ou exportação por A;
3. payload com `tenant_id` forjado é rejeitado/ignorado sem efeito;
4. FKs compostas bloqueiam referências cruzadas;
5. OPERATOR recebe negação nas ações administrativas;
6. ADMIN não altera o último OWNER;
7. atualização com `version` desatualizada devolve conflito sem alterar itens;
8. auditoria é criada e não pode ser editada pela aplicação;
9. RLS continua a negar acesso se uma rota do backend tiver filtro de tenant ausente.

## Observabilidade e suporte

Cada requisição deve ter `request_id`; logs estruturados incluem tenant resolvido, actor, papel, rota, resultado e duração. Nomes, telefones, passwords, tokens e conteúdo integral de notas não entram em logs técnicos. Acesso de suporte a um tenant requer autorização explícita, prazo limitado e audit log.
