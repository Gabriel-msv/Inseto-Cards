# Inseto Cards - Battle Edition

Jogo de cartas em HTML, CSS e JavaScript, jogável contra um BOT ou outro jogador pela rede.

**Versão atual:** `3.2.2`

## 3.2.2 — Correções de layout

- Corrigida a distribuição do campo central para evitar esticamento vertical excessivo.
- Reorganizados slots, zona central, status e ações para preservar a área útil do tabuleiro.
- Corrigida a ocupação da coluna direita pela mão do jogador.
- Ajustadas proporções do menu esquerdo, diário e controles inferiores.
- Atualizada a identificação visual da versão para `3.2.2`.
- Sem alteração nas regras, combate, BOT ou multiplayer.

## 3.1.1 — Menu principal corrigido

- Corrigido o menu duplicado: `multiplayer.js` não recria mais a interface que já está definida no `index.html`.
- Corrigidos IDs e eventos do menu Solo, Criar Sala, Entrar em Sala e sala em espera.
- Corrigida a navegação por abas e os atalhos `Enter` dos campos de criação/entrada.
- Corrigido o código da sala para aceitar somente 4 caracteres alfanuméricos em maiúsculas.
- Corrigido o texto `DUELO BOTÂNICO`.
- Mantida a estrutura mobile da 3.1.0; esta versão é uma correção de fluxo/menu.

## 3.1.1 — Forest Glass UX

- Novo menu principal com BOT, criação de sala e entrada em sala no mesmo fluxo.
- Interface redesenhada com verde-musgo, verde-caçador e marrom-terra; dourado usado apenas em contornos/detalhes.
- Glassmorphism aplicado aos painéis e controles, mantendo a leitura das informações.
- Novo sistema visual de fichas de folha usando `assets/ui/ficha-folha.png`, com fileira horizontal e feedback de ganho/gasto.
- Limite de 15 folhas por jogador.
- Limite de 6 cartas na mão; compras, retornos e efeitos que geram cartas respeitam o limite.
- Cartas no campo continuam podendo existir além do limite da mão, mas não podem retornar se a mão estiver cheia.
- Arrastar um inseto sobre outro inseto aliado troca as posições e consome 1 movimento.
- Sistema de seleção unificado para cartas da mão, Fronte e Banco.
- Clique seleciona; hover não abre mais informação.
- Área neutra ou `Esc` cancela seleção.
- VENDER funciona diretamente para carta selecionada na mão ou no campo.
- Novo inspetor de carta mostra arte, ATK, HP, custo, tipo, condição, habilidade e equipamentos.
- ATK/HP receberam contorno e fundo para melhorar a leitura sobre a arte.
- Cartas com equipamento recebem detalhes dourados discretos.
- Mobile mantém a estrutura de interação existente; o redesign de ações é focado no desktop.
- Correções de fluxo multiplayer preservadas da série 2.1.x: BOT não joga em partidas online, socket reconecta de forma segura e ações do guest são enviadas ao host.

## Estrutura

- `index.html` — interface, menu principal, campo, ações, mão, inspetor e pop-ups.
- `css/style.css` — tema visual, glassmorphism, layout, cartas, fichas e responsividade.
- `js/game.js` — regras, BOT, combate, efeitos, seleção, drag & drop e renderização.
- `js/multiplayer.js` — salas multiplayer, sincronização host/guest, timer e fluxo de sessão.
- `js/battle-fx.js` — efeitos visuais adicionais.
- `assets/ui/ficha-folha.png` — ficha visual de folha.
- `assets/cards/` — artes das cartas referenciadas por `CARD_IMAGES`.

## Regras de interação 3.1

- A mão possui no máximo 6 cartas.
- Folhas possuem no máximo 15 unidades.
- Invocação e movimentação usam movimentos; ações padrão continuam separadas.
- Arrastar um inseto sobre outro aliado troca as posições.
- Clique em uma carta da mão seleciona e libera `VENDER`; cartas de efeito podem ser usadas pelo botão no inspetor ou por arraste.
- Clique em uma carta do campo seleciona para `ATACAR`, `PUXAR DE VOLTA` ou `VENDER`, conforme a ação disponível.
- Informações completas são exibidas por seleção, não por hover.

## Multiplayer

- `CRIAR SALA` gera um código de quatro letras.
- `ENTRAR EM SALA` usa código e senha opcional.
- O host inicia a partida quando o segundo jogador entra.
- O host mantém o estado autoritativo; o guest envia ações.
- Em partidas online, o player 1 é humano e não executa `botTurn()`.
- O Vaga-lume mantém a revelação de duas cartas como informação temporária para o jogador correto.

## Versionamento

A versão segue `X.Y.Z`: `X` para reformas grandes/estruturais, `Y` para novas funções/mecânicas e `Z` para correções de bugs. O valor exibido no badge do jogo acompanha `APP_VERSION`.


### 3.2.2
- Corrigido o bloqueio de renderização causado pela remoção dos IDs de compatibilidade usados pelo motor.
- Corrigido o selo de versão para 3.2.2.
- Mantido o tabuleiro e a mão sem novas mudanças de estrutura.
- Reduzida apenas a altura da faixa inferior de status e ações.
