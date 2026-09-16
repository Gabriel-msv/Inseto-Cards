/* ==========================================================================
   INSETO CARDS — MOTOR DO JOGO
   Este arquivo concentra regras, BOT, drag & drop, renderização e eventos.
   ========================================================================== */

'use strict';
// ================================================================
// FEEDBACK VISUAL — partículas, formigas e microanimações
// ================================================================
const FX = {
  layer: null,
  canvas: null,
  ctx: null,
  particles: [],
  init() {
    this.layer = document.getElementById('fxLayer');
    this.canvas = document.getElementById('fxCanvas');
    this.ctx = this.canvas.getContext('2d');
    const resize = () => { this.canvas.width = innerWidth * devicePixelRatio; this.canvas.height = innerHeight * devicePixelRatio; this.ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); };
    resize(); addEventListener('resize', resize, {passive:true});
    this.spawnAnts();
    this.loop();
  },
  spawnAnts() {
    const trail = document.getElementById('antTrail');
    for (let i=0;i<9;i++) {
      const a=document.createElement('span'); a.className='ant';
      a.style.top=(12+i*9+(Math.random()*5))+'%';
      a.style.setProperty('--dur',(18+Math.random()*18)+'s');
      a.style.setProperty('--drift',(Math.random()*30-15)+'px');
      a.style.animationDelay=(-Math.random()*20)+'s';
      trail.appendChild(a);
    }
  },
  boardState(cls, ms=550) {
    const b=document.querySelector('.board'); if(!b) return;
    b.classList.remove('fx-attack','fx-hit','fx-summon','fx-harvest','fx-draw','fx-move');
    void b.offsetWidth; b.classList.add(cls);
    setTimeout(()=>b.classList.remove(cls),ms);
  },
  point(el) {
    if (!el) return {x:innerWidth/2,y:innerHeight/2};
    const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};
  },
  ring(el) {
    const p=this.point(el), n=document.createElement('span'); n.className='fx-ring';
    n.style.left=p.x+'px'; n.style.top=p.y+'px'; this.layer.appendChild(n); setTimeout(()=>n.remove(),700);
  },
  burst(el, n=12) {
    const p=this.point(el);
    for(let i=0;i<n;i++){ const q=document.createElement('span'); q.className='fx-hit-particle';
      q.style.left=p.x+'px'; q.style.top=p.y+'px';
      const a=Math.random()*Math.PI*2,d=30+Math.random()*70;
      q.style.setProperty('--px',Math.cos(a)*d+'px'); q.style.setProperty('--py',Math.sin(a)*d+'px');
      this.layer.appendChild(q); setTimeout(()=>q.remove(),600);
    }
  },
  slash(from,to) {
    const a=this.point(from), b=this.point(to), dx=b.x-a.x, dy=b.y-a.y;
    const q=document.createElement('span'); q.className='fx-slash';
    q.style.left=((a.x+b.x)/2)+'px'; q.style.top=((a.y+b.y)/2)+'px';
    q.style.setProperty('--angle',Math.atan2(dy,dx)+'rad');
    this.layer.appendChild(q); setTimeout(()=>q.remove(),320);
  },
  leaves(from,to) {
    const a=this.point(from), b=this.point(to);
    for(let i=0;i<3;i++){ const q=document.createElement('span'); q.className='fx-leaf'; q.textContent='🍃';
      q.style.left=a.x+(Math.random()*16-8)+'px'; q.style.top=a.y+(Math.random()*16-8)+'px';
      q.style.setProperty('--dx',(b.x-a.x+Math.random()*30-15)+'px'); q.style.setProperty('--dy',(b.y-a.y+Math.random()*30-15)+'px');
      this.layer.appendChild(q); setTimeout(()=>q.remove(),850);
    }
  },
  leafTokens(pi, delta, anchor) {
    const layer = this.layer || document.body;
    const p = this.point(anchor || document.getElementById(pi === 0 ? 'playerLeafTokens' : 'enemyLeafTokens'));
    const amount = Math.min(5, Math.max(1, Math.abs(Number(delta) || 0)));
    for (let i = 0; i < amount; i++) {
      const q = document.createElement('img'); q.className = 'fx-token'; q.src = 'assets/ui/ficha-folha.png'; q.alt = ''; q.setAttribute('aria-hidden','true');
      q.style.left = `${p.x + Math.random()*26 - 13}px`; q.style.top = `${p.y + Math.random()*18 - 9}px`;
      q.style.setProperty('--dx', `${Math.random()*90 - 45}px`);
      q.style.setProperty('--dy', `${delta > 0 ? -(30 + Math.random()*50) : (20 + Math.random()*40)}px`);
      q.style.setProperty('--rot', `${Math.random()*260 - 130}deg`);
      layer.appendChild(q); setTimeout(() => q.remove(), 850);
    }
  },
  loop() {
    requestAnimationFrame(()=>this.loop());
  }
};

// ================================================================
// 1. DEFINIÇÃO DAS CARTAS
// Dados estáticos: nome, custo, atributos, condição e habilidade.
// ================================================================
const CARDS = {
  borboleta: { name: 'Borboleta', cost: 4, atk: 2, hp: 6, emoji: '🦋', cond: 'Quando invocado', ability: 'Cura 100% da vida dos aliados em campo.' },
  besouro: { name: 'Besouro Hércules', cost: 6, atk: 3, hp: 10, emoji: '🪲', cond: 'Metade da vida', ability: 'Dobra o dano causado quando estiver com metade da vida.' },
  abelha: { name: 'Abelha', cost: 3, atk: 1, hp: 3, emoji: '🐝', cond: 'No Banco', ability: 'Concede Mel (+1 ATK/HP) ao aliado no Fronte.' },
  mosca: { name: 'Mosca', cost: 2, atk: 2, hp: 4, emoji: '🪰', cond: 'Quando invocado', ability: 'Puxa a última carta do Cemitério com metade dos atributos.' },
  vespa: { name: 'Vespa', cost: 4, atk: 3, hp: 5, emoji: '🐝', cond: 'Quando derrota', ability: 'Próxima carta colocada no Fronte inimigo perde 1 ATK.' },
  cigarra: { name: 'Cigarra', cost: 2, atk: 2, hp: 2, emoji: '🪲', cond: 'Quando derrotada', ability: 'Faz o inimigo perder seu próximo turno.' },
  formiga: { name: 'Formiga', cost: 1, atk: 2, hp: 2, emoji: '🐜', cond: 'No Fronte', ability: '+1 ATK e HP por carta aliada no Banco.' },
  formigaVermelha: { name: 'Formiga Vermelha', cost: 1, atk: 2, hp: 2, emoji: '🐜', cond: 'Inimigo derrotado', ability: '+1 ATK e HP.' },
  rainhaAbelha: { name: 'Abelha Rainha', cost: 6, atk: 1, hp: 5, emoji: '🐝', cond: 'No Banco', ability: 'Toda carta aliada que morrer compra 1 carta grátis da Natureza.' },
  ovos: { name: 'Ovos', cost: 1, atk: 1, hp: 1, emoji: '🥚', cond: 'Quando derrotada', ability: 'Dá 2 cartas da Natureza de graça.' },
  maribondo: { name: 'Maribondo', cost: 4, atk: 2, hp: 6, emoji: '🐝', cond: 'Quando derrota', ability: 'Fica com a habilidade da última carta que derrotou.' },
  barata: { name: 'Barata', cost: 3, atk: 3, hp: 3, emoji: '🪳', cond: 'Quando derrotada', ability: 'Volta à mão com o dobro dos atributos, uma vez.' },
  mosquito: { name: 'Mosquito', cost: 3, atk: 2, hp: 4, emoji: '🦟', cond: 'Quando derrota', ability: '+2 HP.' },
  louva: { name: 'Louva-Deus', cost: 4, atk: 3, hp: 6, emoji: '🦗', cond: 'No Fronte', ability: 'Imune ao primeiro ataque que sofrer em campo.' },
  centopeia: { name: 'Centopeia', cost: 4, atk: 2, hp: 5, emoji: '🐛', cond: 'Alvo < metade da vida', ability: 'Prende o inseto no Fronte inimigo por 2 turnos; ele não pode atacar a Centopeia.' },
  varejeira: { name: 'Mosca Varejeira', cost: 4, atk: 2, hp: 4, emoji: '🪰', cond: 'Quando derrota', ability: 'Transforma o inseto derrotado em Larva no Banco do controlador.' },
  meganeura: { name: 'Meganeura', cost: 8, atk: 5, hp: 10, emoji: '🪰', cond: 'No Fronte', ability: 'Pode atacar qualquer carta inimiga; recarrega por 1 turno.' },
  gafanhoto: { name: 'Gafanhoto', cost: 2, atk: 2, hp: 5, emoji: '🦗', cond: 'Quando ataca', ability: 'Rouba 1 folha do inimigo.' },
  formigaRainha: { name: 'Formiga Rainha', cost: 6, atk: 1, hp: 5, emoji: '🐜', cond: 'Invocada', ability: 'Compra cartas da Natureza igual ao número de aliados em campo.' },
  larvas: { name: 'Larva', cost: 0, atk: 1, hp: 1, emoji: '🐛', cond: 'Quando existe', ability: 'Nada; carta nula usada por efeitos.' },
  cupim: { name: 'Cupim', cost: 3, atk: 2, hp: 3, emoji: '🐜', cond: 'Quando ataca', ability: 'Anula qualquer buff do alvo.' },
  aranha: { name: 'Aranha', cost: 3, atk: 3, hp: 4, emoji: '🕷️', cond: 'Quando ataca', ability: 'Prende o alvo: não pode se mover no próximo turno.' },
  pulga: { name: 'Pulga', cost: 1, atk: 1, hp: 2, emoji: '🪲', cond: 'Invocada', ability: 'Rouba 1 folha do inimigo.' },
  escaravelho: { name: 'Escaravelho', cost: 4, atk: 2, hp: 6, emoji: '🪲', cond: 'No Fronte', ability: 'Reduz o dano sofrido em 1.' },
  bichoPau: { name: 'Bicho-Pau', cost: 4, atk: 1, hp: 1, emoji: '🪵', cond: 'Invocado', ability: 'Só recebe dano de cartas de efeito.' },
  joaninha: { name: 'Joaninha', cost: 2, atk: 1, hp: 3, emoji: '🐞', cond: 'Amigo derrotado', ability: 'Cura 1 HP de todos os aliados vivos.' },
  vaga: { name: 'Vaga-lume', cost: 1, atk: 1, hp: 2, emoji: '✨', cond: 'Invocado', ability: 'Revela 2 cartas aleatórias da mão inimiga em um pop-up.' },
  escorpiao: { name: 'Escorpião', cost: 5, atk: 3, hp: 6, emoji: '🦂', cond: 'Quando ataca', ability: 'Aplica Veneno ao alvo.' },
  grilo: { name: 'Grilo', cost: 5, atk: 3, hp: 3, emoji: '🦗', cond: 'Amigo ataca', ability: 'Ganha 1 folha toda vez que qualquer aliado atacar.' },
  percevejo: { name: 'Percevejo', cost: 3, atk: 3, hp: 4, emoji: '🪲', cond: 'Quando derrota', ability: 'Recupera toda a vida.' },
  libelula: { name: 'Libélula', cost: 3, atk: 3, hp: 6, emoji: '🦋', cond: 'Invocada', ability: 'Imune a efeitos que prendem ou impedem de agir.' },
  mel: { name: 'Mel', cost: 2, type: 'effect', equip: true, emoji: '🍯', cond: 'Equipável', ability: '+1 ATK e HP na carta equipada.' },
  casulo: { name: 'Casulo', cost: 2, type: 'effect', equip: true, emoji: '🥚', cond: 'Equipável', ability: '+2 HP na carta equipada.' },
  adubo: { name: 'Adubo', cost: 3, type: 'effect', emoji: '🌱', cond: 'Ativado', ability: 'Dobra a coleta de folhas por 4 rodadas.' },
  inseticida: { name: 'Inseticida', cost: 2, type: 'effect', emoji: '☠️', cond: 'Ativado', ability: 'Dá 1 dano no Banco inimigo.' },
  lupa: { name: 'Lupa', cost: 3, type: 'effect', emoji: '🔎', cond: 'Ativado', ability: 'Por 3 rodadas, dá 2 dano ao alvo escolhido a cada rodada.' },
  teia: { name: 'Teia', cost: 3, type: 'effect', emoji: '🕸️', cond: 'Ativado', ability: 'Impede a carta alvo de atacar no próximo turno.' },
  veneno: { name: 'Veneno', cost: 3, type: 'effect', equip: true, emoji: '☠️', cond: 'Equipável', ability: '+1 dano por ataque durante 2 turnos.' },
  ninho: { name: 'Ninho', cost: 4, type: 'effect', emoji: '🪺', cond: 'Ativado', ability: 'Invoca uma carta Larva grátis direto no Banco de quem usou.' },
  propolis: { name: 'Própolis', cost: 3, type: 'effect', equip: true, emoji: '🍯', cond: 'Equipável', ability: 'Remove qualquer efeito de veneno (dano contínuo) da carta equipada.' },
  formigueiro: { name: 'Formigueiro', cost: 3, type: 'effect', emoji: '🏠', cond: 'Ativado', ability: 'As folhas de quem usou não podem ser roubadas por 3 rodadas.' }
};
/**
 * Mapa das artes das cartas.
 *
 * As imagens ficam em assets/cards/ para manter o HTML e o JS leves
 * e permitir trocar uma arte sem editar o código do jogo.
 */
