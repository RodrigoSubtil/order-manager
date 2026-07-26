# Guia do utilizador

Atualizado em 26 de julho de 2026.

## Entrar

1. informe o nome de utilizador e a senha;
2. marque **Manter conectado** apenas num equipamento privado;
3. selecione **Entrar**;
4. use **Sair** ao terminar num equipamento partilhado.

## Dashboard

Os indicadores **Total**, **Hoje** e **Próximas** representam todas as encomendas ativas e não mudam
por causa dos filtros. A lista permanece ordenada por data e hora de entrega.

Filtros:

- **Todas as áreas**;
- **Hoje**;
- **Todas as datas**;
- calendário, sem datas anteriores;
- pesquisa por cliente, telefone, responsável ou produto.

O texto pesquisado é destacado nos cartões. O número de resultados corresponde aos filtros atuais.

## Criar ou editar

1. aperte o botão `+`;
2. preencha cliente, telefone, responsável, data e hora;
3. o responsável precisa ser escolhido da lista;
4. informe área, produto, quantidade e unidade de cada item;
5. use **Adicionar mais um produto** quando necessário;
6. observações são o único campo opcional;
7. guarde e espere a confirmação;
8. selecione **Voltar às encomendas** para recarregar o dashboard.

Erros aparecem junto do respetivo campo e o primeiro inválido recebe foco. Uma edição concorrente
pede que os dados sejam recarregados antes de tentar novamente.

Ao escolher hoje, a hora não pode ser anterior ao minuto atual. O seletor de hora mostra o mínimo
permitido e o banco valida novamente antes de guardar.

## Concluir e apagar

- **Concluir** pede confirmação, retira a encomenda ativa e conserva o registo por sete dias.
- **Apagar** pede confirmação e informa que a ação não poderá ser anulada.
- a mensagem de sucesso aparece somente depois da resposta confirmada.

## Imprimir

Impressão individual usa o ícone do cartão. Impressão geral usa o ícone destacado nos filtros.

- **Um dia:** escolha Data, Hora inicial e Hora final.
- **Período:** escolha Data inicial e Data final; os dias são considerados por inteiro.
- **Detalhada:** uma ficha completa por encomenda.
- **Qtd. total dos produtos:** soma produtos compatíveis por área e unidade.

No diálogo do sistema, escolha bobina 80 mm, margens mínimas, escala 100%, sem cabeçalho/rodapé do
navegador. Cada encomenda inclui o próprio cabeçalho. A altura acompanha o conteúdo; o driver da
impressora, e não o site, decide o tamanho físico final.

## Gerenciar

Somente o dono vê **Gerenciar**. Depois da segunda senha, ele pode pesquisar, criar, editar e apagar
produtos e responsáveis. A unidade não pertence ao catálogo; ela é definida na encomenda.

## Falha de ligação

Se o Supabase estiver indisponível, o site mostra um erro e não confirma a operação. Não repita uma
criação ou alteração até verificar a ligação e atualizar a lista. O navegador não guarda uma cópia
local das encomendas.
