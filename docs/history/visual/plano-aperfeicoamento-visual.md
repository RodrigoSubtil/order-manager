# Plano mestre de aperfeiçoamento visual do Order Manager

- Data da elaboração: 25 de setembro de 2026
- Estado do documento: plano de trabalho; nenhuma etapa deste roteiro está automaticamente concluída
  Base avaliada: frontend local atual em `C:\Users\rodri\Desktop\order-manager-main`

## 1. Finalidade

Este documento organiza todas as etapas necessárias para levar a interface do Order Manager a um estado visual, responsivo, acessível e tecnicamente sustentável para o uso diário da Pastelaria Vénus.

Ele deve ser usado de forma incremental:

1. escolher uma etapa;
2. pedir à IA que crie somente o prompt detalhado dessa etapa;
3. revisar o prompt;
4. pedir à IA que aplique somente o prompt aprovado;
5. validar o resultado;
6. registrar a evidência e marcar a etapa como concluída;
7. seguir para a próxima etapa.

Uma etapa não deve aproveitar a oportunidade para executar itens de outra etapa. Essa separação reduz regressões e torna cada resultado verificável.

## 2. Limites do plano

O plano cobre:

- design system e tokens CSS;
- tipografia, cores, espaçamentos e hierarquia visual;
- campos, botões, ícones e alvos de toque;
- cards, filtros, formulários, modais e estados de interface;
- responsividade em telemóvel, tablet e desktop;
- acessibilidade visual, por teclado e por leitor de tela;
- impressão térmica;
- organização e manutenção dos estilos;
- desempenho percebido da interface;
- testes visuais e homologação final.

Não fazem parte deste plano, salvo quando afetarem diretamente a interface:

- mudanças em regras de negócio;
- alterações de banco de dados ou migrations;
- redefinição de autenticação e permissões;
- limpeza de encomendas ou clientes;
- mudança do fluxo de exclusão e conclusão;
- implantação de integrações externas;
- redesign da identidade da Pastelaria Vénus.

## 3. Diagnóstico de partida

O estado atual possui uma boa base:

- paleta bege e marrom coerente;
- CSS global separado de CSS Modules;
- componentes compartilhados para controles e diálogos;
- foco visível;
- modais com cabeçalho e rodapé fixos;
- painel funcional em 1440, 768 e 390 px;
- modal de encomenda e modal de impressão abrindo no topo;
- ausência de overflow horizontal nas larguras usuais testadas;
- lint, Stylelint, build e 119 testes aprovados no diagnóstico de origem.

As principais dívidas encontradas foram:

- escala tipográfica fragmentada;
- tokens de espaçamento definidos, mas quase não utilizados;
- alturas diferentes para controles semelhantes;
- botões auxiliares com alvos de 30 a 36 px;
- tamanhos de ícone sem escala formal;
- breakpoints adicionais e não padronizados;
- overflow limítrofe em 320 px com scrollbar tradicional;
- placeholder com contraste aproximado de 2,95:1;
- fonte `Inter` declarada, mas não fornecida pelo projeto;
- metadados móveis pequenos;
- ausência de limite confortável em monitores muito largos;
- arquivos CSS antigos aparentemente sem uso;
- bundle JavaScript acima do limite de aviso padrão do Vite;
- impressão física ainda não comprovada com pedidos longos;
- falta de testes automatizados de regressão visual.

## 4. Regras obrigatórias para todas as etapas

Cada execução deve respeitar estas regras:

1. Ler esta etapa e os arquivos envolvidos antes de editar.
2. Inspecionar `git status` e preservar alterações preexistentes.
3. Não descartar, reformatar ou sobrescrever trabalho fora do escopo.
4. Não modificar banco, Supabase, migrations ou dados reais por causa de uma tarefa visual.
5. Não alterar regras de negócio para facilitar o layout.
6. Não considerar “a classe existe” como prova de que a interface funciona.
7. Validar o comportamento real no navegador quando a etapa alterar apresentação ou interação.
8. Comparar o resultado antes e depois nas larguras definidas pela etapa.
9. Não atualizar testes ou snapshots apenas para esconder uma regressão.
10. Não fazer deploy, commit, push ou publicação sem solicitação explícita.
11. Relatar limitações e estados que não puderam ser verificados.
12. Tratar a cópia local, a homologação e a produção como ambientes diferentes.

### Regra para ideias novas

Cada etapa contém ideias adicionais além das correções já diagnosticadas. Ao criar o prompt de uma etapa, a IA deve:

- incluir as ideias no diagnóstico e na proposta;
- classificá-las como **essencial**, **recomendada** ou **opcional**;
- explicar o benefício concreto para a operação da pastelaria;
- estimar risco, complexidade e impacto visual;
- implementar somente as ideias que pertencem à etapa e foram aprovadas no prompt;
- evitar adicionar funções apenas por serem modernas ou visualmente atraentes;
- rejeitar uma ideia quando ela complicar o uso diário sem benefício comprovado.

Uma ideia nova não deve entrar silenciosamente. A entrega precisa dizer quais ideias foram aplicadas, adiadas ou descartadas e o motivo.

## 5. Comandos mínimos de qualidade

Ao final de cada etapa que alterar código, executar:

```powershell
npm run lint --workspace @order-manager/web
npm run test --workspace @order-manager/web
npm run build --workspace @order-manager/web
```

Quando a etapa alterar muitos arquivos ou formatação:

```powershell
npm run format:check
```

Uma aprovação nesses comandos comprova apenas qualidade estática e testes automatizados. Mudanças visuais também exigem inspeção real no navegador.

## 6. Matriz mínima de tamanhos

As etapas responsivas devem considerar:

