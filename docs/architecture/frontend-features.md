# Frontend por funcionalidades

Atualizado em 25 de julho de 2026.

## Estrutura

```text
apps/web/src/
  app/
    providers/       QueryClient e providers
    router/          navegação
  features/
    auth/            login, sessão e cabeçalho
    orders/          dashboard, filtros, formulário e cartões
    reports/         seleção e layout de impressão
    settings/        catálogo, responsáveis e recuperação
  shared/
    components/ui/   Button, Input, Select, Dialog, Combobox, DatePicker etc.
    hooks/           comportamentos reutilizáveis
    lib/             domínio, datas, RPCs, contingência e recuperação
  styles/            tokens, reset, global e print
```

`App.tsx` apenas monta providers e router. Páginas orquestram; componentes apresentam; hooks
concentram estado e efeitos; `supabaseData.ts` é o único adaptador de dados remotos.

## Estado

| Estado                                         | Ferramenta                |
| ---------------------------------------------- | ------------------------- |
| sessão, encomendas, catálogo e responsáveis    | TanStack Query + Supabase |
| formulário de login e encomenda                | React Hook Form + Zod     |
| modais, dropdowns, pesquisa e drafts da gestão | estado React local        |
| contingência                                   | localStorage por tenant   |
| arquivo de recuperação                         | IndexedDB por tenant      |

Não há Redux ou Zustand porque não existe estado global complexo que os justifique.

## Regras de interface

- controles interativos têm pelo menos 44 px;
- o layout alvo principal inclui 360 × 820 CSS pixels, equivalente aos 720 × 1640 píxeis físicos
  do Redmi A5 numa escala 2×, com uma verificação adicional em 377 × 858;
- filtros mantêm tipografia, borda e alinhamento consistentes;
- erros ficam junto dos campos e o primeiro inválido recebe foco;
- ações destrutivas e conclusão exigem confirmação;
- mensagens de sucesso no dashboard desaparecem em cinco segundos;
- CSS Modules mantém o estilo local; tokens evitam valores visuais divergentes.
