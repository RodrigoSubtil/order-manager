# Baseline de qualidade

Data da baseline: 15 de julho de 2026  
Escopo: instalação das dependências travadas no lockfile e execução de verificações existentes. Nenhuma regra de negócio, configuração de aplicação ou dado foi alterado.

## Ambiente verificado

| Item    | Versão                  |
| ------- | ----------------------- |
| Node.js | `v22.15.0`              |
| npm     | `10.9.2`                |
| Projeto | `order-manager` `0.1.0` |

## Instalação de dependências

O diretório `node_modules` estava ausente no início desta etapa. Após confirmação explícita, foi executado:

```bash
npm ci
```

O comando instalou 136 pacotes a partir de `package-lock.json` e não modificou `package.json` nem o lockfile. A auditoria automática do npm informou uma vulnerabilidade de severidade baixa. Ela foi apenas registada nesta baseline; nenhuma atualização ou correção automática foi aplicada.

## Dependências principais instaladas

| Pacote                      | Versão instalada |
| --------------------------- | ---------------- |
| React                       | `19.2.7`         |
| React DOM                   | `19.2.7`         |
| Supabase JS                 | `2.108.1`        |
| TypeScript                  | `5.9.3`          |
| Vite                        | `7.3.5`          |
| ESLint                      | `9.39.4`         |
| typescript-eslint           | `8.61.0`         |
| eslint-plugin-react-hooks   | `5.2.0`          |
| eslint-plugin-react-refresh | `0.4.26`         |

As versões instaladas são as resolvidas pelo `package-lock.json`, dentro das faixas declaradas no `package.json`.

## Verificações executadas

| Verificação          | Comando                                 | Resultado                     |
| -------------------- | --------------------------------------- | ----------------------------- |
| Lint                 | `npm run lint`                          | Aprovado sem avisos ou erros. |
| Typecheck            | `npx tsc -b --pretty false`             | Aprovado sem erros.           |
| Build de produção    | `npm run build`                         | Aprovado.                     |
| Testes automatizados | Não há script ou framework configurado. | Não executável nesta versão.  |

Resultado do build de produção:

```text
dist/index.html                   0.40 kB │ gzip:   0.27 kB
dist/assets/index-BsgYcjW7.css   24.92 kB │ gzip:   5.41 kB
dist/assets/index-DQzexH6T.js   437.60 kB │ gzip: 123.45 kB
```

## Erros e avisos existentes

- Lint: nenhum erro ou aviso retornado.
- TypeScript: nenhum erro retornado.
- Build: concluído com sucesso.
- Dependências: o npm reportou uma vulnerabilidade de severidade baixa durante a instalação. Os detalhes não foram investigados nesta etapa para evitar alterações fora de escopo.
- Testes: não existe infraestrutura de testes, portanto não há regressão funcional automaticamente verificável nesta baseline.

## Fluxos críticos que exigem testes

Os seguintes fluxos foram identificados como prioridade para a próxima etapa de testes de caracterização:

| Prioridade | Fluxo                      | Cenários mínimos a proteger                                                                          |
| ---------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Crítica    | Login                      | Credenciais válidas, inválidas, erro de RPC, restauração de sessão e logout.                         |
| Crítica    | Carregamento de encomendas | Loading, erro Supabase, lista vazia, ordenação por data/hora e mapeamento de produtos.               |
| Crítica    | Criação de encomenda       | Campos obrigatórios, responsável válido, ao menos um item, sucesso e falha de persistência.          |
| Crítica    | Edição de encomenda        | Pré-preenchimento, atualização de itens, erro de atualização e manutenção da propriedade do registo. |
| Crítica    | Exclusão                   | Confirmação, cancelamento, exclusão individual e exclusão por intervalo de datas.                    |
| Alta       | Filtros e pesquisa         | Data, categoria, texto, combinação de filtros e ausência de resultado.                               |
| Alta       | Impressão                  | Encomenda individual, lote por dia, período, modo detalhado e resumo de produção.                    |
| Alta       | Catálogo                   | Sugestões por categoria, pesquisa de produto e produto manual.                                       |
| Alta       | Responsáveis               | Lista, pesquisa, seleção válida e tentativa de submissão sem responsável válido.                     |
| Média      | Quantidades                | Unidades `un`, `kg` e `g`, soma de unidades e entradas inválidas.                                    |
| Média      | Interface                  | Dropdowns, modais, estados de loading, mensagens de erro e navegação por teclado.                    |

## Limitações desta baseline

- Não há testes unitários, integração ou end-to-end configurados.
- Não foi executado teste manual no navegador porque esta etapa não inclui configuração de variáveis Supabase nem credenciais de teste.
- Não foi verificado o schema, RLS, RPCs, dados ou backups Supabase; esses temas pertencem à auditoria de infraestrutura.
- Não há repositório Git nesta cópia para registar um commit de baseline.
- Não foi executado `npm audit fix`, pois isso poderia atualizar dependências e ultrapassar o escopo de registo.

## Decisão da etapa

A base de código local compila, passa no lint e gera build de produção com as dependências atualmente bloqueadas. A ausência de testes automatizados é a maior lacuna para iniciar uma refatoração segura. A próxima etapa deve adicionar testes de caracterização sem alterar o comportamento do produto.
