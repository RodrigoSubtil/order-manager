# Style guide · Tipografia

[Índice do style guide](README.md) · [Espaçamentos e controles](spacing-and-controls.md) · [Cores e estados](colors.md)

Este é o padrão de tipografia da interface do Order Manager: login, painel, encomendas, formulários, digitalização, gestão e diálogos. Espaçamentos e dimensões de componentes pertencem ao capítulo de controles; a paleta e os estados pertencem ao capítulo de cores.

## Família

A interface mantém a família já configurada: **Inter**, com as fontes de interface do sistema como alternativas (`ui-sans-serif`, `system-ui`, fontes Apple e Segoe UI). Não há carregamento de fonte externa nem `@font-face`: Inter é usada quando disponível no dispositivo; caso contrário, o navegador usa a alternativa instalada. A aparência da família pode variar entre sistemas, mas tamanhos, pesos e hierarquia seguem este guia.

Não se adiciona uma família diferente em um cartão, página ou modal. Os controles também usam a mesma família. A base é `1rem`, respeitando o tamanho de texto escolhido pelo utilizador no navegador; os valores em px abaixo correspondem à base normal de 16 px.

## Escala e pesos

| Tamanho | Valor            | Uso                                                                       |
| ------- | ---------------- | ------------------------------------------------------------------------- |
| XS      | 12 px / 0.75rem  | Etiquetas curtas, categorias, versão, dias da semana e estados da revisão |
| SM      | 14 px / 0.875rem | Informações secundárias, ajuda, rótulos e botões compactos                |
| MD      | 16 px / 1rem     | Texto principal, valores de campos, telefone, produtos e botões           |
| LG      | 18 px / 1.125rem | Subtítulos                                                                |
| XL      | 20 px / 1.25rem  | Títulos de cartões, painéis e diálogos                                    |
| 2XL     | 24 px / 1.5rem   | Título de página e indicadores no telemóvel                               |
| 3XL     | 32 px / 2rem     | Título de página e indicadores acima de 560 px                            |

Há quatro pesos: **400 regular** para leitura, **500 médio** para pequenas ênfases, **600 seminegrito** para ações e destaques e **700 negrito** para o título principal. A interface não usa 800 ou 900. Erros e avisos não ganham letras mais grossas que os demais rótulos.

## Papéis da tipografia

| Papel / variável     | Tamanho                 | Peso | Entrelinha | Onde aplicar                                                                  |
| -------------------- | ----------------------- | ---- | ---------- | ----------------------------------------------------------------------------- |
| `--type-page`        | 32 px; 24 px até 560 px | 700  | 1.25       | Título principal do login, painel e gestão                                    |
| `--type-title`       | 20 px                   | 600  | 1.25       | Nome do cliente no cartão, título do painel de gestão, diálogo e confirmação  |
| `--type-section`     | 18 px                   | 600  | 1.25       | Subtítulos, listas da gestão                                                  |
| `--type-body`        | 16 px                   | 400  | 1.5        | Parágrafos, campos, opções, telefone, data/hora no cartão e textos de leitura |
| `--type-body-strong` | 16 px                   | 600  | 1.5        | Produto, quantidade, nome na lista de gestão e destaque dentro do texto       |
| `--type-button`      | 16 px                   | 600  | 1.25       | Ações principais e secundárias                                                |
| `--type-button-sm`   | 14 px                   | 600  | 1.25       | Ações compactas do cabeçalho e calendário                                     |
| `--type-label`       | 14 px                   | 600  | 1.5        | Nome do campo, mensagem de erro ou aviso                                      |
| `--type-secondary`   | 14 px                   | 400  | 1.5        | Responsável, número do pedido, filtros ativos e observações                   |
| `--type-caption`     | 12 px                   | 500  | 1.5        | Versão, informação auxiliar e orientação opcional abaixo dos campos           |
| `--type-overline`    | 12 px                   | 600  | 1.5        | Marca, categorias e rótulos dos indicadores                                   |
| `--type-status`      | 12 px                   | 600  | 1.25       | Conferir, Provável e Conferido                                                |
| `--type-metric`      | 32 px; 24 px até 560 px | 600  | 1.25       | Totais e percentagem de leitura                                               |

Orientações opcionais de formulário usam `FormMessage` com tom `hint`: **12 px**, cor secundária e sem reduzir opacidade. Mensagens de erro ou avisos que exigem ação conservam o papel de rótulo de **14 px**. O texto “Cliente selecionado. Alterar nome ou telefone atualiza este cadastro.” segue o papel auxiliar de 12 px.

## Regras de uso

- A hierarquia visual depende do papel do texto, não da página em que ele aparece. Dois títulos de diálogo usam o mesmo padrão.
- Títulos e textos mantêm a capitalização natural. Maiúsculas e espaçamento de `0.04em` ficam reservados a categorias, marca e rótulos curtos dos indicadores. Dias da semana usam a forma abreviada do calendário.
- Texto corrente não recebe espaçamento adicional entre letras. Não usar letras em 800/900 para compensar falta de hierarquia.
- Campos têm 16 px em todas as larguras, inclusive filtros, prefixo do telefone, data e hora. A tipografia dos campos não diminui no telemóvel.
- Informações longas quebram linha. Não reduzir a fonte para caber. Um botão com uma frase longa pode ocupar duas linhas.
- Etiquetas de 12 px nunca substituem instruções, valores de campos ou mensagens que precisam ser lidas para realizar a tarefa.
- Os estados de revisão usam o mesmo tamanho e peso; texto, símbolo e cores existentes distinguem Conferir, Provável e Conferido.
- Ícones desenhados em SVG mantêm seus tamanhos de componente. Símbolos tipográficos, como fechar e setas do calendário, usam a escala e entrelinha `1` quando necessário para centralização.

## Aplicação no código

A fonte, a escala, os pesos, as entrelinhas e os papéis ficam em [`apps/web/src/styles/typography.css`](../../apps/web/src/styles/typography.css), importado uma única vez por `styles/index.css`. Os componentes escolhem o papel completo:

```css
.title {
  font: var(--type-title);
}

.description {
  font: var(--type-secondary);
}
```

Use um papel existente antes de criar outro. Ajustes realmente necessários devem ser definidos neste guia e no arquivo central, não como valores soltos no componente. O Stylelint rejeita tamanhos, pesos, entrelinhas e espaçamentos de letras literais na interface. `inherit` é permitido; adicionar, fechar e as setas do calendário usam SVG, sem caracteres ocultados por tamanho de fonte zero.

## Impressão térmica

A ficha de produção de 80 mm conserva sua família Arial/Segoe UI, escala própria em px e formatação existente. É um documento de impressão, com largura física e altura medida, e está explicitamente separado das regras da interface. Os estilos globais de títulos e ênfases não se aplicam ao conteúdo de `[data-print-root]`. Alterar a tipografia da ficha exige uma revisão própria da paginação e da impressora física.
