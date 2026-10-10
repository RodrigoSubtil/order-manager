# Changelog

As versões descrevem o código desta árvore. A publicação e os testes reais são registados em [docs/operations/release.md](docs/operations/release.md).

## [Unreleased]

- Barra responsiva: telemóvel com Digitalizar/Adicionar, tablet com os três botões e computador com Imprimir/Adicionar. Prévia compacta com Refazer/Continuar.
- Cartões estreitos sem corte de conteúdo: no telemóvel, quatro ações numa única linha e impressão oculta; impressão disponível no tablet/computador.
- Confirmação da leitura com o componente padrão do site; Conferir vermelho, Provável laranja e Conferido verde após edição individual do campo.
- Critério conservador no prompt, sem novos pedidos à IA ou aumento de limites; retirada da simulação local e porta dev fixa em 5174.
- Limpeza de estilos repetidos/referências removidas e cancelamento de capturas e temporizadores ao sair do modal.

## [1.1.0] — digitalização com IA em homologação · 08/10/2026

- Fotografia pela câmara ou pelo aparelho, leitura com progresso estimado e revisão no formulário de encomendas.
- Função autenticada, chave somente no backend e limites de uso/custo por empresa.
- Publicação pela PR #4 somente em homologação; produção continua fora desta atualização. Consulte [o registo de release](docs/operations/release.md).

## Preparação operacional · 05/10/2026

- Documentação de ambientes de produção e homologação, variáveis por branch e publicação por PR/build Production.
- Registo da preparação e auditoria de 05/10/2026: Supabase Free separado, domínio curto, limpeza de aliases, novo login de teste, responsáveis finais e resets de numeração autorizados.
- Base canónica sem seeds/senhas/cron, reconciliação do schema e histórico dos dois bancos, com recuperação lógica ensaiada e testes SQL/concorrência.
- Quality em main/homologacao e PRs, job PostgreSQL descartável e verificação de aplicação no build Vercel.
- Dependências de teste/PostCSS atualizadas; sem vulnerabilidades nas dependências de produção observadas.
- Versão v1.0.0 alinhada com a base da marca Order Manager no cabeçalho.

Estas entradas documentam a preparação final, configuração e ajuste visual de 05/10/2026, quando a versão era 1.0.0. Consulte [a auditoria](docs/operations/homologacao-audit-2026-10-05.md) para a evidência dessa preparação.

## [1.0.0] — primeira versão para uso oficial

- Painel de encomendas com clientes, responsáveis, catálogo, pesquisa e filtros.
- Gestão protegida por papel e segunda senha.
- Telefones internacionais com apresentação por país e seletores que recolhem após a escolha.
- Impressão individual, detalhada e resumo de produtos em talões de 80 mm com altura ajustada ao conteúdo.
- Dados no Supabase Auth e PostgreSQL via RPCs e RLS; sem armazenamento local de encomendas.

A versão 1.0.0 foi confirmada no painel de [order-manager-rs.vercel.app](https://order-manager-rs.vercel.app/) em 04/10/2026. A validação do fluxo completo e da impressora física está descrita em [docs/operations/release.md](docs/operations/release.md). A documentação atual começa em [docs/README.md](docs/README.md).
