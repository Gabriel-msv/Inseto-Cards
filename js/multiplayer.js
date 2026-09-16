/* ==========================================================================
   INSETO CARDS — MULTIPLAYER (add-on, não altera js/game.js)
   ==========================================================================
   Como funciona:
   - HOST roda o jogo normalmente (é o "state.players[0]" de sempre).
     A diferença é que, no turno do "player 1", em vez do BOT jogar
     sozinho, as ações chegam pela rede (mensagens {kind:...}) e são
     aplicadas nas MESMAS funções que o jogo já usa (attack(1,...),
     summonFromHand(1,...), harvest(1), drawCost(1), endTurn(1)...).
     Depois de cada render(), o HOST transmite o `state` inteiro pro GUEST.

   - GUEST não roda a lógica real. As funções que mutam o estado
     (attack, summonFromHand, moveCard, returnToHand, equip,
     activateEffect, drawCost, harvest, sellSelected, secondMove,
     endTurn) são substituídas: quando chamadas com o índice do
     jogador local (0), elas só mandam a ação pro host, sem mexer em
     nada. A tela do guest só é repintada quando o `state`
     autoritativo chega do host (com os índices 0/1 trocados, pra ele
     ver as próprias cartas do seu lado).

   - Uma TELA DE SESSÃO cobre o jogo até o jogador criar ou entrar
     numa sala (com código de 4 letras + senha opcional), ou escolher
     jogar sozinho contra o BOT (fluxo original, sem rede).

   Ajuste SERVER_URL abaixo para o endereço do seu relay (server/server.js).
   ========================================================================== */
'use strict';

const SERVER_URL = 'wss://server-dh1h.onrender.com';
const MP = {
  ws: null,
  active: false,
  role: null,      // 'host' | 'guest'
  room: null,
  password: '',
  localName: 'Jogador',
  peerName: 'Jogador 2',
  connected: false,
  peerReady: false,
  turnTimer: null,
  turnTicker: null,
  turnDeadline: 0,
  turnKey: null,
  startGame: null,
  revengeOffered: false,
  revengeAccepted: false,
  revengeTimer: null,
  seq: 0,
  lastHostSeq: 0,
  vagaRevealShown: null,
  connecting: false,
};

