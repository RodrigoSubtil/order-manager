# Desenvolvimento e manutenção

## Ambiente

Use Node.js 22 e npm. Execute `npm ci`, copie `apps/web/.env.example` para `apps/web/.env.development.local` e configure a URL e a chave pública do Supabase de homologação (`czbrnxrpofdbbgbdyrad`). `npm run dev` serve `http://localhost:5174`, sem escolher outra porta se estiver ocupada. O Vite recusa iniciar o modo dev com outro projeto Supabase. O frontend não exige banco local, Docker, Prisma ou API NestJS. Os testes SQL da integração usam PostgreSQL descartável separado.

Com `VITE_ORDER_SCAN_ENABLED=true`, **Continuar** envia a fotografia para a mesma Edge Function usada em homologação. A simulação local foi retirada; `VITE_ORDER_SCAN_DEMO` já não tem efeito. Não coloque `OPENAI_API_KEY` no frontend. Leituras iniciadas no localhost usam o orçamento da empresa de teste no backend de homologação. Testes automáticos devem simular os serviços; as leituras reais em homologação ficam com o utilizador, conforme orientação de 08/10/2026.

| Comando                 | Validação                                |
| ----------------------- | ---------------------------------------- |
| `npm run format:check`  | Prettier, sem escrever arquivos          |
| `npm run lint`          | ESLint e Stylelint                       |
| `npm run typecheck`     | TypeScript                               |
| `npm run test`          | Vitest e React Testing Library           |
| `npm run test:coverage` | Cobertura das partes com limiar definido |
| `npm run build`         | Bundle de produção                       |

`npm run format` altera todo o repositório; em trabalho parcial, formate só os arquivos alterados. O workflow em `.github/workflows/quality.yml` é um gate adicional, não a verificação no dispositivo ou Supabase real.

Use npm run verify:release para executar todos os checks de aplicação. Para SQL, siga [supabase/tests](../../supabase/tests/README.md). A base canónica está em supabase/migrations; legacy_migrations não é uma sequência de deploy.

## Onde alterar

- Separe comportamento por feature em `apps/web/src/features`. Componentes compartilhados vivem em `shared/components/ui`; mudanças no `Combobox` afetam filtros, cliente, responsável, país e produtos.
- `shared/lib/supabaseData.ts` concentra chamadas remotas. Os payloads devem seguir as migrations e não transportar `tenant_id` escolhido no frontend.
- Formulário de pedido: `features/orders/components/OrderFormModal.tsx`, `CustomerPicker.tsx`, `ProductEditor.tsx`, `PhoneInput.tsx`, `schemas/orderSchema.ts` e `lib/orderFormMappers.ts`.
- Telefone: `features/orders/lib/phoneNumber.ts` formata apresentação por país; o formulário e o banco mantêm dígitos. Verifique campo, cartão, sugestões e impressão quando alterar essa lógica.
- Impressão: `features/reports/hooks/usePrintOrders.ts`, `components/PrintableOrders.tsx`, `lib/preparePrintPages.ts` e `styles/print.css`. Teste altura, página por pedido e agregação `un`/`g`/`kg` em `shared/lib/productGrouping.ts`.
- A versão é a de `apps/web/package.json`, lida por `shared/lib/appVersion.ts`. Atualize o registo em [release](../operations/release.md) quando a aumentar.

## Regras para alterações

Dados sintéticos nos testes; nunca adicionar senhas, tokens, `.env`, exports de clientes ou dumps ao Git. Toda migration é gerada pela CLI com um novo timestamp e inclui validação do caminho real de uso. Preserve a segurança de tenant, `version` e `requestId`. Ao mudar uma função, atualize o guia ativo correspondente e execute os testes proporcionais ao risco. Para prontidão de produção, siga o [smoke test publicado](../operations/release.md).

## Tipografia da interface

Siga o [style guide de tipografia](../design/typography.md). A escala e os papéis ficam em `apps/web/src/styles/typography.css`; componentes usam `font: var(--type-...)` em vez de definir tamanhos e pesos próprios. Campos usam 16 px em todas as larguras. O Stylelint impede valores tipográficos literais na interface. A ficha térmica tem uma exceção explícita e mantém a formatação de impressão.

## Espaçamentos e controles

Siga o [style guide de espaçamentos e controles](../design/spacing-and-controls.md), aplicado no código local. Reutilize os tokens de espaço, altura, raio, ícone e margens em `styles/tokens.css` e os controles compartilhados. O Stylelint protege `gap` e `border-radius`, além da tipografia. Preserve o cabeçalho compacto com alvo de toque ampliado, o cartão aprovado e a ficha térmica. Confira componentes em larguras de celular, tablet e computador, incluindo texto ampliado e janela baixa. O [índice do style guide](../design/README.md) informa a aplicação local e distingue publicação.

## Branches e promoção

`main` representa produção e `homologacao` representa o ambiente de validação. A branch remota `staging` foi renomeada; uma referência local antiga pode continuar a existir até atualizar o checkout. Confirme o remoto antes de usar um nome de branch antigo.

O Quality é disparado em PRs e pushes para main e homologacao; os jobs quality e database precisam passar antes da publicação. Vercel executa npm run verify:release no build, mas o job PostgreSQL é verificado pelo GitHub. A consulta final confirmou ausência de proteção clássica e de rulesets. O GitHub informou que rulesets não seriam aplicados neste repositório privado até migrar para uma organização Team. Nenhum plano ou regra foi alterado; enquanto isso, a revisão do PR/checks é manual.

Após validar Preview e migrations no banco de teste, prepare PR de `homologacao` para `main`, revise o diff e confirme compatibilidade com produção. Siga [o fluxo operacional](../operations/environments.md) e registre a publicação em [release](../operations/release.md). Reset de dados, seeds de teste e senhas não pertencem ao fluxo de deploy.
