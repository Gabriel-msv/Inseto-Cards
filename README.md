# Inseto Cards - Battle Edition

Jogo de cartas em HTML, CSS e JavaScript, jogável contra um BOT.

**Versão atual:** `1.8.2`

## Estrutura

- `index.html` - estrutura da interface, campo, ações, mão e pop-ups.
- `css/style.css` - layout, proporções das cartas, visual básico e áreas de rolagem.
- `js/game.js` - regras da partida, BOT, combate, efeitos, drag and drop e renderização.
- `assets/cards/` - artes das cartas usadas pelo mapa `CARD_IMAGES`.

## Regras principais

- Cada rodada possui dois turnos: um do jogador e um do BOT.
- Cada turno começa com uma ação padrão e um movimento.
- Invocar, mover entre Banco e Fronte e puxar uma carta de volta consomem movimento.
- Atacar, colher folhas e comprar cartas consomem ação padrão.
- O botão `2º MOVIMENTO` troca a ação padrão por mais um movimento.
- Após a primeira rodada, se o adversário não tiver cartas no campo, é possível fazer um ataque direto. Ele descarta uma carta aleatória da mão, sem combate.

## Cartas e efeitos

- Equipáveis, como Mel, Casulo e Veneno, são arrastados sobre um inseto próprio e permanecem anexados até a derrota dele.
- Efeitos persistentes, como Adubo e Formigueiro, ocupam um espaço no Banco enquanto estão ativos.
- Própolis ocupa o Fronte por três rodadas e protege as cartas do Banco.
- Cartas com duração exibem um contador de turnos e são descartadas ao expirar.
- Efeitos ativos não podem ser puxados de volta para a mão.
- A última carta derrotada aparece no topo do Cemitério.

## Interações

- Cartas da mão podem ser arrastadas para Banco ou Fronte.
- Cartas do campo podem ser arrastadas de volta para a mão quando permitido.
- Cartas podem ser arrastadas sobre alvos inimigos para atacar.
- Equipáveis podem ser arrastados diretamente sobre o inseto escolhido.
- As ações principais do BOT aparecem em um pop-up que fecha com clique ou tecla.

## Versionamento

A versão fica em `APP_VERSION`, em `js/game.js`, e segue o formato `X.Y.Z`:

- `X` - reformas grandes ou mudanças estruturais.
- `Y` - novas funções e mecânicas.
- `Z` - correções de bugs.

O valor exibido no topo da página é sincronizado com essa constante.

## Artes

Os arquivos de imagem devem usar os nomes definidos em `CARD_IMAGES`, dentro de `js/game.js`. Quando uma arte não existe, a carta usa o emoji configurado na definição da carta.
