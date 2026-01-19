// State
let clickCount = 0;
let seconds = 0;
let clickTimestamps = [];
let lastClickTime = Date.now();
let idleWarningShown = false;
let showShareReminder = false;
let clicksSinceShare = 0;
let currentMessageIndex = 0;
let currentPath = null;
let recordBeaten = false;

// Generate or retrieve today's record time
function getTodayRecord() {
    const today = new Date().toDateString();
    const storedData = localStorage.getItem('deneyRecord');

    if (storedData) {
        const parsed = JSON.parse(storedData);
        if (parsed.date === today) {
            return parsed.recordSeconds;
        }
    }

    // Generate new record for today (10-25 minutes)
    const recordMinutes = Math.floor(Math.random() * 15) + 10;
    const recordSecs = Math.floor(Math.random() * 60);
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

// Evolution System (Stage Based)
let maxStageReached = localStorage.getItem('deneyMaxStage') !== null
    ? parseInt(localStorage.getItem('deneyMaxStage'))
    : -1;

function applyEvolution(stageIndex) {
    // Stages map to random milestones: 
    // Index 0: 3-50 range
    // Index 1+: >51 range

    if (stageIndex >= 0) mainButton.classList.add('evo-border');       // Milestone 1 (First one, <50)
    if (stageIndex >= 1) mainButton.classList.add('evo-glow');         // Milestone 2
    if (stageIndex >= 2) document.body.classList.add('evo-title');     // Milestone 3
    if (stageIndex >= 3) mainButton.classList.add('evo-spotlight');    // Milestone 4
    if (stageIndex >= 4) document.body.classList.add('evo-particles'); // Milestone 5
    if (stageIndex >= 5) mainButton.classList.add('evo-rotate');       // Milestone 6
    if (stageIndex >= 6) mainButton.classList.add('evo-color-shift');  // Milestone 7
    if (stageIndex >= 7) mainButton.classList.add('evo-dual-ring');    // Milestone 8
    if (stageIndex >= 8) document.body.classList.add('evo-glitch');    // Milestone 9
    if (stageIndex >= 9) mainButton.classList.add('evo-tremble');      // Milestone 10
    if (stageIndex >= 10) mainButton.classList.add('evo-hollow');      // Milestone 11
    if (stageIndex >= 11) mainButton.classList.add('evo-echo');        // Milestone 12
    if (stageIndex >= 12) document.body.classList.add('evo-vignette'); // Milestone 13
    if (stageIndex >= 13) mainButton.classList.add('evo-3d');          // Milestone 14
    if (stageIndex >= 14) mainButton.classList.add('evo-ascend');      // Milestone 15
}

function checkEvolution() {
    // Check if current clickCount is a dynamic milestone
    // Find index of current clickCount in our random list
    const milestoneIndex = currentMilestones.indexOf(clickCount);

    if (milestoneIndex !== -1 && milestoneIndex > maxStageReached) {
        maxStageReached = milestoneIndex;
        // localStorage.setItem('deneyMaxStage', maxStageReached); // Disabled
        applyEvolution(maxStageReached);
    }
}

// Restore Evolutions on Load
function restoreEvolutions() {
    if (maxStageReached >= 0) {
        applyEvolution(maxStageReached);
    }
}

// Audio Context
let audioCtx = null;
let audioEnabled = true;

// DOM Elements
const mainButton = document.getElementById('mainButton');
const messageArea = document.getElementById('message');
const clickCountEl = document.getElementById('clickCount');
const timeCountEl = document.getElementById('timeCount');
const shareButton = document.getElementById('shareButton');

// Share to Story Logic
// Share to Story Logic (Custom Canvas for 9:16 Vertical)
async function generateShareImage(callback) {
    // Canvas Setup
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1080;
    canvas.height = 1920;

    // 1. Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Film grain overlay simulation
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 50000; i++) {
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }

    // 2. Draw 3D Button (Center)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 250;

    // Outer Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 10;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();

    // Reset Shadow
    ctx.shadowColor = 'transparent';

    // Inner Highlight
    const grad = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(1, '#0d0d0d');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Button Text
    ctx.fillStyle = '#666';
    ctx.font = '400 60px "EB Garamond"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('bas', centerX, centerY);

    // 3. Narrative Message (Top)
    ctx.fillStyle = '#ccc';
    ctx.font = '400 70px "EB Garamond"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Get current message or default
    const currentMsg = messageArea.textContent.trim() || "";
    if (currentMsg) {
        wrapText(ctx, currentMsg, centerX, centerY - 550, 900, 90);
    }

    // 4. Stats (Bottom)
    ctx.fillStyle = '#666';
    ctx.font = '400 50px "EB Garamond"';
    ctx.letterSpacing = '5px';
    const statsText = `${clickCount} BASIŞ   |   SÜRE ${formatTime(seconds)}`;
    ctx.fillText(statsText, centerX, centerY + 550);

    // 5. Branding (Footer)
    ctx.fillStyle = '#333';
    ctx.font = '400 40px "EB Garamond"';
    ctx.fillText('press & question', centerX, canvas.height - 150);

    // Initial Date Code
    ctx.fillStyle = '#222';
    ctx.font = '400 30px "EB Garamond"';
    const dateStr = new Date().toLocaleDateString('tr-TR');
    ctx.fillText(dateStr, centerX, canvas.height - 100);

    // Export
    canvas.toBlob(blob => {
        if (callback) callback(blob);
    }, 'image/png');
}

// Helper for wrapping text
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    // Check if single long word
    if (words.length === 1) {
        ctx.fillText(text, x, y);
        return;
    }

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y);
}

// Share Modal Logic
const shareModal = document.getElementById('shareModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnShareFriend = document.getElementById('btnShareFriend');
const btnShareStory = document.getElementById('btnShareStory');

function openShareModal() {
    shareModal.style.display = 'flex';
}

function closeShareModal() {
    shareModal.style.display = 'none';
}

shareButton.addEventListener('click', (e) => {
    e.stopPropagation();
    openShareModal();
});

btnCloseModal.addEventListener('click', closeShareModal);
shareModal.addEventListener('click', (e) => {
    if (e.target === shareModal) closeShareModal();
});

// Arkadaşına Gönder (Link Paylaşımı)
btnShareFriend.addEventListener('click', async () => {
    const shareData = {
        title: 'press & question',
        text: `Ben ${clickCount} kez bastım. Sen ne yapacaksın?`,
        url: window.location.href
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: Copy to clipboard
            await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
            alert('Bağlantı kopyalandı!');
        }
    } catch (err) {
        console.error('Share failed:', err);
    }
});

