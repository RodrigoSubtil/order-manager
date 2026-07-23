# Acesso operacional e gerencial

## Modelo atual

A Pastelaria Vénus possui um acesso operacional ao dashboard. Depois do login:

- qualquer operador pode consultar, criar, editar, excluir e imprimir encomendas;
- o botão **Gerenciar** está visível, mas não abre os dados administrativos diretamente;
- catálogo e responsáveis só podem ser alterados depois da segunda senha;
- a segunda senha não substitui o login e não cria uma sessão independente.

## Proteção no Supabase

A proteção não depende apenas de esconder botões no React.

1. O frontend chama `web_unlock_management`.
2. O PostgreSQL compara a senha com um hash `bcrypt`.
3. O desbloqueio é associado ao `auth.uid()` e ao `session_id` do token atual.
4. A autorização expira em 15 minutos.
5. `web_save_catalog_product`, `web_delete_catalog_product`, `web_save_responsible` e `web_delete_responsible` chamam `web_require_management_access`.
6. Sem desbloqueio válido, a operação é recusada mesmo que seja chamada manualmente pelo console do navegador.

Após cinco tentativas incorretas, aquela sessão fica bloqueada por 15 minutos. Sair da área pelo botão **Voltar às encomendas** remove o desbloqueio imediatamente.

## Segredos

As senhas reais nunca devem aparecer em:

- migrations;
- documentação;
- commits;
- variáveis `VITE_*`;
- logs ou mensagens de erro.

O primeiro cadastro da senha gerencial ocorre por RPC autenticada e só funciona enquanto ainda não existir uma credencial para a empresa. Alterações posteriores devem ser feitas por um procedimento administrativo controlado.
