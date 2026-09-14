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
  vaga: { name: 'Vaga-lume', cost: 1, atk: 1, hp: 2, emoji: '✨', cond: 'Invocado', ability: 'Revela 2 cartas da mão inimiga (implementado como informação temporária).' },
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
  propolis: { name: 'Própolis', cost: 3, type: 'effect', emoji: '🍯', cond: 'Não equipável', ability: 'Ocupa o Fronte por 3 rodadas, protege as cartas do Banco e não pode ser destruído nesse tempo.' },
  formigueiro: { name: 'Formigueiro', cost: 3, type: 'effect', emoji: '🏠', cond: 'Ativado', ability: 'Suas folhas não podem ser roubadas por 3 rodadas.' }
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
const DECK_KEYS = Object.keys(CARDS); // 40 cartas disponíveis, uma cópia de cada carta
// ================================================================
// 2. ESTADO DA PARTIDA
// Guarda jogadores, baralho, cemitério, turno e seleção do jogador.
// ================================================================
const APP_VERSION = '1.8.3'; // X=reforma, Y=adição, Z=correção de bug.
const state = { started: false, over: false, round: 1, turn: 'player', deck: [], grave: [], players: [null, null], selected: null, targetMode: null, log: [], skip: [false, false], tie: false };
function P(name, bot = false) { return { name, bot, leaves: 5, hand: [], front: null, bank: [null, null, null], moves: 1, std: 1, passiveBuy: false, adubo: 0, antiSteal: 0, revealed: 0 }; }
function card(key, owner) { let c = CARDS[key]; return { id: Math.random().toString(36).slice(2), key, owner, atk: c.atk ?? 0, hp: c.hp ?? 0, maxHp: c.hp ?? 0, baseAtk: c.atk ?? 0, baseHp: c.hp ?? 0, damage: 0, buffs: [], equipment: [], activeTurns: 0, poison: 0, poisonTurns: 0, root: 0, skipAttack: 0, reload: 0, protectedOnce: key === 'louva', barataUsed: false, mel: false, customAbility: null, copiedKey: null, debuffNext: false }; }
function insect(x) { return x && CARDS[x.key] && CARDS[x.key].type !== 'effect' }
// ---------------------------------------------------------------
// Utilitários de interface e registro da partida.
// ---------------------------------------------------------------
function log(t) { state.log.unshift(t); if (state.log.length > 70) state.log.pop(); document.getElementById('log').innerHTML = state.log.map(x => `<div>› ${x}</div>`).join('') }
function msg(t) { document.getElementById('message').textContent = t }
function init() {
  state.started = true; state.over = false; state.round = 1; state.turn = 'player'; state.grave = []; state.selected = null; state.targetMode = null; state.skip = [false, false]; state.players = [P((document.getElementById('name').value || 'Jogador').trim() || 'Jogador'), P('BOT', true)]; state.deck = [...DECK_KEYS].sort(() => Math.random() - .5); for (let i = 0; i < 3; i++) { drawRaw(0); drawRaw(1) }; log('Partida iniciada. Mão inicial: 3 cartas.'); document.getElementById('enemyName').textContent = 'BOT';// ================================================================
  // EVENTOS DA INTERFACE
  // ================================================================
  document.getElementById('start').disabled = true; startTurn(0); render()
}
function drawRaw(pi) { if (!state.deck.length) return null; let k = state.deck.pop(); let c = card(k, pi); state.players[pi].hand.push(c); return c }
function drawCost(pi) { let p = state.players[pi]; if (p.leaves < 3 || !state.deck.length) return false; p.leaves -= 3; FX.boardState('fx-draw',650); FX.ring(document.querySelector('.natureza .pile')); FX.leaves(document.querySelector('.natureza .pile'), document.getElementById(pi===0?'playerLeaves':'enemyLeaves')); let c = drawRaw(pi); if (c) log(`${p.name} comprou ${CARDS[c.key].name} por 3 folhas.`); return !!c }
function drawFree(pi, n) { for (let i = 0; i < n; i++) { let c = drawRaw(pi); if (c) log(`${state.players[pi].name} recebeu ${CARDS[c.key].name} grátis.`) } }
function countField(pi) { let p = state.players[pi]; return (p.front ? 1 : 0) + p.bank.filter(Boolean).length }
function allInsectsGone(pi) { let p = state.players[pi]; return !p.hand.some(insect) && !p.front && !p.bank.some(Boolean) }
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
    showModal(`<div class="win">${winner === 0 ? 'VOCÊ VENCEU!' : 'BOT VENCEU!'}</div><p>Condição: todas as cartas inseto do adversário foram derrotadas e ele não conseguiu comprar outra carta com 3 folhas.</p>`);
    return true;
  }
  return false;
}
function startTurn(pi) { if (state.over) return; state.turn = pi; let p = state.players[pi]; p.moves = 1; p.std = 1; if (state.skip[pi]) { state.skip[pi] = false; p.moves = 0; p.std = 0; log(`${p.name} perdeu este turno.`); if (pi === 1) { setTimeout(() => endTurn(1), 700) } return } if (state.round > 1) { p.leaves = Math.min(15, p.leaves + 1) }; for (let x of [p.front, ...p.bank]) if (x) { if (x.root > 0) x.root--; if (x.skipAttack > 0) x.skipAttack--; if (x.reload > 0) x.reload--; if (x.poisonTurns > 0) { if (x.key !== 'bichoPau') x.hp -= 1; x.poisonTurns--; log(`${CARDS[x.key].name} sofreu 1 de Veneno.`) } else x.poison = 0; if (x.lupa > 0) { if (x.key !== 'bichoPau') x.hp -= 2; x.lupa--; log(`${CARDS[x.key].name} sofreu 2 dano da Lupa.`); if (x.hp <= 0) defeat(p, x, 1 - pi) } if (x.activeTurns > 0) { x.activeTurns--; if (x.activeTurns === 0) { let ix = p.bank.indexOf(x); if (ix >= 0) p.bank[ix] = null; if (p.front === x) p.front = null; state.grave.push(x); log(`${CARDS[x.key].name} acabou e foi para o Cemitério.`) } } }; if (p.adubo > 0) p.adubo--; if (p.antiSteal > 0) p.antiSteal--; if (pi === 0) msg('Seu turno. Escolha uma ação.'); else botTurn() }
function endTurn(pi) { if (state.over) return; if (pi === 0) startTurn(1); else { state.round++; startTurn(0) }; render(); winCheck() }
// ---------------------------------------------------------------
// Validação de ações e recursos.
// ---------------------------------------------------------------
function validMove(pi) { return state.turn === pi && !state.over }
// ---------------------------------------------------------------
// Invocação e posicionamento de cartas.
// ---------------------------------------------------------------
function summonFromHand(pi, idx, zone, slot) { let p = state.players[pi], c = p.hand[idx]; if (!c) return false; let d = CARDS[c.key]; if (d.type === 'effect') return playEffect(pi, idx); if (p.leaves < d.cost || p.moves <= 0) return false; if (zone === 'front' && p.front) return false; if (zone === 'bank' && p.bank[slot]) return false; p.leaves -= d.cost; FX.boardState('fx-summon',600); FX.ring(document.getElementById(zone==='front' ? (pi===0?'pf0':'ef0') : (pi===0?'pb'+slot:'eb'+slot))); p.hand.splice(idx, 1); c.owner = pi; if (zone === 'front') p.front = c; else p.bank[slot] = c; p.moves--; log(`${p.name} invocou ${d.name} no ${zone === 'front' ? 'Fronte' : 'Banco'}.`); onSummon(pi, c); triggerCopied(p.front && p.front !== c ? p.front : null, 'summon', pi, c); triggerCopied(c, 'summon', pi, c); render(); winCheck(); return true }
function onSummon(pi, c) { let p = state.players[pi], o = state.players[1 - pi], d = CARDS[c.key]; if (c.key === 'borboleta') { for (let x of [p.front, ...p.bank]) if (x) x.hp = x.maxHp }; if (c.key === 'mosca') { let ix = state.grave.findIndex(x => CARDS[x.key].type !== 'effect'); if (ix >= 0) { let old = state.grave.splice(ix, 1)[0]; let nc = card(old.key, pi); nc.atk = Math.max(1, Math.floor(old.atk / 2)); nc.hp = Math.max(1, Math.floor(old.maxHp / 2)); nc.maxHp = nc.hp; p.hand.push(nc) } } if (c.key === 'formigaRainha') drawFree(pi, countField(pi) - 1); if (c.key === 'pulga') steal(pi, 1); if (c.key === 'vaga') { o.revealed = 2; log(`${p.name} revelou 2 cartas da mão do BOT por informação temporária.`) } if (c.key === 'libelula') c.root = 0 }
// ---------------------------------------------------------------
// Movimentação entre Banco e Fronte.
// ---------------------------------------------------------------
function moveCard(pi, from, slot) { let p = state.players[pi]; FX.boardState('fx-move',480); if (p.moves <= 0) return false; if (from === 'front') { if (!p.front) return false; let dest = p.bank.findIndex(x => !x); if (dest < 0) return false; let c = p.front; p.front = null; p.bank[dest] = c; c.root = 0; p.moves--; log(`${p.name} moveu ${CARDS[c.key].name} para o Banco.`) } else { let c = p.bank[slot]; if (!c || p.front) return false; p.bank[slot] = null; p.front = c; c.root = 0; p.moves--; log(`${p.name} moveu ${CARDS[c.key].name} para o Fronte.`) } render(); return true }
function returnToHand(pi, zone, slot) { let p = state.players[pi], c = zone === 'front' ? p.front : p.bank[slot]; FX.boardState('fx-move',480); if (!c || c.damage > 0 || p.moves <= 0 || CARDS[c.key].type === 'effect') return false; if (zone === 'front') p.front = null; else p.bank[slot] = null; p.hand.push(c); p.moves--; log(`${p.name} puxou ${CARDS[c.key].name} de volta para a mão.`); render(); return true }
function chooseAttack(pi) { let p = state.players[pi], o = state.players[1 - pi]; let a = p.front; if (!a || a.root > 0 || a.skipAttack > 0 || a.reload > 0) return false; let targets = []; if (CARDS[a.key].key === 'meganeura' || a.key === 'meganeura') targets = [o.front, ...o.bank].filter(Boolean); else if (o.front) targets = [o.front]; else targets = o.bank.filter(Boolean); if (!targets.length) return false; let t = targets[0]; return attack(pi, a, t) }
// ---------------------------------------------------------------
// Sistema de combate e resolução de dano.
// ---------------------------------------------------------------
function attack(pi, a, t) {
  let p = state.players[pi], o = state.players[1 - pi];
  if (p.std <= 0) return false;
  if (a.root > 0 || a.skipAttack > 0 || a.reload > 0) return false;
  if (!t) return false;
  let targetOwner = t === o.front ? 1 - pi : o.bank.includes(t) ? 1 - pi : -1;
  if (targetOwner >= 0 && o.bank.includes(t) && isBankProtected(targetOwner)) { msg('O Banco está protegido pelo Própolis.'); return false }
  let d = CARDS[a.key];
  p.std--;
  FX.boardState('fx-attack',700);
  FX.slash(document.querySelector('.fronte .card:not(.enemy-card)') || document.querySelector('.player-hud'), document.querySelector('.enemy-card'));
  FX.burst(document.querySelector('.enemy-card'), 16);
  let damage = Math.max(0, a.atk);
  if (a.key === 'besouro' && a.hp <= Math.ceil(a.maxHp / 2)) damage *= 2;
  if (a.key === 'cupim') clearBuffs(t);
  if (a.key === 'gafanhoto') steal(pi, 1);
  if (a.key === 'grilo') p.leaves = Math.min(15, p.leaves + 1);
  if (a.key === 'escorpiao') { t.poisonTurns = Math.max(t.poisonTurns, 2); t.poison = 1 }
  if (a.key === 'aranha' && !isImmuneRoot(t)) t.root = Math.max(t.root, 1);
  if (a.key === 'centopeia' && t.hp <= (t.maxHp / 2) && !isImmuneRoot(t)) t.root = Math.max(t.root, 2);
  if (a.key === 'meganeura') a.reload = 1;

  let dealt = damage;
  if (a.poisonTurns > 0 && a.poison > 0) dealt += 1;
  if (t.key === 'escaravelho') dealt = Math.max(0, dealt - 1);
  if (t.key === 'bichoPau') dealt = 0;
  if (t.key === 'louva' && t.protectedOnce) {
    dealt = 0;
    t.protectedOnce = false;
    log('Louva-Deus anulou o primeiro ataque recebido.');
  }

  // O defensor devolve o dano mesmo quando o golpe inicial o derrota.
  let back = insect(t) && t.key !== 'bichoPau' ? Math.max(0, t.atk) : 0;
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
  if (a.hp <= 0) defeat(p, a, 1 - pi);
  render();
  winCheck();
  return true;
}
function isImmuneRoot(c) { return c && c.key === 'libelula' }
function clearBuffs(c) { if (!c) return; c.atk = c.baseAtk; c.maxHp = c.baseHp; c.hp = Math.min(c.hp, c.maxHp); c.buffs = []; c.mel = false; log(`${CARDS[c.key].name} perdeu seus buffs.`) }
function triggerCopied(killerCard, event, pi, target) { if (!killerCard || killerCard.key !== 'maribondo' || !killerCard.copiedKey) return; let k = killerCard.copiedKey; if (event === 'defeat' && k === 'gafanhoto') steal(pi, 1); if (event === 'defeat' && k === 'mosquito') killerCard.hp = Math.min(killerCard.maxHp, killerCard.hp + 2); if (event === 'defeat' && k === 'percevejo') killerCard.hp = killerCard.maxHp; if (event === 'attack' && k === 'grilo') state.players[pi].leaves = Math.min(15, state.players[pi].leaves + 1); if (event === 'summon' && k === 'pulga') steal(pi, 1); if (event === 'summon' && k === 'borboleta') { for (let x of [state.players[pi].front, ...state.players[pi].bank]) if (x) x.hp = x.maxHp } }
function defeat(owner, c, killer) { let p = owner, idx = -1; if (p.front === c) { p.front = null } else idx = p.bank.indexOf(c); if (idx >= 0) p.bank[idx] = null; let d = CARDS[c.key]; log(`${p.name}: ${d.name} foi derrotado.`); if (c.key === 'barata' && !c.barataUsed) { c.barataUsed = true; c.atk *= 2; c.hp = c.maxHp = c.maxHp * 2; p.hand.push(c); log('Barata voltou para a mão com atributos dobrados.') } else { state.grave.push(c); if (c.key === 'cigarra') { let defeatedPi = p === state.players[0] ? 0 : 1; state.skip[1 - defeatedPi] = true; } if (c.key === 'ovos') drawFree(p === state.players[0] ? 0 : 1, 2); if (c.key === 'formigaVermelha') { let killerCard = state.players[killer] && state.players[killer].front; if (killerCard) { killerCard.atk += 1; killerCard.maxHp += 1; killerCard.hp += 1 } } if (c.key === 'joaninha') { for (let x of [p.front, ...p.bank]) if (x) x.hp = Math.min(x.maxHp, x.hp + 1) } let pi = p === state.players[0] ? 0 : 1; let ally = state.players[pi]; if (ally.bank.some(x => x && x.key === 'rainhaAbelha')) drawFree(pi, 1); if (ally.front && ally.front.key === 'joaninha') { for (let x of [ally.front, ...ally.bank]) if (x && x !== c) x.hp = Math.min(x.maxHp, x.hp + 1) } let killerCard = state.players[killer] && state.players[killer].front; if (killer === pi && killerCard && killerCard.key === 'varejeira') { let s = state.players[killer].bank.findIndex(x => !x); if (s >= 0) { state.players[killer].bank[s] = card('larvas', killer); log('A Varejeira colocou uma Larva no Banco.') } } if (killer === pi && killerCard && killerCard.key === 'vespa') killerCard.debuffNext = true; if (killer === pi && killerCard && killerCard.key === 'maribondo') { killerCard.customAbility = d.ability; killerCard.copiedKey = c.key; log(`Maribondo copiou a habilidade de ${d.name}.`) } if (killer === pi && killerCard && killerCard.key === 'percevejo') killerCard.hp = killerCard.maxHp } }
function steal(pi, n) { let p = state.players[pi], o = state.players[1 - pi]; if (o.antiSteal > 0) { log('Roubo bloqueado pelo Formigueiro.'); return } let a = Math.min(n, o.leaves); o.leaves -= a; p.leaves = Math.min(15, p.leaves + a); if (a) log(`${p.name} roubou ${a} folha(s).`) }
function playEffect(pi, idx) { let c = state.players[pi]?.hand[idx]; return activateEffect(pi, idx, c?.key === 'propolis' ? 'front' : 'bank', c?.key === 'propolis' ? 0 : -1) }
function activateEffect(pi, idx, zone, slot) { let p = state.players[pi], c = p.hand[idx], d = c && CARDS[c.key]; if (!c || !d || d.type !== 'effect' || p.std <= 0 || p.leaves < d.cost) { if (p && p.std <= 0) msg('Você já gastou sua ação padrão.'); else if (p && p.leaves < (d?.cost || 0)) msg('Folhas insuficientes.'); return false } if (d.equip) { if (!p.front && !p.bank.some(Boolean)) { msg('Não há inseto para equipar.'); return false } state.targetMode = { type: 'equip', pi, idx }; msg('Clique no seu inseto para equipar.'); return false } if (['inseticida', 'lupa', 'teia'].includes(c.key)) { state.targetMode = { type: 'effectTarget', pi, idx }; msg('Clique no alvo inimigo.'); return false } let targetSlot = c.key === 'propolis' ? 0 : slot >= 0 ? slot : p.bank.findIndex(x => !x); if (c.key === 'propolis') { if (zone !== 'front' || p.front) { msg('Própolis precisa ocupar um Fronte vazio.'); return false } } else if (zone !== 'bank' || targetSlot < 0 || p.bank[targetSlot]) { msg('Este efeito precisa ocupar um espaço vazio no Banco.'); return false } p.leaves -= d.cost; p.hand.splice(idx, 1); c.activeTurns = c.key === 'propolis' ? 3 : c.key === 'adubo' ? 4 : 3; if (zone === 'front') p.front = c; else p.bank[targetSlot] = c; resolveEffect(pi, c); p.std--; log(`${p.name} ativou ${d.name} por ${c.activeTurns} rodadas.`); render(); return true }
function resolveEffect(pi, c) { let p = state.players[pi], o = state.players[1 - pi]; switch (c.key) { case 'adubo': p.adubo = 4; break; case 'formigueiro': p.antiSteal = 3; break; case 'propolis': c.protectsBank = true; break; case 'inseticida': { let t = o.bank.find(Boolean); if (t) { t.hp -= 1; if (t.hp <= 0) defeat(o, t, pi) } break } case 'lupa': { let t = o.front || o.bank.find(Boolean); if (t) { t.hp -= 2; if (t.hp <= 0) defeat(o, t, pi); log('Lupa aplicou 2 dano imediato; o efeito contínuo fica representado pelo estado curto da partida.') } break } case 'teia': { let t = o.front || o.bank.find(Boolean); if (t && !isImmuneRoot(t)) t.skipAttack = 1; break } } }
function isBankProtected(pi) { let p = state.players[pi]; return !!(p && p.front && p.front.key === 'propolis' && p.front.activeTurns > 0) }
function equip(pi, idx, target) { let p = state.players[pi], c = p.hand[idx], d = c && CARDS[c.key]; if (!c || !d || !d.equip || p.std <= 0 || p.leaves < d.cost) return false; p.leaves -= d.cost; p.hand.splice(idx, 1); target.equipment ||= []; target.equipment.push(c); if (c.key === 'mel') { target.atk += 1; target.maxHp += 1; target.hp += 1; target.mel = true } if (c.key === 'casulo') { target.maxHp += 2; target.hp += 2 } if (c.key === 'veneno') { target.poison = 1; target.poisonTurns = 2 } if (c.key === 'propolis') { target.poison = 0; target.poisonTurns = 0 } p.std--; state.targetMode = null; log(`${p.name} equipou ${d.name} em ${CARDS[target.key].name}.`); render(); return true }
function clickCard(pi, zone, slot) {
  let p = state.players[pi], c = zone === 'hand' ? p.hand[slot] : (zone === 'front' ? p.front : p.bank[slot]);
  if (!c) return;
  // Equipar uma carta de efeito já selecionada.
  if (state.targetMode && state.targetMode.pi === 0 && state.targetMode.type === 'equip' && pi === 0) {
    equip(0, state.targetMode.idx, c); return;
  }
  // Alvo de efeito não-equipável.
  if (state.targetMode && state.targetMode.pi === 0 && state.targetMode.type === 'effectTarget' && pi === 1) {
    resolveTargetEffect(0, state.targetMode.idx, c); return;
  }
  if (state.targetMode && state.targetMode.pi === 0 && state.targetMode.type === 'attack' && pi === 1) {
    resolveAttackTarget(c); return;
  }
  if (state.turn !== 0 || state.over) return;
  if (pi !== 0) return;
  if (zone === 'hand') {
    if (CARDS[c.key].type === 'effect') {
      state.selected = null;
      playEffect(0, slot);
      render();
      return;
    }
    state.selected = state.selected === slot ? null : slot;
    render(); return;
  }
  // Se uma carta da mão está selecionada, clique no slot para invocá-la.
  if (state.selected !== null) {
    let idx = state.selected;
    if (zone === 'front' && slot === 0) { if (summonFromHand(0, idx, 'front', 0)) state.selected = null; return }
    if (zone === 'bank' && slot >= 0) { if (summonFromHand(0, idx, 'bank', slot)) state.selected = null; return }
  }
  // Seleciona uma carta do campo para ações de ataque/devolver.
  state.selectedField = { zone, slot };
  render();
}
function getSelectedField() { let s = state.selectedField; if (!s) return null; let p = state.players[0]; return s.zone === 'front' ? p.front : p.bank[s.slot] }
// Ações específicas do jogador humano.
function attackPlayer() {
  if (!validMove(0) || state.players[0].std <= 0) return;
  let a = state.players[0].front; if (!a) { msg('Você não tem inseto no Fronte.'); return }
  if (a.root > 0 || a.skipAttack > 0 || a.reload > 0) { msg('Esta carta não pode atacar agora.'); return }
  let o = state.players[1];
  let targets = a.key === 'meganeura'
    ? [o.front, ...o.bank].filter(Boolean)
    : o.front ? [o.front] : o.bank.filter(Boolean);
  if (!targets.length) {
    if (state.round > 1 && directAttack(0)) render();
    else msg(state.round > 1 ? 'O inimigo não tem cartas na mão para descartar.' : 'Não há alvo inimigo disponível.');
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
  let a = state.targetMode && state.targetMode.attacker; if (!a) return;
  if (!isValidAttackTarget(a, target)) { msg('Alvo inválido.'); return }
  state.targetMode = null; attack(0, a, target); render();
}
function isValidAttackTarget(a, t) { let o = state.players[1]; if (!t) return false; if (a.key === 'meganeura') return !!([o.front, ...o.bank].filter(Boolean).includes(t)); if (o.front) return t === o.front; return o.bank.includes(t) }
function resolveTargetEffect(pi, idx, target) {
  let p = state.players[pi], c = p.hand[idx]; if (!c) return;
  let d = CARDS[c.key], o = state.players[1];
  if (o.bank.includes(target) && isBankProtected(1)) { msg('O Banco está protegido pelo Própolis.'); return }
  if (c.key === 'inseticida' && !o.bank.includes(target)) { msg('Inseticida só atinge o Banco.'); return }
  if (c.key === 'lupa' && ![o.front, ...o.bank].filter(Boolean).includes(target)) { msg('Alvo inválido.'); return }
  if (c.key === 'teia' && ![o.front, ...o.bank].filter(Boolean).includes(target)) { msg('Alvo inválido.'); return }
  if (p.leaves < d.cost || p.std <= 0) return;
  p.leaves -= d.cost; p.hand.splice(idx, 1); state.targetMode = null; p.std--; applyTargetEffect(pi, c, target); render(); winCheck();
}
function applyTargetEffect(pi, c, t) {
  let p = state.players[pi];
  if (c.key === 'inseticida') { t.hp -= 1; log(`${p.name} usou Inseticida em ${CARDS[t.key].name}.`); if (t.hp <= 0) defeat(state.players[1], t, pi) }
  if (c.key === 'lupa') { t.lupa = (t.lupa || 0) + 3; t.lupaDamage = 2; log(`${p.name} colocou Lupa em ${CARDS[t.key].name} por 3 rodadas.`) }
  if (c.key === 'teia') { if (!isImmuneRoot(t)) t.skipAttack = 1; log(`${CARDS[t.key].name} foi impedido de atacar no próximo turno.`) }
}
function returnSelected() {
  if (!validMove(0) || state.players[0].moves <= 0) return;
  let s = state.selectedField; if (!s) { msg('Selecione uma carta no campo.'); return }
  if (returnToHand(0, s.zone, s.slot)) { state.selectedField = null; render(); }
}
function sellSelected() { let p = state.players[0]; if (state.turn !== 0 || p.std <= 0) return; if (state.selected !== null) { let c = p.hand[state.selected]; if (!c) return; p.hand.splice(state.selected, 1); state.grave.push(c); p.leaves = Math.min(15, p.leaves + 1); p.std--; state.selected = null; log(`${p.name} vendeu ${CARDS[c.key].name} por 1 folha.`); render(); winCheck(); return } let c = getSelectedField(); if (!c) { msg('Selecione uma carta da mão ou do campo para vender.'); return } let s = state.selectedField; if (s.zone === 'front') p.front = null; else p.bank[s.slot] = null; state.grave.push(c); p.leaves = Math.min(15, p.leaves + 1); p.std--; state.selectedField = null; log(`${p.name} vendeu ${CARDS[c.key].name} por 1 folha.`); render(); winCheck() }
function playerDraw() { if (!validMove(0) || state.players[0].std <= 0) return; if (drawCost(0)) state.players[0].std--; render() }
function secondMove() { if (!validMove(0) || state.players[0].std <= 0 || state.players[0].moves >= 2) return; state.players[0].std--; state.players[0].moves += 1; state.selectedField = null; log('Você abriu mão da ação padrão para ganhar mais um movimento.'); render() }
function harvest(pi) { if (!validMove(pi) || state.players[pi].std <= 0) return; let p = state.players[pi], gain = p.adubo > 0 ? 2 : 1; p.leaves = Math.min(15, p.leaves + gain); FX.boardState('fx-harvest',550); FX.leaves(document.querySelector('.natureza .pile'), document.getElementById(pi===0?'playerLeaves':'enemyLeaves')); p.std--; log(`${p.name} colheu ${gain} folha(s).`); render() }
function showEnemyActions(actions, title = 'AÇÕES DO BOT') { let popup = document.getElementById('enemyActionPopup'); if (!popup || !actions.length) return; popup.innerHTML = `<strong>${title}</strong>${actions.map(action => `<span>${action}</span>`).join('')}`; popup.classList.add('is-visible'); }
function hideEnemyActions() { let popup = document.getElementById('enemyActionPopup'); if (popup) popup.classList.remove('is-visible'); }
// ================================================================
// BOT
// IA simples baseada em prioridade de custo, campo e ataque.
// ================================================================
function aiBestCard() { let p = state.players[1]; return p.hand.map((c, i) => ({ c, i, d: CARDS[c.key] })).filter(x => !x.d.type && x.d.cost <= p.leaves).sort((a, b) => (b.d.atk + b.d.hp - a.d.cost) - (a.c.atk + a.c.hp - b.d.cost))[0] }
function botTurn() { setTimeout(() => { if (state.over) return; let p = state.players[1], o = state.players[0], actions = [], direct = false; if (p.leaves < 8 && p.std) { harvest(1); actions.push('Colheu folhas.') } let x = aiBestCard(); if (x && p.moves) { let zone = !p.front ? 'front' : p.bank.findIndex(v => !v) >= 0 ? 'bank' : null; if (zone === 'front') { summonFromHand(1, x.i, 'front', 0); actions.push(`Invocou ${CARDS[x.c.key].name}.`) } else if (zone === 'bank') { summonFromHand(1, x.i, 'bank', p.bank.findIndex(v => !v)); actions.push(`Colocou ${CARDS[x.c.key].name} no Banco.`) } } if (p.std) { let targets = o.front ? [o.front] : o.bank.filter(Boolean); if (p.front && targets.length) { let t = targets.sort((a, b) => a.hp - b.hp)[0]; attack(1, p.front, t); actions.push(`Atacou com ${CARDS[p.front.key].name}.`) } else if (state.round > 1 && directAttack(1)) { actions.push('Fez um ataque direto.'); direct = true } } if (p.std && p.leaves >= 3 && state.deck.length) { drawCost(1); p.std--; actions.push('Comprou uma carta.') } if (p.std) { harvest(1); actions.push('Colheu folhas.') } showEnemyActions(actions, direct ? 'ATAQUE DIRETO DO BOT' : 'AÇÕES DO BOT'); if (!state.over) endTurn(1) }, 850) }
// ================================================================
// DRAG & DROP
// Cartas do jogador podem ser arrastadas para os slots válidos.
// ================================================================
function prepareDropTargets(c) { if (state.turn !== 0 || state.over) return; document.querySelectorAll('#pf0,#pb0,#pb1,#pb2,#ef0,#eb0,#eb1,#eb2').forEach(s => s.classList.add('drop-ready')); document.getElementById('hand').classList.add('drop-ready') }
function clearDropTargets() { document.querySelectorAll('.slot').forEach(s => s.classList.remove('drop-ready', 'drag-over')); document.getElementById('hand').classList.remove('drop-ready', 'drag-over') }
function findPlayerCardById(id) { let p = state.players[0]; if (!p) return null; let hi = p.hand.findIndex(c => c.id === id); if (hi >= 0) return { c: p.hand[hi], zone: 'hand', slot: hi }; if (p.front && p.front.id === id) return { c: p.front, zone: 'front', slot: 0 }; for (let i = 0; i < 3; i++)if (p.bank[i] && p.bank[i].id === id) return { c: p.bank[i], zone: 'bank', slot: i }; return null }
function handleDropOnHand(e) { e.preventDefault(); let found = findPlayerCardById(e.dataTransfer.getData('text/plain')); if (!found || found.zone === 'hand' || state.turn !== 0 || state.over) return; if (returnToHand(0, found.zone, found.slot)) { state.selectedField = null; clearDropTargets(); render(); winCheck() } }
function handleDropOnSlot(slotEl, e) {
  e.preventDefault(); slotEl.classList.remove('drag-over'); let id = e.dataTransfer.getData('text/plain'); let found = findPlayerCardById(id); if (!found || state.turn !== 0 || state.over) return; let target = slotEl.id; let enemyTarget = target === 'ef0' || target.startsWith('eb'); let p = state.players[0];
  if (enemyTarget) {
    if (found.zone === 'hand' || p.std <= 0) return;
    let o = state.players[1], targetCard = o.front || o.bank.find(Boolean);
    if (!targetCard || !isValidAttackTarget(found.c, targetCard)) { msg('Não há alvo válido para atacar.'); return }
    attack(0, found.c, targetCard); clearDropTargets(); render(); winCheck(); return;
  }
  let zone = target === 'pf0' ? 'front' : 'bank'; let slot = zone === 'bank' ? Number(target.slice(-1)) : 0; let destCard = zone === 'front' ? p.front : p.bank[slot];
  if (found.zone === 'hand' && CARDS[found.c.key].equip) {
    if (!destCard || !insect(destCard)) { msg('Arraste o equipável sobre um inseto próprio.'); return }
    if (equip(0, found.slot, destCard)) { clearDropTargets(); render() }
    return;
  }
  if (found.zone === 'hand' && CARDS[found.c.key].type === 'effect') {
    let effectZone = zone === 'front' ? 'front' : 'bank';
    if (activateEffect(0, found.slot, effectZone, slot)) { clearDropTargets(); render() }
    return;
  }
  let destOccupied = !!destCard; if (destOccupied) { msg('Esse slot já está ocupado.'); return }
  if (found.zone === 'hand') { if (CARDS[found.c.key].type === 'effect') { msg('Cartas de efeito não são invocadas no Banco/Fronte. Use a ação apropriada.'); return } if (summonFromHand(0, found.slot, zone, slot)) { state.selected = null; state.selectedField = null; } }
  else if (found.zone === 'front' && zone === 'bank') { moveCard(0, 'front', slot) }
  else if (found.zone === 'bank' && zone === 'front') { if (p.moves <= 0 || p.front) { msg(p.front ? 'O Fronte já está ocupado.' : 'Sem movimento disponível.'); return } let c = p.bank[found.slot]; p.bank[found.slot] = null; p.front = c; c.root = 0; p.moves--; log(`${p.name} moveu ${CARDS[c.key].name} para o Fronte.`); state.selectedField = null; render(); }
  else msg('Arraste a carta para outro espaço válido.');
  clearDropTargets(); render(); winCheck();
}
function installDropTargets() { document.querySelectorAll('#pf0,#pb0,#pb1,#pb2,#ef0,#eb0,#eb1,#eb2').forEach(slot => { slot.addEventListener('dragover', e => { if (!e.dataTransfer.types.includes('text/plain')) return; e.preventDefault(); if (state.turn === 0 && !state.over) slot.classList.add('drag-over') }); slot.addEventListener('dragleave', () => slot.classList.remove('drag-over')); slot.addEventListener('drop', e => handleDropOnSlot(slot, e)); }); let hand = document.getElementById('hand'); hand.addEventListener('dragover', e => { if (!e.dataTransfer.types.includes('text/plain')) return; e.preventDefault(); if (state.turn === 0 && !state.over) hand.classList.add('drag-over') }); hand.addEventListener('dragleave', () => hand.classList.remove('drag-over')); hand.addEventListener('drop', handleDropOnHand); }
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
// ================================================================
// RENDERIZAÇÃO
// Atualiza o tabuleiro inteiro a partir do estado atual.
// ================================================================
function render() { let p = state.players[0], o = state.players[1]; if (!p) return; document.getElementById('round').textContent = state.round; document.getElementById('turn').textContent = state.turn === 0 ? 'VOCÊ' : 'BOT'; document.getElementById('turnNo').textContent = state.round; document.getElementById('deckCount').textContent = state.deck.length; document.getElementById('deckCount2').textContent = state.deck.length; document.getElementById('graveCount').textContent = state.grave.length; document.getElementById('graveCount2').textContent = state.grave.length; document.getElementById('playerLeaves').textContent = p.leaves; document.getElementById('enemyLeaves').textContent = o.leaves; document.getElementById('playerName').textContent = p.name.toUpperCase(); document.getElementById('moves').textContent = p.moves; document.getElementById('std').textContent = p.std; document.getElementById('draw').disabled = state.turn !== 0 || p.std <= 0 || p.leaves < 3 || !state.deck.length; document.getElementById('harvest').disabled = state.turn !== 0 || p.std <= 0; document.getElementById('attackBtn').disabled = state.turn !== 0 || state.over || p.std <= 0 || !p.front; document.getElementById('secondMove').disabled = state.turn !== 0 || state.over || p.moves <= 0 || p.std <= 0; document.getElementById('returnBtn').disabled = state.turn !== 0 || state.over || p.moves <= 0 || !state.selectedField; document.getElementById('sell').disabled = state.turn !== 0 || p.std <= 0 || state.selected === null && !state.selectedField; document.getElementById('end').disabled = state.turn !== 0 || state.over; document.getElementById('attackBtn').classList.toggle('waiting', !!(state.targetMode && state.targetMode.type === 'attack')); document.getElementById('returnBtn').classList.toggle('waiting', !!state.selectedField); document.getElementById('sell').classList.toggle('waiting', !!(state.selected !== null || state.selectedField)); renderSlot('ef0', o.front, true, true); for (let i = 0; i < 3; i++) { renderSlot('eb' + i, o.bank[i], true, false); renderSlot('pb' + i, p.bank[i], false, false) } renderSlot('pf0', p.front, false, true); let h = document.getElementById('hand'); h.innerHTML = ''; p.hand.forEach((c, i) => { let el = makeCard(c, false); if (state.selected === i) el.classList.add('selected'); el.onclick = () => clickCard(0, 'hand', i); h.appendChild(el) }); document.getElementById('log').innerHTML = state.log.map(x => `<div>› ${x}</div>`).join('') }
function renderSlot(id, c, enemy, front) { let s = document.getElementById(id); s.innerHTML = ''; if (!c) { s.textContent = front ? 'FRONTE' : 'BANCO'; return } let el = makeCard(c, enemy); if (front) el.classList.add('fronte-card'); if (c.equipment && c.equipment.length) { el.classList.add('equipped-card'); c.equipment.forEach(item => { let badge = document.createElement('span'); badge.className = 'equipment-preview'; badge.textContent = CARDS[item.key].emoji; el.appendChild(badge) }) } if (c.activeTurns > 0) { let counter = document.createElement('span'); counter.className = 'effect-counter'; counter.textContent = `${c.activeTurns} turnos`; el.appendChild(counter) } s.appendChild(el); el.onclick = () => clickCard(enemy ? 1 : 0, front ? 'front' : 'bank', front ? 0 : Number(id.slice(-1))); if (!enemy) el.title = 'Clique para mover'; }
// Cria o elemento visual de uma carta e liga eventos de interação.
function makeCard(c, enemy) { let d = CARDS[c.key], el = document.createElement('div'); let art = CARD_IMAGES[c.key]; el.className = 'card' + (enemy ? ' enemy-card' : '') + (art ? ' has-art' : ''); el.draggable = !enemy; let hp = Math.max(0, c.hp), atk = Math.max(0, c.atk); el.innerHTML = `${art ? `<div class=\"card-art-wrap\"><img class=\"card-art\" src=\"${art}\" alt=\"${d.name}\" draggable=\"false\"></div>` : ''}<span class=\"card-cost\">${d.cost} 🍃</span><div class=\"card-body\"><div class=\"card-silhouette\">${art ? '' : d.emoji}</div></div><div class=\"card-footer\"><div class=\"card-name\">${d.name}</div><div class=\"card-stats\"><span class=\"atk\">⚔ ${atk}</span><span class=\"hp\">♥ ${hp}/${c.maxHp || ''}</span></div></div>`; el.addEventListener('mouseenter', e => showTip(e, c)); el.addEventListener('mouseleave', hideTip); if (!enemy) { el.addEventListener('dragstart', e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.id); el.classList.add('dragging'); prepareDropTargets(c) }); el.addEventListener('dragend', () => { el.classList.remove('dragging'); clearDropTargets() }); } return el }
// ================================================================
// TOOLTIPS E MODAIS
// ================================================================
function showTip(e, c) { let d = CARDS[c.key], t = document.getElementById('tip'); document.getElementById('tipName').textContent = d.name; document.getElementById('tipCond').textContent = '[' + d.cond + ']'; document.getElementById('tipAbility').textContent = d.ability + (c.customAbility ? ' | Copiada: ' + c.customAbility : ''); t.style.display = 'block'; t.style.left = Math.min(innerWidth - 255, e.clientX + 10) + 'px'; t.style.top = Math.min(innerHeight - 150, e.clientY + 10) + 'px' } function hideTip() { document.getElementById('tip').style.display = 'none' }
function showModal(html) { document.getElementById('modalContent').innerHTML = html; document.getElementById('overlay').style.display = 'flex' } function rules() { showModal(`<h2>INSETO CARDS — REGRAS</h2><ul><li>2 jogadores; cada um tem 1 Fronte, 3 Banco e mão própria. Natureza e Cemitério são compartilhados.</li><li>Cada turno: 1 Movimento + 1 Ação Padrão. Você pode abrir mão da Padrão para ganhar um segundo Movimento.</li><li>Movimento: invocar carta, mover campo ou devolver carta sem dano à mão.</li><li>Padrão: atacar, colher +1, vender, ou comprar da Natureza por 3 folhas.</li><li>Começo: 5 folhas e 3 cartas. A partir da rodada 2: +1 folha automática. Limite 15.</li><li>Combate é mútuo. O Fronte só pode atacar Banco se o Fronte inimigo estiver vazio, exceto Meganeura.</li><li>Vitória: eliminar todos os insetos da mão e do campo inimigo; efeitos não contam.</li></ul><h3 style="color:var(--amber);margin:10px 0 5px">Decisões necessárias para a implementação</h3><p>Venda = +1 folha; Vaga-lume revela 2 cartas da mão do inimigo apenas no log; empate técnico = se ambos zerarem na mesma resolução, a partida termina empatada. A mão inicial foi fixada em 3, conforme as simulações mencionadas no GDD.</p><p class="small" style="margin-top:10px">O baralho usa as 41 cartas atualmente disponíveis, uma cópia de cada.</p>`) }
document.getElementById('start').onclick = init; document.getElementById('restart').onclick = () => { document.getElementById('start').disabled = false; init() }; document.getElementById('rules').onclick = rules; document.getElementById('draw').onclick = playerDraw; document.getElementById('harvest').onclick = () => harvest(0); document.getElementById('attackBtn').onclick = attackPlayer; document.getElementById('secondMove').onclick = secondMove; document.getElementById('returnBtn').onclick = returnSelected; document.getElementById('sell').onclick = sellSelected; document.getElementById('end').onclick = () => { if (validMove(0)) endTurn(0) }; document.getElementById('modalClose').onclick = () => document.getElementById('overlay').style.display = 'none';
document.addEventListener('click', hideEnemyActions); document.addEventListener('keydown', hideEnemyActions);
document.querySelector('.version-badge').textContent = `v${APP_VERSION}`;
const renderWithActionControls = render;
render = function() { renderWithActionControls(); let p = state.players[0]; if (p) { document.getElementById('secondMove').disabled = state.turn !== 0 || state.over || p.std <= 0 || p.moves >= 2; document.getElementById('stdActions').textContent = p.std; document.getElementById('moveActions').textContent = p.moves; } };
FX.init(); installDropTargets(); render(); log('Pronto. Clique em INICIAR PARTIDA.');