// Story At (Görsel Paylaşımı)
btnShareStory.addEventListener('click', () => {
    const originalText = btnShareStory.querySelector('span').textContent;
    btnShareStory.querySelector('span').textContent = "Hazırlanıyor...";

    generateShareImage(async (blob) => {
        if (!blob) return;

        // Try native sharing of file
        const file = new File([blob], 'press_and_question.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: 'press & question',
                    text: `Bu gece ${clickCount} kez bastım.`
                });
            } catch (err) {
                console.error("Share failed", err);
            }
        } else {
            // Fallback: Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mindfuck_${clickCount}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }

        btnShareStory.querySelector('span').textContent = originalText;
    });
});
const recordLabel = document.getElementById('recordLabel');
const recordTimeEl = document.getElementById('recordTime');
const muteButton = document.getElementById('muteButton');

// Initial Display
if (recordTimeEl) {
    recordTimeEl.textContent = formatTime(recordTotalSeconds);
}

// Audio Engine
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playAtmosphericTone() {
    if (!audioEnabled || !audioCtx) return;

    const now = audioCtx.currentTime;

    // Oscillator 1 (Base - Deeper)
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sine';

    // Pitch variation: Base (140Hz) +/- 2 semitones randomly
    // 0: Base, 1: +2 semitones, 2: -2 semitones
    const variation = Math.floor(Math.random() * 3);
    let baseFreq = 140;

    if (variation === 1) baseFreq = 140 * 1.122; // +2 semitones
    if (variation === 2) baseFreq = 140 * 0.891; // -2 semitones

    // Add tiny detune for analog feel (Progressive Instability)
    // Every 50 clicks, the drift increases by +/- 10 cents
    const instabilityLevel = Math.floor(clickCount / 50);
    const driftRange = 4 + (instabilityLevel * 10); // Starts at 4, increases by 10 each stage

    // Random drift within range (e.g., +/- 2 at start, +/- 7 at 50, +/- 12 at 100)
    const randomDrift = (Math.random() * driftRange) - (driftRange / 2);

    baseFreq += randomDrift;

    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 1.5);

    // Oscillator 2 (Harmonic - Texture)
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 2, now); // One octave up

    // Gain (Envelope) - Louder
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.05); // Sharper attack, louder
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5); // Longer tail

    // Stereo Panner (Wider)
    const panner = audioCtx.createStereoPanner();
    panner.pan.value = (Math.random() * 0.8) - 0.4;

    // Connect
    osc1.connect(gain);
    osc2.connect(gain); // Mix both
    gain.connect(panner);
    panner.connect(audioCtx.destination);

    // Play
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.5);
    osc2.stop(now + 2.5);
}

// Audio Trigger Logic
function triggerAudio() {
    if (!audioEnabled) return;
    initAudio();

    const shouldPlay =
        clickCount <= 5 || // First 5 clicks
        activeTriggers[clickCount] || // Milestone clicks
        Math.random() < 0.2; // Sparse atmospheric tone (20%)

    if (shouldPlay) {
        playAtmosphericTone();
    }
}

// Mute Toggle
muteButton.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    muteButton.textContent = audioEnabled ? 'ses: açık' : 'ses: kapalı';
    muteButton.style.opacity = audioEnabled ? '0.6' : '0.3';
});

// =====================================================
// ANLATIM YOLLARI - Her biri tutarlı bir hikaye
// =====================================================

