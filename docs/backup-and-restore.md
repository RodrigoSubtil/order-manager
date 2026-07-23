# Backup e recuperação

Atualizado em 22 de julho de 2026. Este runbook diferencia o banco local, usado pelos testes, do projeto Supabase de produção. Nenhuma ação deste documento deve ser aplicada em produção sem aprovação do controlador e janela de mudança.

## Objetivos de recuperação propostos

| Cenário                         | RPO alvo                                                 | RTO alvo    | Evidência exigida                                                     |
| ------------------------------- | -------------------------------------------------------- | ----------- | --------------------------------------------------------------------- |
| Sem PITR, backup diário         | Até 24 horas                                             | Até 4 horas | Backup diário visível e restore de staging cronometrado.              |
| Com PITR                        | Definido contratualmente; alvo inicial de até 15 minutos | Até 4 horas | Janela PITR, ponto recuperável, restore e reconciliação documentados. |
| Exclusão acidental de encomenda | Sem perda após soft delete/audit                         | Até 1 hora  | Consulta de audit log e procedimento de reversão testado.             |

RPO/RTO são objetivos de negócio, não garantias do fornecedor. Devem ser acordados por tenant e revistos após cada teste de restore.

## Capacidades Supabase a confirmar

Projetos elegíveis têm backups diários e PITR é um add-on com granularidade muito menor; a documentação do fornecedor descreve retenção, indisponibilidade durante restore e necessidade de planeamento de downtime. Consulte [Backups do Supabase](https://supabase.com/docs/guides/platform/backups) e [restore para novo projeto](https://supabase.com/docs/guides/platform/clone-project).

Antes de produção, o responsável deve guardar evidência datada de:

- plano, região, retenção, backup mais recente e proprietário do projeto;
- PITR habilitado ou justificativa formal para não o habilitar;
- credenciais de restore guardadas fora do repositório;
- inclusão de Auth, Storage, Edge Functions e configurações na estratégia. Um clone de banco não restaura automaticamente todos esses componentes.

## Procedimento de restore testado

1. Declarar incidente e congelar migrations/escritas conforme `incident-response.md`.
2. Escolher backup ou ponto anterior ao incidente; documentar hora, RPO estimado e aprovador.
3. Preferir restaurar para projeto isolado/novo, nunca sobrescrever a produção como primeiro passo.
4. Configurar variáveis de staging sem segredos de produção no browser.
5. Executar `npm run test:db` e checks de RLS contra a cópia quando aplicável.
6. Conciliar tenants, users, orders, items, catálogo, responsáveis e audit logs; verificar amostra de acesso cruzado.
7. Medir tempo total, dados perdidos, falhas e decisão de cutover.
8. Somente com aprovação explícita, executar o plano de retorno/cutover em produção.

## Banco local

```bash
npm run db:up
npm run db:reset
npm run test:db
```

Esses comandos só aceitam `localhost/order_manager_dev`, recriam fixtures Alpha/Beta e não são backup de produção. `npm run db:down` para o container mantendo o volume; remover o volume é uma ação destrutiva e não faz parte deste runbook.

## Frequência de evidência

- restore integral em staging: antes do primeiro go-live e ao menos trimestralmente;
- verificação de backup/PITR: mensalmente;
- teste de recuperação de soft delete: a cada release que altera orders/audit;
- revisão de RPO/RTO: anual ou após incidente relevante.