// ======================================================================
// TELA DE SESSÃO
// ======================================================================
function buildGate() {
  const menu = document.getElementById('startMenu');
  if (!menu) return;
  const card = menu.querySelector('.start-menu-card');
  if (!card) return;

  card.innerHTML = `
    <div class="start-kicker">INSETO CARDS · BATTLE CORE</div>
    <div class="start-logo"><span class="logo-mark"></span><div><strong>INSETO<br>CARDS</strong><small>DUEL0 BOTÂNICO</small></div></div>
    <div class="menu-arena-title"><span>ARENA</span><strong>DUEL0 BOTÂNICO</strong></div>
    <p class="start-copy">Entre na arena. Jogue sozinho contra o BOT ou desafie outro comandante pela rede.</p>

    <label class="start-label" for="mpPlayerName">NOME DO COMANDANTE</label>
    <input id="mpPlayerName" class="field-input start-input" maxlength="18" value="Jogador" autocomplete="off">

    <div class="menu-mode-grid" role="tablist" aria-label="Modo de partida">
      <button id="mpSoloBtn" class="menu-mode is-active" type="button"><span class="mode-kicker">SOLO</span><strong>JOGAR CONTRA BOT</strong><small>Partida local · sem rede</small></button>
      <button id="mpCreateTab" class="menu-mode" type="button"><span class="mode-kicker">ONLINE</span><strong>CRIAR SALA</strong><small>Convide outro jogador</small></button>
      <button id="mpJoinTab" class="menu-mode" type="button"><span class="mode-kicker">ONLINE</span><strong>ENTRAR EM SALA</strong><small>Use um código de 4 caracteres</small></button>
    </div>

    <section id="mpPanelSolo" class="menu-panel is-active">
      <div class="menu-panel-title">DUELO CONTRA O BOT</div>
      <div class="menu-preview"><span>VOCÊ</span><b>VS</b><span>BOT</span></div>
      <button id="mpSoloLaunch" class="btn btn-primary start-cta" type="button">ENTRAR NA ARENA</button>
    </section>

    <section id="mpPanelCreate" class="menu-panel">
      <div class="menu-panel-title">CRIAR SALA ONLINE</div>
      <div class="menu-panel-copy">Crie uma sala e compartilhe o código com o outro jogador.</div>
      <label class="start-label" for="mpCreatePass">SENHA <span class="optional">(OPCIONAL)</span></label>
      <input id="mpCreatePass" class="field-input" type="password" maxlength="24" placeholder="Deixe em branco para não usar senha">
      <button id="mpCreateBtn" class="btn btn-primary start-cta" type="button">CRIAR SALA</button>
    </section>

    <section id="mpPanelJoin" class="menu-panel">
      <div class="menu-panel-title">ENTRAR EM SALA</div>
      <div class="menu-panel-copy">Digite o código recebido do outro jogador.</div>
      <label class="start-label" for="mpGateCode">CÓDIGO DA SALA</label>
      <input id="mpGateCode" class="field-input menu-code" maxlength="4" placeholder="ABCD" autocomplete="off">
      <label class="start-label" for="mpJoinPass">SENHA <span class="optional">(SE HOUVER)</span></label>
      <input id="mpJoinPass" class="field-input" type="password" maxlength="24" placeholder="Senha da sala">
      <button id="mpJoinBtn" class="btn btn-primary start-cta" type="button">ENTRAR NA SALA</button>
    </section>

    <section id="mpPanelWait" class="menu-panel">
      <div class="menu-panel-title" id="mpWaitTitle">CONECTANDO...</div>
      <div id="mpWaitCode" class="mp-code-display" hidden></div>
      <div id="mpWaitText" class="menu-panel-copy"></div>
      <button id="mpStartBtn" class="btn btn-primary start-cta" type="button" hidden>INICIAR PARTIDA</button>
      <button id="mpBackBtn" class="btn btn-secondary start-cta menu-back" type="button">VOLTAR</button>
    </section>

    <div id="mpGateError" class="menu-error" role="alert"></div>
    <button id="mpRulesBtn" class="start-rules" type="button">REGRAS & MECÂNICAS</button>
  `;

  const activate = panel => {
    menu.querySelectorAll('.menu-mode').forEach(b => b.classList.remove('is-active'));
    menu.querySelectorAll('.menu-panel').forEach(p => p.classList.remove('is-active'));
    panel.button.classList.add('is-active');
    panel.el.classList.add('is-active');
    setError('');
  };

  const soloPanel = { button: $('mpSoloBtn'), el: $('mpPanelSolo') };
  const createPanel = { button: $('mpCreateTab'), el: $('mpPanelCreate') };
  const joinPanel = { button: $('mpJoinTab'), el: $('mpPanelJoin') };
  soloPanel.button.onclick = () => activate(soloPanel);
  createPanel.button.onclick = () => activate(createPanel);
  joinPanel.button.onclick = () => activate(joinPanel);

  $('mpPlayerName').value = getSavedName();
  $('mpPlayerName').addEventListener('input', () => {
    MP.localName = readLocalName(); saveLocalName(MP.localName); syncNameToGame(MP.localName);
  });

  $('mpSoloLaunch').onclick = () => {
    MP.active = false; MP.role = null; MP.peerReady = false;
    try { if (MP.ws) MP.ws.close(); } catch {}
    MP.ws = null; MP.connected = false; MP.connecting = false;
    const name = readLocalName(); MP.localName = name; saveLocalName(name); syncNameToGame(name);
    closeGate();
    if (typeof init === 'function') init();
  };
  $('mpCreateBtn').onclick = createRoom;
  $('mpJoinBtn').onclick = joinRoom;
  $('mpStartBtn').onclick = () => MP.startGame?.();
  $('mpBackBtn').onclick = () => {
    try { if (MP.ws) MP.ws.close(); } catch {}
    MP.ws = null; MP.connected = false; MP.connecting = false; MP.active = false; MP.role = null; MP.peerReady = false;
    activate(soloPanel);
  };
  $('mpRulesBtn').onclick = () => {
    menu.style.zIndex = '90';
    if (typeof rules === 'function') rules();
    $('modalClose')?.addEventListener('click', () => { menu.style.zIndex = '450'; }, { once: true });
  };
}

function readLocalName() {
  const value = document.getElementById('mpPlayerName')?.value.trim();
  return (value || 'Jogador').slice(0, 18);
}

