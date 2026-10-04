# Release e operação · v1.0.0

O número de versão do site vem de [`apps/web/package.json`](../../apps/web/package.json), aparece abaixo de **Entrar** no login e no canto superior direito do cabeçalho e deve aumentar apenas quando uma nova versão for preparada. Atualize também este registo. A versão 1.0.0 é a primeira versão destinada ao uso oficial.

## Preparação da release

1. Confirme a branch, o diff e o ambiente de destino. Preserve trabalho não relacionado.
2. Execute `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build`.
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
