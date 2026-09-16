/* ========================================================================
   INSETO CARDS — MODO EDITOR 3.2.16
   Ferramenta local de testes. Não usa BOT, rede, custo ou ações normais.
   ======================================================================== */
(() => {
  'use strict';

  const EDITOR = {
    active: false,
    selectedKey: null,
    selectedField: null,
    history: [],
    maxHistory: 80,
    panel: null,
    list: null,
    search: null,
    status: null,
    dragPayload: null,

    init() {
      this.installStyles();
      this.installEntry();
    },

    installEntry() {
      const grid = document.querySelector('.menu-mode-grid');
      if (!grid || document.getElementById('mpEditorTab')) return;

      const btn = document.createElement('button');
      btn.className = 'menu-mode editor-menu-mode';
      btn.id = 'mpEditorTab';
      btn.type = 'button';
      btn.innerHTML = '<span class="mode-kicker">TOOLS</span><strong>EDITOR</strong><small>Monte cenários e teste cartas</small>';
      grid.appendChild(btn);
      btn.addEventListener('click', () => this.enter());
    },

    installStyles() {
      if (document.getElementById('editor-runtime-style')) return;
      const style = document.createElement('style');
      style.id = 'editor-runtime-style';
      style.textContent = `
        /* 3.2.16 — campo desktop: cartas maiores, bancos mais espaçados,
           natureza/cemitério paralelos aos Frontes e banco inferior ancorado. */
        @media (min-width:901px) {
          .battle-main .field-row { gap: clamp(24px, 3vw, 42px); }
          .battle-main .field-row:nth-child(2) { align-items: flex-end; }
          .battle-main .field-row:nth-child(3) { align-items: flex-start; }
          .battle-main .field-row:nth-child(5) { align-items: flex-end; }
          .battle-main .player-bank-row { align-items: flex-start; }
          .battle-main .center-zone {
            display:grid;
            grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);
            align-items:center;
            justify-items:center;
            column-gap:clamp(18px,2.2vw,34px);
            width:min(560px,72%);
            height:42px;
            min-height:42px;
          }
          .battle-main .center-zone .natureza { grid-column:1; justify-self:center; }
          .battle-main .center-zone .turn { grid-column:2; justify-self:center; }
          .battle-main .center-zone .cemiterio { grid-column:3; justify-self:center; }
          .battle-main .slot,
          .battle-main .slot.fronte,
          .battle-main .shared-zone {
            width: calc(clamp(72px, 6.1vw, 88px) + 15px);
            height: calc(clamp(92px, 8.1vw, 112px) + 15px);
            flex-basis: calc(clamp(72px, 6.1vw, 88px) + 15px);
          }
          .battle-main .slot > .card,
          .battle-main .slot .fronte-card {
            width: calc(100% - 6px);
            height: calc(100% - 6px);
          }
          .battle-main .center-zone {
            width: min(330px, 54%);
            height: 42px;
            min-height: 42px;
          }
          .battle-main .battle-main .turn { gap: 8px; }
          .battle-main .field-row:nth-child(3),
          .battle-main .field-row:nth-child(5) { transform: translateY(0); }
          .battle-main .field-row:nth-child(2) { align-items: flex-start; }
          .battle-main .player-bank-row { align-items: flex-end; }
          .battle-main .field-row:nth-child(2) .slot,
          .battle-main .player-bank-row .slot { margin-bottom: 0; }

          body.editor-mode .left-sidebar,
          body.editor-mode .right-sidebar,
          body.editor-mode .center-controls { display: none !important; }
          body.editor-mode .root {
            grid-template-columns: minmax(0,1fr);
            grid-template-rows: minmax(0,1fr);
          }
          body.editor-mode .battle-main {
            grid-column:1;
            grid-row:1;
            padding-left: 330px;
            padding-right: 18px;
          }
        }

        .editor-launcher-badge { border-color: rgba(156,191,121,.55) !important; }
        #editorPanel {
          position: fixed;
          left: 10px;
          top: 10px;
          bottom: 10px;
          z-index: 900;
          width: 300px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 12px;
          border: 1px solid rgba(141,176,139,.28);
          border-radius: 14px;
          background: linear-gradient(145deg,rgba(23,40,27,.97),rgba(7,15,10,.98));
          box-shadow: 0 18px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06);
          backdrop-filter: blur(16px) saturate(130%);
        }
        #editorPanel .editor-title { color: #d9e5d2; font: 800 15px var(--display); letter-spacing:.08em; }
        #editorPanel .editor-subtitle { margin-top:3px; color:#91a491; font-size:8px; }
        #editorPanel .editor-toolbar { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; margin-top:10px; }
        #editorPanel .editor-toolbar button { min-height:32px; padding:5px 3px; font-size:8px; }
        #editorPanel .editor-selected { margin-top:8px; padding:7px; border:1px solid rgba(214,186,103,.3); border-radius:8px; color:#dbe5d8; background:rgba(0,0,0,.18); font-size:9px; }
        #editorPanel .editor-selected strong { color:#e4d18b; }
        #editorPanel .editor-search { margin-top:8px; }
        #editorPanel .editor-search input { width:100%; padding:7px 8px; border-radius:7px; font-size:9px; }
        #editorPanel .editor-cards { min-height:0; flex:1 1 auto; overflow:auto; margin-top:8px; padding-right:2px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; align-content:start; }
        #editorPanel .editor-card-btn { display:grid; grid-template-columns:40px 1fr; gap:6px; align-items:center; min-width:0; padding:5px; border:1px solid rgba(141,176,139,.16); border-radius:8px; background:rgba(0,0,0,.18); text-align:left; cursor:pointer; }
        #editorPanel .editor-card-btn:hover { border-color:rgba(214,186,103,.52); background:rgba(72,105,73,.22); }
        #editorPanel .editor-card-btn { cursor:grab; }
        #editorPanel .editor-card-btn:active { cursor:grabbing; }
        body.editor-mode .battle-main .card { cursor:grab; }
        body.editor-mode .battle-main .card.editor-dragging { opacity:.55; cursor:grabbing; }
        body.editor-mode .battle-main .slot.editor-drop-hover { border-color:rgba(214,186,103,.95) !important; box-shadow:0 0 0 2px rgba(214,186,103,.22), inset 0 0 22px rgba(214,186,103,.1); }

        #editorPanel .editor-card-btn.is-selected { border-color:rgba(214,186,103,.9); box-shadow:0 0 0 1px rgba(214,186,103,.22); }
        #editorPanel .editor-card-btn img { width:40px; height:54px; object-fit:cover; border-radius:4px; border:1px solid rgba(214,186,103,.24); background:#102015; }
        #editorPanel .editor-card-btn .editor-card-emoji { width:40px; height:54px; display:grid; place-items:center; font-size:22px; border-radius:4px; background:#102015; }
        #editorPanel .editor-card-name { min-width:0; color:#e9efe5; font:700 8px var(--display); line-height:1.2; }
        #editorPanel .editor-card-meta { margin-top:3px; color:#91a491; font-size:7px; }
        #editorPanel .editor-status { margin-top:7px; min-height:14px; color:#d6ba67; font-size:8px; }
        #editorPanel .editor-exit { margin-top:7px; width:100%; }
        .editor-field-selected { outline: 2px solid rgba(214,186,103,.95) !important; box-shadow:0 0 0 3px rgba(214,186,103,.18), 0 0 24px rgba(214,186,103,.18) !important; }
        body.editor-mode .version-badge { z-index: 950; }
        @media (max-width:900px) {
          #editorPanel { left:7px; right:7px; top:auto; bottom:7px; width:auto; height:46vh; max-height:46vh; }
          body.editor-mode .root { display:block; min-height:100vh; padding-bottom:49vh; }
          body.editor-mode .battle-main { display:grid; width:100%; height:auto; min-height:52vh; padding:8px 3px 8px; }
          body.editor-mode .left-sidebar,
          body.editor-mode .right-sidebar,
          body.editor-mode .center-controls { display:none !important; }
        }
      `;
      document.head.appendChild(style);
    },

    makePanel() {
      if (this.panel) return this.panel;
      const panel = document.createElement('aside');
      panel.id = 'editorPanel';
      panel.innerHTML = `
        <div class="editor-title">MODO EDITOR</div>
        <div class="editor-subtitle">Catálogo completo · regras normais ignoradas</div>
        <div class="editor-toolbar">
          <button class="btn btn-secondary" id="editorUndo">↶ UNDO</button>
          <button class="btn btn-secondary" id="editorClear">⌫ LIMPAR CAMPO</button>
          <button class="btn btn-secondary" id="editorReset">↺ RESETAR</button>
        </div>
        <div class="editor-toolbar">
          <button class="btn btn-primary" id="editorHeal">CURAR</button>
          <button class="btn btn-secondary" id="editorKill">MATAR</button>
          <button class="btn btn-secondary" id="editorExit">SAIR</button>
        </div>
        <div class="editor-selected" id="editorSelected">Carta selecionada: <strong>nenhuma</strong></div>
        <div class="editor-search"><input id="editorSearch" type="search" placeholder="Buscar carta..." autocomplete="off" /></div>
        <div class="editor-status" id="editorStatus"></div>
        <div class="editor-cards" id="editorCards"></div>
      `;
      document.body.appendChild(panel);
      this.panel = panel;
      this.list = panel.querySelector('#editorCards');
      this.search = panel.querySelector('#editorSearch');
      this.status = panel.querySelector('#editorStatus');

      panel.querySelector('#editorUndo').addEventListener('click', () => this.undo());
      panel.querySelector('#editorClear').addEventListener('click', () => this.clearField());
      panel.querySelector('#editorReset').addEventListener('click', () => this.reset());
      panel.querySelector('#editorHeal').addEventListener('click', () => this.healSelected());
      panel.querySelector('#editorKill').addEventListener('click', () => this.killSelected());
      panel.querySelector('#editorExit').addEventListener('click', () => this.exit());
      this.search.addEventListener('input', () => this.renderCatalog());
      return panel;
    },

    enter() {
      if (this.active) return;
      this.active = true;
      this.history = [];
      this.selectedKey = null;
      this.selectedField = null;
      document.body.classList.add('editor-mode');
      document.getElementById('startMenu')?.style.setProperty('display', 'none');
      this.makePanel();
      this.setEditorState();
      this.renderCatalog();
      this.bindFieldInteraction();
      document.querySelector('.version-badge')?.replaceChildren(document.createTextNode('v3.2.16 · Editor'));
      document.title = 'Inseto Cards — Editor · v3.2.16';
      this.setStatus('Editor ativo. Selecione uma carta e clique em qualquer slot.');
      if (typeof render === 'function') render();
      this.highlightField();
    },

    setEditorState() {
      state.started = true;
      state.over = false;
      state.round = 1;
      state.turn = 0;
      state.deck = [...DECK_KEYS];
      state.grave = [];
      state.selected = null;
      state.selectedField = null;
      state.targetMode = null;
      state.log = ['Modo Editor iniciado.'];
      state.skip = [false, false];
      state.tie = false;
      state.vagaReveal = null;
      state.players = [P('EDITOR'), P('ALVO', false)];
      state.players[0].leaves = 15;
      state.players[1].leaves = 15;
      state.players[0].std = 0;
      state.players[0].moves = 0;
      state.players[1].std = 0;
      state.players[1].moves = 0;
    },

    bindFieldInteraction() {
      if (this._bound) return;
      this._bound = true;

      // Clique: mantém a interação rápida original.
      document.addEventListener('click', e => {
        if (!this.active) return;
        if (e.defaultPrevented) return;
        const slot = e.target.closest('#pb0,#pb1,#pb2,#pf0,#eb0,#eb1,#eb2,#ef0');
        const fieldCard = e.target.closest('.battle-main .card[data-card-id]');
        if (slot) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const info = this.slotInfo(slot.id);
          this.placeSelected(info.player, info.zone, info.slot);
          return;
        }
        if (fieldCard) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.selectFieldById(fieldCard.dataset.cardId);
        }
      }, true);

      // Drag & drop do Editor. Captura os eventos antes do motor normal para
      // que as regras de drag da partida não interfiram no Editor.
      document.addEventListener('dragstart', e => {
        if (!this.active) return;
        const catalogCard = e.target.closest('.editor-card-btn[data-editor-card-key]');
        const fieldCard = e.target.closest('.battle-main .card[data-card-id]');
        if (!catalogCard && !fieldCard) return;
        e.stopImmediatePropagation();
        if (catalogCard) {
          this.dragPayload = { type:'catalog', key:catalogCard.dataset.editorCardKey };
          catalogCard.classList.add('editor-dragging');
          e.dataTransfer?.setData('text/plain', `editor-card:${catalogCard.dataset.editorCardKey}`);
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy';
        } else {
          const info = this.findFieldById(fieldCard.dataset.cardId);
          if (!info) return;
          this.dragPayload = { type:'field', ...info };
          fieldCard.classList.add('editor-dragging');
          e.dataTransfer?.setData('text/plain', `editor-field:${fieldCard.dataset.cardId}`);
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        }
      }, true);

      document.addEventListener('dragover', e => {
        if (!this.active || !this.dragPayload) return;
        const slot = e.target.closest('#pb0,#pb1,#pb2,#pf0,#eb0,#eb1,#eb2,#ef0');
        if (!slot) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        e.dataTransfer.dropEffect = this.dragPayload.type === 'catalog' ? 'copy' : 'move';
        slot.classList.add('editor-drop-hover');
      }, true);

      document.addEventListener('dragenter', e => {
        if (!this.active || !this.dragPayload) return;
        const slot = e.target.closest('#pb0,#pb1,#pb2,#eb0,#eb1,#eb2,#pf0,#ef0');
        if (slot) slot.classList.add('editor-drop-hover');
      }, true);

      document.addEventListener('dragleave', e => {
        const slot = e.target.closest?.('#pb0,#pb1,#pb2,#pf0,#eb0,#eb1,#eb2,#ef0');
        if (slot && !slot.contains(e.relatedTarget)) slot.classList.remove('editor-drop-hover');
      }, true);

      document.addEventListener('drop', e => {
        if (!this.active || !this.dragPayload) return;
        const slot = e.target.closest('#pb0,#pb1,#pb2,#pf0,#eb0,#eb1,#eb2,#ef0');
        if (!slot) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        slot.classList.remove('editor-drop-hover');
        const info = this.slotInfo(slot.id);
        const payload = this.dragPayload;
        this.dragPayload = null;
        if (payload.type === 'catalog') {
          this.selectedKey = payload.key;
          this.selectedField = null;
          this.placeSelected(info.player, info.zone, info.slot);
        } else if (payload.type === 'field') {
          this.moveField(payload, info);
        }
      }, true);

      document.addEventListener('dragend', e => {
        if (!this.active) return;
        this.dragPayload = null;
        document.querySelectorAll('.editor-dragging,.editor-drop-hover').forEach(el => el.classList.remove('editor-dragging','editor-drop-hover'));
      }, true);
    },

    slotInfo(id) {
      if (id === 'pf0') return { player:0, zone:'front', slot:0 };
      if (id === 'ef0') return { player:1, zone:'front', slot:0 };
      if (/^pb[0-2]$/.test(id)) return { player:0, zone:'bank', slot:Number(id.slice(2)) };
      if (/^eb[0-2]$/.test(id)) return { player:1, zone:'bank', slot:Number(id.slice(2)) };
      return null;
    },

    findFieldById(id) {
      for (let pi=0; pi<2; pi++) {
        const p = state.players[pi];
        if (p?.front?.id === id) return { pi, zone:'front', slot:0 };
        const slot = p?.bank.findIndex(c => c?.id === id);
        if (slot >= 0) return { pi, zone:'bank', slot };
      }
      return null;
    },

    moveField(source, target) {
      if (!source || !target) return;
      if (source.pi === target.player && source.zone === target.zone && source.slot === target.slot) {
        this.setStatus('A carta já está nesse slot.');
        return;
      }
      const srcPlayer = state.players[source.pi];
      const dstPlayer = state.players[target.player];
      const srcCard = source.zone === 'front' ? srcPlayer.front : srcPlayer.bank[source.slot];
      if (!srcCard) return;
      this.pushHistory(`Mover ${CARDS[srcCard.key].name}`);
      const dstCard = target.zone === 'front' ? dstPlayer.front : dstPlayer.bank[target.slot];

      // Permite mover entre qualquer slot do Editor. Se o destino estiver ocupado,
      // troca as duas cartas para tornar a ferramenta útil para montagem rápida.
      if (source.zone === 'front') srcPlayer.front = dstCard || null;
      else srcPlayer.bank[source.slot] = dstCard || null;
      if (target.zone === 'front') dstPlayer.front = srcCard;
      else dstPlayer.bank[target.slot] = srcCard;
      srcCard.owner = target.player;
      if (dstCard) dstCard.owner = source.pi;

      this.selectedField = { pi:target.player, zone:target.zone, slot:target.slot };
      this.selectedKey = null;
      refreshPassiveStats();
      this.updateSelectedLabel();
      this.setStatus(`${CARDS[srcCard.key].name} movido para ${target.player === 0 ? 'seu' : 'alvo'} ${target.zone === 'front' ? 'Fronte' : `Banco ${target.slot+1}`}.`);
      render();
      this.highlightField();
    },

    selectFieldById(id) {
      for (let pi=0; pi<2; pi++) {
        const p = state.players[pi];
        if (p.front?.id === id) return this.selectField(pi, 'front', 0);
        const slot = p.bank.findIndex(c => c?.id === id);
        if (slot >= 0) return this.selectField(pi, 'bank', slot);
      }
    },

    selectField(pi, zone, slot) {
      this.selectedField = { pi, zone, slot };
      this.selectedKey = null;
      this.renderCatalog();
      this.updateSelectedLabel();
      this.highlightField();
      this.setStatus(`Selecionada: ${this.fieldCardName(pi, zone, slot)}.`);
    },

    fieldCardName(pi, zone, slot) {
      const c = zone === 'front' ? state.players[pi]?.front : state.players[pi]?.bank[slot];
      return c ? CARDS[c.key].name : 'nenhuma';
    },

    renderCatalog() {
      if (!this.list) return;
      const query = String(this.search?.value || '').trim().toLowerCase();
      this.list.innerHTML = '';
      Object.entries(CARDS).filter(([key,d]) => !query || key.toLowerCase().includes(query) || d.name.toLowerCase().includes(query)).forEach(([key,d]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'editor-card-btn' + (this.selectedKey === key ? ' is-selected' : '');
        btn.draggable = true;
        btn.dataset.editorCardKey = key;
        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.src = CARD_IMAGES[key] || '';
        img.onerror = () => { img.replaceWith(Object.assign(document.createElement('span'), { className:'editor-card-emoji', textContent:d.emoji || '🪲' })); };
        const meta = d.type === 'effect' ? 'EFEITO' : `CUSTO ${d.cost} · ${d.atk}/${d.hp}`;
        btn.innerHTML = `<span class="editor-card-media"></span><span><strong class="editor-card-name"></strong><small class="editor-card-meta"></small></span>`;
        btn.querySelector('.editor-card-media').replaceWith(img);
        btn.querySelector('.editor-card-name').textContent = d.name;
        btn.querySelector('.editor-card-meta').textContent = meta;
        btn.addEventListener('click', () => { this.selectedKey = key; this.selectedField = null; this.renderCatalog(); this.updateSelectedLabel(); this.highlightField(); this.setStatus(`${d.name} selecionada. Clique em qualquer slot do campo.`); });
        this.list.appendChild(btn);
      });
    },

    updateSelectedLabel() {
      const el = this.panel?.querySelector('#editorSelected');
      if (!el) return;
      if (this.selectedKey) el.innerHTML = `Carta para colocar: <strong>${CARDS[this.selectedKey].name}</strong>`;
      else if (this.selectedField) el.innerHTML = `Carta selecionada: <strong>${this.fieldCardName(this.selectedField.pi,this.selectedField.zone,this.selectedField.slot)}</strong>`;
      else el.innerHTML = 'Carta selecionada: <strong>nenhuma</strong>';
    },

    snapshot() {
      return typeof structuredClone === 'function' ? structuredClone(state) : JSON.parse(JSON.stringify(state));
    },

    pushHistory(label) {
      this.history.push({ label, state: this.snapshot() });
      if (this.history.length > this.maxHistory) this.history.shift();
    },

    restore(snapshot) {
      Object.keys(state).forEach(k => { if (!(k in snapshot)) delete state[k]; });
      Object.assign(state, typeof structuredClone === 'function' ? structuredClone(snapshot) : JSON.parse(JSON.stringify(snapshot)));
      this.selectedField = null;
      this.selectedKey = null;
      this.updateSelectedLabel();
      this.renderCatalog();
      if (typeof render === 'function') render();
      this.highlightField();
    },

    placeSelected(pi, zone, slot) {
      if (!this.selectedKey) {
        this.selectField(pi, zone, slot);
        return;
      }
      const p = state.players[pi];
      const current = zone === 'front' ? p.front : p.bank[slot];
      this.pushHistory(`Colocar ${CARDS[this.selectedKey].name}`);
      if (current) state.grave.push(current);
      const c = card(this.selectedKey, pi);
      p.leaves = 15;
      if (zone === 'front') p.front = c;
      else p.bank[slot] = c;
      refreshPassiveStats();
      this.selectedField = { pi, zone, slot };
      this.selectedKey = null;
      this.updateSelectedLabel();
      this.renderCatalog();
      this.setStatus(`${CARDS[c.key].name} colocado em ${pi === 0 ? 'seu' : 'alvo'} ${zone === 'front' ? 'Fronte' : `Banco ${slot+1}`}.`);
      render();
      this.highlightField();
    },

    healSelected() {
      const s = this.selectedField;
      if (!s) return this.setStatus('Selecione uma carta do campo primeiro.');
      const p = state.players[s.pi];
      const c = s.zone === 'front' ? p.front : p.bank[s.slot];
      if (!c || !('hp' in c)) return this.setStatus('A carta selecionada não possui HP para curar.');
      this.pushHistory(`Curar ${CARDS[c.key].name}`);
      c.hp = c.maxHp;
      c.damage = 0;
      this.setStatus(`${CARDS[c.key].name} curado para ${c.maxHp} HP.`);
      render();
      this.highlightField();
    },

    killSelected() {
      const s = this.selectedField;
      if (!s) return this.setStatus('Selecione uma carta do campo primeiro.');
      const p = state.players[s.pi];
      const c = s.zone === 'front' ? p.front : p.bank[s.slot];
      if (!c) return this.setStatus('Nenhuma carta nesse slot.');
      this.pushHistory(`Matar ${CARDS[c.key].name}`);
      try {
        defeat(p, c, 1 - s.pi);
      } catch {
        if (s.zone === 'front') p.front = null; else p.bank[s.slot] = null;
        state.grave.push(c);
      }
      this.selectedField = null;
      this.updateSelectedLabel();
      this.setStatus(`${CARDS[c.key].name} enviada ao Cemitério.`);
      render();
      this.highlightField();
    },

    clearField() {
      this.pushHistory('Limpar campo');
      for (const p of state.players) { p.front = null; p.bank = [null,null,null]; }
      this.selectedField = null;
      this.selectedKey = null;
      this.updateSelectedLabel();
      this.renderCatalog();
      this.setStatus('Campo limpo. O histórico pode desfazer esta ação.');
      render();
      this.highlightField();
    },

    reset() {
      state.started = true;
      state.over = false;
      state.round = 1;
      state.turn = 0;
      state.deck = [...DECK_KEYS];
      state.grave = [];
      state.selected = null;
      state.selectedField = null;
      state.targetMode = null;
      state.log = ['Editor resetado.'];
      state.skip = [false, false];
      state.tie = false;
      state.vagaReveal = null;
      state.players = [P('EDITOR'), P('ALVO', false)];
      state.players.forEach(p => { p.leaves = 15; p.moves = 0; p.std = 0; });
      this.history = [];
      this.selectedKey = null;
      this.selectedField = null;
      this.updateSelectedLabel();
      this.renderCatalog();
      this.setStatus('Editor resetado. Histórico limpo.');
      render();
      this.highlightField();
    },

    undo() {
      if (!this.history.length) return this.setStatus('Nada para desfazer.');
      const last = this.history.pop();
      this.restore(last.state);
      this.setStatus(`Desfeito: ${last.label}.`);
    },

    refreshFieldDragables() {
      document.querySelectorAll('.battle-main .card[data-card-id]').forEach(cardEl => {
        cardEl.draggable = true;
      });
    },

    highlightField() {
      this.refreshFieldDragables();
      document.querySelectorAll('.editor-field-selected').forEach(el => el.classList.remove('editor-field-selected'));
      if (!this.selectedField) return;
      const s = this.selectedField;
      const id = s.zone === 'front' ? (s.pi === 0 ? 'pf0' : 'ef0') : `${s.pi === 0 ? 'pb' : 'eb'}${s.slot}`;
      document.getElementById(id)?.classList.add('editor-field-selected');
    },

    setStatus(text) {
      if (this.status) this.status.textContent = text;
    },

    exit() {
      location.reload();
    }
  };

  window.InsetoEditor = EDITOR;
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => EDITOR.init(), 0));
})();
