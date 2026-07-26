# Changelog

## [Unreleased]

### Changed

- Simplificada a arquitetura para React/Vite no Vercel com Supabase Auth e PostgreSQL.
- Removidos NestJS, Prisma, OpenAPI/Orval, Docker, Compose e Render da versão atual.
- Mantidos apenas os papéis `OWNER` e `OPERATOR`.
- Adicionadas RPCs Supabase para resolver tenant pela sessão e proteger operações de encomendas, catálogo e responsáveis.
- Tornado o login por utilizador genérico e compatível com novas empresas.
- Reformulada a área **Gerenciar** com pesquisa, filtros e listas reais.
- Uniformizados filtros, cartões, confirmações e legibilidade para o Redmi A5.
- Ajustada a impressão para um dia com horário ou período de dias completos em bobina de 80 mm.
- Adicionada confirmação antes de concluir uma encomenda.
- Substituído React Router por navegação mínima testada para `/` e `/settings`.
- Removidas pistas de contas válidas das validações e mensagens de login.
- Adicionado favicon “or” com a identidade castanha e creme do Order Manager.
- Adicionadas rodas de hora deslizáveis no telemóvel, mantido o campo nativo no computador e
  bloqueadas entregas anteriores ao momento atual no browser e no PostgreSQL.

### Added

- Testes de papéis, confirmação, opções de impressão e gestão.
- Documentação atual consolidada para desenvolvimento, deploy e operação.

### Removed

- Removidos o journal IndexedDB, a exportação JSON, a interface de recuperação e o snapshot local
  de encomendas. Dados comerciais permanecem somente no Supabase.

### Security

- O browser usa somente a chave pública do Supabase.
- `tenant_id` não é enviado pelo frontend.
- `service_role`, passwords e `DATABASE_URL` não fazem parte das variáveis do frontend.
- A área de gestão não é carregada nem exibida para `OPERATOR`.
