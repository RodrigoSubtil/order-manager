# Baseline visual e responsiva do frontend

- Data: 25 de setembro de 2026
- Projeto: Order Manager
- Ambiente observado: frontend local em `http://localhost:5173/`
- Commit de partida: `80faaa7b3af3ca1bc7fcb27daa8fcecd296c4d3b`
- Branch: `main`, acompanhando `origin/main`
  Etapa do plano: Etapa 0 — Baseline e inventário verificável

## 1. Resultado

A baseline foi produzida sem alterar componentes, estilos, regras de negócio ou dados. O inventário estático é reproduzível, o JSON gerado é válido e duas execuções do auditor produziram o mesmo SHA-256.

O navegador confirmou o painel sem overflow horizontal em 1440, 1024, 768, 390 e 360 px. Em 320 px, a página principal apresentou 15 px de overflow quando o navegador reservou espaço para uma scrollbar tradicional. Os modais de encomenda e impressão abriram no topo em 390 e 320 px, mantiveram as ações visíveis, fecharam com Escape e com o botão de fechar e devolveram o foco ao botão de origem.

Não foram encontrados problemas P0 ou P1 nesta auditoria. Foram registados problemas P2 de acessibilidade, limite responsivo e validação física da impressão, além de dívidas P3 de padronização e manutenção.

## 2. Estado Git inicial

O working tree já estava alterado antes da Etapa 0:

- 48 arquivos rastreados modificados;
- 17 entradas não rastreadas, algumas representando diretórios;
- diff rastreado de 835 inserções e 398 remoções;
- alterações existentes em frontend, documentação, migrations e testes;
- `docs/plano-aperfeicoamento-visual.md` já era um arquivo não rastreado.

As listas completas estão preservadas em:

- `docs/reports/frontend-visual-baseline/git-status-before.txt`;
- `docs/reports/frontend-visual-baseline/git-diff-stat-before.txt`;
- `docs/reports/frontend-visual-baseline/git-diff-names-before.txt`;
- `docs/reports/frontend-visual-baseline/git-head.txt`.

Nenhum desses arquivos preexistentes foi revertido ou absorvido como correção desta etapa.

## 3. Escopo e exclusões

### Incluído

- CSS global, reset, tokens e impressão;
- CSS Modules;
- componentes compartilhados e componentes de feature;
- valores CSS, tokens, breakpoints, estados e camadas;
- comportamento responsivo real;
- painel, filtros, estado vazio, modais e acesso gerencial;
- baseline de acessibilidade;
- lint, testes e build.

### Excluído

- alterações visuais ou funcionais;
- mudanças em Supabase ou banco;
- criação, edição, conclusão ou exclusão de dados;
- login em runtime, porque a sessão autenticada existente foi preservada;
- conteúdo gerencial protegido por senha;
- cards preenchidos, porque o painel visível tinha zero encomendas;
- prova física da impressão;
- zoom real do navegador, não exposto pela capacidade de viewport usada.

## 4. Metodologia

1. O estado Git foi capturado antes da criação dos artefatos.
2. Todos os 141 arquivos existentes em `apps/web/src` receberam hash SHA-256.
3. O script `scripts/audit-frontend-styles.mjs` analisou o CSS com PostCSS.
4. O inventário foi executado duas vezes e comparado por SHA-256.
5. O JSON foi validado por parsing.
6. A aplicação local foi medida em oito combinações de viewport.
7. Os modais foram medidos em 390 e 320 px.
8. Interações foram exercitadas sem salvar dados.
9. Os hashes dos 141 arquivos de aplicação foram calculados novamente.
10. O resultado antes/depois foi idêntico: zero diferenças em `apps/web/src`.

## 5. Níveis de evidência

| Nível          | Significado neste relatório                         |
| -------------- | --------------------------------------------------- |
| ESTÁTICA       | Encontrado no código, CSS ou árvore de componentes  |
| AUTOMATIZADA   | Comprovado pelo auditor, hash, lint, teste ou build |
| RUNTIME        | Observado na aplicação local real pelo navegador    |
| FÍSICA         | Depende do equipamento real da pastelaria           |
| NÃO VERIFICADA | Não houve acesso ou cenário seguro para comprovar   |

## 6. Artefatos reproduzíveis

