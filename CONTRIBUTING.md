# Como contribuir

## Princípios

- Preserve o comportamento existente; alterações de regra de negócio exigem teste e documentação.
- Não coloque segredos, dados reais, chaves service-role ou dumps no repositório.
- Não execute migrations nem ações no Supabase de produção sem autorização explícita e runbook aprovado.
- Mantenha alterações pequenas, focadas e verificáveis.

## Preparação local

```bash
npm ci
npm run dev
```

Use Node.js e npm nas versões registadas em `docs/baseline.md`. Copie somente variáveis públicas necessárias para desenvolvimento para um `.env` local; esse arquivo é ignorado pelo Git.

## Verificação antes de entregar

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run format` aplica somente formatação. Revise o diff antes de o incluir em uma alteração funcional.

## Convenções de imports

1. Imports externos primeiro.
2. Uma linha em branco separa imports externos dos internos.
3. Imports internos usam caminho relativo até existir alias de projeto configurado.
4. Imports de tipo usam `import type` quando possível.
5. Evite imports circulares e não importe detalhes internos de outra feature; exponha uma interface pública do módulo quando necessário.

Exemplo:

```ts
import { useMemo } from 'react';

import type { Order } from '../types';
import { formatDate } from './orderUtils';
```

## Convenções de nomes

| Elemento             | Convenção                                                            | Exemplo                     |
| -------------------- | -------------------------------------------------------------------- | --------------------------- |
| Componentes React    | `PascalCase.tsx`                                                     | `OrderForm.tsx`             |
| Hooks                | `useNome.ts`                                                         | `useOrders.ts`              |
| Utilitários          | `camelCase.ts`                                                       | `orderUtils.ts`             |
| Serviços/API         | `camelCaseApi.ts` até a API NestJS; depois `*.service.ts` no backend | `ordersApi.ts`              |
| Tipos                | `PascalCase`                                                         | `Order`, `CreateOrderInput` |
| Funções e variáveis  | `camelCase`                                                          | `loadOrders`                |
| Constantes imutáveis | `UPPER_SNAKE_CASE` quando representam configuração global            | `MAX_PAGE_SIZE`             |
| Classes CSS          | `kebab-case`                                                         | `.order-card`               |
| Testes               | mesmo nome do alvo + `.test.ts(x)`                                   | `orderUtils.test.ts`        |

O código existente não deve ser renomeado em massa nesta etapa. A convenção é aplicada gradualmente em arquivos novos ou ao tocar uma feature de forma justificada.

## Commits

Quando o repositório Git estiver corretamente inicializado e tiver remoto confirmado, use Conventional Commits:

```text
feat(orders): add order print summary
fix(auth): reject expired session
docs(architecture): document api contract
test(orders): cover optimistic concurrency
chore(tooling): configure prettier
```

Tipos permitidos inicialmente: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `build` e `perf`. O assunto é curto, no imperativo e sem ponto final. Não crie commits genéricos como `update` ou `changes`.

## Pull requests

Descreva objetivo, risco, testes executados, efeito em dados/segurança e screenshots quando houver alteração visual. Para mudanças de tenant, autenticação, RLS, migrations ou retenção, inclua o ADR/documentação aplicável e um plano de rollback.