| Perfil          | Largura de referência | Objetivo                                       |
| --------------- | --------------------: | ---------------------------------------------- |
| Desktop amplo   |               1440 px | Confirmar distribuição, largura e legibilidade |
| Desktop comum   |               1024 px | Confirmar transição antes do tablet            |
| Tablet          |                768 px | Confirmar grids, cabeçalho e formulários       |
| Telemóvel comum |                390 px | Cenário móvel principal                        |
| Telemóvel menor |                360 px | Confirmar redução sem compressão excessiva     |
| Limite mínimo   |                320 px | Evitar overflow e conteúdo inacessível         |

Alturas de viewport também devem variar. Não basta testar somente uma página inteira com rolagem ilimitada.

## 7. Controle das etapas

| Etapa | Título                                        | Prioridade       | Dependência      | Estado    |
| ----: | --------------------------------------------- | ---------------- | ---------------- | --------- |
|     0 | Baseline e inventário verificável             | Obrigatória      | Nenhuma          | CONCLUÍDA |
|     1 | Tokens reais do design system                 | Alta             | Etapa 0          | PENDENTE  |
|     2 | Tipografia e fonte oficial                    | Alta             | Etapa 1          | PENDENTE  |
|     3 | Espaçamentos, grids e largura das páginas     | Alta             | Etapas 1 e 2     | PENDENTE  |
|     4 | Controles e alvos de toque                    | Alta             | Etapas 1 e 3     | PENDENTE  |
|     5 | Sistema de ícones                             | Média            | Etapas 1 e 4     | PENDENTE  |
|     6 | Breakpoints e redimensionamento               | Alta             | Etapas 1 a 5     | PENDENTE  |
|     7 | Login, cabeçalho e acesso gerencial           | Média            | Etapa 6          | PENDENTE  |
|     8 | Painel, indicadores, filtros e estados vazios | Alta             | Etapa 6          | PENDENTE  |
|     9 | Cards de encomenda e conteúdo extremo         | Alta             | Etapas 5, 6 e 8  | PENDENTE  |
|    10 | Formulário, produtos e cliente                | Alta             | Etapas 2 a 6     | PENDENTE  |
|    11 | Modais, dropdowns, calendário e hora          | Alta             | Etapas 4 a 6     | PENDENTE  |
|    12 | Mensagens, estados e acessibilidade completa  | Alta             | Etapas 7 a 11    | PENDENTE  |
|    13 | Área de gerenciamento                         | Média            | Etapas 6 e 12    | PENDENTE  |
|    14 | Impressão térmica                             | Alta operacional | Etapas 2, 9 e 11 | PENDENTE  |
|    15 | Limpeza técnica e compatibilidade CSS         | Média            | Etapas 1 a 14    | PENDENTE  |
|    16 | Desempenho do frontend                        | Média            | Etapa 15         | PENDENTE  |
|    17 | Testes visuais e matriz final                 | Obrigatória      | Etapas 1 a 16    | PENDENTE  |
|    18 | Homologação e publicação controlada           | Obrigatória      | Etapa 17         | PENDENTE  |

---

## Etapa 0 — Baseline e inventário verificável

### Objetivo

Registrar o ponto de partida antes de qualquer padronização, permitindo comparar cada alteração com evidência.

### Trabalho necessário

- registrar branch, commit atual e alterações locais;
- separar arquivos já modificados dos arquivos que cada nova etapa pretende alterar;
- listar todos os CSS globais e CSS Modules em uso;
- contabilizar cores, fontes, tamanhos, pesos, line-heights, gaps, paddings, margens, alturas, raios, sombras e breakpoints;
- identificar componentes compartilhados e estilos locais equivalentes;
- registrar quais telas podem ser acessadas no navegador sem alterar dados;
- capturar o estado visual de referência das telas principais;
- registrar os resultados atuais de lint, testes e build;
- anotar estados ainda não verificáveis, como cards reais sem encomendas ou área gerencial sem senha.

### Novas ideias e melhorias propostas

- criar um script reutilizável que gere inventário de tokens, valores diretos, breakpoints e arquivos CSS;
- produzir uma matriz de severidade com impacto, frequência, esforço e risco de cada problema visual;
- manter screenshots de referência sanitizados para comparação humana;
- gerar uma página interna de diagnóstico que exiba todos os componentes e estados sem usar dados reais;
- registrar medições do DOM, como overflow, altura dos controles e tamanho dos alvos de toque;
- criar um pequeno histórico de baseline para comparar futuras etapas sem depender da memória da conversa.

### Critérios de aceite

- inventário salvo em documento ou relatório reproduzível;
- alterações preexistentes identificadas;
- telas e larguras de referência definidas;
- nenhuma mudança funcional ou visual realizada;
- evidências não confundem código estático com comportamento real.

---

## Etapa 1 — Tokens reais do design system

### Objetivo

Criar tokens semânticos e efetivamente utilizados para tipografia, espaçamento, controles e ícones.

### Trabalho necessário

- revisar `apps/web/src/styles/tokens.css`;
- definir escala tipográfica curta;
- definir pesos e line-heights semânticos;
- consolidar uma escala de espaçamento baseada nos valores recorrentes;
- criar alturas semânticas para controles compactos, normais e confortáveis;
- definir alvo mínimo de toque;
- criar escala curta de ícones;
- definir tokens de padding de campos, cards, painéis e diálogos quando recorrentes;
- migrar primeiro estilos globais e componentes compartilhados;
- migrar depois os CSS Modules sem alterar a aparência intencional;
- manter tokens de impressão separados do sistema de tela.

### Novas ideias e melhorias propostas

