# Changelog

## [Unreleased]

### Changed

- Simplificada a arquitetura para React/Vite no Vercel com Supabase Auth e PostgreSQL.
- Removidos NestJS, Prisma, OpenAPI/Orval, Docker, Compose e Render da versão atual.
- Mantidos apenas os papéis `OWNER` e `OPERATOR`.
- Adicionadas RPCs Supabase para resolver tenant pela sessão e proteger operações de encomendas, catálogo e responsáveis.
- Alterado o utilizador visível da instalação para `pastelaria_venus`.
- Reformulada a área **Gerenciar** com pesquisa, filtros, listas reais e recuperação.
- Uniformizados filtros, cartões, confirmações e legibilidade para o Redmi A5.
- Ajustada a impressão para um dia com horário ou período de dias completos em bobina de 80 mm.
- Adicionada confirmação antes de concluir uma encomenda.

### Added

- Journal local automático de criação, edição, conclusão e exclusão em IndexedDB.
- Pacote JSON com snapshot completo do Supabase e arquivo local de recuperação.
- Testes de papéis, confirmação, opções de impressão, gestão e recuperação.
- Documentação atual consolidada para desenvolvimento, deploy, operação e recuperação.

### Security

- O browser usa somente a chave pública do Supabase.
- `tenant_id` não é enviado pelo frontend.
- `service_role`, passwords e `DATABASE_URL` não fazem parte das variáveis do frontend.
- A área de gestão não é carregada nem exibida para `OPERATOR`.