| Artefato                            | Finalidade                              |
| ----------------------------------- | --------------------------------------- |
| `scripts/audit-frontend-styles.mjs` | Inventário estático determinístico      |
| `style-inventory.json`              | Dados estruturados de CSS e componentes |
| `runtime-measurements.json`         | Medições sanitizadas do navegador       |
| `contrast-baseline.json`            | Contrastes principais da paleta         |
| `script-validation.txt`             | Prova das duas execuções estáveis       |
| `app-source-hashes-before.json`     | Hashes do código antes da auditoria     |
| `app-source-hashes-after.json`      | Hashes do código depois da auditoria    |
| `source-integrity.txt`              | Resultado da comparação dos hashes      |

O inventário não contém timestamp variável; por isso, o mesmo código-fonte produz o mesmo JSON.

## 7. Inventário da estrutura

### Quantidades

| Item                                         | Quantidade |
| -------------------------------------------- | ---------: |
| Arquivos CSS                                 |         40 |
| CSS Modules                                  |         35 |
| Arquivos globais                             |          4 |
| Arquivos classificados como impressão        |          2 |
| Linhas CSS                                   |      3.357 |
| Declarações CSS                              |      1.719 |
| Declarações de tela                          |      1.599 |
| Declarações de impressão                     |        120 |
| Componentes TSX não classificados como teste |         43 |
| Componentes com SVG inline                   |          6 |

### Maiores folhas de estilo

| Arquivo                      | Linhas | Declarações |
| ---------------------------- | -----: | ----------: |
| `OrderCard.module.css`       |    320 |         173 |
| `OrderFilters.module.css`    |    284 |         148 |
| `DatePicker.module.css`      |    224 |         123 |
| `ManagementPanel.module.css` |    221 |          93 |
| `TimePicker.module.css`      |    202 |         114 |
| `LoginPage.module.css`       |    193 |         105 |
| `PrintableOrders.module.css` |    184 |         100 |
| `SettingsPage.module.css`    |    145 |          69 |
| `ProductEditor.module.css`   |    143 |          65 |
| `SessionHeader.module.css`   |    121 |          71 |

### Organização

- `styles/index.css` agrega tokens, reset, global e impressão.
- `styles/tokens.css` concentra cores, raios, sombras e algumas dimensões.
- `shared/components/ui` contém as primitivas reutilizáveis.
- `features/**` mantém CSS local por componente.
- `styles/print.css` e `PrintableOrders.module.css` formam o sistema de impressão.

### CSS Modules sem importação encontrada

Evidência ESTÁTICA:

- `apps/web/src/features/auth/components/LogoutConfirmDialog.module.css`;
- `apps/web/src/shared/components/ui/FieldError.module.css`.

A remoção pertence à Etapa 15. Esta etapa apenas registou os candidatos.

## 8. Tokens e valores CSS

### Tokens

| Métrica                              | Resultado |
| ------------------------------------ | --------: |
| Propriedades customizadas definidas  |        40 |
| Propriedades customizadas utilizadas |        32 |
| Tokens definidos e sem uso           |         8 |
| Tokens usados sem definição          |         0 |

Tokens sem uso encontrados:

- `--field-icon-inset`;
- `--field-icon-slot-size`;
- `--space-2`;
- `--space-3`;
- `--space-4`;
- `--space-5`;
- `--space-6`;
- `--space-7`.

`--space-1` possui somente um uso. Os tokens de cor são utilizados de forma consistente: `--color-white` aparece 36 vezes, `--color-line` 33, `--color-accent` e `--color-ink` 29 cada e `--color-muted` 28.

### Fragmentação dos valores

| Propriedade      | Valores únicos | Usos |
| ---------------- | -------------: | ---: |
| `font-size`      |             44 |   99 |
| `font-weight`    |              6 |   62 |
| `line-height`    |             11 |   30 |
| `letter-spacing` |              5 |   10 |
| `gap`            |             17 |   99 |
| `padding`        |             54 |  118 |
| `margin`         |              6 |   27 |
| `width`          |             31 |   69 |
| `height`         |             24 |   46 |
| `min-height`     |             22 |   39 |
| `border-radius`  |             10 |   53 |
| `box-shadow`     |             15 |   23 |
| `z-index`        |              7 |    7 |

### Valores dominantes

