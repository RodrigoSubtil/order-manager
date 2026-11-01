# Documentação do Order Manager

**Versão do ciclo de desenvolvimento e homologação: 1.1.0.** O valor exibido no login e no cabeçalho vem de [`apps/web/package.json`](../apps/web/package.json). A produção permanece em **1.0.0**, sem a IA e o novo design deste ciclo. O utilizador testa e aprova homologação antes de autorizar promoção para `main` e publicação Production. Ajustes e republicações em homologação não aumentam a versão automaticamente.

| Preciso de…                                      | Ler                                                        |
| ------------------------------------------------ | ---------------------------------------------------------- |
| Usar o painel, encomendas, filtros e impressão   | [Guia de utilização](product/guide.md)                     |
| Gerir catálogo, responsáveis e acessos           | [Guia de gestão](product/management.md)                    |
| Consultar os padrões visuais e seu estado        | [Style guide do Order Manager](design/README.md)           |
| Padronizar fontes, tamanhos e pesos              | [Tipografia](design/typography.md)                         |
| Definir espaços, botões, raios e ícones          | [Espaçamentos e controles](design/spacing-and-controls.md) |
| Padronizar paleta, alertas e hierarquia de ações | [Cores e estados](design/colors.md)                        |
| Entender componentes, dados e decisões atuais    | [Arquitetura do sistema](architecture/system.md)           |
| Entender o schema, as RPCs e as migrations       | [Dados e Supabase](architecture/data.md)                   |
| Preparar o ambiente e alterar código             | [Desenvolvimento](development/workflow.md)                 |
| Configurar o projeto Supabase                    | [Configuração do Supabase](operations/supabase.md)         |
| Publicar e validar uma versão                    | [Release e operação](operations/release.md)                |
| Configurar e testar a digitalização com IA       | [Digitalização de encomendas](operations/order-scan.md)    |
| Verificar backups ou lidar com incidentes        | [Backup e recuperação](operations/backup.md)               |
| Consultar decisões e evidência antigas           | [Histórico](history/README.md)                             |

## Ambientes e preparação de homologação

- [Ambientes e publicação segura](operations/environments.md): endereços, branches, project refs, variáveis, utilizadores e promoção para produção.
- [Validação final para uso](operations/readiness-2026-10-05.md): base canónica, recuperação lógica, CI/build, testes publicados e limites.
- [Auditoria inicial de 05/10/2026](operations/homologacao-audit-2026-10-05.md): o que foi configurado/testado, diferenças entre bancos, limpeza final e pendências.

Não existem senhas ou chaves nesses documentos. As contagens da auditoria são um retrato datado; confirme o banco atual antes de qualquer limpeza ou migration.

## Como ler esta documentação

- Os guias operacionais acima descrevem **o código atual**. O style guide registra os padrões aplicados no código desta revisão; aplicação, validação local e publicação são estados distintos. Migrations em [`supabase/migrations`](../supabase/migrations) e o código em [`apps/web/src`](../apps/web/src) prevalecem se houver divergência.
- O estado do **banco real** só é confirmado por consulta ao projeto Supabase correto. O estado **publicado** só é confirmado no domínio e dispositivo usados pela pastelaria. Build e testes locais não substituem essas verificações.
- [`history/`](history/README.md) guarda contexto de decisões e auditorias; não é manual de instalação. O plano antigo com NestJS, Prisma e Docker foi abandonado e continua recuperável pelo histórico Git.
- Mudanças de comportamento precisam atualizar o guia correspondente nesta mesma alteração. Mudanças de schema exigem uma nova migration; não se edita uma migration já aplicada.
