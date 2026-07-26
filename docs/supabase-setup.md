# Configuração Supabase

Esta aplicação usa Supabase Auth e PostgreSQL diretamente pelo frontend.

## Pré-requisitos

1. Crie um projeto Supabase separado para staging ou produção.
2. Configure no Vercel apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Crie o utilizador no Supabase Auth e uma membership ativa com papel `OWNER`.

## Banco e segurança

Num projeto Supabase novo, reveja e aplique no SQL Editor, por esta ordem:

1. [schema base](../supabase/migrations/20260723_000_schema.sql);
2. [RPCs do frontend](../supabase/migrations/20260723_001_direct-web-rpcs.sql);
3. [autenticação por utilizador](../supabase/migrations/20260723_002_username_auth.sql);
4. [acesso gerencial](../supabase/migrations/20260724_003_management_access.sql);
5. [dados iniciais da Pastelaria Vénus](../supabase/migrations/20260724_004_venus_initial_data.sql), somente no projeto destinado a essa empresa.
6. [campos obrigatórios da encomenda](../supabase/migrations/20260724_005_required_order_fields.sql).
7. [pesquisa e função histórica de exportação](../supabase/migrations/20260724_006_search_and_backup_export.sql).
8. [proteção das funções](../supabase/migrations/20260724_007_function_security_hardening.sql).
9. [conclusão e retenção de encomendas](../supabase/migrations/20260724_008_complete_orders_and_retention.sql).
10. [nome visível do utilizador Vénus](../supabase/migrations/20260725_009_venus_username.sql).
11. [remoção da exportação JSON descontinuada](../supabase/migrations/20260726_010_remove_json_backup.sql).
12. [bloqueio de entregas no passado](../supabase/migrations/20260726_011_prevent_past_delivery.sql).

A primeira cria tabelas, relações, RLS e sincronização segura de `auth.users` para `public.users`. Ela também normaliza os valores padrão de UUID e `updated_at`, para que um schema-alvo preparado anteriormente continue compatível. A segunda cria as operações que o frontend chama. Elas:

- mantém as tabelas de negócio protegidas por RLS;
- resolve a empresa por `auth.uid()` e pela membership padrão;
- não aceita `tenant_id` do browser;
- permite `OWNER` e `OPERATOR`, sem `ADMIN`;
- concentra escritas sensíveis em RPCs PostgreSQL.

A sexta migration impede também no PostgreSQL a gravação de encomendas sem telefone, responsável ou hora de entrega. Ela interrompe com erro antes de alterar o schema caso encontre registos antigos incompletos.

A nona migration adiciona o fluxo **Concluir**, oculta as encomendas concluídas da listagem operacional e agenda no `pg_cron` a eliminação diária dos registos com mais de 7 dias. Encomendas ativas não são alteradas.

A décima migration atualiza com segurança o nome visível do OWNER existente para
`pastelaria_venus` e os metadados públicos do Auth. Ela não altera password nem a identidade técnica
de e-mail usada internamente pelo Supabase.

A décima primeira migration revoga e remove a função histórica de exportação JSON. O produto
deixa de criar arquivos, snapshots comerciais ou históricos paralelos no navegador.

A décima segunda migration impede no PostgreSQL a criação ou alteração de uma entrega para data ou
hora anterior ao minuto atual em `Europe/Lisbon`. O navegador aplica a mesma regra para orientar o
utilizador, mas o trigger é a proteção efetiva contra chamadas manuais.

Para demonstração visual da Pastelaria Vénus, o seed opcional
[`20260724_venus_showcase_orders.sql`](../supabase/seeds/20260724_venus_showcase_orders.sql)
cria dez encomendas variadas sem substituir encomendas existentes. O script é
transacional, preserva a sequência atual e não duplica os registos quando
executado novamente.

Não aplique essas migrations em produção sem backup verificado e revisão manual.

> Se o projeto Supabase tiver tabelas antigas com outro formato, não aplique o schema base por cima delas. Os ajustes de compatibilidade são apenas para o schema-alvo já preparado; um legado diferente requer uma limpeza controlada ou uma migração revisada antes da aplicação.

## Primeiro acesso

Escolha um utilizador público com letras, números e `_`. Crie no Supabase Auth a identidade técnica
derivada descrita em [Autenticação por utilizador](username-authentication.md), marque a conta como
confirmada e defina a senha inicial. O identificador técnico nunca é mostrado como contacto nem em
mensagens de erro.

Depois, execute este bloco no SQL Editor, substituindo o utilizador e o nome da pastelaria. Ele cria somente a empresa e a membership `OWNER`:

```sql
do $$
declare
  owner_id uuid;
  new_tenant_id uuid := gen_random_uuid();
begin
  select id into owner_id from public.users where username = 'minha_pastelaria';
  if owner_id is null then
    raise exception 'Crie primeiro o utilizador no Supabase Auth.';
  end if;

  insert into public.tenants (id, slug, name, created_by, updated_by)
  values (new_tenant_id, 'minha-pastelaria', 'Minha Pastelaria', owner_id, owner_id);

  insert into public.tenant_memberships (
    tenant_id, user_id, role, status, is_default, created_by, updated_by
  ) values (
    new_tenant_id, owner_id, 'OWNER', 'ACTIVE', true, owner_id, owner_id
  );
end $$;
```

Em seguida, entre no site com o utilizador e a senha. O botão **Gerenciar** solicita uma segunda senha antes de permitir alterações de catálogo e responsáveis. Essa senha:

- é guardada somente como hash `bcrypt` no PostgreSQL;
- não fica no React, no Git ou em variáveis `VITE_*`;
- libera apenas o `session_id` atual por 15 minutos;
- bloqueia novas tentativas durante 15 minutos após cinco erros;
- continua exigindo uma membership `OWNER` no servidor.

Consulte [management-access.md](./management-access.md) para o fluxo completo. Para criar um `OPERATOR` futuramente, crie primeiro a identidade técnica correspondente no Supabase Auth e adicione uma membership ativa para o mesmo `tenant_id`; não envie `tenant_id` pelo navegador.
