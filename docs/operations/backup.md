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