- criar tokens semânticos de função, como campo, ação, painel e diálogo, acima dos valores primitivos;
- documentar cada token com finalidade e exemplos de uso;
- criar uma camada temporária de aliases para migrar nomes antigos sem uma troca arriscada de uma só vez;
- adicionar uma verificação automática que encontre tokens sem uso e valores diretos proibidos;
- expor os tokens numa página visual de referência para comparar escala, contraste e densidade;
- estabelecer um orçamento máximo de novos valores diretos por alteração.

### Cuidados

- não criar um token para cada número existente;
- não unir valores com finalidades diferentes apenas porque são próximos;
- não usar nomes ligados a uma única página;
- não alterar cores nesta etapa;
- preservar o resultado visual enquanto a estrutura é centralizada.

### Critérios de aceite

- tokens novos possuem uso real;
- valores repetidos diminuíram de forma comprovável;
- componentes compartilhados usam tokens semânticos;
- exceções restantes estão listadas e justificadas;
- não houve regressão nas larguras da matriz mínima.

---

## Etapa 2 — Tipografia e fonte oficial

### Objetivo

Estabelecer uma hierarquia tipográfica pequena, legível e consistente em todo o produto.

### Trabalho necessário

- decidir se a interface usará `Inter` fornecida pelo projeto ou a pilha de fontes do sistema;
- evitar depender de uma fonte que pode ou não estar instalada;
- reduzir os muitos tamanhos atuais para funções claras: legenda, ajuda, corpo, label, subtítulo, título e destaque;
- padronizar pesos por função;
- padronizar line-height para textos curtos e parágrafos;
- revisar letter-spacing de eyebrows e títulos em maiúsculas;
- eliminar textos móveis próximos de 9 ou 10 px quando forem necessários para operação;
- validar nomes longos, produtos longos, mensagens de erro e números grandes;
- manter a impressão com tipografia própria quando necessário.

### Novas ideias e melhorias propostas

- usar `font-variant-numeric: tabular-nums` em horas, datas, quantidades e números de encomenda;
- avaliar `clamp()` apenas para títulos que realmente precisam de escala fluida;
- definir largura máxima de leitura para textos explicativos e mensagens longas;
- configurar fallbacks com métricas próximas para reduzir mudança de layout durante o carregamento da fonte;
- criar amostras visuais com acentos portugueses, números e nomes longos;
- definir regra específica para textos operacionais que nunca podem ficar abaixo do tamanho mínimo de leitura.

### Critérios de aceite

- cada tamanho possui uma função documentada;
- textos operacionais não ficam pequenos demais em 320 e 390 px;
- títulos, labels, ajuda e conteúdo têm hierarquia perceptível;
- a fonte renderizada é previsível entre os equipamentos suportados;
- não existem cortes ou sobreposições com zoom de texto a 200%.

---

## Etapa 3 — Espaçamentos, grids e largura das páginas

### Objetivo

Criar ritmo visual consistente e impedir que cada componente invente seus próprios gaps e paddings.

### Trabalho necessário

- aplicar a escala de espaços da Etapa 1;
- padronizar distância entre label, campo, ajuda e erro;
- padronizar padding de cards, painéis, seções e modais;
- definir gaps de grids de formulário e listas;
- revisar o shell das páginas de encomendas e configurações;
- avaliar uma largura máxima confortável para monitores muito grandes;
- manter aproveitamento de espaço em notebooks e tablets;
- revisar margens nos limites superior, inferior e laterais;
- evitar rolagens internas desnecessárias combinadas com rolagem da página.

### Novas ideias e melhorias propostas

- criar primitivas simples de layout, como stack vertical, grupo horizontal e grid responsivo;
- avaliar modos de densidade confortável e compacta somente para telas operacionais com muita informação;
- usar `min()`, `max()` e `clamp()` em paddings laterais quando isso evitar saltos de breakpoint;
- considerar `container queries` em componentes que possam aparecer em painéis de larguras diferentes;
- adicionar `scroll-margin` a campos que recebem foco para não ficarem escondidos por áreas fixas;
- definir uma largura ótima de conteúdo em desktop amplo sem desperdiçar espaço de trabalho.

### Critérios de aceite

- espaçamentos iguais têm a mesma finalidade;
- não há saltos visuais injustificados entre seções semelhantes;
- desktop amplo não fica excessivamente espalhado;
- tablet e telemóvel mantêm área útil suficiente;
- nenhuma informação fica oculta por cabeçalhos ou rodapés fixos.

---

## Etapa 4 — Controles e alvos de toque

### Objetivo

Padronizar campos, botões e áreas clicáveis, garantindo operação segura em telemóvel e tablet.

### Trabalho necessário

- aplicar alturas semânticas aos componentes compartilhados;
- garantir alvo interativo de pelo menos 44 × 44 px nas ações móveis;
- corrigir “Gerenciar”, “Encomendas”, “Sair”, setas de selects, fechar modal, calendário, hora e remover produto;
- manter o desenho do ícone pequeno dentro de uma superfície clicável maior;
- padronizar padding horizontal de botões;
- revisar estados normal, hover, active, focus-visible, disabled e loading;
- evitar deslocamentos de layout quando o texto do botão muda para carregamento;
- validar botões com textos maiores e tradução futura;
- garantir fonte mínima de 16 px nos campos móveis para evitar zoom automático.

### Novas ideias e melhorias propostas

- ampliar a área clicável com padding ou pseudo-elemento sem aumentar visualmente o ícone;
- reservar largura estável para botões que mudam para “A guardar...” ou outro estado de carregamento;
- criar um estado visual único para ações destrutivas, secundárias e de navegação;
- impedir clique duplo durante salvamento sem retirar a resposta visual imediata;
- adicionar feedback de pressionamento adequado a telas de toque;
- avaliar botões de largura total somente onde facilitarem a ação principal no telemóvel.

