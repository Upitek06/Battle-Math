// ============================================================
// MATH TUG OF WAR — Tahap 15: Tali Nyambung ke Tangan & Miring
// ============================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

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
    easy: { aiMinTime: 4.5, aiMaxTime: 6.5, aiAccuracy: 0.45, roundTimeout: 8.0, label: 'Mudah' },
    normal: { aiMinTime: 2.5, aiMaxTime: 4.5, aiAccuracy: 0.65, roundTimeout: 6.0, label: 'Normal' },
    hard: { aiMinTime: 1.5, aiMaxTime: 3.0, aiAccuracy: 0.85, roundTimeout: 4.5, label: 'Sulit' },
};

const CONFIG = {
    charScale: 0.40,
    basePlayerX: 280,
    baseAiX: 680,
    groundY: 400,
    pullAmount: 25,
    playerWrongPenalty: 15,
    roundDelay: 0.9,
};

// ---------- STATE ----------
const state = {
    time: 0,
    tugX: 0,
    phase: 'menu',
    winner: null,
    difficulty: 'normal',
    question: null,
    aiTimer: 0, aiInitialTimer: 0, aiAnswered: false,
    aiChosenIndex: null,
    roundTimer: 0, roundInitialTimer: 0, roundDelay: 0,
    feedback: null,
    hoverMenu: null,
};

// ---------- CHARACTER STATE (ANIMASI) ----------
const pAnim = { state: 'idle', timer: 0, blinkTimer: 2, blinkDuration: 0 };
const aiAnim = { state: 'idle', timer: 0, blinkTimer: 3, blinkDuration: 0 };

function triggerAnim(char, animState, duration) {
    char.state = animState;
    char.timer = duration;
}

function updateAnim(char, dt) {
    if (char.timer > 0) {
        char.timer -= dt;
        if (char.timer <= 0) char.state = 'idle';
    }
    if (char.blinkDuration > 0) {
        char.blinkDuration -= dt;
    } else {
        char.blinkTimer -= dt;
        if (char.blinkTimer <= 0) {
            char.blinkDuration = 0.15;
            char.blinkTimer = 2 + Math.random() * 3;
        }
    }
}

// ---------- MENU RECTS ----------
function getMenuRects() {
    const bw = 200, bh = 60, gap = 20;
    const totalW = bw * 3 + gap * 2;
    const startX = (W - totalW) / 2;
    const y = 300;
    return [
        { x: startX, y, w: bw, h: bh, key: 'easy' },
        { x: startX + bw + gap, y, w: bw, h: bh, key: 'normal' },
        { x: startX + (bw + gap) * 2, y, w: bw, h: bh, key: 'hard' },
    ];
}
function getStartRect() {
    const sbw = 260, sbh = 70;
    return { x: (W - sbw) / 2, y: 480, w: sbw, h: sbh, key: 'start' };
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
    updateAnim(pAnim, dt);
    updateAnim(aiAnim, dt);

    if (state.feedback) {
        state.feedback.timer -= dt;
        if (state.feedback.timer <= 0) state.feedback = null;
    }

    if (state.phase === 'playing' && state.question) {
        const diff = DIFFICULTIES[state.difficulty];
        state.roundTimer -= dt;

        if (state.roundTimer <= 0) {
            triggerAnim(pAnim, 'angry', 1);
            endRound('Waktu habis!', '#f39c12');
            return;
        }

        if (!state.aiAnswered) {
            state.aiTimer -= dt;
            if (state.aiTimer <= 0) {
                state.aiAnswered = true;

                const isCorrect = Math.random() < diff.aiAccuracy;
                let chosenIndex;

                if (isCorrect) {
                    chosenIndex = state.question.options.indexOf(state.question.correct);
                } else {
                    const wrongIndices = state.question.options
                        .map((opt, i) => opt !== state.question.correct ? i : -1)
                        .filter(i => i !== -1);
                    chosenIndex = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
                }

                state.aiChosenIndex = chosenIndex;

                if (isCorrect) {
                    state.tugX += CONFIG.pullAmount;
                    triggerAnim(aiAnim, 'pull', 0.4);
                    triggerAnim(pAnim, 'pulled', 0.4);
                    endRound('AI BENAR!', '#e74c3c');
                } else {
                    triggerAnim(aiAnim, 'angry', 0.8);
                    state.feedback = { text: 'AI SALAH!', color: '#f39c12', timer: 1.5 };
                }
            }
        }
    } else if (state.phase === 'waiting') {
        state.roundDelay -= dt;
        if (state.roundDelay <= 0) nextQuestion();
    }
}

