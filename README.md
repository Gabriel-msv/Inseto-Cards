# Inseto Cards — v3.2.24

Pacote completo corrigido da interface de batalha desktop.

## Correção principal
A versão anterior não era executável como pacote independente porque o `index.html` referenciava arquivos que não estavam presentes no ZIP, especialmente `css/style.css` e os arquivos em `js/`. Também havia uma referência a `js/editor.js`, arquivo que não existia no pacote.

## 3.2.24
- Corrigida a sobreposição entre o BANCO e o FRONTE causada pelo espaçamento negativo.
- Aumentadas as dimensões dos slots e das cartas do campo no desktop para aproveitar melhor toda a área central.
- Espaçamento entre as linhas do campo ficou responsivo ao tamanho da tela.
- Layout mobile preservado.

## 3.2.23
- Incluído `css/style.css`.
- Incluídos `js/game.js`, `js/multiplayer.js` e `js/battle-fx.js`.
- Removida a referência quebrada a `js/editor.js`.
- Cache busting e versão alinhados para `3.2.23`.
- Ajuste anterior substituído por uma geometria responsiva sem sobreposição entre BANCO e FRONTE.
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
