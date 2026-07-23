# Autenticação por utilizador

O Order Manager pede apenas **utilizador** e **senha**. O campo aceita um nome amigável com espaços e acentos, como `Pastelaria Vénus`. O frontend converte esse texto somente para o identificador técnico interno `pastelaria-venus`.

## Compatibilidade com Supabase Auth

Supabase Auth exige uma identidade em formato de email ou telefone. Como o produto não usa email de contacto, o adaptador de autenticação deriva internamente:

```text
<utilizador-normalizado>@users.order-manager.invalid
```

Esse valor:

- não aparece no formulário, cabeçalho, sessão RPC ou tabela `public.users`;
- não recebe mensagens;
- não substitui um email real de contacto;
- existe apenas para cumprir o contrato técnico do Supabase Auth.

`public.users.username` é obrigatório e único sem diferença entre maiúsculas e minúsculas. O nome amigável exibido vem de `display_name`. A sessão retornada por `web_session_context()` contém `username`, nunca email.

## Gestão de senha

O frontend não oferece recuperação ou troca de senha. A criação e eventual alteração administrativa são feitas por um administrador autorizado no painel Supabase. A senha nunca é armazenada no PostgreSQL público, no Git ou em variáveis `VITE_*`.
