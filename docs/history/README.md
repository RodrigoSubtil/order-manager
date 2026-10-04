# Histórico e evidências

Esta pasta guarda material de referência, **não procedimentos atuais**. Para operar ou alterar a versão 1.0.0, comece em [docs/README.md](../README.md).

## Marcos de decisão

1. Em julho de 2026 foram explorados NestJS, Prisma, Docker, contrato OpenAPI e um banco multi-tenant. O produto entregue mudou para SPA React/Vite + Supabase Auth/RPCs/RLS. Os documentos dessas etapas foram retirados da documentação ativa; continuam no histórico Git.
2. As migrations `000`–`013` estabeleceram o schema, papéis, gestão, catálogo e regras iniciais. As `014`–`019` introduziram clientes, remoção física de encomendas, pesquisa, nova área, telefones internacionais e criação de responsável ao guardar. A sequência exata está em [`supabase/migrations`](../../supabase/migrations).
3. A interface passou a usar seletores coerentes, telefone formatado por país e impressão em talões de 80 mm com altura medida por encomenda. O comportamento atual está descrito em [arquitetura](../architecture/system.md) e [guia de utilização](../product/guide.md).
4. A versão 1.0.0 marca o início pretendido do uso oficial. O estado publicado e as verificações reais são registados em [release](../operations/release.md); este marco não prova, por si, que um deploy ocorreu.

## Material preservado

- [`visual/`](visual/README.md) contém o plano e a baseline visual de setembro de 2026, com medições e relatórios. São uma fotografia histórica; números de commit, status Git e bugs daquela data não descrevem necessariamente o estado atual.
- [`stage20/`](stage20/README.md) contém os relatórios do ensaio de migração legado. A fonte para executar mudanças de banco continua sendo a migration atual e o plano de release aprovado.
- O histórico Git contém os antigos ADRs e guias de etapas. Consulte-os apenas para entender decisões passadas, nunca para iniciar serviços ou migrations atuais.