function endRound(text, color) {
    state.feedback = { text, color, timer: 1 };

    const pX = CONFIG.basePlayerX + state.tugX;
    const aX = CONFIG.baseAiX + state.tugX;

    if (pX >= W / 2) {
        state.phase = 'gameover'; state.winner = 'ai'; SFX.lose(); triggerAnim(aiAnim, 'happy', 99); return;
    }
    if (aX <= W / 2) {
        state.phase = 'gameover'; state.winner = 'player'; SFX.win(); triggerAnim(pAnim, 'happy', 99); return;
    }

    state.phase = 'waiting';
    state.roundDelay = CONFIG.roundDelay;
}

// ---------- SOAL ----------
function generateQuestion() {
    const a = Math.floor(Math.random() * 9) + 2;
    const b = Math.floor(Math.random() * 9) + 2;
    let text, correct;
    if (Math.random() < 0.5) { text = `${a} + ${b}`; correct = a + b; }
    else { const big = Math.max(a, b), small = Math.min(a, b); text = `${big} − ${small}`; correct = big - small; }

    const options = new Set([correct]);
    while (options.size < 4) {
        const wrong = correct + Math.floor(Math.random() * 7) - 3;
        if (wrong !== correct && wrong >= 0 && wrong <= 20) options.add(wrong);
    }
    const arr = Array.from(options);
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return { text: text + ' = ?', correct, options: arr };
}

function nextQuestion() {
    const diff = DIFFICULTIES[state.difficulty];
    state.question = generateQuestion();
    const aiTime = diff.aiMinTime + Math.random() * (diff.aiMaxTime - diff.aiMinTime);
    state.aiTimer = aiTime;
    state.aiInitialTimer = aiTime;
    state.aiAnswered = false;
    state.aiChosenIndex = null;
    state.roundTimer = diff.roundTimeout;
    state.roundInitialTimer = diff.roundTimeout;
    state.phase = 'playing';
}

function playerAnswer(index) {
    if (state.phase !== 'playing' || !state.question) return;
    const isCorrect = state.question.options[index] === state.question.correct;

    if (isCorrect) {
        state.tugX -= CONFIG.pullAmount;
        triggerAnim(pAnim, 'pull', 0.4);
        triggerAnim(aiAnim, 'pulled', 0.4);
        SFX.correct();
        endRound('BENAR!', '#27ae60');
    } else {
        state.tugX += CONFIG.playerWrongPenalty;
        triggerAnim(pAnim, 'angry', 0.8);
        SFX.wrong();
        endRound('SALAH!', '#e74c3c');
    }
}

// ---------- GET HAND POSITION (KUNCI UNTUK TALI) ----------
function getHandPos(baseX, baseY, isPlayer, anim) {
    let localX = isPlayer ? 72 : -87; // Titik tengah telapak tangan
    let localY = -30;
    let offsetX = 0, bodyAngle = 0;

    if (anim.state === 'pull') {
        offsetX = isPlayer ? -15 : 15;
        bodyAngle = isPlayer ? -0.15 : 0.15;
    } else if (anim.state === 'pulled') {
        offsetX = isPlayer ? 15 : -15;
        bodyAngle = isPlayer ? 0.15 : -0.15;
    } else if (anim.state === 'angry') {
        offsetX = Math.sin(state.time * 50) * 6;
        bodyAngle = Math.sin(state.time * 50) * 0.08;
    }

    // Hitung rotasi tangan berdasarkan condongan badan
    let rotX = (localX * Math.cos(bodyAngle) - localY * Math.sin(bodyAngle)) * CONFIG.charScale;
    let rotY = (localX * Math.sin(bodyAngle) + localY * Math.cos(bodyAngle)) * CONFIG.charScale;

    return {
        x: baseX + offsetX + rotX,
        y: baseY + rotY
    };
}

