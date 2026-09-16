# Inseto Cards - Battle Edition

Jogo de cartas em HTML, CSS e JavaScript, jogável contra um BOT ou outro jogador pela rede.

**Versão atual:** `3.2.21`

## 3.2.21 — Restauração estrutural do campo de batalha desktop

- Restaurada a estrutura original do desktop em três colunas: sidebar esquerda, campo central e sidebar direita.
- O status da partida voltou para a sidebar esquerda.
- O painel de ações voltou para a sidebar direita, acima do inspetor e da mão.
- Removido o `center-controls` do layout principal, que estava criando uma quarta área no CSS Grid e empurrando o tabuleiro para uma linha implícita.
- Criado `css/layout-hotfix.css` para reforçar a geometria normal do desktop sem alterar o layout mobile.
- Modo Editor continua isolado por `body.editor-mode`.
- Mecânicas, BOT, multiplayer e catálogo de cartas não foram alterados.
- Cache busting atualizado para `3.2.21`.

## Estrutura

- `index.html` — interface e composição do campo/sidebar.
- `css/style.css` — tema e componentes visuais existentes.
- `css/layout-hotfix.css` — correção estrutural específica do desktop.
- `js/game.js` — regras, BOT, combate, efeitos e renderização.
- `js/multiplayer.js` — salas e sincronização multiplayer.
- `js/battle-fx.js` — efeitos visuais.
- `js/editor.js` — modo Editor local.
- `assets/cards/` — artes das cartas.
- `assets/ui/ficha-folha.png` — ficha visual de folha.
