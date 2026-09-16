# Inseto Cards — v3.2.23

Pacote completo corrigido da interface de batalha desktop.

## Correção principal
A versão anterior não era executável como pacote independente porque o `index.html` referenciava arquivos que não estavam presentes no ZIP, especialmente `css/style.css` e os arquivos em `js/`. Também havia uma referência a `js/editor.js`, arquivo que não existia no pacote.

## 3.2.23
- Incluído `css/style.css`.
- Incluídos `js/game.js`, `js/multiplayer.js` e `js/battle-fx.js`.
- Removida a referência quebrada a `js/editor.js`.
- Cache busting e versão alinhados para `3.2.26`.
- Aproximado o BANCO do FRONTE do jogador em 34px no desktop.
- Layout mobile não recebe esse ajuste de espaçamento.
- Assets de cartas e ficha de folha incluídos.

## Estrutura
- `index.html`
- `css/style.css`
- `css/layout-hotfix.css`
- `js/game.js`
- `js/multiplayer.js`
- `js/battle-fx.js`
- `assets/cards/`
- `assets/ui/`


## 3.2.26 — restauração do painel inferior
- Status e ações voltaram para a faixa inferior do campo no desktop.
- Natureza e Cemitério passaram a usar dimensões responsivas.
- Banco inferior permanece separado do Fronte.
- JavaScript e layout mobile não foram alterados.
