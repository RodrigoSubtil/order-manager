# Observabilidade

Atualizado em 22 de julho de 2026. Esta etapa cria sinais operacionais sem enviar dados pessoais, conteúdo integral de encomendas, passwords ou tokens para logs, métricas ou Sentry.

## Componentes ativos

| Sinal              | Implementação                               | Correlação                                         | Dados proibidos                                                     |
| ------------------ | ------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| Logs               | Pino em JSON via `StructuredLogger`         | `requestId` e `traceId`                            | Password, token, cookie, email, nome, telefone, stack trace e body. |
| Erros              | `GlobalExceptionFilter` + Sentry opt-in     | `traceId` retornado pela API                       | Headers, cookies, body, utilizador e breadcrumbs com dados.         |
| Latência           | Métrica agregada `http_request_duration_ms` | Método, rota normalizada e classe HTTP             | URL com UUID, query/body e tenant.                                  |
| Operações críticas | `critical_operations_total`                 | login, refresh e mutações de orders                | Identidade, tenant e conteúdo da encomenda.                         |
| Integrações        | `integration_failures_total`                | `database` ou `supabase_auth` quando instrumentado | URL de ligação, credenciais e payload.                              |
| Auditoria          | `audit_logs.request_id`                     | `X-Request-Id` da API                              | Conteúdo integral de order e tokens.                                |

## Endpoints de saúde

- `GET /api/v1/health`: liveness; apenas confirma que o processo responde.
- `GET /api/v1/health/ready`: readiness; executa `SELECT 1` pelo Prisma e devolve `503 DATABASE_UNAVAILABLE` quando o banco não está pronto.
- `GET /api/v1/health/metrics`: snapshot de métricas em memória. Só existe quando `METRICS_ENABLED=true` e exige `X-Metrics-Token` igual a `METRICS_AUTH_TOKEN`; exponha-o apenas numa rede de operações.

As métricas são intencionalmente locais e efémeras: reiniciar a API zera os contadores. Elas comprovam os nomes, a cardinalidade limitada e os sinais antes de contratar/configurar um collector. Não são substituto para retenção histórica.

## Sentry

Backend e frontend permanecem desligados por padrão. Para cada ambiente não-local, configurar por secret manager:

```text
# API
SENTRY_ENABLED=true
SENTRY_DSN=https://public-key@o0.ingest.sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=0.05

# web
VITE_SENTRY_ENABLED=true
VITE_SENTRY_DSN=https://public-key@o0.ingest.sentry.io/project-id
VITE_SENTRY_TRACES_SAMPLE_RATE=0.05
```

O DSN é identificador público do projeto, mas não é substituto de controlo de acesso. Token de upload de source maps, se futuramente usado, fica somente no CI; nunca em `VITE_*`. A configuração remove utilizador, headers, cookies, bodies e dados de breadcrumbs antes de enviar um evento. Não ativar Session Replay nesta aplicação enquanto não houver revisão específica de privacidade.

O SDK JavaScript do Sentry deve ser inicializado com amostragem proporcional e sem PII por padrão; a integração oficial de NestJS/Node também exige atenção especial à inicialização em aplicações ESM. [Documentação Sentry para NestJS ESM](https://docs.sentry.io/platforms/javascript/guides/nestjs/install/esm__v8.x)

## Alertas básicos a configurar no fornecedor

Após criar projetos Sentry e um destino de alertas (email/Teams/Slack), configurar:

1. erro `INTERNAL_SERVER_ERROR` ou `DATABASE_UNAVAILABLE`: qualquer ocorrência em produção, severidade alta;
2. `http_errors_total` com `status=5xx`: mais de 5 em 5 minutos, severidade alta;
3. `login_failures_total`: mais de 20 em 10 minutos, severidade média e investigação de abuso;
4. p95 de `http_request_duration_ms` acima de 1.000 ms por 10 minutos, severidade média;
5. `integration_failures_total` maior que zero em 5 minutos, severidade alta;
6. readiness indisponível por 2 verificações consecutivas, severidade alta.

Estes alertas ainda não foram criados num projeto externo porque não há DSN, organização, contactos ou autorização operacional neste repositório. Antes de go-live, guardar screenshot/export da regra, owner, canal de escalonamento e teste controlado na evidência da release.

## Investigação e correlação

1. Recolher `X-Request-Id` e `X-Trace-Id` da resposta ou `traceId` do erro da API.
2. Procurar o evento JSON `http_request_completed` ou `http_request_failed` pelos IDs, sem copiar PII para tickets.
3. Usar `request_id` para consultar o `audit_logs` do tenant afetado e confirmar a operação administrativa relacionada.
4. Comparar status, duração, rota normalizada, métrica e evento Sentry.
5. Se houver suspeita de acesso cruzado, seguir imediatamente [incident-response.md](incident-response.md), preservar evidência e verificar RLS.

## Preparação para OpenTelemetry

O código centraliza sinais em `ObservabilityService`: as métricas usam nomes estáveis e rótulos de baixa cardinalidade, e as requisições já carregam `requestId`/`traceId`. Ainda não adicionámos SDK, collector ou auto-instrumentação OpenTelemetry para não criar infraestrutura sem destino de telemetria. Quando houver collector aprovado, a próxima alteração deve trocar o armazenamento em memória por um adaptador OpenTelemetry e propagar `traceparent` de forma compatível; não duplicar instrumentação em controllers.

A documentação oficial recomenda inicializar o SDK antes do código da aplicação e combinar instrumentação automática com manual apenas quando necessário. [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/instrumentation/)
