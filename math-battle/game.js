// ============================================================
// MATH TUG OF WAR — Tahap 39: Fresh Bright Sky UI
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// ---------- SETUP HTML INPUT ----------
const inputContainer = document.createElement('div');
inputContainer.style.position = 'absolute';
inputContainer.style.width = '960px';
inputContainer.style.height = '540px';
inputContainer.style.pointerEvents = 'none';
inputContainer.style.top = '50%';
inputContainer.style.left = '50%';
inputContainer.style.transform = 'translate(-50%, -50%)';
document.body.appendChild(inputContainer);

const baseInputStyle = `
  position: absolute;
  width: 140px;
  height: 50px;
  font-family: 'Fredoka', sans-serif;
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  border-radius: 12px;
  outline: none;
  pointer-events: auto;
  box-shadow: 0 4px 0 rgba(0,0,0,0.2);
  transition: all 0.2s;
  display: none; 
`;

const pInput = document.createElement('input');
pInput.type = 'text';
pInput.placeholder = '?';
pInput.maxLength = 5;
pInput.style.cssText = baseInputStyle + `
  left: 220px; top: 250px;
  background: #ffffff; color: #2c3e50; border: 4px solid #ff6b35;
`;
inputContainer.appendChild(pInput);

const aiInput = document.createElement('input');
aiInput.type = 'text';
aiInput.placeholder = '?';
aiInput.maxLength = 5;
aiInput.readOnly = true;
aiInput.style.cssText = baseInputStyle + `
  left: 600px; top: 250px;
  background: #ffffff; color: #2c3e50; border: 4px solid #9575cd;
`;
inputContainer.appendChild(aiInput);

// ---------- AUDIO ----------
let audioCtx = null;
function playTone(freq, duration, type = 'sine', volume = 0.15) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) { }
}

const SFX = {
    correct: () => { playTone(660, 0.1); setTimeout(() => playTone(880, 0.15), 80); },
    wrong: () => playTone(200, 0.25, 'sawtooth', 0.12),
    win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.15), i * 100)),
    lose: () => [400, 300, 200].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'triangle'), i * 150)),
    click: () => playTone(500, 0.05, 'sine', 0.1),
};

// ---------- DIFFICULTY ----------
const DIFFICULTIES = {
    easy: { aiMinTime: 5.5, aiMaxTime: 7.5, aiAccuracy: 0.55, roundTimeout: 12.0, label: 'Mudah' },
    normal: { aiMinTime: 4.5, aiMaxTime: 6.5, aiAccuracy: 0.70, roundTimeout: 10.0, label: 'Normal' },
    hard: { aiMinTime: 3.5, aiMaxTime: 5.5, aiAccuracy: 0.85, roundTimeout: 8.0, label: 'Sulit' },
};

const CONFIG = {
    charScale: 0.45,
    basePlayerX: 280,
    baseAiX: 680,
    groundY: 400,
    pullAmount: 25,
    playerWrongPenalty: 15,
    roundDelay: 1.5,
};

// ---------- STATE ----------
const state = {
    time: 0,
    tugX: 0,
    phase: 'menu',
    winner: null,
    difficulty: 'normal',
    gameMode: null,
    question: null,
    aiTimer: 0, aiInitialTimer: 0, aiAnswered: false,
    aiChosenIndex: null,
    roundTimer: 0, roundInitialTimer: 0, roundDelay: 0,
    feedback: null,
    hoverMenu: null,
};

// ============================================================
// GENERATOR AWAN & ATMOSFER
// ============================================================
const cloudSprites = [];
function generateCloudSprite() {
    const cw = 500, ch = 250;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = cw; offCanvas.height = ch;
    const offCtx = offCanvas.getContext('2d');
    const puffs = [];
    for (let i = 0; i < 9; i++) puffs.push({ x: cw / 2 + (i - 4) * 30 + (Math.random() * 20 - 10), y: ch - 60, r: 30 + Math.random() * 20 });
    for (let i = 0; i < 18; i++) puffs.push({ x: cw / 2 + (Math.random() - 0.5) * 240, y: ch - 80 - Math.random() * 80, r: 25 + Math.random() * 45 });
    if (Math.random() > 0.5) puffs.push({ x: cw / 2 - 180, y: ch - 60, r: 15 + Math.random() * 10 });
    if (Math.random() > 0.5) puffs.push({ x: cw / 2 + 190, y: ch - 70, r: 20 + Math.random() * 15 });

    // Awan Cerah (Putih Bersih dengan Bayangan Biru Muda)
    offCtx.fillStyle = 'rgba(180, 220, 255, 0.7)';
    puffs.forEach(p => { offCtx.beginPath(); offCtx.arc(p.x + 5, p.y + 8, p.r, 0, Math.PI * 2); offCtx.fill(); });
    offCtx.fillStyle = 'rgba(240, 248, 255, 0.9)';
    puffs.forEach(p => { offCtx.beginPath(); offCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2); offCtx.fill(); });
    offCtx.fillStyle = 'rgba(255, 255, 255, 1)';
    puffs.forEach(p => { offCtx.beginPath(); offCtx.arc(p.x - 5, p.y - 8, p.r * 0.75, 0, Math.PI * 2); offCtx.fill(); });
    return offCanvas;
}
for (let i = 0; i < 5; i++) cloudSprites.push(generateCloudSprite());

const menuEffects = {
    clouds: [
        { x: 100, y: 80, speed: 8, scale: 1.2, sprite: cloudSprites[0] },
        { x: 500, y: 160, speed: 12, scale: 0.7, sprite: cloudSprites[1] },
        { x: 800, y: 100, speed: 10, scale: 0.9, sprite: cloudSprites[2] },
        { x: -200, y: 200, speed: 6, scale: 1.4, sprite: cloudSprites[3] }
    ],
    birds: [],
    sparkles: []
};

for (let i = 0; i < 15; i++) {
    menuEffects.sparkles.push({ x: Math.random() * W, y: Math.random() * (CONFIG.groundY - 50), size: Math.random() * 3 + 1, phase: Math.random() * Math.PI * 2, speed: Math.random() * 2 + 1 });
}

function updateAtmosphere(dt) {
    menuEffects.clouds.forEach(c => {
        c.x += c.speed * dt;
        if (c.x > W + 500 * c.scale) c.x = -500 * c.scale;
    });
    if (Math.random() < 0.005) {
        menuEffects.birds.push({ x: -50, y: 50 + Math.random() * 150, speed: 80 + Math.random() * 50, wingPhase: Math.random() * Math.PI * 2 });
    }
    for (let i = menuEffects.birds.length - 1; i >= 0; i--) {
        const b = menuEffects.birds[i];
        b.x += b.speed * dt; b.wingPhase += dt * 15;
        if (b.x > W + 50) menuEffects.birds.splice(i, 1);
    }
    menuEffects.sparkles.forEach(s => { s.phase += dt * s.speed; });
}

