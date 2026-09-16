/* ============================================================================
   INSETO CARDS — BATTLE FX 3.1.0
   Camada puramente visual. NÃO altera a estrutura do tabuleiro nem as regras.
   Requer GSAP 3.x carregado antes deste arquivo.
   ============================================================================ */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const gs = () => window.gsap;
  const safe = fn => { try { fn?.(); } catch (_) {} };

  const FX = {
    booted: false,
    rendered: false,
    swayTargets: new WeakSet(),
    popupObserver: null,
    stateObserver: null,

    boot() {
      if (this.booted) return;
      this.booted = true;
      const g = gs();
      if (g) {
        g.config({ force3D: true, nullTargetWarn: false });
        g.defaults({ overwrite: 'auto' });
      }
      this.wrapRender();
      this.wrapGameFX();
      this.installCardMotion();
      this.installPointerFX();
      this.installStateMotion();
      this.installPopups();
      this.installAmbient();
      this.intro();
    },

    wrapRender() {
      if (typeof window.render !== 'function' || window.render.__motion203) return;
      const original = window.render;
      const self = this;
      const wrapped = function (...args) {
        const before = new Map();
        $$('.card[data-card-id]').forEach(el => {
          const r = el.getBoundingClientRect();
          before.set(el.dataset.cardId, { x:r.left, y:r.top, w:r.width, h:r.height, parent:el.parentElement });
        });
        const result = original.apply(this, args);
        requestAnimationFrame(() => {
          if (reduced()) return;
          $$('.card[data-card-id]').forEach(el => {
            const old = before.get(el.dataset.cardId);
            const r = el.getBoundingClientRect();
            if (!old) self.cardEnter(el);
            else if (Math.abs(old.x-r.left)>2 || Math.abs(old.y-r.top)>2 || old.parent !== el.parentElement) self.cardFLIP(el, old, r);
          });
          self.refreshCards();
          self.refreshSelection();
        });
        return result;
      };
      wrapped.__motion203 = true;
      window.render = wrapped;
    },

    cardEnter(el) {
      const g = gs(); if (!g || reduced()) return;
      const fromBottom = el.getBoundingClientRect().top > innerHeight * .58;
      const tl = g.timeline({ defaults:{ overwrite:'auto' } });
      tl.fromTo(el,
        { autoAlpha:0, y:fromBottom?42:-34, scale:.58, rotateZ:(Math.random()*18-9), rotateY:fromBottom?-24:24, filter:'blur(9px) brightness(1.7)' },
        { autoAlpha:1, y:0, scale:1, rotateZ:0, rotateY:0, filter:'blur(0px) brightness(1)', duration:.72, ease:'back.out(1.55)', clearProps:'filter' }
      );
      tl.fromTo(el.querySelector('.card-art-wrap'), { scale:1.2, rotate:2 }, { scale:1, rotate:0, duration:.82, ease:'power3.out' }, '<');
      this.spark(el, 12, 42);
    },

    cardFLIP(el, old, now) {
      const g = gs(); if (!g || reduced()) return;
      g.fromTo(el,
        { x:old.x-now.left, y:old.y-now.top, scaleX:old.w/Math.max(now.width,1), scaleY:old.h/Math.max(now.height,1), rotateY:16, rotateZ:(old.x-now.left)/12, filter:'brightness(1.45)' },
        { x:0, y:0, scaleX:1, scaleY:1, rotateY:0, rotateZ:0, filter:'brightness(1)', duration:.7, ease:'expo.out', clearProps:'filter' }
      );
      g.fromTo(el, { boxShadow:'0 0 0 rgba(216,255,125,0)' }, { boxShadow:'0 0 30px rgba(216,255,125,.26)', duration:.16, yoyo:true, repeat:1, clearProps:'boxShadow' });
      this.spark(el, 8, 30);
    },

    refreshCards() {
      $$('.card').forEach(el => {
        if (!el.dataset.motionReady) {
          el.dataset.motionReady = '1';
          this.cardInteraction(el);
        }
        this.startHypnoticSway(el);
      });
    },

    startHypnoticSway(el) {
      const g = gs(); if (!g || reduced() || this.swayTargets.has(el)) return;
      this.swayTargets.add(el);
      const phase = Math.random() * 1.5;
      const amp = el.closest('#hand, .hand') ? 1.35 : 0.72;
      const duration = 2.8 + Math.random() * 1.3;
      g.to(el, {
        rotation: amp,
        yoyo:true,
        repeat:-1,
        duration,
        delay:phase,
        ease:'sine.inOut',
        transformOrigin:'50% 100%',
        overwrite:false
      });
      g.to(el, {
        rotationY:1.1,
        yoyo:true,
        repeat:-1,
        duration:duration*1.7,
        delay:phase+.25,
        ease:'sine.inOut',
        overwrite:false
      });
    },

    cardInteraction(el) {
      const g = gs(); if (!g || reduced()) return;
      const coarse = matchMedia?.('(pointer: coarse)').matches;
      if (!coarse) {
        el.addEventListener('pointermove', e => {
          if (el.classList.contains('dragging')) return;
          const r = el.getBoundingClientRect();
          const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
          g.to(el,{ rotation:0, rotateY:px*15, rotateX:-py*14, x:px*5, y:py*4, scale:1.055, duration:.25, ease:'power3.out' });
          const art=el.querySelector('.card-art');
          if(art) g.to(art,{x:px*7,y:py*5,scale:1.06,duration:.28,ease:'power2.out'});
        });
        el.addEventListener('pointerleave',()=>this.releaseCard(el));
      } else {
        el.addEventListener('pointerdown',()=>g.to(el,{rotation:0,scale:1.065,y:-6,duration:.12,ease:'power2.out'}),{passive:true});
        el.addEventListener('pointerup',()=>this.releaseCard(el),{passive:true});
        el.addEventListener('pointercancel',()=>this.releaseCard(el),{passive:true});
      }
    },

    releaseCard(el) {
      const g=gs(); if(!g || reduced()) return;
      g.to(el,{rotation:0,rotateX:0,rotateY:0,x:0,y:0,scale:1,duration:.55,ease:'elastic.out(1,.42)' });
      const art=el.querySelector('.card-art');
      if(art) g.to(art,{x:0,y:0,scale:1,duration:.5,ease:'elastic.out(1,.45)' });
    },

    wrapGameFX() {
      const base = window.FX;
      if (!base || base.__motion203) return;
      base.__motion203 = true;
      const boardState = base.boardState.bind(base);
      const ring = base.ring.bind(base);
      const burst = base.burst.bind(base);
      const slash = base.slash.bind(base);
      const leaves = base.leaves.bind(base);
      base.boardState = (cls, ms=550) => {
        boardState(cls,ms);
        if(reduced()) return;
        const map={
          'fx-attack':()=>this.attack(),
          'fx-hit':()=>this.hit(),
          'fx-summon':()=>this.summon(),
          'fx-move':()=>this.move(),
          'fx-draw':()=>this.draw(),
          'fx-harvest':()=>this.harvest()
        };
        safe(map[cls]);
      };
      base.ring = el => { ring(el); this.energy(el); };
      base.burst = (el,n=12) => { burst(el,n); this.spark(el,Math.min(34,n+12),70); };
      base.slash = (a,b) => { slash(a,b); this.beam(a,b); this.impact(b); };
      base.leaves = (a,b) => { leaves(a,b); this.leafStream(a,b); };
    },

    attack() {
      const g=gs(); if(!g) return;
      const main=$('.battle-main');
      if(main) g.timeline().to(main,{x:-5,rotateZ:-.18,duration:.045,ease:'power4.out'}).to(main,{x:5,rotateZ:.18,duration:.06}).to(main,{x:-2,rotateZ:-.06,duration:.05}).to(main,{x:0,rotateZ:0,duration:.11,ease:'elastic.out(1,.5)'});
      const cards=$$('.pf0 .card,.ef0 .card,.pb0 .card,.eb0 .card,.eb1 .card,.eb2 .card');
      if(cards.length) g.fromTo(cards,{scale:1},{scale:1.045,duration:.1,stagger:.014,yoyo:true,repeat:1,ease:'power2.inOut'});
      this.shockwave($('.board'), 'coral');
    },

    hit() {
      const g=gs(); if(!g) return;
      g.timeline().to('.board',{filter:'brightness(1.65) saturate(1.35)',duration:.055}).to('.board',{filter:'brightness(1) saturate(1)',duration:.22,clearProps:'filter'});
      this.shockwave($('.board'),'white');
    },

    summon() {
      const g=gs(); if(!g) return;
      const target=$('.pf0 .card, .pb0 .card, .pb1 .card, .pb2 .card');
      if(!target) return;
      g.timeline().fromTo(target,{scale:.38,rotateZ:-16,rotateY:-30,filter:'brightness(2.4) saturate(1.8)'},{scale:1.13,rotateZ:3,rotateY:0,duration:.3,ease:'back.out(2.2)'}).to(target,{scale:1,rotateZ:0,filter:'brightness(1)',duration:.5,ease:'elastic.out(1,.48)',clearProps:'filter'});
      this.energy(target); this.spark(target,32,95); this.rune(target);
    },

    move() {
      const g=gs(); if(!g) return;
      g.timeline().to('.battle-main',{scale:1.012,duration:.14,ease:'power2.out'}).to('.battle-main',{scale:1,duration:.38,ease:'elastic.out(1,.5)'});
      this.shockwave($('.board'),'lime');
    },

    draw() {
      const g=gs(); if(!g) return;
      const pile=$('.natureza .pile');
      if(pile) g.timeline().to(pile,{rotateY:-18,rotateZ:-5,scale:1.14,duration:.18,ease:'power2.out'}).to(pile,{rotateY:360,rotateZ:5,duration:.42,ease:'power3.inOut'}).to(pile,{rotateY:0,rotateZ:0,scale:1,duration:.36,ease:'elastic.out(1,.5)'});
      this.energy(pile); this.spark(pile,24,80);
    },

    harvest() {
      const g=gs(); if(!g) return;
      const pile=$('.natureza .pile');
      if(pile) g.timeline().to(pile,{y:-10,scale:1.12,rotateZ:-2,duration:.16,ease:'power3.out'}).to(pile,{y:0,scale:1,rotateZ:0,duration:.5,ease:'bounce.out'});
      this.spark(pile,20,75); this.leafStorm(pile);
    },

    energy(el) {
      if(reduced() || !el) return;
      const g=gs(), layer=$('#fxLayer'); if(!g||!layer) return;
      const r=el.getBoundingClientRect();
      const ring=document.createElement('i'); ring.className='fx-energy-ring';
      Object.assign(ring.style,{left:`${r.left+r.width/2}px`,top:`${r.top+r.height/2}px`,width:`${Math.max(r.width,40)}px`,height:`${Math.max(r.width,40)}px`});
      layer.appendChild(ring);
      g.timeline({onComplete:()=>ring.remove()}).fromTo(ring,{opacity:.9,scale:.2,rotate:0},{opacity:.25,scale:1.25,rotate:70,duration:.2,ease:'power2.out'}).to(ring,{opacity:0,scale:3.3,rotate:180,duration:.55,ease:'power3.out'});
    },

    spark(el,count=16,distance=60) {
      if(reduced() || !el) return;
      const g=gs(), layer=$('#fxLayer'); if(!g||!layer) return;
      const r=el.getBoundingClientRect();
      for(let i=0;i<count;i++){
        const p=document.createElement('i'); p.className='fx-glitter';
        p.style.left=`${r.left+r.width/2}px`; p.style.top=`${r.top+r.height/2}px`;
        const a=Math.random()*Math.PI*2,d=18+Math.random()*distance;
        layer.appendChild(p);
        g.to(p,{x:Math.cos(a)*d,y:Math.sin(a)*d,scale:.05,opacity:0,rotation:Math.random()*720,duration:.38+Math.random()*.55,delay:Math.random()*.08,ease:'power3.out',onComplete:()=>p.remove()});
      }
    },

    beam(from,to) {
      if(reduced()||!from||!to) return;
      const g=gs(),layer=$('#fxLayer'); if(!g||!layer) return;
      const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
      const x1=a.left+a.width/2,y1=a.top+a.height/2,x2=b.left+b.width/2,y2=b.top+b.height/2;
      const beam=document.createElement('i'); beam.className='fx-attack-beam';
      beam.style.left=`${x1}px`;beam.style.top=`${y1}px`;beam.style.width=`${Math.hypot(x2-x1,y2-y1)}px`;beam.style.transform=`rotate(${Math.atan2(y2-y1,x2-x1)}rad)`;
      layer.appendChild(beam);
      g.timeline({onComplete:()=>beam.remove()}).fromTo(beam,{scaleX:0,opacity:0},{scaleX:1,opacity:1,duration:.09,ease:'power4.out'}).to(beam,{scaleY:3,opacity:0,duration:.19,ease:'power2.in'});
    },

    impact(el) {
      if(!el||reduced()) return;
      const g=gs(); if(!g) return;
      g.timeline().to(el,{scale:1.11,rotateZ:-2,duration:.08,ease:'power3.out'}).to(el,{scale:.98,rotateZ:1,duration:.07}).to(el,{scale:1,rotateZ:0,duration:.28,ease:'elastic.out(1,.45)'});
      this.spark(el,20,70); this.shockwave(el,'coral');
    },

    leafStream(from,to) {
      if(reduced()||!from||!to) return;
      const g=gs(),layer=$('#fxLayer');if(!g||!layer)return;
      const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
      for(let i=0;i<10;i++){
        const leaf=document.createElement('i');leaf.className='fx-leaf-gsap';leaf.textContent='🍃';
        leaf.style.left=`${a.left+a.width/2}px`;leaf.style.top=`${a.top+a.height/2}px`;layer.appendChild(leaf);
        g.to(leaf,{x:b.left+b.width/2-(a.left+a.width/2)+Math.random()*34-17,y:b.top+b.height/2-(a.top+a.height/2)+Math.random()*34-17,rotation:360+Math.random()*720,scale:.35,opacity:0,duration:.65+Math.random()*.3,delay:i*.025,ease:'power2.inOut',onComplete:()=>leaf.remove()});
      }
    },

    leafStorm(el) {
      if(!el) return;
      const g=gs(),layer=$('#fxLayer');if(!g||!layer||reduced())return;
      const r=el.getBoundingClientRect();
      for(let i=0;i<12;i++){
        const leaf=document.createElement('i');leaf.className='fx-leaf-gsap';leaf.textContent='🍃';leaf.style.left=`${r.left+r.width/2}px`;leaf.style.top=`${r.top+r.height/2}px`;layer.appendChild(leaf);
        g.to(leaf,{x:(Math.random()-.5)*150,y:-35-Math.random()*95,rotation:(Math.random()>.5?1:-1)*(180+Math.random()*360),scale:.5,opacity:0,duration:.65+Math.random()*.35,delay:Math.random()*.15,ease:'power2.out',onComplete:()=>leaf.remove()});
      }
    },

    shockwave(el,tone='lime') {
      if(reduced()||!el) return;
      const g=gs(),layer=$('#fxLayer');if(!g||!layer)return;
      const r=el.getBoundingClientRect();const q=document.createElement('i');q.className=`fx-shockwave ${tone}`;
      q.style.left=`${r.left+r.width/2}px`;q.style.top=`${r.top+r.height/2}px`;layer.appendChild(q);
      g.fromTo(q,{scale:.1,opacity:.8},{scale:2.7,opacity:0,duration:.65,ease:'power3.out',onComplete:()=>q.remove()});
    },

    rune(el) {
      if(reduced()||!el) return;
      const g=gs(),layer=$('#fxLayer');if(!g||!layer)return;
      const r=el.getBoundingClientRect();const q=document.createElement('i');q.className='fx-rune';q.textContent='✦';q.style.left=`${r.left+r.width/2}px`;q.style.top=`${r.top+r.height/2}px`;layer.appendChild(q);
      g.timeline({onComplete:()=>q.remove()}).fromTo(q,{scale:0,opacity:0,rotation:-90},{scale:1.6,opacity:1,rotation:0,duration:.22,ease:'back.out(2)'}).to(q,{scale:3,opacity:0,rotation:180,duration:.55,ease:'power2.in'});
    },

    installPointerFX() {
      document.addEventListener('pointermove',e=>{
        const button=e.target.closest('.btn,.action,.mp-btn');if(!button)return;
        const r=button.getBoundingClientRect();button.style.setProperty('--mx',`${e.clientX-r.left}px`);button.style.setProperty('--my',`${e.clientY-r.top}px`);
      },{passive:true});
      document.addEventListener('click',e=>{
        const button=e.target.closest('button,.action,.mp-btn');if(!button||button.disabled||reduced())return;
        const g=gs();if(g)g.fromTo(button,{scale:.94},{scale:1,duration:.48,ease:'elastic.out(1,.55)'});
        this.ripple(button,e.clientX,e.clientY);
      },true);
    },

    ripple(button,x,y) {
      const g=gs();if(!g)return;const r=button.getBoundingClientRect();const q=document.createElement('i');q.className='fx-ripple';q.style.left=`${x-r.left}px`;q.style.top=`${y-r.top}px`;button.appendChild(q);
      g.fromTo(q,{scale:0,opacity:.65},{scale:4.2,opacity:0,duration:.65,ease:'power3.out',onComplete:()=>q.remove()});
    },

    installStateMotion() {
      const board=$('.board'); if(!board)return;
      this.stateObserver=new MutationObserver(mutations=>{
        if(reduced())return;
        const changed=new Set();
        mutations.forEach(m=>{ if(m.type==='attributes' && m.attributeName==='class') changed.add(m.target); });
        changed.forEach(el=>{
          if(el.classList.contains('selected')) this.selected(el,true);
          else if(el.classList.contains('card')) this.selected(el,false);
          if(el.classList.contains('drag-over')) this.dropReady(el,true);
          else if(el.classList.contains('slot')) this.dropReady(el,false);
        });
      });
      this.stateObserver.observe(board,{subtree:true,attributes:true,attributeFilter:['class']});
    },

    selected(el,on) {
      const g=gs();if(!g)return;
      if(on) g.timeline().to(el,{scale:1.07,y:-7,rotateZ:0,duration:.16,ease:'power2.out'}).to(el,{boxShadow:'0 0 0 2px rgba(216,255,125,.8), 0 0 32px rgba(125,245,156,.35)',duration:.2}).to(el,{rotateZ:1.2,yoyo:true,repeat:3,duration:.16,ease:'sine.inOut'});
      else g.to(el,{scale:1,y:0,rotateZ:0,boxShadow:'none',duration:.35,ease:'back.out(1.6)'});
    },

    dropReady(el,on) {
      const g=gs();if(!g)return;
      if(on)g.to(el,{scale:1.045,boxShadow:'inset 0 0 24px rgba(125,245,156,.18), 0 0 20px rgba(125,245,156,.18)',duration:.2,ease:'power2.out'});
      else g.to(el,{scale:1,boxShadow:'none',duration:.3,ease:'power2.out'});
    },

    installPopups() {
      this.popupObserver=new MutationObserver(()=>{
        $$('.action-block-popup.is-visible,.enemy-action-popup.is-visible,.overlay[style*="display: flex"]').forEach(el=>{
          if(el.dataset.motion203) return; el.dataset.motion203='1';
          const g=gs();if(!g||reduced())return;
          g.fromTo(el,{autoAlpha:0,scale:.72,y:-24,rotateX:12,filter:'blur(8px)'},{autoAlpha:1,scale:1,y:0,rotateX:0,filter:'blur(0)',duration:.55,ease:'back.out(1.8)',clearProps:'filter'});
          const modal=el.querySelector('.modal');if(modal)g.fromTo(modal,{scale:.88,rotateZ:-1.5},{scale:1,rotateZ:0,duration:.6,ease:'elastic.out(1,.45)'});
        });
      });
      this.popupObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style']});
    },

    installCardMotion() {
      // Drag visual feedback — não interfere no sistema de drag existente.
      document.addEventListener('dragstart',e=>{const c=e.target.closest('.card');if(c&&!reduced()){const g=gs();g&&g.to(c,{rotation:0,scale:1.08,y:-10,duration:.16,ease:'power2.out'});this.spark(c,10,35);}},true);
      document.addEventListener('dragend',e=>{const c=e.target.closest('.card');if(c)this.releaseCard(c);},true);
    },

    installAmbient() {
      const g=gs();if(!g||reduced())return;
      $$('.pile').forEach((p,i)=>g.to(p,{y:i%2?2:-2,rotateZ:i%2?-.35:.35,duration:2.7+i*.35,repeat:-1,yoyo:true,ease:'sine.inOut',delay:i*.22}));
      const turn=$('.turn');if(turn)g.to(turn,{scale:1.04,opacity:.78,duration:1.4,repeat:-1,yoyo:true,ease:'sine.inOut'});
      const hud=$('.hud');if(hud)g.to(hud,{y:1.5,duration:2.4,repeat:-1,yoyo:true,ease:'sine.inOut'});
      this.ambientDust();
    },

    ambientDust() {
      const g=gs(),layer=$('#fxLayer');if(!g||!layer||reduced())return;
      for(let i=0;i<14;i++){
        const p=document.createElement('i');p.className='fx-dust';p.style.left=`${Math.random()*100}%`;p.style.top=`${45+Math.random()*50}%`;layer.appendChild(p);
        g.to(p,{x:(Math.random()-.5)*90,y:-50-Math.random()*100,opacity:0,duration:4+Math.random()*4,delay:Math.random()*4,repeat:-1,ease:'sine.inOut'});
      }
    },

    refreshSelection() {
      $$('.card.selected').forEach(c=>this.selected(c,true));
    },

    intro() {
      const g=gs();if(!g||reduced())return;
      g.timeline({defaults:{ease:'power3.out'}})
        .from('.battle-main',{autoAlpha:0,scale:.965,filter:'blur(5px)',duration:.7,clearProps:'filter'})
        .from('.left-sidebar .glass-panel',{x:-34,autoAlpha:0,rotateY:-7,duration:.5,stagger:.07},'-=.48')
        .from('.right-sidebar .glass-panel',{x:34,autoAlpha:0,rotateY:7,duration:.5,stagger:.07},'-=.5')
        .from('.hud',{y:-18,autoAlpha:0,duration:.35},'-=.22')
        .from('.card',{y:18,autoAlpha:0,stagger:.035,duration:.35,ease:'back.out(1.5)'},'-=.15');
    }
  };

  const boot=()=>{ if(window.gsap && window.FX && typeof window.render==='function') FX.boot(); else setTimeout(boot,50); };
  boot();
  window.InsetoMotion=FX;
})();
