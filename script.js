
// ==========================================
// GAME STATE
// ==========================================
let sessionClicks = 0; // Renamed from clickCount to avoid DOM ID conflict
let sessionSeconds = 0; // Renamed from seconds
let clickTimestamps = [];
let lastClickTime = Date.now();
let idleWarningShown = false;
let corruptionLevel = 0; // 0 to 100
let corruptionActive = false;
let lastSpeedCheck = Date.now();
let showShareReminder = false;
let clicksSinceShare = 0;
let currentMessageIndex = 0;
let currentPath = null;
let recordBeaten = false;

// EARLY GAME PERSONA INITIALIZATION
const earlyPersonas = ['early_curious', 'early_shy', 'early_aggressive', 'early_cryptic', 'early_glitch'];
let currentEarlyPersona = earlyPersonas[Math.floor(Math.random() * earlyPersonas.length)];
console.log("Session Persona:", currentEarlyPersona);

// QUEUED MESSAGES
let pendingTimeMessage = null;

// ==========================================
// UTILS & RECORD SYSTEM
// ==========================================

// Deterministic Random Number Generator (Mulberry32)
function seededRandom(seed) {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Simple String Hash
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}

// Generate or retrieve today's record time (Globally Synced via Date Seed)
function getTodayRecord() {
    const today = new Date().toDateString(); // e.g. "Mon Jan 20 2026"

    const storedData = localStorage.getItem('deneyRecord');
    if (storedData) {
        try {
            const parsed = JSON.parse(storedData);
            if (parsed.date === today) {
                return parsed.recordSeconds;
            }
        } catch (e) { }
    }

    // Generate GLOBALLY CONSISTENT record using the date string as seed
    const seed = hashCode(today);
    const rng1 = seededRandom(seed);
    const rng2 = seededRandom(seed + 1);

    // Record between 10 and 25 minutes
    const recordMinutes = Math.floor(rng1 * 15) + 10;
    const recordSecs = Math.floor(rng2 * 60);
    const newRecord = recordMinutes * 60 + recordSecs;

    localStorage.setItem('deneyRecord', JSON.stringify({
        date: today,
        recordSeconds: newRecord
    }));

    return newRecord;
}

const recordTotalSeconds = getTodayRecord();

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// ==========================================
// EVOLUTION SYSTEM
// ==========================================
let maxStageReached = localStorage.getItem('deneyMaxStage') !== null
    ? parseInt(localStorage.getItem('deneyMaxStage'))
    : -1;

function applyEvolution(stageIndex) {
    const mb = document.getElementById('mainButton');
    if (!mb) return;

    if (stageIndex >= 0) mb.classList.add('evo-border');
    if (stageIndex >= 1) mb.classList.add('evo-glow');
    if (stageIndex >= 2) document.body.classList.add('evo-title');
    if (stageIndex >= 3) mb.classList.add('evo-spotlight');
    if (stageIndex >= 4) document.body.classList.add('evo-particles');
    if (stageIndex >= 5) mb.classList.add('evo-rotate');
    if (stageIndex >= 6) mb.classList.add('evo-color-shift');
    if (stageIndex >= 7) mb.classList.add('evo-dual-ring');
    if (stageIndex >= 8) document.body.classList.add('evo-glitch');
    if (stageIndex >= 9) mb.classList.add('evo-tremble');
    if (stageIndex >= 10) mb.classList.add('evo-hollow');
    if (stageIndex >= 11) mb.classList.add('evo-echo');
    if (stageIndex >= 12) document.body.classList.add('evo-vignette');
    if (stageIndex >= 13) mb.classList.add('evo-3d');
    if (stageIndex >= 14) mb.classList.add('evo-ascend');
}

function checkEvolution() {
    // Note: currentMilestones is defined later, so assuming it's available or hoisted vars
    if (typeof currentMilestones === 'undefined') return;

    const milestoneIndex = currentMilestones.indexOf(sessionClicks);
    if (milestoneIndex !== -1 && milestoneIndex > maxStageReached) {
        maxStageReached = milestoneIndex;
        // localStorage.setItem('deneyMaxStage', maxStageReached);
        applyEvolution(maxStageReached);
    }
}