### Critérios de aceite

- todos os controles críticos alcançam o tamanho mínimo definido;
- botões equivalentes têm alturas equivalentes;
- foco, disabled e carregamento são perceptíveis;
- não há sobreposição em 320 px;
- operação por toque não exige precisão excessiva.

---

## Etapa 5 — Sistema de ícones

### Objetivo

Unificar tamanhos, traços, alinhamento e áreas clicáveis dos ícones.

### Trabalho necessário

- inventariar o componente compartilhado de ícones e SVGs inline;
- definir tamanhos pequeno, normal e grande;
- padronizar `stroke-width`, `fill`, `linecap` e `linejoin` quando aplicável;
- centralizar ícones dentro dos controles;
- revisar telefone, calendário, relógio, pesquisa, setas, impressão, logout, cadeado e WhatsApp;
- manter proporções próprias de marcas, como WhatsApp, sem criar desalinhamento;
- remover duplicações de SVG quando o componente compartilhado atender ao caso;
- conferir ícones com zoom e em telas de alta densidade.

### Novas ideias e melhorias propostas

- criar uma galeria interna de ícones com nome, tamanho, estado e finalidade;
- aplicar correção óptica para símbolos que parecem desalinhados apesar de estarem geometricamente centrados;
- impedir o uso de emojis como substitutos de ícones operacionais;
- definir quando o ícone precisa de texto visível e quando `aria-label` é suficiente;
- permitir espelhamento ou adaptação somente quando a direção do símbolo tiver significado;
- adicionar testes simples que detectem SVG sem título acessível em botões somente com ícone.

### Critérios de aceite

- ícones da mesma função possuem tamanho e traço consistentes;
- a área clicável é independente do tamanho visual do símbolo;
- nenhuma marca ou símbolo fica deformado;
- ícones não alteram a altura dos controles;
- todos os botões somente com ícone possuem nome acessível.

---

## Etapa 6 — Breakpoints e redimensionamento

### Objetivo

Consolidar o comportamento responsivo e eliminar quebras nos limites de largura.

### Trabalho necessário

- revisar breakpoints atuais de 390, 520, 560, 760 e 900 px;
- manter exceções apenas quando houver necessidade comprovada;
- estabelecer breakpoints oficiais documentados;
- corrigir o overflow observado no limite de 320 px;
- testar com e sem scrollbar tradicional;
- validar orientação retrato e paisagem;
- testar zoom do navegador em 125%, 150% e 200%;
- verificar grids, textos, campos e botões durante redimensionamento contínuo;
- confirmar que nenhuma regra depende apenas de um modelo específico de telefone.

### Novas ideias e melhorias propostas

- usar unidades de viewport dinâmicas, como `dvh`, nos modais móveis quando houver suporte adequado;
- respeitar `env(safe-area-inset-*)` em aparelhos com notch ou barra inferior;
- testar abertura do teclado virtual sem esconder salvar, cancelar ou o campo focado;
- testar mudança entre retrato e paisagem sem recarregar a página;
- avaliar container queries para reduzir media queries específicas de componentes;
- criar uma verificação automatizada de overflow em uma sequência contínua de larguras, não somente em seis pontos.

### Critérios de aceite

- sem overflow horizontal entre 320 e 1440 px;
- componentes não saltam ou se sobrepõem perto dos breakpoints;
- a navegação permanece possível com zoom de 200%;
- exceções de breakpoint estão documentadas;
- cabeçalhos, rodapés e conteúdo rolável mantêm comportamento previsível.

---

## Etapa 7 — Login, cabeçalho e acesso gerencial

### Objetivo

Padronizar as superfícies que identificam a sessão e dão acesso às áreas principais.

### Trabalho necessário

- alinhar campos do login ao design system sem retirar sua identidade;
- revisar card, largura, padding e hierarquia do login;
- revisar cabeçalho da sessão em desktop, tablet e telemóvel;
- corrigir alvos pequenos de navegação e saída;
- tratar nomes de empresa muito longos;
- revisar a tela de senha gerencial;
- corrigir a presença de dois `h1` na mesma visualização;
- conferir estado de verificação de acesso, erro de senha e carregamento;
- testar navegação por teclado entre painel, gerenciamento e saída;
- validar sem efetuar logout destrutivo de uma sessão de trabalho sem necessidade.

### Novas ideias e melhorias propostas

- priorizar no cabeçalho, por largura, o nome da empresa e a ação mais usada;
- criar um estado claro e não intrusivo para sessão expirada;
- avaliar um aviso de conexão perdida quando a interface não puder salvar alterações;
- apresentar o utilizador ou perfil ativo sem ocupar espaço excessivo;
- manter as ações de sessão acessíveis mesmo quando o nome da empresa for muito longo;
- criar uma transição estável entre “a verificar acesso” e o conteúdo final, evitando salto visual.

### Critérios de aceite

- apenas um título principal semântico por página;
- ações de sessão possuem tamanho adequado;
- nomes longos não quebram o cabeçalho;
- estados de autenticação não causam salto de layout;
- login e acesso gerencial mantêm foco e mensagens acessíveis.

---

## Etapa 8 — Painel, indicadores, filtros e estados vazios

### Objetivo

Tornar a página principal consistente, legível e eficiente em qualquer largura suportada.

### Trabalho necessário

- revisar os três indicadores em 320 e 360 px;
- decidir se continuam em três colunas ou mudam em telefones estreitos;
- padronizar toolbar, pesquisa e filtros;
- conferir ordem visual e ordem de tabulação;
- revisar seletor de área, hoje, todas as datas, data específica, nova encomenda e impressão;
- alinhar ícones e textos dos botões;
- revisar o resumo dos filtros ativos;
- padronizar estados carregando, vazio, sem resultados, erro e sucesso;
- garantir que o estado vazio indique claramente a próxima ação;
- verificar largura em monitores grandes.

