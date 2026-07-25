# Runbook de produção

Atualizado em 25 de julho de 2026.

## Antes de abrir a pastelaria

1. confirmar internet e acesso ao site publicado;
2. entrar com o utilizador operacional;
3. confirmar que não existe aviso de contingência;
4. verificar data/hora do dispositivo;
5. confirmar papel 80 mm, escala 100% e impressora predefinida;
6. transferir uma cópia JSON se houve alterações desde a última cópia externa.

## Release

1. validar `format:check`, lint, tipos, testes e build;
2. confirmar que o GitHub Actions passou no SHA publicado;
3. aplicar migrations necessárias no Supabase correto com backup prévio;
4. publicar pelo branch `main`;
5. executar o smoke test de [deployment.md](deployment.md);
6. registar data, SHA, migration e resultado.

## Falha do site ou Supabase

- se houver snapshot local, o aviso de contingência permite consultar, pesquisar e imprimir;
- não tentar forçar criação, edição, conclusão ou exclusão enquanto o aviso estiver visível;
- registar horário, ação, dispositivo e mensagem sem enviar password ou dados desnecessários;
- verificar o estado do Vercel e Supabase;
- preservar o arquivo local e a última cópia JSON;
- depois da recuperação, recarregar e reconciliar as encomendas antes de voltar a escrever.

## Suspeita de perda

1. parar novas alterações;
2. transferir o pacote JSON disponível no dispositivo;
3. não importar manualmente diretamente no projeto em uso;
4. comparar contagens e IDs entre Supabase, snapshot e journal;
5. restaurar primeiro numa cópia isolada;
6. aprovar a reconciliação antes de tocar nos dados reais.

## Incidente de acesso

1. terminar sessões ativas;
2. alterar a password pelo painel seguro do Supabase;
3. rever utilizadores e memberships;
4. verificar logs Auth e audit logs;
5. rodar a senha gerencial por procedimento SQL controlado, se necessário;
6. documentar impacto e notificar o responsável conforme RGPD.

## Rotina de cópias

- JSON: no fim de cada dia com alterações, fora do dispositivo;
- retenção: sete cópias diárias e quatro semanais;
- teste: abrir e validar o formato do arquivo;
- recuperação completa: preferir dump/backup gerido do Supabase quando disponível.

## Limites operacionais

- IndexedDB não protege contra perda do equipamento;
- CSS não substitui a configuração de bobina no driver;
- o plano gratuito não oferece a mesma recuperação do PITR;
- não há gravação offline;
- a expansão para mais empresas exige teste formal de isolamento e processo de onboarding.
