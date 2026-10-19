(() => {
  'use strict';

  /* ==========================================================
     Neon Particle Heart
     - zarrachali yurak (olovrang -> binafsha -> yashil)
     - ichki va tashqi uchqunlar
     - yulduzlar + uchayotgan kometalar
     - teginganda paydo bo'ladigan kichkina qirmizi yurakchalar
     - "special gift" oynasi: she'r + "I love you" yomg'iri
     ========================================================== */

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const $ = (s) => document.querySelector(s);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cv = $('#scene');
  const fxcv = $('#fx');
  const ctx = cv.getContext('2d');
  const fx = fxcv.getContext('2d');
  const nameEl = $('#name');
  const root = document.documentElement;

  let W = 0, H = 0, DPR = 1, S = 10, cx = 0, cy = 0;

  /* ---------- O'lchamlar ---------- */
  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    for (const [c, x] of [[cv, ctx], [fxcv, fx]]) {
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
      x.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    S = Math.min((W * 0.8) / 32, (H * 0.58) / 29);
    cx = W / 2;
    cy = H * 0.5 + H * 0.01;
    nameEl.style.fontSize = (S * 5.4).toFixed(1) + 'px';
    nameEl.style.top = (cy - S * 1.8).toFixed(1) + 'px';
    buildStars();
  }

  /* ---------- Yurak geometriyasi ---------- */
  function heartPt(t) {
    const s = Math.sin(t);
    return [
      16 * s * s * s,
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
    ];
  }

  const outline = [];
  const fill = [];
  const all = [];
  const buckets = [[], [], [], []]; // 0 to'q, 1 asosiy, 2 o'rta, 3 och

  function makeParticles() {
    const small = Math.min(window.innerWidth, window.innerHeight) < 600;
    const nOut = small ? 1900 : 3000;
    const nFill = small ? 1500 : 2600;

    for (let i = 0; i < nOut; i++) {
      const u = Math.random();
      const t = Math.PI + u * TAU; // pastki uchidan boshlab chiziladi
      let [x, y] = heartPt(t);
      const s = Math.sin(t);
      const dx = 48 * s * s * Math.cos(t);
      const dy = -13 * Math.sin(t) + 10 * Math.sin(2 * t) + 6 * Math.sin(3 * t) + 4 * Math.sin(4 * t);
      const len = Math.hypot(dx, dy) || 1;
      let nx = dy / len;
      let ny = -dx / len;
      if (nx * x + ny * (y + 2.5) < 0) { nx = -nx; ny = -ny; }
      const g = (Math.random() + Math.random() + Math.random() - 1.5) * 0.55;
      x += nx * g;
      y += ny * g;
      addParticle({
        kind: 0, u, th: 0, hx: x, hy: y + 2.5,
        s: Math.random() < 0.06 ? rand(2.6, 3.4) : rand(1.1, 2.4),
        j: 0.18,
      });
    }

    for (let i = 0; i < nFill; i++) {
      const t = rand(0, TAU);
      const [x, y] = heartPt(t);
      const r = Math.sqrt(Math.random()) * 0.97;
      addParticle({
        kind: 1, u: 0, th: Math.random(), hx: x * r, hy: (y + 2.5) * r,
        s: rand(0.8, 1.7),
        j: 0.35,
      });
    }
  }

  function addParticle(o) {
    const p = Object.assign(o, {
      x: 0, y: 0, vx: 0, vy: 0, on: false, a: 0, al: 0,
      ph: rand(0, TAU), ws: rand(0.6, 1.4),
      b: (Math.random() * 4) | 0,
    });
    (p.kind === 0 ? outline : fill).push(p);
    all.push(p);
    buckets[p.b].push(p);
  }

  /* ---------- Ranglar: olovrang -> binafsha -> yashil ---------- */
  const PHASES = [
    [255, 112, 24],
    [176, 84, 255],
    [36, 240, 120],
  ];
  const HOLD = 6.5;
  const BLEND = 3.5;

  function phaseColor(t) {
    const seg = HOLD + BLEND;
    const m = t % (seg * 3);
    const i = Math.floor(m / seg);
    const l = m - i * seg;
    const w = [0, 0, 0];
    if (l < HOLD) {
      w[i] = 1;
    } else {
      const s = smooth((l - HOLD) / BLEND);
      w[i] = 1 - s;
      w[(i + 1) % 3] = s;
    }
    let r = 0, g = 0, b = 0;
    for (let k = 0; k < 3; k++) {
      r += PHASES[k][0] * w[k];
      g += PHASES[k][1] * w[k];
      b += PHASES[k][2] * w[k];
    }
    return { r, g, b, w };
  }

  const mix = (c, k) => c + (255 - c) * k;
  const rgbStr = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;

  /* ---------- Yulduzlar ---------- */
  let stars = [];
  function buildStars() {
    const n = clamp(Math.round((W * H) / 5200), 90, 380);
    stars = [];
    const tints = ['#ffffff', '#ffffff', '#ffffff', '#bcd4ff', '#ffd6e8', '#fff1c8'];
    for (let i = 0; i < n; i++) {
      const layer = Math.random();
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.3 + layer * 1.1,
        ph: rand(0, TAU),
        sp: rand(0.5, 2.2),
        drift: 2 + layer * 9,
        c: tints[(Math.random() * tints.length) | 0],
      });
    }
  }

  /* ---------- Kometalar ---------- */
  const comets = [];
  let cometTimer = 1.2;
  const COMET_TINTS = [[200, 225, 255], [255, 190, 225], [255, 232, 170], [180, 255, 235]];

  function spawnComet() {
    const fromLeft = Math.random() < 0.5;
    const ang = rand(0.35, 0.75);
    const dirX = (fromLeft ? 1 : -1) * Math.cos(ang);
    const dirY = Math.sin(ang);
    comets.push({
      x: fromLeft ? rand(-120, W * 0.6) : rand(W * 0.4, W + 120),
      y: rand(-100, H * 0.45),
      dx: dirX,
      dy: dirY,
      v: rand(450, 900),
      len: rand(140, 300),
      tint: COMET_TINTS[(Math.random() * COMET_TINTS.length) | 0],
    });
  }

  /* ---------- Uchqunlar ---------- */
  const sparks = [];
  const SPARK_CAP = 1300;

  function addSpark(x, y, vx, vy, life, size) {
    if (sparks.length >= SPARK_CAP) return;
    sparks.push({ x, y, vx, vy, life, max: life, s: size, w: Math.random() < 0.18 });
  }

  /* ---------- Teginganda chiqadigan qirmizi yurakchalar ---------- */
  const hearts = [];

  function spawnHeart(x, y) {
    if (hearts.length > 260) return;
    hearts.push({
      x, y,
      vx: rand(-25, 25),
      vy: rand(-95, -45),
      s: rand(6, 14),
      age: 0,
      life: rand(1.3, 2.1),
      ph: rand(0, TAU),
      rot: rand(-0.4, 0.4),
      hue: rand(343, 359),
      l: rand(46, 58),
    });
  }

  function burstHearts(x, y, n) {
    for (let i = 0; i < n; i++) {
      spawnHeart(x + rand(-14, 14), y + rand(-14, 14));
    }
  }

  function heartPath(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y + s * 0.35);
    c.bezierCurveTo(x - s * 0.9, y - s * 0.2, x - s * 0.55, y - s * 0.95, x, y - s * 0.45);
    c.bezierCurveTo(x + s * 0.55, y - s * 0.95, x + s * 0.9, y - s * 0.2, x, y + s * 0.35);
    c.closePath();
  }

  const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  /* ---------- Sichqoncha / barmoq ---------- */
  let mx = -9999, my = -9999;
  let lastHX = -9999, lastHY = -9999, lastHT = 0;

  window.addEventListener('pointermove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    const now = performance.now();
    if (now - lastHT > 45 && Math.hypot(mx - lastHX, my - lastHY) > 22) {
      spawnHeart(mx, my);
      lastHX = mx;
      lastHY = my;
      lastHT = now;
    }
  }, { passive: true });

  window.addEventListener('pointerdown', (e) => {
    mx = e.clientX;
    my = e.clientY;
    burstHearts(mx, my, 7);
  }, { passive: true });

  window.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse') { mx = -9999; my = -9999; }
  }, { passive: true });

  document.addEventListener('pointerleave', () => { mx = -9999; my = -9999; });

  /* ---------- Asosiy tsikl ---------- */
  let time = 0;
  let last = performance.now();
  let frameNo = 0;
  let sparkAcc = 0;
  let innerAcc = 0;
  let tipAcc = 0;

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    time += dt;
    frameNo++;

    const reveal = clamp(time / 5.5, 0, 1);
    const fillReveal = (time - 2.5) / 5;

    // Yurak urishi (lub-dub)
    const bt = (time * 1.15) % 1;
    const beat = 1 + 0.045 * (
      Math.exp(-Math.pow((bt - 0.08) * 14, 2)) +
      0.65 * Math.exp(-Math.pow((bt - 0.30) * 14, 2))
    );
    const sc = S * beat;

    // Ranglar
    const pc = phaseColor(time);
    const cols = [
      rgbStr(pc.r * 0.72, pc.g * 0.72, pc.b * 0.72),
      rgbStr(pc.r, pc.g, pc.b),
      rgbStr(mix(pc.r, 0.3), mix(pc.g, 0.3), mix(pc.b, 0.3)),
      rgbStr(mix(pc.r, 0.62), mix(pc.g, 0.62), mix(pc.b, 0.62)),
    ];
    const rgb = `${pc.r | 0},${pc.g | 0},${pc.b | 0}`;
    if (frameNo % 4 === 0) root.style.setProperty('--accent-rgb', rgb);

    // Ism yurak bilan birga nafas oladi
    nameEl.style.transform =
      `translate(-50%,-50%) scale(${(1 + (beat - 1) * 0.6).toFixed(4)})`;

    /* ----- Fon ----- */
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, H);

    // Yulduzlar
    for (const st of stars) {
      st.x -= st.drift * dt;
      if (st.x < -2) { st.x = W + 2; st.y = Math.random() * H; }
      const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * st.sp + st.ph));
      ctx.globalAlpha = tw;
      ctx.fillStyle = st.c;
      ctx.fillRect(st.x, st.y, st.r, st.r);
    }

    // Kometalar
    ctx.globalCompositeOperation = 'lighter';
    cometTimer -= dt;
    if (cometTimer <= 0) {
      spawnComet();
      if (Math.random() < 0.25) spawnComet();
      cometTimer = rand(1.8, 4.5) * (reduceMotion ? 2 : 1);
    }
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      c.x += c.dx * c.v * dt;
      c.y += c.dy * c.v * dt;
      if (c.x < -400 || c.x > W + 400 || c.y > H + 300) {
        comets.splice(i, 1);
        continue;
      }
      const tx = c.x - c.dx * c.len;
      const ty = c.y - c.dy * c.len;
      const [r, g, b] = c.tint;
      const grad = ctx.createLinearGradient(tx, ty, c.x, c.y);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.7, `rgba(${r},${g},${b},0.45)`);
      grad.addColorStop(1, 'rgba(255,255,255,0.95)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
      const hg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 11);
      hg.addColorStop(0, 'rgba(255,255,255,0.9)');
      hg.addColorStop(0.4, `rgba(${r},${g},${b},0.35)`);
      hg.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = hg;
      ctx.fillRect(c.x - 11, c.y - 11, 22, 22);
    }

    // Yurak atrofidagi yumshoq nur
    const haloK = clamp(fillReveal + 0.2, 0, 1);
    const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, sc * 21);
    hg.addColorStop(0, `rgba(${rgb},${0.17 * haloK})`);
    hg.addColorStop(0.6, `rgba(${rgb},${0.06 * haloK})`);
    hg.addColorStop(1, `rgba(${rgb},0)`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = hg;
    ctx.fillRect(cx - sc * 21, cy - sc * 21, sc * 42, sc * 42);

    /* ----- Zarrachalar ----- */
    const K = 40;
    const damp = Math.exp(-7.5 * dt);
    const R = 95;
    const R2 = R * R;

    for (let i = 0; i < all.length; i++) {
      const p = all[i];
      if (!p.on) {
        const ready = p.kind === 0 ? p.u <= reveal : p.th <= fillReveal;
        if (!ready) continue;
        const a = rand(0, TAU);
        const r = S * rand(5, 20);
        p.x = cx + Math.cos(a) * r;
        p.y = cy + Math.sin(a) * r;
        const v = rand(150, 400);
        p.vx = -Math.sin(a) * v;
        p.vy = Math.cos(a) * v;
        p.a = 0;
        p.on = true;
      }

      const tx = cx + (p.hx + Math.sin(time * p.ws + p.ph) * p.j) * sc;
      const ty = cy - (p.hy + Math.cos(time * p.ws * 1.1 + p.ph) * p.j) * sc;
      p.vx += (tx - p.x) * K * dt;
      p.vy += (ty - p.y) * K * dt;

      const mdx = p.x - mx;
      const mdy = p.y - my;
      const d2 = mdx * mdx + mdy * mdy;
      if (d2 < R2 && d2 > 1) {
        const d = Math.sqrt(d2);
        const f = (1 - d / R) * dt * 2600;
        p.vx += (mdx / d) * f;
        p.vy += (mdy / d) * f;
      }

      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.a = Math.min(1, p.a + dt * 2);
      const tw = 0.55 + 0.45 * Math.sin(time * 3.2 * p.ws + p.ph * 3);
      p.al = p.a * tw * (p.kind === 0 ? 1 : 0.7);
    }

    for (let b = 0; b < 4; b++) {
      ctx.fillStyle = cols[b];
      const list = buckets[b];
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (!p.on) continue;
        ctx.globalAlpha = p.al;
        ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
    }

    /* ----- Uchqunlar ----- */
    const sparkRate = reduceMotion ? 60 : 170;

    // Chizayotgan "qalam" uchi
    if (reveal < 1) {
      const [hx, hy] = heartPt(Math.PI + reveal * TAU);
      const px = cx + hx * sc;
      const py = cy - (hy + 2.5) * sc;
      for (let k = 0; k < 6; k++) {
        const a = rand(0, TAU);
        const v = rand(30, 150);
        addSpark(px, py, Math.cos(a) * v, Math.sin(a) * v - 20, rand(0.5, 1.3), rand(1, 2.6));
      }
      const pg = ctx.createRadialGradient(px, py, 0, px, py, 18);
      pg.addColorStop(0, 'rgba(255,255,255,0.95)');
      pg.addColorStop(0.35, `rgba(${rgb},0.55)`);
      pg.addColorStop(1, `rgba(${rgb},0)`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = pg;
      ctx.fillRect(px - 18, py - 18, 36, 36);
    }

    // Kontur bo'ylab sachrayotgan uchqunlar (o'ng tomonda ko'proq)
    if (reveal > 0.15) {
      sparkAcc += dt * sparkRate;
      while (sparkAcc >= 1) {
        sparkAcc -= 1;
        const p = outline[(Math.random() * outline.length) | 0];
        if (!p.on) continue;
        if (p.hx <= 0 && Math.random() < 0.45) continue;
        const dx = p.x - cx;
        const dy = p.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        const v = rand(25, 110) * (p.hx > 0 ? 1.4 : 1);
        addSpark(
          p.x, p.y,
          (dx / len) * v + rand(-18, 18),
          (dy / len) * v + rand(-18, 18) - 10,
          rand(0.8, 2.0), rand(0.9, 2.4)
        );
      }
    }

    // Yurak ichidagi mayda uchqunlar
    if (fillReveal > 0.2) {
      innerAcc += dt * (reduceMotion ? 20 : 55);
      while (innerAcc >= 1) {
        innerAcc -= 1;
        const p = fill[(Math.random() * fill.length) | 0];
        if (!p.on) continue;
        const a = rand(0, TAU);
        const v = rand(8, 32);
        addSpark(p.x, p.y, Math.cos(a) * v, Math.sin(a) * v - 12, rand(1.0, 2.6), rand(0.8, 1.8));
      }
    }

    // Pastki uchi: yashil fazada eng yorqin nuqta
    const tipX = cx;
    const tipY = cy + 14.5 * sc;
    const greenW = pc.w[2];
    if (reveal > 0.9) {
      const tg = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, sc * 3.2);
      tg.addColorStop(0, `rgba(255,255,255,${0.22 + 0.5 * greenW})`);
      tg.addColorStop(0.3, `rgba(${rgb},${0.25 + 0.45 * greenW})`);
      tg.addColorStop(1, `rgba(${rgb},0)`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = tg;
      ctx.fillRect(tipX - sc * 3.2, tipY - sc * 3.2, sc * 6.4, sc * 6.4);

      tipAcc += dt * (10 + 60 * greenW);
      while (tipAcc >= 1) {
        tipAcc -= 1;
        const a = rand(0, TAU);
        const v = rand(15, 70);
        addSpark(tipX + rand(-4, 4), tipY, Math.cos(a) * v, Math.abs(Math.sin(a)) * v * 0.6 + 10,
          rand(0.9, 2.2), rand(0.8, 2.0));
      }
    }

    const sparkCol = cols[3];
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        sparks[i] = sparks[sparks.length - 1];
        sparks.pop();
        continue;
      }
      const sd = Math.exp(-1.2 * dt);
      s.vx *= sd;
      s.vy = s.vy * sd - 8 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const k = s.life / s.max;
      const size = s.s * (0.4 + 0.6 * k);
      ctx.globalAlpha = k;
      ctx.fillStyle = s.w ? '#ffffff' : sparkCol;
      ctx.fillRect(s.x - size / 2, s.y - size / 2, size, size);
    }

    /* ----- Qirmizi yurakchalar (alohida qatlam) ----- */
    fx.clearRect(0, 0, W, H);
    if (hearts.length) {
      fx.shadowColor = 'rgba(255,30,80,0.85)';
      fx.shadowBlur = 12;
      for (let i = hearts.length - 1; i >= 0; i--) {
        const h = hearts[i];
        h.age += dt;
        if (h.age >= h.life) {
          hearts.splice(i, 1);
          continue;
        }
        h.x += (h.vx + Math.sin(h.age * 6 + h.ph) * 22) * dt;
        h.y += h.vy * dt;
        const k = h.age / h.life;
        const alpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
        const pop = easeOutBack(Math.min(1, h.age / 0.25));
        fx.save();
        fx.translate(h.x, h.y);
        fx.rotate(h.rot + Math.sin(h.age * 4 + h.ph) * 0.15);
        fx.globalAlpha = clamp(alpha, 0, 1);
        fx.fillStyle = `hsl(${h.hue}, 92%, ${h.l}%)`;
        heartPath(fx, 0, 0, h.s * pop);
        fx.fill();
        fx.restore();
      }
      fx.shadowBlur = 0;
    }

    requestAnimationFrame(frame);
  }

  /* ==========================================================
     Sovg'a oynasi
     ========================================================== */
  const giftBtn = $('#giftBtn');
  const modal = $('#gift');
  const closeBtn = $('#giftClose');
  const nextBtn = $('#giftNext');
  const poemEl = $('#poem');
  const loveLayer = $('#loveLayer');

  // Xohlasangiz, shu yerdagi matnlarni o'zgartiring yoki yangilarini qo'shing
  const MESSAGES = [
    [
      "Osmonda yulduz ko'p, ammo ular orasida",
      'yuragim faqat bitta nurni tanlagan.',
      "Ismi tilimda duoga aylangan —",
      'Shalola.',
    ],
    [
      "Kometalar tilak so'rab uchadi,",
      "men esa tilak qilmayman — chunki eng chiroyli orzuning ismi Shalola.",
    ],
    [
      'Yurak soat emas, lekin u har urganida',
      'bitta ismni sanaydi:',
      'Shalola.',
    ],
    [
      "Dunyo katta, odamlar ko'p,",
      'lekin yuragim uyini faqat sendan topdi.',
    ],
  ];

  let msgIndex = 0;
  let loveTimer = null;
  let openerBtn = null;

  function showMessage(i) {
    poemEl.innerHTML = '';
    MESSAGES[i].forEach((text, k) => {
      const p = document.createElement('p');
      p.textContent = text;
      p.style.animationDelay = (0.35 + k * 0.9).toFixed(2) + 's';
      poemEl.appendChild(p);
    });
  }

  const LOVE_COLORS = ['#ff8fb1', '#ffd1dc', '#ff5d8f', '#ffe8a3', '#ffffff', '#ff9ecb'];

  function spawnLove() {
    const el = document.createElement('span');
    el.className = 'love';
    el.textContent = 'I love you';
    el.style.left = rand(3, 82).toFixed(1) + '%';
    el.style.top = rand(6, 88).toFixed(1) + '%';
    el.style.fontSize = rand(18, 46).toFixed(0) + 'px';
    el.style.color = LOVE_COLORS[(Math.random() * LOVE_COLORS.length) | 0];
    el.style.setProperty('--rot', rand(-14, 14).toFixed(1) + 'deg');
    el.style.setProperty('--dur', rand(4.5, 7).toFixed(2) + 's');
    el.addEventListener('animationend', () => el.remove());
    loveLayer.appendChild(el);
    while (loveLayer.childElementCount > 45) loveLayer.firstElementChild.remove();
  }

  function startLove() {
    stopLove();
    // Avval tez-tez, keyin barqaror ritmda — birin-ketin paydo bo'laveradi
    let n = 0;
    const tick = () => {
      spawnLove();
      n++;
      loveTimer = setTimeout(tick, n < 6 ? 220 : 420);
    };
    loveTimer = setTimeout(tick, 500);
  }

  function stopLove() {
    clearTimeout(loveTimer);
    loveTimer = null;
  }

  function openGift() {
    openerBtn = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    msgIndex = 0;
    showMessage(msgIndex);
    loveLayer.innerHTML = '';
    startLove();
    const r = giftBtn.getBoundingClientRect();
    burstHearts(r.left + r.width / 2, r.top + r.height / 2, 26);
    setTimeout(() => closeBtn.focus(), 50);
  }

  function closeGift() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    stopLove();
    if (openerBtn && openerBtn.focus) openerBtn.focus();
  }

  giftBtn.addEventListener('click', openGift);
  closeBtn.addEventListener('click', closeGift);
  nextBtn.addEventListener('click', () => {
    msgIndex = (msgIndex + 1) % MESSAGES.length;
    showMessage(msgIndex);
    const r = nextBtn.getBoundingClientRect();
    burstHearts(r.left + r.width / 2, r.top, 10);
  });

  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') {
      closeGift();
    } else if (e.key === 'Tab') {
      // Fokus oyna ichida qolsin
      const items = [closeBtn, nextBtn];
      const idx = items.indexOf(document.activeElement);
      e.preventDefault();
      const next = e.shiftKey ? (idx <= 0 ? items.length - 1 : idx - 1) : (idx + 1) % items.length;
      items[next].focus();
    }
  });

  /* ---------- Boshlash ---------- */
  window.addEventListener('resize', layout);
  layout();
  makeParticles();
  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
})();