function restoreEvolutions() {
    if (maxStageReached >= 0) {
        applyEvolution(maxStageReached);
    }
}

// ==========================================
// AUDIO & HAPTIC
// ==========================================
let audioCtx = null;
let audioEnabled = true;

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playAtmosphericTone() {
    if (!audioEnabled || !audioCtx) return;

    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sine';

    const baseFreq = 150 + Math.random() * 100;

    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 3);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3);

    const panner = audioCtx.createStereoPanner();
    panner.pan.value = (Math.random() * 0.8) - 0.4;

    osc1.connect(gain);
    gain.connect(panner);
    panner.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 3);
}

function triggerAudio() {
    if (!audioEnabled) return;
    initAudio();
    if (sessionClicks % 10 === 0 || Math.random() < 0.3) playAtmosphericTone();
}

function triggerHaptic(pattern = 10) {
    if (navigator.vibrate) {
        try { navigator.vibrate(pattern); } catch (e) { }
    }
}

// ==========================================
// DOM INIT & SAFEGUARDS
// ==========================================
const mainButton = document.getElementById('mainButton');
const messageArea = document.getElementById('message');
const clickCountEl = document.getElementById('clickCount');
const timeCountEl = document.getElementById('timeCount');
const shareButton = document.getElementById('shareButton');
const recordLabel = document.getElementById('recordLabel');
const recordTimeEl = document.getElementById('recordTime');
const muteButton = document.getElementById('muteButton');

// Initialize Record Time
if (recordTimeEl && typeof recordTotalSeconds !== 'undefined') {
    recordTimeEl.textContent = formatTime(recordTotalSeconds);
}

// Initialize Message Area
if (messageArea) {
    messageArea.textContent = "Karanlığın içinde, sadece sen ve bu irade testi var.";
}

// Audio Toggle
if (muteButton) {
    muteButton.addEventListener('click', () => {
        audioEnabled = !audioEnabled;
        muteButton.textContent = audioEnabled ? 'ses: açık' : 'ses: kapalı';
        muteButton.style.opacity = audioEnabled ? '0.6' : '0.3';
    });
}

// ==========================================
// SHARE LOGIC
// ==========================================
async function generateShareImage(callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1080;
    canvas.height = 1920;

    const gradBg = ctx.createRadialGradient(540, 960, 0, 540, 960, 1000);
    gradBg.addColorStop(0, '#1a1a1a');
    gradBg.addColorStop(1, '#000000');
    ctx.fillStyle = gradBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 60000; i++) {
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 250;

    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 50;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.shadowColor = 'transparent';

    const gradBtn = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    gradBtn.addColorStop(0, '#222');
    gradBtn.addColorStop(1, '#050505');
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = gradBtn;
    ctx.fill();

    ctx.fillStyle = '#555';
    ctx.font = '500 70px "EB Garamond"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '10px';
    ctx.fillText('bas', centerX, centerY);

    ctx.fillStyle = '#d0d0d0';
    ctx.font = '300 60px "EB Garamond"';
    ctx.textAlign = 'center';

    const currentMsg = messageArea ? (messageArea.textContent.trim() || "") : "";
    if (currentMsg) {
        wrapText(ctx, currentMsg, centerX, centerY - 500, 850, 80);
    }

    ctx.fillStyle = '#444';
    ctx.font = '400 40px "EB Garamond"';
    ctx.letterSpacing = '5px';
    const statsText = `${sessionClicks} BASIŞ   |   SÜRE ${formatTime(sessionSeconds)}`;
    ctx.fillText(statsText, centerX, centerY + 500);

    ctx.fillStyle = '#333';
    ctx.font = '400 35px "EB Garamond"';
    ctx.fillText('press & question', centerX, canvas.height - 150);

    canvas.toBlob(blob => {
        if (callback) callback(blob);
    }, 'image/png');
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    if (words.length === 1) {
        ctx.fillText(text, x, y);
        return;
    }
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}

