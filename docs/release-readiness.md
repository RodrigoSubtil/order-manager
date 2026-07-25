# Prontidão de entrega

Atualizado em 25 de julho de 2026.

## Produto atual

```text
Vercel (React + Vite) -> Supabase Auth -> RPCs PostgreSQL -> RLS
```

## Validado no código

- separação por funcionalidades e componentes;
- `OWNER` e `OPERATOR`, com gestão exclusiva do OWNER;
- `tenant_id` resolvido pela sessão no PostgreSQL;
- login amigável por utilizador e persistência opcional;
- validação obrigatória do formulário, exceto observações;
- criação/edição transacional e conflito por `version`;
- confirmação para concluir e apagar;
- atualização da lista após mutações e ordenação por entrega;
- filtros, pesquisa destacada e estado vazio;
- impressão detalhada e resumo em layout de 80 mm;
- journal automático local e export JSON;
- RLS, grants restritos e RPCs endurecidas;
- workflow GitHub com format, lint, tipos, testes e build.

## Obrigatório antes do uso real

| Verificação                                                              | Estado esperado |
| ------------------------------------------------------------------------ | --------------- |
| migration `20260725_009_venus_username.sql` aplicada no Supabase correto | PASS            |
| workflow do commit publicado                                             | PASS            |
| login e logout no domínio Vercel                                         | PASS            |
| criar, editar, concluir e apagar uma encomenda de teste                  | PASS            |
| gestão de produto e responsável de teste                                 | PASS            |
| download e leitura do JSON                                               | PASS            |
| impressão física em bobina 80 mm, escala 100%                            | PASS            |
| validação no Redmi A5                                                    | PASS            |

## Limites aceites para o piloto

- sem PITR/backup gerido, a cópia externa continua manual;
- o arquivo automático é local ao browser;
- a impressão depende do driver configurado para 80 mm;
- não existe gravação offline;
- o bundle inicial pode ser dividido futuramente se medições no aparelho mostrarem necessidade;
- não houve pentest independente.

O site está apto a um piloto quando a suite local e toda a tabela acima estiverem PASS. “Build
aprovado” sozinho não confirma o Supabase externo nem a impressora física.
