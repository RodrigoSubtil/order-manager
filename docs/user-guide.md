# Guia do utilizador

## Para que serve

O Order Manager organiza encomendas da empresa ativa: consulta, criação, alteração, exclusão autorizada, filtros e impressão. Cada utilizador só vê os dados da empresa a que pertence.

## Entrar e sair

1. Abra o endereço fornecido pela empresa em navegador atualizado.
2. Introduza o utilizador e a senha fornecidos pelo administrador e selecione **Entrar**.
3. Se o dispositivo for pessoal e protegido, pode ativar **Manter conectado**. Não utilize esta opção num equipamento partilhado.
4. Se a sessão expirar, entre novamente. Não partilhe a senha nem deixe o dispositivo aberto.
5. Para terminar, use **Sair** e confirme. Isto limpa a sessão local.

Se receber acesso negado, confirme com o administrador se a sua membership está ativa e se tem o papel correto.

## Gerenciar produtos e responsáveis

O botão **Gerenciar** é reservado aos chefes:

1. selecione **Gerenciar** no cabeçalho;
2. introduza a senha gerencial;
3. crie, edite ou apague produtos e responsáveis;
4. selecione **Voltar às encomendas** ao terminar.

O desbloqueio é temporário e válido somente naquela sessão do navegador. Operadores que não possuam a senha continuam com acesso normal às encomendas, mas não conseguem alterar os dados administrativos.

## Consultar e filtrar

- Escolha uma data no calendário do Order Manager, **Hoje** ou **Todas as datas**. O mesmo calendário é usado ao criar ou editar uma encomenda, para manter a data consistente em computador e telemóvel.
- Selecione a área: Todas, Pastelaria, Padaria ou Salgados.
- Pesquise por cliente, telefone ou produto.
- Consulte os indicadores e cartões resultantes. Os resultados pertencem somente à empresa ativa.

Não inclua dados sensíveis em capturas de ecrã enviadas ao suporte.

## Criar encomenda

1. Selecione **Nova encomenda**.
2. Informe cliente, telefone quando aplicável, responsável, data e hora.
3. Adicione pelo menos um produto, com categoria, unidade (`UN`, `KG` ou `G`) e quantidade positiva.
4. Corrija os campos assinalados e selecione **Guardar encomenda**.

O sistema bloqueia o envio enquanto guarda. Uma encomenda só é criada quando dados principais e itens forem aceites juntos.

## Editar e resolver conflito

Ao guardar, o sistema verifica se outra pessoa alterou a encomenda. Se aparecer conflito:

1. feche ou recarregue a encomenda;
2. compare a versão atual com o que pretendia alterar;
3. aplique novamente apenas as alterações necessárias;
4. contacte o suporte se houver dúvida sobre qual informação é correta.

## Concluir, excluir e imprimir

Quando a produção estiver pronta, selecione **Concluir**. Depois da confirmação do Supabase, a encomenda sai do painel, permanece retida na base durante sete dias e é eliminada automaticamente pela rotina diária. **Apagar** continua reservado a correções de encomendas lançadas por engano.

Para imprimir, escolha impressão na lista ou numa encomenda, selecione dia/intervalo e o formato detalhado ou resumo por produto. Defina a “Hora inicial” e a “Hora final” para considerar somente as encomendas dentro desse intervalo. Num período entre datas, a hora inicial aplica-se ao primeiro dia e a hora final ao último. O padrão `00:00–23:59` inclui o dia inteiro, e a quantidade apresentada no diálogo já respeita as duas horas. Confirme empresa, período e horários antes de entregar o documento.

## Backup e modo de contingência

Depois de uma sincronização válida, o painel conserva neste navegador uma cópia das encomendas ativas, produtos e responsáveis. Se uma consulta ao Supabase falhar, aparece um aviso de **Modo de contingência** com a data da última sincronização. Uma empresa sem encomendas mostra apenas o estado vazio normal.

Neste modo é possível consultar, pesquisar e imprimir os dados guardados. Criar, editar, concluir e apagar ficam temporariamente bloqueados para impedir encomendas duplicadas ou alterações concorrentes. Assim que o Supabase voltar a responder, o painel retoma a operação normal.

O dono deve também abrir **Gerenciar > Cópia de segurança** e transferir regularmente o JSON organizado. Essa cópia contém dados pessoais de clientes e deve ser guardada num local privado, cifrado e fora do computador de uso diário. Consulte [free-backup.md](./free-backup.md) para a rotina e os limites.

## Acessibilidade e suporte

Use `Tab` para avançar, `Shift+Tab` para voltar e `Esc` para fechar diálogos quando disponível. Para suporte, informe o ocorrido, horário aproximado, browser/dispositivo e `traceId` exibido pela aplicação — nunca passwords, cookies ou dados de clientes.

Consulte [support-and-service.md](./support-and-service.md) para os canais e tempos de atendimento contratados.
