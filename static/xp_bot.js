/**
 * XP BOT CONTROLLER
 * Handles the behavior, animations, and speech of the AI companion (XP Bot).
 * It fetches dialogue from a JSON file and reacts to user actions.
 */

// DOM Elements
const xpBubble = document.getElementById('xp-speech-bubble');
const xpText = document.getElementById('xp-text');
const xPBotWrapper = document.querySelector('.xp-drone-wrapper');
const xpFacePlate = document.querySelector('.xp-face-plate');
const occasionSelect = document.getElementById('occasion');

// State Timers
let botTimeout;
let eyeTimeout;
let randomChatterInterval;

// Default Chatter Data (Fallback if JSON fails to load)
let chatter = {
    clicks: ["Hello?"],
    loading: ["Thinking..."],
    success: ["Done!"],
    error: ["Error!"],
    input_errors: {},
    occasions: {}
}

/**
 * Load Chatter Data
 * - Fetches the 'xp_bot_chatter.json' file which contains all the 
 * witty responses and error messages.
 */
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

/**
 * Visual State Management
 * - Changes the bot's eye expression (CSS classes) based on events.
 * - States: 'normal', 'happy', 'confused', 'error', 'thinking'
 */
function setEyeState(state){
    // Reset all states
    xpFacePlate.classList.remove('error-mode', 'confused-mode', 'happy-mode', 'thinking-mode');
    clearTimeout(eyeTimeout);

    // Apply new state
    if (state !== 'normal'){
        xpFacePlate.classList.add(`${state}-mode`);
    }
    // Auto-revert 'confused' look after 1.5s
    if (state === 'confused') {
        eyeTimeout = setTimeout(() => setEyeState('normal'), 1500);
    }
}

/**
 * Speech Bubble Logic
 * - Displays a message in the bubble and handles animation triggers.
 * @param {string} message - Text to display
 * @param {number} duration - How long bubble stays visible (ms)
 * @param {string} type - 'normal' or 'error' (changes bubble color)
 */
function xpSpeak(message, duration = 4000, type = 'normal'){
    clearTimeout(botTimeout);

    const xpText = document.getElementById('xp-text');
    const xpBubble = document.getElementById('xp-speech-bubble');

    xpText.innerText = message;

    // Red bubble for errors
    if (type === 'error'){
        xpBubble.classList.add('error-mode');
        setEyeState('error');
        eyeTimeout = setTimeout(() => setEyeState('normal'), duration);
    } else {
        xpBubble.classList.remove('error-mode');
    }

    // Trigger CSS Animation (Pop in)
    xpBubble.classList.add('active');

    // Reset Drone Bobbing Animation to sync with speech
    xPBotWrapper.style.animation = 'none';
    xPBotWrapper.offsetHeight;
    xPBotWrapper.style.animation = 'droneFloat 0.5s ease-in-out';

    // Hide bubble after duration
    botTimeout = setTimeout(() => {
        xpBubble.classList.remove('active');
        setTimeout(() => xpBubble.classList.remove('error-mode'), 300);
        xPBotWrapper.style.animation = 'droneFloat 3s ease-in-out infinite';
    }, duration);
}

//? --- SPECIFIC EVENT TRIGGERS ---

// Triggered when user selects a non-location (like "Unknown Location")
function xpLocationError(){
    let msgs = chatter.input_errors.locating_error;
    if (!msgs || msgs.length === 0) msgs = ["Where are you going?"];
    let msg = msgs[Math.floor(Math.random() * msgs.length)];
    xpSpeak(msg, 4000, 'error');
}

// Triggered when user selects an Ocean or Sea
function xpOcean(){
    let msgs = chatter.input_errors.ocean_error;
    if (!msgs || msgs.length === 0) msgs = ["Where are you going?"];
    let msg = msgs[Math.floor(Math.random() * msgs.length)];
    xpSpeak(msg, 4000, 'error');
}

// Triggered when form fields are missing or invalid
function xpFormError(input_error_type = "missing_field"){
    if (chatter.input_errors[input_error_type]){
        const msgs = chatter.input_errors[input_error_type];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        xpSpeak(msg, 5000, 'error');
    }
    else {
        // Fallback generic error
        const msgs = chatter.input_errors.missing_field;
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        xpSpeak(msg, 5000, 'error');
    }
}

// Triggered when user changes the "Occasion" dropdown
occasionSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    // Find matching key in JSON (e.g., "Adventure" matches "Adventure 🏔️")
    const key = Object.keys(chatter.occasions).find(k => val.includes(k));

    if (key && chatter.occasions[key]){
        const msgs = chatter.occasions[key];
        xpSpeak(msgs[Math.floor(Math.random() * msgs.length)]);
        setEyeState('happy');
        eyeTimeout = setTimeout(() => setEyeState('normal'), 2000);
    }
});

//? --- LOADING STATE LOOP ---
let loadingInterval;

function startLoadingChatter() {
    setEyeState('thinking');
    let msgs = chatter.loading || ["Thinking..."];

    // Say one immediately
    xpSpeak(msgs[Math.floor(Math.random() * msgs.length)]);

    // Loop new messages every 4 seconds while loading
    loadingInterval = setInterval(() => {
        xpSpeak(msgs[Math.floor(Math.random() * msgs.length)]);
    }, 4000);
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

// Triggered when clicking the bot itself
function botClick(){
    setEyeState('confused');
    const msg = chatter.clicks[Math.floor(Math.random() * chatter.clicks.length)];
    xpSpeak(msg);
}

// Initial Greeting
setTimeout(() => xpSpeak("I am online! Click the map to start."), 500);