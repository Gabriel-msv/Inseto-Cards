/* ============================================================================
   INSETO CARDS — BATTLE FX / MOTION SYSTEM
   GSAP-powered visual layer. Does not change game rules.
   ============================================================================ */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const gs = () => window.gsap;
  const safe = (fn) => { try { fn?.(); } catch (_) {} };

  const MotionFX = {
    booted: false,
    firstRender: true,
    lastCards: new Map(),
    cardTimers: new WeakMap(),

    boot() {
      if (this.booted) return;
      this.booted = true;
      const g = gs();
      if (g) {
        g.config({ force3D: true, nullTargetWarn: false });
        g.defaults({ overwrite: 'auto' });
      }

      this.installRenderFLIP();
      this.installBoardFX();
      this.installInteractions();
      this.installPopups();
      this.installMobileUX();
      this.installAmbient();
      this.animateIntro();
    },

    installRenderFLIP() {
      if (typeof window.render !== 'function') return;
      const originalRender = window.render;
      if (originalRender.__motionWrapped) return;

      const wrapped = function (...args) {
        const before = new Map();
        $$('.card[data-card-id]').forEach(el => {
          const id = el.dataset.cardId;
          if (!id) return;
          const r = el.getBoundingClientRect();
          before.set(id, { x: r.left, y: r.top, w: r.width, h: r.height, zone: el.parentElement?.id || '' });
        });

        const result = originalRender.apply(this, args);

        requestAnimationFrame(() => {
          if (reduceMotion()) return;
          $$('.card[data-card-id]').forEach(el => {
            const id = el.dataset.cardId;
            if (!id) return;
            const now = el.getBoundingClientRect();
            const old = before.get(id);
            const fresh = !old;
            const moved = old && (Math.abs(old.x - now.left) > 3 || Math.abs(old.y - now.top) > 3 || old.zone !== (el.parentElement?.id || ''));

            if (fresh) {
              MotionFX.enterCard(el);
            } else if (moved) {
              MotionFX.flipCard(el, old, now);
            }
          });
          MotionFX.refreshCards();
        });
        return result;
      };
      wrapped.__motionWrapped = true;
      window.render = wrapped;
    },

    enterCard(el) {
      const g = gs();
      if (!g || reduceMotion()) return;
      const rect = el.getBoundingClientRect();
      const fromY = rect.top > innerHeight * .65 ? 38 : -30;
      g.fromTo(el,
        { autoAlpha: 0, y: fromY, scale: .72, rotateZ: (Math.random() * 10 - 5), rotateY: 20, filter: 'blur(7px) brightness(1.5)' },
        { autoAlpha: 1, y: 0, scale: 1, rotateZ: 0, rotateY: 0, filter: 'blur(0px) brightness(1)', duration: .68, ease: 'back.out(1.7)', clearProps: 'filter' }
      );
      g.fromTo(el.querySelector('.card-art-wrap'), { scale: 1.15 }, { scale: 1, duration: .75, ease: 'power3.out' });
    },

    flipCard(el, old, now) {
      const g = gs();
      if (!g || reduceMotion()) return;
      const dx = old.x - now.left;
      const dy = old.y - now.top;
      const sx = old.w / Math.max(now.width, 1);
      const sy = old.h / Math.max(now.height, 1);
      g.fromTo(el,
        { x: dx, y: dy, scaleX: sx, scaleY: sy, rotateY: 14, filter: 'brightness(1.35)' },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, rotateY: 0, filter: 'brightness(1)', duration: .62, ease: 'expo.out', clearProps: 'filter' }
      );
      g.fromTo(el, { boxShadow: '0 0 0 rgba(125,245,156,0)' }, { boxShadow: '0 0 32px rgba(125,245,156,.22)', duration: .18, yoyo: true, repeat: 1, clearProps: 'boxShadow' });
    },

    refreshCards() {
      if (reduceMotion()) return;
      $$('.card').forEach(el => {
        if (el.dataset.motionReady) return;
        el.dataset.motionReady = '1';
        this.cardTilt(el);
      });
    },

    cardTilt(el) {
      const g = gs();
      if (!g) return;
      const isTouch = matchMedia?.('(pointer: coarse)').matches;

      if (!isTouch) {
        el.addEventListener('pointermove', e => {
          if (el.classList.contains('dragging')) return;
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - .5;
          const py = (e.clientY - r.top) / r.height - .5;
          g.to(el, { rotateY: px * 12, rotateX: -py * 12, x: px * 4, y: py * 3, duration: .25, ease: 'power2.out', transformPerspective: 700 });
          const art = el.querySelector('.card-art');
          if (art) g.to(art, { x: px * 5, y: py * 4, scale: 1.045, duration: .25, overwrite: true });
        });
        el.addEventListener('pointerleave', () => {
          g.to(el, { rotateY: 0, rotateX: 0, x: 0, y: 0, duration: .45, ease: 'elastic.out(1,.5)' });
          const art = el.querySelector('.card-art');
          if (art) g.to(art, { x: 0, y: 0, scale: 1, duration: .45, ease: 'elastic.out(1,.5)' });
        });
      } else {
        el.addEventListener('pointerdown', () => g.to(el, { scale: 1.055, y: -5, duration: .16, ease: 'power2.out' }), { passive: true });
        el.addEventListener('pointerup', () => g.to(el, { scale: 1, y: 0, duration: .3, ease: 'back.out(2)' }), { passive: true });
        el.addEventListener('pointercancel', () => g.to(el, { scale: 1, y: 0, duration: .3 }), { passive: true });
      }
    },

    installBoardFX() {
      const board = $('.board');
      if (!board) return;
      const original = window.FX;
      if (!original || original.__motionEnhanced) return;
      original.__motionEnhanced = true;
      const baseBoard = original.boardState.bind(original);
      const baseRing = original.ring.bind(original);
      const baseBurst = original.burst.bind(original);
      const baseSlash = original.slash.bind(original);
      const baseLeaves = original.leaves.bind(original);

      original.boardState = (cls, ms = 550) => {
        baseBoard(cls, ms);
        if (reduceMotion()) return;
        const g = gs();
        const b = $('.board');
        if (!g || !b) return;
        const map = {
          'fx-attack': () => this.attackCinematic(),
          'fx-hit': () => this.hitCinematic(),
          'fx-summon': () => this.summonCinematic(),
          'fx-move': () => this.moveCinematic(),
          'fx-draw': () => this.drawCinematic(),
          'fx-harvest': () => this.harvestCinematic()
        };
        safe(map[cls]);
      };

      original.ring = (el) => {
        baseRing(el);
        this.energyRing(el);
      };
      original.burst = (el, n = 12) => {
        baseBurst(el, n);
        this.glitterBurst(el, Math.min(28, n + 8));
      };
      original.slash = (from, to) => {
        baseSlash(from, to);
        this.attackBeam(from, to);
      };
      original.leaves = (from, to) => {
        baseLeaves(from, to);
        this.leafStream(from, to);
      };
    },

    attackCinematic() {
      const g = gs();
      if (!g) return;
      const cards = $$('.pf0 .card, .ef0 .card, .pb0 .card, .eb0 .card, .eb1 .card, .eb2 .card');
      g.timeline({ defaults: { overwrite: 'auto' } })
        .to('.battle-main', { x: -3, duration: .055, ease: 'power2.out' })
        .to('.battle-main', { x: 3, duration: .07, ease: 'power2.inOut' })
        .to('.battle-main', { x: 0, duration: .09, ease: 'power2.out' });
      if (cards.length) g.fromTo(cards, { scale: 1 }, { scale: 1.035, duration: .11, stagger: .018, yoyo: true, repeat: 1, ease: 'power2.inOut' });
    },

    hitCinematic() {
      const g = gs(); if (!g) return;
      g.fromTo('.board', { filter: 'brightness(1)' }, { filter: 'brightness(1.2)', duration: .07, yoyo: true, repeat: 1, clearProps: 'filter' });
    },

    summonCinematic() {
      const g = gs(); if (!g) return;
      const target = $('.pf0 .card, .pb0 .card, .pb1 .card, .pb2 .card');
      if (!target) return;
      g.timeline()
        .fromTo(target, { scale: .55, rotateZ: -10, filter: 'brightness(2) saturate(1.5)' }, { scale: 1.08, rotateZ: 2, duration: .28, ease: 'back.out(2)' })
        .to(target, { scale: 1, rotateZ: 0, filter: 'brightness(1)', duration: .42, ease: 'elastic.out(1,.55)', clearProps: 'filter' });
      this.glitterBurst(target, 22);
    },

    moveCinematic() {
      const g = gs(); if (!g) return;
      g.fromTo('.board', { scale: 1 }, { scale: 1.006, duration: .16, yoyo: true, repeat: 1, ease: 'sine.inOut' });
    },

    drawCinematic() {
      const g = gs(); if (!g) return;
      const pile = $('.natureza .pile');
      if (pile) g.fromTo(pile, { rotateY: 0, scale: 1 }, { rotateY: 360, scale: 1.1, duration: .7, ease: 'back.out(1.2)' });
    },

    harvestCinematic() {
      const g = gs(); if (!g) return;
      const pile = $('.natureza .pile');
      if (pile) g.timeline().to(pile, { y: -7, scale: 1.08, duration: .18, ease: 'power2.out' }).to(pile, { y: 0, scale: 1, duration: .45, ease: 'bounce.out' });
    },

    energyRing(el) {
      if (reduceMotion()) return;
      const g = gs(); const layer = $('#fxLayer');
      if (!g || !layer || !el) return;
      const r = el.getBoundingClientRect();
      const ring = document.createElement('i');
      ring.className = 'fx-energy-ring';
      ring.style.left = `${r.left + r.width / 2}px`;
      ring.style.top = `${r.top + r.height / 2}px`;
      ring.style.width = `${Math.max(r.width, 42)}px`;
      ring.style.height = `${Math.max(r.width, 42)}px`;
      layer.appendChild(ring);
      g.fromTo(ring, { opacity: .9, scale: .25, rotate: 0 }, { opacity: 0, scale: 2.8, rotate: 90, duration: .7, ease: 'power3.out', onComplete: () => ring.remove() });
    },

    glitterBurst(el, count = 18) {
      if (reduceMotion()) return;
      const g = gs(); const layer = $('#fxLayer'); if (!g || !layer || !el) return;
      const r = el.getBoundingClientRect();
      for (let i = 0; i < count; i++) {
        const p = document.createElement('i'); p.className = 'fx-glitter';
        p.style.left = `${r.left + r.width / 2}px`; p.style.top = `${r.top + r.height / 2}px`;
        const a = Math.random() * Math.PI * 2, d = 25 + Math.random() * 100;
        p.style.setProperty('--tx', `${Math.cos(a) * d}px`); p.style.setProperty('--ty', `${Math.sin(a) * d}px`);
        layer.appendChild(p);
        g.to(p, { x: `var(--tx)`, y: `var(--ty)`, scale: .1, opacity: 0, rotation: Math.random() * 360, duration: .45 + Math.random() * .4, delay: Math.random() * .05, ease: 'power3.out', onComplete: () => p.remove() });
      }
    },

    attackBeam(from, to) {
      if (reduceMotion() || !from || !to) return;
      const g = gs(); const layer = $('#fxLayer'); if (!g || !layer) return;
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const beam = document.createElement('i'); beam.className = 'fx-attack-beam';
      beam.style.left = `${a.left + a.width / 2}px`; beam.style.top = `${a.top + a.height / 2}px`;
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      beam.style.width = `${Math.hypot(dx, dy)}px`; beam.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      layer.appendChild(beam);
      g.timeline({ onComplete: () => beam.remove() })
        .fromTo(beam, { scaleX: 0, opacity: 0, transformOrigin: '0% 50%' }, { scaleX: 1, opacity: 1, duration: .12, ease: 'power3.out' })
        .to(beam, { opacity: 0, scaleY: 2.2, duration: .16, ease: 'power2.in' });
    },

    leafStream(from, to) {
      if (reduceMotion()) return;
      const g = gs(); const layer = $('#fxLayer'); if (!g || !layer || !from || !to) return;
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      for (let i = 0; i < 7; i++) {
        const leaf = document.createElement('i'); leaf.className = 'fx-leaf-gsap'; leaf.textContent = '🍃';
        leaf.style.left = `${a.left + a.width / 2}px`; leaf.style.top = `${a.top + a.height / 2}px`;
        layer.appendChild(leaf);
        g.to(leaf, { x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2), rotation: 360 + Math.random() * 360, scale: .45, opacity: 0, duration: .65 + Math.random() * .2, delay: i * .035, ease: 'power2.inOut', onComplete: () => leaf.remove() });
      }
    },

    installInteractions() {
      document.addEventListener('click', e => {
        const button = e.target.closest('button, .action, .mp-btn');
        if (!button || button.disabled || reduceMotion()) return;
        this.ripple(button, e.clientX, e.clientY);
        const g = gs();
        if (g) g.fromTo(button, { scale: .96 }, { scale: 1, duration: .4, ease: 'elastic.out(1,.55)' });
      }, true);

      document.addEventListener('pointerdown', e => {
        const button = e.target.closest('.btn, .action, .mp-btn');
        if (!button || button.disabled || reduceMotion()) return;
        const g = gs(); if (g) g.to(button, { y: 1, scale: .975, duration: .09, ease: 'power2.out' });
      }, { passive: true });
      document.addEventListener('pointerup', e => {
        const button = e.target.closest('.btn, .action, .mp-btn');
        if (!button || reduceMotion()) return;
        const g = gs(); if (g) g.to(button, { y: 0, scale: 1, duration: .28, ease: 'back.out(2)' });
      }, { passive: true });
    },

    ripple(button, x, y) {
      const g = gs(); const r = button.getBoundingClientRect();
      const wave = document.createElement('i'); wave.className = 'fx-ripple';
      wave.style.left = `${(x || r.left + r.width / 2) - r.left}px`;
      wave.style.top = `${(y || r.top + r.height / 2) - r.top}px`;
      button.appendChild(wave);
      if (g) g.fromTo(wave, { scale: 0, opacity: .55 }, { scale: 3.5, opacity: 0, duration: .55, ease: 'power2.out', onComplete: () => wave.remove() });
      else setTimeout(() => wave.remove(), 600);
    },

    installPopups() {
      const observer = new MutationObserver(() => {
        $$('.action-block-popup.is-visible, .enemy-action-popup.is-visible, .overlay[style*="display: flex"]').forEach(el => {
          if (el.dataset.motionPopup) return;
          el.dataset.motionPopup = '1';
          const g = gs(); if (!g || reduceMotion()) return;
          g.fromTo(el, { opacity: 0, scale: .82, y: -12, filter: 'blur(5px)' }, { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: .42, ease: 'back.out(1.8)', clearProps: 'filter' });
        });
      });
      observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    },

    installMobileUX() {
      const hand = $('.hand-panel');
      if (!hand) return;
      const mq = matchMedia('(max-width: 900px)');
      const update = () => {
        if (!mq.matches) hand.classList.remove('mobile-hand-visible');
      };
      mq.addEventListener?.('change', update);
      update();

      let lastY = 0;
      document.addEventListener('touchstart', e => { lastY = e.touches[0]?.clientY || 0; }, { passive: true });
      document.addEventListener('touchmove', e => {
        if (!mq.matches) return;
        const y = e.touches[0]?.clientY || lastY;
        const dy = lastY - y;
        if (Math.abs(dy) > 20) hand.classList.toggle('mobile-hand-visible', dy > 0);
        lastY = y;
      }, { passive: true });
    },

    installAmbient() {
      if (reduceMotion()) return;
      const g = gs(); if (!g) return;
      const piles = $$('.pile');
      piles.forEach((pile, i) => g.to(pile, { y: i % 2 ? 1.5 : -1.5, duration: 2.5 + i * .35, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * .25 }));
      const turn = $('.turn');
      if (turn) g.to(turn, { scale: 1.035, opacity: .82, duration: 1.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    },

    animateIntro() {
      const g = gs(); if (!g || reduceMotion()) return;
      g.timeline({ defaults: { ease: 'power3.out' } })
        .from('.battle-main', { opacity: 0, scale: .975, duration: .65 })
        .from('.left-sidebar .glass-panel', { x: -28, opacity: 0, duration: .5, stagger: .08 }, '-=.4')
        .from('.right-sidebar .glass-panel', { x: 28, opacity: 0, duration: .5, stagger: .08 }, '-=.45')
        .from('.hud', { y: -14, opacity: 0, duration: .35 }, '-=.25');
    }
  };

  const wait = () => {
    if (window.gsap && window.FX && typeof window.render === 'function') MotionFX.boot();
    else setTimeout(wait, 50);
  };
  wait();
  window.InsetoMotion = MotionFX;
})();
