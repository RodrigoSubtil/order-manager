# API de relatórios e impressão

Data: 16 de julho de 2026  
Etapa: 14 — relatórios e impressão.

## Objetivo

Relatórios deixam de calcular encomendas e quantidades no componente React. A API busca somente as encomendas ativas do tenant e período solicitado, aplica filtros no PostgreSQL e devolve um envelope estável para a impressão no browser atual ou geração futura de PDF no servidor.

## Endpoints

Base: `/api/v1/reports`. Ambos exigem sessão válida e permitem `OWNER`, `ADMIN` e `OPERATOR`.

| Método | Rota                                                   | Descrição                                                            |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------------- |
| `GET`  | `/detailed?from=YYYY-MM-DD&until=YYYY-MM-DD`           | Encomendas, responsável e itens do período para impressão detalhada. |
| `GET`  | `/production-summary?from=YYYY-MM-DD&until=YYYY-MM-DD` | Totais de produção por categoria, produto e unidade.                 |

Filtros opcionais comuns: `category` (`PASTELARIA`, `PADARIA`, `SALGADOS`) e `responsibleId`. `from` e `until` são obrigatórios; um intervalo invertido devolve `400 INVALID_REPORT_PERIOD`.

Cada resposta contém `generatedAt`, período, tenant, `format` e conteúdo. O frontend poderá renderizar esses dados para `window.print()` sem depender do cálculo legado atualmente isolado em `shared/lib/productGrouping.ts`. O formato não é um PDF nesta etapa; o envelope permite adicionar um renderer PDF posteriormente sem reescrever consultas, autorização ou agrupamento.

## Regras de agrupamento e quantidade

- Apenas itens não apagados de encomendas não apagadas entram no relatório.
- Itens são agrupados por `category`, nome de produto sem distinção de maiúsculas/minúsculas e `quantityUnit`.
- Quantidades são somadas com precisão de três casas, compatível com `numeric(12,3)`.
- Não há conversão entre unidades: `500 G` e `0.5 KG` continuam linhas diferentes. Isto evita assumir equivalências comerciais ou arredondamentos não aprovados.
- `orderCount` informa quantas linhas de encomenda participaram em cada total.

O tenant não vem do query string nem do corpo: o repository recebe o contexto validado da sessão. IDs e dados de outro tenant não entram nas consultas.

## Limites

O frontend legado e sua impressão não foram modificados. Não houve ligação ao Supabase, Docker ou PostgreSQL real; testes cobrem o domínio e o serviço usando mocks. Antes de ativar em staging, os endpoints devem ser exercitados com a base de desenvolvimento da Etapa 10 e dados de dois tenants.
