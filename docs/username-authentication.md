# Autenticação por utilizador

O Order Manager pede apenas **utilizador** e **senha**. O utilizador operacional da instalação atual é `pastelaria_venus`. O frontend converte esse texto para o identificador técnico interno já existente `pastelaria-venus`, sem mostrar ou alterar o email reservado do Supabase Auth.

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
