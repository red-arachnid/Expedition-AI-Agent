const xpBubble = document.getElementById('xp-speech-bubble');
const xpText = document.getElementById('xp-text');
const xpTv = document.querySelector('.xp-tv');
const occasionSelect = document.getElementById('occasion');
let botTimeout;
let randomChatterInterval;

let chatter = {
    clicks: ["Hello?"],
    loading: ["Thinking..."],
    success: ["Done!"],
    error: ["Error!"],
    occasions: {}
} //Default data if could not retreive json

async function loadChatter(){
    try {
        const response = await fetch('static/xp_bot_chatter.json');
        if (response.ok){
            chatter = await response.json();
        }
        else {
            console.warn("Could not load XP chatter data.");
        }
    } catch (e){
        console.error("Failed to load chatter:", e);
    }
}
loadChatter();

function xpSpeak(message, duration = 4000){
    clearTimeout(botTimeout);
    xpText.innerText = message;
    xpBubble.classList.add('active');

    xpTv.style.animation = 'none';
    xpTv.offsetHeight;
    xpTv.style.animation = 'tvBounce 0.5s ease-in-out';

    botTimeout = setTimeout(() => {
        xpBubble.classList.remove('active');
        xpTv.style.animation = 'tvBounce 3s ease-in-out infinite';
    }, duration);
}

occasionSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    const key = Object.keys(chatter.occasions).find(k => val.includes(k));

    if (key && chatter.occasions[key]){
        const msgs = chatter.occasions[key];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        xpSpeak(msg);
    }
});

function startLoadingChatter() {
    let msgs = chatter.loading;
    if (!msgs || msgs.length === 0) msgs = ["Thinking..."];

    let msg = msgs[Math.floor(Math.random() * msgs.length)];
    xpSpeak(msg);

    loadingInterval = setInterval(() => {
        let msg = msgs[Math.floor(Math.random() * msgs.length)];
        xpSpeak(msg);
    }, 3000);
}

function stopLoadingChatter(isSuccess) {
    clearInterval(loadingInterval);
    if(isSuccess) {
        const msgs = chatter.success;
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        xpSpeak(msg, 8000); 
    } else {
        const msgs = chatter.error;
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        xpSpeak(msg);
    }
}

function botClick(){
    const msg = chatter.clicks[Math.floor(Math.random() * chatter.clicks.length)];
    xpSpeak(msg);
}

setTimeout(() => xpSpeak("I am online! Click the map to start."), 500);