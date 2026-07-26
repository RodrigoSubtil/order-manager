# Prontidão de entrega

Atualizado em 26 de julho de 2026.

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
- rodas de hora deslizáveis no telemóvel, campo nativo no computador e bloqueio de entregas
  anteriores ao momento atual;
- criação/edição transacional e conflito por `version`;
- catálogo sem unidade predefinida; `UN`, `KG` ou `G` é escolhida em cada item da encomenda;
- confirmação para concluir e apagar;
- atualização da lista após mutações e ordenação por entrega;
- filtros, pesquisa destacada e estado vazio;
- impressão detalhada e resumo em layout de 80 mm;
- erros remotos explícitos, sem apresentar cópias locais como dados atuais;
- RLS, grants restritos e RPCs endurecidas;
- workflow GitHub com format, lint, tipos, testes e build;
- cobertura por risco para utilitários puros, schemas e componentes UI; adaptadores Supabase ficam
  fora do threshold unitário e dependem de teste integrado no projeto real.

## Evidências da release

- `format:check`, ESLint, Stylelint, TypeScript, 95 testes, cobertura por risco e build: **PASS**;
- migration `010`: RPC de exportação JSON removida no projeto Supabase;
- migration `011`: função e trigger de bloqueio de entregas passadas instalados;
- migration `012`: `default_unit` removida do catálogo e RPCs atualizadas;
- consulta de verificação do Supabase: `true / true / true`;
- preparação para entrega: `0` encomendas, `0` itens, próximo número `1`, `45` produtos preservados
  e coluna antiga removida;
- formulário e rodas de hora verificados no breakpoint móvel, sem rolagem horizontal;
- impressão automatizada validada com cabeçalho por encomenda e encomenda longa de 50 produtos;
- impressão física continua pendente do teste com a impressora e o driver de bobina usados na
  pastelaria.

## Obrigatório antes do uso real

| Verificação                                                                         | Estado esperado |
| ----------------------------------------------------------------------------------- | --------------- |
| migrations até `20260726_012_remove_catalog_default_unit.sql` aplicadas no Supabase | PASS            |
| workflow do commit publicado                                                        | PASS            |
| login e logout no domínio Vercel                                                    | PASS            |
| criar, editar, concluir e apagar uma encomenda de teste                             | PASS            |
| gestão de produto e responsável de teste                                            | PASS            |
| impressão física em bobina 80 mm, escala 100%                                       | PASS            |
| validação no Redmi A5                                                               | PASS            |

## Limites aceites para o piloto

- sem PITR/backup gerido, não existe recuperação automática de perda total;
- não existe cópia local nem backup integrado no produto;
- a impressão depende do driver configurado para 80 mm;
- não existe gravação offline;
- o bundle inicial pode ser dividido futuramente se medições no aparelho mostrarem necessidade;
- não houve pentest independente.

O site está apto a um piloto quando a suite local e toda a tabela acima estiverem PASS. “Build
aprovado” sozinho não confirma o Supabase externo nem a impressora física.
