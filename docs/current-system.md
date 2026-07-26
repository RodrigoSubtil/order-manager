# Sistema atual

Atualizado em 26 de julho de 2026.

## Visão geral

O Order Manager é uma aplicação web para registar, acompanhar, concluir e imprimir encomendas da
Pastelaria Vénus. A versão atual é deliberadamente simples:

```text
React + TypeScript + Vite no Vercel
  -> Supabase Auth
  -> RPCs PostgreSQL
  -> tabelas protegidas por RLS
```

Não existem NestJS, Prisma, Render, Docker ou uma API própria em execução. O browser recebe apenas
a URL e a chave pública do Supabase. `service_role`, connection strings e passwords administrativas
nunca podem entrar no bundle.

## Funcionalidades em uso

- login por nome de utilizador e password;
- opção **Manter conectado** para equipamentos privados;
- papéis `OWNER` e `OPERATOR`;
- segunda senha, validada no PostgreSQL, para a área **Gerenciar**;
- criação, edição, conclusão e exclusão de encomendas;
- responsável escolhido somente da lista;
- catálogo reutilizável, com produto livre permitido na encomenda;
- filtros por área, data e pesquisa textual;
- indicadores globais de total, hoje e próximas;
- impressão individual, detalhada ou com quantidade total por produto;
- formato de impressão preparado para bobina térmica de 80 mm;
- conclusão com retenção no banco por sete dias.

## Fluxo de autenticação e autorização

1. A pessoa informa o seu nome de utilizador e a password.
2. O frontend converte o nome visível numa identidade técnica do Supabase Auth.
3. O Supabase cria ou restaura uma sessão.
4. `web_session_context` resolve utilizador, empresa e membership ativa a partir de `auth.uid()`.
5. As RPCs resolvem `tenant_id` novamente no servidor; o frontend não o escolhe.
6. `OPERATOR` trabalha com encomendas. `OWNER` também pode solicitar o desbloqueio temporário da
   área **Gerenciar**.

Se o Supabase não puder confirmar a sessão, o acesso não é liberado. O navegador não usa um
contexto empresarial guardado anteriormente.

## Fluxo de dados de encomendas

```mermaid
sequenceDiagram
  actor Pessoa as Utilizador
  participant Web as React
  participant Auth as Supabase Auth
  participant RPC as RPC PostgreSQL
  participant DB as Tabelas com RLS

  Pessoa->>Web: cria ou altera encomenda
  Web->>Web: React Hook Form + Zod
  Web->>RPC: web_save_order com sessão Auth
  RPC->>Auth: obtém auth.uid()
  RPC->>DB: valida membership, tenant, version e constraints
  DB-->>RPC: transação confirmada
  RPC-->>Web: id e nova version
  Web->>RPC: recarrega lista ordenada
```

A validação do navegador melhora a experiência, mas não é a fronteira de segurança. Os RPCs,
constraints, foreign keys, versionamento otimista e RLS continuam responsáveis pela integridade.

## Falhas de ligação

O navegador não guarda cópias locais das encomendas, catálogo ou responsáveis. Se uma leitura do
Supabase falhar, a interface apresenta o erro recebido e as escritas não são confirmadas como
concluídas. Uma resposta válida com zero encomendas continua sendo um estado normal.

A recuperação real de dados depende de backup ou dump autorizado do Supabase e de um procedimento
de restauração testado.

## Mapa principal do código

```text
apps/web/src/
  app/
    providers/              TanStack Query e providers globais
    router/                 rotas / e /settings pela History API
  features/
    auth/                   login, sessão, cabeçalho e logout
    orders/                 dashboard, filtros, formulário e cartões
    reports/                opções e documento de impressão
    settings/               catálogo e responsáveis
  shared/
    components/ui/          controles reutilizáveis e acessíveis
    hooks/                  comportamentos visuais genéricos
    lib/
      supabase.ts           cliente Auth com persistência escolhida
      supabaseData.ts       único adaptador de RPCs
  styles/                   tokens, reset, global e impressão

supabase/
  migrations/               schema e evolução versionada
  seeds/                    dados opcionais de demonstração
```

## Regras que não podem ser quebradas

- nunca receber ou enviar `tenant_id` em formulários, URLs ou filtros;
- nunca usar `service_role` no browser;
- toda escrita de encomenda deve continuar transacional;
- toda edição e exclusão deve conferir `version`;
- responsáveis de encomendas vêm da lista ativa;
- observações são opcionais; os outros dados do formulário são obrigatórios;
- uma lista válida vazia é um estado normal e não pode ser tratada como erro;
- só `OWNER` pode desbloquear e usar a área **Gerenciar**;
- alterações de schema entram como nova migration e são testadas antes do projeto em uso.

## Riscos e limites conhecidos

| Risco                          | Proteção atual                           | Limite restante                                                          |
| ------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------ |
| Perda de dados no Supabase     | retenção lógica de encomendas concluídas | sem backup externo recente, ainda há risco de perda                      |
| Perda do dispositivo/browser   | dados comerciais continuam no Supabase   | sessões locais devem ser encerradas em equipamento perdido               |
| Internet indisponível          | erros explícitos e sem confirmação falsa | não há consulta nem gravação offline                                     |
| Password partilhada            | Supabase Auth e senha gerencial separada | recomenda-se equipamento protegido e rotação controlada                  |
| Conflito entre duas edições    | campo `version`                          | a pessoa precisa recarregar e repetir a alteração                        |
| Impressora configurada como A4 | CSS de 80 mm                             | o driver ainda deve estar configurado para bobina 80 mm                  |
| Crescimento futuro             | separação por features e tenant          | uma única empresa não elimina a necessidade de rever acessos ao expandir |
| Bundle inicial grande          | compressão Vite                          | code splitting pode ser adotado se a rede/dispositivo mostrar lentidão   |

## Estado de prontidão

O código pode ser entregue para piloto depois de toda a suite local passar, a migration mais recente
estar aplicada no Supabase correto e o fluxo publicado ser testado no dispositivo e na impressora
reais. A aprovação final está registada em [release-readiness.md](release-readiness.md).
