/* ============================================================================
   INSETO CARDS — MULTIPLAYER 2.1.1
   Camada de rede autoritativa: o HOST é a única fonte de verdade.
   ============================================================================ */
'use strict';

const SERVER_URL = 'wss://server-dh1h.onrender.com';
const MP = {
  ws: null, connected: false, connecting: false,
  active: false, role: null, room: null,
  localName: 'Jogador', peerName: 'Jogador 2', password: '',
  peerReady: false, sessionStarted: false,
  turnTimer: null, turnTicker: null, turnKey: null, turnDeadline: 0,
  startGame: null, revengeOffered: false, revengeAccepted: false,
  revengePeerAccepted: false, revengeTimer: null, revengeTicker: null,
  seq: 0, lastHostSeq: 0, pending: [],
};

const $ = id => document.getElementById(id);

function buildGate() {
  if ($('mpGate')) return;
  const style = document.createElement('style');
  style.id = 'mpGateStyle';
  style.textContent = `
    #mpGate{position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:#07100a;color:#e5f1e5;font:13px Arial,sans-serif}
    #mpGateCard{width:min(380px,92vw);background:#0d1c12;border:1px solid #294936;border-radius:12px;padding:20px;box-shadow:0 18px 45px rgba(0,0,0,.42)}
    #mpGateCard h1{font-size:16px;letter-spacing:.1em;color:#d8ff7d;text-align:center;margin:0 0 5px}
    #mpGateCard .mp-sub{color:#8da18f;font-size:11px;text-align:center;margin-bottom:16px}
    .mp-tabs{display:flex;gap:5px;margin-bottom:14px;background:#13281a;border:1px solid #294936;border-radius:8px;padding:3px}
    .mp-tab{flex:1;padding:8px;text-align:center;border-radius:6px;cursor:pointer;color:#8da18f;font-weight:700;font-size:11px}
    .mp-tab.active{background:#3b7042;color:#fff}
    .mp-field{margin-bottom:10px}.mp-field label{display:block;color:#efc568;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
    .mp-field input{box-sizing:border-box;width:100%;padding:10px;background:#13281a;border:1px solid #294936;border-radius:7px;color:#e5f1e5;outline:0}
    #mpGateCode{text-transform:uppercase;letter-spacing:.2em;text-align:center;font-weight:700}
    .mp-btn{width:100%;padding:10px;border-radius:8px;border:1px solid #5d9b62;background:#3b7042;color:#fff;font-weight:700;cursor:pointer}
    .mp-btn:disabled{opacity:.5;cursor:not-allowed}.mp-panel{display:none}.mp-panel.active{display:block}
    .mp-error{color:#ff8585;font-size:11px;min-height:15px;margin-top:8px;text-align:center}
    .mp-waiting{text-align:center}.mp-code-display{font-size:30px;font-weight:900;letter-spacing:.25em;color:#d8ff7d;margin:14px 0 6px}.mp-waiting p{color:#8da18f;font-size:11px;line-height:1.5}
    .mp-solo{display:block;width:100%;margin-top:15px;color:#8da18f;font-size:11px;text-decoration:underline;cursor:pointer;background:none;border:0}
  `;
  document.head.appendChild(style);
  const gate = document.createElement('div'); gate.id = 'mpGate';
  gate.innerHTML = `
    <div id="mpGateCard">
      <h1>INSETO CARDS — MULTIPLAYER</h1>
      <div class="mp-sub">Partida online para 2 jogadores</div>
      <div class="mp-tabs"><div class="mp-tab active" data-tab="create">CRIAR SALA</div><div class="mp-tab" data-tab="join">ENTRAR</div></div>
      <div class="mp-field"><label>Seu nome</label><input id="mpPlayerName" maxlength="18" autocomplete="name"></div>
      <div class="mp-panel active" id="mpPanelCreate"><div class="mp-field"><label>Senha opcional</label><input id="mpCreatePass" type="password" maxlength="24"></div><button class="mp-btn" id="mpCreateBtn">CRIAR SALA</button></div>
      <div class="mp-panel" id="mpPanelJoin"><div class="mp-field"><label>Código da sala</label><input id="mpGateCode" maxlength="4" placeholder="ABCD"></div><div class="mp-field"><label>Senha</label><input id="mpJoinPass" type="password" maxlength="24"></div><button class="mp-btn" id="mpJoinBtn">ENTRAR NA SALA</button></div>
      <div class="mp-panel" id="mpPanelWait"><div class="mp-waiting"><div id="mpWaitTitle">Conectando...</div><div class="mp-code-display" id="mpWaitCode" hidden></div><p id="mpWaitText"></p></div></div>
      <div class="mp-error" id="mpGateError"></div>
      <button class="mp-solo" id="mpSoloBtn">jogar sozinho contra o BOT</button>
    </div>`;
  document.body.appendChild(gate);
  $('mpPlayerName').value = getSavedName();
  $('mpPlayerName').addEventListener('input', () => { MP.localName = readLocalName(); saveLocalName(MP.localName); syncNameToGame(MP.localName); });
  gate.querySelectorAll('.mp-tab').forEach(tab => tab.onclick = () => {
    gate.querySelectorAll('.mp-tab').forEach(t => t.classList.remove('active'));
    gate.querySelectorAll('.mp-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active'); $(tab.dataset.tab === 'create' ? 'mpPanelCreate' : 'mpPanelJoin').classList.add('active'); setError('');
  });
  $('mpCreateBtn').onclick = createRoom;
  $('mpJoinBtn').onclick = joinRoom;
  $('mpSoloBtn').onclick = () => {
    MP.active = false;
    MP.role = null;
    MP.sessionStarted = false;
    MP.localName = readLocalName();
    saveLocalName(MP.localName);
    syncNameToGame(MP.localName);
    closeGate();
    // O botão de solo não apenas fecha a tela multiplayer: ele precisa
    // iniciar explicitamente o fluxo original do BOT.
    if (typeof init === 'function') init();
    else console.error('[INSETO CARDS] init() não está disponível para o modo BOT.');
  };
}

