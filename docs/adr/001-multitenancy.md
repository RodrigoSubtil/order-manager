# ADR 001 — Banco compartilhado com isolamento por tenant

- Estado: Aceite para desenho alvo; implementação pendente de auditoria real e aprovação de migração.
- Data: 15 de julho de 2026

## Contexto

O produto atual foi criado para um contexto de utilizador/padaria e usa acesso direto do frontend ao Supabase com `app_user_id`. O objetivo comercial é atender múltiplas empresas sem vazamento de dados, com papéis, auditoria e evolução sustentável.

O schema real, as políticas RLS, as RPCs e os backups não estão disponíveis neste repositório. Portanto, esta decisão define o estado desejado, não afirma o estado atual.

## Decisão

Adotar banco PostgreSQL compartilhado, com isolamento lógico obrigatório por `tenant_id` em todas as tabelas de negócio. A identidade vem de `auth.users`; memberships associam utilizadores aos tenants e atribuem os papéis `OWNER`, `ADMIN` e `OPERATOR`.

O frontend não tem autoridade sobre tenant: **não escolhe, envia, persiste ou filtra `tenant_id`**. O backend NestJS valida a sessão, resolve a membership ativa e aplica o tenant a consultas e comandos. RLS no Supabase é habilitado como defesa adicional e testa o mesmo limite de tenant.

As relações de negócio usam FKs compostas com `tenant_id`, números de encomenda são únicos por tenant e alocados transacionalmente, e registros editáveis usam `version` para evitar sobrescrita concorrente. Exclusões são lógicas e auditáveis.

## Alternativas consideradas

### Um banco/schema por empresa

Oferece forte isolamento físico, mas aumenta muito provisionamento, migrations, operação, observabilidade e custo para o estágio atual. Pode ser reconsiderado para clientes com requisito regulatório específico.

### Banco compartilhado sem `tenant_id`, apenas `app_user_id`

Rejeitado: não modela empresa com vários utilizadores, não permite papéis adequados e deixa isolamento dependente de IDs controlados pelo cliente.

### Frontend acessando Supabase diretamente com RLS

Rejeitado como fronteira principal: mantém contratos de banco no navegador e torna validação transacional, auditoria, DTOs, limitação de abuso e regras de negócio mais difíceis de centralizar. RLS continua útil como defesa adicional.

### `tenant_id` enviado pelo frontend

Rejeitado: permite tentativa de troca de contexto, facilita falhas de autorização e viola a regra obrigatória desta decisão.

## Consequências

Positivas:

- suporta várias empresas e vários utilizadores por empresa;
- torna a autorização explícita e testável;
- reduz risco de relações cruzadas com constraints compostas;
- permite auditoria, retenção e concorrência controlada;
- mantém operação mais simples que banco por cliente.

Custos/obrigações:

- exige API NestJS, sessão verificável, DTOs e testes de autorização;
- exige migrations cuidadosamente ensaiadas, RLS e observabilidade;
- requer regras de produto para papéis, troca de tenant, retenção e catálogo;
- não elimina necessidade de backups, restauros e monitorização.

## Critérios de revisão

Esta ADR deve ser revista após a auditoria real do Supabase, antes da primeira migration, ao introduzir requisitos regulatórios de isolamento físico ou se o volume/carga justificar nova estratégia.
