# Acesso operacional e gerencial

Atualizado em 26 de julho de 2026.

## Papéis

- `OPERATOR`: consulta, cria, edita, conclui, apaga e imprime encomendas.
- `OWNER`: possui as mesmas operações e vê o botão **Gerenciar**.

Um operador que acesse `/settings` diretamente recebe uma tela de acesso negado e as consultas
administrativas não são iniciadas.

## Segunda senha

O OWNER ainda precisa confirmar a senha gerencial para alterar produtos e responsáveis:

1. o frontend chama `web_unlock_management`;
2. PostgreSQL compara com hash `bcrypt`;
3. o desbloqueio é ligado a `auth.uid()` e ao `session_id`;
4. a validade é de 15 minutos;
5. cinco erros bloqueiam novas tentativas por 15 minutos;
6. sair da área revoga o desbloqueio;
7. cada RPC administrativa valida OWNER e desbloqueio novamente.

Esconder o botão no React é apenas experiência; a proteção efetiva fica no Supabase.

## Área Gerenciar

A página apresenta:

- total e lista pesquisável de produtos;
- filtro por área e edição de nome/categoria;
- total e lista pesquisável de responsáveis;
- criação, edição e exclusão com confirmação.

O produto do catálogo não exige unidade. `UN`, `KG` ou `G` são escolhidos em cada item da
encomenda.

## Segredos

Passwords nunca entram em migrations, documentação, commits, logs ou variáveis `VITE_*`. O primeiro
cadastro gerencial é feito por RPC autenticada e alterações posteriores exigem procedimento
administrativo controlado.