function drawSkyEffects() {
    for (const c of menuEffects.clouds) ctx.drawImage(c.sprite, c.x, c.y, c.sprite.width * c.scale, c.sprite.height * c.scale);

    // Sparkles / Debu Cahaya
    for (const s of menuEffects.sparkles) {
        const alpha = (Math.sin(s.phase) + 1) / 2 * 0.6 + 0.2;
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    // Burung
    ctx.strokeStyle = '#557a95'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const b of menuEffects.birds) {
        const flap = Math.sin(b.wingPhase) * 8;
        ctx.beginPath(); ctx.moveTo(b.x - 10, b.y + flap); ctx.quadraticCurveTo(b.x - 5, b.y, b.x, b.y); ctx.quadraticCurveTo(b.x + 5, b.y, b.x + 10, b.y + flap); ctx.stroke();
    }
}

// ============================================================
// CHARACTER STATE & LOGIC
// ============================================================
const pAnim = { state: 'idle', timer: 0, blinkTimer: 2, blinkDuration: 0 };
const aiAnim = { state: 'idle', timer: 0, blinkTimer: 3, blinkDuration: 0 };

function triggerAnim(char, animState, duration) { char.state = animState; char.timer = duration; }
function updateAnim(char, dt) {
    if (char.timer > 0) { char.timer -= dt; if (char.timer <= 0) char.state = 'idle'; }
    if (char.blinkDuration > 0) char.blinkDuration -= dt;
    else { char.blinkTimer -= dt; if (char.blinkTimer <= 0) { char.blinkDuration = 0.15; char.blinkTimer = 2 + Math.random() * 3; } }
}

function getCharacterTransform(isPlayer, anim) {
    let offsetX = 0, offsetY = 0, scaleX = 1, scaleY = 1, headTilt = 0;
    let bodyAngle = 0; let breathOffset = 0;

    if (anim.state === 'idle') {
        breathOffset = Math.sin(state.time * 4) * 3; scaleY = 1 + Math.sin(state.time * 4) * 0.03; scaleX = 1 - Math.sin(state.time * 4) * 0.03; bodyAngle = Math.sin(state.time * 2) * 0.02; headTilt = Math.sin(state.time * 2 + 0.5) * 0.04;
    }
    else if (anim.state === 'pull') {
        offsetX = isPlayer ? -25 : 25; offsetY = Math.sin(state.time * 40) * 2; bodyAngle = isPlayer ? -0.25 : 0.25; scaleX = 1.2; scaleY = 0.8; headTilt = isPlayer ? 0.1 : -0.1;
    }
    else if (anim.state === 'pulled') {
        offsetX = isPlayer ? 30 : -30; bodyAngle = isPlayer ? 0.3 : -0.3; scaleX = 0.8; scaleY = 1.25; headTilt = isPlayer ? -0.15 : 0.15;
    }
    else if (anim.state === 'angry') {
        offsetX = Math.sin(state.time * 60) * 10; bodyAngle = Math.sin(state.time * 60) * 0.15; headTilt = Math.sin(state.time * 60 + 1) * 0.2;
    }
    else if (anim.state === 'happy') {
        offsetY = -Math.abs(Math.sin(state.time * 12)) * 30; scaleX = 1 + Math.abs(Math.sin(state.time * 12)) * 0.1; scaleY = 1 - Math.abs(Math.sin(state.time * 12)) * 0.1; bodyAngle = Math.sin(state.time * 12) * 0.15; headTilt = Math.sin(state.time * 12 + 1) * 0.1;
    }
    return { offsetX, offsetY, scaleX, scaleY, bodyAngle, headTilt, breathOffset };
}

// ---------- PARTICLE SYSTEM ----------
const particles = [];
function spawnParticles(x, y, type, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100 - 30,
            life: 1.0, maxLife: 1.0, type: type, size: Math.random() * 5 + 2,
            color: type === 'dust' ? '#c8e6c9' : type === 'sweat' ? '#82ccdd' : type === 'steam' ? '#ff8a80' : '#ffd54f'
        });
    }
}
function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.type === 'dust' || p.type === 'steam') p.vy -= 30 * dt; else p.vy += 120 * dt;
        p.life -= dt; if (p.life <= 0) particles.splice(i, 1);
    }
}

// ---------- MENU RECTS ----------
function getMenuRects() {
    const bw = 180, bh = 60, gap = 30, totalW = bw * 3 + gap * 2, startX = (W - totalW) / 2, y = 330;
    return [
        { x: startX, y, w: bw, h: bh, key: 'easy' },
        { x: startX + bw + gap, y, w: bw, h: bh, key: 'normal' },
        { x: startX + (bw + gap) * 2, y, w: bw, h: bh, key: 'hard' },
    ];
}
function getStartRect() { return { x: (W - 260) / 2, y: 440, w: 260, h: 70, key: 'start' }; }
function getModeRects() {
    const bw = 300, bh = 110, gap = 40, totalW = bw * 2 + gap, startX = (W - totalW) / 2, y = 260;
    return [
        { x: startX, y, w: bw, h: bh, key: 'mcq' },
        { x: startX + bw + gap, y, w: bw, h: bh, key: 'input' },
    ];
}
function getOptionRects() {
    const bw = 220, bh = 55, gap = 15, totalW = bw * 2 + gap, sx = (W - totalW) / 2, sy = 110;
    return [
        { x: sx, y: sy, w: bw, h: bh }, { x: sx + bw + gap, y: sy, w: bw, h: bh },
        { x: sx, y: sy + bh + gap, w: bw, h: bh }, { x: sx + bw + gap, y: sy + bh + gap, w: bw, h: bh },
    ];
}

// ---------- GAME LOOP ----------
let lastTime = performance.now();
function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
}

