# Recuperação e backup sem PITR

Atualizado em 25 de julho de 2026.

## O que a aplicação faz automaticamente

Depois de leituras válidas, o browser guarda por empresa:

- snapshot das encomendas ativas, catálogo e responsáveis;
- journal de criação, edição, conclusão e exclusão;
- estado anterior e posterior quando disponível;
- data da última atualização.

O snapshot de contingência fica no `localStorage`; o arquivo detalhado fica no IndexedDB. Uma falha
desse armazenamento nunca transforma uma gravação confirmada pelo Supabase numa falsa falha de
banco.

## O que ela não faz

O browser não pode alterar continuamente um ficheiro JSON fora dele sem permissão do utilizador.
Por isso:

- o arquivo local é automático;
- o JSON externo é transferido manualmente em **Gerenciar > Recuperação**;
- o site nunca volta a gravar no Supabase usando automaticamente o arquivo local;
- não existe gravação offline.

Essa escolha evita dados duplicados, restaurações silenciosas e conflitos.

## Pacote JSON

O download inclui:

- snapshot completo devolvido pela RPC protegida do Supabase;
- último snapshot operacional do dispositivo;
- journal local das alterações;
- datas e versão do formato;
- nenhuma password, token ou chave.

O conteúdo possui nomes e telefones. Guarde-o cifrado e fora do computador da pastelaria.

Rotina mínima:

1. transferir ao final de cada dia com alterações;
2. manter sete cópias diárias;
3. manter quatro cópias semanais;
4. verificar se o ficheiro abre e contém `serverSnapshot` e `localRecovery`;
5. ensaiar qualquer recuperação primeiro num projeto Supabase isolado.

## Contingência

Se o Supabase falhar e existir snapshot válido, o dashboard mostra a hora da cópia e permite
consultar, pesquisar e imprimir. Criar, editar, concluir e apagar ficam bloqueados. Zero encomendas
é um resultado normal e não ativa contingência.

## Recuperação completa

O JSON serve para reconciliação assistida, não substitui um dump PostgreSQL. Para schema, roles e
dados completos, use um backup gerido ou `supabase db dump` com credenciais fornecidas apenas no
terminal. Um restore nunca deve ser executado diretamente no projeto em uso sem cópia adicional,
comparação de contagens e aprovação.

## Risco aceito

No plano gratuito, sem PITR e sem export externo recente, ainda existe risco de perda. A melhor
proteção gratuita é combinar o journal automático do dispositivo com download diário para uma
pasta privada sincronizada noutro equipamento.
