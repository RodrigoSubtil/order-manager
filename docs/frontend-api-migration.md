# Etapa 21 — Frontend ligado progressivamente à API

Data: 22 de julho de 2026  
Estado: concluída e consolidada pela Etapa 22.

## Resultado

A página principal deixou de chamar Supabase diretamente. Ela utiliza os tipos,
funções e hooks TanStack Query gerados pelo Orval a partir do OpenAPI da API
NestJS. O visual existente, React Hook Form, Zod, modais e impressão no browser
foram mantidos.

O fallback direto ao Supabase foi removido na Etapa 22 depois de a suíte da
Etapa 21 validar os fluxos via API. O estado final do corte está documentado em
[`frontend-api-cutover.md`](frontend-api-cutover.md).

## Fluxos migrados

| Fluxo                   | API/hook Orval                                                           | Cache e comportamento                                          |
| ----------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Sessão                  | `useAuthControllerMe`                                                    | consulta inicial; 401 tenta refresh uma vez                    |
| Login, refresh e logout | hooks `useAuthController*`                                               | cookies HttpOnly; cache total limpo no logout                  |
| Catálogo                | `useCatalogControllerList`                                               | cache de 5 minutos                                             |
| Responsáveis            | `useResponsiblesControllerList`                                          | cache de 5 minutos                                             |
| Listagem e filtros      | `useOrdersControllerList`                                                | data, categoria e pesquisa seguem como query params no backend |
| Criar/editar            | `useOrdersControllerCreate` e `useOrdersControllerUpdate`                | invalida a lista; edição envia `version`                       |
| Excluir individual      | `useOrdersControllerRemove`                                              | soft delete com `version`                                      |
| Excluir em lote         | preview + confirmação Orval                                              | exige duas confirmações: pré-visualização e exclusão           |
| Relatório/impressão     | `useReportsControllerDetailed` e `useReportsControllerProductionSummary` | impressão continua no navegador, dados vêm da API              |

`tenant_id` não é incluído em URL, body, filtros nem chaves manuais do cache.
O backend deriva o tenant da sessão. Quando uma troca autorizada de membership
ocorre pelo endpoint próprio, `useSession.switchTenant` limpa dados remotos e
revalida `/auth/me` antes de a UI voltar a consultar recursos da empresa nova.

## Segurança de sessão

O cliente HTTP em `packages/api-client/src/http.ts` usa `credentials: include`.
Para requests mutáveis ele lê somente o cookie legível `om_csrf_token` e envia
`X-CSRF-Token`; tokens de acesso e refresh continuam HttpOnly e não são
expostos ao React. O helper normaliza 401, 403, 404 e 409 em mensagens claras.

Copie `apps/web/.env.example` para `apps/web/.env` e defina:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

Em produção, quando web e API usam a mesma origem, a variável pode ficar vazia.
Não coloque `service_role`, token de acesso nem segredo Supabase em `VITE_*`.

## MSW e testes

`apps/web/src/mocks/handlers.ts` agora fornece respostas tipadas para sessão,
catálogo, responsáveis, encomendas e relatórios. A suíte de interface usa MSW
no Node, portanto não liga a Supabase nem a uma API real. Ela cobre login,
estado vazio, criação e invalidação da lista; `apiError.test.ts` cobre as
mensagens de 401/403/404/409.

## Limites conhecidos

- A interface ainda não expõe um seletor visual de empresa porque esse fluxo
  não existia no produto anterior; o hook seguro está preparado para a futura
  tela de memberships.
- Os indicadores de encomendas refletem a página atualmente retornada pelo
  backend. Para totais globais com muitos registros será necessário um endpoint
  específico de indicadores, em vez de carregar todos os pedidos.
- A integração real exige a API NestJS, PostgreSQL local/staging e Supabase Auth
  configurados; as Etapas 21 e 22 não escreveram no Supabase de produção.

## Validação executada

- `npm run lint`: passou para web, CSS e API.
- `npm run typecheck`: passou para cliente Orval, web e API.
- `npm run test`: passou com 35 testes web e 49 testes API.
- `npm run build`: passou para web e API; o bundle web ficou em 425 kB.
- Prettier dos arquivos desta etapa: passou.

`npm run format:check` global continua falhando em 36 arquivos anteriores ou
gerados fora do escopo desta etapa. Eles não foram reformatados para não misturar
uma alteração mecânica ampla com a migração funcional.
