# Changelog

## [Unreleased]

### Changed

- Simplificada a arquitetura para React/Vite no Vercel com Supabase Auth e PostgreSQL.
- Removidos NestJS, Prisma, OpenAPI/Orval, Docker, Compose e Render da versão atual.
- Mantidos apenas os papéis `OWNER` e `OPERATOR`.
- Adicionadas RPCs Supabase para resolver tenant pela sessão e proteger operações de encomendas, catálogo e responsáveis.

### Security

- O browser usa somente a chave pública do Supabase.
- `tenant_id` não é enviado pelo frontend.
- `service_role`, passwords e `DATABASE_URL` não fazem parte das variáveis do frontend.