const shareModal = document.getElementById('shareModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnShareFriend = document.getElementById('btnShareFriend');
const btnShareStory = document.getElementById('btnShareStory');
function openShareModal() { if (shareModal) shareModal.style.display = 'flex'; }
function closeShareModal() { if (shareModal) shareModal.style.display = 'none'; }

if (shareButton) shareButton.addEventListener('click', (e) => { e.stopPropagation(); openShareModal(); });
if (btnCloseModal) btnCloseModal.addEventListener('click', closeShareModal);
if (shareModal) shareModal.addEventListener('click', (e) => { if (e.target === shareModal) closeShareModal(); });

if (btnShareFriend) {
    btnShareFriend.addEventListener('click', async () => {
        const shareData = {
            title: 'press & question',
            text: `Karanlıkta ${sessionClicks} kez yankılandım.`,
            url: window.location.href
        };
        try {
            if (navigator.share) await navigator.share(shareData);
            else {
                await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                alert('Bağlantı kopyalandı.');
            }
        } catch (err) { console.error(err); }
    });
}

if (btnShareStory) {
    btnShareStory.addEventListener('click', () => {
        const span = btnShareStory.querySelector('span');
        const originalText = span ? span.textContent : "Story At";
        if (span) span.textContent = "Hazırlanıyor...";
        generateShareImage(async (blob) => {
            if (!blob) return;
            const file = new File([blob], 'mindfuck_story.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'press & question',
                        text: `Bu gece ${sessionClicks} kez.`
                    });
                } catch (err) { console.error(err); }
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mindfuck_${sessionClicks}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }
            if (span) span.textContent = originalText;
        });
    });
}

// ==========================================
// NARRATIVE & MESSAGES
// ==========================================

const endlessMessages = [
    "Sonsuzlukta bir nokta.", "Devam.", "Hâlâ buradasın.", "Zaman bükülüyor.", "Anlam eriyor."
];

function generateMilestones(count, maxVal) {
    const milestones = new Set();
    const firstOne = Math.floor(Math.random() * (50 - 3)) + 3;
    milestones.add(firstOne);
    while (milestones.size < count) {
        const num = Math.floor(Math.random() * (maxVal - 51)) + 51;
        milestones.add(num);
    }
    return Array.from(milestones).sort((a, b) => a - b);
}

const currentMilestones = generateMilestones(15, 1000);
const activeTriggers = {};

// We assume stageMessagesGlobal is available from narrative.js
// It is already declared in global scope, so we just use it.
const localStageMessages = typeof window.stageMessagesGlobal !== 'undefined' ? window.stageMessagesGlobal : [];
currentMilestones.forEach((num, index) => {
    let msgOptions;
    if (index < localStageMessages.length) {
        msgOptions = localStageMessages[index];
    } else {
        msgOptions = endlessMessages;
    }
    let selectedMsg = Array.isArray(msgOptions)
        ? msgOptions[Math.floor(Math.random() * msgOptions.length)]
        : msgOptions;
    activeTriggers[num] = selectedMsg;
});

const spamMessages = [
    "Acelen neye? Zaman sadece bir algı.",
    "Yavaşla. Anı hisset.",
    "Hız, kaçıştır. Dur ve yüzleş.",
    "Nefes al. Buradayız.",
    "Sessiz ol."
];

const idleMessages = [
    "Sessizlik... En gürültülü cevap.",
    "Bekliyoruz. Birlikte.",
    "Hiçlik seni çağırıyor.",
    "Bir dokunuş. Tek gereken bu."
];

let usedPaths = [];

function selectRandomPath() {
    // Check if narrativePaths represents the global object
    if (typeof narrativePaths === 'undefined') return 'curiosity';

    const paths = Object.keys(narrativePaths);
    const availablePaths = paths.filter(p => !usedPaths.includes(p));
    if (availablePaths.length === 0) {
        usedPaths = [];
        const randomIndex = Math.floor(Math.random() * paths.length);
        usedPaths.push(paths[randomIndex]);
        return paths[randomIndex];
    }
    const randomIndex = Math.floor(Math.random() * availablePaths.length);
    usedPaths.push(availablePaths[randomIndex]);
    return availablePaths[randomIndex];
}