### Novas ideias e melhorias propostas

- apresentar filtros ativos como chips removíveis com uma ação clara de limpar filtros;
- preservar filtros durante a navegação da sessão quando isso ajudar o trabalho diário;
- avaliar uma toolbar fixa somente em listas longas, sem roubar área útil no telemóvel;
- mostrar contagem de resultados próxima dos filtros de forma mais evidente;
- adicionar skeleton apenas quando o carregamento for perceptível, evitando piscadas rápidas;
- incluir uma ação direta no estado vazio, como criar a primeira encomenda, sem duplicar comandos desnecessários.

### Critérios de aceite

- filtros são compreensíveis sem depender apenas de ícones;
- indicadores permanecem legíveis em 320 px;
- pesquisa e ações mantêm alinhamento;
- estados vazios e de erro não alteram a estrutura de forma brusca;
- a página não cria rolagem interna conflitante com a rolagem geral.

---

## Etapa 9 — Cards de encomenda e conteúdo extremo

### Objetivo

Garantir que os cards permaneçam claros com dados curtos, longos e incomuns.

### Trabalho necessário

- validar cliente com nome longo;
- validar telefone ausente, curto e internacional quando permitido;
- validar muitos produtos;
- validar nomes longos de produtos;
- validar quantidades e unidades extensas;
- validar observações longas e múltiplas linhas;
- conferir centralização da faixa de data quando os lados têm larguras diferentes;
- revisar tamanho dos metadados no telemóvel;
- garantir que concluir, WhatsApp, editar e excluir permaneçam utilizáveis;
- conferir wrapping, truncamento e expansão do card;
- validar contraste e hierarquia dos estados da encomenda;
- confirmar que o botão do WhatsApp mantém proporção correta.

### Novas ideias e melhorias propostas

- destacar visualmente encomendas para hoje, próximas e atrasadas sem depender somente de cor;
- permitir copiar telefone ou número da encomenda com feedback curto, se isso ajudar a operação;
- avaliar recolhimento de observações muito longas com expansão acessível;
- tornar o número da encomenda fácil de localizar durante atendimento presencial ou telefónico;
- mostrar claramente quando o WhatsApp não pode ser aberto por telefone inválido;
- testar uma apresentação compacta opcional para listas muito longas, mantendo todas as ações acessíveis.

### Critérios de aceite

- nenhum conteúdo sobrepõe ações ou colunas;
- informações necessárias não são cortadas silenciosamente;
- ações mantêm pelo menos 44 px no telemóvel;
- card funciona com o menor e o maior conteúdo de teste;
- o layout não depende de existir somente um ou dois produtos.

---

## Etapa 10 — Formulário, produtos e cliente

### Objetivo

Padronizar e robustecer a criação e edição de encomendas.

### Trabalho necessário

- revisar ordem e agrupamento dos campos;
- alinhar labels, campos, ajuda e erros;
- conferir preenchimento automático de cliente e telefone;
- validar sugestões com uma letra e muitos resultados;
- testar fechamento de selects ao clicar fora;
- testar teclado, setas, Enter, Escape e Tab;
- verificar edição de cliente selecionado;
- revisar responsável, data e hora;
- revisar editor de produtos e quantidade;
- validar muitos produtos adicionados;
- garantir que “Remover” possua alvo adequado;
- revisar observações e textarea em todas as larguras;
- confirmar que salvar e cancelar continuam acessíveis durante a rolagem;
- conferir foco no primeiro erro e mensagens associadas ao campo correto.

### Novas ideias e melhorias propostas

- avisar sobre alterações não guardadas antes de fechar o modal;
- avaliar preservação temporária local de um rascunho após fechamento acidental, sem enviar dados para serviços externos;
- mostrar produtos e clientes recentes quando isso reduzir digitação sem criar duplicados;
- adicionar controles de incremento e redução de quantidade somente se forem mais rápidos que digitação;
- permitir adicionar outro produto pelo teclado sem voltar ao rato;
- incluir um resumo curto da encomenda antes de salvar apenas se não tornar o fluxo mais lento;
- posicionar o erro geral próximo da ação de salvar e manter os erros específicos junto aos campos.

### Critérios de aceite

- formulário abre no topo;
- nenhum seletor abre automaticamente sem ação do utilizador;
- dropdowns fecham ao clicar fora ou pressionar Escape;
- erros não deslocam o formulário de forma confusa;
- conteúdo não fica escondido pelo rodapé;
- criação e edição preservam o mesmo padrão visual;
- o layout funciona com um e com vários produtos.

---

## Etapa 11 — Modais, dropdowns, calendário e hora

### Objetivo

Concluir o padrão de overlays e eliminar cortes, empilhamentos e rolagens imprevisíveis.

### Trabalho necessário

- garantir uso consistente de `Dialog`, `DialogHeader` e `DialogActions`;
- padronizar largura, altura máxima, padding e botão de fechar;
- validar abertura sempre com conteúdo no topo;
- validar fechamento por botão e Escape;
- decidir e documentar se clicar no backdrop fecha o modal;
- conferir retenção e restauração de foco;
- revisar `z-index` de diálogo, dropdown, calendário e seletor de hora;
- testar dropdowns próximos do final da área rolável;
- impedir que listas sejam cortadas pelo `overflow` do modal;
- validar calendários nos limites direito, esquerdo, superior e inferior;
- validar seletor de hora com teclado e toque;
- conferir rodapés com botões iguais em todos os modais;
- testar modais de confirmação, exclusão, conclusão, saída e configurações.

