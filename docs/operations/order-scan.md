# Digitalização de encomendas

O botão da câmara abre um modal pequeno para **Abrir câmara** ou **Escolher foto**. Uma fotografia por análise. Após a leitura, aparece o progresso estimado, a conclusão e **Revisar encomenda**. A revisão usa o formulário de Nova encomenda já existente. **Provável** aparece em verde e **Conferir** em vermelho. Só o botão **Salvar** do formulário grava a encomenda.

## Estado atual

- O front e o contrato de dados estão implementados. A prévia local usa dados simulados e **não chama a IA**.
- A função `supabase/functions/interpret-order/index.ts` está preparada para autenticar, validar uma foto, reservar o orçamento, contar tokens da imagem, consultar a OpenAI e devolver somente os dados extraídos. Falha fechada se a chave, a permissão de ativação ou as credenciais do Supabase faltarem.
- A migration `20261008190245_order_scan_limits.sql` foi aplicada **somente em homologação**, no projeto `order-manager-homologacao` (`czbrnxrpofdbbgbdyrad`), em 08/10/2026. O histórico remoto foi alinhado com a versão canónica do arquivo após o conector gerar o seu timestamp de aplicação.
- A função `interpret-order` foi publicada nesse projeto, versão 1, com o mesmo código preparado localmente. **A leitura real foi ativada em homologação em 08/10/2026, às 21:41 UTC**: `ORDER_SCAN_LIVE_ENABLED=true`. Os secrets `OPENAI_API_KEY` e `ORDER_SCAN_ALLOWED_ORIGINS` estão salvos. A validade da chave na OpenAI e a interpretação de uma fotografia real ainda dependem do teste do utilizador.
- A [PR #4](https://github.com/RodrigoSubtil/order-manager/pull/4) publica a versão 1.1.0 somente em `homologacao`. `VITE_ORDER_SCAN_ENABLED=true` está configurado no ambiente Preview dessa branch; a produção continua fora desta publicação.
- Não existe chave da OpenAI no código, no browser ou neste documento. Não foram feitas chamadas pagas de IA.

### Verificação em 08/10/2026

- PostgreSQL 17.11 local descartável: migrations, bloqueio da segunda análise da mesma empresa, limite diário de 50, orçamento mensal com reserva e independência entre empresas passaram. As fixtures foram revertidas e a base local foi encerrada.
- Função com serviços simulados: três testes passaram, incluindo falha antes dos serviços sem chave e bloqueio de imagem acima do teto de tokens.
- Banco de homologação: RLS ativo na tabela privada; `anon` e `authenticated` sem acesso à tabela e sem execução das duas RPCs; `service_role` com execução das RPCs. Nenhuma tentativa de leitura foi registrada.
- Função publicada: POST de localhost e homologação retornaram 503 com a mensagem de IA desligada; preflight local retornou 204; origem não autorizada retornou 403; GET retornou 405. Nenhuma foto ou token de sessão foi enviado nesses testes.
- Após a ativação, cinco verificações HTTP passaram: POST sem sessão de localhost e homologação retornou 401; preflight permitido 204; origem não autorizada 403; GET 405. A ativação não removeu a autenticação e estes testes não chamaram a OpenAI.
- Aplicação: formatação, lint, tipos, cobertura exigida e build passaram, com 156 testes em 35 arquivos. Os checks remotos do GitHub e o deployment devem ser confirmados antes de considerar o site publicado.
- Advisor: os avisos existentes não mudaram. A nova tabela privada acrescenta o informativo de RLS sem políticas, intencional para bloquear acesso direto. Não se deve criar uma política pública para remover esse informativo.

## Limites preparados

| Regra                          |                         Valor | Onde se aplica                                           |
| ------------------------------ | ----------------------------: | -------------------------------------------------------- |
| Fotografia por análise         |                             1 | Front e função                                           |
| Tamanho da fotografia          |                          5 MB | Front e função                                           |
| Análise simultânea por empresa |                             1 | Banco, com bloqueio transacional                         |
| Análises iniciadas por empresa |    50 por dia civil de Lisboa | Banco                                                    |
| Orçamento estimado por empresa | US$ 1 por mês civil de Lisboa | Banco; reserva US$ 0,04 antes de cada chamada            |
| Entrada da IA                  |              até 8.000 tokens | Contagem real da imagem antes de chamar o modelo         |
| Saída da IA                    |              até 6.000 tokens | `max_output_tokens` da chamada                           |
| Produtos                       |     todos os legíveis na foto | Sem limite de 5; o formulário atual aceita até 100 itens |

O orçamento no banco é uma proteção da aplicação, não um limite de faturação da OpenAI. A reserva de US$ 0,04 cobre os tetos de tokens configurados para `gpt-5.4-mini` aos preços consultados em 08/10/2026. Confirmar preços antes da ativação. Uma falha sem informação de consumo mantém a reserva por prudência. Configurar também um limite de gastos no projeto da OpenAI. O limite de 50 por dia não significa que 50 por dia caberão no orçamento de US$ 1 mensal; o primeiro limite atingido bloqueia novas leituras.

Exemplo ilustrativo: 3.000 tokens de entrada e 700 de saída custariam cerca de US$ 0,0054 com preço de US$ 0,75/M na entrada e US$ 4,50/M na saída, antes de variações de preço ou processamento. Uma foto com letra difícil pode gastar mais tokens, pedir revisão manual ou falhar. A percentagem mostrada no front é estimativa de espera; 100% só aparece após uma resposta concluída.

## Configuração e teste em homologação

1. Conferir a migration já aplicada, os privilégios das duas RPCs `web_begin_order_scan` e `web_finish_order_scan` e a tabela privada. Não executar novamente o SQL nem aplicá-lo na produção por engano.
2. Conferir o orçamento e o modelo permitido no projeto OpenAI de homologação. A chave já está no secret `OPENAI_API_KEY`, nunca numa variável `VITE_`.
3. A leitura real foi autorizada e `ORDER_SCAN_LIVE_ENABLED=true` está salvo em homologação. Para suspender novas leituras, mudar esse valor para `false`. `ORDER_SCAN_ALLOWED_ORIGINS` permite `http://localhost:5174` e `https://homologacao-order-manager-rs.vercel.app`. A função utiliza também as chaves de Supabase disponibilizadas pelo ambiente.
4. Conferir a função `interpret-order` já publicada. Manter `verify_jwt=false` no gateway porque o handler valida o JWT do utilizador em `/auth/v1/user` antes de reservar orçamento e chamar a OpenAI.
5. No site de homologação, ativar `VITE_ORDER_SCAN_ENABLED=true` e retirar `VITE_ORDER_SCAN_DEMO=true`. A fotografia passa pelo `supabase.functions.invoke('interpret-order')`; o browser nunca recebe a chave privada.
6. Testar com fotos **não sensíveis**: legível, letra difícil, vários produtos, foto inválida, utilizador sem empresa ativa, duas análises simultâneas, limite diário e orçamento mensal. Verificar consumo real no painel OpenAI e na tabela privada. Conferir os dados no formulário e salvar apenas numa empresa de teste.
7. Ajustar prompt, qualidade e tetos após as medições. Só considerar produção depois de validar isolamento por empresa, custo, erros, impressão e revisão humana com encomendas reais autorizadas.

## Referências oficiais consultadas

- [OpenAI: imagens e visão](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI: contagem de tokens de entrada](https://developers.openai.com/api/docs/guides/token-counting)
- [OpenAI: saídas estruturadas](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [OpenAI: modelo GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [Supabase: autenticação de Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Supabase: secrets de Edge Functions](https://supabase.com/docs/guides/functions/secrets)
