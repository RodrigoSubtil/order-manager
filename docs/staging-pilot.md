# Etapa 28 — Staging e piloto

## Estado

**Piloto: NÃO INICIADO.** Este documento prepara a execução controlada; não é
uma aprovação, não iniciou staging, não convidou utilizadores e não executou
backup, restore, migration ou deploy.

Use apenas `staging`, dados sintéticos ou dados com uso formalmente autorizado.
Nunca use o Supabase de produção, dados pessoais sem autorização, segredos de
produção ou `service_role` no browser.

## Resultado esperado

O piloto termina com uma decisão registada:

- `APROVADO`: testes bloqueadores passaram e utilizadores-chave aprovaram;
- `REPROVADO`: existe bloqueador ou falha de isolamento/segurança;
- `PENDENTE`: faltam execução, evidência, correção ou aprovação.

Não promover para produção enquanto o resultado for `REPROVADO` ou `PENDENTE`.

## Pré-requisitos

1. Registar a imagem/release SHA candidata criada pelo workflow de qualidade.
2. Configurar `staging` conforme [deployment.md](./deployment.md), com HTTPS,
   CORS e variáveis de ambiente sem segredos expostos.
3. Se houver migration, passar pelo _gate_ de backup e guardar referência/data.
   Nunca aplicar migration em produção nesta etapa.
4. Criar contas de teste `OWNER`, `ADMIN` e `OPERATOR` em, no mínimo, dois
   tenants, sem credenciais pessoais.
5. Carregar massa fictícia com encomendas, itens, catálogo e responsáveis.
6. Configurar logs, health checks e alertas conforme
   [observability.md](./observability.md), sem PII, tokens ou cookies.
7. Rever [backup-and-restore.md](./backup-and-restore.md) antes do ensaio de
   backup/restore.

## Evidências

- Estados permitidos: `NOT_RUN`, `PASS`, `FAIL`, `BLOCKED`.
- Registar data/hora, SHA, browser/dispositivo e `requestId`/`traceId`
  sanitizado quando existir.
- Chamar os tenants de `TENANT-A` e `TENANT-B`; não usar UUIDs reais.
- Guardar screenshots, vídeos e logs com PII apenas no sistema restrito de
  tickets, nunca no repositório.
- Abrir defeitos em [pilot-bug-register.md](./pilot-bug-register.md).

## Matriz de validação