- Tamanhos: `1rem`, `0.9rem`, `0.78rem`, `0.82rem`, `0.86rem` e `0.8rem`.
- Pesos: 800 em 28 regras, 900 em 16 e 700 em 12.
- Gaps: 10 px em 19 regras, 16 px e 8 px em 14 cada, 12 px em 13 e 18 px em 9.
- Alturas: 48 px, 46 px, 42 px, 36 px, 34 px e 44 px.
- Raios: `--radius-md` em 25 regras e `--radius-lg` em 11.
- Sombras: 15 valores diferentes; o anel de foco de 3 px é o mais repetido.

### Unidades

O CSS usa principalmente 585 ocorrências de `px`, 94 de `rem`, 59 de `fr` e 15 de `mm`. Também existem 8 ocorrências de `dvh`, mostrando que viewport dinâmica já é usada nos diálogos.

### Cores diretas

O inventário aproximado encontrou 37 formas de cor direta em 145 usos fora de definições de tokens. Considerando as 18 propriedades dimensionais e tipográficas monitoradas, foram encontrados 281 valores distintos em 754 usos. Entre as cores diretas estão:

- branco nominal e `#ffffff`, em parte ligados à impressão;
- `#111111`, usado na impressão;
- fundo global `#f6f9f8`;
- destaque `#f5d98b`;
- diversas cores alfa para foco, sombras e sobreposições;
- usos de `color-mix()`.

As cores de impressão e cores alfa funcionais não devem ser convertidas automaticamente.

## 9. Padrões atuais

### Cor

A identidade usa marrom, bege e branco com estados de perigo, sucesso e foco separados. O sistema é coerente e a maioria das cores semânticas está centralizada.

### Contraste

| Uso                            |  Razão | Resultado de baseline            |
| ------------------------------ | -----: | -------------------------------- |
| Texto principal sobre branco   | 9,64:1 | forte                            |
| Texto secundário sobre branco  | 6,44:1 | forte                            |
| Marrom principal sobre branco  | 5,98:1 | adequado                         |
| Erro sobre fundo de erro       | 6,96:1 | adequado                         |
| Sucesso sobre fundo de sucesso | 6,51:1 | adequado                         |
| Foco azul sobre branco         | 4,24:1 | visível                          |
| Placeholder sobre branco       | 2,95:1 | abaixo do alvo para texto normal |

### Tipografia

A pilha declara `Inter`, mas o projeto não possui `@font-face` nem import de fonte. A renderização depende da fonte instalada ou do fallback do sistema. O uso intenso de 800 e 900 dá personalidade, mas reduz a diferença entre níveis de informação.

### Espaçamento

Os layouts usam `gap` e `padding`, evitando margens colapsáveis. Entretanto, a escala de tokens de espaço quase não é consumida e existem 17 gaps e 54 paddings diferentes.

### Controles

- Input e select compartilhados: 42 px no desktop e 48 px no telemóvel.
- Filtros: 46 a 48 px.
- Botões gerais: mínimo de 40 px; 44 px no breakpoint móvel.
- Ações dos cards: 44 a 46 px.
- Fechar modal: 36 px.
- Triggers de combobox: 34 a 36 px.
- Dias do calendário: 38 a 42 px.
- Ações do cabeçalho: 30 a 32 px.

### Ícones

O componente compartilhado usa normalmente 20 px, mas há ocorrências de 15, 22, 24, 25 e 26 px. Seis componentes ainda contêm SVG inline: `SessionHeader`, `DeleteOrderDialog`, `OrderCard`, `OrderFilters`, `ManagementAccessGate` e o próprio `Icon`.

### Breakpoints

| Breakpoint         | Ocorrências |
| ------------------ | ----------: |
| `max-width: 560px` |          24 |
| `max-width: 900px` |           8 |
| `max-width: 390px` |           2 |
| `max-width: 520px` |           1 |
| `max-width: 760px` |           1 |

O modelo predominante é desktop, tablet em 900 px e telemóvel em 560 px. 390, 520 e 760 px são exceções locais.

### Camadas

Existem tokens para dropdown (`20`) e diálogo (`100`), além de incrementos calculados para calendário e seletor de hora. A estrutura é curta e compreensível.

### Estados

O auditor encontrou seletores para hover, foco, disabled, active, loading, erro e sucesso. Há uma regra de `prefers-reduced-motion` e nenhuma regra de `forced-colors`.

### Impressão

A impressão está separada em 120 declarações e utiliza dimensões de 80 mm. A interface impressa possui fonte e paleta próprias. A prova no dispositivo físico permanece obrigatória.