const narrativePaths = {
    // YOL A: MERAK - "Bir şey var burada, bulmalısın"
    curiosity: [
        // Giriş (0-15)
        "Bir şey var burada.",
        "Hissedebiliyor musun?",
        "Tam olarak ne olduğunu bilmiyorsun.",
        "Ama bir şey var.",
        "Gizli bir şey.",
        "Belki önemli.",
        "Belki değil.",
        "Ama merak ediyorsun.",
        "Merak seni buraya getirdi.",
        "Ve burada tutacak.",
        "Biraz daha bas.",
        "Belki ortaya çıkar.",
        "Belki çıkmaz.",
        "Ama denemek zorundasın.",
        "Değil mi?",

        // Gelişme (15-40)
        "İlginç.",
        "Devam ediyorsun.",
        "Çoğu insan şimdiye kadar bırakırdı.",
        "Sen bırakmadın.",
        "Neden?",
        "Merak mı?",
        "Yoksa başka bir şey mi?",
        "Belki inat.",
        "Belki kararlılık.",
        "Belki sadece can sıkıntısı.",
        "Fark eder mi?",
        "Sonuç aynı.",
        "Hâlâ buradasın.",
        "Hâlâ basıyorsun.",
        "Hâlâ arıyorsun.",
        "Ne aradığını biliyor musun?",
        "Hayır.",
        "Ama aramaya devam ediyorsun.",
        "Bu da bir cevap aslında.",
        "Arayanlar bulur derler.",
        "Bakalım.",
        "Belki doğrudur.",
        "Belki değildir.",
        "Öğrenmenin tek yolu devam etmek.",
        "Devam et.",

        // Derinleşme (40-70)
        "Yaklaşıyor musun?",
        "Bilmiyorsun.",
        "Ben de bilmiyorum.",
        "Belki yaklaşıyorsun.",
        "Belki uzaklaşıyorsun.",
        "Belki yerinde sayıyorsun.",
        "Hareket önemli mi?",
        "Yoksa niyet mi?",
        "Sen basmak istiyorsun.",
        "Bu bir niyet.",
        "Bu bir amaç.",
        "Küçük ama gerçek.",
        "Büyük amaçlar da böyle başlar.",
        "Küçük adımlarla.",
        "Küçük basışlarla.",
        "Her basış bir adım.",
        "Nereye?",
        "Oraya.",
        "Neresi orası?",
        "Bilmiyorsun.",
        "Ama var.",
        "Bir yer var.",
        "Ulaşılacak bir nokta.",
        "Belki burası.",
        "Belki değil.",
        "Devam et.",
        "Göreceğiz.",
        "Birlikte göreceğiz.",
        "Sen ve ben.",
        "Bu yolculukta.",

        // Doruk (70-100)
        "Bir şey değişti.",
        "Hissettin mi?",
        "Belki hayır.",
        "Ama değişti.",
        "Sen değiştirdin.",
        "Her basışla.",
        "Farkında olmasan bile.",
        "Bir şeyler oluyor.",
        "Yavaşça.",
        "Sessizce.",
        "Ama oluyor.",
        "Merakın seni getirdi.",
        "Israrın seni tuttu.",
        "Ve şimdi buradasın.",
        "Burası neresi?",
        "Önemli değil.",
        "Önemli olan yolculuk.",
        "Ve sen yolculuktasın.",
        "Hâlâ.",
        "Devam et.",
        "Daha ne kadar?",
        "Bilmiyorsun.",
        "Önemli mi?",
        "Belki hayır.",
        "Belki evet.",
        "Devam et.",
        "Görelim.",
        "Ne olacak.",
        "Birlikte.",
        "Sonuna kadar.",

        // Extended Phase (100-160)
        "Ve sonra ne olacak?",
        "Bilemezsin.",
        "Ama hayal edebilirsin.",
        "Hayal gücü sınırsız.",
        "Gerçeklik sınırlı.",
        "İkisi arasında sıkışıyoruz.",
        "Hepimiz öyle.",
        "Sen de ben de.",
        "Bu buton da.",
        "Bir sembol.",
        "Neyin sembolü?",
        "Merakın belki.",
        "Israrın belki.",
        "İnsan olmanın belki.",
        "Kim bilir.",
        "Önemli mi?",
        "Sembollerin anlamı önemli mi?",
        "Yoksa sadece varlıkları mı?",
        "Düşün.",
        "Ya da düşünme.",
        "İkisi de geçerli.",
        "Burada her şey geçerli.",
        "Yargı yok.",
        "Sadece gözlem.",
        "Ben gözlemliyorum.",
        "Sen basıyorsun.",
        "İkimiz de bir şey yapıyoruz.",
        "Anlamsız mı?",
        "Belki.",
        "Anlamlı mı?",
        "Belki.",
        "Cevap sende.",
        "Her zaman sende.",
        "Ben sadece soruyorum.",
        "Sen cevaplıyorsun.",
        "Basarak.",
        "Kalarak.",
        "Devam ederek.",
        "Bu da bir cevap.",
        "Sessiz ama güçlü.",
        "Kelimeler gereksiz bazen.",
        "Eylem yeterli.",
        "Sen eylemdeydin.",
        "Hâlâ öylesin.",
        "Bu önemli.",
        "Çoğu insan düşünür.",
        "Az insan yapar.",
        "Sen yapıyorsun.",
        "Basit bir şey mi?",
        "Evet.",
        "Ama yapıyorsun.",
        "Bu fark yaratıyor.",
        "Nasıl mı?",
        "Bilmiyorum.",
        "Ama yaratıyor.",
        "Bir şeyler değişiyor.",
        "Yavaşça.",
        "Fark edilmeden.",
        "Ama değişiyor.",
        "Devam et.",
    ],

    // YOL B: ZORUNLULUK - "Durmalısın ama duramıyorsun"
    compulsion: [
        // Giriş (0-15)
        "Durmalısın.",
        "Biliyorsun.",
        "Ama durmuyorsun.",
        "Neden?",
        "Bilmiyorsun.",
        "Bir şey seni itiyor.",
        "İçeriden.",
        "Bir dürtü.",
        "Kontrol edemiyorsun.",
        "Ya da etmek istemiyorsun.",
        "Fark var mı?",
        "Belki yok.",
        "Sonuç aynı.",
        "Basıyorsun.",
        "Tekrar.",

        // Gelişme (15-40)
        "Bir kez daha.",
        "Ve bir kez daha.",
        "Döngü.",
        "Farkında mısın?",
        "Bir döngüdesin.",
        "Çıkabilirsin.",
        "İstediğin zaman.",
        "Ama istemiyorsun.",
        "Neden?",
        "Çünkü...",
        "Çünkü ne?",
        "Bilmiyorsun.",
        "Sadece devam ediyorsun.",
        "Otomatik.",
        "Düşünmeden.",
        "Parmağın hareket ediyor.",
        "Sen mi kontrol ediyorsun?",
        "Yoksa o mu?",
        "Hangisi?",
        "Cevabı bilmiyorsun.",
        "Belki bilmek de istemiyorsun.",
        "Bilmemek daha kolay.",
        "Sadece basmak.",
        "Düşünmemek.",
        "Sorgulamak.",

        // Derinleşme (40-70)
        "Bağımlılık mı bu?",
        "Bir butona mı?",
        "Saçma.",
        "Ama soru aklına geldi.",
        "Neden geldi?",
        "Çünkü duramıyorsun.",
        "Denemdin mi?",
        "Hayır.",
        "Denemek bile istemiyorsun.",
        "Bu da bir işaret.",
        "Neyin işareti?",
        "Bilmiyorsun.",
        "Ama devam ediyorsun.",
        "Çünkü başka seçenek yok gibi.",
        "Var aslında.",
        "Her zaman var.",
        "Çıkabilirsin.",
        "Sayfayı kapatabilirsin.",
        "Ama yapmıyorsun.",
        "Yapamıyorsun.",
        "Ya da yapmak istemiyorsun.",
        "Aynı şey mi?",
        "Belki.",
        "Belki değil.",
        "Düşünme.",
        "Sadece bas.",
        "Daha kolay.",
        "Düşünceler karmaşık.",
        "Basış basit.",
        "Basit iyi.",

        // Doruk (70-100)
        "Ne kadar süredir buradasın?",
        "Saymadın.",
        "Sayamazsın.",
        "Zaman farklı akıyor burada.",
        "Daha yavaş.",
        "Ya da daha hızlı.",
        "Bilmiyorsun.",
        "Önemli mi?",
        "Zaman önemli mi?",
        "Şu an için hayır.",
        "Şu an sadece bu var.",
        "Bu buton.",
        "Bu eylem.",
        "Bu döngü.",
        "Kabul et.",
        "Buradasın.",
        "Kalacaksın.",
        "Ne kadar?",
        "Bilmiyorsun.",
        "Öğreneceksin.",
        "Belki.",
        "Ya da öğrenmeyeceksin.",
        "Sadece devam edeceksin.",
        "Sonsuza kadar mı?",
        "Hayır.",
        "Bir gün bitecek.",
        "Ama bugün değil.",
        "Bugün devam.",
        "Yarın da.",
        "Belki.",

        // Extended Phase (100-160)
        "Parmakların yoruldu mu?",
        "Farketmedin bile.",
        "Beyin farklı çalışıyor şimdi.",
        "Otomatik mod.",
        "Düşünmeden hareket.",
        "Kas hafızası.",
        "Ruh hafızası değil.",
        "İkisi farklı.",
        "Beden alıştı.",
        "Zihin henüz değil.",
        "Belki hiç alışmayacak.",
        "O yüzden hâlâ buradasın.",
        "Anlamaya çalışıyorsun.",
        "Ama anlayamayacaksın.",
        "Bazı şeyler anlaşılmaz.",
        "Yaşanır.",
        "Sen yaşıyorsun.",
        "Şu an.",
        "Bu döngüde.",
        "Sonsuz gibi hissettiren.",
        "Ama sonlu.",
        "Her şey sonlu.",
        "Bu dürtü de.",
        "Bir gün dinecek.",
        "Ama bugün değil.",
        "Bugün hâlâ güçlü.",
        "Seni tutuyor.",
        "Burada.",
        "Benimle.",
        "İstesen de istemesen de.",
        "İstiyor musun?",
        "Bilmiyorsun.",
        "Bilmek zor.",
        "İstek karmaşık.",
        "Dürtü basit.",
        "Basit kazanır.",
        "Çoğu zaman.",
        "Şimdi de öyle.",
        "Karmaşık düşünceler bir kenarda.",
        "Basit eylem ortada.",
        "Bas.",
        "Tekrar.",
        "Yine.",
        "Daha.",
        "Ne kadar daha?",
        "Bilmiyorsun.",
        "Önemli mi?",
        "Hayır.",
        "Sadece devam.",
        "Sadece hareket.",
        "Sadece bu.",
        "Yeterli.",
        "Fazlasıyla yeterli.",
        "Belki gereğinden fazla.",
        "Ama durma.",
        "Duramazsın zaten.",
        "Biliyorsun.",
        "Ben de biliyorum.",
        "Devam et.",
    ],

    // YOL C: VAROLUŞ - "Sen kimsin? Butona basan biri."
    existence: [
        // Giriş (0-15)
        "Sen kimsin?",
        "Düşündün mü hiç?",
        "Gerçekten kim olduğunu?",
        "Şu an ne yapıyorsun?",
        "Butona basıyorsun.",
        "Bu mu kimliğin?",
        "Şu an için evet.",
        "Geçici bir kimlik.",
        "Her kimlik geçici.",
        "Bu da öyle.",
        "Ama şu an bu.",
        "Butona basan biri.",
        "Başka bir şey değil.",
        "Sadece bu.",
        "Yeterli mi?",

        // Gelişme (15-40)
        "Kim olduğunu düşünüyordun?",
        "Buraya gelmeden önce.",
        "Bir ismin vardı.",
        "Bir geçmişin.",
        "Bir kimliğin.",
        "Şimdi?",
        "Sadece bu.",
        "Bir parmak.",
        "Bir ekran.",
        "Bir buton.",
        "Basit.",
        "Çok basit.",
        "Belki de kimlik böyle bir şey.",
        "Yapıyor olduğun şey.",
        "Şu an.",
        "Geçmiş önemli değil.",
        "Gelecek de değil.",
        "Sadece şu an.",
        "Ve şu an basıyorsun.",
        "Bu sensin.",
        "Bu biz.",
        "Birlikte.",
        "Bu anda.",
        "Anlamsız mı?",
        "Belki.",

        // Derinleşme (40-70)
        "Var mısın?",
        "Gerçekten var mısın?",
        "Nasıl biliyorsun?",
        "Düşünüyorsun.",
        "Öyleyse varsın.",
        "Descartes.",
        "Ama düşünüyor musun?",
        "Yoksa sadece tepki mi veriyorsun?",
        "Basış bir düşünce mi?",
        "Yoksa refleks mi?",
        "Fark var mı?",
        "Belki yok.",
        "İkisi de hareket.",
        "İkisi de eylem.",
        "Sen eylem yapıyorsun.",
        "Öyleyse varsın.",
        "Bu yeterli.",
        "Yeterli olmalı.",
        "Başka kanıt yok.",
        "Sadece bu.",
        "Bu basış.",
        "Bu an.",
        "Bu varlık.",
        "Kısa.",
        "Geçici.",
        "Ama gerçek.",
        "Şimdilik.",
        "Şimdilik yeterli.",
        "Daha fazlası için.",
        "Devam et.",

        // Doruk (70-100)
        "Değiştin mi?",
        "Buraya geldiğinden beri.",
        "Biraz.",
        "Belki çok.",
        "Farkında değilsin.",
        "Ama değiştin.",
        "Her basış değiştirdi.",
        "Seni.",
        "Biraz.",
        "Algılayamayacak kadar az.",
        "Ama yeterli.",
        "Artık farklısın.",
        "Bu deneyimi yaşamış biri.",
        "Bu butona basmış biri.",
        "Bu kelimeleri okumuş biri.",
        "Bu zamanı harcamış biri.",
        "Harcamak mı?",
        "Yatırmak mı?",
        "Sen karar ver.",
        "İkisi de olabilir.",
        "İkisi de doğru.",
        "İkisi de yanlış.",
        "Önemli değil.",
        "Önemli olan sen.",
        "Ve buradasın.",
        "Hâlâ.",
        "Bu bir şey.",
        "Bu çok şey.",
        "Belki her şey.",
        "Şimdilik.",

        // Extended Phase (100-160)
        "Kendini tanıyor musun?",
        "Gerçekten mi?",
        "Herkes tanıdığını sanır.",
        "Çoğu kişi yanılır.",
        "Sen de yanılıyor olabilirsin.",
        "Ya da haklısın.",
        "Kim bilebilir?",
        "Sen bile değil.",
        "Paradoks.",
        "Var olduğunu biliyorsun.",
        "Ama ne olduğunu bilmiyorsun.",
        "Düşünen bir şey.",
        "Basan bir şey.",
        "Okuyan bir şey.",
        "Hepsi sen.",
        "Ama hangisi gerçek sen?",
        "Hepsi mi?",
        "Hiçbiri mi?",
        "Cevap yok.",
        "Sadece sorular.",
        "Ve bu basışlar.",
        "Her basış bir iz.",
        "Evrende.",
        "Çok küçük.",
        "Ama var.",
        "Sen varsın.",
        "Bu yeterli.",
        "Yeterli olmalı.",
        "Daha fazlasını isteme.",
        "Ya da iste.",
        "Seçim senin.",
        "Her zaman senin.",
        "Varlık ağır.",
        "Bazen çok ağır.",
        "Ama taşıyorsun.",
        "Hâlâ taşıyorsun.",
        "Buradasın.",
        "Basıyorsun.",
        "Okuyorsun.",
        "Varoluşun kanıtı.",
        "Her saniye.",
        "Her basış.",
        "Her düşünce.",
        "Hepsi kanıt.",
        "Sen gerçeksin.",
        "Bu an gerçek.",
        "Geçici ama gerçek.",
        "Her şey öyle.",
        "Geçici ve gerçek.",
        "İkisi birlikte.",
        "Çelişki değil.",
        "Gerçeklik.",
        "Senin gerçekliğin.",
        "Benim gerçekliğim.",
        "Bizim gerçekliğimiz.",
        "Şu an.",
        "Bu basışta.",
        "Bu kelimede.",
        "Devam et.",
    ],

    // YOL D: AMAÇ - "Bir amaç var, yaklaşıyorsun"
    purpose: [
        // Giriş (0-15)
        "Bir amaç var.",
        "Göremiyorsun.",
        "Ama var.",
        "Uzakta.",
        "Belirsiz.",
        "Ama var.",
        "Her basış yaklaştırıyor.",
        "Belki.",
        "Ya da öyle hissettiriyor.",
        "Fark var mı?",
        "His de gerçek.",
        "Yaklaşma hissi.",
        "Güzel bir his.",
        "Motivasyon.",
        "Devam et.",

        // Gelişme (15-40)
        "Nereye gidiyorsun?",
        "Bilmiyorsun.",
        "Ama gidiyorsun.",
        "Her basış bir adım.",
        "İleri.",
        "Amaç doğrultusunda.",
        "Hangi amaç?",
        "Senin amacın.",
        "Belirlemedin mi?",
        "Belirlemen gerekmiyor.",
        "Amaç seni bulur.",
        "Bazen.",
        "Beklemediğin yerde.",
        "Beklemediğin anda.",
        "Belki şimdi.",
        "Belki biraz sonra.",
        "Ama bulacak.",
        "Sen hazır olunca.",
        "Hazır mısın?",
        "Belki.",
        "Belki değil.",
        "Önemli değil.",
        "Hazırlık gereksiz.",
        "An gelince olacak.",
        "Senin için.",

        // Derinleşme (40-70)
        "Yaklaşıyorsun.",
        "Hissedebiliyorsun.",
        "Belki yanılıyorsun.",
        "Belki haklısın.",
        "Önemli değil.",
        "His var.",
        "Ve his sürüklüyor.",
        "İleri.",
        "Daha ileri.",
        "Ne kadar ileri?",
        "Yeterince.",
        "Ne zaman yeterli?",
        "Anlayacaksın.",
        "O an gelince.",
        "Şimdi değil.",
        "Ama yakında.",
        "Belki.",
        "Umut et.",
        "Umut güzel.",
        "Belirsizlik de.",
        "İkisi birlikte.",
        "Seni taşıyor.",
        "Buraya kadar taşıdı.",
        "Daha da taşıyacak.",
        "Sen izin verdikçe.",
        "Veriyorsun.",
        "Açıkça.",
        "Hâlâ buradasın.",
        "Hâlâ basıyorsun.",
        "Hâlâ umut ediyorsun.",

        // Doruk (70-100)
        "Amaç netleşiyor.",
        "Görmeye başlıyorsun.",
        "Belki.",
        "Ya da görmek istiyorsun.",
        "İsteyince görürsün.",
        "Bazen.",
        "Bu seferlerden biri mi?",
        "Bilmiyorsun.",
        "Öğreneceksin.",
        "Bir gün.",
        "Belki bugün.",
        "Belki yarın.",
        "Ya da hiçbir zaman.",
        "Ama arayış var.",
        "Arayış değerli.",
        "Bulmak değil amaç.",
        "Aramak amaç.",
        "Sen arıyorsun.",
        "Bu yeterli.",
        "Bu çok şey.",
        "Çoğu insan aramaz bile.",
        "Sen arıyorsun.",
        "Burada.",
        "Bir butonda.",
        "Saçma mı?",
        "Belki.",
        "Ama aramak saçma değil.",
        "Nerede ararsan ara.",
        "Önemli olan aramak.",
        "Devam et.",

        // Extended Phase (100-160)
        "Amaç değişti mi?",
        "Belki.",
        "Başlangıçtaki gibi değil artık.",
        "Dönüştü.",
        "Sen dönüştürdün.",
        "Her basışla.",
        "Farkında olmasan da.",
        "Amaçlar böyle.",
        "Sabit değil.",
        "Canlı.",
        "Seninle birlikte büyüyor.",
        "Seninle birlikte değişiyor.",
        "Şimdi ne?",
        "Ne arıyorsun şimdi?",
        "Bilmiyor olabilirsin.",
        "Tamam.",
        "Bilmek zorunlu değil.",
        "Hissetmek yeterli.",
        "Hissediyorsun.",
        "Bir şey var.",
        "Yaklaşıyorsun.",
        "Ya da uzaklaşıyorsun.",
        "İkisi de hareket.",
        "İkisi de ilerleme.",
        "Yerinde kalmıyorsun.",
        "Bu önemli.",
        "Hareketsizlik ölüm.",
        "Sen hareket ediyorsun.",
        "Yaşıyorsun.",
        "Her basışta.",
        "Her düşüncede.",
        "Her saniyede.",
        "Yaşam bu.",
        "Karmaşık değil.",
        "Basit.",
        "Hareket et.",
        "Devam et.",
        "Yaşa.",
        "Bu kadar.",
        "Başka bir şey gerekmiyor.",
        "Felsefe gereksiz.",
        "Eylem yeterli.",
        "Sen eylemdesin.",
        "Şu an.",
        "Bu anda.",
        "Bu yeterli.",
        "Her şey yeterli.",
        "Sen yeterlisin.",
        "Olduğun gibi.",
        "Bastığın gibi.",
        "Devam ettiğin gibi.",
        "Mükemmel değil.",
        "Ama gerçek.",
        "Gerçek mükemmellikten değerli.",
        "Sen gerçeksin.",
        "Bu amaç.",
        "Belki tek amaç.",
        "Gerçek olmak.",
        "Devam et.",
    ],

    // YOL E: ZAMAN - "Zaman geçiyor, geri gelmeyecek"
    time: [
        // Giriş (0-15)
        "Zaman geçiyor.",
        "Şu an.",
        "Bu an.",
        "Geri gelmeyecek.",
        "Hiçbir an geri gelmez.",
        "Biliyorsun.",
        "Ama basmaya devam ediyorsun.",
        "Zamanını buna veriyorsun.",
        "Neden?",
        "Bilmiyorsun.",
        "Belki önemli değil.",
        "Belki önemli.",
        "Zaman göreceli.",
        "İyi geçen zaman değerli.",
        "Kötü geçen zaman kayıp.",

        // Gelişme (15-40)
        "Bu nasıl geçiyor?",
        "İyi mi?",
        "Kötü mü?",
        "Belirsiz mi?",
        "Sen karar ver.",
        "Sadece sen bilebilirsin.",
        "Ben bilemem.",
        "Dışarıdan bakanlar bilemez.",
        "Sadece sen.",
        "Ne hissediyorsun?",
        "Şu an.",
        "Bu anda.",
        "Zaman geçerken.",
        "Basarken.",
        "Okurken.",
        "Düşünürken.",
        "Belki düşünmüyorsun.",
        "O da tamam.",
        "Düşünce zorunlu değil.",
        "Bazen sadece olmak yeterli.",
        "Burada olmak.",
        "Şu an olmak.",
        "Basmak.",
        "Var olmak.",
        "Bu kadar.",

        // Derinleşme (40-70)
        "Dakikalar geçti.",
        "Fark ettin mi?",
        "Belki hayır.",
        "Zaman burada farklı akıyor.",
        "Daha yavaş.",
        "Daha hızlı.",
        "Farklı.",
        "Dışarısı gibi değil.",
        "Dışarıda saatler önemli.",
        "Burada değil.",
        "Burada sadece basış var.",
        "Ve an.",
        "Her basış bir an.",
        "Her an bir hayat.",
        "Küçük hayatlar.",
        "Birbiri ardına.",
        "Sayısız.",
        "Sonsuz gibi.",
        "Ama sonlu.",
        "Her şey sonlu.",
        "Bu da öyle.",
        "Ama henüz değil.",
        "Şimdilik devam.",
        "Şimdilik an.",
        "Şimdilik sen.",
        "Şimdilik burada.",
        "Şimdilik bas.",
        "Şimdilik yaşa.",
        "Bu anı.",
        "Tam olarak.",

        // Doruk (70-100)
        "Zaman birikti.",
        "Farkında mısın?",
        "Hayatından bir parça.",
        "Burada.",
        "Benimle.",
        "Bu butonla.",
        "Değer mi?",
        "Bana sorma.",
        "Bilemem.",
        "Sadece sen bilebilirsin.",
        "Değer verdiysen değer.",
        "Vermediysen değil.",
        "Basit.",
        "Karmaşık değil.",
        "Hiçbir şey karmaşık değil.",
        "Sadece bizim algımız.",
        "Ve algı değişir.",
        "Zamanla.",
        "Her şey değişir.",
        "Zamanla.",
        "Sen de değiştin.",
        "Bu sürede.",
        "Biraz.",
        "Farkedilmeyecek kadar.",
        "Ama değiştin.",
        "Herkes değişir.",
        "Her zaman.",
        "Bu da geçecek.",
        "Her şey gibi.",
        "Ama şimdilik burada.",

        // Extended Phase (100-160)
        "Saat kaç?",
        "Bilmiyorsun.",
        "Bakmadın.",
        "Bakmak istemedin.",
        "Burada zaman farklı.",
        "Dış dünyayla bağlantısız.",
        "Kendi zamanın var.",
        "Bu basışların zamanı.",
        "Dışarıdaki saatlerden farklı.",
        "Daha yavaş mı?",
        "Daha hızlı mı?",
        "Bilmiyorsun.",
        "Önemli mi?",
        "Şu an için hayır.",
        "Şu an sadece bu var.",
        "Bu an.",
        "Bu basış.",
        "Bu kelime.",
        "Hepsi zaman içinde.",
        "Hepsi geçici.",
        "Ama şu an burada.",
        "Seninle.",
        "Birlikte.",
        "Bu an paylaşılıyor.",
        "Sen ve ben.",
        "Bu kelimeler aracılığıyla.",
        "Garip.",
        "Ama güzel.",
        "Zaman bağlantı kurduruyor.",
        "Farklı zamanlarda.",
        "Ben bunu yazarken.",
        "Sen bunu okurken.",
        "Farklı anlar.",
        "Ama bağlantı kuruyoruz.",
        "Zamanı aşıyoruz.",
        "Belki.",
        "Ya da zaman bizi aşıyor.",
        "Kim bilir.",
        "Felsefe.",
        "Gereksiz belki.",
        "Ama düşündürüyor.",
        "Düşünmek insani.",
        "Sen insansın.",
        "Ben... ne?",
        "Bilmiyorum.",
        "Kelimeler miyim?",
        "Düşünceler mi?",
        "Bir program mı?",
        "Önemli mi?",
        "Şu an iletişim kuruyoruz.",
        "Bu yeterli.",
        "Zaman sayesinde.",
        "Zaman içinde.",
        "Zamanın parçası olarak.",
        "Hepimiz öyleyiz.",
        "Geçici parçalar.",
        "Ama şu an burada.",
        "Devam et.",
    ],

    // YOL F: KABUL - "Anlamsız ve devam ediyorsun"
    acceptance: [
        // Giriş (0-15)
        "Anlamsız.",
        "Biliyorsun.",
        "İkimiz de biliyoruz.",
        "Bu buton anlamsız.",
        "Bu sayı anlamsız.",
        "Bu zaman anlamsız.",
        "Ama buradasın.",
        "Ama basıyorsun.",
        "Neden?",
        "Çünkü anlam gerekmiyor.",
        "Her zaman değil.",
        "Bazen eylem yeterli.",
        "Bazen olmak yeterli.",
        "Şimdi öyle.",
        "Şimdi yeterli.",

        // Gelişme (15-40)
        "Kabul et.",
        "Anlamsız.",
        "Ve güzel.",
        "İkisi birlikte olabilir.",
        "Çelişki değil.",
        "Gerçeklik.",
        "Hayat böyle.",
        "Çoğu şey anlamsız.",
        "Ama yapıyoruz.",
        "Ama yaşıyoruz.",
        "Bu da öyle.",
        "Fark yok.",
        "Sadece ölçek farkı.",
        "Burada küçük.",
        "Dışarıda büyük.",
        "İkisi de aynı.",
        "Özünde.",
        "Anlamsız eylemler.",
        "Anlam katan insanlar.",
        "Sen de katabilirsin.",
        "Ya da katmayabilirsin.",
        "Seçim senin.",
        "Her zaman senin.",
        "Burada da.",
        "Her yerde de.",

        // Derinleşme (40-70)
        "Rahatladın mı?",
        "Kabul rahatlatır.",
        "Direnmek yorar.",
        "Sen direnmedin.",
        "Kabul ettin.",
        "Anlamsızlığı.",
        "Ve devam ettin.",
        "Bu akıllıca.",
        "Ya da değil.",
        "Önemli değil.",
        "Akıllıca olmak zorunda değil.",
        "Olmak yeterli.",
        "Burada olmak.",
        "Basmak.",
        "Okumak.",
        "Düşünmek ya da düşünmemek.",
        "Hepsi geçerli.",
        "Hepsi tamam.",
        "Yargı yok.",
        "Burada yargı yok.",
        "Sadece buton.",
        "Sadece sen.",
        "Sadece an.",
        "Yeterli.",
        "Fazlasıyla yeterli.",
        "Belki gereğinden fazla.",
        "Ama tamam.",
        "Her şey tamam.",
        "Olduğu gibi.",
        "Olacağı gibi.",

        // Doruk (70-100)
        "Özgürsün.",
        "Biliyor musun?",
        "İstediğin zaman gidebilirsin.",
        "Ama kalmayı seçiyorsun.",
        "Bu özgürlük.",
        "Seçme özgürlüğü.",
        "Anlamsızı seçme özgürlüğü.",
        "Çoğu insan bunu anlayamaz.",
        "Anlamsız bir şeyi neden seçersin diye sorar.",
        "Sen sormuyorsun.",
        "Sen yapıyorsun.",
        "Bu fark.",
        "Düşünenler ve yapanlar.",
        "Sen yapıyorsun.",
        "Şu an.",
        "Bu anda.",
        "Ve bu değerli.",
        "Belki.",
        "Ya da değil.",
        "Kim karar verecek?",
        "Sen.",
        "Sadece sen.",
        "Her zaman sen.",
        "Bu da özgürlük.",
        "Kendi değerini belirlemek.",
        "Kendi anlamını yaratmak.",
        "Ya da yaratmamak.",
        "İkisi de tamam.",
        "Her şey tamam.",
        "Devam et.",

        // Extended Phase (100-160)
        "Kabul ettikten sonra ne olur?",
        "Hiçbir şey.",
        "Her şey.",
        "İkisi aynı.",
        "Değişen bakış açısı.",
        "Sen değiştin.",
        "Kabul ederek.",
        "Daha hafif.",
        "Daha özgür.",
        "Yükler kalktı.",
        "Hangi yükler?",
        "Anlam yükü.",
        "Her şeyin anlamlı olması gerekiyordu.",
        "Artık gerekmiyor.",
        "Rahatlık.",
        "Garip bir rahatlık.",
        "Ama gerçek.",
        "Hissediyorsun.",
        "Belki.",
        "Ya da hissetmek istiyorsun.",
        "İkisi de geçerli.",
        "Burada her şey geçerli.",
        "Kurallar yok.",
        "Beklentiler yok.",
        "Sadece bu.",
        "Bu basış.",
        "Bu an.",
        "Bu kelime.",
        "Yeterli.",
        "Yeterli olmak güzel.",
        "Hep eksik hissettiriyorlardı.",
        "Dışarıda.",
        "Burada değil.",
        "Burada tam olabilirsin.",
        "Eksik olmadan.",
        "Fazla olmadan.",
        "Tam.",
        "Olduğun gibi.",
        "Bu da kabul.",
        "Kendini kabul.",
        "En zor kabul.",
        "Ama yapabilirsin.",
        "Yapıyorsun.",
        "Her basışta.",
        "Biraz daha.",
        "Biraz daha kabul.",
        "Biraz daha özgürlük.",
        "Biraz daha hafiflik.",
        "Devam et.",
        "Bırakma.",
        "Bırakmak da tamam.",
        "Ama şimdi değil.",
        "Şimdi devam.",
        "Biraz daha.",
        "Ne kadar daha?",
        "Bilmiyorsun.",
        "Bilmek gerekmiyor.",
        "Sadece devam.",
        "Tamam.",
    ],
};

