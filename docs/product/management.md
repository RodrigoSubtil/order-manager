# Guia de gestão

## Papéis

| Papel      | Encomendas                                      | Catálogo e responsáveis        |
| ---------- | ----------------------------------------------- | ------------------------------ |
| `OPERATOR` | Consulta, cria, edita, conclui, apaga e imprime | Sem acesso gerencial           |
| `OWNER`    | Mesmas operações                                | Pode desbloquear **Gerenciar** |

O `OWNER` precisa da segunda senha para alterar catálogo e responsáveis. O banco valida o papel, a sessão e o desbloqueio em cada RPC administrativa; esconder o botão não é mecanismo de autorização. O desbloqueio dura 15 minutos e bloqueia novas tentativas temporariamente após cinco erros. Ao sair da área, é revogado.

## Catálogo e responsáveis

Em **Gerenciar**, pesquise, crie, altere ou apague produtos e responsáveis. Cada produto pertence a uma área; a unidade (`un`, `g`, `kg`) é definida na encomenda, não no catálogo. O nome de responsável também pode ser escrito no novo pedido; quando for novo, a gravação cria-o automaticamente na mesma transação.

Confirme exclusões e verifique se o item não está a ser usado antes de uma alteração com impacto operacional. Erros de conflito indicam que outra pessoa mudou o registo: recarregue antes de repetir.

## Primeiro acesso e administração técnica

A criação de um `OWNER`, memberships e mudanças de senha são operações administrativas no Supabase, não no painel. Siga [configuração do Supabase](../operations/supabase.md); nunca partilhe senhas em documentação ou no código. O login público usa um nome de utilizador, convertido internamente numa identidade técnica do Supabase Auth. `tenant_id` e papel vêm da membership autenticada.
