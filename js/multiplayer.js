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
};

// ======================================================================
// TELA DE SESSÃO
// ======================================================================
function buildGate() {
  const style = document.createElement('style');
  style.textContent = `
    #mpGate { position:fixed; inset:0; z-index:500; display:flex; align-items:center; justify-content:center;
      background:radial-gradient(ellipse at center, #0d1c12 0%, #05090a 100%); font:13px Arial, sans-serif; color:#e5f1e5; }
    #mpGateCard { width:min(360px, 92vw); background:#0d1c12; border:1px solid #294936; border-radius:14px; padding:22px; box-shadow:0 20px 60px rgba(0,0,0,.5); }
    #mpGateCard h1 { font-size:16px; letter-spacing:.12em; color:#d8ff7d; margin-bottom:4px; text-align:center; }
    #mpGateCard .mp-sub { color:#8da18f; font-size:11px; text-align:center; margin-bottom:18px; }
    .mp-tabs { display:flex; gap:6px; margin-bottom:14px; background:#13281a; border:1px solid #294936; border-radius:9px; padding:3px; }
    .mp-tab { flex:1; padding:8px; text-align:center; border-radius:7px; cursor:pointer; color:#8da18f; font-weight:700; font-size:11px; letter-spacing:.06em; }
    .mp-tab.active { background:#3b7042; color:#fff; }
    .mp-field { margin-bottom:10px; }
    .mp-field label { display:block; color:#efc568; font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin-bottom:4px; }
    .mp-field input { width:100%; padding:10px; background:#13281a; border:1px solid #294936; border-radius:8px; color:#e5f1e5; outline:0; font:13px Arial, sans-serif; }
    .mp-field input:focus { border-color:#7df59c; }
    #mpGateCode { text-transform:uppercase; letter-spacing:.2em; text-align:center; font-weight:700; }
    .mp-btn { width:100%; padding:11px; border-radius:9px; border:1px solid #5d9b62; background:#3b7042; color:#fff; font-weight:700; letter-spacing:.05em; cursor:pointer; margin-top:4px; }
    .mp-btn:hover { filter:brightness(1.08); }
    .mp-btn.secondary { background:#13281a; border-color:#294936; color:#7df59c; }
    .mp-error { color:#ff8585; font-size:11px; min-height:14px; margin-top:8px; text-align:center; }
    .mp-panel { display:none; }
    .mp-panel.active { display:block; }
    .mp-waiting { text-align:center; }
    .mp-code-display { font-size:30px; font-weight:900; letter-spacing:.25em; color:#d8ff7d; margin:14px 0 6px; }
    .mp-waiting p { color:#8da18f; font-size:11px; line-height:1.5; }
    .mp-solo { display:block; width:100%; text-align:center; margin-top:16px; color:#8da18f; font-size:11px; text-decoration:underline; cursor:pointer; background:none; border:none; }
  `;
  document.head.appendChild(style);

  const gate = document.createElement('div');
  gate.id = 'mpGate';
  gate.innerHTML = `
    <div id="mpGateCard">
      <h1>INSETO CARDS — BATTLE EDITION</h1>
      <div class="mp-sub">Jogue contra um amigo pela rede</div>

      <div class="mp-tabs">
        <div class="mp-tab active" data-tab="create">CRIAR SALA</div>
        <div class="mp-tab" data-tab="join">ENTRAR EM SALA</div>
      </div>

      <div class="mp-field">
        <label>Seu nome</label>
        <input id="mpPlayerName" maxlength="18" value="Jogador" autocomplete="name">
      </div>

      <div class="mp-panel active" id="mpPanelCreate">
        <div class="mp-field">
          <label>Senha (opcional)</label>
          <input id="mpCreatePass" type="password" placeholder="deixe em branco para não usar senha" maxlength="24">
        </div>
        <button class="mp-btn" id="mpCreateBtn">CRIAR SALA</button>
      </div>

      <div class="mp-panel" id="mpPanelJoin">
        <div class="mp-field">
          <label>Código da sala</label>
          <input id="mpGateCode" placeholder="EX: ABCD" maxlength="4">
        </div>
        <div class="mp-field">
          <label>Senha</label>
          <input id="mpJoinPass" type="password" placeholder="se a sala tiver senha" maxlength="24">
        </div>
        <button class="mp-btn" id="mpJoinBtn">ENTRAR NA SALA</button>
      </div>

      <div class="mp-panel" id="mpPanelWait">
        <div class="mp-waiting">
          <div id="mpWaitTitle">Conectando...</div>
          <div class="mp-code-display" id="mpWaitCode" style="display:none;"></div>
          <p id="mpWaitText"></p>
        </div>
      </div>

      <div class="mp-error" id="mpGateError"></div>
      <button class="mp-solo" id="mpSoloBtn">jogar sozinho contra o BOT, sem rede</button>
    </div>
  `;
  document.body.appendChild(gate);
  const playerNameInput = document.getElementById('mpPlayerName');
  playerNameInput.value = getSavedName();
  playerNameInput.addEventListener('input', () => {
    const name = readLocalName();
    MP.localName = name;
    saveLocalName(name);
    syncNameToGame(name);
  });

  gate.querySelectorAll('.mp-tab').forEach(tab => {
    tab.onclick = () => {
      gate.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
      gate.querySelectorAll('.mp-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab === 'create' ? 'mpPanelCreate' : 'mpPanelJoin').classList.add('active');
      setError('');
    };
  });

  document.getElementById('mpCreateBtn').onclick = () => {
    const name = readLocalName();
    const password = document.getElementById('mpCreatePass').value.trim();
    MP.password = password;
    MP.localName = name;
    saveLocalName(name);
    showWaitPanel('Criando sala...', '');
    connect(() => send({ type: 'create', password, name }));
  };

  document.getElementById('mpJoinBtn').onclick = () => {
    const name = readLocalName();
    const code = document.getElementById('mpGateCode').value.toUpperCase().trim();
    const password = document.getElementById('mpJoinPass').value.trim();
    if (!code || code.length !== 4) { setError('Digite o código de 4 letras da sala.'); return; }
    MP.password = password;
    MP.localName = name;
    saveLocalName(name);
    showWaitPanel('Entrando na sala...', '');
    connect(() => send({ type: 'join', room: code, password, name }));
  };

  document.getElementById('mpSoloBtn').onclick = () => {
    const name = readLocalName();
    MP.localName = name;
    saveLocalName(name);
    syncNameToGame(name);
    closeGate();
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
  document.querySelectorAll('.mp-tab, .mp-panel').forEach(el => el.classList.remove('active'));
  document.getElementById('mpPanelWait').classList.add('active');
  document.getElementById('mpWaitTitle').textContent = title;
  document.getElementById('mpWaitText').textContent = text;
  setError('');
}

function showRoomCode(code) {
  const disp = document.getElementById('mpWaitCode');
  disp.style.display = 'block';
  disp.textContent = code;
}

function closeGate() {
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
  if (!fixedTimer) {
    fixedTimer = document.createElement('div');
    fixedTimer.id = 'mpFixedTimer';
    document.body.appendChild(fixedTimer);
  }

  let mobileTurn = document.getElementById('mpMobileTurn');
  if (!mobileTurn) {
    mobileTurn = document.createElement('div');
    mobileTurn.id = 'mpMobileTurn';
    actionPanel?.insertAdjacentElement('afterend', mobileTurn);
  } else if (actionPanel && mobileTurn.previousElementSibling !== actionPanel) {
    actionPanel.insertAdjacentElement('afterend', mobileTurn);
  }

  if (actionPanel) actionPanel.hidden = !localTurn || !state.started || state.over;
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
}function formatTurnTime(deadline) {
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
  if (MP.revengeOffered) return;
  MP.revengeOffered = true;
  MP.revengeAccepted = false;
  MP.revengePeerAccepted = false;

  let seconds = 15;
  const multiplayer = MP.active;
  showModal(`<h2>FIM DE PARTIDA</h2>
    <p>${multiplayer ? 'Desejam jogar uma revanche?' : 'Quer jogar uma revanche?'}</p>
    <p>Tempo para responder: <b id="revengeCountdown">15</b>s</p>
    <div class="revenge-actions">
      <button id="revengeAccept" class="btn btn-primary">ACEITAR REVANCHE</button>
      <button id="revengeDecline" class="btn btn-secondary">VOLTAR AO MENU</button>
    </div>`);

  const countdown = document.getElementById('revengeCountdown');
  const finish = () => {
    clearInterval(MP.revengeTicker);
    returnToSessionMenu();
  };

  document.getElementById('revengeAccept').onclick = () => {
    MP.revengeAccepted = true;
    if (!multiplayer) {
      clearInterval(MP.revengeTicker);
      document.getElementById('overlay').style.display = 'none';
      MP.revengeOffered = false;
      init();
      return;
    }
    send({ type: 'revenge', accepted: true });
    if (MP.role === 'host' && MP.revengePeerAccepted) MP.startGame?.();
    else if (countdown) countdown.textContent = 'aguardando';
  };

  document.getElementById('revengeDecline').onclick = finish;

  MP.revengeTicker = setInterval(() => {
    seconds--;
    if (countdown && !MP.revengeAccepted) countdown.textContent = seconds;
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
  if (MP.ws) return onOpen();
  MP.ws = new WebSocket(SERVER_URL);
  MP.ws.onopen = () => { MP.connected = true; onOpen(); };
  MP.ws.onclose = () => { MP.connected = false; setError('Conexão perdida com o servidor.'); setBadge('conexão perdida'); };
  MP.ws.onerror = () => setError('Não foi possível conectar ao servidor.');
  MP.ws.onmessage = (ev) => {
    let msg; try { msg = JSON.parse(ev.data); } catch { return; }
    handleMessage(msg);
  };
}

function send(obj) {
  if (MP.ws && MP.ws.readyState === MP.ws.OPEN) MP.ws.send(JSON.stringify(obj));
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
      document.querySelectorAll('.mp-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(MP.role === 'guest' || document.getElementById('mpGateCode') ? 'mpPanelJoin' : 'mpPanelCreate').classList.add('active');
      document.querySelector('.mp-tab[data-tab="join"]')?.classList.remove('active');
      break;
    case 'peer-joined':
      MP.peerReady = true;
      if (MP.role === 'host') {
        closeGate();
        const startButton = document.getElementById('start');
        if (startButton) startButton.disabled = false;
        setBadge('os dois jogadores conectados — clique em INICIAR PARTIDA');
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
      if (MP.role === 'guest') applyHostState(msg.state);
      break;
  }
}

// ======================================================================
// LADO HOST
// ======================================================================
function installHostHooks() {
  window.botTurn = function () { /* turno do player 1 agora vem da rede */ };

  const originalInit = init;
  const startGame = () => {
    if (!MP.peerReady) {
      setBadge('aguardando o outro jogador entrar...');
      return;
    }
    syncNameToGame(MP.localName);
    document.getElementById('overlay').style.display = 'none';
    clearTimeout(MP.turnTimer);
    clearInterval(MP.turnTicker);
    MP.turnKey = null;
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
      send({ type: 'state', state: cloneState(state) });
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
        _secondMove = secondMove, _endTurn = endTurn, _handleDropOnSlot = handleDropOnSlot;

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
      if (target && ['lupa', 'teia'].includes(found.c.key)) {
        sendAction({ kind: 'effect', handIdx: found.slot, zone: 'bank', slot: -1, targetId: target.dataset.cardId });
        clearDropTargets();
        return;
      }
      if (data?.type === 'effect') return;
    }
    if (found && found.zone === 'bank' && slotEl.id === 'pf0') {
      slotEl.classList.remove('drag-over');
      sendAction({ kind: 'move', fromZone: 'bank', fromSlot: found.slot });
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

function applyHostState(hostState) {
  const previousLog = state.log?.[0];
  const swapped = cloneState(hostState);
  const [p0, p1] = swapped.players;
  swapped.players = [p1, p0];
  swapped.turn = hostState.turn === 0 ? 1 : hostState.turn === 1 ? 0 : hostState.turn;

  Object.keys(swapped).forEach(k => { state[k] = swapped[k]; });
  state.selected = null;
  state.selectedField = null;

  if (!hostState.started) return;
  if (document.getElementById('mpGate')) closeGate();
  if (hostState.started && !hostState.over) {
    clearInterval(MP.revengeTicker);
    MP.revengeOffered = false;
    MP.revengeAccepted = false;
    MP.revengePeerAccepted = false;
    document.getElementById('overlay').style.display = 'none';
  }
  if (typeof render === 'function') render();
  relabelOpponent();
  updateMultiplayerUI();
  if (hostState.over) showRevengeOffer();
  if (hostState.log?.[0] && hostState.log[0] !== previousLog) playGuestEffects(hostState.log[0]);
}

// --------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', buildGate);