## 10. Componentes auditados

| Componente           | Baseline estática/runtime                                       | Risco ou observação                                                      |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Button               | Variantes compartilhadas; 40 px desktop e 44 px móvel           | Modo icon-only pode ficar abaixo de 44 px                                |
| Input                | 42/48 px, erro e foco compartilhados                            | Sem risco estrutural observado                                           |
| Select               | 42/48 px e espaço para seta                                     | Trigger visual depende de ícone local                                    |
| Combobox             | Listbox e teclado presentes; abertura/fechamento observados     | Trigger 34/36 px; lista em container rolável precisa de conteúdo extremo |
| DatePicker           | Calendário com semântica de diálogo observada                   | Dias de 38/42 px e navegação de 36 px                                    |
| TimePicker           | Overlay e opções presentes                                      | Árvore de opções extensa; interação detalhada não foi guardada           |
| Dialog               | Foco, Escape, restauração e corpo rolável comprovados           | Painel correto; controles internos pequenos                              |
| DialogHeader         | Cabeçalho compartilhado de 57 px no móvel                       | Fechar mede 36 × 36 px                                                   |
| DialogActions        | Duas colunas e rodapé fixo                                      | Sem corte em 390/320 px                                                  |
| Alert                | Estados semânticos e cores centralizadas                        | Usa `color-mix`; compatibilidade deve ser formalizada                    |
| FormMessage          | Hint, erro e sucesso compartilhados                             | Baseline estática                                                        |
| FieldError           | Delega apresentação ao FormMessage                              | CSS Module antigo parece sem uso                                         |
| Spinner              | Única animação registrada                                       | Reduced motion apenas altera a animação atual                            |
| EmptyState           | Carregamento, vazio e orientação                                | Estado vazio confirmado em runtime                                       |
| LoginPage            | Card próprio, largura máxima de 420 px                          | Runtime não verificado para preservar a sessão                           |
| SessionHeader        | Responsivo e visualmente integrado                              | Gerenciar 32 px; Sair 30 × 32 px                                         |
| ManagementAccessGate | Campo 48 px e Entrar 44 px em 390                               | Dois `h1`; mostrar senha 34 px                                           |
| OrdersPage           | Shell responsivo e página principal                             | 320 px apresenta overflow limítrofe                                      |
| OrderIndicators      | Três colunas em todas as larguras                               | Labels chegam a 9,28 px em 320                                           |
| OrderFilters         | Seis colunas no desktop e duas após 900 px                      | Seta 34/36 px; arquivo possui 284 linhas                                 |
| OrderList            | Lista e estado vazio                                            | Cards preenchidos não verificados em runtime                             |
| OrderCard            | Ações de 44/46 px e CSS detalhado                               | Conteúdo extremo e centralização da data não comprovados                 |
| OrderFormModal       | Duas colunas e depois uma; rodapé fixo                          | Oito ações internas abaixo de 44 px                                      |
| CustomerPicker       | Uma letra abre sugestões; clique fora fecha                     | Consulta sanitizada não retornou opções; dados reais não foram lidos     |
| ProductEditor        | Campos de área, produto, quantidade e unidade                   | Triggers 36 px; Remover 34 px                                            |
| PrintOptionsDialog   | Abre no topo e preserva rodapé                                  | Radio visual 18 px, mas label associado é o alvo maior                   |
| PrintableOrders      | Sistema térmico separado                                        | Resultado físico e pedido longo não comprovados                          |
| SettingsPage         | Shell e grid responsivo por CSS                                 | Conteúdo protegido não verificado em runtime                             |
| ManagementPanel      | Listas e formulários gerenciais                                 | Breakpoint próprio de 760 px e arquivo de 221 linhas                     |
| Confirmações         | Estrutura compartilhada para concluir, excluir, sair e settings | Sem encomendas, não foi possível abrir confirmações de card              |

## 11. Matriz responsiva em runtime

