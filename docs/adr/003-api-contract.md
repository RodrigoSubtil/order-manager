# ADR 003 — REST versionado, OpenAPI e cliente gerado

- Estado: Aceite para arquitetura alvo; implementação pendente.
- Data: 15 de julho de 2026

## Contexto

O frontend atual conhece tabelas e RPCs Supabase diretamente. Isso mistura detalhes de persistência com interface e dificulta mudança segura, testes e documentação.

## Decisão

Expor uma API REST NestJS sob `/api/v1`. Swagger/OpenAPI é gerado a partir dos DTOs/controllers e serve como contrato público. Orval gera o cliente TypeScript a partir desse contrato; o frontend não duplica interfaces nem constrói URLs de negócio manualmente.

## Regras

- DTOs de entrada nunca contêm `tenant_id`, `created_by`, `updated_by` ou permissões.
- Formato de erro, paginação, filtros, ordenação e `409 Conflict` são documentados no OpenAPI.
- Mudanças incompatíveis criam nova versão de API ou período de depreciação; não alteram silenciosamente `/api/v1`.
- A CI compara/genera o contrato e falha se cliente gerado estiver desatualizado.

## Consequências

- O contrato passa a ser revisável, testável por MSW e consumível por clientes futuros.
- Há custo de manter DTOs, documentação e geração de cliente, aceito para evitar divergência e acoplamento ao banco.
