# Style guide · Espaçamentos e controles

[Índice do style guide](README.md) · [Tipografia](typography.md) · [Cores e estados](colors.md)

**Estado em 12/10/2026: aplicado no código desta revisão.** Este capítulo define as medidas da interface do Order Manager. Variáveis, componentes compartilhados e páginas seguem o padrão, com as exceções explícitas abaixo. Esta revisão destina-se somente a homologação; a ficha térmica de 80 mm mantém suas regras próprias.

## 1. Princípios

- Elementos com a mesma função usam as mesmas medidas em todas as páginas.
- Espaços menores aproximam elementos relacionados; espaços maiores separam grupos e seções.
- Reduza a quantidade de colunas e o espaço externo antes de diminuir texto ou área de toque.
- Use altura mínima nos controles. Conteúdo maior pode aumentar a altura sem ser cortado.
- A dimensão do desenho de um ícone é independente da dimensão do botão que o contém.
- Use `gap` para distribuir irmãos e `padding` para o espaço interno. Evite somar margens dos dois lados para obter um único intervalo.

## 2. Escala de espaçamentos

A unidade base é **4 px**. A escala principal tem seis valores; o nome da variável existente é preservado, mesmo quando a numeração não corresponde à quantidade de unidades.

| Valor | Variável existente | Uso padrão                                                                     |
| ----- | ------------------ | ------------------------------------------------------------------------------ |
| 4 px  | `--space-1`        | Título e complemento curto; nome do produto e observação                       |
| 8 px  | `--space-2`        | Ícone e texto; rótulo e campo; ações de um cartão; ajuda e campo               |
| 12 px | `--space-3`        | Linhas de produtos; ações de diálogo; controles da barra de filtros            |
| 16 px | `--space-4`        | Campos entre si; cartões entre si; conteúdo interno de um cartão               |
| 24 px | `--space-6`        | Seções de formulário; blocos distintos; conteúdo interno de painéis amplos     |
| 32 px | `--space-7`        | Grupos principais de uma página ampla, quando 24 px não separa suficientemente |

A variável legada de 18 px foi removida por não ter uso. Espaços usam a escala principal, escolhida pela relação entre os elementos. Bordas, traços de ícones e foco têm medidas próprias; os cantos usam um único raio de 0,6rem.

### Espaços por relação

| Relação                            | Intervalo |
| ---------------------------------- | --------- |
| Rótulo → campo                     | 8 px      |
| Campo → ajuda ou erro              | 8 px      |
| Campo → próximo campo              | 16 px     |
| Título → descrição curta           | 8 px      |
| Cabeçalho de seção → conteúdo      | 16 px     |
| Seção → próxima seção              | 24 px     |
| Ícone → texto no mesmo controle    | 8 px      |
| Botão → botão no rodapé do diálogo | 12 px     |
| Ação → ação no cartão de encomenda | 8 px      |
| Cartão → próximo cartão            | 16 px     |

## 3. Containers e margens

As faixas usam a **largura disponível da janela em CSS**, não uma detecção do modelo do aparelho.

| Contexto                        | Até 390 px | 391–560 px | 561–1024 px | Acima de 1024 px |
| ------------------------------- | ---------- | ---------- | ----------- | ---------------- |
| Margem interna da página        | 8 px       | 8 px       | 12 px       | 24 px            |
| Espaço entre blocos da página   | 12 px      | 12 px      | 16 px       | 24 px            |
| Conteúdo da barra de filtros    | 12 px      | 12 px      | 16 px       | 16 px            |
| Conteúdo de painéis amplos      | 16 px      | 16 px      | 24 px       | 24 px            |
| Conteúdo do cartão de encomenda | 16 px      | 16 px      | 16 px       | 16 px            |
| Conteúdo do diálogo             | 16 px      | 16 px      | 24 px       | 24 px            |

Mantenha pelo menos 16 px livres no final da página, respeitando `env(safe-area-inset-bottom)` quando maior. Rodapés fixos também precisam reservar a área segura e não podem cobrir o último campo ou botão.

Containers flex e grid que recebem conteúdo variável usam `min-width: 0`; colunas flexíveis usam `minmax(0, 1fr)`. O cartão não recebe uma largura mínima que exceda a coluna. Nomes, telefones e observações podem quebrar linha. Não esconda conteúdo para disfarçar um excesso de largura.

## 4. Botões

### Dimensões

As medidas incluem borda e preenchimento (`box-sizing: border-box`). **44 × 44 px é a área mínima de interação adotada pelo projeto**, também para fechar, sair, abrir calendário ou mostrar senha. Não é o tamanho obrigatório do desenho interno.