### Novas ideias e melhorias propostas

- fazer dropdowns escolherem automaticamente abrir acima ou abaixo conforme o espaço disponível;
- usar portal para listas que precisam escapar de containers com `overflow`;
- adicionar sombra ou indicação discreta quando ainda há conteúdo rolável abaixo;
- avaliar modal quase em tela cheia no telemóvel para formulários extensos;
- manter ações acima da safe area inferior em iPhone e dispositivos semelhantes;
- criar uma pilha de overlays controlada para impedir dois diálogos concorrentes;
- restaurar a posição de rolagem interna somente quando isso fizer sentido ao reabrir o mesmo fluxo.

### Critérios de aceite

- todos os modais começam no topo;
- cabeçalho e ações permanecem visíveis;
- somente o corpo rola quando necessário;
- dropdowns e pickers nunca ficam cortados;
- foco não escapa para o conteúdo ao fundo;
- não existem estilos de modal paralelos sem justificativa.

---

## Etapa 12 — Mensagens, estados e acessibilidade completa

### Objetivo

Garantir que a interface comunique estado, erro e sucesso de forma consistente e acessível.

### Trabalho necessário

- consolidar `FormMessage`, `FieldError`, alertas e mensagens de sucesso;
- padronizar espaço, cor, tamanho e posição das mensagens;
- revisar contraste do placeholder e decidir uma solução que preserve suavidade e legibilidade;
- não usar placeholder como único rótulo ou instrução;
- validar contraste de texto, bordas de foco e controles;
- revisar `aria-label`, `aria-describedby`, `aria-invalid`, `aria-live` e roles;
- garantir navegação completa por teclado;
- testar foco visível em todos os controles;
- testar zoom de texto a 200%;
- revisar `prefers-reduced-motion` para reduzir ou remover animações adequadamente;
- avaliar `forced-colors` e modo de alto contraste;
- corrigir hierarquia de headings;
- executar uma auditoria automatizada com axe ou ferramenta equivalente, sem substituir a revisão manual.

### Novas ideias e melhorias propostas

- adicionar um resumo de erros no topo de formulários extensos com links para cada campo inválido;
- criar região `aria-live` central para guardar, concluir, excluir e falhas de conexão;
- adicionar link de “saltar para o conteúdo” nas páginas com cabeçalho persistente;
- incluir suporte básico a `forced-colors` para alto contraste do Windows;
- permitir reduzir movimento sem manter animações lentas desnecessárias;
- testar navegação com leitor de tela nos fluxos de encomenda e impressão;
- criar uma lista de termos e mensagens consistentes para erro, aviso, informação e sucesso.

### Critérios de aceite

- fluxos críticos podem ser concluídos somente por teclado;
- erros são anunciados e associados ao campo correto;
- foco é sempre visível;
- textos necessários atingem contraste adequado;
- a interface permanece utilizável com zoom de 200%;
- auditoria automatizada não apresenta violações críticas ou sérias sem decisão registrada.

---

## Etapa 13 — Área de gerenciamento

### Objetivo

Aplicar o mesmo padrão visual e responsivo às telas de configuração e catálogo.

### Trabalho necessário

- revisar shell e largura da página;
- padronizar painéis, listas e formulários;
- substituir breakpoint isolado de 760 px se não houver justificativa;
- testar listas vazias, longas e carregando;
- testar produtos e responsáveis com nomes extensos;
- revisar ações de criar, editar e excluir;
- validar confirmações e mensagens de sucesso/erro;
- conferir rolagem de listas e da página;
- garantir que campos e botões sigam alturas e tokens oficiais;
- validar acesso OWNER e comportamento visível para utilizadores sem permissão.

### Novas ideias e melhorias propostas

- adicionar pesquisa e ordenação nas listas gerenciais quando o volume justificar;
- mostrar contagem de produtos e responsáveis ativos;
- avaliar confirmação com opção de desfazer para ações reversíveis;
- separar claramente edição em andamento de criação de novo item;
- indicar duplicados antes do envio, sem depender somente do erro do servidor;
- manter o item recém-criado ou editado visível após atualizar a lista;
- oferecer estado vazio com instrução concreta para cadastrar o primeiro item.

### Critérios de aceite

- gerenciamento parece parte do mesmo produto;
- listas longas não prendem ou duplicam a rolagem;
- ações perigosas são claramente diferenciadas;
- tablet e telemóvel não apresentam campos ou botões comprimidos;
- permissões não são comunicadas apenas por cor.

---

## Etapa 14 — Impressão térmica

### Objetivo

Garantir que o modal e o conteúdo impresso funcionem com pedidos reais e impressora física.

### Trabalho necessário

- manter os estilos de tela separados dos estilos de impressão;
- revisar impressão de um dia e de um período;
- revisar filtro por categoria;
- testar formato detalhado e total de produtos;
- testar zero, uma e várias encomendas;
- testar encomenda com muitos produtos e observação longa;
- verificar se a altura fixa de 120 mm corta ou divide conteúdo;
- testar quebra de página entre encomendas;
- conferir largura útil, margens e escala em 80 mm;
- validar caracteres portugueses, números e símbolos;
- testar preview em navegador suportado;
- realizar prova física no modelo de impressora usado pela pastelaria;
- registrar configurações do driver, escala, margens e tamanho do papel.

### Novas ideias e melhorias propostas