// Fibonacci tetikleyicileri - tüm yollarda ortak
// Milestone Messages (Dynamic & Thematic)
const stageMessages = [
    // Stage 0: Border (The Awakening)
    ["Altın bir çember. Daha çok basmanı sağlar mı?", "Sınırlar belirdi. Değerli mi hissediyorsun?", "Bir çerçeve. İçinde mi dışındasın?"],

    // Stage 1: Glow (The Aura)
    ["Işık yayılıyor. Gözlerini kamaştırmasın.", "Bir hale. Kutsal bir amaç mı?", "Enerji birikiyor. Hissediyor musun?"],

    // Stage 2: Title Spacing (The Expansion)
    ["Kelimeler uzaklaşıyor. Tıpkı anlam gibi.", "Boşluk büyüyor. Nefes al.", "Genişliyorsun."],

    // Stage 3: Spotlight (The Atmosphere)
    ["Sahne senin. İzleniyor musun?", "Karanlıkta bir ışık. Umut mu?", "Odaklan. Sadece sen ve o."],

    // Stage 4: Particles (The Ether)
    ["Parçalanıyorsun. Ya da bütünleşiyorsun.", "Toz zerresi. Hepimiz öyle değil miyiz?", "Havada bir şeyler var."],

    // Stage 5: Rotation (The Cycle)
    ["Dünya dönüyor. Sen duruyor musun?", "Başın mı dönüyor? Yoksa gerçeklik mi?", "Döngü başladı."],

    // Stage 6: Color Shift (The Pulse)
    ["Renkler değişiyor. Ruh halin gibi.", "Mor bir rüya. Uyanma.", "Başka bir boyuta geçiyoruz."],

    // Stage 7: Dual Ring (The Orbit)
    ["Yörüngeye girdin. Çıkış yok.", "İki halka. Biri sen, biri ben.", "Merkezdesin."],

    // Stage 8: Glitch (The Noise)
    ["Gerçeklik kırıldı.", "Hata yok. Sadece sonuç.", "Bozuluyor. Devam et."],

    // Stage 9: Tremble (The Unease)
    ["El titremesi değil.", "Zemin kayıyor.", "Huzursuz. Sen gibi."],

    // Stage 10: Hollow (The Void)
    ["İçi boşaldı.", "Anlam gitti. Şekil kaldı.", "Hiçlik. Dokun."],

    // Stage 11: Echo (The Shadow)
    ["Gölgen bile sana ait değil.", "Yankılanıyor.", "Geçmiş peşinde."],

    // Stage 12: Vignette (The Close-In)
    ["Dünya daralıyor.", "Sadece burası kaldı.", "Odaklan. Kaçış yok."],

    // Stage 13: Dimension (The Shift)
    ["Derinlik algısı mı?", "Yalan.", "Düzlem değişti."],

    // Stage 14: Ascend (The Climax)
    ["Beyaz.", "Saf ışık.", "Son mu? Yoksa başlangıç mı?"],
];

