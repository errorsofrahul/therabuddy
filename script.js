import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai@latest/dist/index.mjs";

// IMPORTANT: Replace with your actual Gemini API key for your local development.
// For a production app, use a server-side solution to keep your API key secure.
const API_KEY = "AIzaSyAjXxSJ26GYyFJrWwfWzOpWvKey41FXD48";

// Gemini API SDK
const genAI = new GoogleGenerativeAI(API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

// Use a default Firebase config for local development
const firebaseConfig = {
    apiKey: "AIzaSyCYttaWDAR6OdY-zW3OeRMTdsuPaL7vEBw",
    authDomain: "therabuddy-3f3f3.firebaseapp.com",
    projectId: "therabuddy-3f3f3",
    storageBucket: "therabuddy-3f3f3.firebasestorage.app",
    messagingSenderId: "863951301768",
    appId: "1:863951301768:web:b844b04beb6ade9758433d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userId = null;
let sessionId = crypto.randomUUID();

const chatInput = document.getElementById("chat-input");
const chatContainer = document.getElementById("chat-container");
const therapistAvatar = document.getElementById("therapist-avatar");
const ethanToggle = document.getElementById("ethan-toggle");
const eliToggle = document.getElementById("eli-toggle");
const typingIndicator = document.getElementById("typing-indicator");
const typingAvatar = document.getElementById("typing-avatar");
const crisisModal = document.getElementById("crisis-modal");
const closeCrisisModal = document.getElementById("close-crisis-modal");
const cameraIcon = document.getElementById("camera-icon");
const microphoneIcon = document.getElementById("microphone-icon");
const newChatButton = document.getElementById("new-chat-button");
const imageInput = document.createElement('input');
imageInput.type = 'file';
imageInput.accept = 'image/*';
imageInput.style.display = 'none';
document.body.appendChild(imageInput);

const initialAvatarAndText = document.querySelector('main div:first-child');
const initialHeading = document.querySelector('main h2');
const initialParagraph = document.querySelector('main p');

let currentTherapist = 'Ethan';
let isListening = false;
let recognition = null;
const appId = "default-app-id";

// Wait for Firebase to be initialized and authenticated
onAuthStateChanged(auth, user => {
    if (user) {
        userId = user.uid;
        console.log("Signed in anonymously. User ID:", userId);
        setupFirestoreListener();
    } else {
        signInAnonymously(auth).catch((error) => {
            console.error("Error signing in anonymously:", error);
        });
    }
});

if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        microphoneIcon.style.color = 'green';
        console.log("Listening...");
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        chatInput.value = transcript;
        microphoneIcon.style.color = '#999';
        isListening = false;
        console.log("Transcript:", transcript);
    };

    recognition.onerror = (event) => {
        isListening = false;
        microphoneIcon.style.color = '#999';
        console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
        isListening = false;
        microphoneIcon.style.color = '#999';
        console.log("Recognition ended.");
    };
} else {
    console.warn("Web Speech API not supported in this browser.");
    microphoneIcon.style.display = 'none';
}

microphoneIcon.addEventListener('click', () => {
    if (recognition) {
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    } else {
        alert("Web Speech API is not supported in your browser.");
    }
});

function setupFirestoreListener() {
    if (!userId) {
        console.error("User ID not available for Firestore listener.");
        return;
    }
    const messagesRef = collection(db, `artifacts/${appId}/users/${userId}/sessions/${sessionId}/messages`);
    const q = query(messagesRef, orderBy('timestamp'));

    onSnapshot(q, (snapshot) => {
        let changes = snapshot.docChanges();
        changes.forEach((change) => {
            if (change.type === 'added') {
                const message = change.doc.data();
                displayMessage(message);
            }
        });
    }, (error) => {
        console.error("Error listening to Firestore:", error);
    });
}

// Handle sending messages
chatInput.addEventListener("keypress", async (e) => {
    if (e.key === 'Enter' && chatInput.value.trim() !== '') {
        const messageText = chatInput.value.trim();
        chatInput.value = '';

        // Display user message in the chat
        displayUserMessage({ text: messageText });

        // Check for mood and crisis words
        updateMoodUI(messageText);
        const crisisWords = ['suicidal', 'kill myself', 'end my life', 'want to die'];
        const hasCrisisWord = crisisWords.some(word => messageText.toLowerCase().includes(word));
        if (hasCrisisWord) {
            crisisModal.classList.remove('hidden');
            return;
        }

        // Show typing indicator
        if (initialAvatarAndText) {
            initialAvatarAndText.classList.add('hidden');
        }
        chatContainer.classList.remove('hidden');
        typingIndicator.classList.remove('hidden');
        
        // Fetch AI response
        await fetchAIResponse(messageText, currentTherapist);
    }
});

