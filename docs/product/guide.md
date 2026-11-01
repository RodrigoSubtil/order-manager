# Guia de utilização · v1.1.0 (desenvolvimento e homologação)

Este guia descreve o ciclo 1.1.0, com IA e novo design, em desenvolvimento e homologação. A produção permanece em 1.0.0 até aprovação explícita da promoção.

## Entrar e consultar

Entre com **Utilizador** e **Senha**. Use **Manter conectado** só num equipamento privado; use **Sair** num equipamento partilhado. A versão aparece centralizada abaixo de **Entrar** no login e discretamente no canto superior direito do painel.

Os indicadores **Total**, **Hoje** e **Próximas** abrangem as encomendas ativas e não mudam com os filtros. Na lista, escolha uma área e uma das opções de data: **Todas as datas**, **Hoje** ou **Definir data**. Esta última abre o calendário; depois de escolher, a data aparece no mesmo seletor. A pesquisa encontra cliente, telefone, responsável e produto. Toque no campo ou na seta para abrir/fechar as opções; uma escolha fecha a lista automaticamente.

O resumo dos filtros mostra data e área com ícones, sem caixa em volta, e a quantidade de encomendas na mesma linha. Em larguras menores, reduz o texto e os espaços para evitar quebra. Quando não há encomendas, a mensagem de lista vazia substitui o contador de zero.

No cabeçalho de cada cartão, a data aparece à esquerda e a hora à direita. Quando não há hora definida, aparece **Sem hora**.

Os cartões usam fundo branco, faixa clara na data e espaçamentos uniformes. O nome do cliente tem destaque; responsável, número da encomenda e telefone aparecem com menor peso visual. Os produtos são separados por linhas discretas, com quantidade à direita e observações abaixo do nome. As ações ficam centradas em botões de 44 px; a impressão individual continua disponível a partir de tablet.

## Criar ou editar uma encomenda

1. Toque em **+** para abrir **Novo pedido**; para alterar, use **Editar** no cartão.
2. Escolha um responsável existente ou escreva um nome novo. Ao guardar, o nome novo é normalizado e criado juntamente com a encomenda.
3. Escreva o cliente ou escolha uma sugestão. Quando escolhe um cliente, o telefone e o país são preenchidos. Uma alteração ao cliente existente pode atualizar o cadastro.
4. Selecione o país antes de introduzir o telefone. O padrão é **PT +351**. O campo mostra espaços ou pontuação do país enquanto escreve; só dígitos são guardados. Em Portugal, `912345678` aparece como `912 345 678`.
5. Escolha data e hora de entrega. A hora é selecionada de meia em meia hora, entre 08:00 e 21:00, sem aceitar um horário já passado para hoje.
6. Para cada item, indique área, produto, quantidade e unidade. Use o botão **+** abaixo do último produto para acrescentar outro item; a lixeira de cada cartão remove somente esse produto. Observações são opcionais. Lance bolos em `g` ou `kg` conforme a produção.
7. Toque em **Salvar** e espere a confirmação; volte ao painel para ver a lista atualizada. Não repita uma gravação após erro de ligação sem verificar se já foi concluída.

As listas de cliente/produto admitem escrita; os demais seletores usam as opções exibidas. Ao escolher uma opção, a lista fecha e o teclado do telemóvel recolhe. A roda de hora requer **Confirmar** depois de escolher a hora completa.

## Digitalizar uma encomenda

Quando a digitalização estiver ativada, toque no ícone da câmara. Escolha **Abrir câmara** ou **Escolher foto**, usando uma fotografia por leitura. Confira a imagem e toque em **Continuar**, ou em **Refazer** para escolher novamente.

A câmara mostra um enquadramento horizontal 4:3. Posicione todo o papel dentro da área visível antes de tirar a fotografia: a captura corresponde a esse enquadramento, sem deformar a imagem. Fotografias escolhidas do aparelho mantêm o formato original.

A barra adapta-se à largura disponível: até **560 px**, mostra **Digitalizar** à esquerda e **Adicionar** à direita, com cada filtro numa linha; a impressão geral fica oculta. De **561 a 1024 px**, a câmara ocupa a primeira linha, **Imprimir / Adicionar** a segunda e os filtros dividem a terceira igualmente. Acima de **1024 px**, fica tudo numa linha: **Área / Data / Imprimir / Adicionar**, com a câmara oculta. Se a digitalização estiver desativada, o botão Adicionar ocupa a linha toda no telemóvel. A impressão individual no cartão também fica oculta até 560 px e volta a aparecer no tablet/computador. No telemóvel, os quatro ícones restantes ficam numa única linha, com botões de 44 px e espaço inferior.