function switchToNextPath() {
    currentPath = selectRandomPath();
    currentMessageIndex = 0;
}

function showCorruptionMessage(text) {
    if (!messageArea) return;
    messageArea.classList.remove('fade');
    messageArea.textContent = text;
}

function showMessage(text) {
    if (!messageArea) return;
    messageArea.classList.add('fade');
    setTimeout(() => {
        messageArea.textContent = text;
        messageArea.classList.remove('fade');
    }, 200);
}

function isSpamming() {
    const now = Date.now();
    clickTimestamps = clickTimestamps.filter(t => now - t < 3000);
    return clickTimestamps.length >= 10;
}

function triggerGoldenRipple() {
    if (!mainButton) return;
    const ripple = document.createElement('div');
    ripple.classList.add('ripple');
    mainButton.appendChild(ripple);
    mainButton.classList.add('golden-border');
    setTimeout(() => {
        ripple.remove();
        mainButton.classList.remove('golden-border');
    }, 1500);
}

// CORRUPTION / ANTI-SPEEDRUN LOGIC
let currentCorruptionMessage = null;
let pendingRecoveryMessage = false;

function updateCorruption() {
    const now = Date.now();

    if (clickTimestamps.length > 50) {
        clickTimestamps = clickTimestamps.slice(-50);
    }

    let isBurst = false;
    if (clickTimestamps.length >= 3) {
        const timeSpan = now - clickTimestamps[clickTimestamps.length - 3];
        if (timeSpan < 500) {
            isBurst = true;
        }
    }

    if (isBurst) {
        corruptionLevel = Math.min(100, corruptionLevel + 20);
    } else {
        corruptionLevel = Math.max(0, corruptionLevel - 2);
    }

    if (clickCountEl) {
        if (corruptionLevel > 20) {
            clickCountEl.classList.add('blur-out');
        } else {
            clickCountEl.classList.remove('blur-out');
        }
    }

    if (corruptionLevel > 50) {
        document.body.classList.add('glitch-active');
        if (mainButton) mainButton.classList.add('button-resisting');
        corruptionActive = true;
    } else {
        if (corruptionActive) {
            pendingRecoveryMessage = true;
        }
        document.body.classList.remove('glitch-active');
        if (mainButton) mainButton.classList.remove('button-resisting');
        corruptionActive = false;
        currentCorruptionMessage = null;
    }
}

function getNextMessage() {
    if (sessionClicks >= 2000) {
        return "Yolun sonu, başından farksız. Sadece sen değiştin.";
    }

    if (corruptionActive && corruptionLevel > 50) {
        if (!currentCorruptionMessage) {
            if (typeof narrativePaths !== 'undefined' && narrativePaths.corruption) {
                const corruptionMsgs = narrativePaths.corruption;
                currentCorruptionMessage = corruptionMsgs[Math.floor(Math.random() * corruptionMsgs.length)];
            } else {
                currentCorruptionMessage = "Yavaşla.";
            }
        }
        return currentCorruptionMessage;
    }

    if (pendingRecoveryMessage) {
        pendingRecoveryMessage = false;
        if (typeof narrativePaths !== 'undefined' && narrativePaths.corruptionRecovery) {
            const recoveryMsgs = narrativePaths.corruptionRecovery;
            return recoveryMsgs[Math.floor(Math.random() * recoveryMsgs.length)];
        }
    }

    if (pendingTimeMessage) {
        const msg = pendingTimeMessage;
        pendingTimeMessage = null;
        return msg;
    }

    if (sessionClicks <= 50) {
        if (typeof narrativePaths !== 'undefined' && narrativePaths[currentEarlyPersona]) {
            const personaMsgs = narrativePaths[currentEarlyPersona];
            const msgIndex = (sessionClicks - 1) % personaMsgs.length;
            return personaMsgs[msgIndex];
        }
    }

    idleWarningShown = false;
    lastClickTime = Date.now();

    if (showShareReminder && clicksSinceShare >= 3 && clicksSinceShare <= 6 && Math.random() < 0.5) {
        showShareReminder = false;
        return "Bunu kimse bilmeyecek. Sadece sen.";
    }

    if (isSpamming()) {
        return spamMessages[Math.floor(Math.random() * spamMessages.length)];
    }

    if (activeTriggers[sessionClicks]) {
        triggerGoldenRipple();
        triggerHaptic([50, 50, 50]);
        return activeTriggers[sessionClicks];
    }

    if (typeof narrativePaths === 'undefined') return "...";

    const pathMessages = narrativePaths[currentPath];
    if (currentMessageIndex < pathMessages.length) {
        const message = pathMessages[currentMessageIndex];
        currentMessageIndex++;
        return message;
    } else {
        switchToNextPath();
        const newPathMessages = narrativePaths[currentPath];
        const message = newPathMessages[currentMessageIndex];
        currentMessageIndex++;
        return message;
    }
}

