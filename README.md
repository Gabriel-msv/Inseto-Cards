# Inseto Cards — Battle Edition

Mesclagem de dois projetos:
- Estrutura, IDs e lógica do jogo (regras, BOT, drag & drop, renderização): mantidos de `inseto_cards_separado_-_Copia`, arquivo `js/game.js` inalterado.
- Visual (paleta verde/lima neon, glass panels, tipografia Orbitron/Space Grotesk, cartas com glow): reestilizado em `css/style.css` no padrão do `inseto_cards_battle_ui_v2`.

## Estrutura
- `index.html` — marcação com os mesmos IDs/classes que `js/game.js` espera.
- `css/style.css` — novo, com a pele visual do Battle UI V2 aplicada aos seletores do jogo.
- `js/game.js` — motor do jogo, sem alterações.
- `assets/cards/` — pasta reservada para artes de carta (`CARD_IMAGES`); se ausentes, as cartas usam o emoji/silhueta como no projeto original.

## Observação
O projeto original referenciava `assets/cards/isotiporesenha.png` (favicon/logo). Como as imagens não vieram no pacote enviado, o logo foi trocado por um ícone desenhado em CSS/emoji para não quebrar o layout. Basta soltar os arquivos de imagem em `assets/cards/` (mesmos nomes usados em `CARD_IMAGES` no `game.js`) para ativar as artes das cartas.
