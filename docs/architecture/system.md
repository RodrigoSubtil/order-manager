# Arquitetura do sistema · v1.0.0

O Order Manager é uma aplicação React/TypeScript construída com Vite e publicada como SPA no Vercel. Usa Supabase Auth para a sessão e funções PostgreSQL (RPCs) para os dados. Não há API própria, Prisma, NestJS, Docker ou persistência offline nesta versão.

```text
Browser → Supabase Auth
        → RPCs autenticadas → membership/tenant/papel → PostgreSQL com RLS
        → diálogo de impressão do navegador → bobina de 80 mm
```

## Mapa do código

| Local                           | Responsabilidade                                               |
| ------------------------------- | -------------------------------------------------------------- |
| `apps/web/src/app`              | Providers, sessão e rotas (`/` e `/settings`)                  |
| `features/auth`                 | Login, sessão, cabeçalho e permissões de navegação             |
| `features/orders`               | Painel, filtros, formulário, clientes, responsáveis e produtos |
| `features/reports`              | Opções, agregação e preparação das páginas de impressão        |
| `features/settings`             | Gestão do catálogo e responsáveis pelo `OWNER`                 |
| `shared/components/ui`          | Controles reutilizáveis: diálogo, combobox, datas e hora       |
| `shared/lib/supabaseData.ts`    | Adaptador de todas as operações remotas                        |
| `shared/lib/productGrouping.ts` | Agrupamento do resumo de produção                              |
| `supabase/migrations`           | Schema, RLS, funções e evolução do banco                       |

O estado remoto é gerido com TanStack Query; os formulários usam React Hook Form e Zod. As validações do browser dão orientação, mas as RPCs, constraints e RLS são a fronteira efetiva de segurança.

## Fluxos principais

1. O login transforma o nome de utilizador numa identidade técnica do Supabase Auth. `web_session_context` devolve a membership ativa; o frontend nunca decide o `tenant_id`.
2. O painel lê encomendas, totais, catálogo e responsáveis por RPCs. Os indicadores globais não seguem os filtros da lista.
3. A criação/edição envia um `requestId` e, numa edição, a `version` atual. `web_save_order_with_responsible` resolve ou cria o responsável e guarda a encomenda transacionalmente. Conflitos exigem recarregar os dados.
4. O cliente pode ser escolhido pelas sugestões ou criado ao guardar. O seu telefone é guardado em dígitos internacionais e exibido no formato do país. O prefixo padrão é `+351`.
5. Concluir e apagar usam RPCs que removem permanentemente a encomenda e os itens depois da confirmação. Uma limpeza histórica anterior é assunto separado; não se deve inferir o estado do banco a partir do código.
6. A impressão consulta as encomendas do intervalo/área escolhidos, gera uma ficha por pedido ou um resumo e mede cada talão para criar páginas individuais de 80 mm com altura ajustada ao conteúdo.

## Regras de negócio que devem continuar explícitas

- `OWNER` e `OPERATOR` operam encomendas; apenas `OWNER` pode desbloquear **Gerenciar** com segunda senha.
- Entregas usam `Europe/Lisbon`, horas de meia em meia hora e janela de 08:00 a 21:00. Confirme a regra também na migration correspondente antes de a alterar.
- Cada item tem área, produto, quantidade e unidade `un`, `g` ou `kg`; observações são opcionais. Bolos são normalmente lançados em `g` ou `kg`.
- No resumo, apenas unidades `un` do mesmo produto e área são somadas. Pesos `g` e `kg` permanecem separados por encomenda e mostram o número do pedido; não há conversão automática entre unidades.
- A seleção de uma opção fecha a lista e desfoca o campo para recolher o teclado do telemóvel. Os campos de escrita com sugestões mantêm a escrita livre quando aplicável.
- O formulário mantém apenas dígitos de telefone e país; a formatação visual não modifica o valor guardado.

## Limites de verificação

Os testes de código não confirmam por si a migration no projeto real, o conteúdo do domínio publicado, o backup ativo ou a impressão física. Use [release e operação](../operations/release.md) e [backup](../operations/backup.md) para essas verificações.
