# Configuração do Supabase

Este guia descreve a ordem de preparação de um projeto novo. Não é prova de que as operações já foram executadas no projeto em uso. Antes de qualquer SQL, confirme o **project ref**, ambiente, backup disponível e conta autorizada.

## Preparar

1. Crie ou escolha o projeto Supabase correto e configure Supabase Auth.
2. No Vercel e em `apps/web/.env`, use apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do mesmo projeto. Não exponha `service_role`, connection strings ou senhas.
3. Reveja os arquivos de [`supabase/migrations`](../../supabase/migrations) por ordem numérica. Num banco vazio, aplique os SQLs de `000` até `019` em sequência, verificando o resultado de cada um. Num banco existente, compare primeiro o histórico aplicado; não volte a executar cegamente uma migration.
4. As migrations `004`, `009`, `013` e `017` contêm dados ou ajustes específicos da Pastelaria Vénus. Use-as apenas no projeto a que se destinam. A `014` recusa identidades de produtos duplicadas; a `019` recusa nomes de responsáveis duplicados. Resolva os dados antes de aplicar, sem editar migrations antigas.
5. Crie a identidade Auth do primeiro utilizador, a empresa e a membership ativa `OWNER` conforme o schema e as funções aplicadas. O nome público de utilizador é convertido internamente em identidade técnica do Auth; nunca use essa identidade como e-mail de contacto.
6. Confirme `web_session_context`, RLS, grants das RPCs e papéis com sessões de `OWNER` e `OPERATOR`. Teste acesso negado de outra empresa antes de expandir o uso multi-tenant.

Para o primeiro acesso, crie no Auth um utilizador confirmado com o nome público pretendido. Confirme que a sincronização em `public.users` criou esse nome. Só então, no SQL Editor do **mesmo projeto**, crie a empresa e a membership numa transação, substituindo os identificadores do exemplo e verificando antes se ainda não existem:

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

Este bloco é para um projeto novo e não deve ser repetido num projeto já inicializado. Para criar outros utilizadores, confirme primeiro a identidade Auth e depois associe uma membership ativa ao tenant correto com autorização administrativa; o painel não faz gestão de utilizadores.

## Dados de demonstração e manutenção

[`supabase/seeds`](../../supabase/seeds) é opcional e não deve ser aplicado sobre dados reais sem rever o conteúdo. [`supabase/maintenance`](../../supabase/maintenance) contém scripts de inspeção/limpeza histórica, separados das migrations. A `014` não remove retroativamente encomendas antigas marcadas como concluídas ou apagadas; qualquer limpeza desse histórico exige contagem prévia, backup recuperável e verificação posterior.

Vercel não aplica migrations automaticamente. Publique o frontend dependente de uma migration só depois de confirmar que o SQL necessário está no projeto correto. O estado do banco deve ser registado na revisão da release, sem guardar credenciais nem dados de clientes no repositório.