| Cenário    | Documento    | Indicadores | Resultado                                              |
| ---------- | ------------ | ----------- | ------------------------------------------------------ |
| 1440 × 900 | 1440/1440 px | 460 px cada | Sem overflow; toolbar em seis colunas                  |
| 1024 × 768 | 1009/1009 px | 316 px cada | Sem overflow; toolbar em seis colunas                  |
| 768 × 900  | 753/753 px   | 235 px cada | Sem overflow; toolbar em duas colunas                  |
| 390 × 844  | 375/375 px   | 116 px cada | Sem overflow; toolbar em duas colunas                  |
| 360 × 800  | 345/345 px   | 106 px cada | Sem overflow; toolbar em duas colunas                  |
| 320 × 700  | 305/320 px   | 97 px cada  | Overflow horizontal de 15 px com scrollbar tradicional |
| 844 × 390  | 829/829 px   | 260 px cada | Paisagem sem overflow; rolagem vertical necessária     |
| 390 × 500  | 375/375 px   | 116 px cada | Altura reduzida sem overflow horizontal                |

Não foram encontrados elementos cortados ou posicionados fora da viewport nas telas medidas. O scanner não apontou containers horizontais internos estourados; o problema de 320 px ocorre no documento por causa do mínimo de 320 px combinado com os 15 px reservados à scrollbar.

## 12. Medições dos modais

### Encomenda

| Medição             |    390 × 844 |    320 × 700 |
| ------------------- | -----------: | -----------: |
| Painel              | 366 × 820 px | 296 × 676 px |
| Cabeçalho           |        57 px |        57 px |
| Corpo visível       |       702 px |       558 px |
| Conteúdo do corpo   |     1.206 px |     1.225 px |
| Rodapé              |        69 px |        69 px |
| `scrollTop` inicial |            0 |            0 |
| Overflow horizontal |          não |          não |
| Botões visíveis     |          sim |          sim |

### Impressão

| Medição             |    390 × 844 |    320 × 700 |
| ------------------- | -----------: | -----------: |
| Painel              | 366 × 820 px | 296 × 676 px |
| Cabeçalho           |        57 px |        57 px |
| Corpo visível       |       693 px |       548 px |
| Conteúdo do corpo   |       729 px |       729 px |
| Rodapé              |        69 px |        70 px |
| `scrollTop` inicial |            0 |            0 |
| Overflow horizontal |          não |          não |
| Botões visíveis     |          sim |          sim |

Evidência RUNTIME:

- ambos começam no topo;
- Escape fecha;
- o botão “Fechar” fecha;
- o foco volta para “Nova encomenda” ou “Imprimir todas”;
- Shift+Tab a partir do primeiro controle permaneceu dentro do diálogo e moveu o foco para “Salvar”.

## 13. Acessibilidade de baseline

### Pontos comprovados

- foco global visível de 3 px;
- inputs do formulário possuem nomes acessíveis;
- diálogo usa título, `role=dialog` e `aria-modal`;
- Escape, retenção e restauração de foco funcionam;
- calendário expõe semântica de diálogo e botões nomeados;
- comboboxes de responsável e produto expõem e atualizam `aria-expanded`;
- clique fora fecha os dropdowns observados;
- inputs móveis usam 16 px;
- mensagens e componentes possuem suporte estático a `aria-invalid` e `aria-describedby`;
- testes automatizados de acessibilidade existentes passaram dentro do conjunto de 119 testes.

### Pendências

- Gerenciar: 88 × 32 px;
- Sair: 32 × 30 px;
- seta do filtro: 34/36 px;
- fechar modal: 36 × 36 px;
- triggers internos: 36 × 36 px;
- Remover produto: 100 × 34 px;
- placeholder: 2,95:1 sobre branco;
- indicadores móveis: 10,93 px em 390, 10,08 px em 360 e 9,28 px em 320;
- dois `h1` na tela de acesso gerencial;
- nenhuma regra `forced-colors`;
- zoom real de navegador e leitor de tela não foram executados nesta etapa.

## 14. Pontos positivos

- separação clara entre global, módulos e impressão;
- paleta consistente e contrastes fortes nos textos essenciais;
- zero tokens utilizados sem definição;
- raios principais já centralizados;
- apenas uma escala curta de z-index;
- toolbar reorganiza corretamente em 900 px;
- modais móveis têm estrutura robusta;
- nenhum overflow entre 360 e 1440 px;
- nenhum elemento cortado nas telas vazias observadas;
- foco e teclado dos diálogos funcionam em runtime;
- código-fonte permaneceu byte a byte inalterado durante a auditoria;
- lint, 119 testes e build foram aprovados.

## 15. Inconsistências

