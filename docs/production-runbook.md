# Runbook de produção

Atualizado em 26 de julho de 2026.

## Antes de abrir a pastelaria

1. confirmar internet e acesso ao site publicado;
2. entrar com o utilizador operacional;
3. verificar data/hora do dispositivo;
4. confirmar papel 80 mm, escala 100% e impressora predefinida;

## Release

1. validar `format:check`, lint, tipos, testes e build;
2. confirmar que o GitHub Actions passou no SHA publicado;
3. aplicar migrations necessárias no Supabase correto com backup prévio;
4. publicar pelo branch `main`;
5. executar o smoke test de [deployment.md](deployment.md);
6. registar data, SHA, migration e resultado.

## Falha do site ou Supabase

- não repetir uma escrita sem confirmar se a tentativa anterior foi concluída;
- registar horário, ação, dispositivo e mensagem sem enviar password ou dados desnecessários;
- verificar o estado do Vercel e Supabase;
- depois da recuperação, recarregar e reconciliar as encomendas antes de voltar a escrever.

## Suspeita de perda

1. parar novas alterações;
2. não executar SQL de correção diretamente no projeto em uso;
3. obter um backup ou dump autorizado do Supabase, quando disponível;
4. comparar contagens e IDs com a última informação operacional conhecida;
5. restaurar primeiro numa cópia isolada;
6. aprovar a reconciliação antes de tocar nos dados reais.

## Incidente de acesso

1. terminar sessões ativas;
2. alterar a password pelo painel seguro do Supabase;
3. rever utilizadores e memberships;
4. verificar logs Auth e audit logs;
5. rodar a senha gerencial por procedimento SQL controlado, se necessário;
6. documentar impacto e notificar o responsável conforme RGPD.

## Cópias e recuperação

- o produto não cria nem exporta backups JSON ou cópias locais de encomendas;
- a recuperação completa depende de dump ou backup gerido do Supabase, quando disponível;
- antes de qualquer migration relevante, deve existir uma cópia verificável e um ensaio isolado.

## Limites operacionais

- CSS não substitui a configuração de bobina no driver;
- o plano gratuito não oferece a mesma recuperação do PITR;
- não há gravação offline;
- a expansão para mais empresas exige teste formal de isolamento e processo de onboarding.
