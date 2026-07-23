# Etapa 30 — Experiência comercial do frontend

Atualizado em 23 de julho de 2026. Esta etapa liga as capacidades administrativas já existentes da API à interface sem enviar `tenant_id` pelo browser.

## O que ficou disponível

- O cabeçalho mostra a empresa ativa, o nome real do utilizador e o papel, em vez de apresentar a empresa como “Utilizador”.
- O botão **Empresa** abre o seletor de memberships. A troca envia apenas o `membershipId`; a API valida a membership e grava o contexto seguro no cookie HttpOnly.
- Sem empresa ativa, a aplicação mostra uma página própria para escolher uma empresa, aceitar convites, tratar memberships suspensas/revogadas ou criar a primeira empresa.
- OWNER e ADMIN veem **Configurações**: catálogo, responsáveis, convites, papéis e estados de membership. A API e o RLS continuam sendo a autoridade; esconder botões não é uma barreira de segurança.
- OPERATOR não vê configurações nem operações de exclusão. Permissões continuam a ser verificadas pelo backend para todas as chamadas.
- A listagem de encomendas usa paginação real da API (25 por página). Pesquisa e filtros reiniciam a paginação; impressão continua a buscar o relatório na API, portanto não é limitada à página visível.
- O login contém **Manter-me ligado neste dispositivo** e recuperação de palavra-passe por uma resposta neutra contra enumeração de contas.

## Contrato e segurança

O contrato OpenAPI gerou novamente o cliente Orval para incluir `rememberMe`, recuperação de palavra-passe e `GET /tenants/memberships/current-tenant`. Não foram escritos tipos duplicados no frontend.

Todas as mutações administrativas obtêm o token CSRF antes da chamada. O cache TanStack Query é removido ao trocar empresa ou terminar sessão. A interface não aceita `tenant_id` em URL, body ou filtro.

## Verificação local

No mock local (MSW), abra a aplicação e entre com:

```text
email: gestor@alpha.test
palavra-passe: segredo
```

O mock não envia emails nem usa Supabase. Para recuperação real, configurar o redirect permitido e testar primeiro num projeto Supabase de staging/isolado. Nenhuma ação externa, migration ou alteração em produção foi executada nesta etapa.

## Limites conhecidos

- A entrega de email, validade de refresh token e template de recuperação dependem do Supabase Auth e devem ser ensaiados em staging antes de produção.
- O teste end-to-end local usa MSW; a validação contra Supabase real permanece trabalho de staging, não desta etapa.
