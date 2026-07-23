# Contrato OpenAPI

O contrato versionado é [apps/api/openapi.json](../apps/api/openapi.json). Ele é gerado a partir dos DTOs e metadata Swagger do NestJS; o Orval gera tipos, cliente HTTP e hooks do frontend. Não alterar manualmente ficheiros gerados.

## Versão e publicação

- Base da API: `/api/v1`.
- Swagger local/desenvolvimento: `/api/v1/docs` quando explicitamente ativado.
- Produção: `API_SWAGGER_ENABLED=false`; publicar o JSON da release em local autenticado/aprovado para clientes técnicos, se houver integração contratada.
- Cada release anexa SHA, `openapi.json` e resultado de `npm run api:check` ao ticket.

## Consumidores

| Consumidor            | Regra                                                                       |
| --------------------- | --------------------------------------------------------------------------- |
| Frontend oficial      | Usa apenas `@order-manager/api-client` gerado.                              |
| Integração de cliente | Só após contrato, autenticação, rate limit, suporte e revisão de segurança. |
| Operação interna      | Consulta o artefacto para procedimentos autorizados.                        |

Nenhum consumidor pode enviar `tenant_id`. Identidade, membership e tenant ativo são validados pelo servidor. Cookies de sessão, tokens, exemplos com PII e segredos não pertencem ao OpenAPI.