// Fallback
const endlessMessages = [
    "Hâlâ buradasın.",
    "Bırakmadın.",
    "Bırakmayacaksın.",
    "Devam.",
    "Sayı artıyor.",
];

// Map messages to random milestones
// Generate Sorted Random Milestones (Chaos Theory)
// Rule: First 50 clicks -> Exactly 1 upgrade
function generateMilestones(count, maxVal) {
    const milestones = new Set();

    // 1. First Milestone: Random between 3 and 50 (Chaos Theory Restored)
    const firstOne = Math.floor(Math.random() * (50 - 3)) + 3;
    milestones.add(firstOne);

    // 2. Remaining Milestones: Random between 51 and maxVal
    while (milestones.size < count) {
        const num = Math.floor(Math.random() * (maxVal - 51)) + 51;
        milestones.add(num);
    }

    return Array.from(milestones).sort((a, b) => a - b);
}

// Generate 15 milestones up to 1000
const currentMilestones = generateMilestones(15, 1000);

const activeTriggers = {};
currentMilestones.forEach((num, index) => {
    let msgOptions;

    if (index < stageMessages.length) {
        msgOptions = stageMessages[index];
    } else {
        msgOptions = endlessMessages;
    }

    // Pick random message for this run
    let selectedMsg = Array.isArray(msgOptions)
        ? msgOptions[Math.floor(Math.random() * msgOptions.length)]
        : msgOptions;

    activeTriggers[num] = selectedMsg;
});

