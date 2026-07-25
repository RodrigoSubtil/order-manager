# Segurança — checklist verificável

Atualizado em 25 de julho de 2026. Esta é a baseline da arquitetura atual do Order Manager: React/Vite no navegador, Supabase Auth e PostgreSQL acessados por RPCs controlados. O projeto não utiliza atualmente NestJS, Prisma, Docker ou uma API própria.

## Evidências verificadas nesta release

| Controlo               | Estado                    | Evidência                                                                                                                                                                                                                      |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Autenticação           | Verificado                | Login real com Supabase Auth e sessão persistente opcional; nenhuma password ou token entra no backup JSON.                                                                                                                    |
| Isolamento por empresa | Implementado              | Todas as operações comerciais obtêm `tenant_id` da membership da sessão. O navegador não escolhe `tenant_id`.                                                                                                                  |
| Papéis                 | Implementado              | Papéis atuais `OWNER` e `OPERATOR`; o acesso gerencial exige OWNER e uma segunda senha validada no servidor.                                                                                                                   |
| Acesso gerencial       | Verificado                | Hash com bcrypt/`pgcrypto`, desbloqueio ligado ao `session_id`, validade de 15 minutos e bloqueio temporário após cinco tentativas.                                                                                            |
| Tabelas                | Implementado              | RLS ativo e privilégios diretos revogados de `anon` e `authenticated`; os dados são acessados pelos RPCs autorizados.                                                                                                          |
| Funções SQL            | Endurecido                | `20260724_007_function_security_hardening.sql` fixa `search_path`, revoga `PUBLIC`/`anon` e mantém uma allowlist mínima para `authenticated`; a migration `008` acrescenta somente o RPC autenticado de conclusão.             |
| Security Advisor       | Verificado                | Em 24/07/2026, depois da migration `008`: **0 erros**. Os avisos restantes identificam RPCs `SECURITY DEFINER` intencionalmente executáveis por utilizadores autenticados; cada RPC valida sessão, membership, papel e tenant. |
| Validação              | Verificado                | React Hook Form + Zod no navegador, validação dentro dos RPCs e constraints PostgreSQL.                                                                                                                                        |
| Segredos no browser    | Verificado                | Somente URL e chave pública `anon` do Supabase. Não existe `service_role` no frontend.                                                                                                                                         |
| Dependências           | Mitigado e documentado    | A auditoria de 25/07/2026 aponta `brace-expansion` apenas pela ferramenta ESLint e um aviso de React Router para modo RSC. A SPA não usa RSC, SSR, actions ou entrada dinâmica de rotas; não foi usado `audit fix --force`.    |
| Qualidade              | Verificado no repositório | Prettier, ESLint, Stylelint, TypeScript, suite Vitest e build de produção fazem parte do gate obrigatório.                                                                                                                     |
| Backup                 | Implementado com limites  | Snapshot somente leitura, journal IndexedDB automático e pacote JSON protegido por OWNER + desbloqueio gerencial.                                                                                                              |

## Por que permanecem avisos de `SECURITY DEFINER`

O frontend não possui acesso direto às tabelas. Por isso, os RPCs públicos precisam executar com os privilégios controlados do proprietário da função e aplicar internamente as regras de sessão, membership, tenant e papel. Revogar `EXECUTE` desses RPCs quebraria a aplicação; torná-los `SECURITY INVOKER` exigiria conceder acesso direto às tabelas.

Os avisos do Advisor são, portanto, uma revisão manual obrigatória e não um erro ignorado. Helpers internos, funções de trigger e funções antigas não usadas pelo navegador não são executáveis por `authenticated`, `anon` ou `PUBLIC`.

## Regras obrigatórias de operação

1. Nunca colocar a chave `service_role`, passwords ou connection strings em variáveis `VITE_*`, no Git ou em mensagens.
2. Nunca aceitar `tenant_id` vindo de URL, filtro ou formulário do navegador.
3. Utilizar **Manter conectado** apenas em equipamento privado e protegido.
4. Guardar o JSON de backup fora do computador de trabalho, em local privado e cifrado.
5. Em modo de contingência, manter criação, edição, conclusão e exclusão bloqueadas até o Supabase voltar a responder.
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
- O JSON é uma cópia comercial para recuperação assistida; não existe importação automática.
- O cache de contingência depende do perfil deste navegador e não substitui uma cópia externa.
- O journal IndexedDB também depende do dispositivo; o OWNER deve transferir a cópia externa.
- Gravação offline é bloqueada porque exigiria fila idempotente, sincronização e resolução de conflitos.
- O alerta atual do React Router afeta o processamento de actions em RSC. O projeto usa apenas `BrowserRouter`, `Routes`, `Route` e `Navigate`; rever uma versão corrigida assim que existir uma opção compatível.
- O alerta de `brace-expansion` está no caminho do ESLint, não no bundle Vite. Atualizar o toolchain quando ESLint 10 for adotado e validado, sem usar atualização forçada no piloto.
- Não foi realizado pentest independente. Antes de ampliar para várias empresas ou dados de maior risco, deve haver revisão externa proporcional, teste de restauração e revisão de acessos administrativos/MFA.

Esta checklist não substitui aconselhamento jurídico sobre RGPD nem uma auditoria independente.
