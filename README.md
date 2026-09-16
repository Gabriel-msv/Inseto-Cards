# Inseto Cards — v2.1.3

Correção focada em multiplayer + menu principal + habilidade do Vaga-lume.

## O que foi corrigido

- **Multiplayer:** o player 1 não é mais tratado como BOT. O motor só executa `botTurn()` quando o jogador realmente tem `bot: true`.
- **Turno do Guest:** o host não executa a IA durante o turno do segundo jogador.
- **Vaga-lume:** ao ser invocado, escolhe até 2 cartas aleatórias da mão adversária e abre um pop-up com as artes reais das cartas.
- **Vaga-lume no multiplayer:** a revelação acompanha o estado autoritativo e aparece somente para o jogador que invocou o Vaga-lume.
- **Efeitos por alvo no multiplayer:** clique e arraste de Inseticida, Lupa e Teia enviam corretamente o alvo ao host.
- **Menu principal:** o menu dourado/retro-botânico virou a tela inicial principal. Ele concentra:
  - Jogar contra BOT
  - Criar sala
  - Entrar em sala
  - Código da sala
  - Senha opcional
  - Espera pelo adversário
  - Botão de iniciar partida para o host
  - Regras
- **Conexão:** WebSocket não é reutilizado quando já está fechado e estados antigos do host não sobrescrevem estados mais novos.

## Arquivos

Substitua os arquivos correspondentes no seu projeto:

- `index.html`
- `css/style.css`
- `js/game.js`
- `js/multiplayer.js`
- `js/battle-fx.js`
- `server/*` se estiver usando o relay incluído

As imagens de `assets/cards/` continuam sendo as do seu projeto; o Vaga-lume usa `assets/cards/vaga.jpg` e o restante do mapa `CARD_IMAGES` existente.

## Multiplayer

O cliente continua apontando para:

`wss://server-dh1h.onrender.com`

O relay incluído em `server/` usa Node.js + `ws` e deve ser publicado em um serviço compatível com WebSocket. Se o seu servidor já está funcionando nesse endereço, não é necessário trocar a URL.