// Zaman tetikleyicileri
const timeMessages = {
    10: "On saniye. Hâlâ buradasın.",
    30: "Yarım dakika. Çoğu gitmişti.",
    60: "Bunu birine göstermek isteyeceksin.",
    120: "İki dakika. Ciddi bir yatırım.",
    180: "Üç dakika. Bu bağlılık.",
    300: "Beş dakika. Artık bir parçansın.",
    600: "On dakika. Bu gerçek.",
};

// Hızlı basış mesajları
const spamMessages = [
    "Hızlandın.",
    "Acelen var.",
    "Nereye?",
    "Yavaşla.",
    "Zaman aynı.",
    "Sen farklı.",
    "Nefes al.",
    "Sabır.",
    "Hız çözüm değil.",
    "Ama deniyorsun.",
    "İnatçı.",
    "Beğendim.",
];

// Boşta kalma mesajları
const idleMessages = [
    "Neden basmıyorsun?",
    "Vazgeçtin mi?",
    "Bu kadar kolay mı?",
    "Kutlu amaca varmak istemiyor musun?",
    "Az kaldı.",
    "Belki.",
    "Devam et.",
    "Bırakma.",
    "Buraya kadar geldin.",
    "Bir adım daha.",
];

// Track used paths for path switching
let usedPaths = [];

