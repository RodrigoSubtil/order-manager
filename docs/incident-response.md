# Resposta a incidentes

Atualizado em 22 de julho de 2026. Um incidente inclui possível acesso entre tenants, perda de encomendas, vazamento de dados pessoais, credencial exposta, indisponibilidade grave ou restauração incorreta.

## Papéis

| Papel                               | Responsabilidade                                                  |
| ----------------------------------- | ----------------------------------------------------------------- |
| Incident commander                  | Coordena decisão, cronologia e comunicação.                       |
| Responsável técnico                 | Contém acesso, preserva evidência e executa recuperação aprovada. |
| Controlador do cliente              | Decide comunicação a titulares/autoridade quando aplicável.       |
| Responsável de privacidade/jurídico | Avalia RGPD, prazo de notificação e conteúdo da comunicação.      |
| Suporte                             | Comunica estado aprovado, sem expor detalhes sensíveis.           |

Uma pessoa pode acumular papéis em equipa pequena, mas a aprovação de restore e a execução devem ficar registadas separadamente.

## Fluxo

1. **Detetar e classificar:** abrir ticket, registrar hora, tenant afetado, fonte e impacto conhecido.
2. **Conter:** revogar sessões/memberships, desativar convite/integração ou limitar tráfego. Não apagar logs nem executar restore impulsivamente.
3. **Preservar evidência:** guardar request IDs, audit logs, versão implantada, configuração relevante e hora UTC; nunca anexar tokens, cookies ou PII desnecessária.
4. **Investigar:** confirmar se houve acesso cruzado, alteração, exfiltração ou indisponibilidade; comparar com RLS e audit logs.
5. **Recuperar:** aplicar correção, soft restore ou runbook de backup somente com aprovação.
6. **Comunicar:** controlador e jurídico definem notificações contratuais/RGPD. Avaliar obrigação de comunicação em até 72 horas quando aplicável.
7. **Encerrar:** post-mortem sem culpa, causa raiz, ações, dono e prazo; adicionar teste que impede recorrência.

## Severidade inicial

- **Sev 1:** acesso confirmado entre tenants, vazamento de credencial, perda ampla ou indisponibilidade total.
- **Sev 2:** impacto limitado a um tenant ou degradação grave sem vazamento confirmado.
- **Sev 3:** falha controlada, sem dados pessoais expostos e com workaround.

## Checklist de incidente de segurança

- [ ] Request/trace IDs preservados.
- [ ] Tenant, utilizadores e período afetados confirmados.
- [ ] Tokens, cookies e segredos não apareceram no ticket.
- [ ] Sessões/memberships comprometidas foram revogadas ou rotacionadas.
- [ ] RLS, roles e repository scoping foram testados após correção.
- [ ] Backup/restore avaliado conforme `backup-and-restore.md`.
- [ ] Controlador e responsável jurídico foram envolvidos quando há dados pessoais.
- [ ] Post-mortem e ação preventiva foram aprovados.