function update(dt) {
    state.time += dt;
    updateAtmosphere(dt);
    updateAnim(pAnim, dt);
    updateAnim(aiAnim, dt);
    updateParticles(dt);

    if (pAnim.state === 'pull' && Math.random() < 0.4) {
        spawnParticles(CONFIG.basePlayerX + state.tugX, CONFIG.groundY + 10, 'dust', 1);
        spawnParticles(CONFIG.basePlayerX + state.tugX - 20, CONFIG.groundY - 60, 'sweat', 1);
    }
    if (aiAnim.state === 'pull' && Math.random() < 0.4) {
        spawnParticles(CONFIG.baseAiX + state.tugX, CONFIG.groundY + 10, 'dust', 1);
        spawnParticles(CONFIG.baseAiX + state.tugX + 20, CONFIG.groundY - 60, 'sweat', 1);
    }
    if (pAnim.state === 'angry' && Math.random() < 0.3) spawnParticles(CONFIG.basePlayerX + state.tugX, CONFIG.groundY - 70, 'steam', 1);
    if (aiAnim.state === 'angry' && Math.random() < 0.3) spawnParticles(CONFIG.baseAiX + state.tugX, CONFIG.groundY - 70, 'steam', 1);
    if (pAnim.state === 'happy' && Math.random() < 0.3) spawnParticles(CONFIG.basePlayerX + state.tugX, CONFIG.groundY - 50, 'sparkle', 1);
    if (aiAnim.state === 'happy' && Math.random() < 0.3) spawnParticles(CONFIG.baseAiX + state.tugX, CONFIG.groundY - 50, 'sparkle', 1);

    if (state.feedback) {
        state.feedback.timer -= dt;
        if (state.feedback.timer <= 0) state.feedback = null;
    }

    if (state.phase === 'playing' && state.question) {
        const diff = DIFFICULTIES[state.difficulty];
        state.roundTimer -= dt;

        if (state.roundTimer <= 0) {
            triggerAnim(pAnim, 'angry', 1); endRound('Waktu habis!', '#f39c12'); return;
        }

        if (!state.aiAnswered) {
            state.aiTimer -= dt;
            if (state.aiTimer <= 0) {
                state.aiAnswered = true;
                const isCorrect = Math.random() < diff.aiAccuracy;

                if (state.gameMode === 'mcq') {
                    let chosenIndex;
                    if (isCorrect) chosenIndex = state.question.options.indexOf(state.question.correct);
                    else {
                        const wrongIndices = state.question.options.map((opt, i) => opt !== state.question.correct ? i : -1).filter(i => i !== -1);
                        chosenIndex = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
                    }
                    state.aiChosenIndex = chosenIndex;
                    if (isCorrect) {
                        state.tugX += CONFIG.pullAmount; triggerAnim(aiAnim, 'pull', 0.6); triggerAnim(pAnim, 'pulled', 0.6); endRound('AI BENAR!', '#e74c3c');
                    } else {
                        triggerAnim(aiAnim, 'angry', 1); state.feedback = { text: 'AI SALAH!', color: '#f39c12', timer: 1.5 };
                    }
                } else {
                    let aiAnswer;
                    if (isCorrect) aiAnswer = state.question.correct;
                    else { const offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1); aiAnswer = Math.max(0, state.question.correct + offset); }
                    aiInput.value = aiAnswer;
                    if (isCorrect) {
                        state.tugX += CONFIG.pullAmount; triggerAnim(aiAnim, 'pull', 0.6); triggerAnim(pAnim, 'pulled', 0.6); endRound('AI BENAR!', '#e74c3c');
                    } else {
                        triggerAnim(aiAnim, 'angry', 1); state.feedback = { text: 'AI SALAH!', color: '#f39c12', timer: 1.5 };
                    }
                }
            }
        }
    } else if (state.phase === 'waiting') {
        state.roundDelay -= dt; if (state.roundDelay <= 0) nextQuestion();
    }
}

function endRound(text, color) {
    state.feedback = { text, color, timer: 1 };
    pInput.style.opacity = '0.5'; pInput.blur();
    const pX = CONFIG.basePlayerX + state.tugX; const aX = CONFIG.baseAiX + state.tugX;

    if (pX >= W / 2) { state.phase = 'gameover'; state.winner = 'ai'; SFX.lose(); triggerAnim(aiAnim, 'happy', 99); triggerAnim(pAnim, 'pulled', 99); return; }
    if (aX <= W / 2) { state.phase = 'gameover'; state.winner = 'player'; SFX.win(); triggerAnim(pAnim, 'happy', 99); triggerAnim(aiAnim, 'pulled', 99); return; }

    state.phase = 'waiting'; state.roundDelay = CONFIG.roundDelay;
}

// ============================================================
// GENERATOR SOAL & SUBMIT
// ============================================================
function generateQuestion() {
    let text, correct; let options = [];
    if (state.gameMode === 'mcq') {
        const a = Math.floor(Math.random() * 20) + 5, b = Math.floor(Math.random() * 20) + 5;
        if (Math.random() < 0.5) { text = `${a} + ${b}`; correct = a + b; }
        else { const big = Math.max(a, b), small = Math.min(a, b); text = `${big} − ${small}`; correct = big - small; }
        const optSet = new Set([correct]);
        while (optSet.size < 4) { const offset = Math.floor(Math.random() * 10) - 5; const wrong = correct + offset; if (wrong !== correct && wrong >= 0) optSet.add(wrong); }
        options = Array.from(optSet);
        for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[options[i], options[j]] = [options[j], options[i]]; }
    } else {
        const r = Math.random();
        if (state.difficulty === 'easy') {
            const type = Math.floor(Math.random() * 3);
            if (type === 0) { const a = Math.floor(Math.random() * 10) + 2, b = Math.floor(Math.random() * 5) + 2, c = Math.floor(Math.random() * 5) + 2; text = `${a} + ${b} × ${c}`; correct = a + (b * c); }
            else if (type === 1) { const a = Math.floor(Math.random() * 5) + 2, b = Math.floor(Math.random() * 5) + 2, c = Math.floor(Math.random() * 10) + 2; text = `${a} × ${b} + ${c}`; correct = (a * b) + c; }
            else { const b = Math.floor(Math.random() * 5) + 2, divRes = Math.floor(Math.random() * 5) + 2, a = b * divRes, c = Math.floor(Math.random() * 10) + 2; text = `${a} ÷ ${b} + ${c}`; correct = divRes + c; }
        } else if (state.difficulty === 'normal') {
            const type = Math.floor(Math.random() * 4);
            if (type === 0) { const a = Math.floor(Math.random() * 10) + 2, b = Math.floor(Math.random() * 10) + 2, c = Math.floor(Math.random() * 5) + 2; text = `(${a} + ${b}) × ${c}`; correct = (a + b) * c; }
            else if (type === 1) { const a = Math.floor(Math.random() * 10) + 5, b = Math.floor(Math.random() * 10) + 2, c = Math.floor(Math.random() * 5) + 2, d = Math.floor(Math.random() * 5) + 2; text = `${a} + ${b} × ${c} − ${d}`; correct = a + (b * c) - d; }
            else if (type === 2) { const b = Math.floor(Math.random() * 5) + 2, divRes = Math.floor(Math.random() * 5) + 2, a = b * divRes, c = Math.floor(Math.random() * 10) + 2, d = Math.floor(Math.random() * 5) + 2; text = `${a} ÷ ${b} + ${c} × ${d}`; correct = divRes + (c * d); }
            else { const a = Math.floor(Math.random() * 10) + 2, b = Math.floor(Math.random() * 5) + 2, c = Math.floor(Math.random() * 5) + 2; text = `${a} × (${b} + ${c})`; correct = a * (b + c); }
        } else {
            const type = Math.floor(Math.random() * 4);
            if (type === 0) { const a = Math.floor(Math.random() * 10) + 2, b = Math.floor(Math.random() * 10) + 2, c = Math.floor(Math.random() * 5) + 2, d = Math.floor(Math.random() * 10) + 2; text = `${a} × ${b} + ${c} × ${d}`; correct = (a * b) + (c * d); }
            else if (type === 1) { const a = Math.floor(Math.random() * 10) + 2, b = Math.floor(Math.random() * 10) + 2, c = Math.floor(Math.random() * 5) + 2, d = Math.floor(Math.random() * 5) + 2; text = `(${a} + ${b}) × ${c} − ${d}`; correct = (a + b) * c - d; }
            else if (type === 2) { const c = Math.floor(Math.random() * 5) + 2, d = Math.floor(Math.random() * 5) + 2, mulRes = Math.floor(Math.random() * 5) + 2, a = c * d * mulRes, b = Math.floor(Math.random() * 10) + 2; text = `${a} ÷ ${c} × ${d} + ${b}`; correct = (a / c) * d + b; }
            else { const a = Math.floor(Math.random() * 10) + 5, b = Math.floor(Math.random() * 10) + 5, c = Math.floor(Math.random() * 5) + 2, d = Math.floor(Math.random() * 5) + 2; let ans = (a * b) - (c * d); if (ans >= 0) { text = `${a} × ${b} − ${c} × ${d}`; correct = ans; } else { text = `${a} × ${b} + ${c} × ${d}`; correct = (a * b) + (c * d); } }
        }
    }
    return { type: state.gameMode, text: text + ' = ?', correct, options };
}

