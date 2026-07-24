# Etapa 23 — Design system, CSS Modules e acessibilidade

Data: 22 de julho de 2026

## Objetivo e resultado

O frontend preserva a identidade visual bege/marrom, mas deixou de depender do antigo `App.css` de 1.947 linhas. As fundações globais estão separadas por responsabilidade e os estilos de páginas, features e primitivas são locais por CSS Module.

Nenhuma regra de negócio, endpoint, banco ou configuração do Supabase foi alterada nesta etapa.

## Organização dos estilos

```text
apps/web/src/
  styles/
    tokens.css     # cores, espaços, raios, sombras, tipografia e camadas
    reset.css      # normalização mínima de elementos
    global.css     # documento, foco global e poucos atributos estruturais
    print.css      # página térmica de 80 mm e ocultação da interface de ecrã
  shared/components/ui/
    *.tsx
    *.module.css   # primitivas reutilizáveis
  features/**/
    *.tsx
    *.module.css   # layout e identidade local de cada componente
```

`styles/index.css` é o único agregador global. `App.css` foi removido depois de todos os seus consumidores terem sido migrados.

## Primitivas do design system

| Componente   | Responsabilidade                                                                       |
| ------------ | -------------------------------------------------------------------------------------- |
| `Button`     | variantes `primary`, `secondary`, `danger` e `ghost`, estado disabled e modo icon-only |
| `Input`      | campo base com foco visível, estado inválido e adaptação móvel                         |
| `Select`     | seleção nativa tipada para usos futuros                                                |
| `Dialog`     | semântica modal, foco inicial, retenção de Tab, Escape e restauração do foco           |
| `Combobox`   | input, trigger, listbox e options com navegação por setas, Home, End e Escape          |
| `Card`       | superfície reutilizável com elemento semântico configurável                            |
| `Alert`      | mensagens informativas e de erro anunciadas por leitor de ecrã                         |
| `Spinner`    | indicador de progresso com `role=status` e alternativa textual                         |
| `EmptyState` | loading, vazio e orientação de próximo passo                                           |
| `FieldError` | erro associado ao campo por `aria-describedby`                                         |

Os componentes aceitam propriedades HTML nativas. Isso mantém compatibilidade com React Hook Form, refs, atributos ARIA e cliente gerado da API.

## Acessibilidade aplicada

- Todos os campos de login e encomenda têm label explícita.
- Erros continuam associados por `aria-describedby`, usam `aria-invalid` e são anunciados.
- O primeiro campo inválido continua a receber foco pelo React Hook Form.
- Diálogos recebem `role=dialog`, `aria-modal`, título acessível, foco inicial e devolução do foco ao botão que os abriu.
- `Tab` e `Shift+Tab` ficam contidos no diálogo; `Escape` fecha o modal.
- Comboboxes expõem `role=combobox`, `listbox`, `option`, `aria-expanded`, `aria-controls` e `aria-selected`.
- Setas, Home, End e Escape funcionam nas opções dos comboboxes.
- O foco global usa uma borda azul perceptível que não depende apenas da paleta decorativa.
- Alvos móveis usam no mínimo 44 px nos controles principais.
- `prefers-reduced-motion` reduz a velocidade da única animação, o spinner.

## Contraste

Os tons da identidade foram mantidos, mas os usos interativos/textuais receberam tons mais escuros. Razões calculadas pelo algoritmo WCAG:

| Combinação                          |  Razão |
| ----------------------------------- | -----: |
| accent `#765f4b` sobre branco       | 5,98:1 |
| muted `#6b5c4d` sobre branco        | 6,44:1 |
| danger `#8b3f32` sobre branco       | 7,36:1 |
| ink `#4d4339` sobre cream `#f4ede3` | 8,30:1 |

As combinações verificadas superam 4,5:1 para texto normal.

## Responsividade e impressão

- Desktop validado a 1280 × 720 sem overflow horizontal.
- Celular validado a 390 × 844; painel e modal ficaram sem overflow horizontal.
- O modal móvel mantém cabeçalho e ações acessíveis, com conteúdo interno rolável.
- A impressão continua no navegador em rolo de `80mm`, com conteúdo útil limitado a `74mm`, margens de `3mm` em todos os lados, linhas de produto preservadas até à abertura do diálogo de impressão e interface de ecrã oculta.
- A folha impressa está em `PrintableOrders.module.css`; `styles/print.css` contém apenas as regras globais da página térmica.

Antes de implantação em cada modelo de impressora, faça uma prova física porque drivers podem adicionar margens ou escalas próprias.

## Verificação executada

- testes de caracterização do fluxo de login e criação de encomenda;
- testes de foco, Escape, restauração de foco e teclado do combobox;
- inspeção da árvore acessível do login, painel e formulário;
- inspeção visual do login, painel e modal em desktop;
- inspeção visual do painel e modal em celular;
- verificação de overflow e foco por leitura do DOM;
- Stylelint, ESLint, TypeScript e build de produção.

## MSW no navegador local

O mock de navegador pode ser ativado somente em desenvolvimento:

```env
VITE_ENABLE_MSW=true
```

O service worker fica em `apps/web/public/mockServiceWorker.js`. A flag é `false` por padrão e o import está protegido por `import.meta.env.DEV`, portanto não habilita mocks no build de produção.

`vite.config.ts` mantém o cache dentro do workspace e evita a descoberta automática que fazia o Vite tentar percorrer diretórios superiores no Windows. Isso afeta somente a otimização do servidor de desenvolvimento; o build de produção continua normal.

## Regras para evolução

1. Reutilize primeiro uma primitiva de `shared/components/ui`.
2. Estilo específico fica ao lado do componente em `*.module.css`.
3. Novo valor recorrente entra como token semântico; não crie variações quase iguais de cor/espaço.
4. Estado remoto continua no TanStack Query; estado visual local não pertence ao design system.
5. Toda nova interação precisa de nome acessível, foco visível e operação por teclado.
6. Mudanças na impressão devem ser validadas em preview e numa impressora térmica real.

## Limitações conhecidas

- A prova física em impressora térmica não pode ser feita pelo ambiente automatizado.
- Não foi adicionada uma ferramenta automática de auditoria WCAG nesta etapa; os contratos críticos possuem testes e foram inspecionados pela árvore acessível. Uma auditoria com Playwright + axe pode entrar na etapa de E2E.
- O `format:check` restrito aos arquivos da etapa passa. O comando global ainda aponta 36 arquivos antigos/gerados já registados na baseline; esta etapa não os reformatou para evitar mudanças fora do escopo.
- O repositório Git continua indisponível nesta cópia, por isso não foi possível produzir um diff Git confiável.
