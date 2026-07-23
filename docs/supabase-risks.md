# Riscos Supabase e de isolamento entre empresas

> Atualização confirmada em 20 de julho de 2026: `orders`, `order_products` e
> `catalog_products` possuem RLS desabilitado e grants amplos para `anon` e
> `authenticated`. As policies de `orders`/`order_products` não são aplicadas
> com RLS desligado. A RPC `list_order_responsibles`, disponível a `PUBLIC` e
> `anon`, possui fallback que pode devolver responsáveis de outros
> utilizadores. Consulte
> `docs/reports/stage20/production-metadata-audit.md`. Nenhuma correção foi
> aplicada em produção nesta auditoria.

Data da auditoria: 15 de julho de 2026  
Escopo: riscos identificados no cliente local. O schema, RLS, RPCs, permissões, dados e backups não foram acessíveis nesta etapa, portanto este documento distingue evidência de hipótese a validar.

## Riscos prioritários

| Prioridade | Risco                                | Evidência                                                                            | Impacto possível                                                                                            | Ação necessária antes de produção multiempresa                                                     |
| ---------- | ------------------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Crítica    | Autorização baseada no browser       | O `app_user_id` vem do `localStorage` e é enviado pelo cliente nas consultas.        | Leitura, alteração ou exclusão entre empresas se RLS/RPCs não impuserem identidade e tenant no servidor.    | Auditar RLS, remover confiança no ID enviado pelo cliente e validar a identidade no backend/banco. |
| Crítica    | Sessão local falsificável            | A aplicação considera autenticado qualquer JSON local com `id` e `username`.         | Um utilizador pode simular outro ID no navegador; se RLS for frágil, acessa dados alheios.                  | Migrar para sessão verificável (Supabase Auth ou API NestJS com tokens) e autorização no servidor. |
| Crítica    | RPC de login não auditada            | `login_app_user` recebe palavra-passe no browser; SQL e grants são desconhecidos.    | Armazenamento inseguro de passwords, enumeração de utilizadores, bypass de login ou privilégios excessivos. | Revisar SQL, hash de password, `SECURITY DEFINER`, `search_path`, grants, rate limit e logs.       |
| Crítica    | Ausência de tenant explícito         | Não há `tenant_id`, membership ou papéis observáveis no contrato atual.              | Não suporta de modo seguro uma empresa com vários utilizadores e pode misturar catálogos/responsáveis.      | Projetar `tenants`, `tenant_memberships` e políticas baseadas em tenant antes da expansão.         |
| Alta       | Fallback de responsáveis sem escopo  | Falha da RPC leva a `select` de todos os responsáveis ativos, sem filtro de empresa. | Possível exposição de responsáveis de outra empresa caso RLS não esteja correta.                            | Eliminar fallback ou exigir filtro/tenant aplicado no servidor e testado.                          |
| Alta       | Catálogo sem escopo explícito        | `catalog_products` é lido sem `app_user_id` ou tenant.                               | Catálogo pode vazar ou ser involuntariamente partilhado.                                                    | Definir catálogo global controlado ou `tenant_id`; aplicar a decisão no schema e RLS.              |
| Alta       | Escritas não transacionais           | Criar insere `orders` e depois itens; editar atualiza, apaga itens e reinsere.       | Encomendas incompletas ou perda de itens após erro intermediário.                                           | Substituir por transação/RPC ou endpoint de serviço atómico com validação.                         |
| Alta       | Exclusão permanente e sem auditoria  | O cliente executa `delete` individual e por período.                                 | Perda de dados, dificuldade de recuperação e baixa rastreabilidade.                                         | Definir retenção, soft delete/audit log e processo de restauro.                                    |
| Alta       | Estado real de backups desconhecido  | Não há evidência de backup, PITR ou restauro.                                        | Perda definitiva em incidente humano ou técnico.                                                            | Confirmar plano, região, retenção, RPO/RTO e testar restauro em ambiente isolado.                  |
| Média      | Dados pessoais no frontend           | Nome e telefone são lidos e exibidos no browser.                                     | Exposição indevida, risco RGPD e vazamento via logs/prints.                                                 | Minimização, controlo de acesso, retenção e política de privacidade.                               |
| Média      | Sem ambientes separados documentados | Não há dev/staging/produção configurados.                                            | Testes podem atingir dados reais e deployments ficam arriscados.                                            | Criar projetos/credenciais separados e controlar variáveis por ambiente.                           |
| Média      | Escalabilidade de listagem           | Todas as encomendas do utilizador são carregadas e filtradas no cliente.             | Lentidão, custos e excesso de dados transferidos.                                                           | Paginação e filtros no servidor, com índices verificados por plano de consulta.                    |

## Risco específico de acesso entre empresas

O modelo presente no frontend separa dados por `app_user_id`, não por empresa. Isto não resolve o caso futuro em que vários operadores pertencem à mesma empresa, nem garante que cada utilizador só veja o seu conjunto permitido.

O requisito mínimo para multi-tenancy é que cada recurso de negócio tenha um `tenant_id` inequívoco e que a base de dados derive/valide esse tenant a partir de uma identidade autenticada. O navegador não deve escolher livremente o `tenant_id` nem outro utilizador deve conseguir alterar esse valor para cruzar empresas.

Enquanto RLS e RPCs não forem auditadas, há duas possibilidades que não podem ser distinguidas por este repositório:

- **Cenário seguro:** RLS/funcionamento das RPCs já impõe o utilizador/empresa do contexto autenticado.
- **Cenário inseguro:** a anon key permite operações condicionadas apenas pelo valor controlado no browser.

Nenhuma delas deve ser assumida sem export da configuração ou consulta de catálogo autorizada.

## Controlo mínimo recomendado para o estado-alvo

```text
auth.users
  -> tenant_memberships(user_id, tenant_id, role, active)
  -> tenants
  -> orders, order_products, catalog_products, order_responsibles (tenant_id)

API NestJS
  -> autentica token
  -> resolve membership e role
  -> aplica tenant no servidor
  -> executa operações transacionais e auditáveis
```

Papéis iniciais a validar com o produto: `OWNER`, `ADMIN`, `OPERATOR` e, se necessário, `VIEWER`. As permissões devem ser documentadas por ação (ler, criar, editar, apagar, imprimir, gerir catálogo e gerir membros), não apenas por nome de papel.

## Itens que exigem confirmação antes de qualquer alteração

1. Quem é dono administrativo do projeto Supabase e quais pessoas têm acesso?
2. O ambiente atual é desenvolvimento, testes ou produção com dados reais?
3. RLS está ativo em `orders`, `order_products`, `catalog_products` e `order_responsibles`? Quais políticas e roles são aplicados?
4. Como as palavras-passe de `login_app_user` são armazenadas/verificadas?
5. Há Supabase Auth hoje? Se sim, como o utilizador da aplicação se relaciona a `auth.users`?
6. Catálogo e responsáveis são globais, por utilizador ou por empresa?
7. Quais backups existem e quando ocorreu o último restauro testado?
8. Há requisitos legais/contratuais de retenção, exportação e eliminação de encomendas?

## Decisão desta etapa

Não é seguro executar migrations, criar tenants ou alterar autenticação antes da confirmação do schema, RLS, RPCs, dados e estratégia de recuperação. Esta auditoria não realizou nenhuma dessas ações.
