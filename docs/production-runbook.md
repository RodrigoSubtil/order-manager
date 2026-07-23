# Runbook de produção

## Estado e autoridade

Este runbook prepara uma operação comercial; **não autoriza deploy de produção por si só**. Não existe workflow automático de produção nesta cópia. Somente um responsável técnico de produção, um responsável de negócio e o controlador do cliente podem aprovar uma mudança que toque dados reais.

Não executar produção enquanto alguma destas condições estiver pendente:

1. [staging-pilot.md](./staging-pilot.md) não estiver formalmente `APROVADO` para o mesmo SHA e migration.
2. Backup verificável e teste de restore não estiverem registados.
3. Rollback de aplicação, decisão de rollback de schema e responsáveis não estiverem confirmados.
4. Houver P0 ou P1 aberto.
5. Segurança, observabilidade, CORS, segredos, RLS e alertas não tiverem evidência.
6. Contrato, retenção, subprocessadores e canal de suporte não estiverem definidos.

## Papéis operacionais

| Papel                    | Responsabilidade                                                       |
| ------------------------ | ---------------------------------------------------------------------- |
| Gestor de release        | Mantém ticket, SHA, janela, aprovações e decisão final.                |
| Operador de produção     | Executa passos aprovados, verifica health checks e preserva evidência. |
| Responsável pelo banco   | Confirma backup, migration e estratégia de recuperação.                |
| Responsável de segurança | Confirma segredos, CORS, RLS, acessos e incidentes.                    |
| Responsável de negócio   | Aceita impacto comercial e aprova a promoção.                          |
| Suporte                  | Comunica estado aprovado aos clientes e recebe incidentes.             |

Em equipa pequena, uma pessoa pode acumular papéis, mas quem aprova o restore não deve ser a única pessoa a executá-lo.

## Preparação da release

1. Abrir ticket de mudança com objetivo, impacto, SHA/imagens imutáveis, alterações de schema, janela, responsáveis e comunicação.
2. Confirmar format, lint, typecheck, testes, build, OpenAPI/Orval e análise de dependências aprovada.
3. Associar a aprovação de staging e a matriz preenchida da Etapa 28.
4. Confirmar schema e migration candidata. Mudança sem rollback compatível deve usar expansão/contração em releases separadas; nunca `prisma migrate reset`.
5. Confirmar backup, RPO/RTO e ensaio de restore conforme [backup-and-restore.md](./backup-and-restore.md).
6. Confirmar que segredos ficam no gestor de segredos e que `service_role` não é exposta ao browser, logs, tickets ou OpenAPI.
7. Verificar CORS, HTTPS, cookies `Secure`, URLs Supabase e domínios de convite do ambiente correto.

## Janela de promoção

1. Comunicar janela, impacto previsto e canal de suporte aos utilizadores afetados.
2. Congelar mudanças concorrentes e confirmar backup recente/localizável.
3. Implantar a imagem imutável aprovada; nunca uma tag mutável como `latest`.
4. Executar migration somente se prevista no ticket, depois do backup e com observação de logs. Parar se o gate falhar.
5. Fazer smoke test autenticado: `/health`, `/health/ready`, login, `/auth/me`, leitura autorizada e negação de acesso cruzado.
6. Validar logs, métricas e alertas sem inserir PII na evidência.
7. Registar hora, versão efetiva, resultado e decisão da janela.

## Rollback

### Aplicação

1. Declarar falha no ticket e pausar o rollout.
2. Reimplantar a última imagem imutável aprovada.
3. Executar smoke test e confirmar leitura/escrita segura.
4. Preservar `requestId`, `traceId`, versão e logs sanitizados.

### Schema e dados

Rollback de schema não é automático. Avaliar nesta ordem:

1. migration compensatória testada em cópia isolada;
2. correção compatível para a frente;
3. restore para ambiente isolado, reconciliação e cutover aprovado.

Nunca sobrescrever produção como primeira reação. Seguir [database-rollback.md](./database-rollback.md) e [incident-response.md](./incident-response.md).

## Operação contínua

- Diariamente: disponibilidade, erros 5xx, readiness e alertas.
- Semanalmente: falhas de login, latência, integração e tickets P2/P3.
- Mensalmente: acessos administrativos, backups/PITR, vulnerabilidades e capacidade.
- Trimestralmente: ensaio de restore; também após mudanças relevantes em orders, auditoria ou retenção.
- Atualizações passam por desenvolvimento, staging aprovado e este mesmo processo.

O ticket só fecha com SHA final, checklist de staging, smoke test, referência de backup, decisões de risco, incidentes relacionados e aprovação de negócio.
