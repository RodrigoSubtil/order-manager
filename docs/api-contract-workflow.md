# Contrato da API: NestJS, OpenAPI, Orval e MSW

Data: 16 de julho de 2026  
Etapa: 15A — consolidação do contrato gerado.

## Fonte de verdade

```text
DTO/controller NestJS
  -> decorators Swagger
  -> apps/api/openapi.json
  -> Orval
  -> packages/api-client/src/generated
  -> React, TanStack Query e MSW
```

Requests, responses, parâmetros e enums são definidos no backend. O frontend não deve manter cópias manuais desses tipos. Os arquivos em `packages/api-client/src/generated` são artefatos versionados e nunca devem ser editados manualmente.

## Regras de documentação do backend

Cada endpoint deve declarar:

- DTO de body, query e resposta, incluindo tipos aninhados;
- formato, limites, enum, nulabilidade e exemplo quando forem úteis ao contrato;
- parâmetros de path e query;
- resposta de sucesso real — somente respostas HTTP 204 geram `void`;
- erros no formato `code`, `message`, `details` e `traceId`;
- autenticação por cookie HttpOnly ou Bearer quando o endpoint for protegido;
- cookies e header `X-CSRF-Token` nos fluxos de sessão mutáveis.

O access token pode chegar pelo cookie `om_access_token` ou por Bearer JWT. Login, refresh e logout usam double-submit CSRF: o header `X-CSRF-Token` deve corresponder ao cookie `om_csrf_token`. O refresh token permanece no cookie HttpOnly `om_refresh_token`; tokens não aparecem nos DTOs de resposta.

## Geração e validação local

Na raiz do repositório:

```bash
npm run api:openapi
npm run api:generate
npm run typecheck
```

`api:openapi` inicializa o container NestJS com configuração de teste e grava `apps/api/openapi.json`. Esse processo não consulta PostgreSQL, Supabase ou qualquer serviço externo.

`api:generate` executa a geração do OpenAPI e depois o Orval. O Orval cria:

- interfaces TypeScript de requests e responses;
- tipos de filtros e paginação;
- cliente HTTP baseado em `fetch`;
- hooks TanStack Query separados por tag.

O workspace `@order-manager/api-client` possui typecheck próprio. A validação do OpenAPI falha se encontrar schemas de objeto vazios ou respostas `2xx`, exceto 204, sem schema JSON.

## MSW

`apps/web/src/mocks/handlers.ts` importa os DTOs de `@order-manager/api-client`
para autenticação, catálogo, responsáveis, encomendas, relatórios e health. A
suíte sobe um servidor MSW em memória e rejeita requests sem handler.

Novos handlers devem seguir a mesma regra: importar tipos gerados e não recriar interfaces de request/response. O worker do browser continua desativado no bootstrap até uma etapa específica decidir em quais ambientes os mocks serão ligados.

## CI e sincronização

O workflow `.github/workflows/contract.yml` executa:

1. instalação reproduzível com `npm ci`;
2. `npm run api:generate`;
3. `npm run typecheck`, incluindo o cliente gerado;
4. `git diff --exit-code` no OpenAPI e nos artefatos Orval.

Assim, mudar um DTO ou controller sem versionar o contrato e o cliente atualizados faz o CI falhar. O comando local `npm run api:check` aplica a mesma verificação de divergência quando a cópia possui um repositório Git válido.

## Estado ao concluir a Etapa 15A

- autenticação, catálogo, responsáveis, encomendas, relatórios e health possuem respostas tipadas;
- filtros e paginação são parâmetros do cliente gerado;
- enums de domínio são compartilhados pelo contrato;
- operações 204 de logout e exclusão são os únicos retornos `void`;
- nenhum schema de objeto do OpenAPI está vazio;
- nenhum tipo de API foi duplicado no frontend.

## Validação executada

Em 16 de julho de 2026 passaram:

- `npm run api:generate`;
- `npm run lint`;
- `npm run typecheck` nos workspaces de API, web e cliente gerado;
- `npm run test`: 8 testes do frontend e 26 testes do backend;
- `npm run build` para web e API.

O build apresentou apenas avisos não bloqueadores das dependências sobre diretivas `use client` e um chunk web de aproximadamente 503 kB, acima do aviso padrão de 500 kB. O `npm install --package-lock-only` também reportou 19 vulnerabilidades no grafo instalado; nenhuma atualização automática foi feita nesta etapa para evitar alterações de dependências sem análise própria.

A cópia local contém uma entrada `.git` que não é reconhecida como repositório. Por isso, `api:check` não pode executar localmente o `git diff --exit-code`; a mesma proteção continua configurada no checkout Git válido do CI.