| ID             | Área              | Resultado esperado                                                                                     | Evidência mínima                    | Estado  |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------- |
| AUTH-01        | Login             | Credencial válida entra no tenant autorizado; credencial inválida não revela a existência da conta.    | Ticket, SHA, `requestId`.           | NOT_RUN |
| AUTH-02        | Sessão expirada   | Sessão expirada renova-se autorizadamente ou exige login; mutações com sessão inválida são rejeitadas. | Hora e resposta HTTP sanitizada.    | NOT_RUN |
| AUTH-03        | Logout            | Logout limpa sessão e cache; voltar no browser não revela dados.                                       | Passos ou vídeo sanitizado.         | NOT_RUN |
| ROLE-01        | OWNER             | Executa funções administrativas permitidas e gestão de membros autorizada.                             | Conta/resultado.                    | NOT_RUN |
| ROLE-02        | ADMIN             | Executa o permitido sem ultrapassar limites de OWNER.                                                  | Conta/resultado.                    | NOT_RUN |
| ROLE-03        | OPERATOR          | Apenas operações atribuídas; administrativas bloqueadas retornam `403`.                                | Ecrã/resposta sanitizada.           | NOT_RUN |
| TENANT-01      | Múltiplos tenants | Troca autorizada entre A e B atualiza o contexto ativo corretamente.                                   | Tenant antes/depois.                | NOT_RUN |
| TENANT-02      | Isolamento        | A não vê dados de B por interface, UUID conhecido, filtro manipulado ou chamada autenticada direta.    | Tentativas, status e trace.         | NOT_RUN |
| ORDER-01       | Criação           | Cabeçalho e itens persistem atomicamente; número é sequencial por tenant.                              | Número mascarado/contagens.         | NOT_RUN |
| ORDER-02       | Edição            | Altera somente o tenant ativo e mantém consistência dos itens.                                         | Antes/depois sanitizado.            | NOT_RUN |
| ORDER-03       | Conflito          | Edição desatualizada recebe `409`; edição válida não se perde.                                         | Dois utilizadores, versão/resposta. | NOT_RUN |
| ORDER-04       | Exclusão          | Confirmação, retenção/soft delete e ausência na listagem normal funcionam.                             | Ticket/consulta funcional.          | NOT_RUN |
| ORDER-05       | Exclusão em lote  | Preview e confirmação afetam somente registos autorizados selecionados.                                | Quantidade prevista/obtida.         | NOT_RUN |
| ORDER-06       | Filtros           | Data, estado, categoria, cliente, telefone, responsável e produto paginam e filtram no servidor.       | Filtros e total.                    | NOT_RUN |
| CATALOG-01     | Catálogo          | Criar, editar e listar respeita role e tenant.                                                         | Resultado por role.                 | NOT_RUN |
| RESPONSIBLE-01 | Responsáveis      | Criar, editar e listar respeita role e tenant.                                                         | Resultado por role.                 | NOT_RUN |
| REPORT-01      | Relatórios        | Detalhado/resumo agrupam e somam unidades corretamente no período.                                     | Totais e resposta sanitizada.       | NOT_RUN |
| PRINT-01       | Impressão         | Pré-visualização/impressão contém só o tenant/seleção atual e é legível.                               | PDF/screenshot sem PII.             | NOT_RUN |
| UX-01          | Celular           | Fluxos prioritários, modais e impressão disponível funcionam no móvel representativo.                  | Modelo/browser.                     | NOT_RUN |
| UX-02          | Desktop           | Fluxos prioritários funcionam no browser desktop suportado.                                            | Browser/versão.                     | NOT_RUN |
| UX-03          | Teclado           | Login, formulários, filtros e diálogos são operáveis por teclado e foco é correto.                     | Roteiro de teclas.                  | NOT_RUN |
| PERF-01        | Internet lenta    | Loading/erro/nova tentativa são claros e não há submissão dupla.                                       | Perfil de rede.                     | NOT_RUN |
| PERF-02        | Volume realista   | Com massa aprovada por tenant, paginação, filtros e relatórios funcionam dentro da meta acordada.      | Volume, p95/métricas.               | NOT_RUN |
| OPS-01         | Backup            | Backup de staging existe antes de alteração relevante e é localizado pela referência.                  | Referência/data/responsável.        | NOT_RUN |
| OPS-02         | Restore           | Restore é ensaiado isoladamente e reconciliação confirma contagens e isolamento.                       | Relatório de reconciliação.         | NOT_RUN |
| OPS-03         | Logs              | Operação/falha controlada é localizada por request/trace sem PII.                                      | Consulta sanitizada.                | NOT_RUN |
| OPS-04         | Alertas           | Alerta de erro/indisponibilidade chega ao canal definido e permite triagem.                            | Alerta sanitizado.                  | NOT_RUN |

## Bloqueio e promoção

| Prioridade | Definição                                                                                              | Promoção                            |
| ---------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| P0         | Exposição entre tenants, vulnerabilidade crítica, perda/corrupção de dados ou indisponibilidade geral. | Bloqueia piloto e produção.         |
| P1         | Falha sem alternativa segura em login, criação, edição, exclusão, relatório ou backup/restore.         | Bloqueia produção.                  |
| P2         | Impacto relevante com alternativa segura.                                                              | Exige responsável, prazo e decisão. |
| P3         | Impacto menor visual/textual/ergonómico.                                                               | Pode ser planeado.                  |

Uma release é elegível somente se os itens bloqueadores estão `PASS`, não há
P0/P1 aberto, todo P2 tem decisão, backup/restore e observabilidade têm
evidência, workflows obrigatórios estão verdes e os utilizadores-chave
aprovaram. A aprovação perde validade se SHA, migration, configuração relevante
ou dados de staging mudarem.

## Aprovação formal

Preencher após a matriz estar concluída.

| Campo                        | Registo     |
| ---------------------------- | ----------- |
| Release SHA / imagem         | A PREENCHER |
| Ambiente e URL               | A PREENCHER |
| Janela do piloto             | A PREENCHER |
| Responsável técnico          | A PREENCHER |
| Responsável de negócio       | A PREENCHER |
| Resultado                    | PENDENTE    |
| Bugs P0/P1 abertos           | A PREENCHER |
| Riscos P2 aceites            | A PREENCHER |
| Referência de backup/restore | A PREENCHER |

| Utilizador-chave | Tenant/role de teste | Data        | Decisão     | Assinatura ou ticket |
| ---------------- | -------------------- | ----------- | ----------- | -------------------- |
| A PREENCHER      | A PREENCHER          | A PREENCHER | A PREENCHER | A PREENCHER          |
| A PREENCHER      | A PREENCHER          | A PREENCHER | A PREENCHER | A PREENCHER          |

O responsável técnico anexa a matriz preenchida, o registo de bugs e a decisão
ao ticket de release. A condição de conclusão da Etapa 28 ainda **não** foi
atingida neste momento.