| Tipo                                              | Altura mínima                   | Largura                          | Padding vertical / horizontal | Ícone                | Espaço ícone–texto | Raio   |
| ------------------------------------------------- | ------------------------------- | -------------------------------- | ----------------------------- | -------------------- | ------------------ | ------ |
| Padrão com texto                                  | 44 px                           | Conforme conteúdo                | 8 / 16 px                     | 20 px, quando houver | 8 px               | 0,6rem |
| Destaque / ação principal de uma etapa            | 48 px                           | Conforme grupo; pode ocupar 100% | 12 / 16 px                    | 20 px, quando houver | 8 px               | 0,6rem |
| Somente ícone                                     | 44 px                           | 44 px                            | 0; conteúdo centralizado      | 20 px                | —                  | 0,6rem |
| Barra principal: digitalizar, imprimir, adicionar | 48 px                           | Conforme grade responsiva        | 0; conteúdo centralizado      | 24 px                | —                  | 0,6rem |
| Calendário                                        | 44 px                           | Pelo menos 44 px                 | 8 / 12 px                     | 20 px                | 8 px               | 0,6rem |
| Sessão no cabeçalho                               | Desenho de 32 px; Sair de 30 px | Conforme conteúdo                | 0 / 12 px; Sair sem padding   | 16 px                | 8 px               | 0,6rem |

Os controles de sessão conservam o desenho compacto. Uma área transparente amplia o toque para pelo menos 44 × 44 px; o container não a recorta. Não aumente a aparência desses botões para cumprir o alvo de toque.

Texto usa `--type-button`; o compacto pode usar `--type-button-sm`. Uma frase longa quebra linha e aumenta a altura. Não use `height` rígida, fonte menor ou reticências para ocultar o nome de uma ação. Botões irmãos do mesmo grupo se alinham pela altura do maior. Não divida uma palavra curta, como “Remover”, entre linhas. No cabeçalho de um produto, título e ação não encolhem; o grupo quebra a linha quando necessário.

### Hierarquia e agrupamento

- **Primário:** ação principal da etapa, como Continuar ou Adicionar encomenda. Use a variante existente. O botão de adicionar produto no formulário usa + verde sobre fundo verde suave, com 44 × 44 px e 12 px até o último cartão, nome acessível e título “Adicionar mais um produto”.
- **Secundário:** alternativa, como Voltar ou Refazer. Conserva a mesma altura e tipografia do primário ao lado.
- **Discreto:** ações auxiliares e ações do cartão. Use as variantes existentes sem criar um formato diferente em cada página.
- **Remover / descartar:** Apagar encomenda e a lixeira de Cancelar usam vermelho forte com ícone ou texto branco. No formulário, Remover produto usa lixeira vermelha sobre fundo vermelho suave, com 44 × 44 px, o mesmo tamanho do botão +. A confirmação final de exclusão também usa vermelho preenchido.
- **Confirmação positiva:** Salvar encomenda e Concluir usam fundo verde forte com texto ou visto branco. WhatsApp usa verde suave e Editar usa amarelo suave. No rodapé da encomenda, Salvar é um visto branco sobre verde e Cancelar é uma lixeira branca sobre vermelho, ambos com nome acessível e título.
- **Fechar e cancelar:** não há X nos modais; a saída fica no rodapé. As confirmações de apagar, concluir e sair usam “Não”; digitalização e impressão usam “Cancelar”. Ambos mantêm vermelho suave. O formulário conserva a lixeira vermelha e o visto verde, sem trocar por texto. Na digitalização, Cancelar permanece disponível ao escolher a imagem, usar a câmara, conferir a foto e aguardar a leitura. Ao terminar, abrir diretamente o formulário de conferência, cujo rodapé mantém lixeira vermelha e visto verde. Cancelar não exclui dados guardados.
- **Ação de texto:** Ver e Voltar no aviso de atrasos usam texto sublinhado e mantêm 44 px de área de toque.
- Rodapé de diálogo: cancelar à esquerda e confirmar à direita, duas colunas de igual largura e intervalo de 12 px. Se o texto não couber, quebre dentro dos botões; empilhe somente se ainda faltar espaço.
- Cartão: ações centralizadas, intervalo de 8 px. No celular, os quatro botões usam 44 px e permanecem na mesma linha; a impressão aparece a partir de 561 px.
- Não coloque ações apenas em hover. Todo botão com somente ícone tem nome acessível, como `aria-label="Editar encomenda"`.

