# Baseline de testes de caracterização

> Nota de atualização: na Etapa 16A, os utilitários e respetivos testes foram movidos para `apps/web/src/shared/lib`; os cenários e regras desta baseline foram preservados.

Data: 15 de julho de 2026  
Escopo: primeira camada de testes para preservar o comportamento atual antes da refatoração estrutural. Não foram alteradas regras de negócio, interface visual, banco de dados ou chamadas Supabase reais.

## Ferramentas configuradas

| Ferramenta                    | Uso nesta aplicação                                    |
| ----------------------------- | ------------------------------------------------------ |
| Vitest                        | Executor de testes unitários e de componentes.         |
| JSDOM                         | Ambiente de navegador simulado para testes React.      |
| React Testing Library         | Testes de interface pelo ponto de vista do utilizador. |
| `@testing-library/jest-dom`   | Matchers semânticos para DOM.                          |
| `@testing-library/user-event` | Simulação de escrita e cliques.                        |
| `@vitest/coverage-v8`         | Relatório de cobertura inicial.                        |

Scripts adicionados:

```text
npm run test
npm run test:watch
npm run test:coverage
npm run typecheck
```

## Estrutura criada

```text
src/
├── App.test.tsx
├── lib/
│   ├── orderUtils.ts
│   └── orderUtils.test.ts
└── test/
    └── setup.ts

vitest.config.ts
```

Os utilitários puros que estavam em `App.tsx` foram movidos para `src/lib/orderUtils.ts`. A implementação foi preservada; a extração permite testá-los sem renderizar a página inteira.

## Cobertura atual

### Utilitários de encomenda

Cobertos por `src/lib/orderUtils.test.ts`:

- normalização de unidades (`un`, `kg`, `g` e sinónimos);
- interpretação de quantidade com vírgula decimal;
- comportamento de quantidade vazia ou texto não numérico;
- separação e junção de quantidade/unidade do formulário;
- agrupamento de produtos pela ordem fixa das categorias;
- resumo de impressão;
- soma de unidades em `un`;
- agrupamento de pedidos com quantidades não somáveis, como `kg`.

### Interface atual

Cobertos por `src/App.test.tsx`, com APIs isoladas por mocks:

- erro retornado pelo fluxo atual de login;
- estado de loading de encomendas;
- erro retornado ao carregar encomendas;
- filtro de encomendas pela pesquisa textual.

Os mocks permitem testar a reação da interface sem necessidade de credenciais ou banco Supabase durante esta etapa.

## Resultado da execução

```text
2 ficheiros de teste aprovados
7 testes aprovados
```

Cobertura inicial gerada por `npm run test:coverage`:

| Escopo                  | Statements | Branches | Functions |  Lines |
| ----------------------- | ---------: | -------: | --------: | -----: |
| Projeto                 |     38,05% |   27,22% |    32,98% | 38,29% |
| `src/lib/orderUtils.ts` |     92,30% |   65,78% |      100% | 95,83% |
| `src/App.tsx`           |     40,51% |   33,48% |    29,93% | 40,92% |

Não há threshold obrigatório nesta fase. O objetivo é criar uma rede de segurança inicial, não perseguir percentagens sem valor. Os próximos testes devem priorizar regras de negócio, segurança e fluxos de dados.

## Fluxos ainda não testáveis nesta camada

Os itens abaixo dependem de Supabase real, mocks HTTP estruturados ou de um navegador completo:

- autenticação real e expiração de sessão;
- funcionamento e segurança das RPCs `login_app_user` e `list_order_responsibles`;
- políticas RLS;
- criação, edição e exclusão contra o banco real;
- consistência entre `orders` e `order_products` após uma falha intermediária;
- permissões e isolamento futuro entre tenants;
- impressão real pelo navegador e impressora;
- comportamento em dispositivos móveis e navegadores diferentes;
- acessibilidade automatizada e manual;
- desempenho com grande volume de encomendas;
- recuperação de rede, timeout e erros HTTP;
- backup, restore, migrations e rollback.

## Fluxos que dependerão de testes end-to-end futuramente

Quando a API NestJS, ambientes de teste e Playwright existirem, devem ser automatizados:

1. Login, logout, renovação e expiração de sessão.
2. Criação de encomenda com itens, responsável e data de entrega.
3. Edição sem perda de itens.
4. Conflito entre dois utilizadores a editar a mesma encomenda.
5. Exclusão individual, cancelamento e exclusão por período.
6. Pesquisa, filtros por data/categoria e paginação futura.
7. Catálogo e responsáveis por empresa.
8. Resumo de produção e impressão.
9. Autorização por papel (`OWNER`, `ADMIN`, `OPERATOR`).
10. Isolamento absoluto entre tenants.
11. Fluxos de erro, indisponibilidade e recuperação da API.
12. Navegação por teclado e verificações de acessibilidade.

## Qualidade verificada nesta etapa

| Verificação             | Resultado                     |
| ----------------------- | ----------------------------- |
| `npm run test`          | Aprovado: 7 testes.           |
| `npm run test:coverage` | Aprovado e relatório gerado.  |
| `npm run lint`          | Aprovado sem erros ou avisos. |
| `npm run typecheck`     | Aprovado sem erros.           |
| `npm run build`         | Aprovado.                     |

## Limitações conhecidas

- O Vitest precisa ser executado fora do sandbox deste ambiente porque o esbuild resolve diretórios superiores ao projeto durante a inicialização. Isso é uma limitação do ambiente de execução, não do projeto.
- A cobertura não inclui `authApi.ts`, `ordersApi.ts` ou `supabaseClient.ts`, pois as integrações Supabase ainda serão auditadas separadamente e não devem receber testes que usem dados ou segredos reais.
- Não foi configurado MSW nesta etapa. Ele entra quando a interface deixar de depender diretamente do Supabase e começar a consumir a API documentada.
- O npm continua a reportar uma vulnerabilidade de severidade baixa já registada em `docs/baseline.md`; nenhuma atualização automática foi aplicada.

## Próxima etapa autorizável

A próxima etapa do roteiro é a auditoria somente de leitura do Supabase: schema, RPCs, RLS, autenticação, dados, backups e riscos de migração. Nenhuma migration ou alteração de produção deve ser executada nessa auditoria.
