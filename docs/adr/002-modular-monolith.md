# ADR 002 — Monólito modular no backend

- Estado: Aceite para arquitetura alvo; implementação pendente.
- Data: 15 de julho de 2026

## Contexto

O Order Manager precisa de backend para centralizar autenticação, autorização, transações, auditoria e multitenancy. Os domínios atuais — encomendas, itens, catálogo, responsáveis e memberships — compartilham dados e regras transacionais.

## Decisão

Usar NestJS como **monólito modular**. Cada domínio é módulo com controller, DTOs, serviço, acesso de dados Prisma, guardas de autorização e testes próprios. A aplicação é implantada como uma API única e expõe REST versionado em `/api/v1`.

## Justificativa

Esta forma entrega separação de responsabilidades sem custo de chamadas distribuídas, consistência eventual, deploy independente, tracing distribuído e contratos entre microserviços. Uma única transação pode criar encomenda, itens, número sequencial e auditoria de modo atómico.

## Consequências

- Exige disciplina de limites de módulo e proíbe imports internos arbitrários entre domínios.
- Simplifica deploy, testes, logs e migrations nesta fase.
- Permite extração futura baseada em evidência: carga independente, propriedade de equipa distinta, necessidade de escalabilidade ou fronteira de domínio real.
- Não cria fila, broker ou microserviço preventivamente.