## 5. Ícones

| Papel                                                      | Dimensão do desenho | Área de interação                            |
| ---------------------------------------------------------- | ------------------- | -------------------------------------------- |
| Complemento de texto, estado da revisão, indicação pequena | 16 × 16 px          | Sem área própria quando não é uma ação       |
| Campos, telefone, busca e ações do cartão                  | 20 × 20 px          | Pelo menos 44 × 44 px quando clicável        |
| Ações da barra principal                                   | 24 × 24 px          | Altura de 48 px, largura definida pela grade |
| Ilustração de sucesso ou confirmação                       | 32 × 32 px          | Decorativa; não substitui um botão           |

Use SVG com `viewBox="0 0 24 24"`, proporção preservada, traço de **1.8** na base, pontas e junções arredondadas. Não desenhe a mesma ação com emoji, caractere de outra fonte ou dois conjuntos de ícones diferentes. Salvar (visto), descartar a edição (lixeira), fechar, navegação do calendário e adicionar usam o componente SVG compartilhado. Marcadores de estado decorativos conservam seus símbolos acompanhados de texto.

O símbolo oficial do WhatsApp conserva o desenho preenchido e a dimensão óptica de **22 px** já usada no cartão; é uma exceção de marca. Não aplique traço ao desenho preenchido.

Um ícone de 20 px dentro de um botão de 44 px deixa aproximadamente 12 px de espaço até a borda externa de cada lado. Ícones decorativos usam `aria-hidden="true"`. Se houver texto visível no botão, ele é o nome da ação.

## 6. Raios e bordas

**Raio único: 0,6rem**, equivalente a 9,6 px com a base normal de 16 px. Use `border-radius: var(--radius)` em campos, botões, cartões, painéis, menus, alertas, indicadores, cabeçalhos e modais, em todas as larguras. Não existem raios maiores para login ou diálogos nem cápsulas para a sessão. Cantos internos de grupos conectados podem permanecer retos; o contorno externo usa o raio único. O círculo do spinner é geometria do desenho, não uma variação de superfície.

Use borda de **1 px** em campos, cartões e separadores. A borda de **2 px** fica reservada ao tratamento já existente das ações de imprimir e digitalizar. O anel de foco não altera a espessura da borda nem desloca o layout. As cores continuam vindo das variáveis atuais; este capítulo não cria uma paleta nova.

## 7. Composição dos componentes

### Campos e formulários

- Campos, selects e busca: altura mínima de **48 px**, padding horizontal de **12 px**, raio único de **0,6rem**.
- Texto de entrada: **16 px**, conforme o guia de tipografia. Não reduzir em telas estreitas.
- Textarea: altura mínima de **96 px**, padding de **12 px**, crescimento vertical permitido.
- Ícone decorativo: **20 px**, a **12 px** da borda; reserve **44 px** no padding desse lado para não sobrepor o texto. Se for clicável, reserve a área de interação de **44 px**, sem encobrir o valor.
- Espaço geral entre colunas e linhas de campos: **16 px**; seções: **24 px**. No formulário de encomenda, os campos usam **24 px** e as seções **32 px**, para facilitar a leitura. Até **900 px**, formulários gerais usam uma coluna. Na revisão da digitalização, mantenha uma coluna também em telas maiores.
- No formulário de encomenda, use a margem lateral do corpo do diálogo: **16 px** no celular e **24 px** nas demais larguras. Títulos de seção não têm fundo; usam uma linha suave e **12 px** abaixo do texto, seguidos de **12 px** até o primeiro grupo de campos ou cartão. Cada produto recebe um cartão próprio em creme, com **16 px** de padding vertical, **8 px** horizontal e **24 px** entre cartões. O cartão avança **8 px** para cada lado, compensando o padding para manter os campos alinhados aos dados da encomenda, sem reduzir a largura dos inputs. Não envolver toda a seção em outro cartão.
- Dias indisponíveis no calendário mantêm a célula de **44 px**, com somente o número a **40%** de opacidade e sem fundo ou borda visível. Isso é uma exceção aos botões desativados comuns; a seleção permanece bloqueada.
- Prefixo de país e telefone podem compartilhar a linha; até **390 px**, ficam empilhados. Um texto maior pode exigir a quebra antes disso.
- Quantidade e unidade ficam empilhadas até **390 px**; na revisão compacta, até **560 px**.
- Calendário: botões e dias têm pelo menos **44 px**. Até **360 px**, há uma exceção de margem de **4 px** e sem padding lateral no corpo, para acomodar sete dias sem diminuir o alvo de toque.
- Rótulo, estado de revisão e ajuda pertencem ao campo. Se não couberem lado a lado, quebram linha sem sobreposição. Conferir, Provável e Conferido ficam sempre alinhados à direita do campo, inclusive quando passam para a linha abaixo do rótulo.