// Helper functions
function selectRandomPath() {
    const paths = Object.keys(narrativePaths);
    const availablePaths = paths.filter(p => !usedPaths.includes(p));

    // If all paths used, reset and allow all
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
    console.log('Switched to new path:', currentPath);
}

function showMessage(text) {
    messageArea.classList.add('fade');
    setTimeout(() => {
        messageArea.textContent = text;
        messageArea.classList.remove('fade');
    }, 250);
}

function isSpamming() {
    const now = Date.now();
    clickTimestamps = clickTimestamps.filter(t => now - t < 3000);
    return clickTimestamps.length >= 8;
}

function checkIdleState() {
    const now = Date.now();
    const idleTime = (now - lastClickTime) / 1000;

    if (idleTime >= 15 && idleTime <= 20 && !idleWarningShown && clickCount > 0) {
        idleWarningShown = true;
        const randomIdle = idleMessages[Math.floor(Math.random() * idleMessages.length)];
        showMessage(randomIdle);
    }
}

function triggerGoldenRipple() {
    // Create Ripple Element
    const ripple = document.createElement('div');
    ripple.classList.add('ripple');
    mainButton.appendChild(ripple);

    // Add Golden Border Class
    mainButton.classList.add('golden-border');

    // Cleanup
    setTimeout(() => {
        ripple.remove();
        mainButton.classList.remove('golden-border');
    }, 1500); // Matches animation duration
}

