# Registo de bugs do piloto de staging

Modelo oficial para defeitos da Etapa 28. O registo fica ligado ao ticket de
release; screenshots, vídeos e logs com dados pessoais ficam no sistema
restrito de tickets, nunca neste repositório.

## Regras

- Criar um ID sequencial: `PILOT-001`, `PILOT-002`, etc.
- Registar SHA, ambiente, data/hora, responsável e prioridade.
- Usar apenas `TENANT-A`/`TENANT-B`, sem UUIDs reais.
- Não guardar passwords, cookies, tokens, telefones, e-mails, nomes de clientes
  ou conteúdo integral de encomendas.
- Associar `requestId`/`traceId` somente depois de sanitizado.
- P0 e P1 bloqueiam a promoção e exigem reteste comprovado antes de fechar.

## Prioridades

| Prioridade | Uso                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| P0         | Segurança, tenant isolation, perda/corrupção de dados ou indisponibilidade geral. Bloqueia piloto e produção. |
| P1         | Fluxo crítico incorreto/indisponível sem alternativa segura. Bloqueia produção.                               |
| P2         | Impacto relevante com alternativa segura. Exige decisão, responsável e prazo.                                 |
| P3         | Impacto menor. Pode entrar no planeamento posterior.                                                          |

## Registo

| ID  | Prioridade | Estado                                           | Resumo | Ambiente/release | Reportado por | Responsável | Evidência sanitizada | Correção | Reteste/decisão |
| --- | ---------- | ------------------------------------------------ | ------ | ---------------- | ------------- | ----------- | -------------------- | -------- | --------------- |
| —   | —          | Piloto ainda não iniciado; nenhum bug registado. | —      | —                | —             | —           | —                    | —        | —               |

## Detalhe obrigatório por ticket

```text
ID:
Prioridade: P0 | P1 | P2 | P3
Estado: OPEN | IN_PROGRESS | READY_FOR_RETEST | CLOSED | ACCEPTED_RISK
Ambiente e release SHA:
Tenant/role de teste:
Reportado por e data/hora:
Responsável pela correção:

Passos para reproduzir (sem dados pessoais):
1.
2.
3.

Resultado esperado:
Resultado atual:
Impacto e alternativa segura, se existir:
requestId/traceId sanitizado:
Evidência restrita (link do ticket):
Correção/release que contém a correção:
Resultado do reteste:
Decisão de promoção: BLOQUEIA | NÃO BLOQUEIA | RISCO ACEITE
Decisão/assinatura ou referência do responsável de negócio:
```

`CLOSED` só é permitido após correção, reteste em staging e evidência anexada.
`ACCEPTED_RISK` exige justificativa, proprietário, data de revisão e aprovação
explícita; nunca é permitido para P0/P1.
