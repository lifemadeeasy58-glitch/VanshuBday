/* ============================================================
   VANSHU BIRTHDAY WEBSITE  —  script.js  v2 (Premium Build)
   ============================================================ */
'use strict';

/* ─────────────────────────────────────────────────────────────
   0. PAGE LOADER
   Hide the loader once fonts + DOM are ready.
───────────────────────────────────────────────────────────── */
const loader = document.getElementById('pageLoader');
function dismissLoader() {
  if (loader) {
    loader.classList.add('done');
    setTimeout(() => { if (loader.parentNode) loader.parentNode.removeChild(loader); }, 700);
  }
}
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(dismissLoader);
} else {
  window.addEventListener('load', dismissLoader);
}
setTimeout(dismissLoader, 2800); // hard cap

/* ─────────────────────────────────────────────────────────────
   1. CUSTOM HEART CURSOR  (desktop hover-capable devices only)
───────────────────────────────────────────────────────────── */
const cursorEl = document.getElementById('cursorHeart');
if (cursorEl && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let cx = -100, cy = -100;
  document.addEventListener('mousemove', e => {
    cx = e.clientX; cy = e.clientY;
    cursorEl.style.left = cx + 'px';
    cursorEl.style.top  = cy + 'px';
  }, { passive: true });
  document.addEventListener('mouseleave', () => {
    cursorEl.style.left = '-100px';
    cursorEl.style.top  = '-100px';
  });
} else if (cursorEl) {
  cursorEl.style.display = 'none';
}

/* ─────────────────────────────────────────────────────────────
   2. AMBIENT MUSIC  (Web Audio API — no external files needed)
───────────────────────────────────────────────────────────── */
let audioCtx = null, masterGain = null, musicPlaying = false;
const scheduledNodes = [];

function buildMusic() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();

  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.07, audioCtx.currentTime + 1.5);
  masterGain.connect(audioCtx.destination);

  // Reverb (convolver with synthetic impulse)
  const convolver = audioCtx.createConvolver();
  const irLen = audioCtx.sampleRate * 2.2;
  const irBuf = audioCtx.createBuffer(2, irLen, audioCtx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = irBuf.getChannelData(c);
    for (let i = 0; i < irLen; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.5);
  }
  convolver.buffer = irBuf;
  convolver.connect(masterGain);

  const dryGain = audioCtx.createGain(); dryGain.gain.value = 0.6; dryGain.connect(masterGain);
  const wetGain = audioCtx.createGain(); wetGain.gain.value = 0.4; wetGain.connect(convolver);

  // ── Melody: a gentle repeating pentatonic lullaby ──
  const C4=261.63,D4=293.66,E4=329.63,G4=392,A4=440,C5=523.25,D5=587.33,E5=659.25;
  const melody = [
    [C4,0.5],[E4,0.5],[G4,0.5],[A4,0.5],
    [G4,0.75],[E4,0.25],[C4,0.5],[D4,0.5],
    [E4,0.5],[G4,0.5],[A4,0.5],[C5,0.5],
    [A4,0.75],[G4,0.5],[E4,0.75],
    [D5,0.5],[C5,0.5],[A4,0.5],[G4,0.5],
    [E4,0.5],[C4,0.5],[D4,0.5],[E4,0.5],
    [G4,0.75],[A4,0.25],[C5,0.5],[D5,0.5],
    [C5,1.5],[C4,0.5]
  ];
  const totalDur = melody.reduce((s, n) => s + n[1], 0);
  const BPM = 72, beatSec = 60 / BPM;

  function scheduleMelody(startTime, loop = true) {
    let t = startTime;
    melody.forEach(([freq, beats]) => {
      const dur = beats * beatSec;
      const osc = audioCtx.createOscillator();
      const env = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.6, t + 0.04);
      env.gain.setValueAtTime(0.6, t + dur * 0.7);
      env.gain.linearRampToValueAtTime(0, t + dur * 0.95);
      osc.connect(env); env.connect(dryGain); env.connect(wetGain);
      osc.start(t); osc.stop(t + dur);
      scheduledNodes.push(osc);
      t += dur;
    });
    if (loop) {
      setTimeout(() => { if (musicPlaying) scheduleMelody(audioCtx.currentTime + 0.05); },
        (t - startTime) * 1000 - 300);
    }
  }

  // ── Pad chords ──
  [[C4/2,E4/2,G4/2],[G4/4*3,D4,G4/2],[A4/2,C4,E4],[F4=349.23,A4/2,C5/2]].forEach((chord,ci) => {
    chord.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const env = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      env.gain.value = 0.06;
      osc.connect(env); env.connect(wetGain);
      osc.start(); scheduledNodes.push(osc);
    });
  });

  scheduleMelody(audioCtx.currentTime + 0.1);
}