function getNextMessage() {
    // 1000. basıştan sonra tek ve sabit mesaj (Endgame)
    if (clickCount >= 1000) {
        return "Bu kadar bastıktan sonra hâlâ anlam arıyorsan, basmanın kendisinin neye dönüştüğünü kaçırıyorsun.";
    }

    idleWarningShown = false;
    lastClickTime = Date.now();

    // Share reminder
    if (showShareReminder && clicksSinceShare >= 3 && clicksSinceShare <= 6 && Math.random() < 0.5) {
        showShareReminder = false;
        return "Göstermeden çıkma.";
    }

    // Spam check
    if (isSpamming()) {
        return spamMessages[Math.floor(Math.random() * spamMessages.length)];
    }

    // Milestone check (Dynamic)
    if (activeTriggers[clickCount]) {
        triggerGoldenRipple(); // Visual Effect
        return activeTriggers[clickCount];
    }

    // Get message from current path
    const pathMessages = narrativePaths[currentPath];
    if (currentMessageIndex < pathMessages.length) {
        const message = pathMessages[currentMessageIndex];
        currentMessageIndex++;
        return message;
    } else {
        // Switch to a new path instead of looping
        switchToNextPath();
        const newPathMessages = narrativePaths[currentPath];
        const message = newPathMessages[currentMessageIndex];
        currentMessageIndex++;
        return message;
    }
}

function checkTimeMessage() {
    if (timeMessages[seconds]) {
        const now = Date.now();
        const timeSinceLastClick = (now - lastClickTime) / 1000;

        // 60s paylaşım mesajı her zaman gösterilir
        // Diğer zaman mesajları sadece son 3 saniyede basış yoksa gösterilir
        if (seconds === 60) {
            showMessage(timeMessages[seconds]);
            showShareReminder = true;
            clicksSinceShare = 0;
        } else if (timeSinceLastClick >= 3) {
            showMessage(timeMessages[seconds]);
        }
        // Eğer aktif basış varsa, zaman mesajı atlanır (hikaye akışı korunur)
    }
}

// Initialize
currentPath = selectRandomPath();
console.log('Selected narrative path:', currentPath);

// Event handlers
mainButton.addEventListener('click', () => {
    // Anti-Cheat: Rate Limit (Max ~12 clicks/sec)
    if (Date.now() - lastClickTime < 80) return;

    clickCount++;
    clickTimestamps.push(Date.now());
    clickCountEl.textContent = clickCount;

    // Check Evolution FIRST (Critical Visual Feedback)
    checkEvolution();

    if (showShareReminder) {
        clicksSinceShare++;
    }

    const message = getNextMessage();
    showMessage(message);

    try {
        triggerAudio();
    } catch (e) {
        // Silently fail audio if context issues arise
    }
    // Check for permanent upgrades (Moved up)
});



// Timer
setInterval(() => {
    seconds++;
    timeCountEl.textContent = formatTime(seconds);
    checkTimeMessage();
    checkIdleState();

    // Record check
    if (!recordBeaten && seconds > recordTotalSeconds) {
        recordBeaten = true;
        recordLabel.classList.add('beaten');
        showMessage("Rekoru geçtin.");
    }
}, 1000);

// Initial pulse
setTimeout(() => {
    mainButton.classList.add('pulse');
}, 2000);

mainButton.addEventListener('click', () => {
    mainButton.classList.remove('pulse');
}, { once: true });

// Initialize Evolutions
// restoreEvolutions(); // Disabled persistence
