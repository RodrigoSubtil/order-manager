# Etapa 30 — Experiência comercial do frontend

Atualizado em 23 de julho de 2026. Esta etapa liga as capacidades administrativas já existentes da API à interface sem enviar `tenant_id` pelo browser.

## O que ficou disponível

- O cabeçalho mostra a empresa ativa e o nome do acesso, sem expor detalhes técnicos de papel.
- O botão **Empresa** abre o seletor de memberships. A troca envia apenas o `membershipId`; a API valida a membership e grava o contexto seguro no cookie HttpOnly.
- Sem empresa ativa, a aplicação mostra uma página própria para escolher uma empresa, aceitar convites, tratar memberships suspensas/revogadas ou criar a primeira empresa.
- O botão **Gerenciar** solicita uma segunda senha antes de abrir catálogo e responsáveis. O PostgreSQL valida o desbloqueio por sessão; esconder o botão não é usado como barreira de segurança.
- OPERATOR não vê configurações nem operações de exclusão. Permissões continuam a ser verificadas pelo backend para todas as chamadas.
- A listagem de encomendas usa paginação real da API (25 por página). Pesquisa e filtros reiniciam a paginação; impressão continua a buscar o relatório na API, portanto não é limitada à página visível.
- O login contém **Manter conectado**, utiliza um nome de utilizador e não oferece recuperação de senha pelo browser.

## Contrato e segurança

O estado `rememberMe` continua isolado no formulário. A autenticação atual usa Supabase Auth diretamente e converte o utilizador numa identidade técnica interna que nunca é apresentada como contacto.

Todas as mutações administrativas obtêm o token CSRF antes da chamada. O cache TanStack Query é removido ao trocar empresa ou terminar sessão. A interface não aceita `tenant_id` em URL, body ou filtro.

## Verificação local

No mock local (MSW), abra a aplicação e entre com:

```text
utilizador: gestor
senha: segredo
```

O mock não envia mensagens nem usa Supabase.

## Limites conhecidos

- Alterações administrativas de senha são feitas fora do frontend, por um administrador autorizado no Supabase.
- O teste end-to-end local usa MSW; a validação contra Supabase real permanece trabalho de staging, não desta etapa.
