# Backup, recuperação e incidentes

O produto não mantém cópia local nem exporta encomendas. Pagar um plano não confirma, por si só, o **estado do projeto**: verifique no Supabase **Database → Backups** a existência e a data do último backup, a retenção e se PITR está ativo. Segundo a [documentação oficial do Supabase](https://supabase.com/docs/guides/platform/backups), projetos Pro elegíveis recebem backup diário com retenção de 7 dias; PITR é um complemento separado. Uma cópia diária pode perder até um dia de alterações, e PITR não deve ser presumido.

## Rotina mínima

- Registe project ref, plano, responsável, data do último backup e janela de retenção fora do repositório. Verifique periodicamente se o backup continua a ser produzido.
- Antes de migrations e limpezas de dados, confirme uma cópia recuperável. Não guarde dumps com clientes no Git, no navegador ou em partilhas públicas.
- Faça um ensaio de restauração para projeto isolado e compare schema, contagens, amostras de pedidos e acesso por papéis/tenant. A [restauração para projeto novo](https://supabase.com/docs/guides/platform/clone-project) copia o banco, mas requer reconfigurar manualmente partes do projeto, como Auth settings, API keys e Storage.
- Defina com a pastelaria o máximo aceitável de perda de dados e de tempo parado. Esses limites são metas operacionais, não garantias automáticas do fornecedor.

## Incidente ou perda de dados

1. Pare novas escritas se houver perda, acesso indevido ou dados contraditórios. Não execute SQL corretivo diretamente em produção.
2. Registe hora, ação, versão publicada e impacto conhecido. Preserve logs necessários sem expor tokens, senhas ou dados pessoais no ticket.
3. Confirme o último estado válido e escolha backup/ponto de recuperação anterior ao problema. Estime os pedidos que poderiam ser perdidos.
4. Restaure primeiro num projeto isolado. Compare encomendas, itens, clientes, catálogo, responsáveis, memberships e isolamento antes de qualquer retorno.
5. Planeie e aprove explicitamente o corte para produção. Revalide login, encomendas e impressão no site após a recuperação.

Perda de credencial ou suspeita de acesso entre empresas exige conter sessões, rever memberships e RLS e envolver o responsável pelos dados. O procedimento concreto e eventuais comunicações legais dependem da gravidade e de avaliação humana.

## Produção e homologação

Os project refs e planos observados estão em [Ambientes](environments.md). Homologação foi criada em Free para evitar um projeto pago extra; não presuma para ela a rotina de backups gerenciados de produção. Confirme a disponibilidade/retenção atual no fornecedor antes de depender dessa capacidade.

Na preparação de 05/10/2026, o último backup de produção observado era de 04/10/2026 às 23:24:43 UTC, com sete cópias diárias exibidas. Essa observação é datada; restauração desse backup físico gerenciado não foi testada. Reconfirme antes de uma migration ou limpeza futura.

O reset final encontrou zero encomendas/itens nos dois bancos. Em produção foram removidos dois recibos de gravações antigas sem encomenda e alterado o contador de 3 para 1; metadados locais de recuperação foram guardados fora do Git, sem dados de clientes ou senhas. Esses metadados não substituem backup completo. O cliente, catálogo, responsáveis e acessos de produção foram preservados.

Não copie produção sobre homologação nem restaure o banco de teste sobre produção para promover código. Promoção de frontend e evolução de schema são operações diferentes de recuperação de dados.

## Ensaio de recuperação lógica em 05/10/2026

Antes da reconciliação foram exportadas todas as tabelas públicas da aplicação, funções/tipos, constraints, índices, políticas/grants e os registos Auth users/identities. Os artefatos privados ficam fora do repositório, em work/readiness-20261005/private-backups da área de trabalho da preparação, com ACL restrita. Contêm hashes e dados reais; não devem ser anexados a PRs ou partilhados. work/ é ignorado no Git dessa área, e nenhuma cópia foi incluída no projeto.

PostgreSQL 17.11 portátil foi iniciado somente em 127.0.0.1:55432, com senha SCRAM, sem instalar um serviço ou contratar outro projeto. Duas bases locais receberam os schemas/dados exportados. Todas as linhas das 15 tabelas verificadas de produção e 13 de homologação, incluindo Auth, foram comparadas em memória: igualdade confirmada antes e depois da reconciliação. Uma terceira base vazia também recebeu a base canónica e passou nos testes SQL e de concorrência. Os horários SQL usam Europe/Lisbon e locale ICU en-US, compatível com as regras de nomes Unicode do projeto.

Escopo comprovado: recuperação lógica dos dados/schema da aplicação e preservação dos registos Auth exportados. A fachada Auth local não comprova funcionamento do servidor Auth recuperado, sessões, API keys, configurações de Auth/Storage, Edge Functions ou restauração física gerenciada. Storage e Vault estavam vazios na auditoria. Para uma recuperação completa do Supabase, siga o procedimento do fornecedor e reconfigure/teste os serviços no projeto de destino.

Restauração local nunca sobrescreveu os bancos remotos. A consolidação do histórico de migrations também possui uma cópia privada anterior. Em uma recuperação futura, confirme project ref e estado do backup, restaure isoladamente e valide dados e login antes de aprovar um corte para produção.
