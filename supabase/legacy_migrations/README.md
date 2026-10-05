# Histórico SQL arquivado

Os 20 scripts de 000 a 019 foram movidos para esta pasta sem alterar seus bytes. São evidência histórica, não a sequência ativa de instalação ou de `supabase db push`.

Há seeds e identidades específicos da Vénus e a antiga 008 instala uma rotina de exclusão de encomendas. Ela foi aplicada parcialmente na preparação original de homologação, sem essa rotina. Não execute esses scripts para preencher um histórico ou recriar um ambiente.

A base ativa está em [../migrations](../migrations): três arquivos gerados pela CLI em 05/10/2026, sem encomendas, senhas, utilizadores ou seeds. O histórico remoto foi consolidado somente depois da aplicação e verificação dessa base em ambos os projetos. Os registos anteriores, com os SQLs efetivamente executados pelo conector, estão em backup privado fora do Git.

Veja [preparação do Supabase](../../docs/operations/supabase.md) e [validação final](../../docs/operations/readiness-2026-10-05.md).