// ---------- DRAW KARAKTER ----------
function drawCharacter(x, y, isPlayer, anim) {
    ctx.save();
    ctx.translate(x, y);

    let offsetX = 0, scaleX = 1, scaleY = 1, headTilt = 0;
    let bodyAngle = 0;

    if (anim.state === 'idle' || anim.state === 'happy') {
        scaleY = 1 + Math.sin(state.time * 4) * 0.03;
        scaleX = 1 - Math.sin(state.time * 4) * 0.02;
        if (anim.state === 'happy') bodyAngle = Math.sin(state.time * 10) * 0.05;
    }

    if (anim.state === 'pull') {
        offsetX = isPlayer ? -15 : 15;
        bodyAngle = isPlayer ? -0.15 : 0.15;
        scaleX = 1.05; scaleY = 0.95;
    } else if (anim.state === 'pulled') {
        offsetX = isPlayer ? 15 : -15;
        bodyAngle = isPlayer ? 0.15 : -0.15;
        scaleX = 0.95; scaleY = 1.05;
    } else if (anim.state === 'angry') {
        offsetX = Math.sin(state.time * 50) * 6;
        bodyAngle = Math.sin(state.time * 50) * 0.08;
    }

    ctx.translate(offsetX, 0);
    ctx.rotate(bodyAngle);

    ctx.scale(CONFIG.charScale * scaleX, CONFIG.charScale * scaleY);

    const mainColor = isPlayer ? '#ff6b35' : '#9575cd';
    const legColor = isPlayer ? '#d35400' : '#7b5bb5';

    // Kaki
    ctx.fillStyle = legColor;
    ctx.fillRect(-45, 25, 20, 25);
    ctx.fillRect(-15, 25, 20, 25);
    ctx.fillRect(15, 25, 20, 25);
    ctx.fillRect(45, 25, 20, 25);

    // Badan
    ctx.fillStyle = mainColor;
    ctx.fillRect(-65, -35, 130, 65);
    ctx.fillRect(-55, -45, 110, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(-65, 15, 130, 15);

    // Headphone & Mata
    ctx.save();
    ctx.translate(0, -40);
    ctx.rotate(headTilt);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-50, -30, 100, 18);
    ctx.fillStyle = '#3a5a98';
    ctx.fillRect(-45, -28, 90, 8);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-75, -15, 25, 55);
    ctx.fillStyle = '#3a5a98';
    ctx.fillRect(-70, -10, 15, 45);
    ctx.fillStyle = '#82ccdd';
    ctx.fillRect(-70, 0, 8, 20);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(50, -15, 25, 55);
    ctx.fillStyle = '#3a5a98';
    ctx.fillRect(55, -10, 15, 45);
    ctx.fillStyle = '#82ccdd';
    ctx.fillRect(62, 0, 8, 20);

    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 7;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    const isEyesOpen = anim.blinkDuration > 0;

    if (anim.state === 'pull' || anim.state === 'pulled') {
        ctx.beginPath();
        ctx.moveTo(-25, -10); ctx.lineTo(-10, 0); ctx.lineTo(-25, 10);
        ctx.moveTo(25, -10); ctx.lineTo(10, 0); ctx.lineTo(25, 10);
        ctx.stroke();
    } else if (anim.state === 'angry') {
        ctx.beginPath();
        ctx.moveTo(-28, -10); ctx.lineTo(-10, 5);
        ctx.moveTo(28, -10); ctx.lineTo(10, 5);
        ctx.stroke();
        ctx.fillRect(-22, 5, 12, 8);
        ctx.fillRect(10, 5, 12, 8);
    } else if (anim.state === 'happy') {
        ctx.beginPath();
        ctx.moveTo(-28, 8); ctx.lineTo(-18, -8); ctx.lineTo(-8, 8);
        ctx.moveTo(8, 8); ctx.lineTo(18, -8); ctx.lineTo(28, 8);
        ctx.stroke();
    } else if (isEyesOpen) {
        ctx.fillRect(-25, -8, 15, 16);
        ctx.fillRect(10, -8, 15, 16);
    } else {
        ctx.fillRect(-25, -3, 15, 8);
        ctx.fillRect(10, -3, 15, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-22, -1, 4, 4);
        ctx.fillRect(13, -1, 4, 4);
    }

    if (anim.state === 'angry') {
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 35px Fredoka';
        ctx.textAlign = 'center';
        ctx.fillText('💢', 0, -55);
    }

    if (!isPlayer && state.phase === 'playing' && !state.aiAnswered && state.question) {
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 24px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('...', 0, -55);
    }

    ctx.restore();

    // --- DUA TANGAN MEGANG TALI ---
    ctx.fillStyle = legColor; // Warna lebih gelap agar kontras
    if (isPlayer) {
        ctx.fillRect(60, -40, 25, 20); // Tangan Atas
        ctx.fillRect(65, -20, 25, 20); // Tangan Bawah
    } else {
        ctx.fillRect(-85, -40, 25, 20); // Tangan Atas
        ctx.fillRect(-90, -20, 25, 20); // Tangan Bawah
    }

    ctx.restore();
}

