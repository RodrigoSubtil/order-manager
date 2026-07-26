# Publicação no Vercel e Supabase

Atualizado em 26 de julho de 2026.

## Serviços atuais

| Serviço  | Responsabilidade                       |
| -------- | -------------------------------------- |
| GitHub   | código e workflow de qualidade         |
| Vercel   | build e hospedagem da SPA React        |
| Supabase | Auth, PostgreSQL, RLS, RPCs e retenção |

Não há Render, container, Docker ou API separada.

## Configuração do Vercel

O repositório contém `vercel.json`:

- instalação com `npm ci`;
- build do workspace `@order-manager/web`;
- saída em `apps/web/dist`;
- fallback de SPA para `index.html`;
- cabeçalhos CSP, proteção contra iframe, `nosniff`, política de referência e permissões restritas.

Variáveis obrigatórias:

```dotenv
VITE_SUPABASE_URL=https://projeto.supabase.co
VITE_SUPABASE_ANON_KEY=chave-publica
```

Defina as variáveis no ambiente correto do Vercel. Nunca adicione `service_role`, password do
PostgreSQL ou export de clientes.

## Configuração do Supabase

1. confirme o projeto pelo ID e nome;
2. aplique apenas migrations ainda ausentes, na ordem;
3. confirme Auth URLs do domínio Vercel e de localhost quando necessário;
4. confirme o OWNER, membership ativa e dados iniciais;
5. execute o Security Advisor e reveja funções expostas;

Consulte [supabase-setup.md](supabase-setup.md).

## Fluxo de release

```text
alteração local
  -> format/lint/typecheck/test/build
  -> commit e push em main
  -> GitHub Actions
  -> deploy automático Vercel
  -> smoke test no site publicado
```

Uma migration é uma mudança separada do deploy estático: publicar o frontend não aplica SQL
automaticamente.

## Smoke test pós-deploy

1. entrar e sair;
2. conferir **Manter conectado** num equipamento de teste;
3. listar, criar e editar uma encomenda;
4. confirmar que a lista volta ordenada por data e hora;
5. concluir e apagar com confirmação;
6. pesquisar e filtrar;
7. desbloquear **Gerenciar**, alterar um registo de teste e desfazer;
8. imprimir uma encomenda e um resumo em bobina 80 mm;
9. repetir o fluxo principal no Redmi A5.

Se o workflow ou o smoke test falhar, não considerar a release pronta mesmo que o Vercel tenha
publicado.

## Rollback

- frontend: promover no Vercel um deployment anterior conhecido;
- schema: nunca editar ou apagar uma migration aplicada; criar migration corretiva;
- dados: restaurar somente a partir de cópia verificada e primeiro num projeto isolado.
