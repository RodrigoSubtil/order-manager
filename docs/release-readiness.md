# Checklist de entrega atual

## Arquitetura em uso

O produto ativo é somente:

```text
Vercel (React + Vite) -> Supabase Auth -> Supabase PostgreSQL (RLS + RPCs)
```

Não existem API NestJS, Prisma, Docker, Compose, Render ou `service_role` no browser.

## Validado no repositório

- formatação, lint e TypeScript;
- 36 testes unitários/de componentes;
- build de produção Vite;
- login pelo Supabase Auth;
- criação, edição, exclusão e paginação de encomendas por RPC;
- catálogo e responsáveis por RPC para `OWNER`;
- impressão carregando todas as páginas necessárias;
- limpeza do cache ao iniciar ou terminar sessão;
- `OWNER` e `OPERATOR` como os únicos papéis ativos.

## Antes de entregar o site real

1. No Supabase, use um projeto vazio ou um schema previamente limpo.
2. Reveja e aplique `20260723_000_schema.sql` e depois `20260723_001_direct-web-rpcs.sql`.
3. Crie o primeiro utilizador no Supabase Auth e execute o bloco de primeiro acesso em [supabase-setup.md](supabase-setup.md).
4. No Vercel, configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_APP_URL`.
5. Faça um teste manual com o `OWNER`: login, catálogo, responsável, nova encomenda, edição, impressão e logout.

Esses passos alteram serviços externos e não foram executados automaticamente por este repositório.

## Limitação conhecida

O build gera um único JavaScript de aproximadamente 662 kB antes de gzip. Não impede o uso atual; a divisão de código pode ser feita depois caso a aplicação cresça.