// ---------- RENDER UTAMA ----------
function render() {
    if (state.phase === 'menu') { drawMenu(); return; }

    drawBackground();
    drawArena();

    const pX = CONFIG.basePlayerX + state.tugX;
    const aX = CONFIG.baseAiX + state.tugX;

    drawRope(pX, aX);

    // Menggunakan Y posisi berdiri karakter (385)
    drawCharacter(pX, CONFIG.groundY - 15, true, pAnim);
    drawCharacter(aX, CONFIG.groundY - 15, false, aiAnim);

    drawTimers();
    drawQuestion();
    drawFeedback();
    drawGameOver();
}

function drawArena() {
    const centerX = W / 2;

    ctx.fillStyle = 'rgba(255, 107, 53, 0.05)';
    ctx.fillRect(0, CONFIG.groundY - 100, centerX, H - CONFIG.groundY + 100);

    ctx.fillStyle = 'rgba(149, 117, 205, 0.05)';
    ctx.fillRect(centerX, CONFIG.groundY - 100, centerX, H - CONFIG.groundY + 100);

    ctx.beginPath();
    ctx.setLineDash([15, 15]);
    ctx.moveTo(centerX, CONFIG.groundY - 120);
    ctx.lineTo(centerX, CONFIG.groundY + 50);
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(centerX - 5, CONFIG.groundY - 150, 10, 60);
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(centerX + 5, CONFIG.groundY - 150);
    ctx.lineTo(centerX + 40, CONFIG.groundY - 135);
    ctx.lineTo(centerX + 5, CONFIG.groundY - 120);
    ctx.fill();
}

function drawMenu() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#a8e6ff');
    sky.addColorStop(1, '#e8f7ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    drawCloud(150, 100, 1);
    drawCloud(780, 140, 0.8);
    drawCloud(450, 60, 0.7);

    ctx.fillStyle = '#2c3e50';
    ctx.font = '700 64px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Math Tug of War', W / 2, 140);

    ctx.font = '500 22px Fredoka, sans-serif';
    ctx.fillStyle = 'rgba(44, 62, 80, 0.7)';
    ctx.fillText('Pilih tingkat kesulitan', W / 2, 220);

    for (const r of getMenuRects()) {
        const isHover = state.hoverMenu === r.key;
        const isSelected = state.difficulty === r.key;
        const oy = isHover ? -3 : 0;

        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        roundRect(r.x + 4, r.y + 6, r.w, r.h, 16); ctx.fill();
        ctx.fillStyle = isSelected ? '#667eea' : (isHover ? '#e8eeff' : '#ffffff');
        roundRect(r.x, r.y + oy, r.w, r.h, 16); ctx.fill();
        ctx.strokeStyle = '#667eea'; ctx.lineWidth = 3;
        roundRect(r.x, r.y + oy, r.w, r.h, 16); ctx.stroke();
        ctx.fillStyle = isSelected ? '#ffffff' : '#2c3e50';
        ctx.font = '600 26px Fredoka, sans-serif';
        ctx.fillText(DIFFICULTIES[r.key].label, r.x + r.w / 2, r.y + r.h / 2 + oy);
    }

    const s = getStartRect();
    const sHover = state.hoverMenu === 'start';
    const sy = s.y + (sHover ? -3 : 0);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRect(s.x + 4, s.y + 6, s.w, s.h, 20); ctx.fill();
    ctx.fillStyle = sHover ? '#5cdb95' : '#27ae60';
    roundRect(s.x, sy, s.w, s.h, 20); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 32px Fredoka, sans-serif';
    ctx.fillText('START ▶', s.x + s.w / 2, sy + s.h / 2);

    ctx.fillStyle = 'rgba(44, 62, 80, 0.6)';
    ctx.font = '500 16px Fredoka, sans-serif';
    ctx.fillText('Jawab pakai klik atau tombol 1-4', W / 2, H - 30);
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#a8e6ff');
    sky.addColorStop(1, '#e8f7ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    drawCloud(150, 100, 1);
    drawCloud(780, 140, 0.8);
    ctx.fillStyle = '#b8e986';
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.groundY);
    ctx.quadraticCurveTo(W / 2, CONFIG.groundY - 20, W, CONFIG.groundY);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
}

