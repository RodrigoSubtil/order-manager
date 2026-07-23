# Etapa 24 - Testes completos e desempenho

Atualizado em 22 de julho de 2026. Esta etapa protege os fluxos que podem causar perda de dados ou exposicao entre empresas. Todos os testes com persistencia usam somente `localhost/order_manager_dev` e fixtures Alpha/Beta. Nenhum teste acessa Supabase ou producao.

## Matriz de protecao

| Camada                              | Ferramenta                  | Risco protegido                                                                         |
| ----------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| Dominio, schemas e mapeadores       | Vitest                      | Quantidades, unidades, agrupamentos, validacoes e erros de formulario.                  |
| Componentes e HTTP mockado          | React Testing Library + MSW | Loading, erro, cache, login e componentes acessiveis.                                   |
| Services, controllers e HTTP NestJS | Jest + Supertest            | Roles, CSRF, cookies, refresh, logout, DTOs e respostas padronizadas.                   |
| Repositories e RLS                  | Jest + PostgreSQL + Prisma  | Tenant isolation, acesso por UUID conhecido, atomicidade, soft delete e concorrencia.   |
| Jornada do browser                  | Playwright + MSW            | Login, criacao, filtro, impressao, exclusao e logout pelo contrato HTTP.                |
| Acessibilidade                      | axe-core + Playwright       | Marcos, headings, labels, formularios, dialogos e painel autenticado.                   |
| Desempenho local                    | PostgreSQL EXPLAIN          | Paginacao, filtro por tenant e uso do indice de entrega em 2.400 encomendas sinteticas. |

## Thresholds por risco

Cobertura global e somente um indicador. Os thresholds obrigatorios ficam nos ficheiros de configuracao e focam os pontos em que uma regressao tem maior impacto:

- `apps/web/vitest.config.ts`: `shared/lib`, schemas de formulario e primitives de UI;
- `apps/api/jest.config.cjs`: controller de autenticacao, guards, service de encomendas e utilitarios de relatorios.

Os limites nao sao usados para mascarar falta de cobertura noutros modulos. Repositories, RLS, transacoes e planos SQL sao exigidos pela suite PostgreSQL real; as jornadas de venda sao exigidas pela suite Playwright. Aumente os thresholds quando uma feature critica ganhar testes, nunca baixe-os para aceitar uma regressao.

## Executar localmente

```bash
npm run test:coverage
npm run test:coverage:api
npm run test:e2e
```

Para a suite que usa banco, confirme antes que `apps/api/.env` aponta para `localhost/order_manager_dev`:

```bash
npm run db:up
npm run db:reset
npm run test:db
```

`db:reset` elimina somente dados do banco local permitido e restaura os dois tenants ficticios. A suite limpa as encomendas com os prefixos `[integration]` e `[performance]` no inicio e no fim.

## Volume e planos de consulta

`apps/api/test/database-performance.test.ts` insere 1.200 encomendas sinteticas para Alpha e 1.200 para Beta, testa pagina 2 com filtro de texto e confirma o plano `EXPLAIN (FORMAT JSON)` para o indice `orders_tenant_id_delivery_date_delivery_time_idx`. O limite de dois segundos e apenas um alarme contra regressao grosseira em maquina de desenvolvimento; nao substitui medicao de p95 em staging.

## Estado comprovado nesta etapa

- 38 testes Vitest, incluindo MSW, componentes, schemas e acessibilidade de primitives;
- 49 testes Jest de API, incluindo services, controllers e HTTP;
- 25 testes PostgreSQL/Prisma/RLS com dois tenants, concorrencia, atomicidade, roles e planos SQL;
- 2 jornadas Playwright: ciclo de encomenda completo e auditoria axe de login/painel.

## Limites conhecidos antes de producao

- Supabase Auth real, refresh contra tokens reais, convite por email e logout remoto devem ser repetidos em um projeto Supabase isolado de staging;
- a impressao e validada como conteudo e chamada de browser; impressora termica, layout fisico e navegadores adicionais pedem homologacao manual;
- o plano SQL foi validado em PostgreSQL local. Staging precisa repetir `EXPLAIN (ANALYZE, BUFFERS)` com volume e hardware proximos da operacao;
- Playwright usa MSW para isolar o frontend. O E2E contra API NestJS e PostgreSQL real deve entrar no ambiente de staging depois que credenciais de teste e lifecycle de dados forem definidos.
