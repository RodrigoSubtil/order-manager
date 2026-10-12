# Release e operação · v1.1.1

O número de versão do site vem de [`apps/web/package.json`](../../apps/web/package.json), aparece abaixo de **Entrar** no login e na mesma linha inferior da marca Order Manager no cabeçalho e deve aumentar apenas quando uma nova versão for preparada. Atualize também este registo. A versão 1.0.0 é a primeira versão destinada ao uso oficial.

## Preparação da release

1. Confirme a branch, o diff e o ambiente de destino. Preserve trabalho não relacionado.
2. Execute npm ci e npm run verify:release. Confira também o job database do GitHub; ele aplica a base canónica num PostgreSQL descartável e testa contratos/concorrência.
3. Se houver migration nova, faça backup, valide o projeto Supabase pelo ID e aplique apenas o SQL pendente. Verifique tabelas, RPCs, grants, RLS e dados após a aplicação.
4. Publique no Vercel com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do projeto correto. O deploy estático não modifica o banco.
5. No domínio publicado, confirme que o login e o painel mostram a versão esperada. Registe versão, commit, deployment e migrations aplicadas.

## Smoke test no ambiente publicado

Num utilizador de teste autorizado, confira login/logout, papéis, lista e indicadores, filtros, cliente/autocomplete, responsável novo, telefone por país, criação/edição/conclusão/exclusão, catálogo e conflitos. Teste as duas impressões com encomendas de tamanhos diferentes: uma folha por pedido, sem corte, e resumo que só soma unidades compatíveis. Faça o fluxo principal no telemóvel usado na pastelaria. Para aprovar impressão física, valide também impressora, driver e bobina de 80 mm; o PDF não comprova essa etapa.

Dados de teste criados no projeto real devem ser identificados antes e limpos de forma controlada, sem afetar encomendas do utilizador. Se uma verificação falhar, não trate a release como pronta apenas porque o build ou o Vercel concluíram.

## Rotina e falhas

Antes de abrir, confirme acesso ao site publicado, data/hora do dispositivo, papel e destino de impressão. Se uma gravação falhar, não a repita até confirmar se o pedido já existe. Em indisponibilidade, registe horário, ação e mensagem sem senhas nem dados pessoais desnecessários; verifique Vercel e Supabase e reconcilie a lista quando voltarem.

Rollback de frontend: promova um deployment anterior conhecido e valide-o. Rollback de schema: não apague nem altere migrations já aplicadas; planeie uma migration corretiva ou restauração aprovada. Para perda de dados, use [backup e recuperação](backup.md).

## Registo de versões

### 1.1.1 · consistência da interface e conferência direta · 12/10/2026

Destino autorizado: **somente homologacao**. A versão central foi atualizada para 1.1.1. Raio global de 0,6rem; Salvar/Concluir em verde forte, Apagar em vermelho forte, WhatsApp e + em verde suave, Editar em amarelo suave. Cada produto tem cartão creme e lixeira vermelha suave de 44 px, com + do mesmo tamanho. Títulos de seção ficam sem fundo e dias indisponíveis do calendário não recebem caixa.

Os modais não têm X. Confirmações de apagar, concluir e sair usam Não; digitalização e impressão usam Cancelar. O formulário conserva a lixeira vermelha e o visto verde. A confirmação de exclusão destaca o cliente num resumo verde suave, com retorno no rodapé. O resumo dos filtros usa ícones sem caixa e mantém contagem, data e área numa linha compacta. Ao terminar a leitura com IA, abrir diretamente o formulário de conferência; salvar continua dependendo da ação humana. Cancelar durante a leitura ignora respostas tardias e libera a câmara.

Verificações locais aprovadas: instalação limpa, formatação, lint, tipos, 189 testes em 42 arquivos, cobertura exigida e build. O navegador local passou em 40 cenários de modais, fluxo direto da IA e filtros, oito casos de formulário normal/revisão e quatro casos de cores/calendário, nas larguras 320, 390, 768 e 1280 px. Nomes longos e a confirmação de exclusão também foram conferidos. Os componentes são reais; os dados e a resposta da IA são sintéticos, com acessos externos bloqueados. Conferir os resultados finais e o deployment na PR da branch codex/order-action-colors para homologacao. Esta publicação não altera banco, migrations, Edge Function ou secrets. Produção e main permanecem fora do destino autorizado. Testes simulados não certificam câmara, impressão física nem a exatidão de novas leituras reais.

### 1.1.0 · paleta, formulário e raio único · 12/10/2026