function checkTimeMessage() {
    if (typeof timeMessagesGlobal !== 'undefined' && timeMessagesGlobal[sessionSeconds]) {
        const now = Date.now();
        const timeSinceLastClick = (now - lastClickTime) / 1000;

        if (sessionSeconds === 60) {
            pendingTimeMessage = timeMessagesGlobal[sessionSeconds];
            showShareReminder = true;
            clicksSinceShare = 0;
        } else if (timeSinceLastClick >= 3) {
            pendingTimeMessage = timeMessagesGlobal[sessionSeconds];
        }
    }
}

function checkIdleState() {
    const now = Date.now();
    const idleTime = (now - lastClickTime) / 1000;
    if (idleTime >= 20 && idleTime <= 25 && !idleWarningShown && sessionClicks > 0) {
        idleWarningShown = true;
        const randomIdle = idleMessages[Math.floor(Math.random() * idleMessages.length)];
        pendingTimeMessage = randomIdle;
    }
}

// ==========================================
// GAME LOOP & EVENTS
// ==========================================

setTimeout(() => {
    currentPath = selectRandomPath();
}, 100);

if (mainButton) {
    mainButton.addEventListener('click', () => {
        if (Date.now() - lastClickTime < 80) return;

        triggerHaptic(10);
        clickTimestamps.push(Date.now());
        lastClickTime = Date.now();

        updateCorruption();

        if (corruptionActive && corruptionLevel > 50) {
            triggerHaptic([30, 30, 30, 30, 100]);
            const message = getNextMessage(); // return sticky
            if (message !== null) showCorruptionMessage(message);
            try { triggerAudio(); } catch (e) { }
            return;
        }

        sessionClicks++;
        if (clickCountEl) clickCountEl.textContent = sessionClicks;
        checkEvolution();
        if (showShareReminder) clicksSinceShare++;

        const message = getNextMessage();
        if (message !== null) {
            showMessage(message);
        }

        try { triggerAudio(); } catch (e) { }
    });
}

setInterval(() => {
    sessionSeconds++;
    if (timeCountEl) timeCountEl.textContent = formatTime(sessionSeconds);
    checkTimeMessage();
    checkIdleState();

    if (corruptionLevel > 0) {
        corruptionLevel = Math.max(0, corruptionLevel - 10);

        if (corruptionLevel <= 30) {
            if (clickCountEl) clickCountEl.classList.remove('blur-out');
        }
        if (corruptionLevel <= 50) {
            if (corruptionActive) {
                pendingRecoveryMessage = true;
            }
            document.body.classList.remove('glitch-active');
            if (mainButton) mainButton.classList.remove('button-resisting');
            corruptionActive = false;
            currentCorruptionMessage = null;
        }
    }

    if (!recordBeaten && sessionSeconds > recordTotalSeconds) {
        recordBeaten = true;
        if (recordLabel) recordLabel.classList.add('beaten');
        showMessage("Sınırları aştın.");
    }
}, 1000);

setTimeout(() => { if (mainButton) mainButton.classList.add('pulse'); }, 2000);
if (mainButton) mainButton.addEventListener('click', () => { mainButton.classList.remove('pulse'); }, { once: true });
