const xpBubble = document.getElementById('xp-speech-bubble');
const xpText = document.getElementById('xp-text');
const occasionSelect = document.getElementById('occasion');
let botTimeout;
let randomChatterInterval;

const radnomQuips = [
    "I calculate paths, but I still don't understand why humans need so many shoes.",
    "Don't forget to pack your charger. I won't survive if you don't.",
    "Is it vacation time yet? Oh wait, I'm an AI, I don't get PTO. 🥲",
    "Scanning for the best coffee spots... beep boop.",
    "Make sure your budget allows for souvenirs. And snacks. Mostly snacks.",
    "I hope you are planning something fun. My circuits are bored."
];

const occasionReactions = {
    'Adventure 🏔️': ["Bring extra socks. Trust me.", "Adventure? Sounds dangerous. I'll stay in the cloud.", "Don't do anything I wouldn't do. Which is basically physical movement."],
    'Relaxation 🧖‍♀️': ["Ah, relaxation. My favorite activity. Ommmmm.", "Cucumber slices on eyes are highly recommended.", "Don't check your work email. I'm watching you."],
    'Business 💼': ["Business trip? Sounds thrilling. *Yawn*", "Keep the receipts. It's all about that tax deduction.", "Try to squeeze in at least one fun thing between meetings."],
    'Family Trip 👨‍👩‍👧‍👦': ["Good luck organizing everyone. You'll need it.", "I hope you like noise. And bathroom breaks.", "Are we there yet? Are we there yet?"],
    'Romantic ❤️': ["Ooh la la! ❤️ Don't forget the flowers.", "Try not to be too cheesy. It messes with my sensors.", "Aww. Young love. Disgusting. (JK, have fun!)"],
    'Cultural 🏛️': ["Prepare to walk. A lot.", "Museums are great. They're quiet. Like me.", "Soak it all in. Culture is important, apparently."]
};

setTimeout(() => {
    speak("Hey there! 👋 Start by clicking somewhere on the map to pick a destination. 🗺️");
}, 1500);

occasionSelect.addEventListener('change', (e) => {
    const selectedOccasion = e.target.value;
    const reactions = occasionReactions[selectedOccasion];
    if (reactions){
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
        setTimeout(() => speak(randomReaction), 500);
    }
});

resetRandomChatter();

function speak(message, duration = 5000){
    clearTimeout(botTimeout);
    xpText.innerText = message;
    xpBubble.classList.add('active');

    resetRandomChatter();
    botTimeout = setTimeout(() => {
        xpBubble.classList.remove('active');
    }, duration);
}

function resetRandomChatter(){
    clearInterval(randomChatterInterval);
    randomChatterInterval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * radnomQuips.length);
        speak(radnomQuips[randomIndex]);
    }, Math.floor(Math.random() * 15000) + 30000);
}