# Configuração Supabase

Esta aplicação usa Supabase Auth e PostgreSQL diretamente pelo frontend.

## Pré-requisitos

1. Crie um projeto Supabase separado para staging ou produção.
2. Configure no Vercel apenas `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_APP_URL`.
3. Configure as URLs de redirecionamento do Auth para o domínio Vercel e para `http://localhost:5173`.
4. Crie o utilizador no Supabase Auth e uma membership ativa com papel `OWNER`.

## Banco e segurança

Num projeto Supabase novo, reveja e aplique no SQL Editor, por esta ordem:

1. [schema base](../supabase/migrations/20260723_000_schema.sql);
2. [RPCs do frontend](../supabase/migrations/20260723_001_direct-web-rpcs.sql).

A primeira cria tabelas, relações, RLS e sincronização segura de `auth.users` para `public.users`. A segunda cria as operações que o frontend chama. Elas:

- mantém as tabelas de negócio protegidas por RLS;
- resolve a empresa por `auth.uid()` e pela membership padrão;
- não aceita `tenant_id` do browser;
- permite `OWNER` e `OPERATOR`, sem `ADMIN`;
- concentra escritas sensíveis em RPCs PostgreSQL.

Não aplique essas migrations em produção sem backup verificado e revisão manual.

> Se o projeto Supabase já tiver tabelas antigas ou com outro formato, não aplique o schema base por cima delas. Como os dados atuais são descartáveis, a opção segura é criar outro projeto vazio ou pedir uma limpeza controlada do schema antes da aplicação.

## Primeiro acesso

Depois de criar o primeiro utilizador em **Authentication > Users**, execute este bloco no SQL Editor, substituindo o email e o nome da pastelaria. Ele cria somente a empresa e a membership `OWNER` do utilizador indicado:

```sql
do $$
declare
  owner_id uuid;
  new_tenant_id uuid := gen_random_uuid();
begin
  select id into owner_id from auth.users where email = 'dono@exemplo.pt';
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

Em seguida, entre no site com esse email e palavra-passe. O `OWNER` pode criar os produtos e responsáveis em **Configurações**. Para criar um `OPERATOR` futuramente, crie-o primeiro no Supabase Auth e adicione uma membership ativa para o mesmo `tenant_id`; não envie `tenant_id` pelo navegador.
