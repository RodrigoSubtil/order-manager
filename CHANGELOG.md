# Changelog

Este projeto segue versionamento semântico quando houver uma versão comercial publicada. Enquanto não houver release de produção, entradas são candidatas e não representam disponibilidade comercial.

## [Unreleased]

### Added

- Arquitetura multi-tenant com NestJS, Prisma, RLS, papéis e auditoria.
- API versionada em `/api/v1`, contrato OpenAPI e cliente Orval.
- Encomendas, catálogo, responsáveis, relatórios e impressão no fluxo atual.
- Testes, Docker, CI, segurança, recuperação, observabilidade, staging e piloto.
- Runbook de produção, guias de utilizador/administração e processo de suporte.

### Security

- Tenant é determinado pela sessão validada no servidor; o frontend não envia `tenant_id`.
- Cookies HttpOnly, CSRF, CORS configurável, rate limiting, logs sanitizados e RLS são camadas de defesa.

### Not released

- Produção não foi promovida.
- Staging/piloto ainda requerem execução e aprovação formal.
- SLA, RPO/RTO e fornecedores precisam de confirmação contratual por cliente.
