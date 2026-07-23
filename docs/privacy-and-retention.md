# Privacidade, RGPD e retenção

Atualizado em 22 de julho de 2026. Este documento organiza a implementação técnica para RGPD; a base legal, os prazos definitivos e os textos para titulares devem ser aprovados pelo responsável jurídico do cliente antes de produção.

## Dados e minimização

| Dado                                 | Finalidade                           | Acesso técnico                                   | Retenção                                                         |
| ------------------------------------ | ------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------- |
| Nome e telefone do cliente           | Preparar e contactar sobre encomenda | Apenas membros autorizados do tenant             | Definir por cliente em `tenant_settings.order_retention_days`.   |
| Encomenda, itens, data e responsável | Produção, atendimento e auditoria    | Tenant ativo e papel autorizado                  | Mesmo prazo da encomenda, salvo obrigação legal maior.           |
| Utilizador, membership e papel       | Segurança e administração            | Próprio utilizador e administradores autorizados | Enquanto necessário para segurança/auditoria.                    |
| Audit log                            | Rastrear alterações e incidentes     | `OWNER`/`ADMIN`                                  | Prazo aprovado por contrato e necessidade de defesa de direitos. |

Não usar dados reais em fixtures, MSW, testes, screenshots, issues ou logs. Telefone, email, nome, tokens e cookies são mascarados pelo logger.

## Papéis RGPD a confirmar por contrato

- **Controlador:** normalmente a empresa cliente que decide finalidade e meios do tratamento.
- **Operador/processador:** entidade que hospeda/opera o Order Manager em nome do cliente, quando não decide as finalidades.
- **Subprocessadores potenciais:** Supabase (PostgreSQL/Auth/backup), provedor de alojamento, provedor de email de convite e Sentry quando for ativado. Cada um requer DPA, região, medidas de segurança e lista atualizada.

Esta classificação não é automática: deve constar no contrato e no aviso de privacidade do cliente.

## Direitos do titular: fluxo seguro

### Acesso e exportação

1. Receber pedido autenticado ou verificar identidade por canal aprovado.
2. Registar pedido, titular, tenant, prazo legal e operador responsável sem incluir excesso de dados.
3. Exportar somente dados do titular no tenant correto: perfil relacionado, encomendas, itens e eventos de auditoria permitidos.
4. Rever manualmente se a exportação expõe dados de outros titulares, utilizadores ou segredos.
5. Entregar por canal autenticado, com expiração e registo de entrega.

Não existe endpoint público de exportação nesta etapa, porque critérios de identidade, formato, prazo e aprovação precisam de decisão do controlador. O fluxo acima é a condição de aceite para implementar um endpoint futuro.

### Eliminação, restrição e retificação

1. Verificar identidade e se há obrigação legal/contratual de retenção.
2. Corrigir dados no tenant ou aplicar soft delete/anonimização conforme a política aprovada.
3. Não executar `DELETE` físico em tabelas de negócio; RLS e políticas já o bloqueiam.
4. Registar decisão, fundamento, operador e referência do pedido no audit log.
5. Informar que cópias de backup expiram pelo ciclo de retenção; não se alteram backups históricos individualmente.

## Política de retenção

`order_retention_days` já existe no modelo de tenant, mas não há prazo global ativo por padrão. Antes de ativar expurgo automático, cada cliente deve aprovar:

- prazo por tipo de dado e fundamento;
- se expira para soft delete, anonimização ou eliminação física pós-backup;
- exceções por litígio, contabilidade e obrigação legal;
- responsável pela aprovação e revisão anual.

O job de retenção só pode ser implementado após essas decisões e deve produzir relatório, permitir dry-run e preservar audit log pelo prazo aprovado.

## Evidências para go-live

- DPA com cada subprocessador e lista de regiões;
- aviso de privacidade e base legal aprovados;
- titular de dados, canal e SLA de direitos definidos;
- política de retenção preenchida para cada tenant;
- teste de exportação e eliminação em staging com dois tenants, sem exposição cruzada;
- registro do último exercício de direitos e do responsável pela revisão.