O carregamento mostra uma percentagem estimada. Ao terminar a leitura, o formulário de conferência abre diretamente com os dados preenchidos, sem modal intermediário. Pode usar **Cancelar** enquanto escolhe a foto, usa a câmara ou aguarda a leitura. **Provável**, em laranja, indica uma leitura aparentemente legível; **Conferir**, em vermelho, destaca um dado que precisa de atenção. Uma alteração manual muda apenas o indicador desse campo para **Conferido**, em verde com um visto. Quantidade e unidade têm indicadores separados. O verde indica edição humana e não substitui a validação dos campos obrigatórios.

Os três estados usam fundos claros e bordas discretas, mantendo o texto e os ícones para distinguir cada indicação.

Confira os dados e toque em **Salvar**. A leitura da fotografia não grava uma encomenda automaticamente. Se a foto não puder ser lida ou um limite de utilização for atingido, pode preencher a encomenda manualmente.

## Concluir, apagar e imprimir

**Concluir** e **Apagar** pedem confirmação. Ambas retiram permanentemente a encomenda e os seus produtos do banco; a ação não pode ser desfeita pelo painel. A numeração de pedidos não volta atrás. Depois de apagar, a confirmação mostra “Encomenda de [nome do cliente] apagada com sucesso” com o nome em destaque e permite voltar à lista pelo botão no rodapé. Os modais não têm X; as confirmações usam **Não**, impressão e digitalização usam **Cancelar**, e o formulário mantém lixeira vermelha e visto verde no rodapé. Na digitalização, Cancelar está disponível em todas as etapas e não guarda uma encomenda.

No cartão, o ícone de impressora imprime uma encomenda. O ícone de impressão no topo abre a impressão geral: escolha dia ou período, horas, áreas e **Encomendas detalhadas** ou **Quantidade geral de produtos**. A detalhada cria uma ficha separada por encomenda. O resumo soma apenas quantidades `un` do mesmo produto/área; pesos `g` e `kg` continuam em linhas separadas, identificadas pelo número do pedido.

A página de cada talão usa 80 mm de largura e altura calculada pelo conteúdo. No diálogo do Chrome, selecione o destino e o papel/driver da impressora térmica, escala 100% e sem cabeçalho/rodapé do navegador. A prévia em PDF ajuda a conferir cortes, mas a impressão física ainda depende do driver e do papel instalados.

## Quando houver falha

Se o Supabase estiver indisponível, a aplicação mostra erro e não simula dados locais. Recarregue depois de confirmar a ligação. Para perda ou indisponibilidade prolongada, siga [backup e recuperação](../operations/backup.md).

## Recolhas atrasadas

Uma encomenda pendente passa a mostrar **Recolha atrasada · há…** depois da data e hora marcadas em Lisboa. O contador atualiza a cada minuto e ao regressar à aba; depende de o relógio do aparelho estar correto. Encomendas sem data/hora válidas não recebem um atraso calculado. Na mudança de hora de outono, o horário repetido é interpretado pela ocorrência mais tardia para não avisar antes do prazo; um horário inexistente na mudança de primavera pede correção dos dados.

O aviso vermelho e compacto acima dos filtros mostra apenas a quantidade; o tempo de atraso continua em cada cartão. Ele conta todas as encomendas pendentes atrasadas, incluindo dias anteriores ou encomendas ocultas pelos filtros. **Ver** mostra essas encomendas da mais antiga para a mais recente; **Voltar** recupera a pesquisa, a área e a data anteriores. Alterar um filtro sai dessa visualização. Se todas forem concluídas, a visualização mantém um botão de retorno.

**Concluir** continua a exigir confirmação e retira a encomenda da lista de pendentes após a operação ser aceite. O aviso indica horário ultrapassado sem conclusão registada: o sistema não deteta a chegada física do cliente. Não há chamadas à IA, som ou popups repetidos para calcular o atraso. A leitura dos dados mantém a atualização normal do painel.