function readLocalName(){return (($('mpPlayerName')?.value || '').trim() || 'Jogador').replace(/[<>"']/g,'').slice(0,18)}
function getSavedName(){try{return (localStorage.getItem('insetoPlayerName')||'Jogador').replace(/[<>"']/g,'').slice(0,18)||'Jogador'}catch{return 'Jogador'}}
function saveLocalName(n){try{localStorage.setItem('insetoPlayerName',n)}catch{}}
function syncNameToGame(n){if($('name'))$('name').value=n}
function setError(t){if($('mpGateError'))$('mpGateError').textContent=t||''}
function showWaitPanel(title,text){document.querySelectorAll('.mp-tab,.mp-panel').forEach(x=>x.classList.remove('active'));$('mpPanelWait').classList.add('active');$('mpWaitTitle').textContent=title;$('mpWaitText').textContent=text||'';setError('')}
function showRoomCode(code){const e=$('mpWaitCode');e.hidden=false;e.textContent=code}

function createRoom(){
  MP.localName=readLocalName(); saveLocalName(MP.localName); MP.password=$('mpCreatePass').value.trim();
  showWaitPanel('Conectando ao servidor…','Criando uma sala segura para 2 jogadores.');
  connect(()=>send({type:'create',password:MP.password,name:MP.localName}));
}
function joinRoom(){
  MP.localName=readLocalName(); saveLocalName(MP.localName);
  const room=($('mpGateCode').value||'').trim().toUpperCase(), password=$('mpJoinPass').value.trim();
  if(!/^[A-Z0-9]{4}$/.test(room)){setError('Digite um código de 4 caracteres.');return}
  MP.password=password; showWaitPanel('Conectando…','Entrando na sala.');
  connect(()=>send({type:'join',room,password,name:MP.localName}));
}

function connect(onOpen){
  if(MP.connected && MP.ws?.readyState===WebSocket.OPEN){onOpen();return}
  if(MP.connecting){MP.pending.push(onOpen);return}
  if(MP.ws && MP.ws.readyState!==WebSocket.CLOSED && MP.ws.readyState!==WebSocket.CLOSING) MP.ws.close();
  MP.connecting=true;
  const ws=new WebSocket(SERVER_URL); MP.ws=ws;
  ws.onopen=()=>{if(ws!==MP.ws)return;MP.connecting=false;MP.connected=true;MP.pending.splice(0).forEach(fn=>fn());onOpen()};
  ws.onmessage=e=>{if(ws!==MP.ws)return;let msg;try{msg=JSON.parse(e.data)}catch{return}handleMessage(msg)};
  ws.onerror=()=>{if(ws!==MP.ws)return;setError('Não foi possível conectar ao servidor.')};
  ws.onclose=()=>{if(ws!==MP.ws)return;MP.connected=false;MP.connecting=false;MP.peerReady=false;if(MP.active){setError('Conexão perdida com o servidor.');setBadge('conexão perdida — recarregue para reconectar')}else{setError('Servidor indisponível. Tente novamente.')}};
}
function send(obj){if(MP.ws?.readyState===WebSocket.OPEN)MP.ws.send(JSON.stringify(obj));else if(MP.connected===false)console.warn('[MP] mensagem não enviada',obj.type)}
function sendAction(action){send({type:'action',action})}

function handleMessage(msg){
  switch(msg.type){
    case 'created':
      MP.role='host';MP.room=String(msg.room||'').toUpperCase();MP.active=true;MP.peerReady=false;MP.sessionStarted=false;MP.seq=0;MP.lastHostSeq=0;
      showRoomCode(MP.room);$('mpWaitTitle').textContent='Sala criada';$('mpWaitText').textContent='Compartilhe o código e aguarde o outro jogador.';installHostHooks();send({type:'player-name',name:MP.localName});break;
    case 'joined':
      MP.role='guest';MP.room=String(msg.room||'').toUpperCase();MP.active=true;MP.peerReady=true;MP.sessionStarted=false;MP.seq=0;MP.lastHostSeq=0;MP.peerName=msg.hostName||'Jogador 1';installGuestHooks();showWaitPanel('Você entrou na sala','Aguardando o host iniciar a partida…');send({type:'player-name',name:MP.localName});break;
    case 'peer-joined':
      MP.peerReady=true;
      if(MP.role==='host'){closeGate();setBadge('jogador conectado — clique em INICIAR PARTIDA');const b=$('start');if(b)b.disabled=false}
      break;
    case 'player-name':
      if(msg.name && msg.name!==MP.localName){MP.peerName=String(msg.name).trim().slice(0,18)||'Jogador 2';if(MP.role==='host'&&state.players[1]){state.players[1].name=MP.peerName;render()}}
      break;
    case 'peer-left': MP.peerReady=false;MP.sessionStarted=false;setBadge('o outro jogador saiu da sala');break;
    case 'error':
      setError(msg.message||'Erro na sala.'); if(MP.role==='guest')showJoinPanel();else showCreatePanel();break;
    case 'state': if(MP.role==='guest')applyHostState(msg.state,msg.seq);break;
    case 'action': if(MP.role==='host')applyGuestAction(msg.action);break;
    case 'revenge':
      if(!msg.accepted){returnToSessionMenu();break}
      MP.revengePeerAccepted=true;if(MP.role==='host'&&MP.revengeAccepted)MP.startGame?.();break;
  }
}
function showCreatePanel(){document.querySelectorAll('.mp-panel').forEach(x=>x.classList.remove('active'));$('mpPanelCreate').classList.add('active')}
function showJoinPanel(){document.querySelectorAll('.mp-panel').forEach(x=>x.classList.remove('active'));$('mpPanelJoin').classList.add('active')}
function closeGate(){const g=$('mpGate');if(g)g.remove();buildStatusBadge()}
function buildStatusBadge(){if(!MP.active||$('mpStatusBadge'))return;const b=document.createElement('div');b.id='mpStatusBadge';b.style.cssText='position:fixed;top:8px;right:8px;z-index:200;background:#0d1c12;border:1px solid #294936;border-radius:7px;padding:6px 9px;color:#e5f1e5;font:11px Arial,sans-serif';b.innerHTML=`<b style="color:#efc568">SALA ${MP.room}</b> <span id="mpStatusText"></span>`;document.body.appendChild(b)}
function setBadge(t){const e=$('mpStatusText');if(e)e.textContent=' '+(t||'')}

function installHostHooks(){
  const originalInit=init;
  MP.startGame=()=>{
    if(!MP.peerReady){setBadge('aguardando o outro jogador…');return}
    clearTurnTimers();MP.turnKey=null;MP.seq=0;MP.lastHostSeq=0;MP.revengeOffered=false;MP.revengeAccepted=false;MP.revengePeerAccepted=false;
    syncNameToGame(MP.localName);originalInit();
    state.players[1].name=MP.peerName||'Jogador 2';state.players[1].bot=false;state.mpTurnDeadline=0;MP.sessionStarted=true;
    render();broadcastState();
  };
  const start=$('start');if(start){start.onclick=MP.startGame;start.disabled=!MP.peerReady}
  const restart=$('restart');if(restart){restart.onclick=MP.startGame;restart.disabled=true}
  if(MP._renderWrapped)return;MP._renderWrapped=true;
  const originalRender=render;
  render=function(){originalRender();updateMultiplayerUI();armTurnTimer();if(state.over)showRevengeOffer();if(MP.active&&MP.role==='host'&&MP.peerReady&&state.started)broadcastState()};
}
function broadcastState(){if(MP.role!=='host'||!MP.peerReady||!state.started)return;MP.seq++;send({type:'state',seq:MP.seq,state:cloneState(state)})}
function cloneState(s){return typeof structuredClone==='function'?structuredClone(s):JSON.parse(JSON.stringify(s))}

function installGuestHooks(){
  ['start','restart'].forEach(id=>{const b=$(id);if(b)b.disabled=true});
  if(MP._guestInstalled)return;MP._guestInstalled=true;
  const _drawCost=drawCost,_harvest=harvest,_summon=summonFromHand,_move=moveCard,_return=returnToHand,_attack=attack,_equip=equip,_effect=activateEffect,_sell=sellSelected,_second=secondMove,_end=endTurn,_drop=handleDropOnSlot,_resolveEffect=resolveTargetEffect;
  drawCost=pi=>pi===0?(sendAction({kind:'draw'}),false):_drawCost(pi);
  harvest=pi=>pi===0?(sendAction({kind:'harvest'}),undefined):_harvest(pi);
  summonFromHand=(pi,idx,zone,slot)=>pi===0?(sendAction({kind:'summon',handIdx:idx,zone,slot}),true):_summon(pi,idx,zone,slot);
  moveCard=(pi,from,to)=>pi===0?(sendAction({kind:'move',fromZone:from,toSlot:to}),undefined):_move(pi,from,to);
  returnToHand=(pi,zone,slot)=>pi===0?(sendAction({kind:'return',zone,slot}),true):_return(pi,zone,slot);
  attack=(pi,a,t)=>pi===0?(sendAction({kind:'attack',attackerId:a.id,targetId:t.id}),undefined):_attack(pi,a,t);
  equip=(pi,idx,t)=>pi===0?(sendAction({kind:'equip',handIdx:idx,targetId:t.id}),true):_equip(pi,idx,t);
  activateEffect=(pi,idx,zone,slot,targetId)=>pi===0?(sendAction({kind:'effect',handIdx:idx,zone,slot,targetId}),true):_effect(pi,idx,zone,slot);
  resolveTargetEffect=(pi,idx,target)=>{if(pi===0){sendAction({kind:'effect',handIdx:idx,zone:'bank',slot:-1,targetId:target?.id});return}return _resolveEffect(pi,idx,target)};
  sellSelected=()=>{const p=state.players[0];if(!p||state.turn!==0||p.std<=0)return;if(state.selected!==null){sendAction({kind:'sell',selection:{type:'hand',index:state.selected}});state.selected=null;return}const s=state.selectedField;if(!s){msg('Selecione uma carta para vender.');return}sendAction({kind:'sell',selection:{type:'field',zone:s.zone,slot:s.slot}});state.selectedField=null};
  secondMove=()=>{const p=state.players[0];if(!p||state.turn!==0||p.std<=0||p.moves>=2)return;sendAction({kind:'secondMove'})};
  endTurn=pi=>pi===0?sendAction({kind:'endTurn'}):_end(pi);

  attackPlayer=()=>{
    const p=state.players[0],o=state.players[1];if(!p||!o||!validMove(0)||p.std<=0)return;
    const a=p.front;if(!a){msg('Você não tem inseto no Fronte.');return}
    if(a.root>0||a.skipAttack>0||a.reload>0){msg('Esta carta não pode atacar agora.');return}
    const targets=a.key==='meganeura'?[o.front,...o.bank].filter(Boolean):(o.front?[o.front]:o.bank.filter(Boolean));
    if(!targets.length){if(state.round>1)sendAction({kind:'directAttack'});else msg('Não há alvo inimigo disponível.');return}
    if(targets.length===1){sendAction({kind:'attack',attackerId:a.id,targetId:targets[0].id});return}
    state.targetMode={type:'attack',pi:0,attacker:a};msg('Clique no alvo inimigo.');render();
  };

  handleDropOnSlot=(slotEl,e)=>{
    e.preventDefault();slotEl.classList.remove('drag-over');const id=e.dataTransfer.getData('text/plain'),found=findPlayerCardById(id);if(!found||state.turn!==0||state.over)return;
    const enemy=slotEl.id==='ef0'||slotEl.id.startsWith('eb');
    if(enemy){
      if(found.zone==='hand'){
        const d=CARDS[found.c.key],target=slotEl.querySelector('.card');
        if(target&&['inseticida','lupa','teia'].includes(found.c.key)){sendAction({kind:'effect',handIdx:found.slot,zone:'bank',slot:-1,targetId:target.dataset.cardId});clearDropTargets();return}
        return;
      }
      if(pCardIsAttackable(found.c,slotEl)){sendAction({kind:'attack',attackerId:found.c.id,targetId:slotEl.querySelector('.card').dataset.cardId});clearDropTargets();return}
      msg('Alvo inválido para este ataque.');clearDropTargets();return;
    }
    if(found.zone==='bank'&&slotEl.id==='pf0'){sendAction({kind:'move',fromZone:'bank',fromSlot:found.slot});clearDropTargets();return}
    _drop(slotEl,e);
  };

  $('draw').onclick=()=>playerDraw();$('harvest').onclick=()=>harvest(0);$('secondMove').onclick=()=>secondMove();$('sell').onclick=()=>sellSelected();$('returnBtn').onclick=()=>returnSelected();$('attackBtn').onclick=()=>attackPlayer();$('end').onclick=()=>{if(validMove(0))endTurn(0)};
}
function pCardIsAttackable(card,slotEl){const target=slotEl.querySelector('.card');if(!target)return false;const o=state.players[1];if(!o)return false;const tId=target.dataset.cardId;if(card.key==='meganeura')return [o.front,...o.bank].filter(Boolean).some(c=>c.id===tId);if(o.front)return o.front.id===tId;return o.bank.some(c=>c&&c.id===tId)}

function findCardById(p,id){if(!p)return null;if(p.front?.id===id)return p.front;for(const c of p.bank||[])if(c?.id===id)return c;for(const c of p.hand||[])if(c?.id===id)return c;return null}
function isGuestAttackTarget(attacker,target){const o=state.players[0];if(!attacker||!target||!o)return false;if(attacker.key==='meganeura')return[o.front,...o.bank].filter(Boolean).includes(target);if(o.front)return target===o.front;return o.bank.includes(target)}

function applyGuestAction(action){
  if(!action||!state.players[1])return;const pi=1,p=state.players[1];
  try{
    if(action.kind==='setName'){MP.peerName=String(action.name||'Jogador 2').trim().slice(0,18)||'Jogador 2';p.name=MP.peerName;render();return}
    if(!validMove(pi))return;
    switch(action.kind){
      case'draw':if(p.std>0&&drawCost(pi))p.std--;break;
      case'harvest':if(p.std>0)harvest(pi);break;
      case'secondMove':if(p.std>0&&p.moves<2){p.std--;p.moves++;state.selectedField=null;log(`${p.name} trocou a ação padrão por mais um movimento.`);render()}break;
      case'summon':if(safeSummon(pi,action))render();break;
      case'move':applyRemoteMove(pi,action);break;
      case'return':if(p.moves>0&&returnToHand(pi,action.zone,action.slot))render();break;
      case'sell':applyRemoteSell(pi,action);break;
      case'attack':{const a=findCardById(p,action.attackerId),t=findCardById(state.players[0],action.targetId);if(a&&t&&p.std>0&&isGuestAttackTarget(a,t)&&canAttackCard(a))attack(pi,a,t);break}
      case'directAttack':if(p.std>0&&state.round>1)directAttack(pi);break;
      case'equip':{const t=findCardById(p,action.targetId);if(t&&equip(pi,action.handIdx,t))render();break}
      case'effect':if(action.targetId){const t=findCardById(state.players[0],action.targetId);if(t)resolveTargetEffect(pi,action.handIdx,t)}else if(activateEffect(pi,action.handIdx,action.zone,action.slot))render();break;
      case'endTurn':endTurn(pi);break;
    }
  }catch(err){console.error('[MP] ação inválida',action,err)}
  if(!state.over)render();winCheck();
}
function canAttackCard(a){return!!a&&a.root<=0&&a.skipAttack<=0&&a.reload<=0}
function safeSummon(pi,a){if(!Number.isInteger(a.handIdx)||!['front','bank'].includes(a.zone))return false;const slot=a.zone==='bank'?Number(a.slot):-1;if(a.zone==='bank'&&(!Number.isInteger(slot)||slot<0||slot>2))return false;return summonFromHand(pi,a.handIdx,a.zone,slot)}
function applyRemoteMove(pi,a){const p=state.players[pi];if(a.fromZone==='front')moveCard(pi,'front',Number.isInteger(a.toSlot)?a.toSlot:0);else if(a.fromZone==='bank'&&Number.isInteger(a.fromSlot)&&a.fromSlot>=0&&a.fromSlot<3&&p.moves>0&&!p.front){const c=p.bank[a.fromSlot];if(c){p.bank[a.fromSlot]=null;p.front=c;c.root=0;p.moves--;log(`${p.name} moveu ${CARDS[c.key].name} para o Fronte.`);render()}}}
function applyRemoteSell(pi,a){const p=state.players[pi],s=a.selection;if(!s||p.std<=0)return;if(s.type==='hand'){const c=p.hand[s.index];if(!c)return;p.hand.splice(s.index,1);state.grave.push(c)}else{const c=s.zone==='front'?p.front:p.bank[s.slot];if(!c)return;if(s.zone==='front')p.front=null;else p.bank[s.slot]=null;state.grave.push(c)}p.leaves=Math.min(15,p.leaves+1);p.std--;render();winCheck()}

function applyHostState(hostState,seq){if(!hostState?.players||hostState.players.length<2)return;const n=Number(seq||0);if(n&&n<=MP.lastHostSeq)return;MP.lastHostSeq=n||MP.lastHostSeq+1;const prevLog=state.log?.[0];const s=cloneState(hostState),[p0,p1]=s.players;s.players=[p1,p0];s.turn=hostState.turn===0?1:hostState.turn===1?0:hostState.turn;Object.keys(s).forEach(k=>state[k]=s[k]);state.selected=null;state.selectedField=null;MP.sessionStarted=!!hostState.started;if(document.getElementById('mpGate')&&hostState.started)closeGate();if(hostState.started&& !hostState.over&&$('overlay'))$('overlay').style.display='none';render();updateMultiplayerUI();if(hostState.over)showRevengeOffer();if(hostState.log?.[0]&&hostState.log[0]!==prevLog)playGuestEffects(hostState.log[0])}

function updateMultiplayerUI(){if(!MP.active||!state.players[0]||!state.players[1])return;const localTurn=state.turn===0;if($('playerName'))$('playerName').textContent=state.players[0].name.toUpperCase();if($('enemyName'))$('enemyName').textContent=state.players[1].name.toUpperCase();const panel=document.querySelector('.right-sidebar .action-panel');if(panel)panel.hidden=!localTurn||!state.started||state.over;let fixed=$('mpFixedTimer');if(!fixed){fixed=document.createElement('div');fixed.id='mpFixedTimer';fixed.style.cssText='position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:180;padding:5px 9px;background:#0d1c12;border:1px solid #294936;border-radius:6px;color:#efc568;font:700 12px Arial';document.body.appendChild(fixed)}fixed.hidden=!state.started||state.over;fixed.textContent=formatTurnTime(state.mpTurnDeadline);if(localTurn&&state.started&&!state.over){msg('Seu turno. Escolha uma ação.');setBadge('seu turno')}else if(state.started&&!state.over){msg('Aguardando a ação do oponente.');setBadge(`turno de ${state.players[1].name}`)}}
function formatTurnTime(d){const s=Math.max(0,Math.ceil((Number(d||0)-Date.now())/1000));return`00:${String(s).padStart(2,'0')}`}
function armTurnTimer(){if(MP.role!=='host'||!state.started||state.over)return;const key=`${state.round}:${state.turn}`;if(MP.turnKey===key)return;clearTurnTimers();MP.turnKey=key;MP.turnDeadline=Date.now()+30000;state.mpTurnDeadline=MP.turnDeadline;MP.turnTicker=setInterval(updateTurnTimerDisplay,250);MP.turnTimer=setTimeout(()=>{if(state.started&&!state.over&&MP.turnKey===key&&state.turn===Number(String(key).split(':')[1])){log(`${state.players[state.turn].name} perdeu o turno por tempo.`);endTurn(state.turn)}},30000)}
function updateTurnTimerDisplay(){if($('mpFixedTimer'))$('mpFixedTimer').textContent=formatTurnTime(state.mpTurnDeadline)}
function clearTurnTimers(){clearTimeout(MP.turnTimer);clearInterval(MP.turnTicker);MP.turnTimer=null;MP.turnTicker=null}

function playGuestEffects(logEntry){if(typeof FX==='undefined'||!logEntry)return;const t=String(logEntry).toLowerCase();if(t.includes('atacou'))FX.boardState('fx-attack',550);else if(t.includes('colheu'))FX.boardState('fx-harvest',500);else if(t.includes('invocou'))FX.boardState('fx-summon',500);else if(t.includes('moveu')||t.includes('puxou'))FX.boardState('fx-move',500)}
function returnToSessionMenu(){clearTurnTimers();clearInterval(MP.revengeTicker);try{MP.ws?.close()}catch{}location.reload()}
function showRevengeOffer(){if(!MP.active||MP.revengeOffered)return;MP.revengeOffered=true;MP.revengeAccepted=false;MP.revengePeerAccepted=false;let s=15;showModal(`<h2>FIM DE PARTIDA</h2><p>Desejam jogar uma revanche?</p><p>Tempo: <b id="revengeCountdown">15</b>s</p><div class="revenge-actions"><button id="revengeAccept" class="btn btn-primary">ACEITAR REVANCHE</button><button id="revengeDecline" class="btn btn-secondary">VOLTAR AO MENU</button></div>`);$('revengeAccept').onclick=()=>{MP.revengeAccepted=true;send({type:'revenge',accepted:true});$('revengeCountdown').textContent='aguardando';if(MP.role==='host'&&MP.revengePeerAccepted)MP.startGame?.()};$('revengeDecline').onclick=returnToSessionMenu;MP.revengeTicker=setInterval(()=>{s--;if($('revengeCountdown'))$('revengeCountdown').textContent=s;if(s<=0){clearInterval(MP.revengeTicker);returnToSessionMenu()}},1000)}

document.addEventListener('DOMContentLoaded',buildGate);
