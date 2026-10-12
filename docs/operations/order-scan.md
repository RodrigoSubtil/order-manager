# Digitalização de encomendas

O botão da câmara usa o mesmo fundo/borda de imprimir. Até 560 px, a barra mostra **Digitalizar / Adicionar**, sem impressão geral; de 561 a 1024 px, mostra a câmara em linha própria, **Imprimir / Adicionar** abaixo e filtros de igual largura; acima de 1024 px, oculta a câmara e mantém **Área / Data / Imprimir / Adicionar** na mesma linha. Os limites representam a largura disponível, não a identificação do aparelho. A impressão individual de cada cartão também fica oculta até 560 px e disponível acima desse limite.

A câmara abre um modal pequeno para **Abrir câmara** ou **Escolher foto**. Uma fotografia por análise. A prévia mostra a imagem, **Refazer** e um rodapé com **Cancelar / Continuar**. Durante a leitura, aparece o progresso estimado e Cancelar continua disponível. Ao terminar, o formulário de conferência abre diretamente, sem modal de leitura concluída. Cancelar fecha o fluxo, libera a câmara e descarta resultados que cheguem depois do fechamento. A revisão usa o formulário de Nova encomenda já existente. **Provável** aparece em laranja e **Conferir** em vermelho. Uma alteração manual marca somente o campo editado como **Conferido**, em verde com um visto. Quantidade e unidade são revistas separadamente. Só o botão **Salvar** do formulário grava a encomenda.

## Estado atual