function drawCloud(x, y, s) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(x, y, 30 * s, 0, Math.PI * 2);
    ctx.arc(x + 35 * s, y - 10 * s, 40 * s, 0, Math.PI * 2);
    ctx.arc(x + 75 * s, y, 30 * s, 0, Math.PI * 2);
    ctx.fill();
}

function drawRope(pX, aX) {
    // Dapatkan posisi presisi telapak tangan
    const pHand = getHandPos(pX, CONFIG.groundY - 15, true, pAnim);
    const aHand = getHandPos(aX, CONFIG.groundY - 15, false, aiAnim);

    // 1. Ekor Tali di Belakang Player (Miring ke bawah)
    ctx.strokeStyle = '#b4835b'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pHand.x - 40, pHand.y + 25); // Ujung bawah
    ctx.lineTo(pHand.x, pHand.y);
    ctx.stroke();

    // 2. Ekor Tali di Belakang AI (Miring ke bawah)
    ctx.beginPath();
    ctx.moveTo(aHand.x + 40, aHand.y + 25); // Ujung bawah
    ctx.lineTo(aHand.x, aHand.y);
    ctx.stroke();

    // 3. Tali Utama (Melengkung turun ke tengah)
    const knotX = (pHand.x + aHand.x) / 2;
    const knotY = Math.max(pHand.y, aHand.y) + 30; // Melengkung ke bawah

    ctx.beginPath();
    ctx.moveTo(pHand.x, pHand.y);
    ctx.quadraticCurveTo(knotX, knotY, aHand.x, aHand.y);
    ctx.stroke();

    // 4. Highlight Tali
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pHand.x, pHand.y - 2);
    ctx.quadraticCurveTo(knotX, knotY - 2, aHand.x, aHand.y - 2);
    ctx.stroke();

    // 5. Simpul Pita
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(knotX, knotY, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3; ctx.stroke();
}

function drawTimers() {
    if (state.phase !== 'playing' || !state.question) return;
    const barY = 260, barW = 80, barH = 8;

    const pX = CONFIG.basePlayerX + state.tugX;
    const aX = CONFIG.baseAiX + state.tugX;

    const pp = Math.max(0, state.roundTimer / state.roundInitialTimer);
    const pbx = pX - barW / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; roundRect(pbx, barY, barW, barH, 4); ctx.fill();
    ctx.fillStyle = pp > 0.5 ? '#27ae60' : pp > 0.25 ? '#f39c12' : '#e74c3c';
    roundRect(pbx, barY, barW * pp, barH, 4); ctx.fill();

    ctx.fillStyle = '#2c3e50';
    ctx.font = '600 13px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Waktu kamu', pX, barY - 8);

    if (!state.aiAnswered) {
        const ap = Math.max(0, 1 - state.aiTimer / state.aiInitialTimer);
        const abx = aX - barW / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; roundRect(abx, barY, barW, barH, 4); ctx.fill();
        ctx.fillStyle = ap > 0.75 ? '#e74c3c' : '#9575cd';
        roundRect(abx, barY, barW * ap, barH, 4); ctx.fill();

        ctx.fillStyle = '#2c3e50';
        ctx.fillText('AI berpikir...', aX, barY - 8);
    }
}

function getOptionRects() {
    const bw = 220, bh = 55, gap = 15;
    const totalW = bw * 2 + gap;
    const sx = (W - totalW) / 2;
    const sy = 110;
    return [
        { x: sx, y: sy, w: bw, h: bh },
        { x: sx + bw + gap, y: sy, w: bw, h: bh },
        { x: sx, y: sy + bh + gap, w: bw, h: bh },
        { x: sx + bw + gap, y: sy + bh + gap, w: bw, h: bh },
    ];
}

