# ADR 005 — Estado remoto, formulários e estilo do frontend

- Estado: Aceite; arquitetura por features implementada na Etapa 16A. API, React Hook Form, Zod e CSS Modules continuam pendentes.
- Data: 15 de julho de 2026

## Contexto

Antes da Etapa 16A, `App.tsx` concentrava estado de sessão, carregamento, formulário, filtros, modais e chamadas Supabase. A primeira separação criou apenas um adaptador que voltava da feature para `App.tsx`; a Etapa 16A concluiu a separação real sem trocar a fonte de dados.

## Decisão

Usar TanStack Query para estado remoto proveniente da API, React Hook Form + Zod para formulários/validação e CSS Modules + design tokens para estilos. Orval fornece o client tipado gerado do OpenAPI; MSW simula esse contrato em testes e cenários de desenvolvimento.

Até a migração funcional do frontend para a API, os hooks legados continuam com `useState` e chamadas Supabase. TanStack Query já está no provider, mas não é usado artificialmente para dados que ainda não passaram para o contrato HTTP.

## Limites de estado

| Tipo                                                     | Local correto                                |
| -------------------------------------------------------- | -------------------------------------------- |
| Dados de API, loading, erro, cache e invalidação         | TanStack Query.                              |
| Campos, validação, submissão e erro de formulário        | React Hook Form + Zod.                       |
| Modal aberto, foco, busca não submetida e seleção visual | Estado local do componente/feature.          |
| Tenant, papel e autorização                              | Sessão/backend; não é estado editável da UI. |

## Consequências

- Componentes ficam menores e agrupados por feature.
- Zod melhora feedback antecipado, mas a validação da API continua obrigatória.
- CSS Modules reduzem colisões; tokens evitam valores visuais duplicados e suportam impressão consistente.
- MSW permite testes previsíveis sem credenciais, rede ou dados Supabase.
- Não será introduzido state manager global adicional enquanto não existir caso concreto que TanStack Query e estado local não cubram.