function nextQuestion() {
    const diff = DIFFICULTIES[state.difficulty];
    state.question = generateQuestion();
    const aiTime = diff.aiMinTime + Math.random() * (diff.aiMaxTime - diff.aiMinTime);
    state.aiTimer = aiTime; state.aiInitialTimer = aiTime;
    state.aiAnswered = false; state.aiChosenIndex = null;
    state.roundTimer = diff.roundTimeout; state.roundInitialTimer = diff.roundTimeout;
    state.phase = 'playing';

    pInput.value = ''; aiInput.value = '';

    if (state.gameMode === 'input') {
        pInput.style.display = 'block'; aiInput.style.display = 'block';
        pInput.style.opacity = '1'; pInput.focus(); canvas.blur();
    } else {
        pInput.style.display = 'none'; aiInput.style.display = 'none'; pInput.blur();
    }
}

pInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (state.phase !== 'playing' || state.gameMode !== 'input') return;
        const val = parseInt(pInput.value); if (isNaN(val)) return;
        pInput.blur(); evaluatePlayerAnswer(val);
    }
});

function evaluatePlayerAnswer(val) {
    const isCorrect = (val === state.question.correct);
    if (isCorrect) {
        state.tugX -= CONFIG.pullAmount; triggerAnim(pAnim, 'pull', 0.6); triggerAnim(aiAnim, 'pulled', 0.6); SFX.correct(); endRound('BENAR!', '#27ae60');
    } else {
        state.tugX += CONFIG.playerWrongPenalty; triggerAnim(aiAnim, 'pull', 0.6); triggerAnim(pAnim, 'pulled', 0.6); SFX.wrong(); endRound('SALAH!', '#e74c3c');
    }
}

// ---------- GET HAND POSITION ----------
function getHandPos(baseX, baseY, isPlayer, anim) {
    let localX = isPlayer ? 85 : -85; let localY = -20;
    const t = getCharacterTransform(isPlayer, anim);
    let rotX = (localX * Math.cos(t.bodyAngle) - localY * Math.sin(t.bodyAngle)) * CONFIG.charScale;
    let rotY = (localX * Math.sin(t.bodyAngle) + localY * Math.cos(t.bodyAngle)) * CONFIG.charScale;
    return { x: baseX + t.offsetX + rotX, y: baseY + t.offsetY + rotY };
}

// ============================================================
// DRAW BAYANGAN & KARAKTER
// ============================================================
function drawCharacterShadow(x, isPlayer, anim) {
    const t = getCharacterTransform(isPlayer, anim);
    const height = Math.abs(t.offsetY);
    const alpha = Math.max(0.05, 0.25 - height * 0.005);
    const spread = 1 + height * 0.02;

    ctx.save();
    ctx.translate(x + t.offsetX, CONFIG.groundY + 5);
    ctx.transform(1, 0, -0.6, 0.4, 0, 0);
    ctx.rotate(t.bodyAngle);
    ctx.scale(CONFIG.charScale * t.scaleX * spread, CONFIG.charScale * t.scaleY * spread);

    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath(); ctx.moveTo(0, -60); ctx.quadraticCurveTo(60, -60, 75, 20); ctx.quadraticCurveTo(60, 50, 0, 50); ctx.quadraticCurveTo(-60, 50, -75, 20); ctx.quadraticCurveTo(-60, -60, 0, -60); ctx.fill();
    ctx.restore();
}