Revisão autorizada somente para **homologacao**, mantendo 1.1.0 durante este ciclo de validação. Inclui o style guide de cores e estados, paleta compartilhada e validação de cores/raios no Stylelint; formulário de encomenda com campos alinhados e mais espaço, seções Dados da encomenda e Produtos, Salvar com visto verde suave, Cancelar com lixeira vermelha suave e fechamento dos modais em vermelho. Todos os cantos de superfícies e controles usam 0,8rem. O aviso de recolhas atrasadas fica compacto, vermelho, com Ver/Voltar; o cartão recebe calendário, relógio e perfil, com espaçamento revisto.

Verificação local: formatação, lint, tipos, 183 testes em 42 arquivos, cobertura exigida e build. A revisão visual com componentes reais e dados sintéticos bloqueou acessos externos e passou em 320, 390, 768 e 1280 px, incluindo alinhamento, inclusão/remoção de produtos, fechamento dos modais, área de toque, foco e contraste dos estados. Esses resultados não substituem os testes funcionais do utilizador em homologação nem a impressão física.

Esta revisão não inclui migrations, publicação da Edge Function, mudanças em credenciais ou escrita no banco. Produção e **main** ficam excluídas. Os checks remotos, o commit integrado e o resultado do deployment devem ser conferidos na PR desta revisão e no domínio de homologação.

### 1.1.0 · recolhas atrasadas, padrão visual e áreas · 11/10/2026

Publicação autorizada **somente em homologação**: style guides de tipografia/espaçamentos e ajustes visuais aprovados, aviso de recolhas atrasadas com contador por minuto e filtro global de pendências, e associação de área ao produto com revisão humana. Mantida a versão nesta rodada de homologação; não há promoção para produção, migration ou alteração dos secrets. A Edge Function `interpret-order` foi publicada separadamente no projeto `czbrnxrpofdbbgbdyrad` para ativar a nova instrução da área, preservando a autenticação já implementada no handler.

O utilizador autorizou publicação, merge e testes em homologação nesta rodada. Fixtures devem ser identificadas e limpas sem alterar encomendas existentes; produção continua expressamente excluída. A função `interpret-order` versão 5 está ACTIVE em homologação, com o novo contrato de áreas e a autenticação preservada. Verificações locais: formatação, lint, tipos, 183 testes em 42 arquivos, cobertura exigida e build; cinco testes simulados da função. O painel real, servido localmente com dados simulados, passou em 320, 390, 768 e 1280 px sem corte lateral, com aviso global, ordenação das pendências e retorno aos filtros. O commit, os checks, o merge, o deployment do frontend e os testes remotos são confirmados após a publicação.

### 1.1.0 · revisão da interface para homologação · 10/10/2026

Mantida a versão 1.1.0: ajustes responsivos dos botões, cartões estreitos, prévia Refazer/Continuar e confirmação individual da revisão. O modo de demonstração foi retirado; dev usa a mesma função autenticada de homologação. Os critérios e limites estão no [guia de digitalização](order-scan.md).

Destino desta PR: somente `homologacao`. O Preview automático da Vercel foi autorizado; o merge fica reservado ao utilizador. Produção exige autorização posterior. O prompt mais conservador consta do código, mas só entra em vigor após uma publicação separada da Edge Function; esta revisão não publica a função nem altera o banco.

Validação desta rodada: verificações locais e serviços simulados. Não foram executadas leituras de IA nem operações de teste em homologação; o teste do site após o merge cabe ao utilizador.

### 1.1.0 · digitalização com IA em homologação · 08/10/2026

Nova funcionalidade compatível com o fluxo anterior: fotografia pela câmara ou pelo aparelho, leitura com progresso estimado, conclusão e revisão no formulário existente com indicadores compactos **Provável** e **Conferir**. O botão **Salvar** continua a ser a única ação que grava a encomenda.

