# Backup gratuito do Order Manager

O plano gratuito do Supabase não oferece a mesma restauração automática dos planos pagos. A documentação oficial recomenda que projetos gratuitos exportem regularmente a base com `supabase db dump` e mantenham uma cópia fora do Supabase:

- <https://supabase.com/docs/guides/platform/backups>
- <https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore>

## Proteção disponível na aplicação

Na área **Gerenciar > Cópia de segurança**, o OWNER autenticado e com a senha gerencial desbloqueada pode transferir um JSON contendo:

- empresa e sequência atual de encomendas;
- perfis e memberships sem passwords ou tokens;
- catálogo e responsáveis;
- encomendas e respetivos itens;
- registos ativos e apagados logicamente.

O JSON é formatado com indentação e separado por secções (`tenant`, `users`, `memberships`, `catalogProducts`, `responsibles`, `orders` e `orderItems`) para poder ser auditado e recuperado de forma controlada.

O ficheiro contém nomes e telefones de clientes. Deve ser guardado num local privado e fora do computador usado diariamente, preferencialmente numa pasta cifrada do OneDrive, Google Drive ou armazenamento equivalente. Nunca deve ser enviado por e-mail ou colocado no repositório Git.

Rotina mínima recomendada:

1. transferir no fim de cada dia com encomendas novas;
2. conservar os últimos 7 ficheiros diários;
3. conservar uma cópia semanal durante 4 semanas;
4. testar a leitura do ficheiro depois de o transferir;
5. solicitar uma restauração controlada a partir de uma cópia antes de substituir qualquer base real.

## Modo de contingência do navegador

Depois de uma sincronização bem-sucedida, o painel mantém no navegador uma cópia local das encomendas ativas, catálogo e responsáveis daquela empresa. Se uma consulta ao Supabase falhar, ou se o servidor devolver inesperadamente zero encomendas depois de existirem encomendas, o painel:

- mostra um aviso permanente com a data e hora da última sincronização;
- permite consultar, pesquisar, paginar e imprimir o backup local;
- bloqueia criação, edição e exclusão para evitar duplicados e conflitos;
- volta a usar o Supabase quando a ligação e os dados forem corrigidos.

Esta cópia é separada por `tenant_id` e nunca contém passwords, tokens ou chaves. Ela não substitui a exportação externa: se o computador ou o perfil do navegador for perdido, a cópia local também se perde.

Gravação offline não está habilitada. Para a oferecer com segurança seria necessário implementar uma fila idempotente, IDs temporários, sincronização e resolução de conflitos; permitir gravações diretamente num JSON poderia duplicar ou sobrescrever encomendas reais.

## Backup lógico completo

Para preservar também schema, roles e histórico de migrations, use o fluxo oficial `supabase db dump`. Ele requer a connection string da base, a password do PostgreSQL, Supabase CLI e Docker. A connection string deve ser fornecida por variável de ambiente ou introduzida apenas no terminal; nunca deve entrar no código, histórico do PowerShell ou Git.

Exemplo de estrutura do backup completo:

```powershell
supabase db dump --db-url $env:SUPABASE_DB_URL -f roles.sql --role-only
supabase db dump --db-url $env:SUPABASE_DB_URL -f schema.sql
supabase db dump --db-url $env:SUPABASE_DB_URL -f data.sql --use-copy --data-only
```

Os três ficheiros devem ser cifrados e copiados para armazenamento privado fora do Supabase. Uma restauração deve ser ensaiada primeiro num projeto isolado. Nunca execute o restore diretamente na base em uso sem backup adicional, reconciliação e autorização.

## Limites

- O JSON da aplicação é uma cópia de dados comerciais para recuperação assistida; não substitui um dump PostgreSQL completo.
- Sem PITR, o pior caso de perda corresponde ao intervalo desde a última exportação.
- Auth passwords e sessões não são exportadas. Em recuperação total, os acessos devem ser recriados de forma segura.
- Backups do banco não incluem ficheiros do Supabase Storage. Atualmente o Order Manager não depende de ficheiros no Storage.