const CARD_IMAGES = {
  abelha: 'assets/cards/abelha.jpg',
  adubo: 'assets/cards/adubo.jpg',
  aranha: 'assets/cards/aranha.jpg',
  barata: 'assets/cards/barata.jpg',
  besouro: 'assets/cards/besouro.jpg',
  bichoPau: 'assets/cards/bichoPau.jpg',
  borboleta: 'assets/cards/borboleta.jpg',
  casulo: 'assets/cards/casulo.jpg',
  centopeia: 'assets/cards/centopeia.jpg',
  cigarra: 'assets/cards/cigarra.jpg',
  cupim: 'assets/cards/cupim.jpg',
  escaravelho: 'assets/cards/escaravelho.jpg',
  escorpiao: 'assets/cards/escorpiao.jpg',
  formiga: 'assets/cards/formiga.jpg',
  formigaRainha: 'assets/cards/formigaRainha.jpg',
  formigaVermelha: 'assets/cards/formigaVermelha.jpg',
  formigueiro: 'assets/cards/formigueiro.jpg',
  ninho: 'assets/cards/ninho.jpg',
  gafanhoto: 'assets/cards/gafanhoto.jpg',
  grilo: 'assets/cards/grilo.jpg',
  inseticida: 'assets/cards/inseticida.jpg',
  joaninha: 'assets/cards/joaninha.jpg',
  larvas: 'assets/cards/larvas.jpg',
  libelula: 'assets/cards/libelula.jpg',
  louva: 'assets/cards/louva.jpg',
  lupa: 'assets/cards/lupa.jpg',
  maribondo: 'assets/cards/maribondo.jpg',
  meganeura: 'assets/cards/meganeura.jpg',
  mel: 'assets/cards/mel.jpg',
  mosca: 'assets/cards/mosca.jpg',
  mosquito: 'assets/cards/mosquito.jpg',
  ovos: 'assets/cards/ovos.jpg',
  percevejo: 'assets/cards/percevejo.jpg',
  propolis: 'assets/cards/propolis.jpg',
  pulga: 'assets/cards/pulga.jpg',
  rainhaAbelha: 'assets/cards/rainja_abelha.jpg',
  teia: 'assets/cards/teia.jpg',
  vaga: 'assets/cards/vaga.jpg',
  varejeira: 'assets/cards/varejeira.jpg',
  veneno: 'assets/cards/veneno.jpg',
  vespa: 'assets/cards/vespa.jpg',
};
const DECK_KEYS = Object.keys(CARDS); // catálogo completo atual, uma cópia de cada carta
// ================================================================
// 2. ESTADO DA PARTIDA
// Guarda jogadores, baralho, cemitério, turno e seleção do jogador.
// ================================================================
const APP_VERSION = '3.2.23'; // versão cumulativa: catálogo, combate, efeitos e UX.
const state = { started: false, over: false, round: 1, turn: 'player', deck: [], grave: [], players: [null, null], selected: null, selectedField: null, targetMode: null, log: [], skip: [false, false], tie: false, vagaReveal: null };
function P(name, bot = false) { return { name, bot, leaves: 5, hand: [], front: null, bank: [null, null, null], moves: 1, std: 1, passiveBuy: false, adubo: 0, antiSteal: 0, revealed: 0 }; }
function card(key, owner) { let c = CARDS[key]; return { id: Math.random().toString(36).slice(2), key, owner, atk: c.atk ?? 0, hp: c.hp ?? 0, maxHp: c.hp ?? 0, baseAtk: c.atk ?? 0, baseHp: c.hp ?? 0, damage: 0, buffs: [], equipment: [], activeTurns: 0, poison: 0, poisonTurns: 0, root: 0, skipAttack: 0, reload: 0, protectedOnce: key === 'louva', barataUsed: false, mel: false, customAbility: null, copiedKey: null, debuffNext: false, bonusAtk: 0, bonusHp: 0, passiveAtkBonus: 0, passiveHpBonus: 0, debuffAtk: 0, lupa: 0, teia: 0, effectMarks: [] }; }
function insect(x) { return x && CARDS[x.key] && CARDS[x.key].type !== 'effect' }
// ---------------------------------------------------------------
// Utilitários de interface e registro da partida.
// ---------------------------------------------------------------
function log(t) { state.log.unshift(t); if (state.log.length > 70) state.log.pop(); document.getElementById('log').innerHTML = state.log.map(x => `<div>› ${x}</div>`).join('') }
function msg(t) { document.getElementById('message').textContent = t }
function blockAction(text) {
  msg(text);
  const popup = document.getElementById('actionBlockPopup');
  if (!popup) return;
  popup.textContent = text;
  popup.classList.add('is-visible');
  clearTimeout(blockAction.timer);
  blockAction.timer = setTimeout(() => popup.classList.remove('is-visible'), 1800);
}
function init() {
  state.started = true; state.over = false; state.round = 1; state.turn = 'player'; state.grave = []; state.selected = null; state.selectedField = null; state.targetMode = null; state.skip = [false, false]; state.vagaReveal = null; state.players = [P((document.getElementById('name').value || 'Jogador').trim() || 'Jogador'), P('BOT', true)]; state.deck = [...DECK_KEYS].sort(() => Math.random() - .5); for (let i = 0; i < 3; i++) { drawRaw(0); drawRaw(1) }; log('Partida iniciada. Mão inicial: 3 cartas.'); document.getElementById('enemyName').textContent = 'BOT';// ================================================================
  // EVENTOS DA INTERFACE
  // ================================================================
  document.getElementById('start').disabled = true; startTurn(0); render()
}
function handLimit(pi) { return 6; }
function canReceiveHand(pi, amount = 1) { const p = state.players[pi]; return !!p && p.hand.length + amount <= handLimit(pi); }
function drawRaw(pi) {
  if (!state.deck.length || !canReceiveHand(pi)) return null;
  let k = state.deck.pop();
  let c = card(k, pi);
  state.players[pi].hand.push(c);
  return c;
}
function drawCost(pi) {
  let p = state.players[pi];
  if (!p) return false;
  if (p.hand.length >= handLimit(pi)) { if (pi === 0) blockAction('Sua mão está cheia. O máximo é 6 cartas.'); return false; }
  if (p.leaves < 3) { if (pi === 0) blockAction('Você precisa de 3 folhas para comprar uma carta.'); return false; }
  if (!state.deck.length) { if (pi === 0) blockAction('A Natureza está sem cartas.'); return false; }
  p.leaves -= 3; animateLeafDelta(pi, -3, document.getElementById(pi===0?'playerLeafTokens':'enemyLeafTokens')); FX.boardState('fx-draw',650); FX.ring(document.querySelector('.natureza .pile')); FX.leaves(document.querySelector('.natureza .pile'), document.getElementById(pi===0?'playerLeaves':'enemyLeaves'));
  let c = drawRaw(pi);
  if (c) log(`${p.name} comprou ${CARDS[c.key].name} por 3 folhas.`);
  return !!c;
}
function drawFree(pi, n) { for (let i = 0; i < n; i++) { let c = drawRaw(pi); if (c) log(`${state.players[pi].name} recebeu ${CARDS[c.key].name} grátis.`); else if (state.players[pi]?.hand.length >= handLimit(pi)) { log(`${state.players[pi].name} está com a mão cheia (6 cartas).`); break; } else break; } }
function countField(pi) { const p = state.players[pi]; return p ? fieldCards(pi).filter(insect).length : 0 }
function allInsectsGone(pi) { const p = state.players[pi]; return !p.hand.some(insect) && !insect(p.front) && !p.bank.some(insect) }
function mandatoryInsectDraw(pi) {
  let p = state.players[pi];
  if (countField(pi) || p.hand.some(insect)) return false;
  let bought = false;
  while (!p.hand.some(insect) && p.leaves >= 3 && state.deck.length) {
    if (!drawCost(pi)) break;
    bought = true;
  }
  return bought;
}
function winCheck() {
  renderGrave();
  let recoveredPlayer = mandatoryInsectDraw(0);
  let recoveredBot = mandatoryInsectDraw(1);
  let recovered = recoveredPlayer || recoveredBot;
  if (recovered) render();
  if (allInsectsGone(0) || allInsectsGone(1)) {
    state.over = true;
    let winner = allInsectsGone(1) ? 0 : 1;
    if (typeof MP !== 'undefined' && MP.active && typeof showRevengeOffer === 'function') showRevengeOffer();
    else showModal(`<div class="win">${winner === 0 ? 'VOCÊ VENCEU!' : 'BOT VENCEU!'}</div><p>Condição: todas as cartas inseto do adversário foram derrotadas e ele não conseguiu comprar outra carta com 3 folhas.</p>`);
    return true;
  }
  return false;
}
function hasAvailableMove(pi) {
  const p = state.players[pi];
  if (!p || p.moves <= 0) return false;
  if (p.front && p.front.root <= 0 && p.bank.some(x => !x)) return true;
  if (!p.front && p.bank.some(x => x && x.root <= 0)) return true;
  const movable = [p.front, ...p.bank].filter(c => c && insect(c) && c.root <= 0);
  if (movable.length >= 2) return true;
  if ([p.front, ...p.bank].some(c => c && c.root <= 0 && c.hp >= c.maxHp && !CARDS[c.key].type)) return true;
  return p.hand.some(c => {
    const d = CARDS[c.key];
    return c && d && !d.type && d.cost <= p.leaves && (!p.front || p.bank.some(x => !x));
  });
}
function hasAvailableStandard(pi) {
  const p = state.players[pi];
  if (!p || p.std <= 0) return false;
  if (p.leaves < 15) return true; // colher só é útil se houver espaço para folhas
  if (state.deck.length && p.leaves >= 3) return true;
  if (p.front) {
    const a = p.front;
    if (a.root <= 0 && a.skipAttack <= 0 && a.reload <= 0 &&
        (state.players[1-pi].front || state.players[1-pi].bank.some(Boolean) || (state.round > 1 && state.players[1-pi].hand.length))) return true;
  }
  if (p.hand.length || p.front || p.bank.some(Boolean)) return true; // vender ainda é possível
  return false;
}
function endTurnIfBlocked(pi) {
  const p = state.players[pi];
  if (!validMove(pi) || !p) return;
  if (p.std <= 0 && p.moves <= 0) { endTurn(pi); return; }
  if (p.std <= 0 && !hasAvailableMove(pi)) { endTurn(pi); return; }
  if (p.moves <= 0 && !hasAvailableStandard(pi)) endTurn(pi);
}
function fieldCards(pi) { const p = state.players[pi]; return p ? [p.front, ...p.bank].filter(Boolean) : []; }
function refreshPassiveStats() {
  for (let pi = 0; pi < 2; pi++) {
    const p = state.players[pi]; if (!p) continue;
    const bees = p.bank.filter(c => c && c.key === 'abelha').length;
    const bankCount = p.bank.filter(Boolean).length;
    for (const c of fieldCards(pi)) {
      const eqAtk = (c.equipment || []).reduce((n, e) => n + (e.key === 'mel' ? 1 : 0), 0);
      const eqHp = (c.equipment || []).reduce((n, e) => n + (e.key === 'mel' ? 1 : e.key === 'casulo' ? 2 : 0), 0);
      const passiveAtk = (c.key === 'formiga' && p.front === c ? bankCount : 0) + (p.front === c ? bees : 0) + (c.debuffAtk || 0);
      const passiveHp = (c.key === 'formiga' && p.front === c ? bankCount : 0) + (p.front === c ? bees : 0);
      const desiredAtk = c.baseAtk + (c.bonusAtk || 0) + eqAtk + passiveAtk;
      const desiredMax = c.baseHp + (c.bonusHp || 0) + eqHp + passiveHp;
      const hpDelta = desiredMax - c.maxHp;
      c.atk = desiredAtk;
      c.maxHp = desiredMax;
      if (hpDelta > 0) c.hp = Math.min(c.maxHp, c.hp + hpDelta);
      else if (c.hp > c.maxHp) c.hp = c.maxHp;
      c.passiveAtkBonus = passiveAtk; c.passiveHpBonus = passiveHp;
    }
  }
}
function startTurn(pi) {
  const p = state.players[pi];
  if (!p || state.over) return;
  state.turn = pi;
  state.targetMode = null;
  state.selected = null;
  state.selectedField = null;
  p.std = 1;
  p.moves = 1;

  // A partir da rodada 2, cada jogador recebe 1 folha no início do próprio turno.
  if (state.round > 1) { p.leaves = Math.min(15, p.leaves + 1); animateLeafDelta(pi, 1, document.getElementById(pi===0?'playerLeafTokens':'enemyLeafTokens')); }

  // Cooldowns/impedimentos pertencem ao inseto e avançam somente no turno do dono.
  for (const c of fieldCards(pi)) {
    if (c.reload > 0) c.reload--;
    if (c.root > 0) c.root--;
    if (c.skipAttack > 0) c.skipAttack--;

    // Veneno causa 1 dano no começo do turno do inseto afetado.
    if (c.poisonTurns > 0 && c.poison > 0) {
      c.hp -= 1;
      c.poisonTurns--;
      log(`${CARDS[c.key].name} sofreu 1 dano de Veneno.`);
      if (c.hp <= 0) defeat(p, c, 1 - pi);
    }

    // Lupa aplica 2 de dano no início do turno do alvo.
    if (c.lupa > 0) {
      c.hp -= 2;
      c.lupa--;
      log(`${CARDS[c.key].name} sofreu 2 dano da Lupa.`);
      if (c.hp <= 0) defeat(p, c, 1 - pi);
    }

    // Teia vale apenas para o próximo turno do alvo.
    if (c.teia > 0) {
      c.skipAttack = 1;
      c.teia--;
    }
  }

  // Duração dos efeitos globais é contada nos turnos do proprietário.
  if (p.adubo > 0) p.adubo--;
  if (p.antiSteal > 0) p.antiSteal--;

  // Efeitos visuais e estado após resolver efeitos de início de turno.
  refreshPassiveStats();
  log(pi === 0 ? 'Seu turno começou.' : (p.bot ? 'Turno do BOT começou.' : 'Turno do adversário começou.'));
  render();
  winCheck();
  // O player 1 só recebe a IA quando é realmente um BOT.
  // No multiplayer ele é um jogador humano controlado pela rede.
  if (pi === 1 && p.bot && !state.over) botTurn();
}
function endTurn(pi) {
  if (state.over || state.turn !== pi) return;
  state.targetMode = null;
  state.selected = null;
  state.selectedField = null;
  if (pi === 0) startTurn(1);
  else { state.round++; startTurn(0); }
  render();
  winCheck();
}
// ---------------------------------------------------------------
// Validação de ações e recursos.
// ---------------------------------------------------------------
function validMove(pi) { return state.turn === pi && !state.over }
// ---------------------------------------------------------------
// Invocação e posicionamento de cartas.
// ---------------------------------------------------------------
function summonFromHand(pi, idx, zone, slot) {
  let p = state.players[pi], c = p.hand[idx];
  if (!validMove(pi)) { if (pi === 0) blockAction('Não é o seu turno.'); return false; }
  if (!c) { if (pi === 0) blockAction('Carta inválida.'); return false; }
  let d = CARDS[c.key];
  if (d.type === 'effect') return playEffect(pi, idx);
  if (p.moves <= 0) { if (pi === 0) blockAction('Você não tem movimento disponível.'); return false; }
  if (p.leaves < d.cost) { if (pi === 0) blockAction(`Folhas insuficientes para invocar ${d.name}.`); return false; }
  if (zone === 'front' && p.front) { if (pi === 0) blockAction('O Fronte já está ocupado.'); return false; }
  if (zone === 'bank' && p.bank[slot]) { if (pi === 0) blockAction('Esse espaço do Banco já está ocupado.'); return false; }
  p.leaves -= d.cost; animateLeafDelta(pi, -d.cost, document.getElementById(pi===0?'playerLeafTokens':'enemyLeafTokens')); FX.boardState('fx-summon',600);
  FX.ring(document.getElementById(zone==='front' ? (pi===0?'pf0':'ef0') : (pi===0?'pb'+slot:'eb'+slot)));
  p.hand.splice(idx, 1); c.owner = pi;
  if (zone === 'front') p.front = c; else p.bank[slot] = c;
  if (zone === 'front' && p.front === c && state.players[1-pi].front?.debuffNext) { c.debuffAtk = -1; state.players[1-pi].front.debuffNext = false; log(`${CARDS[c.key].name} entrou no Fronte com -1 ATK por causa da Vespa.`); }
  p.moves--; refreshPassiveStats(); log(`${p.name} invocou ${d.name} no ${zone === 'front' ? 'Fronte' : 'Banco'}.`);
  onSummon(pi, c);
  triggerCopied(p.front && p.front !== c ? p.front : null, 'summon', pi, c);
  triggerCopied(c, 'summon', pi, c);
  render(); winCheck(); endTurnIfBlocked(pi); return true;
}
function onSummon(pi, c) {
  const p = state.players[pi], o = state.players[1 - pi];
  if (c.key === 'borboleta') {
    // A habilidade sempre varre o campo atual após a nova carta entrar.
    // Isso corrige a segunda/terceira invocação e limpa qualquer dano legado.
    for (const x of [p.front, ...p.bank]) {
      if (!x || x === c) continue;
      x.hp = x.maxHp;
      x.damage = 0;
    }
    log(`${p.name} curou todos os aliados com a Borboleta.`);
  }
  if (c.key === 'mosca') {
    const ix = state.grave.findIndex(x => CARDS[x.key].type !== 'effect');
    if (ix >= 0) {
      const old = state.grave.splice(ix, 1)[0];
      const nc = card(old.key, pi);
      nc.atk = Math.max(1, Math.floor(old.atk / 2));
      nc.hp = Math.max(1, Math.floor(old.maxHp / 2));
      nc.maxHp = nc.hp;
      if (canReceiveHand(pi)) p.hand.push(nc);
      else { state.grave.push(nc); log(`${p.name} está com a mão cheia; a carta recuperada foi para o Cemitério.`); }
    }
  }
  if (c.key === 'formigaRainha') drawFree(pi, countField(pi) - 1);
  if (c.key === 'pulga') steal(pi, 1);
  if (c.key === 'vaga') {
    // O Vaga-lume revela duas cartas reais e aleatórias da mão inimiga.
    // O resultado fica no state para que o multiplayer consiga entregar
    // a mesma revelação somente ao jogador que invocou a carta.
    const shuffled = [...o.hand].sort(() => Math.random() - 0.5);
    const revealedCards = shuffled.slice(0, Math.min(2, shuffled.length));
    state.vagaReveal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      viewer: pi,
      owner: o.name,
      keys: revealedCards.map(card => card.key)
    };
    o.revealed = revealedCards.length;
    if (revealedCards.length) showVagalumeReveal(state.vagaReveal);
    log(`${p.name} revelou ${revealedCards.length} carta(s) aleatória(s) da mão de ${o.name}.`);
  }
  if (c.key === 'libelula') c.root = 0;
}
// ---------------------------------------------------------------
// Troca de posição por arraste: inseto sobre outro aliado = 1 movimento.
function swapFieldCards(pi, fromZone, fromSlot, toZone, toSlot) {
  const p = state.players[pi];
  if (!p || !validMove(pi) || p.moves <= 0) return false;
  const source = fromZone === 'front' ? p.front : p.bank[fromSlot];
  const target = toZone === 'front' ? p.front : p.bank[toSlot];
  if (!source || !target || source === target || !insect(source) || !insect(target)) return false;
  if (source.root > 0 || target.root > 0) { if (pi === 0) blockAction('Uma das cartas está presa e não pode ser trocada.'); return false; }
  if (fromZone === 'front' && toZone === 'front') return false;
  if (fromZone === 'bank' && toZone === 'bank' && fromSlot === toSlot) return false;
  if (fromZone === 'front') p.front = target; else p.bank[fromSlot] = target;
  if (toZone === 'front') p.front = source; else p.bank[toSlot] = source;
  source.root = 0; target.root = 0; p.moves--;
  FX.boardState('fx-move', 480);
  log(`${p.name} trocou ${CARDS[source.key].name} e ${CARDS[target.key].name} de posição.`);
  render(); endTurnIfBlocked(pi);
  return true;
}
// ---------------------------------------------------------------
// Movimentação entre Banco e Fronte.
function moveCard(pi, from, slot) {
  let p = state.players[pi];
  if (from === 'front' && p.front && !insect(p.front)) { if (pi === 0) blockAction('Cartas de efeito ativas não podem ser movidas.'); return false; }
  if (from !== 'front' && p.bank[slot] && !insect(p.bank[slot])) { if (pi === 0) blockAction('Cartas de efeito ativas não podem ser movidas.'); return false; }
  if (!validMove(pi)) { if (pi === 0) blockAction('Não é o seu turno.'); return false; }
  if (p.moves <= 0) { if (pi === 0) blockAction('Você não tem movimento disponível.'); return false; }
  const c = from === 'front' ? p.front : p.bank[slot];
  if (!c) { if (pi === 0) blockAction('Não há carta nesse espaço.'); return false; }
  if (c.root > 0) { if (pi === 0) blockAction(`${CARDS[c.key].name} está presa e não pode ser movida agora.`); return false; }
  if (from === 'front') {
    const dest = p.bank.findIndex(x => !x);
    if (dest < 0) { if (pi === 0) blockAction('Não há espaço vazio no Banco.'); return false; }
    p.front = null; p.bank[dest] = c; c.root = 0; p.moves--;
    log(`${p.name} moveu ${CARDS[c.key].name} para o Banco.`);
  } else {
    if (p.front) { if (pi === 0) blockAction('O Fronte já está ocupado.'); return false; }
    p.bank[slot] = null; p.front = c; c.root = 0; p.moves--;
    log(`${p.name} moveu ${CARDS[c.key].name} para o Fronte.`);
  }
  FX.boardState('fx-move',480); render(); endTurnIfBlocked(pi); return true;
}
function returnToHand(pi, zone, slot) {
  let p = state.players[pi], c = zone === 'front' ? p.front : p.bank[slot];
  if (!c) { blockAction('Não há carta nesse espaço.'); return false; }
  if (CARDS[c.key].type === 'effect') { blockAction('Efeitos ativos não podem voltar para a mão.'); return false; }
  if (c.hp < c.maxHp) { blockAction('Só é possível puxar cartas com a vida cheia.'); return false; }
  if (c.root > 0) { blockAction(`${CARDS[c.key].name} está presa e não pode ser movida agora.`); return false; }
  if (p.moves <= 0) { blockAction('Você não tem movimento disponível.'); return false; }
  if (!canReceiveHand(pi)) { if (pi === 0) blockAction('Sua mão está cheia. Uma carta com 6 na mão não pode voltar.'); return false; }
  FX.boardState('fx-move',480);
  if (zone === 'front') p.front = null; else p.bank[slot] = null;
  p.hand.push(c); p.moves--;
  log(`${p.name} puxou ${CARDS[c.key].name} de volta para a mão.`);
  render(); endTurnIfBlocked(pi); return true;
}
// ---------------------------------------------------------------
function getAttackTargets(pi, attacker) {
  const o = state.players[1 - pi];
  if (!o || !attacker || !insect(attacker)) return [];
  const all = [o.front, ...o.bank].filter(Boolean).filter(insect);
  if (attacker.key === 'meganeura') return all;
  return o.front ? [o.front] : o.bank.filter(Boolean).filter(insect);
}
function chooseAttack(pi) {
  const p = state.players[pi], a = p?.front;
  if (!a || a.root > 0 || a.skipAttack > 0 || a.reload > 0) return false;
  const targets = getAttackTargets(pi, a);
  if (!targets.length) return false;
  return attack(pi, a, targets[0]);
}
// ---------------------------------------------------------------
// Sistema de combate e resolução de dano.
// ---------------------------------------------------------------
function attack(pi, a, t) {
  const p = state.players[pi], o = state.players[1 - pi];
  if (!validMove(pi)) { if (pi === 0) blockAction('Não é o seu turno.'); return false; }
  if (p.std <= 0) { if (pi === 0) blockAction('Você já gastou sua ação padrão.'); return false; }
  if (!a || !insect(a) || p.front !== a) { if (pi === 0) blockAction('O atacante precisa estar no Fronte.'); return false; }
  if (a.root > 0) { if (pi === 0) blockAction(`${CARDS[a.key].name} está presa e não pode atacar.`); return false; }
  if (a.skipAttack > 0) { if (pi === 0) blockAction(`${CARDS[a.key].name} não pode atacar neste turno.`); return false; }
  if (a.reload > 0) { if (pi === 0) blockAction(`${CARDS[a.key].name} está recarregando.`); return false; }
  if (!t || !insect(t) || !fieldCards(1 - pi).includes(t)) { if (pi === 0) blockAction('Alvo inválido.'); return false; }

  const targets = getAttackTargets(pi, a);
  if (!targets.includes(t)) { if (pi === 0) blockAction('Esse inseto está protegido pelo Fronte.'); return false; }
  const isBankTarget = o.bank.includes(t);
  if (isBankTarget && isBankProtected(1 - pi)) { if (pi === 0) blockAction('O Banco está protegido pelo Própolis.'); return false; }

  const d = CARDS[a.key];
  p.std--;
  FX.boardState('fx-attack', 700);
  FX.slash(document.querySelector('#pf0 .card'), document.querySelector('#ef0 .card') || document.querySelector('#eb0 .card'));

  let damage = Math.max(0, a.atk);
  if (a.key === 'besouro' && a.hp <= Math.ceil(a.maxHp / 2)) damage *= 2;
  if (a.key === 'cupim') clearBuffs(t);
  if (a.key === 'gafanhoto') steal(pi, 1);
  fieldCards(pi).filter(x => x.key === 'grilo').forEach(() => { p.leaves = Math.min(15, p.leaves + 1); animateLeafDelta(pi, 1, document.getElementById(pi===0?'playerLeafTokens':'enemyLeafTokens')); });
  if (a.key === 'escorpiao') { t.poison = 1; t.poisonTurns = Math.max(t.poisonTurns, 2); }
  if (a.key === 'aranha' && !isImmuneRoot(t)) { t.root = Math.max(t.root, 1); t.effectMarks ||= []; if (!t.effectMarks.includes('aranha')) t.effectMarks.push('aranha'); }
  if (a.key === 'centopeia' && t.hp <= t.maxHp / 2 && !isImmuneRoot(t)) { t.root = Math.max(t.root, 2); t.effectMarks ||= []; if (!t.effectMarks.includes('centopeia')) t.effectMarks.push('centopeia'); }
  if (a.key === 'meganeura') a.reload = 2; // bloqueia o próximo turno do próprio inseto

  let dealt = damage;
  if (t.key === 'escaravelho') dealt = Math.max(0, dealt - 1);
  if (t.key === 'bichoPau') dealt = 0;
  if (t.key === 'louva' && t.protectedOnce) { dealt = 0; t.protectedOnce = false; log('Louva-Deus anulou o primeiro ataque recebido.'); }

  // Combate mútuo: o defensor devolve ATK mesmo se for derrotado pelo golpe.
  const back = insect(t) && t.key !== 'bichoPau' ? Math.max(0, t.atk) : 0;
  t.hp -= dealt;
  a.hp -= back;
  log(`${p.name}: ${d.name} causou ${dealt} dano em ${CARDS[t.key].name}.`);
  if (back > 0) log(`${CARDS[t.key].name} devolveu ${back} dano.`);

  if (t.hp <= 0) {
    triggerCopied(a, 'defeat', pi, t);
    defeat(o, t, pi);
  } else {
    triggerCopied(a, 'attack', pi, t);
  }
  if (a.hp <= 0 && o.front !== a && p.front === a) defeat(p, a, 1 - pi);

  render();
  winCheck();
  return true;
}
function isImmuneRoot(c) { return c && c.key === 'libelula' }
function clearBuffs(c) {
  if (!c) return false;
  c.bonusAtk = 0; c.bonusHp = 0; c.debuffAtk = 0;
  c.poison = 0; c.poisonTurns = 0; c.root = 0; c.skipAttack = 0; c.reload = 0; c.lupa = 0; c.teia = 0;
  c.effectMarks = (c.effectMarks || []).filter(mark => !['lupa','teia','aranha','centopeia'].includes(mark));
  refreshPassiveStats();
  log(`${CARDS[c.key].name} perdeu seus buffs/debuffs.`);
  return true;
}
function triggerCopied(killerCard, event, pi, target) {
  if (!killerCard || killerCard.key !== 'maribondo' || !killerCard.copiedKey) return;
  const k = killerCard.copiedKey;
  if (event === 'defeat') {
    if (k === 'gafanhoto' || k === 'pulga') steal(pi, 1);
    if (k === 'mosquito') killerCard.hp = Math.min(killerCard.maxHp, killerCard.hp + 2);
    if (k === 'percevejo') killerCard.hp = killerCard.maxHp;
    if (k === 'formigaVermelha') { killerCard.bonusAtk++; killerCard.bonusHp++; }
  }
  if (event === 'attack') {
    if (k === 'grilo') state.players[pi].leaves = Math.min(15, state.players[pi].leaves + 1);
    if (k === 'cupim') clearBuffs(target);
    if (k === 'escorpiao') { target.poison = 1; target.poisonTurns = Math.max(target.poisonTurns, 2); }
    if (k === 'aranha' && !isImmuneRoot(target)) { target.root = Math.max(target.root, 1); target.effectMarks ||= []; if (!target.effectMarks.includes('aranha')) target.effectMarks.push('aranha'); }
    if (k === 'centopeia' && target.hp <= target.maxHp / 2 && !isImmuneRoot(target)) { target.root = Math.max(target.root, 2); target.effectMarks ||= []; if (!target.effectMarks.includes('centopeia')) target.effectMarks.push('centopeia'); }
    if (k === 'gafanhoto') steal(pi, 1);
  }
  if (event === 'summon') {
    if (k === 'pulga') steal(pi, 1);
    if (k === 'borboleta') fieldCards(pi).forEach(x => { if (x !== killerCard) { x.hp = x.maxHp; x.damage = 0; } });
    if (k === 'libelula') killerCard.root = 0;
  }
}
function defeat(owner, c, killer) {
  const p = owner; let idx = -1;
  if (p.front === c) p.front = null; else idx = p.bank.indexOf(c);
  if (idx >= 0) p.bank[idx] = null;
  const d = CARDS[c.key]; log(`${p.name}: ${d.name} foi derrotado.`);
  if (c.key === 'barata' && !c.barataUsed) {
    c.barataUsed = true; c.bonusAtk += c.baseAtk; c.bonusHp += c.baseHp;
    c.hp = c.maxHp = c.baseHp + c.bonusHp;
    if (canReceiveHand(p === state.players[0] ? 0 : 1)) { p.hand.push(c); log('Barata voltou para a mão com os atributos dobrados.'); }
    else { state.grave.push(c); log('A Barata não pôde voltar: a mão estava cheia.'); }
  } else {
    state.grave.push(c);
    if (c.key === 'cigarra') { const defeatedPi = p === state.players[0] ? 0 : 1; state.skip[1 - defeatedPi] = true; }
    if (c.key === 'ovos') drawFree(p === state.players[0] ? 0 : 1, 2);
    if (c.key === 'formigaVermelha') { const killerCard = state.players[killer]?.front; if (killerCard) { killerCard.bonusAtk++; killerCard.bonusHp++; } }
    if (c.key === 'mosquito') { const killerCard = state.players[killer]?.front; if (killerCard) killerCard.hp = Math.min(killerCard.maxHp, killerCard.hp + 2); }
    if (c.key === 'percevejo') { const killerCard = state.players[killer]?.front; if (killerCard) killerCard.hp = killerCard.maxHp; }
    const pi = p === state.players[0] ? 0 : 1;
    const ally = state.players[pi];
    if (ally.bank.some(x => x && x.key === 'rainhaAbelha')) drawFree(pi, 1);
    if (fieldCards(pi).some(x => x.key === 'joaninha')) fieldCards(pi).filter(x => x !== c).forEach(x => { x.hp = Math.min(x.maxHp, x.hp + 1); });
    const killerCard = state.players[killer]?.front;
    if (killer === pi && killerCard?.key === 'varejeira') { const s = state.players[killer].bank.findIndex(x => !x); if (s >= 0) { state.players[killer].bank[s] = card('larvas', killer); log('A Varejeira colocou uma Larva no Banco.'); } }
    if (killer === pi && killerCard?.key === 'vespa') killerCard.debuffNext = true;
    if (killer === pi && killerCard?.key === 'maribondo') { killerCard.customAbility = d.ability; killerCard.copiedKey = c.key; log(`Maribondo copiou a habilidade de ${d.name}.`); }
  }
  refreshPassiveStats();
}
function steal(pi, n) { let p = state.players[pi], o = state.players[1 - pi]; if (o.antiSteal > 0) { log('Roubo bloqueado pelo Formigueiro.'); return } let a = Math.min(n, o.leaves); o.leaves -= a; p.leaves = Math.min(15, p.leaves + a); if (a) animateLeafDelta(pi, a, document.getElementById(pi===0?'playerLeafTokens':'enemyLeafTokens')); if (a) log(`${p.name} roubou ${a} folha(s).`) }
function playEffect(pi, idx) { return activateEffect(pi, idx, 'bank', -1); }
function activateEffect(pi, idx, zone, slot) {
  const p = state.players[pi], c = p?.hand[idx], d = c && CARDS[c.key];
  if (!c || !d || d.type !== 'effect') { if (pi === 0) blockAction('Carta de efeito inválida.'); return false; }
  if (p.std <= 0) { if (pi === 0) blockAction('Você já gastou sua ação padrão.'); return false; }
  if (p.leaves < d.cost) { if (pi === 0) blockAction(`Folhas insuficientes para ${d.name}.`); return false; }
  if (d.equip) { state.targetMode = { type: 'equip', pi, idx }; msg(`Selecione um inseto próprio para equipar ${d.name}.`); return false; }
  if (['inseticida','lupa','teia'].includes(c.key)) { state.targetMode = { type: 'effectTarget', pi, idx }; msg(`Selecione o alvo de ${d.name}.`); return false; }
  const requestedSlot = Number.isInteger(slot) && slot >= 0 && slot < p.bank.length && !p.bank[slot] ? slot : -1;
  const bankSlot = requestedSlot >= 0 ? requestedSlot : p.bank.findIndex(x => !x);
  if (bankSlot < 0) { if (pi === 0) blockAction(`Não há espaço no Banco para ${d.name}.`); return false; }
  p.leaves -= d.cost; p.hand.splice(idx, 1); state.targetMode = null; if (pi === 0) state.selected = null;
  if (c.key === 'ninho') {
    p.bank[bankSlot] = card('larvas', pi);
    log(`${p.name} usou Ninho e colocou uma Larva grátis no Banco.`);
    state.grave.push(c); p.std--; refreshPassiveStats(); render(); endTurnIfBlocked(pi); return true;
  }
  c.activeTurns = c.key === 'adubo' ? 4 : c.key === 'formigueiro' ? 3 : 0;
  p.bank[bankSlot] = c;
  if (c.key === 'adubo') p.adubo = 4;
  if (c.key === 'formigueiro') p.antiSteal = 3;
  p.std--;
  log(`${p.name} ativou ${d.name}${c.activeTurns ? ` por ${c.activeTurns} rodadas` : ''}.`);
  refreshPassiveStats(); render(); endTurnIfBlocked(pi); return true;
}
function isBankProtected(pi) {
  const p = state.players[pi];
  return !!(p && p.front && p.front.equipment && p.front.equipment.some(e => e.key === 'propolis'));
}
function equip(pi, idx, target) {
  const p = state.players[pi], c = p?.hand[idx], d = c && CARDS[c.key];
  if (!c || !d || !d.equip) { if (pi === 0) blockAction('Esta carta não pode ser equipada.'); return false; }
  if (!target || !insect(target)) { if (pi === 0) blockAction('Escolha um inseto próprio para equipar.'); return false; }
  if (p.std <= 0) { if (pi === 0) blockAction('Você já gastou sua ação padrão.'); return false; }
  if (p.leaves < d.cost) { if (pi === 0) blockAction('Folhas insuficientes.'); return false; }
  p.leaves -= d.cost; p.hand.splice(idx, 1); if (pi === 0) state.selected = null; target.equipment ||= []; target.equipment.push(c);
  if (c.key === 'veneno') { target.poison = 1; target.poisonTurns = 2; }
  if (c.key === 'propolis') { target.poison = 0; target.poisonTurns = 0; }
  p.std--; state.targetMode = null; refreshPassiveStats();
  log(`${p.name} equipou ${d.name} em ${CARDS[target.key].name}.`); render(); endTurnIfBlocked(pi); return true;
}
let touchDropAt = 0;
function clickCard(pi, zone, slot) {
  if (Date.now() < touchDropAt) return;
  const p = state.players[pi];
  const c = zone === 'hand' ? p?.hand[slot] : (zone === 'front' ? p?.front : p?.bank[slot]);
  if (!c) return;
  if (state.targetMode && state.targetMode.pi === 0 && state.targetMode.type === 'equip' && pi === 0) { equip(0, state.targetMode.idx, c); return; }
  if (state.targetMode && state.targetMode.pi === 0 && state.targetMode.type === 'effectTarget' && pi === 1) { resolveTargetEffect(0, state.targetMode.idx, c); return; }
  if (state.targetMode && state.targetMode.pi === 0 && state.targetMode.type === 'attack' && pi === 1) { resolveAttackTarget(c); return; }
  if (state.turn !== 0 || state.over || pi !== 0) return;
  if (zone === 'hand') {
    state.selectedField = null;
    state.selected = state.selected === slot ? null : slot;
    render();
    return;
  }
  if (state.selected !== null) {
    const idx = state.selected;
    if (zone === 'front' && slot === 0 && !c) { if (summonFromHand(0, idx, 'front', 0)) state.selected = null; return; }
    if (zone === 'bank' && slot >= 0 && !c) { if (summonFromHand(0, idx, 'bank', slot)) state.selected = null; return; }
  }
  state.selected = null;
  state.selectedField = (state.selectedField?.zone === zone && state.selectedField?.slot === slot) ? null : { zone, slot };
  render();
}
function getSelectedField() { let s = state.selectedField; if (!s) return null; let p = state.players[0]; return s.zone === 'front' ? p.front : p.bank[s.slot] }
// Ações específicas do jogador humano.
function attackPlayer() {
  if (!validMove(0)) { blockAction('Não é o seu turno.'); return; }
  if (state.players[0].std <= 0) { blockAction('Você já gastou sua ação padrão.'); return; }
  let a = state.players[0].front; if (!a) { blockAction('Você não tem inseto no Fronte.'); return }
  if (a.root > 0 || a.skipAttack > 0 || a.reload > 0) { blockAction('Esta carta está impedida de atacar agora.'); return }
  const targets = getAttackTargets(0, a);
  if (!targets.length) {
    if (state.round > 1 && directAttack(0)) render();
    else blockAction(state.round > 1 ? 'O inimigo não tem cartas na mão para descartar.' : 'Não há alvo inimigo disponível.');
    return;
  }
  if (targets.length === 1) { attack(0, a, targets[0]); render(); return }
  state.targetMode = { type: 'attack', pi: 0, attacker: a };
  msg('Clique no alvo inimigo.'); render();
}
function directAttack(pi) {
  let opponent = state.players[1 - pi];
  if (!opponent.hand.length || state.players[pi].std <= 0) return false;
  let discarded = opponent.hand.splice(Math.floor(Math.random() * opponent.hand.length), 1)[0];
  state.grave.push(discarded);
  state.players[pi].std--;
  log(`${state.players[pi].name} fez um ataque direto e descartou ${CARDS[discarded.key].name}.`);
  if (pi === 1) showEnemyActions([`Ataque direto: descartou ${CARDS[discarded.key].name}.`], 'ATAQUE DIRETO DO BOT');
  else showEnemyActions([`Você descartou ${CARDS[discarded.key].name} da mão inimiga.`], 'ATAQUE DIRETO');
  return true;
}
function resolveAttackTarget(target) {
  const a = state.targetMode && state.targetMode.attacker;
  if (!a) { blockAction('Nenhum ataque está aguardando um alvo.'); return; }
  if (!isValidAttackTarget(a, target)) { blockAction('Alvo inválido para este ataque.'); return; }
  state.targetMode = null; attack(0, a, target); render(); endTurnIfBlocked(0);
}
function isValidAttackTarget(a, t) { if (!t) return false; return getAttackTargets(0, a).includes(t); }
function resolveTargetEffect(pi, idx, target) {
  const p = state.players[pi], c = p?.hand[idx], d = c && CARDS[c.key], o = state.players[1 - pi];
  if (!c || !d || d.type !== 'effect') { blockAction('Carta de efeito inválida.'); return false; }
  if (p.std <= 0) { blockAction('Você já gastou sua ação padrão.'); return false; }
  if (p.leaves < d.cost) { blockAction(`Folhas insuficientes para ${d.name}.`); return false; }
  if (!target || !fieldCards(1 - pi).includes(target)) { blockAction(`Alvo inválido para ${d.name}.`); return false; }
  if (o.bank.includes(target) && isBankProtected(1 - pi)) { blockAction('O Banco está protegido pelo Própolis.'); return false; }
  if (c.key === 'inseticida' && !o.bank.includes(target)) { blockAction('Inseticida só atinge cartas do Banco.'); return false; }
  if ((c.key === 'lupa' || c.key === 'teia') && target !== o.front) { blockAction(`${d.name} só pode atingir o Fronte inimigo.`); return false; }
  if (c.key === 'teia' && isImmuneRoot(target)) { blockAction('Libélula é imune à Teia.'); return false; }

  let bankSlot = -1;
  if (c.key === 'lupa' || c.key === 'teia') {
    bankSlot = p.bank.findIndex(x => !x);
    if (bankSlot < 0) { blockAction(`Não há espaço no Banco para manter ${d.name}.`); return false; }
  }

  p.leaves -= d.cost;
  p.hand.splice(idx, 1);
  state.targetMode = null;
  if (pi === 0) state.selected = null;
  p.std--;

  if (c.key === 'inseticida') {
    target.hp -= 1;
    log(`${p.name} usou Inseticida em ${CARDS[target.key].name} (-1 HP).`);
    if (target.hp <= 0) defeat(o, target, pi);
    state.grave.push(c);
  } else if (c.key === 'lupa') {
    c.activeTurns = 3;
    p.bank[bankSlot] = c;
    target.lupa = 3;
    target.effectMarks ||= [];
    if (!target.effectMarks.includes('lupa')) target.effectMarks.push('lupa');
    log(`${p.name} colocou Lupa em ${CARDS[target.key].name} por 3 turnos do alvo.`);
  } else if (c.key === 'teia') {
    c.activeTurns = 1;
    p.bank[bankSlot] = c;
    target.teia = 1;
    target.effectMarks ||= [];
    if (!target.effectMarks.includes('teia')) target.effectMarks.push('teia');
    log(`${p.name} colocou Teia em ${CARDS[target.key].name} para o próximo turno.`);
  }

  render();
  winCheck();
  endTurnIfBlocked(pi);
  return true;
}
function returnSelected() {
  if (!validMove(0)) { blockAction('Não é o seu turno.'); return; }
  if (state.players[0].moves <= 0) { blockAction('Você não tem movimento disponível.'); return; }
  let s = state.selectedField;
  if (!s) { blockAction('Selecione uma carta no campo.'); return; }
  if (returnToHand(0, s.zone, s.slot)) { state.selectedField = null; render(); }
}
function sellSelected() {
  const p = state.players[0];
  if (!validMove(0)) { blockAction('Não é o seu turno.'); return; }
  if (p.std <= 0) { blockAction('Você já gastou sua ação padrão.'); return; }

  const cleanupActiveEffect = (c) => {
    if (!c || CARDS[c.key]?.type !== 'effect') return;
    if (c.key === 'adubo') p.adubo = 0;
    if (c.key === 'formigueiro') p.antiSteal = 0;
    if (c.key === 'lupa' || c.key === 'teia') {
      const enemy = state.players[1];
      for (const target of fieldCards(1)) {
        if (!target.effectMarks?.includes(c.key)) continue;
        if (c.key === 'lupa') target.lupa = 0;
        if (c.key === 'teia') { target.teia = 0; target.skipAttack = 0; }
        target.effectMarks = target.effectMarks.filter(mark => mark !== c.key);
      }
    }
  };

  if (state.selected !== null) {
    const c = p.hand[state.selected];
    if (!c) { blockAction('A carta selecionada não existe mais.'); return; }
    p.hand.splice(state.selected, 1); state.grave.push(c);
    p.leaves = Math.min(15, p.leaves + 1); animateLeafDelta(0, 1, document.getElementById('playerLeafTokens')); p.std--; state.selected = null;
    log(`${p.name} vendeu ${CARDS[c.key].name} por 1 folha.`);
    render(); winCheck(); endTurnIfBlocked(0); return;
  }

  const c = getSelectedField();
  if (!c) { blockAction('Selecione uma carta da mão ou do campo para vender.'); return; }
  const s = state.selectedField;
  if (c.root > 0) { blockAction(`${CARDS[c.key].name} está presa e não pode ser vendida agora.`); return; }
  cleanupActiveEffect(c);
  if (s.zone === 'front') p.front = null; else p.bank[s.slot] = null;
  state.grave.push(c); p.leaves = Math.min(15, p.leaves + 1); animateLeafDelta(0, 1, document.getElementById('playerLeafTokens')); p.std--; state.selectedField = null;
  log(`${p.name} vendeu ${CARDS[c.key].name} por 1 folha.`);
  render(); winCheck(); endTurnIfBlocked(0);
}
function playerDraw() {
  const p = state.players[0];
  if (!validMove(0)) { blockAction('Não é o seu turno.'); return; }
  if (p.std <= 0) { blockAction('Você já gastou sua ação padrão.'); return; }
  if (p.leaves < 3) { blockAction('Você precisa de 3 folhas para comprar uma carta.'); return; }
  if (!state.deck.length) { blockAction('A Natureza está sem cartas.'); return; }
  if (drawCost(0)) { p.std--; render(); endTurnIfBlocked(0); }
}
function secondMove() {
  const p = state.players[0];
  if (!validMove(0)) { blockAction('Não é o seu turno.'); return; }
  if (p.std <= 0) { blockAction('Você já gastou sua ação padrão.'); return; }
  if (p.moves >= 2) { blockAction('Você já possui o máximo de 2 movimentos neste turno.'); return; }
  if (!hasAvailableMove(0)) { blockAction('Não existe nenhum movimento válido disponível.'); return; }
  p.std--; p.moves += 1; state.selectedField = null;
  log('Você abriu mão da ação padrão para ganhar mais um movimento.');
  render(); endTurnIfBlocked(0);
}
function harvest(pi) {
  if (!validMove(pi)) { if (pi === 0) blockAction('Não é o seu turno.'); return false; }
  const p = state.players[pi];
  if (p.std <= 0) { if (pi === 0) blockAction('Você já gastou sua ação padrão.'); return false; }
  if (p.leaves >= 15) { if (pi === 0) blockAction('Você já está com o máximo de 15 folhas.'); return false; }
  const gain = p.adubo > 0 ? 2 : 1;
  p.leaves = Math.min(15, p.leaves + gain);
  FX.boardState('fx-harvest',550);
  FX.leaves(document.querySelector('.natureza .pile'), document.getElementById(pi===0?'playerLeaves':'enemyLeaves'));
  p.std--; log(`${p.name} colheu ${gain} folha(s).`);
  render(); endTurnIfBlocked(pi); return true;
}
function showEnemyActions(actions, title = 'AÇÕES DO BOT') { let popup = document.getElementById('enemyActionPopup'); if (!popup || !actions.length) return; popup.innerHTML = `<strong>${title}</strong>${actions.map(action => `<span>${action}</span>`).join('')}`; popup.classList.add('is-visible'); }
function hideEnemyActions() { let popup = document.getElementById('enemyActionPopup'); if (popup) popup.classList.remove('is-visible'); }
// ================================================================
// BOT
// IA simples baseada em prioridade de custo, campo e ataque.
// ================================================================
function aiBestCard() { let p = state.players[1]; return p.hand.map((c, i) => ({ c, i, d: CARDS[c.key] })).filter(x => !x.d.type && x.d.cost <= p.leaves).sort((a, b) => (b.d.atk + b.d.hp - a.d.cost) - (a.c.atk + a.c.hp - b.d.cost))[0] }
function botTurn() { if (!state.players[1]?.bot) return; setTimeout(() => { if (state.over || !state.players[1]?.bot || state.turn !== 1) return; let p = state.players[1], o = state.players[0], actions = [], direct = false; if (p.leaves < 8 && p.std) { harvest(1); actions.push('Colheu folhas.') } let x = aiBestCard(); if (x && p.moves) { let zone = !p.front ? 'front' : p.bank.findIndex(v => !v) >= 0 ? 'bank' : null; if (zone === 'front') { summonFromHand(1, x.i, 'front', 0); actions.push(`Invocou ${CARDS[x.c.key].name}.`) } else if (zone === 'bank') { summonFromHand(1, x.i, 'bank', p.bank.findIndex(v => !v)); actions.push(`Colocou ${CARDS[x.c.key].name} no Banco.`) } } if (p.std) { let targets = o.front ? [o.front] : o.bank.filter(Boolean); if (p.front && targets.length) { let t = targets.sort((a, b) => a.hp - b.hp)[0]; attack(1, p.front, t); actions.push(`Atacou com ${CARDS[p.front.key].name}.`) } else if (state.round > 1 && directAttack(1)) { actions.push('Fez um ataque direto.'); direct = true } } if (p.std && p.leaves >= 3 && state.deck.length) { drawCost(1); p.std--; actions.push('Comprou uma carta.') } if (p.std) { harvest(1); actions.push('Colheu folhas.') } showEnemyActions(actions, direct ? 'ATAQUE DIRETO DO BOT' : 'AÇÕES DO BOT'); if (!state.over) endTurn(1) }, 850) }
// ================================================================
// DRAG & DROP
// Cartas do jogador podem ser arrastadas para os slots válidos.
// ================================================================
function prepareDropTargets(c) { if (state.turn !== 0 || state.over) return; document.querySelectorAll('#pf0,#pb0,#pb1,#pb2,#ef0,#eb0,#eb1,#eb2').forEach(s => s.classList.add('drop-ready')); document.getElementById('hand').classList.add('drop-ready') }
function clearDropTargets() { document.querySelectorAll('.slot').forEach(s => s.classList.remove('drop-ready', 'drag-over')); document.getElementById('hand').classList.remove('drop-ready', 'drag-over') }
function findPlayerCardById(id) { let p = state.players[0]; if (!p) return null; let hi = p.hand.findIndex(c => c.id === id); if (hi >= 0) return { c: p.hand[hi], zone: 'hand', slot: hi }; if (p.front && p.front.id === id) return { c: p.front, zone: 'front', slot: 0 }; for (let i = 0; i < 3; i++)if (p.bank[i] && p.bank[i].id === id) return { c: p.bank[i], zone: 'bank', slot: i }; return null }
function handleDropOnHand(e) { e.preventDefault(); let found = findPlayerCardById(e.dataTransfer.getData('text/plain')); if (!found || found.zone === 'hand' || state.turn !== 0 || state.over) return; if (returnToHand(0, found.zone, found.slot)) { state.selectedField = null; clearDropTargets(); render(); winCheck() } }
function handleDropOnSlot(slotEl, e) {
  e.preventDefault(); slotEl.classList.remove('drag-over');
  const id = e.dataTransfer.getData('text/plain'); const found = findPlayerCardById(id);
  if (!found || state.turn !== 0 || state.over) return;
  const targetId = slotEl.id; const p = state.players[0], o = state.players[1];
  const enemyTarget = targetId === 'ef0' || targetId.startsWith('eb');
  if (enemyTarget) {
    const targetCard = targetId === 'ef0' ? o.front : o.bank[Number(targetId.slice(-1))];
    if (!targetCard) { blockAction('Esse espaço está vazio.'); return; }
    if (found.zone === 'hand' && ['inseticida','lupa','teia'].includes(found.c.key)) { resolveTargetEffect(0, found.slot, targetCard); clearDropTargets(); return; }
    if (found.zone === 'front') {
      if (!isValidAttackTarget(found.c, targetCard)) { blockAction('Esse alvo está protegido pelo Fronte.'); return; }
      attack(0, found.c, targetCard); clearDropTargets(); return;
    }
    blockAction('Somente o inseto no Fronte pode atacar.'); return;
  }
  const zone = targetId === 'pf0' ? 'front' : 'bank'; const slot = zone === 'bank' ? Number(targetId.slice(-1)) : 0;
  const destCard = zone === 'front' ? p.front : p.bank[slot];
  if (found.zone === 'hand' && CARDS[found.c.key]?.equip) {
    if (!destCard || !insect(destCard)) { blockAction('Arraste o equipamento sobre um inseto próprio.'); return; }
    equip(0, found.slot, destCard); clearDropTargets(); return;
  }
  if (found.zone === 'hand' && CARDS[found.c.key]?.type === 'effect') {
    activateEffect(0, found.slot, 'bank', zone === 'bank' ? slot : -1); clearDropTargets(); return;
  }
  if ((found.zone === 'front' || found.zone === 'bank') && destCard && found.c !== destCard) {
    if (insect(found.c) && insect(destCard)) { swapFieldCards(0, found.zone, found.slot, zone, slot); clearDropTargets(); return; }
    blockAction('Somente insetos podem trocar de posição.'); return;
  }
  if (destCard) { blockAction('Esse espaço já está ocupado.'); return; }
  if (found.zone === 'hand') summonFromHand(0, found.slot, zone, slot);
  else if (found.zone === 'front' && zone === 'bank') moveCard(0, 'front', slot);
  else if (found.zone === 'bank' && zone === 'front') {
    if (p.moves <= 0) { blockAction('Você não tem movimento disponível.'); return; }
    const c = p.bank[found.slot];
    if (!c || !insect(c)) { blockAction('Somente insetos podem ocupar o Fronte.'); return; }
    if (c.root > 0) { blockAction(`${CARDS[c.key].name} está presa e não pode se mover.`); return; }
    p.bank[found.slot] = null; p.front = c; p.moves--; log(`${p.name} moveu ${CARDS[c.key].name} para o Fronte.`); render(); endTurnIfBlocked(0);
  }
}
function installDropTargets() { document.querySelectorAll('#pf0,#pb0,#pb1,#pb2,#ef0,#eb0,#eb1,#eb2').forEach(slot => { slot.addEventListener('dragover', e => { if (!e.dataTransfer.types.includes('text/plain')) return; e.preventDefault(); if (state.turn === 0 && !state.over) slot.classList.add('drag-over') }); slot.addEventListener('dragleave', () => slot.classList.remove('drag-over')); slot.addEventListener('drop', e => handleDropOnSlot(slot, e)); }); let hand = document.getElementById('hand'); hand.addEventListener('dragover', e => { if (!e.dataTransfer.types.includes('text/plain')) return; e.preventDefault(); if (state.turn === 0 && !state.over) hand.classList.add('drag-over') }); hand.addEventListener('dragleave', () => hand.classList.remove('drag-over')); hand.addEventListener('drop', handleDropOnHand); }
function syncTouchCardIds() {
  let p = state.players[0];
  if (!p) return;
  document.querySelectorAll('#hand .card').forEach((el, i) => { el.draggable = false; el.dataset.enemy = 'false'; if (p.hand[i]) el.dataset.cardId = p.hand[i].id });
  let fields = [['#pf0 .card', p.front], ['#pb0 .card', p.bank[0]], ['#pb1 .card', p.bank[1]], ['#pb2 .card', p.bank[2]]];
  fields.forEach(([selector, c]) => { let el = document.querySelector(selector); if (el && c) { el.draggable = false; el.dataset.enemy = 'false'; el.dataset.cardId = c.id } });
}
function updateMobileHandVisibility() {
  let handPanel = document.querySelector('.hand-panel');
  let menu = document.querySelector('.left-sidebar');
  if (!handPanel || !menu) return;
  let threshold = menu.offsetTop + menu.offsetHeight;
  handPanel.classList.toggle('mobile-hand-visible', window.innerWidth > 900 || window.scrollY >= threshold);
}
function installTouchDrag() {
  let drag = null;
  document.addEventListener('pointerdown', e => {
    let cardEl = e.target.closest('.card');
    if (!cardEl || cardEl.dataset.enemy === 'true' || !cardEl.dataset.cardId) return;
    e.preventDefault();
    let ghost = cardEl.cloneNode(true);
    ghost.classList.add('pointer-drag-ghost');
    ghost.style.width = `${cardEl.getBoundingClientRect().width}px`;
    ghost.style.height = `${cardEl.getBoundingClientRect().height}px`;
    document.body.appendChild(ghost);
    drag = { id: cardEl.dataset.cardId, x: e.clientX, y: e.clientY, moved: false, el: cardEl, ghost, pointerId: e.pointerId };
    cardEl.classList.add('dragging');
    prepareDropTargets(cardEl);
    moveGhost(e);
  }, { passive: true });
  document.addEventListener('pointermove', e => {
    if (!drag) return;
    e.preventDefault();
    moveGhost(e);
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) {
      drag.moved = true;
      drag.el.classList.add('dragging');
    }
  }, { passive: false });
  function moveGhost(e) {
    if (!drag) return;
    drag.ghost.style.transform = `translate3d(${e.clientX - drag.ghost.offsetWidth / 2}px, ${e.clientY - drag.ghost.offsetHeight / 2}px, 0)`;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    let target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.slot, #hand');
    if (target) target.classList.add('drag-over');
  }
  function finishTouchDrag(e) {
    if (!drag) return;
    let current = drag;
    drag = null;
    current.el.classList.remove('dragging');
    current.ghost.remove();
    if (!current.moved || !current.id) { clearDropTargets(); return; }
    touchDropAt = Date.now() + 350;
    let target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.slot, #hand');
    let fakeEvent = { preventDefault() {}, dataTransfer: { getData() { return current.id } } };
    if (target?.id === 'hand') handleDropOnHand(fakeEvent);
    else if (target?.classList.contains('slot')) handleDropOnSlot(target, fakeEvent);
    clearDropTargets();
  }
  document.addEventListener('pointerup', finishTouchDrag, { passive: true });
  document.addEventListener('pointercancel', finishTouchDrag, { passive: true });
}
function renderGrave() {
  let top = document.getElementById('graveTop');
  if (!top) return;
  top.innerHTML = '';
  let c = state.grave[state.grave.length - 1];
  if (!c) return;
  let d = CARDS[c.key];
  let art = CARD_IMAGES[c.key];
  top.innerHTML = art
    ? `<img class="grave-art" src="${art}" alt="${d.name}"><span class="grave-name">${d.name}</span>`
    : `<span class="grave-emoji">${d.emoji}</span><span class="grave-name">${d.name}</span>`;
}
function animateLeafDelta(pi, delta, sourceEl) { if (!delta || typeof FX === 'undefined' || !FX.leafTokens) return; FX.leafTokens(pi, delta, sourceEl); }
function renderLeafTokens(id, count) {
  const host = document.getElementById(id);
  if (!host) return;
  const total = Math.max(0, Math.min(15, Number(count) || 0));
  host.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const token = document.createElement('img');
    token.className = 'leaf-token';
    token.src = 'assets/ui/ficha-folha.png';
    token.alt = 'Ficha de folha';
    token.draggable = false;
    token.title = `Ficha ${i + 1}`;
    host.appendChild(token);
  }
}
// ================================================================
// RENDERIZAÇÃO
// Atualiza o tabuleiro inteiro a partir do estado atual.
// ================================================================
function render() {
  refreshPassiveStats(); const p = state.players[0], o = state.players[1]; if (!p || !o) return;
  document.getElementById('round').textContent = state.round; document.getElementById('turn').textContent = state.turn === 0 ? 'VOCÊ' : (o.bot ? 'BOT' : 'ADVERSÁRIO'); document.getElementById('turnNo').textContent = state.round;
  document.getElementById('deckCount').textContent = state.deck.length; document.getElementById('deckCount2').textContent = state.deck.length; document.getElementById('graveCount').textContent = state.grave.length; document.getElementById('graveCount2').textContent = state.grave.length;
  document.getElementById('playerLeaves').textContent = p.leaves; document.getElementById('enemyLeaves').textContent = o.leaves; renderLeafTokens('playerLeafTokens', p.leaves); renderLeafTokens('enemyLeafTokens', o.leaves);
  document.getElementById('playerName').textContent = p.name.toUpperCase(); document.getElementById('moves').textContent = p.moves; document.getElementById('std').textContent = p.std;
  document.getElementById('draw').disabled = state.turn !== 0 || p.std <= 0 || p.hand.length >= handLimit(0) || p.leaves < 3 || !state.deck.length;
  document.getElementById('harvest').disabled = state.turn !== 0 || p.std <= 0 || p.leaves >= 15;
  document.getElementById('attackBtn').disabled = state.turn !== 0 || state.over || p.std <= 0 || !p.front;
  document.getElementById('secondMove').disabled = state.turn !== 0 || state.over || p.moves <= 0 || p.std <= 0;
  document.getElementById('returnBtn').disabled = state.turn !== 0 || state.over || p.moves <= 0 || !state.selectedField || p.hand.length >= handLimit(0);
  document.getElementById('sell').disabled = state.turn !== 0 || p.std <= 0 || (state.selected === null && !state.selectedField); document.getElementById('end').disabled = state.turn !== 0 || state.over;
  document.getElementById('attackBtn').classList.toggle('waiting', !!(state.targetMode && state.targetMode.type === 'attack')); document.getElementById('returnBtn').classList.toggle('waiting', !!state.selectedField); document.getElementById('sell').classList.toggle('waiting', !!(state.selected !== null || state.selectedField));
  renderSlot('ef0', o.front, true, true); for (let i=0;i<3;i++){ renderSlot('eb'+i,o.bank[i],true,false); renderSlot('pb'+i,p.bank[i],false,false); } renderSlot('pf0',p.front,false,true);
  const h=document.getElementById('hand'); h.innerHTML=''; p.hand.forEach((c,i)=>{ const el=makeCard(c,false); if(state.selected===i) el.classList.add('selected'); el.onclick=()=>clickCard(0,'hand',i); h.appendChild(el); });
  const hc=document.getElementById('handCount'); if(hc) hc.textContent=`${p.hand.length}/${handLimit(0)}`; const hs=document.getElementById('handStatus'); if(hs) hs.textContent=p.hand.length>=handLimit(0)?'MÃO CHEIA':`${handLimit(0)-p.hand.length} ESPAÇOS`;
  document.getElementById('log').innerHTML=state.log.map(x=>`<div>› ${x}</div>`).join(''); renderGrave(); updateCardInspector();
}
function renderSlot(id, c, enemy, front) { let s = document.getElementById(id); s.innerHTML = ''; if (!c) { s.textContent = front ? 'FRONTE' : 'BANCO'; return } let el = makeCard(c, enemy); el.draggable = false; el.dataset.enemy = enemy ? 'true' : 'false'; el.dataset.cardId = c.id; if (front) el.classList.add('fronte-card'); if (!enemy && state.selectedField && state.selectedField.zone === (front ? 'front' : 'bank') && state.selectedField.slot === (front ? 0 : Number(id.slice(-1)))) el.classList.add('selected'); if (c.equipment && c.equipment.length) { el.classList.add('equipped-card'); c.equipment.forEach(item => { let badge = document.createElement('span'); badge.className = 'equipment-preview'; badge.textContent = CARDS[item.key].emoji; el.appendChild(badge) }) } if (c.activeTurns > 0) { let counter = document.createElement('span'); counter.className = 'effect-counter'; counter.textContent = `${c.activeTurns} turnos`; el.appendChild(counter) } s.appendChild(el); el.onclick = () => clickCard(enemy ? 1 : 0, front ? 'front' : 'bank', front ? 0 : Number(id.slice(-1))); if (!enemy) el.title = 'Clique para selecionar'; }
// Cria o elemento visual de uma carta e liga eventos de interação.
function makeCard(c, enemy) {
  const d = CARDS[c.key], el = document.createElement('div');
  const art = CARD_IMAGES[c.key], marks = c.effectMarks || [];
  el.className = 'card' + (enemy ? ' enemy-card' : '') + (art ? ' has-art' : '');
  if (marks.includes('lupa')) el.classList.add('affected-lupa');
  if (marks.includes('teia')) el.classList.add('affected-teia');
  if (marks.includes('aranha')) el.classList.add('affected-aranha');
  if (marks.includes('centopeia')) el.classList.add('affected-centopeia');
  el.draggable = !enemy;
  const hp = Math.max(0, c.hp), atk = Math.max(0, c.atk);
  el.innerHTML = `${art ? `<div class="card-art-wrap"><img class="card-art" src="${art}" alt="${d.name}" draggable="false"></div>` : ''}<span class="card-cost">${d.cost} 🍃</span><div class="card-body"><div class="card-silhouette">${art ? '' : d.emoji}</div></div><div class="card-footer"><div class="card-name">${d.name}</div><div class="card-stats"><span class="atk">⚔ ${atk}</span><span class="hp">♥ ${hp}/${c.maxHp || ''}</span></div></div>`;
  if (marks.length) {
    const badge = document.createElement('span');
    badge.className = 'card-effects';
    badge.textContent = marks.map(mark => ({lupa:'🔎', teia:'🕸️', aranha:'🕷️', centopeia:'🐛'}[mark] || '•')).join(' ');
    badge.title = marks.map(mark => ({lupa:'Lupa', teia:'Teia', aranha:'Aranha', centopeia:'Centopeia'}[mark] || mark)).join(' · ');
    el.appendChild(badge);
  }
  if (!enemy) {
    el.addEventListener('dragstart', e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.id); el.classList.add('dragging'); prepareDropTargets(c) });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); clearDropTargets() });
  }
  return el;
}
// ================================================================
// TOOLTIPS E MODAIS
// ================================================================
function showTip() {}
function hideTip() {}
function updateCardInspector() {
  const panel=document.getElementById('cardInspector'); if(!panel) return; const p=state.players[0]; let c=null,source='';
  if(state.selected!==null && p?.hand[state.selected]){ c=p.hand[state.selected]; source='MÃO'; } else if(state.selectedField){ c=getSelectedField(); source=state.selectedField.zone==='front'?'FRONTE':'BANCO'; }
  if(!c){ panel.classList.remove('is-visible'); panel.setAttribute('aria-hidden','true'); return; }
  const d=CARDS[c.key], art=CARD_IMAGES[c.key], eq=(c.equipment||[]).map(e=>CARDS[e.key]?.name).filter(Boolean);
  panel.querySelector('.inspector-source').textContent=source; panel.querySelector('.inspector-art').innerHTML=art?`<img src="${art}" alt="${d.name}">`:`<span>${d.emoji}</span>`; panel.querySelector('.inspector-name').textContent=d.name;
  panel.querySelector('.inspector-stats').innerHTML=`<span class="inspect-atk">⚔ ${Math.max(0,c.atk)}</span><span class="inspect-hp">♥ ${Math.max(0,c.hp)}/${c.maxHp||''}</span>`;
  panel.querySelector('.inspector-meta').textContent=`${d.cost} folhas · ${d.type==='effect'?'EFEITO':'INSETO'} · ${d.cond}`; panel.querySelector('.inspector-ability').textContent=d.ability+(c.customAbility?` · Copiada: ${c.customAbility}`:''); panel.querySelector('.inspector-equipment').textContent=eq.length?`Equipamentos: ${eq.join(', ')}`:'Sem equipamentos';
  const btn=document.getElementById('inspectUse'); btn.hidden=d.type!=='effect'; btn.textContent=d.equip?'EQUIPAR':'USAR EFEITO'; btn.onclick=()=>{ if(state.selected!==null){ playEffect(0,state.selected); if(state.targetMode) msg(state.targetMode.type==='equip'?`Selecione o inseto para equipar ${d.name}.`:`Selecione o alvo de ${d.name}.`); render(); } }; panel.classList.add('is-visible'); panel.setAttribute('aria-hidden','false');
}
function showVagalumeReveal(reveal) {
  if (!reveal || !reveal.keys?.length || reveal.viewer !== 0) return;
  let popup = document.getElementById('vagalumeReveal');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'vagalumeReveal';
    document.body.appendChild(popup);
  }
  const cards = reveal.keys.map(key => {
    const d = CARDS[key], art = CARD_IMAGES[key];
    return `<article class="vagalume-reveal-card"><div class="vagalume-card-art">${art ? `<img src="${art}" alt="${d.name}">` : `<span>${d.emoji}</span>`}</div><strong>${d.name}</strong><small>${d.cost} 🍃 · ${d.atk ?? 0} ATK · ${d.hp ?? 0} HP</small></article>`;
  }).join('');
  popup.innerHTML = `<div class="vagalume-reveal-panel"><div class="vagalume-kicker">VAGA-LUME</div><h2>DUAS CARTAS REVELADAS</h2><p>Cartas aleatórias da mão de <b>${String(reveal.owner || 'adversário').replace(/[<>&"']/g,'')}</b></p><div class="vagalume-reveal-cards">${cards}</div><button class="btn btn-primary" id="vagalumeRevealClose">CONTINUAR</button></div>`;
  popup.classList.add('is-visible');
  document.getElementById('vagalumeRevealClose').onclick = () => popup.classList.remove('is-visible');
}

