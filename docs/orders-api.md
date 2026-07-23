# API de encomendas

Data: 16 de julho de 2026  
Etapa: 13 — encomendas.

## Garantias de segurança

Todas as rotas requerem sessão autenticada. O tenant é sempre obtido de `tenant_memberships` no backend; não existe `tenant_id` em DTOs, parâmetros ou filtros aceites do cliente. Cada consulta inclui `tenant_id`, inclusive `GET /:id`, update, exclusão e operações em lote. Um ID de outra empresa devolve `404`.

As encomendas são criadas com pelo menos um item. A criação reserva `order_number` por tenant, cria a encomenda, cria os itens e grava auditoria na mesma transação serializável. Se qualquer inserção falhar, a transação inteira é revertida. Atualização substitui itens também na mesma transação, usa `version` e devolve `409 VERSION_CONFLICT` se outra edição venceu a corrida.

Não existe status comercial aprovado no schema atual. Nesta etapa, `status=ACTIVE` representa encomendas não apagadas (padrão) e `status=DELETED` representa soft deletes. Cancelamento como estado de negócio não foi inventado; exigirá decisão e migration específica.

## Endpoints

Base: `/api/v1/orders`

| Método   | Rota                   | Papel                  | Descrição                                                                                                               |
| -------- | ---------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/`                    | OWNER, ADMIN, OPERATOR | Lista paginada no banco. Filtros: `from`, `until`, `category`, `status`, `search`, `responsibleId`, `page`, `pageSize`. |
| `GET`    | `/:id`                 | OWNER, ADMIN, OPERATOR | Devolve encomenda, responsável e itens do tenant atual.                                                                 |
| `POST`   | `/`                    | OWNER, ADMIN, OPERATOR | Cria encomenda e itens atomicamente.                                                                                    |
| `PATCH`  | `/:id`                 | OWNER, ADMIN, OPERATOR | Atualiza com `version`; `items`, se enviados, substituem a lista inteira atomicamente.                                  |
| `DELETE` | `/:id?version=n`       | OWNER, ADMIN           | Soft delete individual.                                                                                                 |
| `POST`   | `/bulk-delete/preview` | OWNER, ADMIN           | Mostra quantidade e até 100 encomendas afetadas por intervalo de datas.                                                 |
| `POST`   | `/bulk-delete/confirm` | OWNER, ADMIN           | Exige `confirmation: true` e realiza soft delete do mesmo intervalo.                                                    |

`search` é aplicado no PostgreSQL a cliente, telefone, nome do responsável e nome dos produtos. `category` filtra encomendas que possuem pelo menos um item daquela categoria. Nenhuma listagem carrega todas as encomendas para filtrar no frontend.

## Payload de criação

```json
{
  "clientName": "Cliente Exemplo",
  "phone": "+351 900 000 000",
  "responsibleId": "uuid-opcional",
  "deliveryDate": "2026-07-20",
  "deliveryTime": "09:30",
  "items": [
    {
      "category": "PASTELARIA",
      "productName": "Pastel de nata",
      "quantityValue": "12",
      "quantityUnit": "UN"
    }
  ]
}
```

`catalogProductId` é opcional, mas se enviado deve pertencer ao catálogo ativo do tenant. `responsibleId`, se enviado, deve pertencer a um responsável ativo do mesmo tenant. A API salva `productName`, categoria e quantidade como snapshot no item para preservar o histórico da encomenda.

## Exclusão em lote

Primeiro chame `preview` com `from` opcional e `until`. Depois reapresente a quantidade ao utilizador e envie o mesmo intervalo a `confirm` com `confirmation: true`. A confirmação não permite hard delete, não afeta outro tenant e cria um audit log por encomenda. A prévia é informativa: alterações concorrentes entre prévia e confirmação são naturalmente excluídas do conjunto se já estiverem soft-deleted.

Swagger atualizado: `/api/v1/docs`. O acesso legado foi apenas movido para `apps/web/src/features/orders/api/ordersApi.ts`; a troca do frontend para esta API continua sendo uma etapa posterior.

## Limites

Os testes de transação/conflito usam mocks, pois Docker/PostgreSQL não foram iniciados nesta etapa. Antes de substituir o frontend em staging, executar a suite contra PostgreSQL de desenvolvimento com a migration da Etapa 10 aplicada e testar dois tenants reais. RLS continua pendente de uma etapa específica.
