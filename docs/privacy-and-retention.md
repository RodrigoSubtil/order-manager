# Privacidade, RGPD e retenção

Atualizado em 24 de julho de 2026. Este documento organiza a implementação técnica para RGPD; a base legal e os textos para titulares devem ser aprovados pelo responsável jurídico do cliente.

## Dados e minimização

| Dado                                 | Finalidade                           | Acesso técnico                                   | Retenção                                                         |
| ------------------------------------ | ------------------------------------ | ------------------------------------------------ | ---------------------------------------------------------------- |
| Nome e telefone do cliente           | Preparar e contactar sobre encomenda | Apenas membros autorizados do tenant             | Enquanto ativa e por 7 dias após a conclusão da encomenda.       |
| Encomenda, itens, data e responsável | Produção, atendimento e auditoria    | Tenant ativo e papel autorizado                  | Enquanto ativa e por 7 dias após a conclusão da encomenda.       |
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
3. Não executar `DELETE` físico manual em tabelas de negócio; a única exceção operacional é o expurgo automático de encomendas já concluídas após o prazo definido abaixo.
4. Registar decisão, fundamento, operador e referência do pedido no audit log.
5. Informar que cópias de backup expiram pelo ciclo de retenção; não se alteram backups históricos individualmente.

## Política de retenção

Ao selecionar **Concluir**, a encomenda deixa imediatamente do dashboard, mas permanece no PostgreSQL com `completed_at` e `completed_by`. O job `order-manager-purge-completed-orders` é executado diariamente às 03:15 UTC e elimina fisicamente a encomenda e os respetivos itens somente depois de completados 7 dias.

Por ser diário, o momento efetivo da eliminação acontece entre 7 e menos de 8 dias após a conclusão. O prazo pode ser revisto futuramente por tenant usando `tenant_settings.order_retention_days`; isso exige uma migration e aprovação da empresa antes de alterar a regra atual.

## Evidências para go-live

- DPA com cada subprocessador e lista de regiões;
- aviso de privacidade e base legal aprovados;
- titular de dados, canal e SLA de direitos definidos;
- política de retenção de 7 dias comunicada e aprovada pela empresa;
- teste de exportação e eliminação em staging com dois tenants, sem exposição cruzada;
- registro do último exercício de direitos e do responsável pela revisão.
