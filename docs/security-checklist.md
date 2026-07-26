# Segurança — checklist verificável

Atualizado em 26 de julho de 2026. Esta é a baseline da arquitetura atual do Order Manager: React/Vite no navegador, Supabase Auth e PostgreSQL acessados por RPCs controlados. O projeto não utiliza atualmente NestJS, Prisma, Docker ou uma API própria.

## Evidências verificadas nesta release

| Controlo               | Estado                    | Evidência                                                                                                                                                                                                                      |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Autenticação           | Verificado                | Login real com Supabase Auth e sessão persistente opcional; nenhuma password é guardada pelo código da aplicação.                                                                                                              |
| Isolamento por empresa | Implementado              | Todas as operações comerciais obtêm `tenant_id` da membership da sessão. O navegador não escolhe `tenant_id`.                                                                                                                  |
| Papéis                 | Implementado              | Papéis atuais `OWNER` e `OPERATOR`; o acesso gerencial exige OWNER e uma segunda senha validada no servidor.                                                                                                                   |
| Acesso gerencial       | Verificado                | Hash com bcrypt/`pgcrypto`, desbloqueio ligado ao `session_id`, validade de 15 minutos e bloqueio temporário após cinco tentativas.                                                                                            |
| Tabelas                | Implementado              | RLS ativo e privilégios diretos revogados de `anon` e `authenticated`; os dados são acessados pelos RPCs autorizados.                                                                                                          |
| Funções SQL            | Endurecido                | `20260724_007_function_security_hardening.sql` fixa `search_path`, revoga `PUBLIC`/`anon` e mantém uma allowlist mínima para `authenticated`; a migration `008` acrescenta somente o RPC autenticado de conclusão.             |
| Security Advisor       | Verificado                | Em 24/07/2026, depois da migration `008`: **0 erros**. Os avisos restantes identificam RPCs `SECURITY DEFINER` intencionalmente executáveis por utilizadores autenticados; cada RPC valida sessão, membership, papel e tenant. |
| Validação              | Verificado                | React Hook Form + Zod no navegador, validação dentro dos RPCs e constraints PostgreSQL.                                                                                                                                        |
| Segredos no browser    | Verificado                | Somente URL e chave pública `anon` do Supabase. Não existe `service_role` no frontend.                                                                                                                                         |
| Cabeçalhos web         | Implementado              | Vercel envia CSP restrita a recursos próprios, Supabase e Sentry, bloqueia iframe e MIME sniffing e desativa câmera, microfone e localização.                                                                                  |
| Dependências           | Mitigado e documentado    | O React Router foi removido porque existiam apenas duas rotas e o pacote mantinha um aviso não aplicável ao modo SPA. A navegação mínima usa a History API e possui teste. O toolchain é auditado sem atualizações forçadas.   |
| Qualidade              | Verificado no repositório | Prettier, ESLint, Stylelint, TypeScript, suite Vitest e build de produção fazem parte do gate obrigatório.                                                                                                                     |
| Backup                 | Não incluído no produto   | Não existe cópia local ou exportação JSON. Backup e restauração dependem do serviço ou de um dump administrativo autorizado.                                                                                                   |

## Por que permanecem avisos de `SECURITY DEFINER`

O frontend não possui acesso direto às tabelas. Por isso, os RPCs públicos precisam executar com os privilégios controlados do proprietário da função e aplicar internamente as regras de sessão, membership, tenant e papel. Revogar `EXECUTE` desses RPCs quebraria a aplicação; torná-los `SECURITY INVOKER` exigiria conceder acesso direto às tabelas.

Os avisos do Advisor são, portanto, uma revisão manual obrigatória e não um erro ignorado. Helpers internos, funções de trigger e funções antigas não usadas pelo navegador não são executáveis por `authenticated`, `anon` ou `PUBLIC`.

## Regras obrigatórias de operação

1. Nunca colocar a chave `service_role`, passwords ou connection strings em variáveis `VITE_*`, no Git ou em mensagens.
2. Nunca aceitar `tenant_id` vindo de URL, filtro ou formulário do navegador.
3. Utilizar **Manter conectado** apenas em equipamento privado e protegido.
4. Aplicar migrations primeiro numa cópia ou projeto isolado; nunca substituir dados reais sem backup e reconciliação.

## Execução antes de cada release

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --audit-level=low
```

O workflow `.github/workflows/quality.yml` deve executar a mesma base no GitHub. Depois do deploy, login, carregamento, pesquisa, calendário e gestão devem ser verificados no site publicado.

`test:coverage` aplica limites às funções puras, schemas e componentes reutilizáveis. O adaptador
Supabase permanece visível no relatório, mas não usa um limite unitário artificial: precisa de
validação integrada contra as RPCs e o projeto correto.

## Limites e riscos aceites para o piloto

- O plano gratuito do Supabase não oferece a mesma recuperação automática/PITR dos planos pagos.
- O produto não mantém cópia local de encomendas; indisponibilidade do Supabase interrompe a operação.
- Gravação offline é bloqueada porque exigiria fila idempotente, sincronização e resolução de conflitos.
- O alerta de `brace-expansion` está no caminho do ESLint, não no bundle Vite. Atualizar o toolchain quando ESLint 10 for adotado e validado, sem usar atualização forçada no piloto.
- Não foi realizado pentest independente. Antes de ampliar para várias empresas ou dados de maior risco, deve haver revisão externa proporcional, teste de restauração e revisão de acessos administrativos/MFA.

Esta checklist não substitui aconselhamento jurídico sobre RGPD nem uma auditoria independente.
