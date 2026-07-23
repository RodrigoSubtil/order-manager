# ADR 006 — Onboarding controlado e cancelamento de encomendas

**Estado:** aceite para staging em 23 de julho de 2026.

## Decisão

1. A criação de empresas será **controlada pelo suporte**. O endpoint de criação continua a existir para o fluxo administrativo autorizado, mas não será divulgado como auto-serviço público no produto comercial.
2. O domínio precisa de um estado explícito **`CANCELLED`** para uma encomenda. Cancelar não será exclusão: deve preservar itens, número, autoria, data, motivo e auditoria.

## Motivo

O onboarding controlado evita tenants sem contrato, configuração incompleta, abuso de convites e suporte sem contexto. O cancelamento preserva a rastreabilidade comercial, em vez de confundir uma operação legítima com soft delete administrativo.

## Consequências

- A equipa de suporte cria o tenant, o primeiro OWNER e o convite inicial após validar o cliente.
- A próxima alteração de domínio deverá adicionar `CANCELLED` no schema Prisma, DTOs, filtros, relatórios, impressão, autorização e interface. Ela requer migration nova e revisão das regras de produção antes de staging.
- A exclusão lógica existente continua reservada a remoção administrativa/retenção, não ao fluxo comercial de cancelamento.
