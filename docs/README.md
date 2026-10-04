# Documentação do Order Manager

**Versão do produto: 1.0.0.** O valor exibido no login e no cabeçalho vem de [`apps/web/package.json`](../apps/web/package.json). Esta é a versão da árvore de código; cada publicação precisa de validação no site publicado.

| Preciso de…                                    | Ler                                                |
| ---------------------------------------------- | -------------------------------------------------- |
| Usar o painel, encomendas, filtros e impressão | [Guia de utilização](product/guide.md)             |
| Gerir catálogo, responsáveis e acessos         | [Guia de gestão](product/management.md)            |
| Entender componentes, dados e decisões atuais  | [Arquitetura do sistema](architecture/system.md)   |
| Entender o schema, as RPCs e as migrations     | [Dados e Supabase](architecture/data.md)           |
| Preparar o ambiente e alterar código           | [Desenvolvimento](development/workflow.md)         |
| Configurar o projeto Supabase                  | [Configuração do Supabase](operations/supabase.md) |
| Publicar e validar uma versão                  | [Release e operação](operations/release.md)        |
| Verificar backups ou lidar com incidentes      | [Backup e recuperação](operations/backup.md)       |
| Consultar decisões e evidência antigas         | [Histórico](history/README.md)                     |

## Como ler esta documentação

- Os guias acima descrevem **o código atual**. Migrations em [`supabase/migrations`](../supabase/migrations) e o código em [`apps/web/src`](../apps/web/src) prevalecem se houver divergência.
- O estado do **banco real** só é confirmado por consulta ao projeto Supabase correto. O estado **publicado** só é confirmado no domínio e dispositivo usados pela pastelaria. Build e testes locais não substituem essas verificações.
- [`history/`](history/README.md) guarda contexto de decisões e auditorias; não é manual de instalação. O plano antigo com NestJS, Prisma e Docker foi abandonado e continua recuperável pelo histórico Git.
- Mudanças de comportamento precisam atualizar o guia correspondente nesta mesma alteração. Mudanças de schema exigem uma nova migration; não se edita uma migration já aplicada.