- A prévia da câmara usa formato horizontal 4:3 e recorte central na captura, correspondente à área visível, mesmo quando o aparelho entrega vídeo vertical. Fotografias escolhidas do aparelho mantêm o formato original. A validação da câmara usa serviços simulados; o aparelho físico deve ser conferido pelo utilizador.
- O front e o contrato de dados estão implementados. O caminho de simulação local foi retirado em 10/10/2026: dev e homologação chamam a mesma função, com as mesmas proteções. A variável antiga `VITE_ORDER_SCAN_DEMO` não tem efeito.
- A função `supabase/functions/interpret-order/index.ts` está preparada para autenticar, validar uma foto, reservar o orçamento, contar tokens da imagem, consultar a OpenAI e devolver o rascunho extraído com a sugestão de área. Falha fechada se a chave, a permissão de ativação ou as credenciais do Supabase faltarem.
- A migration `20261008190245_order_scan_limits.sql` foi aplicada **somente em homologação**, no projeto `order-manager-homologacao` (`czbrnxrpofdbbgbdyrad`), em 08/10/2026. O histórico remoto foi alinhado com a versão canónica do arquivo após o conector gerar o seu timestamp de aplicação.
- **A leitura real foi ativada em homologação em 08/10/2026, às 21:41 UTC**: `ORDER_SCAN_LIVE_ENABLED=true`. Os secrets `OPENAI_API_KEY` e `ORDER_SCAN_ALLOWED_ORIGINS` estão salvos. A versão 3 da função incluiu diagnóstico seguro de falhas; o utilizador substituiu a chave e concluiu uma leitura real às 22:02 UTC.
- A [PR #4](https://github.com/RodrigoSubtil/order-manager/pull/4) publica a versão 1.1.0 somente em `homologacao`. `VITE_ORDER_SCAN_ENABLED=true` está configurado no ambiente Preview dessa branch; a produção continua fora desta publicação.
- Não existe chave da OpenAI no código, no browser ou neste documento. Leituras reais são pagas e dependem da ação do utilizador; os testes automáticos usam serviços simulados.

### Primeiro teste real e diagnóstico · 08/10/2026

O site foi publicado pela [PR #4](https://github.com/RodrigoSubtil/order-manager/pull/4), commit de merge `c5fd07e`, deployment Preview `2mDYHKKWx7Kp47HYBN96hpGHbdvX` Ready. O domínio de homologação mostrou `v1.1.0`, sessão Pastelaria Teste e o modal de fotografia. Produção permaneceu no commit `a9c70d0`.

As primeiras tentativas do utilizador falharam quase imediatamente, sem tokens retornados. A função foi atualizada para registrar somente etapa, status HTTP, código/param do erro e ID de requisição do fornecedor; nunca chave, fotografia, texto da encomenda nem mensagem bruta do fornecedor. A versão 3 publicada em homologação registrou `count_tokens`, HTTP 401 e código `token_invalidated` numa tentativa controlada com uma imagem vazia de teste. O bloqueio era a credencial OpenAI invalidada, antes da geração da transcrição. O utilizador substituiu `OPENAI_API_KEY` diretamente nos secrets de homologação.

Falhas antes do envio da geração passam a registrar custo zero na reserva interna. Quando a geração já foi enviada e o consumo é desconhecido, a reserva continua mantida. Quatro testes simulados da função passaram, incluindo rejeição da contagem sem geração e sem registrar dados sensíveis. Após a troca da chave, a leitura iniciada pelo utilizador às 22:02:09 UTC terminou às 22:02:13 UTC, com 3.340 tokens de entrada, 118 de saída e custo estimado de US$ 0,003036. O rascunho foi aberto para revisão sem gravação automática. Isso comprova a chamada real, não a exatidão de todos os campos manuscritos.

### Revisão da interface · 10/10/2026

As alterações desta revisão são destinadas à PR para **`homologacao`**, com Preview automático autorizado e merge reservado ao utilizador. A produção exige autorização posterior. A alteração do prompt só entra em vigor após uma publicação separada da Edge Function, que não faz parte desta rodada.

O prompt passa a usar `conferir` por padrão, reservando `provavel` para valores explícitos e inequívocos. Campos deduzidos/ambíguos pedem conferência. A resposta da IA continua aceitando só esses dois estados. `conferido` é exclusivamente visual, após edição humana; não é enviado pela IA nem gravado no banco. A associação dos indicadores de produtos usa o ID estável, preservando os estados ao remover outra linha. A confirmação fica ativa mesmo se a pessoa voltar ao valor original e é limpa numa nova revisão.

Não há percentagem numérica de certeza calibrada nem garantia de reconhecimento perfeito. Estes ajustes não acrescentam novas chamadas, repetições automáticas, modelo alternativo ou aumento dos tetos. Os testes desta alteração são locais e simulados; não executar leituras nem CRUD de teste em homologação sem nova autorização do utilizador.

A revisão responsiva local cobriu larguras de 320 a 1280 px no painel: sem rolagem lateral, sem corte dos botões do cartão e com a visibilidade da barra correspondente a cada faixa. Em 320 px, foram inspecionados também o formulário de nova encomenda, os campos de produtos, a escolha de fotografia e a tela de acesso gerencial, sem salvar dados, abrir a câmara ou chamar IA. A gestão após autenticação não foi acessada. No telemóvel, o cartão oculta Imprimir e mantém os quatro ícones restantes numa única linha, com botões de 44 px e mais espaço inferior; o cliente usa a largura inteira abaixo do responsável/número do pedido. Formatação, lint, tipos, 165 testes em 38 arquivos e quatro testes simulados do backend e build passaram localmente. A inspeção no navegador não substitui a verificação no aparelho físico.

### Verificação em 08/10/2026

- PostgreSQL 17.11 local descartável: migrations, bloqueio da segunda análise da mesma empresa, limite diário de 50, orçamento mensal com reserva e independência entre empresas passaram. As fixtures foram revertidas e a base local foi encerrada.
- Função com serviços simulados: três testes passaram, incluindo falha antes dos serviços sem chave e bloqueio de imagem acima do teto de tokens.
- Banco de homologação: RLS ativo na tabela privada; `anon` e `authenticated` sem acesso à tabela e sem execução das duas RPCs; `service_role` com execução das RPCs. Nenhuma tentativa de leitura foi registrada.
- Função publicada: POST de localhost e homologação retornaram 503 com a mensagem de IA desligada; preflight local retornou 204; origem não autorizada retornou 403; GET retornou 405. Nenhuma foto ou token de sessão foi enviado nesses testes.
- Após a ativação, cinco verificações HTTP passaram: POST sem sessão de localhost e homologação retornou 401; preflight permitido 204; origem não autorizada 403; GET 405. A ativação não removeu a autenticação e estes testes não chamaram a OpenAI.
- Aplicação: formatação, lint, tipos, cobertura exigida e build passaram, com 156 testes em 35 arquivos. Os checks remotos do GitHub e o deployment devem ser confirmados antes de considerar o site publicado.
- Advisor: os avisos existentes não mudaram. A nova tabela privada acrescenta o informativo de RLS sem políticas, intencional para bloquear acesso direto. Não se deve criar uma política pública para remover esse informativo.

## Associação da área ao produto · 11/10/2026

Na revisão de uma fotografia, o catálogo já carregado da empresa tem prioridade: nomes iguais, ignorando maiúsculas, acentos e espaços repetidos, recebem a área cadastrada. Não há busca por aproximação nem por parte do nome. Se o nome estiver em mais de uma área, a área fica vazia para escolha humana. O produto transcrito, a quantidade, a unidade e o ID da linha são preservados; não se cadastram produtos automaticamente.

Para produtos ainda ausentes do catálogo, o prompt permite sugerir Pastelaria, Padaria, Salgados ou Almoço a partir do produto, mesmo sem a área escrita na fotografia. Sem base suficiente, devolve área vazia. O contrato limita as categorias e o backend rejeita valores fora dele; isso não garante a correção da classificação. A área começa sempre como **Conferir**, independentemente da legibilidade dos demais campos. Selecionar a própria área sugerida marca **Conferido** sem apagar o produto; trocar para outra área mantém a limpeza já existente do campo Produto.

Publicação e testes autorizados **somente em homologação** nesta rodada. A função `interpret-order` versão 5 foi publicada e está ACTIVE no projeto `czbrnxrpofdbbgbdyrad`; a prioridade do catálogo acompanha o frontend atualizado. Dev continua chamando a função remota configurada. Modelo, autenticação, orçamento e tetos permanecem iguais, sem segunda geração ou novas consultas ao banco. A validação automática usa respostas simuladas e não comprova a qualidade da IA em fotografias reais. A produção está excluída desta autorização.

Verificação local desta alteração: formatação, lint, tipos, 173 testes em 39 arquivos, cobertura exigida e build passaram. Cinco testes simulados da função passaram, incluindo a rejeição de categoria fora do contrato com registo do consumo. Nenhuma leitura real de IA ou gravação de teste em homologação foi executada.

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
5. No site de homologação e no `.env.development.local` de dev, usar `VITE_ORDER_SCAN_ENABLED=true`. O modo dev serve a porta 5174 para coincidir com a origem autorizada. A fotografia passa pelo `supabase.functions.invoke('interpret-order')`; o browser nunca recebe a chave privada. Não existe fallback para um rascunho de demonstração.
6. O utilizador realiza os testes de leitura real com fotos **não sensíveis**: legível, letra difícil e vários produtos. Limites, falhas, concorrência e isolamento são verificados em testes simulados/PostgreSQL descartável. Conferir consumo no painel OpenAI/tabela privada e salvar apenas na empresa de teste, por ação do utilizador.
7. Ajustar prompt, qualidade e tetos após as medições. Só considerar produção depois de validar isolamento por empresa, custo, erros, impressão e revisão humana com encomendas reais autorizadas.

## Referências oficiais consultadas

- [OpenAI: imagens e visão](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI: contagem de tokens de entrada](https://developers.openai.com/api/docs/guides/token-counting)
- [OpenAI: saídas estruturadas](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [OpenAI: modelo GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [Supabase: autenticação de Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Supabase: secrets de Edge Functions](https://supabase.com/docs/guides/functions/secrets)
