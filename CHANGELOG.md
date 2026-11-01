# Changelog

As versões descrevem o código desta árvore. A publicação e os testes reais são registados em [docs/operations/release.md](docs/operations/release.md).

## [1.1.0] — IA e novo design · promoção aprovada em 01/11/2026

- Ciclo testado em homologação e aprovado pelo utilizador para `main` e produção, mantendo 1.1.0. A preparação e os resultados da publicação ficam no [registo de release](docs/operations/release.md).
- Telefone sempre ao lado do prefixo de país, com seletor compacto de 104 px e mais espaço para o número, inclusive em ecrãs estreitos.
- Documentação distingue aprovação, preparação do backend e verificação do deployment, sem aumentar a versão automaticamente.
- Zod fixado em 4.6.6 para corrigir o consumo excessivo de memória de versões anteriores, com instalação limpa e resolução única no workspace.

- Recolhas atrasadas: selo no cartão com tempo decorrido, aviso global com a pendência mais antiga e atalho que inclui dias anteriores e permite voltar aos filtros. Relógio único por minuto no horário de Lisboa, sem IA nem alteração do banco.

- Digitalização: área sugerida com prioridade para o catálogo da empresa e inferência da IA para produtos ainda não cadastrados; conflitos ficam para escolha humana. Área sempre pede Conferir; confirmar a mesma área preserva o produto. Prompt e contrato da função publicados nos projetos autorizados, preservando autenticação e limites.

- Style guide de espaçamentos e controles aplicado à interface: escala centralizada, botões/campos/ícones/raios consistentes, diálogos adaptados à janela e cabeçalho compacto com toque ampliado. Filtros centralizados, resumo agrupado acima dos resultados e remoção sem divisão de palavras; ficha térmica preservada.

- Câmara com enquadramento horizontal 4:3 e captura correspondente à prévia, sem deformar a imagem. Fotografias escolhidas do aparelho mantêm o formato original.
- Barra responsiva: telemóvel com Digitalizar/Adicionar, tablet com os três botões e computador com Imprimir/Adicionar. Prévia compacta com Refazer/Continuar.
- Cartões estreitos sem corte de conteúdo: no telemóvel, quatro ações numa única linha e impressão oculta; impressão disponível no tablet/computador.
- Confirmação da leitura com o componente padrão do site; Conferir vermelho, Provável laranja e Conferido verde após edição individual do campo, com fundos claros e bordas discretas na paleta do site.
- A contagem de resultados passa para a linha de baixo, alinhada à esquerda sob a data, quando falta espaço ao lado dos filtros, sem comprimir a data.
- Cabeçalho do cartão apenas com a data à esquerda e a hora à direita, sem a palavra Entrega.
- Style guide de tipografia aplicado à interface inteira, com escala e papéis centralizados, campos de 16 px e verificação automática contra valores soltos; ficha térmica preservada.
- Lista e cartões com visual claro: espaçamentos uniformes, tipografia com hierarquia, produtos sem caixas adicionais e ações centradas com alvos de 44 px.
- Critério conservador no prompt, sem novos pedidos à IA ou aumento de limites; retirada da simulação local e porta dev fixa em 5174.
- Limpeza de estilos repetidos/referências removidas e cancelamento de capturas e temporizadores ao sair do modal.

- Fotografia pela câmara ou pelo aparelho, leitura com progresso estimado e revisão no formulário de encomendas.
- Função autenticada, chave somente no backend e limites de uso/custo por empresa.
- Primeira publicação pela PR #4 em homologação em 08/10/2026; promoção para produção aprovada em 01/11/2026 depois dos testes do utilizador.

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
