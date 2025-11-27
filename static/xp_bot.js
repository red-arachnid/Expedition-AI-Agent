const xpBubble = document.getElementById('xp-speech-bubble');
const xpText = document.getElementById('xp-text');
const xPBotWrapper = document.querySelector('.xp-drone-wrapper');
const xpFacePlate = document.querySelector('.xp-face-plate');
const occasionSelect = document.getElementById('occasion');
let botTimeout;
let eyeTimeout;
let randomChatterInterval;

let chatter = {
    clicks: ["Hello?"],
    loading: ["Thinking..."],
    success: ["Done!"],
    error: ["Error!"],
    input_errors: {},
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

function setEyeState(state){
    xpFacePlate.classList.remove('error-mode', 'confused-mode', 'happy-mode', 'thinking-mode');
    clearTimeout(eyeTimeout);

    if (state !== 'normal'){
        xpFacePlate.classList.add(`${state}-mode`);
    }
    if (state === 'confused') {
        eyeTimeout = setTimeout(() => setEyeState('normal'), 1500);
    }
}

function xpSpeak(message, duration = 4000, type = 'normal'){
    clearTimeout(botTimeout);

    const xpText = document.getElementById('xp-text');
    const xpBubble = document.getElementById('xp-speech-bubble');

    xpText.innerText = message;

    if (type === 'error'){
        xpBubble.classList.add('error-mode');
        setEyeState('error');
        eyeTimeout = setTimeout(() => setEyeState('normal'), duration);
    } else {
        xpBubble.classList.remove('error-mode');
    }
    xpBubble.classList.add('active');

    xPBotWrapper.style.animation = 'none';
    xPBotWrapper.offsetHeight;
    xPBotWrapper.style.animation = 'droneFloat 0.5s ease-in-out';

    botTimeout = setTimeout(() => {
        xpBubble.classList.remove('active');
        setTimeout(() => xpBubble.classList.remove('error-mode'), 300);
        xPBotWrapper.style.animation = 'droneFloat 3s ease-in-out infinite';
    }, duration);
}

function xpLocationError(){
    let msgs = chatter.input_errors.locating_error;
    if (!msgs || msgs.length === 0) msgs = ["Where are you going?"];
    let msg = msgs[Math.floor(Math.random() * msgs.length)];
    xpSpeak(msg, 4000, 'error');
}

function xpOcean(){
    let msgs = chatter.input_errors.ocean_error;
    if (!msgs || msgs.length === 0) msgs = ["Where are you going?"];
    let msg = msgs[Math.floor(Math.random() * msgs.length)];
    xpSpeak(msg, 4000, 'error');
}

function xpFormError(input_error_type = "missing_field"){
    if (chatter.input_errors[input_error_type]){
        const msgs = chatter.input_errors[input_error_type];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        xpSpeak(msg, 5000, 'error');
    }
    else {
        const msgs = chatter.input_errors.missing_field;
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        xpSpeak(msg, 5000, 'error');
    }
}

occasionSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    const key = Object.keys(chatter.occasions).find(k => val.includes(k));

    if (key && chatter.occasions[key]){
        const msgs = chatter.occasions[key];
        xpSpeak(msgs[Math.floor(Math.random() * msgs.length)]);
        setEyeState('happy');
        eyeTimeout = setTimeout(() => setEyeState('normal'), 2000);
    }
});

function startLoadingChatter() {
    setEyeState('thinking');
    let msgs = chatter.loading || ["Thinking..."];

    xpSpeak(msgs[Math.floor(Math.random() * msgs.length)]);

    loadingInterval = setInterval(() => {
        xpSpeak(msgs[Math.floor(Math.random() * msgs.length)]);
    }, 3000);
}

function stopLoadingChatter(isSuccess) {
    clearInterval(loadingInterval);
    if(isSuccess) {
        setEyeState('happy');
        const msgs = chatter.success;
        xpSpeak(msgs[Math.floor(Math.random() * msgs.length)], 8000); 
        eyeTimeout = setTimeout(() => setEyeState('normal'), 6000);
    } else {
        setEyeState('error');
        const msgs = chatter.error;
        xpSpeak(msgs[Math.floor(Math.random() * msgs.length)]);
        xpSpeak(msgs[Math.floor(Math.random() * msgs.length)], 5000, 'error');
    }
}

function botClick(){
    setEyeState('confused');
    const msg = chatter.clicks[Math.floor(Math.random() * chatter.clicks.length)];
    xpSpeak(msg);
}

setTimeout(() => xpSpeak("I am online! Click the map to start."), 500);