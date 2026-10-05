# Configuração do Supabase

Este guia descreve a ordem de preparação de um projeto novo. Não é prova de que as operações já foram executadas no projeto em uso. Antes de qualquer SQL, confirme o **project ref**, ambiente, backup disponível e conta autorizada.

## Preparar

1. Crie ou escolha o projeto Supabase correto e configure Supabase Auth.
2. No Vercel e em `apps/web/.env`, use apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do mesmo projeto. Não exponha `service_role`, connection strings ou senhas.
3. Para um projeto vazio, aplique somente os três arquivos ativos de [supabase/migrations](../../supabase/migrations), em ordem e em transações separadas. A base é sem seeds, senhas ou cron. Ela foi testada em PostgreSQL 17.11 local e aplicada aos projetos existentes após backup e comparação de dados.
4. Os 20 scripts anteriores estão preservados em [legacy_migrations](../../supabase/legacy_migrations/README.md), fora do caminho da CLI. Não os reaplique. Num ambiente existente, consulte o histórico e compare o schema antes de qualquer db push. Os dois projetos foram reconciliados com as versões 20261005205508, 20261005205821 e 20261005214152; veja [validação final](readiness-2026-10-05.md).
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

## Configuração verificada em 05/10/2026

Produção usa `otwriruoqqwjwzzgicru`; homologação usa `czbrnxrpofdbbgbdyrad`, em organização Free separada. Os endereços, planos observados, utilizadores e variáveis estão em [Ambientes](environments.md). Nunca escolha o banco apenas pelo nome do tenant: seu UUID coincide entre os dois projetos.

Em homologação: signup público e login anónimo desativados, email/password habilitado, utilizador confirmado com membership `OWNER`, RLS nas 13 tabelas públicas, sem acesso direto de anon/authenticated às tabelas e sem EXECUTE público para anon. A aplicação utiliza RPCs autenticadas. O indicador da Data API de zero funções expostas a anon não impede essas RPCs; não conceda acesso anónimo para resolver esse indicador.

O Site URL corresponde ao domínio de cada ambiente. As identidades técnicas do login não recebem email; recuperação/magic link/OAuth não foram implementados como consequência dessa configuração. Mudanças de utilizador precisam sincronizar identidade Auth e perfil público, preservando memberships e referências de auditoria.

O novo login de teste foi verificado no site. A senha gerencial continua independente, configurada e preservada. Passwords, hashes, access/refresh tokens e chaves não devem ser incluídos no relatório de operação. Sessões revogadas não tornam instantaneamente inválido todo access token já emitido; considere o prazo do JWT ao planear operações sensíveis.

O schema de aplicação e o histórico ativo foram reconciliados nos dois projetos. A comparação final incluiu 13 tabelas e 37 funções públicas/privadas com definições e privilégios iguais. Os três registros ativos correspondem à base realmente aplicada; os registros antigos foram arquivados em backup privado. Não reaplique a antiga 008 ou seeds. Veja [validação final](readiness-2026-10-05.md).
