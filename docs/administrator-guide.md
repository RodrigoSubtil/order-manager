# Guia de administração

## Limite atual da interface

O painel web atual é focado em encomendas. A administração de empresas e memberships está exposta pela API protegida e deve ser operada por pessoal autorizado, com evidência no ticket de suporte. Não afirmar que existe uma tela de administração enquanto ela não for entregue e validada.

## Conceitos

- **Tenant:** empresa isolada logicamente no banco partilhado.
- **Utilizador:** identidade autenticada pelo Supabase Auth.
- **Membership:** vínculo entre utilizador e empresa, com papel e estado.
- **Tenant ativo:** empresa validada pelo servidor; nunca um `tenant_id` enviado pelo browser.

## Matriz de permissões

| Operação                                                  | OWNER                 | ADMIN              | OPERATOR |
| --------------------------------------------------------- | --------------------- | ------------------ | -------- |
| Consultar encomendas, catálogo, responsáveis e relatórios | Sim                   | Sim                | Sim      |
| Criar e editar encomendas                                 | Sim                   | Sim                | Sim      |
| Excluir encomendas, inclusive em lote                     | Sim                   | Sim                | Não      |
| Criar, editar e excluir catálogo/responsáveis             | Sim                   | Sim                | Não      |
| Convidar, alterar, suspender ou revogar memberships       | Sim                   | Sim                | Não      |
| Criar uma nova empresa                                    | Sim                   | Sim                | Sim      |
| Resolver incidentes, retenção e contratos                 | Responsável designado | Conforme delegação | Não      |

Toda operação continua sujeita a membership `ACTIVE`, tenant ativo, RLS e regras do backend.

## Criar empresa e primeiro OWNER

1. Confirmar autorização comercial, contacto administrativo, retenção e controlador de dados.
2. Abrir ticket de onboarding, sem inserir segredos.
3. Um operador autenticado chama `POST /api/v1/tenants`. A API cria tenant e primeira membership `OWNER` atomicamente.
4. Confirmar por `GET /api/v1/tenants/memberships` e registar o tenant apenas pelo código interno do ticket.
5. Configurar catálogo, responsáveis e utilizadores de teste antes do uso real.
6. Executar teste de isolamento com outro tenant em staging.

O frontend nunca escolhe `tenant_id`; criação é uma operação administrativa controlada, não um formulário público.

## Convidar e gerir utilizadores

1. Confirmar com o cliente que a pessoa deve aceder à empresa e aplicar menor privilégio.
2. O `OWNER` ou `ADMIN` chama `POST /api/v1/tenants/memberships/invite`.
3. A pessoa aceita no fluxo autenticado em `POST /api/v1/tenants/memberships/:membershipId/accept`.
4. Para alterar papel, ativar, suspender ou revogar, usar `PATCH /api/v1/tenants/memberships/:membershipId` e guardar motivo/ticket.
5. Revogar imediatamente quando a pessoa sair da empresa ou houver risco e confirmar que o acesso foi negado.

Nunca enviar palavra-passe por ticket, email comum, chat ou screenshot. Configuração de convite pode exigir segredo de backend; não o exponha no browser.

## Trocar empresa

Quando uma identidade possui memberships ativas em mais de uma empresa, a troca usa `POST /api/v1/tenants/switch`. O servidor valida a membership e atualiza o contexto seguro. Após a troca, o cliente deve limpar cache e recarregar dados. Não usar URL, query string, body de encomenda ou filtros para escolher tenant.

## Onboarding de tenant

| Fase                                            | Dono               | Evidência                     |
| ----------------------------------------------- | ------------------ | ----------------------------- |
| Contrato, controlador, DPA e retenção definidos | Comercial/jurídico | Ticket/contrato aprovado      |
| Tenant e primeiro OWNER criados                 | Administração      | ID codificado e audit log     |
| Catálogo e responsáveis configurados            | OWNER/ADMIN        | Revisão do cliente            |
| Utilizadores convidados com menor privilégio    | OWNER/ADMIN        | Lista de memberships restrita |
| Teste de login, roles e isolamento              | Técnico/cliente    | Checklist de staging          |
| Go-live autorizado                              | Negócio/técnico    | Aprovação formal              |

## Desligamento de tenant

1. Validar pedido autorizado e identidade do solicitante.
2. Suspender memberships e remover acessos operacionais, preservando evidência.
3. Bloquear integrações/convides e confirmar que não há novas operações.
4. Exportar dados apenas pelo processo RGPD aprovado, se aplicável.
5. Aplicar retenção, anonimização ou eliminação após aprovação jurídica/contratual; backups seguem o seu ciclo.
6. Registar data, responsável, fundamento, auditoria e revisão.

Consulte [privacy-and-retention.md](./privacy-and-retention.md), [incident-response.md](./incident-response.md) e [openapi.md](./openapi.md).
