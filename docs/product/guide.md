# Guia de utilização · v1.0.0

## Entrar e consultar

Entre com **Utilizador** e **Senha**. Use **Manter conectado** só num equipamento privado; use **Sair** num equipamento partilhado. A versão aparece centralizada abaixo de **Entrar** no login e discretamente no canto superior direito do painel.

Os indicadores **Total**, **Hoje** e **Próximas** abrangem as encomendas ativas e não mudam com os filtros. Na lista, escolha uma área e uma das opções de data: **Todas as datas**, **Hoje** ou **Definir data**. Esta última abre o calendário; depois de escolher, a data aparece no mesmo seletor. A pesquisa encontra cliente, telefone, responsável e produto. Toque no campo ou na seta para abrir/fechar as opções; uma escolha fecha a lista automaticamente.

## Criar ou editar uma encomenda

1. Toque em **+** para abrir **Novo pedido**; para alterar, use **Editar** no cartão.
2. Escolha um responsável existente ou escreva um nome novo. Ao guardar, o nome novo é normalizado e criado juntamente com a encomenda.
3. Escreva o cliente ou escolha uma sugestão. Quando escolhe um cliente, o telefone e o país são preenchidos. Uma alteração ao cliente existente pode atualizar o cadastro.
4. Selecione o país antes de introduzir o telefone. O padrão é **PT +351**. O campo mostra espaços ou pontuação do país enquanto escreve; só dígitos são guardados. Em Portugal, `912345678` aparece como `912 345 678`.
5. Escolha data e hora de entrega. A hora é selecionada de meia em meia hora, entre 08:00 e 21:00, sem aceitar um horário já passado para hoje.
6. Para cada item, indique área, produto, quantidade e unidade. Use **Adicionar mais um produto** quando necessário. Observações são opcionais. Lance bolos em `g` ou `kg` conforme a produção.
7. Toque em **Salvar** e espere a confirmação; volte ao painel para ver a lista atualizada. Não repita uma gravação após erro de ligação sem verificar se já foi concluída.

As listas de cliente/produto admitem escrita; os demais seletores usam as opções exibidas. Ao escolher uma opção, a lista fecha e o teclado do telemóvel recolhe. A roda de hora requer **Confirmar** depois de escolher a hora completa.

## Concluir, apagar e imprimir

**Concluir** e **Apagar** pedem confirmação. Ambas retiram permanentemente a encomenda e os seus produtos do banco; a ação não pode ser desfeita pelo painel. A numeração de pedidos não volta atrás.

No cartão, o ícone de impressora imprime uma encomenda. O ícone de impressão no topo abre a impressão geral: escolha dia ou período, horas, áreas e **Encomendas detalhadas** ou **Quantidade geral de produtos**. A detalhada cria uma ficha separada por encomenda. O resumo soma apenas quantidades `un` do mesmo produto/área; pesos `g` e `kg` continuam em linhas separadas, identificadas pelo número do pedido.

A página de cada talão usa 80 mm de largura e altura calculada pelo conteúdo. No diálogo do Chrome, selecione o destino e o papel/driver da impressora térmica, escala 100% e sem cabeçalho/rodapé do navegador. A prévia em PDF ajuda a conferir cortes, mas a impressão física ainda depende do driver e do papel instalados.

## Quando houver falha

Se o Supabase estiver indisponível, a aplicação mostra erro e não simula dados locais. Recarregue depois de confirmar a ligação. Para perda ou indisponibilidade prolongada, siga [backup e recuperação](../operations/backup.md).