function showModal(html) { document.getElementById('modalContent').innerHTML = html; document.getElementById('overlay').style.display = 'flex' } function rules() { showModal(`<h2>INSETO CARDS — REGRAS</h2><ul><li>2 jogadores; cada um tem 1 Fronte, 3 Banco e mão própria. Natureza e Cemitério são compartilhados.</li><li>Cada turno: 1 Movimento + 1 Ação Padrão. Você pode abrir mão da Padrão para ganhar um segundo Movimento.</li><li>Movimento: invocar carta, mover campo, trocar a posição de dois insetos aliados por arraste ou devolver carta sem dano à mão.</li><li>Padrão: atacar, colher +1, vender, ou comprar da Natureza por 3 folhas.</li><li>Começo: 5 folhas e 3 cartas. A partir da rodada 2: +1 folha automática. Limite de 15 folhas e 6 cartas na mão.</li><li>Combate é mútuo. O Fronte só pode atacar Banco se o Fronte inimigo estiver vazio, exceto Meganeura.</li><li>Vitória: eliminar todos os insetos da mão e do campo inimigo; efeitos não contam.</li></ul><h3 style="color:var(--amber);margin:10px 0 5px">Decisões necessárias para a implementação</h3><p>Venda = +1 folha; Vaga-lume revela 2 cartas aleatórias da mão do inimigo em um pop-up; empate técnico = se ambos zerarem na mesma resolução, a partida termina empatada. A mão inicial foi fixada em 3, conforme as simulações mencionadas no GDD.</p><p class="small" style="margin-top:10px">O baralho usa as 41 cartas atualmente disponíveis, uma cópia de cada.</p>`) }
document.getElementById('start').onclick = init; document.getElementById('restart').onclick = () => { document.getElementById('start').disabled = false; init() }; document.getElementById('rules').onclick = rules; document.getElementById('draw').onclick = playerDraw; document.getElementById('harvest').onclick = () => harvest(0); document.getElementById('attackBtn').onclick = attackPlayer; document.getElementById('secondMove').onclick = secondMove; document.getElementById('returnBtn').onclick = returnSelected; document.getElementById('sell').onclick = sellSelected; document.getElementById('end').onclick = () => { if (validMove(0)) endTurn(0) }; document.getElementById('modalClose').onclick = () => document.getElementById('overlay').style.display = 'none';
document.addEventListener('click', e => { hideEnemyActions(); if(e.target.closest('.card,button,input,.action,.start-menu,.card-inspector')) return; state.selected=null; state.selectedField=null; state.targetMode=null; hideTip(); if(state.started) render(); }); document.addEventListener('keydown', e => { hideEnemyActions(); if(e.key==='Escape'){ state.selected=null; state.selectedField=null; state.targetMode=null; hideTip(); if(state.started) render(); } });
renderLeafTokens('playerLeafTokens', 5); renderLeafTokens('enemyLeafTokens', 5);
document.querySelector('.version-badge').textContent = `v${APP_VERSION}`;
const renderWithActionControls = render;
render = function() {
  renderWithActionControls();
  renderGrave();
  const p = state.players[0];
  if (p) {
    document.getElementById('secondMove').disabled = state.turn !== 0 || state.over || p.std <= 0 || p.moves >= 2 || !hasAvailableMove(0);
    document.getElementById('stdActions').textContent = p.std;
    document.getElementById('moveActions').textContent = p.moves;
    document.getElementById('handLeaves').textContent = p.leaves;
    document.getElementById('handStd').textContent = p.std;
    document.getElementById('handMoves').textContent = p.moves;
    syncTouchCardIds();
  }
};
window.addEventListener('scroll', updateMobileHandVisibility, { passive: true });
window.addEventListener('resize', updateMobileHandVisibility);
FX.init(); installDropTargets(); installTouchDrag(); render(); updateMobileHandVisibility(); log('Pronto. Clique em INICIAR PARTIDA.');
