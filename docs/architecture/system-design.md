# System design atual

Atualizado em 26 de julho de 2026.

## Componentes

```mermaid
flowchart TB
  subgraph Device["Dispositivo da pastelaria"]
    UI["React UI"]
    Q["TanStack Query"]
  end

  subgraph Vercel
    Static["HTML, CSS e JavaScript estáticos"]
  end

  subgraph Supabase
    Auth["Auth"]
    RPC["RPCs PostgreSQL"]
    RLS["RLS e grants"]
    Tables["tenants, users, memberships, orders, order_items, catalog, responsibles"]
  end

  Static --> UI
  UI --> Q
  Q --> Auth
  Q --> RPC
  RPC --> RLS
  RLS --> Tables
```

## Consistência

- criação e atualização de encomenda e itens ocorrem numa transação;
- `version` evita sobrescrever uma edição concorrente;
- o número da encomenda é sequencial e único dentro do tenant;
- conclusão marca a encomenda, remove-a das listas ativas e a retém por sete dias;
- exclusão direta é lógica;
- o dashboard invalida as consultas depois de criar, editar, concluir ou apagar;
- a ordenação final continua sendo data e hora de entrega, não a última alteração.

## Disponibilidade

Uma resposta válida com zero encomendas é um estado normal. Em falhas de leitura ou escrita, a
interface mostra o erro e não apresenta dados locais como se fossem atuais. Não existe operação
offline, pois sincronização sem fila idempotente poderia duplicar ou perder encomendas.

## Impressão

O documento de impressão tem largura máxima de 75 mm dentro de uma página de 80 mm, cabeçalho por
encomenda, margens pequenas e altura automática. CSS não consegue alterar com garantia o tamanho
configurado no driver; a impressora deve usar bobina de 80 mm e escala 100%.

## Segurança

- somente a chave `anon`/publishable pode estar no Vercel;
- RLS está ativa e acesso direto às tabelas é revogado;
- RPCs expostas validam `auth.uid()`, membership, role, tenant e desbloqueio quando necessário;
- password, token e conteúdo integral de encomendas não são escritos em logs;
- o frontend não disponibiliza exportação JSON nem armazena um histórico paralelo de alterações.