- 44 tamanhos de fonte e 11 line-heights;
- 17 gaps e 54 paddings;
- 8 tokens definidos sem uso;
- controles visualmente relacionados entre 30 e 48 px;
- seis componentes com SVG inline;
- cinco breakpoints efetivos;
- 15 sombras diferentes;
- fonte Inter declarada sem fornecimento pelo projeto;
- ausência de alto contraste forçado;
- dois CSS Modules aparentemente sem consumidor;
- bundle principal maior que o limite padrão de aviso do Vite;
- impressão física não comprovada.

## 16. Matriz de severidade

| ID      | Prioridade | Problema                                                  | Evidência             | Impacto/frequência                                    | Esforço | Etapa | Estado |
| ------- | ---------- | --------------------------------------------------------- | --------------------- | ----------------------------------------------------- | ------- | ----: | ------ |
| VIS-001 | P2         | Overflow do documento em 320 px com scrollbar tradicional | RUNTIME               | Limite mínimo; conteúdo ainda acessível com rolagem   | médio   |     6 | ABERTO |
| VIS-002 | P2         | Ações de 30 a 36 px abaixo do alvo de 44 px               | RUNTIME/ESTÁTICA      | Frequente em cabeçalho, filtros e formulário          | médio   |     4 | ABERTO |
| VIS-003 | P2         | Labels dos indicadores entre 9,28 e 10,93 px no móvel     | RUNTIME               | Frequente na página principal                         | baixo   |   2/8 | ABERTO |
| VIS-004 | P2         | Placeholder com contraste aproximado de 2,95:1            | AUTOMATIZADA          | Todos os placeholders; labels mitigam o impacto       | baixo   |    12 | ABERTO |
| VIS-005 | P2         | Impressão de pedido longo não comprovada fisicamente      | FÍSICA/NÃO VERIFICADA | Pode afetar a operação em pedidos extensos            | médio   |    14 | ABERTO |
| VIS-006 | P3         | 44 tamanhos de fonte                                      | AUTOMATIZADA          | Dívida transversal de consistência                    | médio   |   1/2 | ABERTO |
| VIS-007 | P3         | Escala de espaço definida, porém quase sem uso            | AUTOMATIZADA          | Dívida transversal                                    | médio   |   1/3 | ABERTO |
| VIS-008 | P3         | Ícones em múltiplos tamanhos e SVG inline                 | ESTÁTICA              | Visual e manutenção                                   | médio   |     5 | ABERTO |
| VIS-009 | P3         | Breakpoints locais em 390, 520 e 760 px                   | AUTOMATIZADA          | Pode causar transições inconsistentes                 | médio   |     6 | ABERTO |
| VIS-010 | P3         | Inter declarada sem arquivo ou import                     | ESTÁTICA              | Aparência pode variar por equipamento                 | baixo   |     2 | ABERTO |
| VIS-011 | P3         | Dois CSS Modules sem importação encontrada                | AUTOMATIZADA          | Manutenção                                            | baixo   |    15 | ABERTO |
| VIS-012 | P3         | Dois `h1` na tela de acesso gerencial                     | RUNTIME               | Hierarquia semântica                                  | baixo   |  7/12 | ABERTO |
| VIS-013 | P3         | Sem `forced-colors`; reduced motion limitado              | AUTOMATIZADA          | Acessibilidade em configurações específicas           | médio   |    12 | ABERTO |
| VIS-014 | P3         | Bundle JS de 658,73 kB minificado                         | AUTOMATIZADA          | Risco de carregamento móvel; não medido em rede lenta | médio   |    16 | ABERTO |

Contagem: P0 = 0, P1 = 0, P2 = 5, P3 = 9.

## 17. Ideias novas classificadas

| Ideia                           | Classe      | Benefício                       | Risco/complexidade              | Decisão                                             |
| ------------------------------- | ----------- | ------------------------------- | ------------------------------- | --------------------------------------------------- |
| Auditor reutilizável de estilos | ESSENCIAL   | Baseline repetível              | Baixo/médio                     | Aplicado                                            |
| Inventário JSON                 | ESSENCIAL   | Comparação automática           | Baixo                           | Aplicado                                            |
| Matriz de severidade            | ESSENCIAL   | Prioriza trabalho futuro        | Baixo                           | Aplicado                                            |
| Medições automáticas do DOM     | RECOMENDADA | Prova overflow, tamanho e modal | Baixo/médio                     | Aplicado no navegador; resultado sanitizado em JSON |
| Screenshots sanitizados         | RECOMENDADA | Comparação visual humana        | Risco de registrar sessão/dados | Adiado; nenhuma imagem persistida nesta execução    |
| Galeria interna de diagnóstico  | OPCIONAL    | Visualiza componentes e estados | Exige alterar o frontend        | Apenas proposta; não implementada                   |
| Histórico de baseline           | RECOMENDADA | Rastreia ambiente e evolução    | Baixo                           | Aplicado com commit, data, hashes e comandos        |

