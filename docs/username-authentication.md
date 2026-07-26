# Autenticação por utilizador

O Order Manager pede apenas **utilizador** e **senha**. O formulário aceita nomes de utilizador
normalizados com letras minúsculas, números e `_`, por exemplo `minha_pastelaria`. O valor é
normalizado no browser, mas a autenticação sempre devolve a mensagem genérica **Utilizador ou senha
incorretos**. A interface nunca revela contas existentes nem sugere um utilizador válido.

## Compatibilidade com Supabase Auth

Supabase Auth exige uma identidade em formato de email ou telefone. Como o produto não usa email de
contacto no login, o adaptador deriva internamente:

```text
<utilizador-normalizado-com-hifens>@users.order-manager.invalid
```

O formato público não aceita hífen; por isso a troca de `_` por `-` é determinística e não cria
colisões entre utilizadores válidos. Esse identificador técnico:

- não aparece no formulário, nos erros, no cabeçalho, na sessão RPC ou em `public.users`;
- não recebe mensagens;
- não substitui um email real de contacto;
- existe apenas para cumprir o contrato técnico do Supabase Auth.

`public.users.username` é obrigatório e único sem diferença entre maiúsculas e minúsculas. O nome
amigável exibido vem de `display_name`. A sessão retornada por `web_session_context()` contém
`username`, nunca email.

Cada nova pastelaria pode ter o seu próprio utilizador Auth, tenant e membership. O frontend não
possui um nome de empresa fixo e nunca escolhe `tenant_id`.

## Gestão de senha

O frontend não oferece recuperação ou troca de senha. A criação e eventual alteração administrativa
são feitas por um administrador autorizado no painel Supabase. A senha nunca é armazenada no
PostgreSQL público, no Git ou em variáveis `VITE_*`.
