# Guia para quem trabalha neste repositório

Leia [docs/README.md](docs/README.md) antes de alterar o projeto. Use os guias ativos como mapa e confirme detalhes no código. `docs/history/` contém contexto, não instruções operacionais atuais.

- Frontend React/Vite em `apps/web`, Supabase Auth e RPCs PostgreSQL em `supabase/migrations`. Não existe backend NestJS em uso.
- Fonte da versão exibida: `apps/web/package.json`. Atualize-a ao preparar uma nova versão e registe o resultado em `docs/operations/release.md`.
- Dados remotos: `apps/web/src/shared/lib/supabaseData.ts`. Nunca exponha `service_role`, passwords ou URLs de ligação ao banco em `VITE_*`, código cliente, testes ou documentação.
- O `tenant_id` vem da sessão e da membership nas RPCs, nunca de entrada do navegador. Preserve RLS, papéis, desbloqueio gerencial, `version` e gravação idempotente/transacional.
- Números de telefone ficam em dígitos internacionais no banco; a formatação por país pertence à interface. Alterações em selects devem manter o fecho após a escolha e o foco/teclado correto no telemóvel.
- Impressão: preserve uma folha por encomenda, sem cortar itens, largura de 80 mm e alturas calculadas. Valide a prévia e, para uso físico, o driver e a impressora reais.
- Faça mudanças proporcionais, preserve trabalho não relacionado e teste o fluxo afetado. Execute `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` antes de propor publicação.
- Distingua sempre evidência de código, teste local, banco real e site publicado. Não trate uma migration no repositório como prova de aplicação em produção.