function drawCharacter(x, y, isPlayer, anim) {
    const t = getCharacterTransform(isPlayer, anim);
    ctx.save(); ctx.translate(x + t.offsetX, y + t.offsetY + t.breathOffset); ctx.rotate(t.bodyAngle); ctx.scale(CONFIG.charScale * t.scaleX, CONFIG.charScale * t.scaleY);

    const mainColor1 = isPlayer ? '#ff9a76' : '#b39ddb';
    const mainColor2 = isPlayer ? '#e65100' : '#673ab7';
    const legColor = isPlayer ? '#bf360c' : '#4527a0';
    const handColor = isPlayer ? '#d84315' : '#512da8';
    const blushColor = isPlayer ? 'rgba(255, 80, 80, 0.5)' : 'rgba(200, 100, 255, 0.5)';

    ctx.fillStyle = legColor;
    ctx.beginPath(); ctx.roundRect(-45, 35, 25, 20, 10); ctx.roundRect(-10, 35, 25, 20, 10); ctx.roundRect(25, 35, 25, 20, 10); ctx.fill();

    const bodyGrad = ctx.createLinearGradient(0, -80, 0, 50); bodyGrad.addColorStop(0, mainColor1); bodyGrad.addColorStop(1, mainColor2);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.moveTo(0, -70); ctx.bezierCurveTo(60, -70, 80, -10, 70, 30); ctx.bezierCurveTo(60, 50, -60, 50, -70, 30); ctx.bezierCurveTo(-80, -10, -60, -70, 0, -70); ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(0, 35, 60, 15, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(-20, -45, 25, 12, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(-25, -48, 8, 4, -0.3, 0, Math.PI * 2); ctx.fill();

    ctx.save(); ctx.translate(0, -45); ctx.rotate(t.headTilt);
    ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.roundRect(-55, -35, 110, 20, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.roundRect(-50, -33, 100, 5, 5); ctx.fill();
    ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.roundRect(-80, -20, 30, 60, 15); ctx.fill();
    ctx.fillStyle = isPlayer ? '#4fc3f7' : '#ce93d8'; ctx.beginPath(); ctx.roundRect(-75, -15, 15, 50, 8); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(-72, -5, 5, 25, 2); ctx.fill();
    ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.roundRect(50, -20, 30, 60, 15); ctx.fill();
    ctx.fillStyle = isPlayer ? '#4fc3f7' : '#ce93d8'; ctx.beginPath(); ctx.roundRect(60, -15, 15, 50, 8); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(63, -5, 5, 25, 2); ctx.fill();

    ctx.fillStyle = blushColor; ctx.beginPath(); ctx.ellipse(-40, 5, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(40, 5, 12, 6, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#1a1a2e'; ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const isEyesOpen = anim.blinkDuration > 0;

    if (anim.state === 'pull' || anim.state === 'pulled') {
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-30, -15); ctx.lineTo(-10, -5); ctx.lineTo(-30, 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30, -15); ctx.lineTo(10, -5); ctx.lineTo(30, 5); ctx.stroke();
        ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-15, 20); ctx.quadraticCurveTo(0, 30, 15, 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10, 20); ctx.lineTo(-10, 15); ctx.moveTo(10, 20); ctx.lineTo(10, 15); ctx.stroke();
    }
    else if (anim.state === 'angry') {
        ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-35, -15); ctx.lineTo(-15, 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(35, -15); ctx.lineTo(15, 5); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-25, 10, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(25, 10, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 30, 10, Math.PI, 0); ctx.stroke();
    }
    else if (anim.state === 'happy') {
        ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-30, 5); ctx.quadraticCurveTo(-20, -15, -10, 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(30, 5); ctx.quadraticCurveTo(20, -15, 10, 5); ctx.stroke();
        ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(0, 15, 15, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#ff8a80'; ctx.beginPath(); ctx.arc(0, 20, 8, 0, Math.PI); ctx.fill();
    }
    else if (isEyesOpen) {
        ctx.beginPath(); ctx.ellipse(-25, -5, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(25, -5, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(-22, -10, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-28, -2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(28, -10, 5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(22, -2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 15, 6, 0, Math.PI); ctx.stroke();
    } else {
        ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(-25, -5, 10, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.arc(25, -5, 10, 0, Math.PI); ctx.stroke();
        ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 15, 6, 0, Math.PI); ctx.stroke();
    }

    if (anim.state === 'angry') { ctx.fillStyle = '#e74c3c'; ctx.font = 'bold 40px Fredoka'; ctx.textAlign = 'center'; ctx.fillText('💢', 0, -65); }
    if (!isPlayer && state.phase === 'playing' && !state.aiAnswered && state.question) { ctx.fillStyle = '#1a1a2e'; ctx.font = 'bold 30px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('...', 0, -65); }
    ctx.restore();

    ctx.fillStyle = handColor;
    if (isPlayer) { ctx.beginPath(); ctx.ellipse(75, -25, 18, 15, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(80, -5, 18, 15, 0.2, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(-75, -25, 18, 15, -0.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(-80, -5, 18, 15, -0.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
}

function drawParticles() {
    for (const p of particles) {
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color;
        if (p.type === 'sparkle') { ctx.translate(p.x, p.y); ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.rect(-p.size / 2, -p.size * 2, p.size, p.size * 4); } ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    }
}

function render() {
    if (state.phase === 'menu') { drawMenu(); return; }
    if (state.phase === 'modeSelect') { drawModeSelect(); return; }

    drawBackground();
    drawArena();

    const pX = CONFIG.basePlayerX + state.tugX; const aX = CONFIG.baseAiX + state.tugX;

    drawCharacterShadow(pX, true, pAnim); drawCharacterShadow(aX, false, aiAnim);
    drawRope(pX, aX); drawCharacter(pX, CONFIG.groundY - 15, true, pAnim); drawCharacter(aX, CONFIG.groundY - 15, false, aiAnim);

    drawParticles(); drawTimers(); drawQuestionAndOptions(); drawFeedback(); drawGameOver();
}

// ============================================================
// DRAW BACKGROUND & ARENA (GAMEPLAY)
// ============================================================
function drawArena() {
    const centerX = W / 2;
    ctx.fillStyle = 'rgba(255, 107, 53, 0.15)'; ctx.fillRect(0, CONFIG.groundY, centerX, H - CONFIG.groundY);
    ctx.fillStyle = 'rgba(149, 117, 205, 0.15)'; ctx.fillRect(centerX, CONFIG.groundY, centerX, H - CONFIG.groundY);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; ctx.fillRect(centerX - 8, CONFIG.groundY, 16, H - CONFIG.groundY);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.fillRect(centerX - 5, CONFIG.groundY, 10, H - CONFIG.groundY);

    const postTop = CONFIG.groundY - 180;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.moveTo(centerX - 8, CONFIG.groundY); ctx.lineTo(centerX - 8 - 108, CONFIG.groundY + 72); ctx.lineTo(centerX + 8 - 108, CONFIG.groundY + 72); ctx.lineTo(centerX + 8, CONFIG.groundY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5d4037'; ctx.fillRect(centerX - 8, postTop, 16, 180); ctx.fillStyle = '#8d6e63'; ctx.fillRect(centerX - 4, postTop, 8, 180);
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(centerX - 10, postTop + 30, 20, 15); ctx.fillStyle = '#ecf0f1'; ctx.fillRect(centerX - 10, postTop + 45, 20, 15); ctx.fillStyle = '#e74c3c'; ctx.fillRect(centerX - 10, postTop + 60, 20, 15);

    const glowGrad = ctx.createLinearGradient(centerX, postTop, centerX, CONFIG.groundY);
    glowGrad.addColorStop(0, 'rgba(241, 196, 15, 0)'); glowGrad.addColorStop(0.5, 'rgba(241, 196, 15, 0.15)'); glowGrad.addColorStop(1, 'rgba(241, 196, 15, 0.4)');
    ctx.fillStyle = glowGrad; ctx.beginPath(); ctx.moveTo(centerX - 2, postTop); ctx.lineTo(centerX + 2, postTop); ctx.lineTo(centerX + 15, CONFIG.groundY); ctx.lineTo(centerX - 15, CONFIG.groundY); ctx.fill();

    ctx.save(); ctx.shadowColor = '#f1c40f'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff9c4'; ctx.beginPath(); ctx.arc(centerX, postTop, 10, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.moveTo(centerX + 8, postTop); ctx.quadraticCurveTo(centerX + 40, postTop - 15, centerX + 65, postTop + 5); ctx.quadraticCurveTo(centerX + 40, postTop + 25, centerX + 8, postTop + 25); ctx.fill();
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#6bc5ea'); sky.addColorStop(0.6, '#bce6f9'); sky.addColorStop(1, '#e0f4ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    const sunX = W - 150, sunY = 100;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 200);
    sunGlow.addColorStop(0, 'rgba(255, 255, 255, 1)'); sunGlow.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)'); sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sunGlow; ctx.beginPath(); ctx.arc(sunX, sunY, 200, 0, Math.PI * 2); ctx.fill();

    drawSkyEffects();

    ctx.fillStyle = '#82b1b8'; ctx.beginPath(); ctx.moveTo(0, CONFIG.groundY); ctx.lineTo(150, 280); ctx.lineTo(350, CONFIG.groundY); ctx.fill();
    ctx.beginPath(); ctx.moveTo(250, CONFIG.groundY); ctx.lineTo(500, 240); ctx.lineTo(700, CONFIG.groundY); ctx.fill();
    ctx.beginPath(); ctx.moveTo(600, CONFIG.groundY); ctx.lineTo(850, 290); ctx.lineTo(960, CONFIG.groundY); ctx.fill();

    ctx.fillStyle = '#6b9e78'; ctx.beginPath(); ctx.moveTo(0, CONFIG.groundY); ctx.quadraticCurveTo(W * 0.2, CONFIG.groundY - 60, W * 0.5, CONFIG.groundY - 20); ctx.quadraticCurveTo(W * 0.8, CONFIG.groundY + 20, W, CONFIG.groundY - 40); ctx.lineTo(W, CONFIG.groundY); ctx.fill();

    drawTree(100, CONFIG.groundY - 20, 1); drawTree(130, CONFIG.groundY - 15, 0.8); drawTree(850, CONFIG.groundY - 30, 1.2); drawTree(880, CONFIG.groundY - 20, 0.9);

    const groundGrad = ctx.createLinearGradient(0, CONFIG.groundY, 0, H); groundGrad.addColorStop(0, '#7cb342'); groundGrad.addColorStop(1, '#33691e');
    ctx.fillStyle = groundGrad; ctx.beginPath(); ctx.moveTo(0, CONFIG.groundY); ctx.quadraticCurveTo(W / 2, CONFIG.groundY - 10, W, CONFIG.groundY); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.1)'; for (let i = 0; i < 10; i++) { const gx = (i * 110 + 50) % W; ctx.beginPath(); ctx.moveTo(gx, CONFIG.groundY); ctx.lineTo(gx + 10, CONFIG.groundY - 15); ctx.lineTo(gx + 20, CONFIG.groundY); ctx.fill(); }
}

function drawTree(x, y, scale) {
    ctx.fillStyle = '#2e5c3e'; ctx.beginPath(); ctx.moveTo(x, y - 80 * scale); ctx.lineTo(x - 30 * scale, y); ctx.lineTo(x + 30 * scale, y); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y - 50 * scale); ctx.lineTo(x - 40 * scale, y + 20 * scale); ctx.lineTo(x + 40 * scale, y + 20 * scale); ctx.fill();
    ctx.fillStyle = '#4e342e'; ctx.fillRect(x - 5 * scale, y + 20 * scale, 10 * scale, 20 * scale);
}

// ============================================================
// UI: CLEAN BRIGHT SKY BACKGROUND & NEON BUTTONS
// ============================================================
function drawCinematicBackground() {
    // Langit Cerah Bergaya Anime (Sky Blue -> Pale Cyan -> Putih)
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#7ad0f5'); // Biru Langit
    sky.addColorStop(0.5, '#bce6f9'); // Biru Muda
    sky.addColorStop(1, '#f0fbfd'); // Hampir Putih
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Matahari Cerah
    const sunX = W - 150, sunY = 100;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 250);
    sunGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    sunGlow.addColorStop(0.2, 'rgba(255, 255, 200, 0.6)');
    sunGlow.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = sunGlow; ctx.beginPath(); ctx.arc(sunX, sunY, 250, 0, Math.PI * 2); ctx.fill();

    // Gambar Awan
    drawSkyEffects();

    // Bukit Hijau Bergelombang (Bukan Gunung Tajam)
    ctx.fillStyle = '#a3d9a5'; // Hijau Pastel
    ctx.beginPath(); ctx.moveTo(0, 450); ctx.quadraticCurveTo(200, 350, 400, 450); ctx.quadraticCurveTo(600, 500, 960, 400); ctx.lineTo(960, 540); ctx.lineTo(0, 540); ctx.fill();

    ctx.fillStyle = '#7acb82';
    ctx.beginPath(); ctx.moveTo(-100, 500); ctx.quadraticCurveTo(150, 420, 450, 500); ctx.quadraticCurveTo(750, 550, 1100, 450); ctx.lineTo(1100, 540); ctx.lineTo(-100, 540); ctx.fill();

    // Pohon-pohon kecil di bukit
    drawTree(150, 440, 0.8); drawTree(800, 460, 1);

    // Overlay Kabut Cahaya di Bawah agar Transisi Mulus
    const fog = ctx.createLinearGradient(0, 400, 0, 540);
    fog.addColorStop(0, 'rgba(255, 255, 255, 0)');
    fog.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
    ctx.fillStyle = fog; ctx.fillRect(0, 400, W, 140);
}

function drawModernButton(x, y, w, h, text, isHover, isSelected, themeColor) {
    ctx.save();

    const scale = isHover ? 1.05 : 1.0;
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(x + w / 2), -(y + h / 2));

    // 1. Bayangan Dasar (Lembut)
    ctx.fillStyle = 'rgba(44, 62, 80, 0.15)';
    roundRect(x + 4, y + 8, w, h, 20); ctx.fill();

    // 2. Latar Tombol (Putih Bersih / Clean Glass)
    const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
    if (isSelected) {
        bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        bgGrad.addColorStop(1, 'rgba(240, 248, 255, 0.95)');
    } else if (isHover) {
        bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        bgGrad.addColorStop(1, 'rgba(240, 248, 255, 0.9)');
    } else {
        bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        bgGrad.addColorStop(1, 'rgba(240, 248, 255, 0.7)');
    }
    ctx.fillStyle = bgGrad; roundRect(x, y, w, h, 20); ctx.fill();

    // 3. Garis Tepi Dasar
    ctx.strokeStyle = 'rgba(44, 62, 80, 0.1)';
    ctx.lineWidth = 2; roundRect(x, y, w, h, 20); ctx.stroke();

    // 4. ANIMASI LAMPU NEON BERJALAN
    if (isHover || isSelected) {
        ctx.save();
        const dashLength = 80;
        const gapLength = w * 2 + h * 2;

        ctx.setLineDash([dashLength, gapLength]);
        ctx.lineDashOffset = -(state.time * 200);

        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 10;

        roundRect(x, y, w, h, 20); ctx.stroke();
        ctx.restore();
    }

    // 5. Teks (Warna Gelap agar Kontras dengan Tombol Putih)
    ctx.fillStyle = isSelected ? themeColor : '#2c3e50';
    ctx.font = '700 26px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);

    ctx.restore();
}

function drawMenu() {
    drawCinematicBackground();

    // Judul dengan Bayangan Lembut
    ctx.fillStyle = '#2c3e50'; ctx.font = '700 76px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,0.8)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.fillText('Math Tug of War', W / 2, 130);
    ctx.shadowColor = 'transparent';

    ctx.font = '600 24px Fredoka, sans-serif'; ctx.fillStyle = '#34495e';
    ctx.fillText('Pilih tingkat kesulitan', W / 2, 220);

    // Tombol Difficulty (Warna Neon Cyan / Biru)
    for (const r of getMenuRects()) {
        const isHover = state.hoverMenu === r.key;
        const isSelected = state.difficulty === r.key;
        drawModernButton(r.x, r.y, r.w, r.h, DIFFICULTIES[r.key].label, isHover, isSelected, '#00b4d8');
    }

    // Tombol MASUK (Warna Neon Pink / Magenta)
    const s = getStartRect();
    const sHover = state.hoverMenu === 'start';
    const pulse = Math.sin(state.time * 5) * 0.02 + 1;

    ctx.save();
    ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-(s.x + s.w / 2), -(s.y + s.h / 2));

    drawModernButton(s.x, s.y, s.w, s.h, 'MASUK ▶', sHover, false, '#f72585');
    ctx.restore();
}

function drawModeSelect() {
    drawCinematicBackground();

    ctx.fillStyle = '#2c3e50'; ctx.font = '700 56px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,0.8)'; ctx.shadowBlur = 10;
    ctx.fillText('Pilih Mode Permainan', W / 2, 130);
    ctx.shadowColor = 'transparent';

    for (const r of getModeRects()) {
        const isHover = state.hoverMenu === r.key;
        const theme = r.key === 'mcq' ? '#ff6b35' : '#9575cd';

        drawModernButton(r.x, r.y, r.w, r.h, '', isHover, false, theme);

        // Teks di dalam tombol Mode
        ctx.fillStyle = isHover ? theme : '#2c3e50';
        ctx.font = '700 32px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.key === 'mcq' ? 'Pilihan Ganda' : 'Isi Kolom', r.x + r.w / 2, r.y + r.h / 2 - 10);

        ctx.fillStyle = '#7f8c8d';
        ctx.font = '500 18px Fredoka, sans-serif';
        ctx.fillText(r.key === 'mcq' ? '(Hitungan Dasar)' : '(KaBaTaKu / Campuran)', r.x + r.w / 2, r.y + r.h / 2 + 25);
    }
}

function drawRope(pX, aX) {
    const pHand = getHandPos(pX, CONFIG.groundY - 15, true, pAnim);
    const aHand = getHandPos(aX, CONFIG.groundY - 15, false, aiAnim);

    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pHand.x - 40, pHand.y + 25); ctx.lineTo(pHand.x, pHand.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(aHand.x + 40, aHand.y + 25); ctx.lineTo(aHand.x, aHand.y); ctx.stroke();

    const knotX = (pHand.x + aHand.x) / 2;
    let knotY = Math.max(pHand.y, aHand.y) + 30;
    if (pAnim.state === 'pull' || aiAnim.state === 'pull' || pAnim.state === 'pulled' || aiAnim.state === 'pulled') { knotY = Math.max(pHand.y, aHand.y) + 10; }

    ctx.beginPath(); ctx.moveTo(pHand.x, pHand.y); ctx.quadraticCurveTo(knotX, knotY, aHand.x, aHand.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(pHand.x, pHand.y - 3); ctx.quadraticCurveTo(knotX, knotY - 3, aHand.x, aHand.y - 3); ctx.stroke();

    ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(knotX, knotY, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 4; ctx.stroke();
}

function drawTimers() {
    if (state.phase !== 'playing' || !state.question) return;
    const barY = 260, barW = 80, barH = 8;
    const pX = CONFIG.basePlayerX + state.tugX; const aX = CONFIG.baseAiX + state.tugX;

    const pp = Math.max(0, state.roundTimer / state.roundInitialTimer); const pbx = pX - barW / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; roundRect(pbx, barY, barW, barH, 4); ctx.fill();
    ctx.fillStyle = pp > 0.5 ? '#27ae60' : pp > 0.25 ? '#f39c12' : '#e74c3c'; roundRect(pbx, barY, barW * pp, barH, 4); ctx.fill();

    ctx.fillStyle = '#2c3e50'; ctx.font = '600 13px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('Waktu kamu', pX, barY - 8);

    if (!state.aiAnswered) {
        const ap = Math.max(0, 1 - state.aiTimer / state.aiInitialTimer); const abx = aX - barW / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; roundRect(abx, barY, barW, barH, 4); ctx.fill();
        ctx.fillStyle = ap > 0.75 ? '#e74c3c' : '#9575cd'; roundRect(abx, barY, barW * ap, barH, 4); ctx.fill();
        ctx.fillStyle = '#2c3e50'; ctx.fillText('AI berpikir...', aX, barY - 8);
    }
}

function drawQuestionAndOptions() {
    if (!state.question || state.phase === 'gameover') return;
    const qx = W / 2 - 220, qy = 20, qw = 440, qh = 80;

    ctx.fillStyle = 'rgba(0,0,0,0.1)'; roundRect(qx + 4, qy + 4, qw, qh, 20); ctx.fill();
    ctx.fillStyle = '#ffffff'; roundRect(qx, qy, qw, qh, 20); ctx.fill();
    ctx.strokeStyle = '#667eea'; ctx.lineWidth = 4; roundRect(qx, qy, qw, qh, 20); ctx.stroke();

    ctx.fillStyle = '#2c3e50'; ctx.font = '700 46px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(state.question.text, W / 2, qy + qh / 2); ctx.textBaseline = 'alphabetic';

    if (state.gameMode === 'mcq') {
        const rects = getOptionRects();
        for (let i = 0; i < rects.length; i++) {
            const r = rects[i]; const opt = state.question.options[i];

            ctx.fillStyle = 'rgba(0,0,0,0.1)'; roundRect(r.x + 3, r.y + 3, r.w, r.h, 14); ctx.fill();
            ctx.fillStyle = '#ffffff'; roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill();
            ctx.strokeStyle = '#667eea'; ctx.lineWidth = 3; roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();

            ctx.fillStyle = '#667eea'; roundRect(r.x + 10, r.y + 10, 36, r.h - 20, 8); ctx.fill();

            ctx.fillStyle = '#ffffff'; ctx.font = '700 20px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(i + 1), r.x + 28, r.y + r.h / 2);

            ctx.fillStyle = '#2c3e50'; ctx.font = '700 26px Fredoka, sans-serif'; ctx.fillText(String(opt), r.x + r.w / 2 + 20, r.y + r.h / 2);

            if (state.aiChosenIndex === i) {
                ctx.fillStyle = '#9575cd'; ctx.beginPath(); ctx.arc(r.x + r.w - 18, r.y + 18, 14, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px Fredoka, sans-serif'; ctx.fillText('AI', r.x + r.w - 18, r.y + 18);
            }
        }
        ctx.textBaseline = 'alphabetic';
    }
}

function drawFeedback() {
    if (!state.feedback) return;
    const alpha = Math.min(1, state.feedback.timer * 2);
    ctx.save(); ctx.globalAlpha = alpha; ctx.font = '700 68px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10; ctx.strokeText(state.feedback.text, W / 2, H / 2 + 50);
    ctx.fillStyle = state.feedback.color; ctx.fillText(state.feedback.text, W / 2, H / 2 + 50); ctx.restore();
}

function drawGameOver() {
    if (state.phase !== 'gameover') return;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.font = '700 56px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(state.winner === 'player' ? 'KAMU MENANG! 🎉' : 'AI MENANG 😢', W / 2, H / 2 - 20);
    ctx.font = '500 22px Fredoka, sans-serif'; ctx.fillText('R = main lagi  •  M = menu', W / 2, H / 2 + 60);
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function startGame() {
    SFX.click(); state.tugX = 0; state.winner = null; state.feedback = null; particles.length = 0;
    pAnim.state = 'idle'; pAnim.timer = 0; aiAnim.state = 'idle'; aiAnim.timer = 0;
    pInput.style.display = 'none'; aiInput.style.display = 'none';
    nextQuestion();
}

document.addEventListener('keydown', (e) => {
    if (e.target === pInput) return;
    if (state.phase === 'menu') return;
    if (state.phase === 'modeSelect') {
        if (e.code === 'Escape' || e.code === 'KeyM') { state.phase = 'menu'; return; }
        return;
    }
    if (state.phase === 'gameover') {
        if (e.code === 'KeyR') { state.phase = 'modeSelect'; return; }
        if (e.code === 'KeyM' || e.code === 'Escape') { state.phase = 'menu'; pInput.style.display = 'none'; aiInput.style.display = 'none'; return; }
        return;
    }
    if (e.code === 'KeyR') { state.phase = 'modeSelect'; pInput.style.display = 'none'; aiInput.style.display = 'none'; return; }
    if (e.code === 'KeyM' || e.code === 'Escape') { state.phase = 'menu'; pInput.style.display = 'none'; aiInput.style.display = 'none'; return; }

    if (state.phase === 'playing' && state.gameMode === 'mcq') {
        let chosenIdx = -1;
        if (e.code === 'Digit1' || e.code === 'Numpad1' || e.code === 'KeyA') chosenIdx = 0;
        if (e.code === 'Digit2' || e.code === 'Numpad2' || e.code === 'KeyB') chosenIdx = 1;
        if (e.code === 'Digit3' || e.code === 'Numpad3' || e.code === 'KeyC') chosenIdx = 2;
        if (e.code === 'Digit4' || e.code === 'Numpad4' || e.code === 'KeyD') chosenIdx = 3;
        if (chosenIdx !== -1) evaluatePlayerAnswer(state.question.options[chosenIdx]);
    }
});

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
}

canvas.addEventListener('click', (e) => {
    const { x, y } = getMousePos(e);
    if (state.phase === 'menu') {
        for (const r of getMenuRects()) { if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { state.difficulty = r.key; SFX.click(); return; } }
        const s = getStartRect();
        if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) { SFX.click(); state.phase = 'modeSelect'; return; }
        return;
    }
    if (state.phase === 'modeSelect') {
        for (const r of getModeRects()) { if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { state.gameMode = r.key; startGame(); return; } }
        return;
    }
    if (state.phase === 'playing' && state.gameMode === 'mcq') {
        const rects = getOptionRects();
        for (let i = 0; i < rects.length; i++) {
            const r = rects[i]; if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { evaluatePlayerAnswer(state.question.options[i]); return; }
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (state.phase !== 'menu' && state.phase !== 'modeSelect') { canvas.style.cursor = 'default'; return; }
    const { x, y } = getMousePos(e); state.hoverMenu = null;

    if (state.phase === 'menu') {
        for (const r of getMenuRects()) { if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { state.hoverMenu = r.key; canvas.style.cursor = 'pointer'; return; } }
        const s = getStartRect(); if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) { state.hoverMenu = 'start'; canvas.style.cursor = 'pointer'; return; }
    } else if (state.phase === 'modeSelect') {
        for (const r of getModeRects()) { if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { state.hoverMenu = r.key; canvas.style.cursor = 'pointer'; return; } }
    }
    canvas.style.cursor = 'default';
});

requestAnimationFrame(loop);