function stopMusic() {
  if (masterGain) {
    masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
    setTimeout(() => {
      scheduledNodes.forEach(n => { try { n.stop(); } catch(e) {} });
      scheduledNodes.length = 0;
      masterGain.disconnect();
      masterGain = null;
    }, 1000);
  }
  musicPlaying = false;
}

const musicToggle = document.getElementById('musicToggle');
const musicIcon   = document.getElementById('musicIcon');
const musicLabel  = document.getElementById('musicLabel');

if (musicToggle) {
  musicToggle.addEventListener('click', () => {
    if (!musicPlaying) {
      buildMusic();
      musicPlaying = true;
      musicToggle.classList.add('on');
      if (musicIcon)  musicIcon.textContent  = '🎵';
      if (musicLabel) musicLabel.textContent = 'Music ON';
    } else {
      stopMusic();
      musicToggle.classList.remove('on');
      if (musicIcon)  musicIcon.textContent  = '🎵';
      if (musicLabel) musicLabel.textContent = 'Music';
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   3. BACKGROUND PARTICLES  (opening screen)
───────────────────────────────────────────────────────────── */
function spawnParticles() {
  const layer = document.getElementById('particlesLayer');
  if (!layer) return;
  const emojis = ['💗','✨','⭐','🌸','💕','🌷','💫','🎀','🌺','💖'];
  const count = window.innerWidth < 480 ? 16 : 28;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'ptcl';
    el.textContent = emojis[i % emojis.length];
    el.style.cssText = [
      `left:${Math.random() * 100}vw`,
      `font-size:${11 + Math.random() * 14}px`,
      `animation-duration:${9 + Math.random() * 14}s`,
      `animation-delay:${Math.random() * 14}s`,
      `opacity:${0.4 + Math.random() * 0.5}`
    ].join(';');
    layer.appendChild(el);
  }
}

function spawnButterflies() {
  const layer = document.getElementById('butterfliesLayer');
  if (!layer) return;
  const icons = ['🦋','🌸','✨'];
  const count = window.innerWidth < 480 ? 4 : 7;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'bfly';
    const vy = 20 + Math.random() * 50;
    el.textContent = icons[i % icons.length];
    el.style.cssText = [
      `top:${10 + Math.random() * 80}vh`,
      `font-size:${18 + Math.random() * 12}px`,
      `animation-duration:${16 + Math.random() * 14}s`,
      `animation-delay:${Math.random() * 18}s`,
      `--vy:${vy}px`
    ].join(';');
    layer.appendChild(el);
  }
}

spawnParticles();
spawnButterflies();

/* ─────────────────────────────────────────────────────────────
   4. CONFETTI
───────────────────────────────────────────────────────────── */
function fireConfetti(count = 110) {
  const layer = document.getElementById('confettiLayer');
  if (!layer) return;
  const colors = ['#FFD6E7','#FFB6D5','#F8A5C2','#E6D6FF','#E75480',
                  '#ffffff','#FFE066','#A8E6CF','#FFDAB9','#B4E4FF'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'cft';
    const size = 6 + Math.random() * 9;
    el.style.cssText = [
      `left:${Math.random() * 100}vw`,
      `width:${size}px`,
      `height:${size * (Math.random() > 0.5 ? 1 : 2.5)}px`,
      `background:${colors[Math.floor(Math.random() * colors.length)]}`,
      `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
      `animation-duration:${1.6 + Math.random() * 2.4}s`,
      `animation-delay:${Math.random() * 0.9}s`,
      `transform:rotate(${Math.random() * 360}deg)`
    ].join(';');
    layer.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
}

/* ─────────────────────────────────────────────────────────────
   5. GIFT BOX OPEN  →  TRANSITION TO HERO
───────────────────────────────────────────────────────────── */
const giftBox  = document.getElementById('giftBox');
const giftSparks = document.getElementById('giftSparks');
const openBtn  = document.getElementById('openBtn');
let giftOpened = false;

function openGiftAndTransition() {
  if (giftOpened) return;
  giftOpened = true;

  // 1. Open lid
  giftBox.classList.add('opened');

  // 2. Burst sparkles
  const sparkEmojis = ['✨','💗','⭐','🌸','💕','💖','🎉','💝'];
  for (let i = 0; i < 16; i++) {
    const el = document.createElement('span');
    el.className = 'spark-piece';
    el.textContent = sparkEmojis[i % sparkEmojis.length];
    const angle = (i / 16) * 360 * (Math.PI / 180);
    const dist = 55 + Math.random() * 65;
    el.style.setProperty('--sx', `${Math.cos(angle) * dist}px`);
    el.style.setProperty('--sy', `${Math.sin(angle) * dist}px`);
    el.style.animationDuration = `${0.7 + Math.random() * 0.4}s`;
    giftSparks.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  // 3. Confetti
  fireConfetti(130);

  // 4. Fade opening section → show hero
  setTimeout(() => {
    const opening = document.getElementById('opening');
    const hero    = document.getElementById('hero');
    if (!opening || !hero) return;

    opening.style.transition = 'opacity 0.75s ease, transform 0.75s ease';
    opening.style.opacity    = '0';
    opening.style.transform  = 'scale(0.97)';

    setTimeout(() => {
      opening.setAttribute('hidden', '');
      opening.style.cssText = ''; // clean up inline styles
      showHero(hero);
    }, 780);
  }, 1600);
}

function showHero(heroEl) {
  heroEl.removeAttribute('hidden');
  heroEl.style.opacity = '0';
  heroEl.style.transform = 'translateY(18px)';
  heroEl.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
  // Force reflow
  void heroEl.offsetHeight;
  heroEl.style.opacity   = '1';
  heroEl.style.transform = 'translateY(0)';

  setTimeout(() => {
    heroEl.style.cssText = '';
    spawnBalloons();
    revealAllSections();      // make all subsequent sections visible in DOM
    initCardReveal();         // kick off IntersectionObserver for scroll cards
    initSectionTriggers();    // observe heavy sections (finale, etc.)
  }, 720);
}

if (openBtn)  openBtn.addEventListener('click', openGiftAndTransition);
if (giftBox)  giftBox.addEventListener('click', openGiftAndTransition);
if (giftBox) {
  giftBox.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGiftAndTransition(); }
  });
}

/* ─────────────────────────────────────────────────────────────
   6. BALLOONS
───────────────────────────────────────────────────────────── */
function spawnBalloons() {
  const layer = document.getElementById('balloonsLayer');
  if (!layer) return;
  const colors = ['#FFD6E7','#FFB6D5','#F8A5C2','#E6D6FF',
                  '#A8E6CF','#FFE066','#FFDAB9','#B4E4FF'];
  const count = window.innerWidth < 480 ? 8 : 14;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'balloon';
    el.style.cssText = [
      `left:${5 + Math.random() * 90}vw`,
      `width:${38 + Math.random() * 14}px`,
      `height:${46 + Math.random() * 16}px`,
      `background:${colors[Math.floor(Math.random() * colors.length)]}`,
      `box-shadow:0 4px 16px rgba(0,0,0,0.08),inset -4px -4px 10px rgba(0,0,0,0.06)`,
      `--bx:${Math.random() * 60 - 30}px`,
      `--br:${Math.random() * 20 - 10}deg`,
      `animation-duration:${9 + Math.random() * 11}s`,
      `animation-delay:${Math.random() * 10}s`
    ].join(';');
    layer.appendChild(el);
  }
}

/* ─────────────────────────────────────────────────────────────
   7. REVEAL ALL SUBSEQUENT SECTIONS
   The fix: sections use HTML [hidden] attribute. We remove it
   and let opacity start at 0, controlled by their own CSS.
   This way IntersectionObserver can observe them properly.
───────────────────────────────────────────────────────────── */
const SECTION_IDS = ['letter','distance','reasons','wishes','promises','finale'];

function revealAllSections() {
  SECTION_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.hasAttribute('hidden')) {
      el.removeAttribute('hidden');
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   8. SCROLL-TRIGGERED CARD REVEAL
───────────────────────────────────────────────────────────── */
function initCardReveal() {
  const cards = document.querySelectorAll('.card-reveal');
  if (!cards.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const card  = entry.target;
      const siblings = Array.from(card.closest('[class*="grid"],[class*="cards"],[class*="promises"]')?.children || [card]);
      const idx   = siblings.indexOf(card);
      setTimeout(() => card.classList.add('in'), Math.min(idx * 80, 500));
      obs.unobserve(card);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  cards.forEach(c => obs.observe(c));
}

/* ─────────────────────────────────────────────────────────────
   9. SECTION-LEVEL TRIGGERS (envelope auto-open, finale init)
───────────────────────────────────────────────────────────── */
function initSectionTriggers() {
  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;

      if (id === 'letter') {
        // Auto-open envelope after 1.4 s if user hasn't tapped it
        setTimeout(() => {
          if (!envelopeOpened) openEnvelope();
        }, 1400);
        sectionObs.unobserve(entry.target);
      }

      if (id === 'finale') {
        setupFinale();
        setTimeout(startTyping, 900);
        sectionObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.25 });

  SECTION_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) sectionObs.observe(el);
  });
}

/* ─────────────────────────────────────────────────────────────
   10. BIRTHDAY CAKE — MAKE A WISH
───────────────────────────────────────────────────────────── */
const makeWishBtn = document.getElementById('makeWishBtn');
const wishReveal  = document.getElementById('wishReveal');
let   wishedAlready = false;

if (makeWishBtn) {
  makeWishBtn.addEventListener('click', () => {
    if (wishedAlready) return;
    wishedAlready = true;
    makeWishBtn.disabled = true;
    makeWishBtn.textContent = '✨ Wish Made! ✨';

    // Blow out candles one by one with a small puff
    const flames = document.querySelectorAll('.flame');
    flames.forEach((flame, i) => {
      setTimeout(() => {
        flame.classList.add('out');
        // smoke puff
        const puff = document.createElement('span');
        puff.textContent = '💨';
        puff.style.cssText = `
          position:absolute;top:-32px;left:50%;transform:translateX(-50%);
          font-size:14px;pointer-events:none;
          animation:sparkBurst 0.9s ease-out forwards;
          --sx:0px;--sy:-36px;
        `;
        flame.parentElement.style.position = 'relative';
        flame.parentElement.appendChild(puff);
        setTimeout(() => puff.remove(), 950);
      }, i * 280);
    });

    setTimeout(() => {
      wishReveal.classList.remove('hidden');
      fireConfetti(70);
    }, flames.length * 280 + 500);
  });
}

/* ─────────────────────────────────────────────────────────────
   11. LOVE LETTER ENVELOPE
───────────────────────────────────────────────────────────── */
let envelopeOpened = false;

function openEnvelope() {
  if (envelopeOpened) return;
  envelopeOpened = true;

  const env     = document.getElementById('envelope');
  const sheet   = document.getElementById('letterSheet');
  const stage   = document.getElementById('envelopeStage');
  if (!env || !sheet) return;

  env.classList.add('opened');
  env.style.pointerEvents = 'none';

  setTimeout(() => {
    env.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    env.style.opacity    = '0';
    env.style.transform  = 'translateY(-16px) scale(0.94)';

    setTimeout(() => {
      env.setAttribute('hidden', '');
      env.style.cssText = '';
      sheet.classList.remove('hidden');
      // Trigger layout for animation
      void sheet.offsetHeight;
    }, 520);
  }, 650);
}

const envEl = document.getElementById('envelope');
if (envEl) {
  envEl.addEventListener('click', openEnvelope);
  envEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEnvelope(); }
  });
}

/* ─────────────────────────────────────────────────────────────
   12. WISH MACHINE
───────────────────────────────────────────────────────────── */
const WISHES = [
  "A year overflowing with joy, laughter, and pure happiness. 🌟",
  "Every one of your dreams turning into a beautiful reality. ✨",
  "Endless reasons to smile, every single morning. 🌸",
  "Unexpected moments of pure magic and wonder, all year long. 💫",
  "Remarkable success in everything you pursue with love. 🌺",
  "A heart that always feels completely safe, seen, and loved. 💗",
  "Beautiful adventures, spontaneous joy, and memories for a lifetime. 🌈",
  "Every little wish your heart has ever dared to dream. 💖",
  "Perfect peace, good health, and a soul full of gratitude. 🕊️",
  "All the love, warmth, and happiness you so deeply deserve. 🎁"
];

const wishBtn    = document.getElementById('wishBtn');
const wishOutput = document.getElementById('wishOutput');
const wishQuote  = document.getElementById('wishQuote');
const wishNudge  = document.getElementById('wishNudge');
const orb        = document.getElementById('orb');
let   lastWishIdx = -1;

if (wishBtn) {
  wishBtn.addEventListener('click', () => {
    wishBtn.disabled = true;

    // Spin orb
    if (orb) {
      orb.classList.add('burst');
      orb.addEventListener('animationend', () => orb.classList.remove('burst'), { once: true });
    }

    setTimeout(() => {
      let idx;
      do { idx = Math.floor(Math.random() * WISHES.length); } while (idx === lastWishIdx && WISHES.length > 1);
      lastWishIdx = idx;

      if (wishQuote) wishQuote.textContent = WISHES[idx];

      // Animate the card out then back in if already visible
      if (wishOutput && !wishOutput.classList.contains('hidden')) {
        wishOutput.style.animation = 'none';
        void wishOutput.offsetHeight;
        wishOutput.style.animation = '';
      }
      if (wishOutput) wishOutput.classList.remove('hidden');
      if (wishNudge)  wishNudge.textContent = 'Tap again for another wish! 💫';

      fireConfetti(50);
      wishBtn.disabled = false;
    }, 620);
  });
}

/* ─────────────────────────────────────────────────────────────
   13. FINALE SETUP  (stars + floating hearts background)
───────────────────────────────────────────────────────────── */
let finaleSetupDone = false;

function setupFinale() {
  if (finaleSetupDone) return;
  finaleSetupDone = true;

  // Stars
  const starsEl = document.getElementById('finaleStars');
  if (starsEl) {
    const starCount = window.innerWidth < 480 ? 55 : 90;
    for (let i = 0; i < starCount; i++) {
      const s = document.createElement('span');
      s.className = 'f-star';
      s.textContent = Math.random() > 0.45 ? '⭐' : '✨';
      s.style.cssText = [
        `left:${Math.random() * 100}vw`,
        `top:${Math.random() * 100}vh`,
        `font-size:${7 + Math.random() * 13}px`,
        `animation-duration:${1.4 + Math.random() * 3}s`,
        `animation-delay:${Math.random() * 3}s`
      ].join(';');
      starsEl.appendChild(s);
    }
  }

  // Floating hearts
  const floatersEl = document.getElementById('finaleFloaters');
  if (floatersEl) {
    const hCount = window.innerWidth < 480 ? 10 : 18;
    const hEmojis = ['💗','💖','💕','❤️','🌸'];
    for (let i = 0; i < hCount; i++) {
      const h = document.createElement('span');
      h.className = 'f-floater';
      h.textContent = hEmojis[i % hEmojis.length];
      h.style.cssText = [
        `left:${Math.random() * 100}vw`,
        `font-size:${14 + Math.random() * 18}px`,
        `animation-duration:${7 + Math.random() * 9}s`,
        `animation-delay:${Math.random() * 9}s`
      ].join(';');
      floatersEl.appendChild(h);
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   14. TYPING ANIMATION
───────────────────────────────────────────────────────────── */
const TYPING_MSG =
`Happy Birthday, Vanshu! ❤️

You are loved.
You are special.
You are precious.
And you will always have a special place in my heart.

Here's to your beautiful smile,
your dreams, your happiness,
and all the wonderful things waiting for you.

I LOVE YOUUU! 💗`;

let typingStarted = false;

function startTyping() {
  if (typingStarted) return;
  typingStarted = true;

  const out = document.getElementById('typingOut');
  const cur = document.getElementById('typingCur');
  if (!out) return;

  let i = 0;
  out.textContent = '';
  const SPEED = 36; // ms per character

  function step() {
    if (i < TYPING_MSG.length) {
      out.textContent += TYPING_MSG[i];
      i++;
      // Auto-scroll typing box into view gently
      out.parentElement?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      setTimeout(step, SPEED);
    } else {
      // Done typing
      if (cur) cur.style.display = 'none';
      setTimeout(() => {
        const hugBtn = document.getElementById('hugBtn');
        if (hugBtn) {
          hugBtn.classList.remove('hidden');
          hugBtn.style.animation = 'fadeUp 0.6s ease forwards, hugPulse 2.2s ease-in-out 0.7s infinite';
        }
      }, 500);
    }
  }
  setTimeout(step, 300);
}

/* ─────────────────────────────────────────────────────────────
   15. HUG BUTTON
───────────────────────────────────────────────────────────── */
const hugBtn  = document.getElementById('hugBtn');
const hugWrap = document.getElementById('hugWrap');
const burstLayer = document.getElementById('burstLayer');

if (hugBtn) {
  hugBtn.addEventListener('click', () => {
    hugBtn.classList.add('hidden');

    // Heart burst
    if (burstLayer) {
      burstLayer.classList.remove('hidden');
      const BURST_EMOJIS = ['💗','💖','❤️','💕','💞','🌸','✨','💝','🌺'];
      const count = window.innerWidth < 480 ? 35 : 55;
      for (let i = 0; i < count; i++) {
        const h = document.createElement('span');
        h.className = 'burst-h';
        h.textContent = BURST_EMOJIS[Math.floor(Math.random() * BURST_EMOJIS.length)];
        const angle  = Math.random() * 360 * (Math.PI / 180);
        const dist   = 90 + Math.random() * 420;
        const dur    = 0.9 + Math.random() * 1.3;
        h.style.cssText = [
          `left:50vw`, `top:50vh`,
          `font-size:${16 + Math.random() * 22}px`,
          `--bx:${Math.cos(angle) * dist}px`,
          `--by:${Math.sin(angle) * dist}px`,
          `--br:${Math.random() * 720 - 360}deg`,
          `animation-duration:${dur}s`,
          `animation-delay:${Math.random() * 0.4}s`
        ].join(';');
        burstLayer.appendChild(h);
      }

      setTimeout(() => {
        burstLayer.classList.add('hidden');
        burstLayer.innerHTML = '';
      }, 2800);
    }

    fireConfetti(80);

    // Show hug animation
    if (hugWrap) {
      hugWrap.classList.remove('hidden');
      hugWrap.style.animation = 'fadeUp 0.6s ease forwards';
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   16. PREVENT BODY SCROLL OVERSCROLL FLICKER  (iOS)
───────────────────────────────────────────────────────────── */
document.addEventListener('touchmove', e => {
  // Allow scrolling inside scrollable containers
}, { passive: true });

/* ─────────────────────────────────────────────────────────────
   17. CONSOLE LOVE NOTE
───────────────────────────────────────────────────────────── */
console.log(
  '%c\n💗  Made with love for Vanshu  💗\n',
  'color:#E75480;font-size:16px;font-family:Georgia,serif;font-style:italic;'
);