cameraIcon.addEventListener('click', () => {
    imageInput.click();
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Data = reader.result.split(',')[1];
            const imageMimeType = file.type;
            
            // Display user's image message
            displayUserMessage({ image: reader.result });
            
            const textPrompt = prompt("What would you like to ask about this image?");

            if (textPrompt) {
                // Display the text prompt
                displayUserMessage({ text: textPrompt });

                // Show typing indicator
                if (initialAvatarAndText) {
                    initialAvatarAndText.classList.add('hidden');
                }
                chatContainer.classList.remove('hidden');
                typingIndicator.classList.remove('hidden');
                
                await fetchAIResponse(textPrompt, currentTherapist, { inlineData: { data: base64Data, mimeType: imageMimeType } });
            }
        };
        reader.readAsDataURL(file);
    }
});

async function fetchAIResponse(messageText, therapistName, imageData = null) {
    let rolePrompt = "";
    if (therapistName === 'Ethan') {
        rolePrompt = "You are Ethan, a calm, empathetic male therapist who gives practical advice. Use clear paragraph spacing between ideas. Remove asterisks (*) completely. Make key questions/prompts bold instead of using symbols. Keep tone warm, professional, and easy to read. Example: Instead of: * What's been on your mind most today, or this week? * Write: What's been on your mind most today, or this week? Provide advice that is actionable.";
    } else if (therapistName === 'Eli') {
        rolePrompt = "You are Eli, a warm, empathetic female therapist who gives emotional support. Use clear paragraph spacing between ideas. Remove asterisks (*) completely. Make key questions/prompts bold instead of using symbols. Keep tone warm, professional, and easy to read. Example: Instead of: * What's been on your mind most today, or this week? * Write: What's been on your mind most today, or this week? Use supportive and kind language.";
    }
    
    let contents = [];
    contents.push({ role: "user", parts: [{ text: `${rolePrompt}\n\nUser: ${messageText}` }] });
    if (imageData) {
        contents[0].parts.push(imageData);
    }

    try {
        const result = await geminiModel.generateContent({ contents: contents });
        const response = result.response;
        const text = response.text();

        typingIndicator.classList.add('hidden');

        const messagesRef = collection(db, `artifacts/${appId}/users/${userId}/sessions/${sessionId}/messages`);
        await addDoc(messagesRef, {
            sender: 'therapist',
            text: text,
            timestamp: serverTimestamp()
        }).catch(error => {
            console.error("Error adding therapist message to Firestore:", error);
        });

    } catch (error) {
        console.error("Error fetching AI response:", error);
        typingIndicator.classList.add('hidden');
        displayErrorMessage("Sorry, I'm having trouble connecting right now. Please try again later.");
    }
}

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-bubble', 'animate-fadeIn');

    if (message.sender === 'user') {
        messageDiv.classList.add('user', 'self-end');
        if (message.text) {
             messageDiv.textContent = message.text;
        }
        if (message.image) {
             const img = document.createElement('img');
             img.src = message.image;
             img.classList.add('w-full', 'max-w-xs', 'rounded-lg', 'mt-2', 'shadow-md');
             messageDiv.appendChild(img);
        }
        chatContainer.appendChild(messageDiv);
    } else if (message.sender === 'therapist') {
        const bubbleContainer = document.createElement('div');
        bubbleContainer.classList.add('flex', 'items-start', 'space-x-2');
        
        const avatar = document.createElement('img');
        avatar.src = currentTherapist === 'Ethan' ? 'https://ik.imagekit.io/7huiqzccy/ChatGPT%20Image%20Aug%2030,%202025,%2003_54_08%20PM.png?updatedAt=1756566519328' : 'https://ik.imagekit.io/7huiqzccy/ChatGPT%20Image%20Aug%2030,%202025,%2003_35_03%20PM.png?updatedAt=1756566519443';
        avatar.classList.add('w-8', 'h-8', 'rounded-full', 'self-end');

        const messageBubble = document.createElement('div');
        messageBubble.classList.add('chat-bubble', 'therapist', 'self-start');
        
        const formattedText = message.text
                                 .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                 .replace(/\n\s*\n/g, '<br><br>');
        messageBubble.innerHTML = formattedText;
        
        bubbleContainer.appendChild(avatar);
        bubbleContainer.appendChild(messageBubble);
        chatContainer.appendChild(bubbleContainer);
    }

    const mainArea = document.querySelector("main");
    mainArea.scrollTo({
        top: mainArea.scrollHeight,
        behavior: "smooth"
    });
}

function displayErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('chat-bubble', 'therapist', 'self-start');
    errorDiv.textContent = message;
    chatContainer.appendChild(errorDiv);
    
    const mainArea = document.querySelector("main");
    mainArea.scrollTo({
        top: mainArea.scrollHeight,
        behavior: "smooth"
    });
}

function updateMoodUI(messageText) {
    const body = document.body;
    const sadWords = ['sad', 'depressed', 'stressed', 'anxious', 'lonely', 'unhappy'];
    const calmWords = ['calm', 'peaceful', 'relaxed', 'happy', 'good'];
    const lowerCaseMessage = messageText.toLowerCase();

    body.classList.remove('mood-neutral', 'mood-sad', 'mood-calm');

    if (sadWords.some(word => lowerCaseMessage.includes(word))) {
        body.classList.add('mood-sad');
    } else if (calmWords.some(word => lowerCaseMessage.includes(word))) {
        body.classList.add('mood-calm');
    } else {
        body.classList.add('mood-neutral');
    }
}

function displayUserMessage(message) {
    if (initialAvatarAndText) {
        initialAvatarAndText.classList.add('hidden');
    }
    chatContainer.classList.remove('hidden');

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-bubble', 'user', 'self-end', 'animate-fadeIn');

    if (message.text) {
        messageDiv.textContent = message.text;
    }
    
    if (message.image) {
        const img = document.createElement('img');
        img.src = message.image;
        img.classList.add('w-full', 'max-w-xs', 'rounded-lg', 'mt-2', 'shadow-md');
        messageDiv.appendChild(img);
    }

    chatContainer.appendChild(messageDiv);

    const mainArea = document.querySelector("main");
    mainArea.scrollTo({
        top: mainArea.scrollHeight,
        behavior: "smooth"
    });
}

// Therapist selection
ethanToggle.addEventListener('click', () => selectTherapist('Ethan'));
eliToggle.addEventListener('click', () => selectTherapist('Eli'));

function selectTherapist(therapist) {
    currentTherapist = therapist;
    if (therapist === 'Ethan') {
        therapistAvatar.src = 'https://ik.imagekit.io/7huiqzccy/ChatGPT%20Image%20Aug%2030,%202025,%2003_54_08%20PM.png?updatedAt=1756566519328';
        typingAvatar.src = 'https://ik.imagekit.io/7huiqzccy/ChatGPT%20Image%20Aug%2030,%202025,%2003_54_08%20PM.png?updatedAt=1756566519328';
        ethanToggle.classList.add('active');
        eliToggle.classList.remove('active');
        if (initialHeading) {
            initialHeading.textContent = "Hi there! I'm Ethan.";
        }
    } else {
        therapistAvatar.src = 'https://ik.imagekit.io/7huiqzccy/ChatGPT%20Image%20Aug%2030,%202025,%2003_35_03%20PM.png?updatedAt=1756566519443';
        typingAvatar.src = 'https://ik.imagekit.io/7huiqzccy/ChatGPT%20Image%20Aug%2030,%202025,%2003_35_03%20PM.png?updatedAt=1756566519443';
        eliToggle.classList.add('active');
        ethanToggle.classList.remove('active');
        if (initialHeading) {
            initialHeading.textContent = "Hi there! I'm Eli.";
        }
    }
    console.log("Therapist switched to:", currentTherapist);
}

// Close crisis modal
closeCrisisModal.addEventListener('click', () => {
    crisisModal.classList.add('hidden');
});

// Start a new chat
newChatButton.addEventListener('click', () => {
    startNewChat();
});

function startNewChat() {
    // Clear all messages from the chat container
    chatContainer.innerHTML = '';
    
    // Generate a new session ID
    sessionId = crypto.randomUUID();
    console.log("Starting new chat. New session ID:", sessionId);
    
    // Show the initial avatar and text
    if (initialAvatarAndText) {
        initialAvatarAndText.classList.remove('hidden');
    }
    chatContainer.classList.add('hidden');
}