function getSavedName() {
  try { return (localStorage.getItem('insetoPlayerName') || 'Jogador').replace(/["'<>]/g, '').slice(0, 18) || 'Jogador'; }
  catch { return 'Jogador'; }
}

function saveLocalName(name) {
  try { localStorage.setItem('insetoPlayerName', name); } catch { /* armazenamento indisponível */ }
}

function syncNameToGame(name) {
  const input = document.getElementById('name');
  if (input) input.value = name;
}

function setError(text) {
  const el = document.getElementById('mpGateError');
  if (el) el.textContent = text;
}

function showWaitPanel(title, text) {
  const menu = document.getElementById('startMenu');
  if (menu) {
    menu.querySelectorAll('.menu-mode').forEach(el => el.classList.remove('is-active'));
    menu.querySelectorAll('.menu-panel').forEach(el => el.classList.remove('is-active'));
    document.getElementById('mpPanelWait')?.classList.add('is-active');
  } else {
    document.querySelectorAll('.mp-tab, .mp-panel').forEach(el => el.classList.remove('active'));
    document.getElementById('mpPanelWait')?.classList.add('active');
  }
  document.getElementById('mpWaitTitle').textContent = title;
  document.getElementById('mpWaitText').textContent = text || '';
  const start = document.getElementById('mpStartBtn'); if (start) start.hidden = true;
  setError('');
}

function showRoomCode(code) {
  const disp = document.getElementById('mpWaitCode');
  if (!disp) return;
  disp.hidden = false;
  disp.style.display = 'block';
  disp.textContent = code;
}

function closeGate() {
  const menu = document.getElementById('startMenu');
  if (menu) menu.remove();
  const gate = document.getElementById('mpGate');
  if (gate) gate.remove();
  buildStatusBadge();
}

function buildStatusBadge() {
  if (!MP.active) return; // modo solo: sem badge
  const box = document.createElement('div');
  box.id = 'mpStatusBadge';
  box.style.cssText = 'position:fixed;top:30px;right:8px;z-index:200;background:#0d1c12;border:1px solid #294936;border-radius:8px;padding:8px 12px;color:#e5f1e5;font:11px Arial,sans-serif;max-width:min(360px,calc(100vw - 16px));';
  box.innerHTML = `<b style="color:#efc568;">SALA ${MP.room}</b> <span id="mpStatusText" style="color:#8da18f;margin-left:6px;"></span>`;
  document.body.appendChild(box);
  setBadge(MP.role === 'host' ? 'aguardando o outro jogador...' : 'conectado, aguardando o host iniciar...');
}

function setBadge(text) {
  const el = document.getElementById('mpStatusText');
  if (el) el.textContent = text;
}

function updateMultiplayerUI() {
  if (!MP.active || !state.players[0] || !state.players[1]) return;
  const localTurn = state.turn === 0;
  const actionPanel = document.querySelector('.right-sidebar .action-panel');
  const statusBadge = document.getElementById('mpStatusBadge');
  const timerElement = document.getElementById('mpTurnTimer');
  let fixedTimer = document.getElementById('mpFixedTimer');
  if (!fixedTimer) { fixedTimer = document.createElement('div'); fixedTimer.id = 'mpFixedTimer'; document.body.appendChild(fixedTimer); }
  let mobileTurn = document.getElementById('mpMobileTurn');
  if (!mobileTurn) { mobileTurn = document.createElement('div'); mobileTurn.id = 'mpMobileTurn'; document.querySelector('.right-sidebar')?.appendChild(mobileTurn); }
  if (actionPanel) {
    actionPanel.hidden = !localTurn || !state.started || state.over;
  }
  if (statusBadge) statusBadge.style.display = state.started ? 'none' : '';
  if (timerElement) {
    timerElement.hidden = !state.started || state.over;
    timerElement.textContent = formatTurnTime(state.mpTurnDeadline);
  }
  fixedTimer.hidden = !state.started || state.over;
  fixedTimer.textContent = formatTurnTime(state.mpTurnDeadline);
  document.getElementById('playerName').textContent = state.players[0].name.toUpperCase();
  document.getElementById('enemyName').textContent = state.players[1].name.toUpperCase();
  if (!localTurn && state.started && !state.over) {
    msg('Aguardando a ação do oponente.');
    const latest = state.log.slice(0, 3).reverse();
    showEnemyActions(latest.length ? latest : ['O oponente está pensando...'], `AÇÃO DE ${state.players[1].name.toUpperCase()}`);
    setBadge(`turno de ${state.players[1].name}`);
    mobileTurn.textContent = `TURNO DE ${state.players[1].name.toUpperCase()}`;
  } else if (localTurn && state.started && !state.over) {
    msg('Seu turno. Escolha uma ação.');
    hideEnemyActions();
    setBadge('seu turno — você tem 30 segundos');
    mobileTurn.textContent = 'SEU TURNO';
  }
  mobileTurn.hidden = !state.started || state.over;
}

function formatTurnTime(deadline) {
  const seconds = Math.max(0, Math.ceil((Number(deadline || 0) - Date.now()) / 1000));
  return `00:${String(seconds).padStart(2, '0')}`;
}

function updateTurnTimerDisplay() {
  const timerElement = document.getElementById('mpTurnTimer');
  if (!timerElement || !MP.active || !state.started || state.over) return;
  timerElement.textContent = formatTurnTime(state.mpTurnDeadline);
}

function returnToSessionMenu() {
  clearTimeout(MP.revengeTimer);
  clearInterval(MP.revengeTicker);
  location.reload();
}

function showRevengeOffer() {
  if (!MP.active || MP.revengeOffered) return;
  MP.revengeOffered = true;
  MP.revengeAccepted = false;
  MP.revengePeerAccepted = false;
  let seconds = 15;
  showModal(`<h2>FIM DE PARTIDA</h2><p>Desejam jogar uma revanche?</p><p>Tempo para responder: <b id="revengeCountdown">15</b>s</p><div class="revenge-actions"><button id="revengeAccept" class="btn btn-primary">ACEITAR REVANCHE</button><button id="revengeDecline" class="btn btn-secondary">VOLTAR AO MENU</button></div>`);
  const countdown = document.getElementById('revengeCountdown');
  const finish = () => returnToSessionMenu();
  document.getElementById('revengeAccept').onclick = () => {
    MP.revengeAccepted = true;
    send({ type: 'revenge', accepted: true });
    if (MP.role === 'host' && MP.revengePeerAccepted) MP.startGame?.();
    else if (countdown) countdown.textContent = 'aguardando';
  };
  document.getElementById('revengeDecline').onclick = finish;
  MP.revengeTicker = setInterval(() => {
    seconds--;
    if (countdown) countdown.textContent = seconds;
    if (seconds <= 0) { clearInterval(MP.revengeTicker); finish(); }
  }, 1000);
}

function playGuestEffects(logEntry) {
  if (!logEntry || typeof FX === 'undefined') return;
  const text = String(logEntry).toLowerCase();
  if (text.includes('atacou') || text.includes('ataque direto')) {
    FX.boardState('fx-attack', 700);
    FX.slash(document.querySelector('.player-hud'), document.querySelector('.enemy-card'));
    FX.burst(document.querySelector('.enemy-card'), 16);
    return;
  }
  if (text.includes('colheu')) {
    FX.boardState('fx-harvest', 550);
    FX.ring(document.querySelector('.natureza .pile'));
    FX.leaves(document.querySelector('.natureza .pile'), document.getElementById('playerLeaves'));
    return;
  }
  if (text.includes('comprou')) {
    FX.boardState('fx-draw', 650);
    FX.ring(document.querySelector('.natureza .pile'));
    FX.leaves(document.querySelector('.natureza .pile'), document.getElementById('playerLeaves'));
    return;
  }
  if (text.includes('invocou') || text.includes('moveu') || text.includes('puxou')) {
    FX.boardState(text.includes('invocou') ? 'fx-summon' : 'fx-move', 600);
  }
}

function armTurnTimer() {
  if (MP.role !== 'host' || !state.started || state.over) return;
  const key = `${state.round}:${state.turn}`;
  if (MP.turnKey === key) return;
  clearTimeout(MP.turnTimer);
  clearInterval(MP.turnTicker);
  MP.turnKey = key;
  MP.turnDeadline = Date.now() + 30000;
  state.mpTurnDeadline = MP.turnDeadline;
  MP.turnTicker = setInterval(updateTurnTimerDisplay, 250);
  updateTurnTimerDisplay();
  MP.turnTimer = setTimeout(() => {
    if (state.started && !state.over && MP.turnKey === key && state.turn === Number(key.split(':')[1])) {
      log(`${state.players[state.turn].name} perdeu o turno por não agir em 30 segundos.`);
      endTurn(state.turn);
    }
  }, 30000);
}

// ======================================================================
// CONEXÃO
// ======================================================================
function connect(onOpen) {
  if (MP.connected && MP.ws?.readyState === WebSocket.OPEN) { onOpen(); return; }
  if (MP.connecting) return;
  if (MP.ws && MP.ws.readyState !== WebSocket.CLOSED && MP.ws.readyState !== WebSocket.CLOSING) {
    try { MP.ws.close(); } catch {}
  }
  MP.connecting = true;
  const ws = new WebSocket(SERVER_URL);
  MP.ws = ws;
  ws.onopen = () => {
    if (ws !== MP.ws) return;
    MP.connecting = false;
    MP.connected = true;
    onOpen();
  };
  ws.onclose = () => {
    if (ws !== MP.ws) return;
    MP.connected = false;
    MP.connecting = false;
    if (MP.active) {
      setError('Conexão perdida com o servidor.');
      setBadge('conexão perdida');
    }
  };
  ws.onerror = () => {
    if (ws === MP.ws) setError('Não foi possível conectar ao servidor.');
  };
  ws.onmessage = ev => {
    if (ws !== MP.ws) return;
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    handleMessage(msg);
  };
}

function send(obj) {
  if (MP.ws?.readyState === WebSocket.OPEN) MP.ws.send(JSON.stringify(obj));
}

function sendAction(action) { send({ type: 'action', action }); }

function handleMessage(msg) {
  switch (msg.type) {
    case 'created':
      MP.role = 'host'; MP.room = msg.room; MP.active = true;
      MP.peerName = msg.peerName || MP.peerName;
      showRoomCode(msg.room);
      document.getElementById('mpWaitTitle').textContent = 'Sala criada — compartilhe o código:';
      document.getElementById('mpWaitText').textContent = 'Aguardando o outro jogador entrar...';
      installHostHooks();
      send({ type: 'player-name', name: MP.localName });
      break;
    case 'joined':
      MP.role = 'guest'; MP.room = msg.room; MP.active = true;
      MP.peerName = msg.hostName || MP.peerName;
      installGuestHooks();
      showWaitPanel('Você entrou na sala.', 'Aguardando o host iniciar a partida...');
      send({ type: 'player-name', name: MP.localName });
      sendAction({ kind: 'setName', name: MP.localName });
      break;
    case 'error':
      setError(msg.message);
      const errorJoin = MP.role === 'guest' || !!document.getElementById('mpGateCode');
      document.getElementById(errorJoin ? 'mpJoinTab' : 'mpCreateTab')?.click();
      break;
    case 'peer-joined':
      MP.peerReady = true;
      if (MP.role === 'host') {
        showWaitPanel('SALA PRONTA', `Jogador ${msg.peerName || '2'} entrou. Revise o nome e inicie a partida.`);
        showRoomCode(MP.room);
        const startButton = document.getElementById('mpStartBtn'); if (startButton) startButton.hidden = false;
        setBadge('os dois jogadores conectados — sala pronta');
      }
      break;
    case 'player-name':
      if (msg.name && msg.name !== MP.localName) {
        MP.peerName = String(msg.name).trim().slice(0, 18) || 'Jogador 2';
        if (MP.role === 'host' && state.players[1]) {
          state.players[1].name = MP.peerName;
          render();
        }
      }
      break;
    case 'peer-left':
      MP.peerReady = false;
      setBadge('o outro jogador saiu da sala');
      break;
    case 'revenge':
      if (!msg.accepted) returnToSessionMenu();
      MP.revengePeerAccepted = true;
      if (MP.role === 'host' && MP.revengeAccepted) MP.startGame?.();
      break;
    case 'action':
      if (MP.role === 'host') applyGuestAction(msg.action);
      break;
    case 'state':
      if (MP.role === 'guest') applyHostState(msg.state, msg.seq);
      break;
  }
}

// ======================================================================
// LADO HOST
// ======================================================================
function installHostHooks() {
  const originalInit = init;
  const startGame = () => {
    if (!MP.peerReady) {
      setBadge('aguardando o outro jogador entrar...');
      return;
    }
    syncNameToGame(MP.localName);
    closeGate();
    document.getElementById('overlay').style.display = 'none';
    clearTimeout(MP.turnTimer);
    clearInterval(MP.turnTicker);
    MP.turnKey = null;
    MP.seq = 0; MP.lastHostSeq = 0; MP.vagaRevealShown = null;
    originalInit();
    MP.revengeOffered = false;
    MP.revengeAccepted = false;
    MP.revengePeerAccepted = false;
    state.mpTurnDeadline = 0;
    state.players[1].name = MP.peerName || 'Jogador 2';
    state.players[1].bot = false;
    render();
    send({ type: 'player-name', name: MP.localName });
  };
  MP.startGame = startGame;
  document.getElementById('start').onclick = startGame;
  document.getElementById('start').disabled = !MP.peerReady;
  document.getElementById('restart').onclick = startGame;
  document.getElementById('restart').disabled = true;

  const originalRender = render;
  render = function () {
    originalRender();
    relabelOpponent();
    updateMultiplayerUI();
    armTurnTimer();
    if (state.over) showRevengeOffer();
    if (MP.active && MP.role === 'host' && MP.peerReady && state.players[0]) {
      MP.seq++; send({ type: 'state', seq: MP.seq, state: cloneState(state) });
    }
  };
}

function cloneState(s) {
  return typeof structuredClone === 'function' ? structuredClone(s) : JSON.parse(JSON.stringify(s));
}

function relabelOpponent() {
  // troca o texto "BOT" pelos rótulos que fazem sentido em multiplayer,
  // sem tocar na lógica (só nomes exibidos).
  const enemyNameEl = document.getElementById('enemyName');
  if (enemyNameEl && /BOT/.test(enemyNameEl.textContent)) enemyNameEl.textContent = 'ADVERSÁRIO';
  const turnEl = document.getElementById('turn');
  if (turnEl && turnEl.textContent === 'BOT') turnEl.textContent = 'ADVERSÁRIO';
}

function findCardById(p, id) {
  if (!p) return null;
  if (p.front && p.front.id === id) return p.front;
  for (const c of p.bank) if (c && c.id === id) return c;
  for (const c of p.hand) if (c && c.id === id) return c;
  return null;
}

function isGuestAttackTarget(attacker, target) {
  const opponent = state.players[0];
  if (!attacker || !target || !opponent) return false;
  if (attacker.key === 'meganeura') return [opponent.front, ...opponent.bank].filter(Boolean).includes(target);
  if (opponent.front) return target === opponent.front;
  return opponent.bank.includes(target);
}

function applyGuestAction(action) {
  if (action.kind === 'setName') {
    MP.peerName = String(action.name || '').trim().slice(0, 18) || 'Jogador 2';
    if (state.players[1]) {
      state.players[1].name = MP.peerName;
      render();
    }
    return;
  }
  if (!state.players[1]) return;
  const pi = 1;
  const p = state.players[pi];
  switch (action.kind) {
    case 'draw':
      if (validMove(pi) && p.std > 0) { if (drawCost(pi)) p.std--; render(); }
      break;
    case 'harvest':
      if (validMove(pi) && p.std > 0) harvest(pi);
      break;
    case 'secondMove':
      if (validMove(pi) && p.std > 0 && p.moves < 2) {
        p.std--; p.moves += 1; state.selectedField = null;
        log(`${p.name} trocou a ação padrão por mais um movimento.`);
        render();
      }
      break;
    case 'summon':
      if (validMove(pi)) { if (summonFromHand(pi, action.handIdx, action.zone, action.slot)) render(); }
      break;
    case 'move':
      if (!validMove(pi)) break;
      if (action.fromZone === 'front') { moveCard(pi, 'front', action.toSlot); render(); }
      else if (action.fromZone === 'bank' && p.moves > 0 && !p.front) {
        const c = p.bank[action.fromSlot];
        if (c) { p.bank[action.fromSlot] = null; p.front = c; c.root = 0; p.moves--; log(`${p.name} moveu ${CARDS[c.key].name} para o Fronte.`); render(); }
      }
      break;
    case 'swap': {
      if (!validMove(pi) || p.moves <= 0) break;
      const source = findCardById(p, action.sourceId);
      const target = findCardById(p, action.targetId);
      if (!source || !target || source === target || !insect(source) || !insect(target)) break;
      if (source.root > 0 || target.root > 0) break;
      const sourceZone = action.sourceZone, sourceSlot = Number(action.sourceSlot || 0);
      const targetZone = action.targetZone, targetSlot = Number(action.targetSlot || 0);
      if (sourceZone === 'front') p.front = target; else p.bank[sourceSlot] = target;
      if (targetZone === 'front') p.front = source; else p.bank[targetSlot] = source;
      p.moves--;
      log(`${p.name} trocou ${CARDS[source.key].name} e ${CARDS[target.key].name} de posição.`);
      if (typeof FX !== 'undefined') FX.boardState('fx-move',480);
      render();
      break;
    }
    case 'return':
      if (validMove(pi) && p.moves > 0) { if (returnToHand(pi, action.zone, action.slot)) render(); }
      break;
    case 'sell':
      if (!validMove(pi) || p.std <= 0) break;
      if (action.selection.type === 'hand') {
        const c = p.hand[action.selection.index]; if (!c) break;
        p.hand.splice(action.selection.index, 1); state.grave.push(c);
        p.leaves = Math.min(15, p.leaves + 1); p.std--;
        log(`${p.name} vendeu ${CARDS[c.key].name} por 1 folha.`);
      } else {
        const { zone, slot } = action.selection;
        const c = zone === 'front' ? p.front : p.bank[slot]; if (!c) break;
        if (zone === 'front') p.front = null; else p.bank[slot] = null;
        state.grave.push(c); p.leaves = Math.min(15, p.leaves + 1); p.std--;
        log(`${p.name} vendeu ${CARDS[c.key].name} por 1 folha.`);
      }
      render(); winCheck();
      break;
    case 'attack': {
      const attacker = findCardById(p, action.attackerId);
      const target = findCardById(state.players[0], action.targetId);
      if (!attacker || !target || !validMove(pi) || p.std <= 0) break;
      if (!isGuestAttackTarget(attacker, target)) break;
      attack(pi, attacker, target); render(); winCheck();
      break;
    }
    case 'directAttack':
      if (validMove(pi) && p.std > 0 && state.round > 1) {
        if (directAttack(pi)) { render(); winCheck(); }
      }
      break;
    case 'equip': {
      const dest = findCardById(p, action.targetId);
      if (dest && equip(pi, action.handIdx, dest)) render();
      break;
    }
    case 'effect':
      if (validMove(pi)) {
        if (action.targetId) resolveTargetEffect(pi, action.handIdx, findCardById(state.players[0], action.targetId));
        else if (activateEffect(pi, action.handIdx, action.zone, action.slot)) render();
      }
      break;
    case 'endTurn':
      if (validMove(pi)) endTurn(pi);
      break;
  }
}

// ======================================================================
// LADO GUEST
// ======================================================================
function installGuestHooks() {
  ['start', 'restart'].forEach(id => { const b = document.getElementById(id); if (b) b.disabled = true; });

  const _drawCost = drawCost, _harvest = harvest, _summonFromHand = summonFromHand,
        _moveCard = moveCard, _returnToHand = returnToHand, _attack = attack,
        _equip = equip, _activateEffect = activateEffect, _sellSelected = sellSelected,
        _secondMove = secondMove, _endTurn = endTurn, _handleDropOnSlot = handleDropOnSlot, _resolveTargetEffect = resolveTargetEffect, _swapFieldCards = swapFieldCards;

  attackPlayer = function () {
    const p = state.players[0], o = state.players[1];
    if (!validMove(0) || p.std <= 0) return;
    const attacker = p.front;
    if (!attacker) { msg('Você não tem inseto no Fronte.'); return; }
    if (attacker.root > 0 || attacker.skipAttack > 0 || attacker.reload > 0) {
      msg('Esta carta não pode atacar agora.');
      return;
    }
    const targets = attacker.key === 'meganeura'
      ? [o.front, ...o.bank].filter(Boolean)
      : o.front ? [o.front] : o.bank.filter(Boolean);
    if (!targets.length) {
      if (state.round > 1) sendAction({ kind: 'directAttack' });
      else msg('Não há alvo inimigo disponível.');
      return;
    }
    if (targets.length === 1) {
      sendAction({ kind: 'attack', attackerId: attacker.id, targetId: targets[0].id });
      return;
    }
    state.targetMode = { type: 'attack', pi: 0, attacker };
    msg('Clique no alvo inimigo.');
    render();
  };

  drawCost = function (pi) { if (pi === 0) { sendAction({ kind: 'draw' }); return false; } return _drawCost(pi); };

  harvest = function (pi) { if (pi === 0) { sendAction({ kind: 'harvest' }); return; } return _harvest(pi); };

  summonFromHand = function (pi, handIdx, zone, slot) {
    if (pi === 0) { sendAction({ kind: 'summon', handIdx, zone, slot }); return true; }
    return _summonFromHand(pi, handIdx, zone, slot);
  };

  moveCard = function (pi, fromZone, toSlot) {
    if (pi === 0) { sendAction({ kind: 'move', fromZone, toSlot }); return; }
    return _moveCard(pi, fromZone, toSlot);
  };

  swapFieldCards = function (pi, fromZone, fromSlot, toZone, toSlot) {
    if (pi === 0) {
      const p = state.players[0];
      const source = fromZone === 'front' ? p.front : p.bank[fromSlot];
      const target = toZone === 'front' ? p.front : p.bank[toSlot];
      if (source && target) sendAction({ kind: 'swap', sourceId: source.id, targetId: target.id, sourceZone: fromZone, sourceSlot: fromSlot, targetZone: toZone, targetSlot: toSlot });
      return true;
    }
    return _swapFieldCards(pi, fromZone, fromSlot, toZone, toSlot);
  };

  returnToHand = function (pi, zone, slot) {
    if (pi === 0) { sendAction({ kind: 'return', zone, slot }); return true; }
    return _returnToHand(pi, zone, slot);
  };

  attack = function (pi, attackerCard, targetCard) {
    if (pi === 0) { sendAction({ kind: 'attack', attackerId: attackerCard.id, targetId: targetCard.id }); return; }
    return _attack(pi, attackerCard, targetCard);
  };

  equip = function (pi, handIdx, destCard) {
    if (pi === 0) { sendAction({ kind: 'equip', handIdx, targetId: destCard.id }); return true; }
    return _equip(pi, handIdx, destCard);
  };

  activateEffect = function (pi, handIdx, zone, slot, targetId) {
    if (pi === 0) { sendAction({ kind: 'effect', handIdx, zone, slot, targetId }); return true; }
    return _activateEffect(pi, handIdx, zone, slot);
  };

  resolveTargetEffect = function (pi, idx, target) {
    if (pi === 0) { sendAction({ kind: 'effect', handIdx: idx, zone: 'bank', slot: -1, targetId: target?.id }); return false; }
    return _resolveTargetEffect(pi, idx, target);
  };

  sellSelected = function () {
    const p = state.players[0];
    if (state.turn !== 0 || p.std <= 0) return;
    if (state.selected !== null) {
      sendAction({ kind: 'sell', selection: { type: 'hand', index: state.selected } });
      state.selected = null; return;
    }
    const s = state.selectedField;
    if (!s) { msg('Selecione uma carta da mão ou do campo para vender.'); return; }
    sendAction({ kind: 'sell', selection: { type: 'field', zone: s.zone, slot: s.slot } });
    state.selectedField = null;
  };

  secondMove = function () {
    const p = state.players[0];
    if (state.turn !== 0 || p.std <= 0 || p.moves >= 2) return;
    sendAction({ kind: 'secondMove' });
  };

  endTurn = function (pi) {
    if (pi === 0) { sendAction({ kind: 'endTurn' }); return; }
    return _endTurn(pi);
  };

  handleDropOnSlot = function (slotEl, e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const found = findPlayerCardById(id);
    if (found?.zone === 'hand' && (slotEl.id === 'ef0' || slotEl.id.startsWith('eb'))) {
      const target = slotEl.querySelector('.card');
      const data = CARDS[found.c.key];
      if (target && ['inseticida', 'lupa', 'teia'].includes(found.c.key)) {
        sendAction({ kind: 'effect', handIdx: found.slot, zone: 'bank', slot: -1, targetId: target.dataset.cardId });
        clearDropTargets();
        return;
      }
      if (data?.type === 'effect') return;
    }
    const localTargetId = slotEl.id;
    if (found && (found.zone === 'front' || found.zone === 'bank') && !localTargetId.startsWith('e')) {
      const toZone = localTargetId === 'pf0' ? 'front' : 'bank';
      const toSlot = toZone === 'front' ? 0 : Number(localTargetId.slice(-1));
      const targetCard = toZone === 'front' ? state.players[0].front : state.players[0].bank[toSlot];
      if (targetCard && targetCard.id !== found.c.id && insect(found.c) && insect(targetCard)) {
        sendAction({ kind: 'swap', sourceId: found.c.id, targetId: targetCard.id, sourceZone: found.zone, sourceSlot: found.slot, targetZone: toZone, targetSlot: toSlot });
        clearDropTargets();
        return;
      }
    }
    if (found && found.zone === 'bank' && slotEl.id === 'pf0') {
      slotEl.classList.remove('drag-over');
      sendAction({ kind: 'move', fromZone: 'bank', fromSlot: found.slot, toSlot: 0 });
      clearDropTargets();
      return;
    }
    return _handleDropOnSlot(slotEl, e);
  };

  // IMPORTANTE: os botões já foram ligados pelo game.js (no carregamento
  // da página) direto às funções ANTIGAS (ex.: `onclick = sellSelected`
  // copia o valor da função naquele instante). Reassociar as variáveis
  // acima não muda o que o botão já guardou. Por isso religamos os
  // cliques aqui, usando funções que fazem a busca do nome em tempo de
  // clique — assim sempre chamam a versão de rede mais atual.
  document.getElementById('draw').onclick = () => playerDraw();
  document.getElementById('harvest').onclick = () => harvest(0);
  document.getElementById('secondMove').onclick = () => secondMove();
  document.getElementById('sell').onclick = () => sellSelected();
  document.getElementById('returnBtn').onclick = () => returnSelected();
  document.getElementById('attackBtn').onclick = () => attackPlayer();
  document.getElementById('end').onclick = () => { if (validMove(0)) endTurn(0); };

  // rótulos: no lugar de "BOT", deixa claro que é o outro jogador
  const enemyNameEl = document.getElementById('enemyName');
  if (enemyNameEl) enemyNameEl.textContent = 'ADVERSÁRIO';
}

function applyHostState(hostState, seq) {
  if (!hostState?.players || hostState.players.length < 2) return;
  const n = Number(seq || 0);
  if (n && n <= MP.lastHostSeq) return;
  MP.lastHostSeq = n || MP.lastHostSeq + 1;

  const previousLog = state.log?.[0];
  const previousPlayerLeaves = state.players[0]?.leaves ?? null;
  const previousEnemyLeaves = state.players[1]?.leaves ?? null;
  const swapped = cloneState(hostState);
  const [p0, p1] = swapped.players;
  swapped.players = [p1, p0];
  swapped.turn = hostState.turn === 0 ? 1 : hostState.turn === 1 ? 0 : hostState.turn;
  if (hostState.vagaReveal) {
    swapped.vagaReveal = { ...hostState.vagaReveal, viewer: hostState.vagaReveal.viewer === 0 ? 1 : 0 };
  }
  Object.keys(swapped).forEach(k => { state[k] = swapped[k]; });
  state.selected = null;
  state.selectedField = null;
  MP.sessionStarted = !!hostState.started;

  if (hostState.started && document.getElementById('startMenu')) closeGate();
  if (hostState.started && !hostState.over && document.getElementById('overlay')) document.getElementById('overlay').style.display = 'none';
  if (typeof render === 'function') render();
  relabelOpponent();
  updateMultiplayerUI();
  if (typeof animateLeafDelta === 'function') {
    if (previousPlayerLeaves !== null) { const d = state.players[0].leaves - previousPlayerLeaves; if (d) animateLeafDelta(0, d, document.getElementById('playerLeafTokens')); }
    if (previousEnemyLeaves !== null) { const d = state.players[1].leaves - previousEnemyLeaves; if (d) animateLeafDelta(1, d, document.getElementById('enemyLeafTokens')); }
  }

  const reveal = state.vagaReveal;
  if (reveal && reveal.viewer === 0 && reveal.id !== MP.vagaRevealShown) {
    MP.vagaRevealShown = reveal.id;
    if (typeof showVagalumeReveal === 'function') showVagalumeReveal(reveal);
  }
  if (hostState.over) showRevengeOffer();
  if (hostState.log?.[0] && hostState.log[0] !== previousLog) playGuestEffects(hostState.log[0]);
}

// --------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', buildGate);