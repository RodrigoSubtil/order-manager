# Release e operação · v1.0.0

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

### 1.0.0 · 04/10/2026

O código `01cc891` foi publicado no Vercel com os seletores, telefones por país e impressão de 80 mm. O [painel publicado](https://order-manager-rs.vercel.app/) mostrou `v1.0.0` numa sessão autenticada. O fluxo completo de gravação, os dados reais do banco e a impressora física não foram validados nesta publicação.

Nas próximas versões, registe data, commit/deployment e resultado dos testes reais. Não infira essas informações apenas do `package.json`.

### 1.0.0 · preparação de homologação em 05/10/2026

Referência validada: `127f535f10b70e4119d77fa858cb9b51e102ba1c`. Foram observados deployments Ready de produção e Preview/`homologacao`, os dois domínios válidos e GitHub com 3/3 checks em ambas as branches, sem divergência entre elas. Os checks locais passaram, com 151 testes; o site de homologação teve fluxos reais e testes de banco documentados na [auditoria](homologacao-audit-2026-10-05.md).

O ambiente de teste tem banco Supabase Free separado, domínio curto e login `pastelaria_teste`. Encomendas/itens/recibos foram zerados e os próximos números reiniciados em 1 nos dois bancos por solicitação explícita, fora do fluxo de deploy. Produção preservou seu cliente, catálogo, responsáveis e acessos. A documentação desta preparação não é uma nova release de aplicação e não exige aumento da versão 1.0.0.

## Gate para a próxima publicação

O caminho configurado é PR para homologação → Preview/testes → PR para main → revisão → build Production. Siga [Ambientes](environments.md). Não promova um bundle compilado com as variáveis de homologação para o domínio de produção.

O schema e o histórico ativo foram reconciliados nos dois projetos. A base canónica passou em bancos restaurados e num banco vazio; futuras migrations ainda exigem backup, ensaio e verificação remota.

O Quality agora roda também em push para homologacao, com dois jobs. Vercel executa verify:release antes do build. Proteção obrigatória do GitHub permanece indisponível para este repositório privado no plano atual; revisão/merge manual é uma limitação conhecida, sem mudança de custo.

A recuperação lógica da aplicação foi ensaiada e comparada linha a linha. Impressora física e telemóvel real foram explicitamente excluídos desta rodada pelo utilizador; a restauração física gerenciada também não é comprovada pelo ensaio lógico. Consulte [resultado final da preparação](readiness-2026-10-05.md) para evidência de publicação e limites.
