# Changelog

As versões descrevem o código desta árvore. A publicação e os testes reais são registados em [docs/operations/release.md](docs/operations/release.md).

## [Unreleased]

- Documentação de ambientes de produção e homologação, variáveis por branch e publicação por PR/build Production.
- Registo da preparação e auditoria de 05/10/2026: Supabase Free separado, domínio curto, limpeza de aliases, novo login de teste, responsáveis finais e resets de numeração autorizados.
- Base canónica sem seeds/senhas/cron, reconciliação do schema e histórico dos dois bancos, com recuperação lógica ensaiada e testes SQL/concorrência.
- Quality em main/homologacao e PRs, job PostgreSQL descartável e verificação de aplicação no build Vercel.
- Dependências de teste/PostCSS atualizadas; sem vulnerabilidades nas dependências de produção observadas.
- Versão v1.0.0 alinhada com a base da marca Order Manager no cabeçalho.

Estas entradas documentam a preparação final, configuração e ajuste visual autorizado. A versão do produto permanece 1.0.0. Consulte [a auditoria](docs/operations/homologacao-audit-2026-10-05.md) para distinguir o estado publicado das alterações locais de documentação.

## [1.0.0] — primeira versão para uso oficial

- Painel de encomendas com clientes, responsáveis, catálogo, pesquisa e filtros.
- Gestão protegida por papel e segunda senha.
- Telefones internacionais com apresentação por país e seletores que recolhem após a escolha.
- Impressão individual, detalhada e resumo de produtos em talões de 80 mm com altura ajustada ao conteúdo.
- Dados no Supabase Auth e PostgreSQL via RPCs e RLS; sem armazenamento local de encomendas.

A versão 1.0.0 foi confirmada no painel de [order-manager-rs.vercel.app](https://order-manager-rs.vercel.app/) em 04/10/2026. A validação do fluxo completo e da impressora física está descrita em [docs/operations/release.md](docs/operations/release.md). A documentação atual começa em [docs/README.md](docs/README.md).