- criar uma página de calibração com largura, margens, linhas e caracteres de teste;
- apresentar pré-visualização resumida antes de abrir o diálogo nativo de impressão;
- calcular altura variável por conteúdo quando o navegador e o driver permitirem;
- repetir cabeçalho ou identificação quando uma encomenda precisar de mais de uma folha;
- incluir aviso visível quando nenhum resultado corresponde ao período ou categoria;
- guardar preferências de impressão do equipamento local, como formato e categoria, quando isso não causar erros operacionais;
- registrar o modelo de impressora homologado e sua configuração conhecida.

### Critérios de aceite

- nenhuma informação operacional é cortada;
- cada formato imprime o conteúdo selecionado;
- pedidos longos têm comportamento definido;
- prova física é legível e não desperdiça papel de forma excessiva;
- resultado é aprovado pela pessoa que usará a impressora diariamente.

---

## Etapa 15 — Limpeza técnica e compatibilidade CSS

### Objetivo

Remover resíduos, duplicações e dependências frágeis após a padronização visual.

### Trabalho necessário

- confirmar e remover CSS Modules sem importação;
- revisar especificamente `LogoutConfirmDialog.module.css` e `FieldError.module.css`;
- localizar seletores, variáveis e keyframes sem uso;
- remover tokens antigos somente depois de confirmar ausência de consumidores;
- reduzir declarações duplicadas;
- revisar cores diretas fora dos tokens;
- revisar sombras e raios diretos;
- documentar exceções de impressão;
- conferir suporte dos navegadores a `:has`, `color-mix` e outras funções usadas;
- adicionar fallback somente onde os navegadores suportados exigirem;
- evitar uma refatoração ampla de arquivos sem benefício comprovado.

### Novas ideias e melhorias propostas

- adicionar regra de Stylelint para desencorajar cores diretas fora dos arquivos permitidos;
- criar verificação de CSS Modules não importados;
- estabelecer orçamento de tamanho para CSS e quantidade de seletores;
- produzir relatório de tokens não usados em CI;
- adicionar comentários curtos somente nas exceções realmente difíceis de entender;
- criar uma política de descontinuação para tokens antigos antes de removê-los;
- documentar a lista oficial de navegadores suportados pela pastelaria.

### Critérios de aceite

- nenhum arquivo removido possui consumidor;
- lint e build continuam aprovados;
- valores diretos restantes possuem justificativa;
- navegadores suportados renderizam os estados críticos;
- a limpeza reduz complexidade sem mudar comportamento.

---

## Etapa 16 — Desempenho do frontend

### Objetivo

Reduzir o custo de carregamento e interação, principalmente em telemóveis mais lentos.

### Trabalho necessário

- analisar o bundle atual e identificar os maiores módulos;
- separar páginas ou recursos que possam usar carregamento sob demanda;
- avaliar divisão de código para área gerencial, relatórios e componentes pesados;
- eliminar imports e dependências não utilizados;
- revisar renderizações desnecessárias em listas e formulários;
- medir carregamento inicial, tempo de interação e resposta dos filtros;
- testar listas extensas sem tornar a interface lenta;
- evitar otimizações especulativas sem medição;
- confirmar que lazy loading não causa flashes ou mudanças bruscas de layout.

### Novas ideias e melhorias propostas

- carregar sob demanda gerenciamento, relatórios e recursos raramente usados;
- antecipar carregamento ao passar o rato ou focar uma ação, quando houver benefício medido;
- reservar espaço para componentes assíncronos e evitar layout shift;
- medir Web Vitals em ambiente de homologação com dados sanitizados;
- reduzir trabalho de renderização durante digitação em pesquisa e comboboxes;
- avaliar virtualização apenas para listas realmente grandes;
- criar um limite de bundle que alerte novas regressões no CI.

### Critérios de aceite

- relatório de bundle antes e depois;
- redução mensurável ou decisão documentada de manter o tamanho;
- fluxo principal não fica mais lento;
- estados de carregamento são estáveis;
- não há mudança de comportamento provocada pela divisão de código.

---

## Etapa 17 — Testes visuais e matriz final

### Objetivo

Transformar os padrões estabelecidos em proteção contra regressões futuras.

### Trabalho necessário

- criar cenários visuais para login, painel, formulário, card, impressão e gerenciamento;
- cobrir estados vazio, carregando, erro, sucesso e conteúdo longo;
- validar a matriz de 1440, 1024, 768, 390, 360 e 320 px;
- testar modal de encomenda e impressão no topo e após rolagem;
- testar teclado, Escape, Tab e restauração de foco;
- verificar overflow horizontal automaticamente;
- adicionar auditoria de acessibilidade aos fluxos principais;
- testar ao menos o navegador principal da padaria e um motor alternativo suportado;
- armazenar evidências sem nomes, telefones ou encomendas reais;
- revisar manualmente toda atualização de screenshot de referência.

### Novas ideias e melhorias propostas

- criar uma galeria de componentes e estados dedicada ao desenvolvimento;
- usar dados extremos determinísticos para nomes, telefones, produtos e observações;
- gerar comparação visual com destaque de pixels alterados;
- executar automaticamente testes de overflow em várias larguras intermediárias;
- adicionar teste de contraste e axe aos cenários mais importantes;
- separar mudanças visuais intencionais de ruído causado por fontes ou animações;
- produzir um relatório único com screenshots, falhas e ambiente de execução.

### Cenários mínimos

1. Login válido e erro de login.
2. Painel sem encomendas.
3. Painel com uma encomenda.
4. Painel com muitas encomendas.
5. Card com conteúdo longo.
6. Criação de encomenda com um produto.
7. Criação com muitos produtos.
8. Sugestão e atualização de cliente.
9. Validação de responsável, data e hora.
10. Edição de encomenda.
11. Confirmação de conclusão.
12. Confirmação de exclusão.
13. Abertura do WhatsApp.
14. Impressão por dia e período.
15. Gerenciamento de produtos e responsáveis.

