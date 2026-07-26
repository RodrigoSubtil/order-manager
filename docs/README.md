# Documentação do Order Manager

Atualizado em 26 de julho de 2026.

## Fonte de verdade atual

- [Sistema atual](current-system.md): arquitetura, dados, responsabilidades e riscos.
- [Arquitetura](architecture/overview.md): desenho técnico da aplicação em produção.
- [Fluxo de desenvolvimento](development-workflow.md): instalação, scripts e convenções.
- [Configuração Supabase](supabase-setup.md): schema, migrations, Auth, RLS e primeiro acesso.
- [Publicação](deployment.md): Vercel, variáveis e validação pós-deploy.
- [Guia do utilizador](user-guide.md): operação diária.
- [Acesso gerencial](management-access.md): separação entre OWNER e OPERATOR.
- [Checklist de segurança](security-checklist.md): controles e limites conhecidos.
- [Prontidão de entrega](release-readiness.md): o que está validado e o que ainda exige ação humana.
- [Runbook de produção](production-runbook.md): publicação, monitorização e incidente.

## Documentos históricos

Os restantes documentos registam decisões e etapas anteriores, inclusive propostas com NestJS,
Prisma, Docker, OpenAPI e uma API própria. Essas propostas não fazem parte da aplicação atual e
não devem ser usadas para executar, publicar ou operar o produto. Foram mantidas apenas para
preservar o histórico das decisões.
