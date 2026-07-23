# Suporte, SLA e evolução do serviço

## Estado contratual

Os valores abaixo são uma **proposta operacional**, não uma garantia já contratada. Antes de vender, definir por contrato horário, canais, idiomas, contactos autorizados, disponibilidade, exclusões, manutenção, RPO/RTO, subprocessadores e responsabilidades.

## Canais e informação mínima

Definir um canal de tickets autenticado como fonte de verdade. Email ou telefone podem receber o pedido, mas devem gerar ticket. Cada pedido inclui empresa codificada, impacto, horário, passos sem PII, browser/dispositivo e `requestId`/`traceId` sanitizado.

Nunca pedir ou enviar passwords, cookies, tokens, telefones completos ou conteúdo integral de encomendas.

## Proposta de severidade e resposta

| Nível | Exemplo                                                                | Resposta alvo              | Atualização          | Escalonamento                  |
| ----- | ---------------------------------------------------------------------- | -------------------------- | -------------------- | ------------------------------ |
| S1    | Tenant isolation, vazamento, perda de dados ou indisponibilidade geral | 1 hora, 24x7 se contratado | A cada 1 hora        | Incidente, segurança e negócio |
| S2    | Fluxo crítico indisponível para uma empresa                            | 4 horas úteis              | A cada 4 horas úteis | Técnico e cliente              |
| S3    | Função degradada com alternativa segura                                | 1 dia útil                 | Diário               | Manutenção                     |
| S4    | Dúvida, melhoria ou impacto mínimo                                     | 3 dias úteis               | Conforme acordado    | Backlog                        |

Tempo de resposta não é tempo de resolução; depende de diagnóstico, mudança, fornecedores e aprovação de rollback/restore.

## Incidentes, manutenção e monitorização

1. Classificar S1--S4 e abrir ticket.
2. Em S1/S2, seguir [incident-response.md](./incident-response.md), preservar evidências e notificar contactos autorizados.
3. Comunicar impacto confirmado, ações tomadas e próxima atualização; nunca expor outro tenant.
4. Fechar com causa, correção, prevenção, release e aprovação quando apropriado.

Manutenções planeadas são comunicadas conforme contrato. Correções passam por desenvolvimento e staging, exceto contenção urgente aprovada pelo processo de incidente. Rever dependências mensalmente, backups/PITR e acessos administrativos; ensaiar restore trimestralmente.

O operador acompanha health, readiness, erros, latência, falhas de integração e operações críticas conforme [observability.md](./observability.md). Alertas precisam de dono, canal, teste controlado e escalamento. Logs e Sentry não podem conter PII, tokens ou conteúdo integral de encomendas.

## Fornecedores

Os fornecedores dependem do contrato/configuração. Os candidatos previstos são Supabase (Auth/PostgreSQL/backups), alojamento, email de convites e Sentry se ativado. Antes de go-live, documentar finalidade, região, DPA, contacto, retenção, acessos e plano de saída para cada fornecedor. Consulte [privacy-and-retention.md](./privacy-and-retention.md).

## Critérios para novas funcionalidades

Uma proposta entra no backlog apenas com:

1. problema e tenant/utilizador afetado;
2. valor comercial e prioridade;
3. dados, roles, isolamento e auditoria;
4. impacto em RGPD, retenção, backups, logs, suporte e custos;
5. critérios de aceite e testes, incluindo dois tenants quando houver dados;
6. ADR se alterar contrato, schema ou segurança;
7. rollout, rollback e comunicação.

Não implementar diretamente em produção para resolver pedido urgente.
