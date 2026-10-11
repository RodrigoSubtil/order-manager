# Style guide do Order Manager

Referência para manter a interface consistente no login, painel, encomendas, formulários, digitalização, gestão e diálogos. Cada capítulo define uma parte do sistema e informa o estado da sua aplicação.

## Capítulos

| Capítulo                                            | Define                                                                                 | Estado em 11/10/2026                                              |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Tipografia](typography.md)                         | Família, tamanhos, pesos, entrelinhas e hierarquia                                     | Aplicado no código local; publicação não verificada por este guia |
| [Espaçamentos e controles](spacing-and-controls.md) | Escala de espaços, dimensões de botões e campos, raios, ícones e composição responsiva | Aplicado no código local; publicação não verificada por este guia |

Os dois capítulos estão aplicados no código local. A validação visual usa componentes reais com dados sintéticos e acessos externos bloqueados; não equivale a teste em aparelhos físicos nem a publicação. As exceções de dimensão ficam documentadas em cada capítulo.

## Como usar

1. Escolha o papel do texto no capítulo de tipografia.
2. Escolha os espaços e as dimensões pelo contexto no capítulo de controles.
3. Reutilize os componentes compartilhados e as variáveis existentes antes de criar novas regras.
4. Confira a composição em larguras de 320, 390, 768 e 1280 px, incluindo textos longos e estados de foco, erro e carregamento.
5. Ao alterar um padrão, atualize o capítulo e o componente compartilhado na mesma mudança. Aplique a mudança geral somente dentro do escopo autorizado.

## Limites deste guia

- A paleta e as sombras atuais continuam como referência; ainda não há um capítulo completo sobre cores.
- As medidas pertencem à interface. A ficha térmica de 80 mm tem regras próprias de impressão.
- Documentação, implementação local e publicação são estados diferentes. A versão do produto continua definida em `apps/web/package.json`.

## Fontes no código

- [Variáveis visuais](../../apps/web/src/styles/tokens.css): espaços, raios e dimensões existentes.
- [Tipografia](../../apps/web/src/styles/typography.css): escala e papéis de texto.
- [Componentes compartilhados](../../apps/web/src/shared/components/ui): botões, campos, ícones e diálogos.
- [Desenvolvimento e manutenção](../development/workflow.md): aplicação e validação de alterações.
