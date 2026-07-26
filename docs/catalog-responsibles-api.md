# API de catálogo e responsáveis

Data: 16 de julho de 2026  
Etapa: 12 — catálogo e responsáveis.

## Segurança e contexto

Todas as rotas requerem sessão Supabase válida. O `AuthGuard` resolve a `tenant_membership` ativa no backend; `tenant_id` não é parâmetro, campo de DTO, query string ou filtro aceito do browser. Cada repository recebe o `tenantId` do contexto autenticado e toda busca por UUID inclui esse escopo. Um UUID existente em outra empresa retorna `404`.

Leitura é permitida a `OWNER`, `ADMIN` e `OPERATOR`. Criar, editar e apagar exige `OWNER` ou `ADMIN`. Apagar é lógico, usa `version` para controlo otimista e cria audit log. Criação, alteração/soft delete e respetivo log ocorrem dentro da mesma transação Prisma.

## Catálogo

Base: `/api/v1/catalog/products`

| Método   | Rota             | Papel                 | Descrição                                                                                                        |
| -------- | ---------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/`              | qualquer membro ativo | Lista paginada. Filtros: `category`, `active`, `search`, `page`, `pageSize`.                                     |
| `GET`    | `/:id`           | qualquer membro ativo | Obtém produto do tenant atual.                                                                                   |
| `POST`   | `/`              | OWNER, ADMIN          | Cria produto com `category`, `name`, `isActive` e `position`. A unidade é definida somente no item da encomenda. |
| `PATCH`  | `/:id`           | OWNER, ADMIN          | Atualiza campos e exige `version`.                                                                               |
| `DELETE` | `/:id?version=n` | OWNER, ADMIN          | Soft delete; exige versão atual.                                                                                 |

Categorias aceites: `PASTELARIA`, `PADARIA`, `SALGADOS`. Unidades: `UN`, `KG`, `G`.

## Responsáveis

Base: `/api/v1/responsibles`

| Método   | Rota             | Papel                 | Descrição                                                        |
| -------- | ---------------- | --------------------- | ---------------------------------------------------------------- |
| `GET`    | `/`              | qualquer membro ativo | Lista paginada. Filtros: `active`, `search`, `page`, `pageSize`. |
| `GET`    | `/:id`           | qualquer membro ativo | Obtém responsável do tenant atual.                               |
| `POST`   | `/`              | OWNER, ADMIN          | Cria responsável.                                                |
| `PATCH`  | `/:id`           | OWNER, ADMIN          | Atualiza nome, estado ou posição; exige `version`.               |
| `DELETE` | `/:id?version=n` | OWNER, ADMIN          | Soft delete; exige versão atual.                                 |

## Respostas e conflitos

Listagens devolvem `{ items, page, pageSize, total }`. Alteração ou exclusão com uma versão desatualizada devolve `409` com código `VERSION_CONFLICT`; o cliente deve recarregar o item. Recursos ausentes ou de outro tenant devolvem `404`, sem revelar a empresa proprietária.

Swagger documenta as rotas em `/api/v1/docs`. A documentação de autenticação continua em [authentication-multitenancy.md](C:/Users/rodri/Desktop/order-manager-main/docs/authentication-multitenancy.md).

## Limites desta etapa

Não foi iniciada base Docker, executada migration, feito seed, ligado Supabase nem alterado o frontend. A API está implementada e testada com mocks; para teste de integração com PostgreSQL real é necessário subir o banco de desenvolvimento e aplicar a migration da Etapa 10 mediante ação explícita.
