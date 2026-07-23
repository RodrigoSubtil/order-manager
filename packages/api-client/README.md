# @order-manager/api-client

Cliente TypeScript gerado pelo Orval a partir de `apps/api/openapi.json`.

Não edite `src/generated` manualmente. Para atualizar tipos, cliente HTTP e hooks TanStack Query, altere primeiro os DTOs/controllers do NestJS e execute, na raiz:

```bash
npm run api:generate
npm run typecheck
```

O cliente usa o mutator `src/http.ts`, envia cookies com `credentials: 'include'` e exporta os modelos e operações pelo `src/index.ts`.