### Cartão de encomenda

| Região                                     | Medida                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| Faixa com data e hora                      | Padding de 8 px vertical e 16 px horizontal; gap de 8 px; `space-between`     |
| Bloco de responsável, número e cliente     | Padding de 16 px; intervalo entre grupos de 16 px                             |
| Informação relacionada no bloco do cliente | Nome com ícone de perfil; 8 px até o telefone                                 |
| Lista de produtos                          | Margens laterais de 16 px; linha com padding vertical de 12 px e gap de 12 px |
| Categoria de produtos                      | 16 px acima do rótulo; sem adicionar outra caixa decorativa                   |
| Rodapé                                     | Margens laterais de 16 px; padding vertical de 16 px; gap de 8 px entre ações |
| Próxima encomenda                          | 16 px                                                                         |

Data à esquerda e hora à direita, sem o rótulo “Entrega”, com ícones de 16 px, texto de 16 px regular e padding vertical de 8 px. Responsável pode quebrar linha; número do pedido permanece legível. O nome do produto ocupa a coluna flexível e a quantidade fica à direita. Esses espaços seguem o cartão aprovado, sem mudar sua hierarquia.

### Diálogos

- Raio externo de **0,6rem** em todas as larguras.
- Cabeçalho e rodapé: padding de **16 px**, gap de **12 px**. Corpo: **16 px** no celular e **24 px** acima de 560 px.
- Título usa `--type-title`; o cabeçalho contém somente o título. As ações de saída ficam no rodapé, com alvo mínimo de **44 × 44 px**.
- Margem entre diálogo e janela: **12 px** até 560 px e **24 px** acima. Preserve a área segura e use `100dvh` para o limite de altura.
- Cabeçalho e ações continuam acessíveis; o corpo rola quando necessário. Não fixe uma altura que corte o conteúdo.
- Confirmação de sucesso: resumo com fundo verde suave e texto verde centralizado, sem ícones ou X. Na exclusão, contexto de **14 px**, cliente de **20 px** e resultado de **16 px**, separados por **8 px**. Resumo com padding vertical de **32 px** e horizontal de **24 px**. Rodapé branco separado com padding de **16 px** e botão secundário de retorno. O texto quebra naturalmente com nomes longos, sem altura fixa. A leitura com IA não usa este modal: abre diretamente o formulário de conferência. Escape, foco contido e restauração do foco são preservados.
- A largura depende da tarefa. Reutilize as larguras atuais: digitalização até **390 px**, confirmação até **440 px**, revisão até **660 px**, formulário amplo até **1040 px**. Sempre limite à largura útil da janela, descontando as margens.

### Barra de filtros e lista

- Gap entre controles: **12 px**, reduzido para **8 px** no celular.
- Controles e busca formam um bloco fechado, com borda de 1 px, raio de 0,6rem e padding de **12 px** no celular ou **16 px** nas demais larguras. O espaço entre controles e busca é **12 px**.
- O resumo fica **12 px** abaixo da barra, sem caixa, fundo ou borda. Data e área usam ícones de **16 px**, texto secundário de **14 px** e gap de **8 px**; grupos ficam a **16 px**. A contagem positiva usa o rótulo “encomenda/encomendas”. Com zero resultados, somente o estado vazio da lista comunica a ausência, sem contador duplicado. A lista fica **16 px** abaixo do resumo, com intervalo de **16 px** entre cartões.
- Área e data ocupam partes iguais quando compartilham uma linha; no celular, cada filtro ocupa sua própria linha. O texto é centralizado usando reservas laterais iguais de **48 px**; a seta não desloca o centro da escrita.
- Data, área e contagem ficam em uma única linha. Quando a largura útil do resumo chega a **380 px**, os textos passam de **14 px** para **12 px**, o intervalo entre grupos cai para **8 px** e entre ícone e texto para **4 px**. A contagem não passa para baixo; a regra responde ao espaço disponível do componente, sem reduzir campos e botões.
- Evite um segundo painel sombreado envolvendo os cartões. A separação vem do espaço e das superfícies existentes.

## 8. Comportamento responsivo

