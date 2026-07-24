# Segurança — checklist verificável

Atualizado em 24 de julho de 2026. Esta é a baseline da arquitetura atual do Order Manager: React/Vite no navegador, Supabase Auth e PostgreSQL acessados por RPCs controlados. O projeto não utiliza atualmente NestJS, Prisma, Docker ou uma API própria.

## Evidências verificadas nesta release

| Controlo               | Estado                   | Evidência                                                                                                                                                                                                                     |
| ---------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autenticação           | Verificado               | Login real com Supabase Auth e sessão persistente opcional; nenhuma password ou token entra no backup JSON.                                                                                                                   |
| Isolamento por empresa | Implementado             | Todas as operações comerciais obtêm `tenant_id` da membership da sessão. O navegador não escolhe `tenant_id`.                                                                                                                 |
| Papéis                 | Implementado             | Papéis atuais `OWNER` e `OPERATOR`; o acesso gerencial exige OWNER e uma segunda senha validada no servidor.                                                                                                                  |
| Acesso gerencial       | Verificado               | Hash com bcrypt/`pgcrypto`, desbloqueio ligado ao `session_id`, validade de 15 minutos e bloqueio temporário após cinco tentativas.                                                                                           |
| Tabelas                | Implementado             | RLS ativo e privilégios diretos revogados de `anon` e `authenticated`; os dados são acessados pelos RPCs autorizados.                                                                                                         |
| Funções SQL            | Endurecido               | `20260724_007_function_security_hardening.sql` fixa `search_path`, revoga `PUBLIC`/`anon` e mantém uma allowlist mínima para `authenticated`.                                                                                 |
| Security Advisor       | Verificado               | Em 24/07/2026: **0 erros**. Os 18 avisos restantes identificam os RPCs `SECURITY DEFINER` intencionalmente executáveis por utilizadores autenticados; cada RPC valida sessão, membership, papel e tenant conforme a operação. |
| Validação              | Verificado               | React Hook Form + Zod no navegador, validação dentro dos RPCs e constraints PostgreSQL.                                                                                                                                       |
| Segredos no browser    | Verificado               | Somente URL e chave pública `anon` do Supabase. Não existe `service_role` no frontend.                                                                                                                                        |
| Dependências           | Verificado               | `npm audit --audit-level=low` em 24/07/2026: **0 vulnerabilidades**.                                                                                                                                                          |
| Qualidade              | Verificado               | Prettier, ESLint, Stylelint, TypeScript, 67 testes automatizados e build de produção aprovados.                                                                                                                               |
| Backup                 | Implementado com limites | Exportação JSON protegida por OWNER + desbloqueio gerencial; cache de contingência sem credenciais e em modo somente leitura.                                                                                                 |

## Por que permanecem avisos de `SECURITY DEFINER`

O frontend não possui acesso direto às tabelas. Por isso, os RPCs públicos precisam executar com os privilégios controlados do proprietário da função e aplicar internamente as regras de sessão, membership, tenant e papel. Revogar `EXECUTE` desses RPCs quebraria a aplicação; torná-los `SECURITY INVOKER` exigiria conceder acesso direto às tabelas.

Os avisos do Advisor são, portanto, uma revisão manual obrigatória e não um erro ignorado. Helpers internos, funções de trigger e funções antigas não usadas pelo navegador não são executáveis por `authenticated`, `anon` ou `PUBLIC`.

## Regras obrigatórias de operação

1. Nunca colocar a chave `service_role`, passwords ou connection strings em variáveis `VITE_*`, no Git ou em mensagens.
2. Nunca aceitar `tenant_id` vindo de URL, filtro ou formulário do navegador.
3. Utilizar **Manter conectado** apenas em equipamento privado e protegido.
4. Guardar o JSON de backup fora do computador de trabalho, em local privado e cifrado.
5. Em modo de contingência, manter criação, edição e exclusão bloqueadas até o Supabase voltar a responder de forma consistente.
6. Aplicar migrations primeiro numa cópia ou projeto isolado; nunca substituir dados reais sem backup e reconciliação.

## Execução antes de cada release

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --audit-level=low
```

O workflow `.github/workflows/quality.yml` deve executar a mesma base no GitHub. Depois do deploy, login, carregamento, pesquisa, calendário, gestão e exportação do backup devem ser verificados no site publicado.

## Limites e riscos aceites para o piloto

- O plano gratuito do Supabase não oferece a mesma recuperação automática/PITR dos planos pagos.
- O JSON é uma cópia comercial para recuperação assistida; ainda não existe importação automática.
- O cache de contingência depende do perfil deste navegador e não substitui uma cópia externa.
- Gravação offline é bloqueada porque exigiria fila idempotente, sincronização e resolução de conflitos.
- Não foi realizado pentest independente. Antes de ampliar para várias empresas ou dados de maior risco, deve haver revisão externa proporcional, teste de restauração e revisão de acessos administrativos/MFA.

Esta checklist não substitui aconselhamento jurídico sobre RGPD nem uma auditoria independente.
