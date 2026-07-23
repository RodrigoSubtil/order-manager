# Etapa 22 — Corte definitivo do acesso direto ao Supabase

Data: 22 de julho de 2026  
Estado: concluído no frontend.

## Resultado

O navegador comunica somente com `/api/v1`. Supabase Auth e PostgreSQL continuam
componentes da arquitetura, mas são acessados exclusivamente pela API NestJS.
Nenhuma migration, tabela, RPC, policy ou dado Supabase foi alterado nesta etapa.

## Evidência antes da remoção

A busca de imports confirmou que a rota principal já usava apenas hooks Orval.
As referências a `ordersApi.ts`, `catalogApi.ts`, `responsiblesApi.ts`,
`useLegacyOrderData.ts` e `supabaseClient.ts` existiam somente dentro do próprio
fallback legado. Por isso, sua remoção não trocou a fonte de dados ativa.

## Remoções

- adaptadores diretos de encomendas, catálogo e responsáveis;
- RPCs `login_app_user` e `list_order_responsibles` no browser;
- fallback de responsáveis que lia a tabela diretamente;
- restauração de sessão por `localStorage`;
- cliente `supabaseClient.ts`;
- dependência `@supabase/supabase-js` do workspace web;
- variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`;
- exports e hooks legados sem consumidores.

A SDK Supabase permanece somente em `apps/api`, onde implementa a comunicação
backend com o provedor de identidade. Nenhuma `service_role` existe nas
dependências, variáveis ou fontes do frontend.

## Fronteira obrigatória

`apps/web/scripts/check-api-boundary.mjs` é executado pelo lint e falha se o
frontend reintroduzir:

- SDK Supabase;
- variáveis `VITE_SUPABASE_*`;
- cliente ou hook legado;
- `ordersApi`;
- `fetch` direto em código de produção.

Além da análise estática, `packages/api-client/src/http.ts` recusa URLs que não
comecem por `/api/v1`. Cookies usam `credentials: include`; CSRF continua sendo
enviado em operações mutáveis sem expor access ou refresh token ao React.

## Mocks e testes

MSW continua sendo a única simulação HTTP dos testes web. Seus handlers são
tipados com DTOs de `@order-manager/api-client` e cobrem autenticação, catálogo,
responsáveis, encomendas e relatórios. Requests não tratados fazem a suíte
falhar, evitando acesso acidental à rede ou ao Supabase.

## Configuração do browser

O único endereço externo configurável no workspace web é:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

Em produção, web e API podem compartilhar a mesma origem. Segredos Supabase,
`service_role`, `DATABASE_URL` e segredos de sessão nunca usam prefixo `VITE_`.

## Validação executada

- fronteira do browser: passou; somente o cliente gerado `/api/v1` é aceito;
- `npm ls @supabase/supabase-js --all`: SDK presente somente em `apps/api`;
- `npm run lint`: passou para web, CSS e API;
- `npm run typecheck`: passou para cliente gerado, web e API;
- `npm run test`: 36 testes web e 49 testes API passaram;
- `npm run build`: web e API passaram; bundle web principal com 425 kB;
- Prettier dos arquivos da Etapa 22: passou.

O build mantém avisos informativos de `use client` provenientes de dependências.
O `format:check` global continua apontando 36 arquivos anteriores ou gerados,
nenhum deles criado ou alterado funcionalmente nesta etapa.
A atualização do lockfile reportou 21 vulnerabilidades no grafo completo de
dependências (1 baixa, 3 moderadas, 6 altas e 11 críticas); nenhuma atualização
automática foi aplicada nesta etapa porque exige auditoria própria de impacto.