Destino autorizado: branch `homologacao` e [site de homologação](https://homologacao-order-manager-rs.vercel.app/), com `pastelaria_teste`. A produção e a branch `main` continuam na versão 1.0.0; não fazem parte desta publicação. A classificação 1.1.0 identifica uma nova funcionalidade, sem alteração incompatível do contrato de encomendas.

A migration `20261008190245_order_scan_limits.sql` e a função `interpret-order` versão 1 já foram aplicadas no Supabase de homologação (`czbrnxrpofdbbgbdyrad`). Uma análise simultânea por empresa, 50 por dia, orçamento estimado de US$ 1 por mês e tetos de tokens ficam no backend. A chave OpenAI permanece somente nos secrets. Consulte [limites e verificações](order-scan.md).

A [PR #4](https://github.com/RodrigoSubtil/order-manager/pull/4), de `codex/order-scan-prep` para `homologacao`, contém a implementação `b8b60dc` e ajustes de testes `9c2d6fe`/`aadb7d9`. Os checks locais passaram com 156 testes, cobertura exigida, formatação, lint, tipos e build. A leitura real foi ativada no backend de homologação em 08/10/2026, às 21:41 UTC; cinco verificações HTTP confirmaram autenticação e restrições de origem/método, sem foto nem chamada paga. O frontend está habilitado somente no Preview de `homologacao`.

A PR foi integrada em `homologacao` pelo commit `c5fd07e`, com deployment Preview `2mDYHKKWx7Kp47HYBN96hpGHbdvX` Ready. O utilizador concluiu uma leitura real após substituir a chave OpenAI; isso comprova a integração, não a exatidão dos campos manuscritos. O [diagnóstico e as verificações](order-scan.md) registam esses limites.

### 1.0.0 · 04/10/2026

O código `01cc891` foi publicado no Vercel com os seletores, telefones por país e impressão de 80 mm. O [painel publicado](https://order-manager-rs.vercel.app/) mostrou `v1.0.0` numa sessão autenticada. O fluxo completo de gravação, os dados reais do banco e a impressora física não foram validados nesta publicação.

Nas próximas versões, registe data, commit/deployment e resultado dos testes reais. Não infira essas informações apenas do `package.json`.

### 1.0.0 · preparação de homologação em 05/10/2026

Referência validada: `127f535f10b70e4119d77fa858cb9b51e102ba1c`. Foram observados deployments Ready de produção e Preview/`homologacao`, os dois domínios válidos e GitHub com 3/3 checks em ambas as branches, sem divergência entre elas. Os checks locais passaram, com 151 testes; o site de homologação teve fluxos reais e testes de banco documentados na [auditoria](homologacao-audit-2026-10-05.md).

O ambiente de teste tem banco Supabase Free separado, domínio curto e login `pastelaria_teste`. Encomendas/itens/recibos foram zerados e os próximos números reiniciados em 1 nos dois bancos por solicitação explícita, fora do fluxo de deploy. Produção preservou seu cliente, catálogo, responsáveis e acessos. A documentação desta preparação não é uma nova release de aplicação e não exige aumento da versão 1.0.0.

### 1.0.0 · validação e publicação final de 05/10/2026

O [PR #2](https://github.com/RodrigoSubtil/order-manager/pull/2) levou a alteração validada de homologacao para main após seis checks aprovados. Homologação cf1fd71 / deployment AAY1pWeL3iRFKJdxAtrGECH7PpT7 e produção 8c32f84 / deployment BSsx4KE19eEWowuVnkhsssGFyA5A ficaram Ready. O Quality de main passou nos jobs de aplicação e PostgreSQL, com 151 testes.

No domínio de produção foram verificados sessão autenticada, leitura de catálogo/responsáveis, criação do pedido 1, edição com versão 1→2 e conclusão pela interface. Em homologação foram verificados criação/exclusão depois do novo Preview e criação/edição/conclusão após reconciliação. Consultas cruzadas confirmaram que as fixtures não chegaram ao outro banco. O cabeçalho foi medido no DOM: marca e v1.0.0 com a mesma altura inferior nos dois domínios. A limpeza final retirou somente fixtures e deixou encomendas/itens/recibos zero e contador 1. O [relatório final](readiness-2026-10-05.md) guarda os detalhes e limites.

## Gate para a próxima publicação

O caminho configurado é PR para homologação → Preview/testes → PR para main → revisão → build Production. Siga [Ambientes](environments.md). Não promova um bundle compilado com as variáveis de homologação para o domínio de produção.

O schema e o histórico ativo foram reconciliados nos dois projetos. A base canónica passou em bancos restaurados e num banco vazio; futuras migrations ainda exigem backup, ensaio e verificação remota.

O Quality agora roda também em push para homologacao, com dois jobs. Vercel executa verify:release antes do build. Proteção obrigatória do GitHub permanece indisponível para este repositório privado no plano atual; revisão/merge manual é uma limitação conhecida, sem mudança de custo.

A recuperação lógica da aplicação foi ensaiada e comparada linha a linha. Impressora física e telemóvel real foram explicitamente excluídos desta rodada pelo utilizador; a restauração física gerenciada também não é comprovada pelo ensaio lógico. Consulte [resultado final da preparação](readiness-2026-10-05.md) para evidência de publicação e limites.