| Largura da janela | Ações da barra principal         | Ações da encomenda                   | Organização                                                                                       |
| ----------------- | -------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Até 560 px        | Digitalizar + Adicionar          | Concluir, WhatsApp, Editar, Eliminar | Duas ações iguais no topo; filtros empilhados; quatro ações do cartão em linha                    |
| 561–1024 px       | Digitalizar, Imprimir, Adicionar | Inclui Imprimir                      | Digitalizar ocupa uma linha; abaixo, Imprimir à esquerda e Adicionar à direita; filtros 50% / 50% |
| Acima de 1024 px  | Imprimir + Adicionar             | Inclui Imprimir                      | Filtros e ações na mesma linha; Adicionar por último à direita; sem Digitalizar                   |

Digitalizar também depende da funcionalidade estar habilitada; a largura não substitui essa condição. As faixas descrevem composição por espaço disponível, inclusive janelas estreitas em computadores, e preservam as decisões já feitas para a barra de ações.

Em **320 px**, mantenha quatro ações de 44 px com três gaps de 8 px: o grupo usa **200 px**. Antes de reduzir os botões, confira as margens e os containers que os envolvem. Em zoom ou tamanhos de texto maiores, permita reorganização em vez de cortar conteúdo.

## 9. Estados e implementação

- Normal, hover, foco, pressionado, desabilitado e carregando mantêm a dimensão do controle. Reservar espaço para o indicador de carregamento evita saltos.
- Foco: preserve o padrão existente de **3 px**, afastamento de **3 px** nos botões e halo de **3 px** nos campos. Não remova o foco sem um substituto visível.
- Erro e confirmação não aumentam bordas nem mudam pesos de texto. Mensagens entram no fluxo abaixo do campo, com **8 px** de separação.
- Um botão desabilitado mantém espaço, rótulo e significado. Não use apenas a cor para comunicar estados.

Use as variáveis de [tokens.css](../../apps/web/src/styles/tokens.css): `--space-*`, `--touch-target`, `--control-height`, `--icon-size-*`, `--radius`, `--page-inset`, `--page-gap`, `--orders-panel-padding` e `--dialog-*`. Dimensões compartilhadas ficam centralizadas; não crie cópias em cada componente. Sobrescritas locais dos controles usam o contexto do componente para não depender da ordem de carregamento do CSS.

```css
.group {
  display: grid;
  gap: var(--space-4);
}

.actions {
  display: flex;
  gap: var(--space-2);
}

.iconButton {
  box-sizing: border-box;
  min-width: var(--touch-target);
  min-height: var(--touch-target);
  border-radius: var(--radius);
}
```

O Stylelint protege os papéis tipográficos e também rejeita `gap` e `border-radius` fora das variáveis previstas. A ficha térmica conserva sua exceção explícita. Medidas de viewport, bordas, posição de ícones e geometria do seletor de hora não são espaçamentos comuns.

## 10. Aplicação e verificação local

| Região                   | Aplicação                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| Variáveis                | Escala de espaços, raios, ícones, controles e margens responsivas centralizada                           |
| Controles compartilhados | Botões com alvo de 44 px, campos de 48 px, fechar/calendário/senha com área de toque preservada          |
| Cabeçalho                | Sessão compacta com toque ampliado; versão e marca usam a mesma cor                                      |
| Formulários e gestão     | Espaços por relação, campos de 16 px, remoção sem divisão de palavras e reorganização em telas estreitas |
| Diálogos                 | Raio de 0,6rem, áreas seguras, limite pela altura disponível e corpo com rolagem                         |
| Painel e lista           | Filtros centralizados em bloco fechado; resumo com ícones sem caixa; estado vazio sem contador duplicado |
| Impressão                | CSS térmico e regras de 80 mm preservados                                                                |

A conferência local usa componentes reais e dados sintéticos, com acessos externos bloqueados. Abrange login, painel, formulário normal, revisão, gestão, digitalização e diálogos em **320, 360, 390, 560, 561, 768, 900, 1024, 1025, 1280 e 1920 px**, além de janela baixa em paisagem e texto ampliado a 125%.

Verifique ausência de rolagem horizontal, quebra de palavras curtas, sobreposição de ícones e cortes por rodapés. Confira nomes longos, remoção de produto, foco, revisão após edição e as faixas de visibilidade de câmera/impressão. A contagem deve quebrar abaixo da data à esquerda. O cabeçalho compacto mantém o toque funcional além do desenho visível.

Esta validação é de navegador local com larguras simuladas; não comprova comportamento de câmera ou impressora físicas, nem testes em homologação ou produção. Execute também os checks de aplicação descritos no [workflow](../development/workflow.md) antes de publicar.