### Proposta para a galeria futura

Uma galeria pode viver somente em desenvolvimento, usar fixtures sem dados pessoais e expor cada componente nos estados normal, foco, disabled, erro, loading, conteúdo curto e conteúdo extremo. A implementação deve ser decidida numa etapa própria para não misturar diagnóstico com alteração da aplicação.

## 18. Estados não verificados

- Login em runtime: exigiria sair da sessão existente.
- Conteúdo gerencial: exigiria senha, que não foi solicitada nem contornada.
- Cards preenchidos: o painel tinha zero encomendas.
- Conteúdo extremo real: não foram criados dados temporários.
- Confirmação de concluir e excluir: dependem de card existente.
- WhatsApp com telefone real: não foi aberto.
- Leitor de tela: não executado.
- Zoom real de 125%, 150% e 200%: capacidade indisponível; reflow foi medido por largura.
- Impressão física: requer impressora e driver da pastelaria.
- Produção Vercel: não foi usada como prova do estado local.

## 19. Resultados técnicos

### Auditor

- Execução 1: sucesso.
- Execução 2: sucesso.
- SHA-256 das duas saídas: `742c2ce43504d62d55b9e015e30e021f47fbfd2ce3e13decd333f8dae7e3d1b9`.
- Saída estável: sim.
- JSON válido: sim.
- Digest dos arquivos CSS: `cd70aeef9c092b28d3f5ace078464c42105534f128d6b121744c30d388675d97`.

### Integridade da aplicação

- Arquivos em `apps/web/src` antes: 141.
- Arquivos em `apps/web/src` depois: 141.
- Diferenças de SHA-256: 0.

### Lint

`npm run lint --workspace @order-manager/web`: aprovado, incluindo ESLint e Stylelint.

### Testes

`npm run test --workspace @order-manager/web`: 29 arquivos e 119 testes aprovados.

### Build

`npm run build --workspace @order-manager/web`: aprovado.

- 650 módulos transformados;
- CSS: 47,81 kB, 9,74 kB gzip;
- JavaScript: 658,73 kB, 191,36 kB gzip;
- aviso não bloqueante de chunk acima de 500 kB;
- avisos não bloqueantes de diretivas `use client` ignoradas em módulos do TanStack Query.

## 20. Arquivos gerados pela Etapa 0

- `scripts/audit-frontend-styles.mjs`;
- `docs/frontend-visual-baseline.md`;
- `docs/reports/frontend-visual-baseline/style-inventory.json`;
- `docs/reports/frontend-visual-baseline/runtime-measurements.json`;
- `docs/reports/frontend-visual-baseline/contrast-baseline.json`;
- `docs/reports/frontend-visual-baseline/script-validation.txt`;
- `docs/reports/frontend-visual-baseline/git-head.txt`;
- `docs/reports/frontend-visual-baseline/git-status-before.txt`;
- `docs/reports/frontend-visual-baseline/git-diff-stat-before.txt`;
- `docs/reports/frontend-visual-baseline/git-diff-names-before.txt`;
- `docs/reports/frontend-visual-baseline/git-status-after.txt`;
- `docs/reports/frontend-visual-baseline/app-source-hashes-before.json`;
- `docs/reports/frontend-visual-baseline/app-source-hashes-after.json`;
- `docs/reports/frontend-visual-baseline/source-integrity.txt`.

O plano mestre também será atualizado somente para marcar esta etapa e ligar esta evidência.

## 21. Próxima etapa elegível

Com esta baseline reproduzível, a próxima etapa elegível é:

**Etapa 1 — Tokens reais do design system.**

Ela deverá usar `style-inventory.json` como ponto de partida e não deve corrigir antecipadamente tipografia, alvos de toque, responsividade ou impressão além do necessário para definir e aplicar os tokens aprovados.