### Critérios de aceite

- cenários críticos possuem resultado esperado documentado;
- nenhuma largura da matriz apresenta overflow horizontal;
- screenshots de referência foram revisadas por humano;
- testes não usam dados pessoais reais;
- todos os gates técnicos estão aprovados.

---

## Etapa 18 — Homologação e publicação controlada

### Objetivo

Confirmar que o resultado local é realmente o resultado que chegará à pastelaria.

### Trabalho necessário

- garantir working tree compreensível e escopo revisado;
- revisar o diff final por etapa;
- criar build de produção;
- publicar primeiro em ambiente de homologação quando disponível;
- comparar local, homologação e produção sem assumir equivalência;
- testar com perfil OWNER e OPERATOR;
- executar cenários principais com dados seguros;
- validar telemóvel, tablet e computador reais da operação;
- executar a prova física da impressão;
- definir plano de rollback;
- publicar somente com autorização explícita;
- executar smoke test imediatamente após o deploy;
- registrar versão, commit, horário, responsável e resultado.

### Novas ideias e melhorias propostas

- publicar para um grupo pequeno ou equipamento de teste antes da liberação geral;
- usar feature flag apenas para mudanças arriscadas que precisem de ativação gradual;
- automatizar smoke test pós-deploy sem criar ou apagar dados reais;
- registrar um manifesto de release com build, commit e migrations aplicáveis;
- monitorar erros de frontend e falhas de carregamento logo após a publicação;
- criar um botão ou procedimento operacional simples para voltar à versão anterior;
- agendar uma revisão curta após os primeiros dias de uso real para capturar problemas não reproduzidos em testes.

### Critérios de aceite

- produção corresponde ao build aprovado;
- login, criação, edição, conclusão, exclusão, WhatsApp e impressão funcionam;
- nenhum P0 ou P1 permanece aberto;
- riscos P2 possuem responsável e decisão;
- rollback está disponível;
- a pessoa responsável pela operação aprovou a experiência nos equipamentos reais.

---

## 8. Definição final de “perfeitas condições”

Para este plano, a interface estará pronta quando todos estes pontos forem comprovados:

- identidade visual consistente;
- tokens usados de verdade, sem números arbitrários dominando o CSS;
- tipografia legível e previsível;
- controles e alvos de toque adequados;
- ícones uniformes e acessíveis;
- ausência de overflow horizontal entre 320 e 1440 px;
- comportamento correto com zoom e texto aumentado;
- conteúdo curto e extremo funcionando;
- modais, dropdowns e pickers sem cortes;
- mensagens de erro e sucesso consistentes;
- navegação completa por teclado;
- contraste e estrutura semântica aprovados;
- impressão validada no equipamento real;
- CSS limpo e sem arquivos abandonados;
- desempenho medido e aceitável;
- regressões visuais cobertas;
- versão de produção igual ao resultado homologado;
- fluxo operacional aprovado pela pastelaria.

“Perfeito” não significa ausência absoluta de qualquer melhoria futura. Significa que os fluxos necessários possuem critérios definidos, evidência atual e nenhum problema conhecido capaz de impedir ou confundir a operação.

## 9. Formato padrão de entrega de cada etapa

Ao aplicar uma etapa, a IA deve entregar:

1. objetivo realizado;
2. arquivos modificados;
3. decisões tomadas e justificativas;
4. comportamento antes e depois;
5. testes executados e resultados;
6. larguras e cenários verificados no navegador;
7. limitações ou estados não verificados;
8. riscos restantes;
9. confirmação de que não houve deploy nem mudança fora do escopo;
10. recomendação sobre qual etapa pode começar em seguida.

## 10. Modelo para pedir o prompt de uma etapa

Copiar e completar:

```text
Leia o arquivo:
C:\Users\rodri\Desktop\order-manager-main\docs\plano-aperfeicoamento-visual.md

Crie um prompt completo somente para a Etapa [NÚMERO] — [TÍTULO].

O prompt deve conter contexto, objetivo, escopo, arquivos prováveis, regras de segurança,
sequência de execução, critérios de aceite, testes técnicos e validação visual no navegador.

Inclua todas as ideias e melhorias propostas na etapa. Classifique cada uma como essencial,
recomendada ou opcional, explique benefício, risco e complexidade e deixe claro quais dependem
de aprovação antes da aplicação.

Não aplique nenhuma alteração agora. Entregue somente o prompt pronto para ser usado por outra IA.
Não inclua itens de outras etapas, salvo dependências estritamente necessárias.
```

## 11. Modelo para pedir a aplicação do prompt

```text
Aplique integralmente o prompt aprovado abaixo no projeto local:
C:\Users\rodri\Desktop\order-manager-main

[COLAR O PROMPT APROVADO]

Preserve alterações preexistentes, não faça deploy e não crie commit sem autorização.
Continue até concluir os critérios de aceite e apresente as evidências solicitadas.
```

## 12. Registro de progresso

Atualizar esta tabela apenas depois de executar e verificar cada etapa:

| Etapa | Data       | Resultado | Evidência                          | Pendências                                                                               | Aprovado por                                |
| ----: | ---------- | --------- | ---------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------- |
|     0 | 25/09/2026 | CONCLUÍDA | `docs/frontend-visual-baseline.md` | Login, gestão protegida, cards preenchidos, zoom real e impressão física não verificados | Codex, com auditoria automatizada e runtime |
|     1 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|     2 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|     3 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|     4 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|     5 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|     6 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|     7 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|     8 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|     9 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|    10 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|    11 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|    12 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|    13 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|    14 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|    15 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|    16 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|    17 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
|    18 | —          | PENDENTE  | —                                  | —                                                                                        | —                                           |