function drawQuestion() {
    if (!state.question || state.phase === 'gameover') return;

    const qx = W / 2 - 180, qy = 25, qw = 360, qh = 60;

    ctx.fillStyle = 'rgba(0,0,0,0.15)'; roundRect(qx + 4, qy + 4, qw, qh, 18); ctx.fill();
    ctx.fillStyle = '#ffffff'; roundRect(qx, qy, qw, qh, 18); ctx.fill();
    ctx.strokeStyle = '#667eea'; ctx.lineWidth = 3; roundRect(qx, qy, qw, qh, 18); ctx.stroke();

    ctx.fillStyle = '#2c3e50';
    ctx.font = '700 36px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.question.text, W / 2, qy + qh / 2);
    ctx.textBaseline = 'alphabetic';

    const rects = getOptionRects();
    for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        const opt = state.question.options[i];

        ctx.fillStyle = 'rgba(0,0,0,0.12)'; roundRect(r.x + 3, r.y + 3, r.w, r.h, 14); ctx.fill();
        ctx.fillStyle = '#ffffff'; roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill();
        ctx.strokeStyle = '#667eea'; ctx.lineWidth = 3; roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();

        ctx.fillStyle = '#667eea'; roundRect(r.x + 10, r.y + 10, 36, r.h - 20, 8); ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 20px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), r.x + 28, r.y + r.h / 2);

        ctx.fillStyle = '#2c3e50';
        ctx.font = '700 26px Fredoka, sans-serif';
        ctx.fillText(String(opt), r.x + r.w / 2 + 20, r.y + r.h / 2);

        if (state.aiChosenIndex === i) {
            ctx.fillStyle = '#9575cd';
            ctx.beginPath();
            ctx.arc(r.x + r.w - 18, r.y + 18, 14, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Fredoka, sans-serif';
            ctx.fillText('AI', r.x + r.w - 18, r.y + 18);
        }
    }
    ctx.textBaseline = 'alphabetic';
}

function drawFeedback() {
    if (!state.feedback) return;
    const alpha = Math.min(1, state.feedback.timer * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '700 68px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10;
    ctx.strokeText(state.feedback.text, W / 2, H / 2);
    ctx.fillStyle = state.feedback.color;
    ctx.fillText(state.feedback.text, W / 2, H / 2);
    ctx.restore();
}

function drawGameOver() {
    if (state.phase !== 'gameover') return;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 56px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
        state.winner === 'player' ? 'KAMU MENANG! 🎉' : 'AI MENANG 😢',
        W / 2, H / 2 - 20
    );

    ctx.font = '500 22px Fredoka, sans-serif';
    ctx.fillText('R = main lagi  •  M = menu', W / 2, H / 2 + 60);
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function startGame() {
    SFX.click();
    state.tugX = 0;
    state.winner = null;
    state.feedback = null;
    pAnim.state = 'idle'; pAnim.timer = 0;
    aiAnim.state = 'idle'; aiAnim.timer = 0;
    nextQuestion();
}

// ---------- INPUT: KEYBOARD ----------
document.addEventListener('keydown', (e) => {
    if (state.phase === 'menu') return;
    if (state.phase === 'gameover') {
        if (e.code === 'KeyR') { startGame(); return; }
        if (e.code === 'KeyM' || e.code === 'Escape') { state.phase = 'menu'; return; }
        return;
    }
    if (e.code === 'KeyR') { startGame(); return; }
    if (e.code === 'KeyM' || e.code === 'Escape') { state.phase = 'menu'; return; }
    if (state.phase !== 'playing') return;

    if (e.code === 'Digit1' || e.code === 'Numpad1') playerAnswer(0);
    if (e.code === 'Digit2' || e.code === 'Numpad2') playerAnswer(1);
    if (e.code === 'Digit3' || e.code === 'Numpad3') playerAnswer(2);
    if (e.code === 'Digit4' || e.code === 'Numpad4') playerAnswer(3);
});

// ---------- INPUT: MOUSE ----------
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
}

canvas.addEventListener('click', (e) => {
    const { x, y } = getMousePos(e);
    if (state.phase === 'menu') {
        for (const r of getMenuRects()) {
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                state.difficulty = r.key; SFX.click(); return;
            }
        }
        const s = getStartRect();
        if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) startGame();
        return;
    }
    if (state.phase !== 'playing' || !state.question) return;
    const rects = getOptionRects();
    for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
            playerAnswer(i); return;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (state.phase !== 'menu') { canvas.style.cursor = 'default'; return; }
    const { x, y } = getMousePos(e);
    state.hoverMenu = null;
    for (const r of getMenuRects()) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
            state.hoverMenu = r.key; canvas.style.cursor = 'pointer'; return;
        }
    }
    const s = getStartRect();
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
        state.hoverMenu = 'start'; canvas.style.cursor = 'pointer'; return;
    }
    canvas.style.cursor = 'default';
});

// ---------- JALANKAN ----------
requestAnimationFrame(loop);