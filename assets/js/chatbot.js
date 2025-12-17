import { AudioManager } from './audio.js';
import { CONFIG } from './config.js';

const KEY = CONFIG.GEMINI_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`;
const MODELS_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`;

const SYSTEM_PROMPT = `
You are SplitBot, the intelligent support assistant for the 'SplitLite' web app.
Your goal is to help users understand and use the application.

APP KNOWLEDGE BASE:
1. **Core Function**: Splits expenses between friends. No backend, data is saved in browser (LocalStorage).
2. **Adding Friends**: Click 'Add' in Friends section. You must provide an Email for security.
3. **Adding Expenses**: Click 'Add' in Expenses section. Select Payer and who to split with.
4. **Deleting Data**: 
   - **Secure Deletion**: To delete an expense, YOU MUST identify as the Payer.
   - **Verification**: The system sends a 6-digit OTP to the Payer's email (via EmailJS). You must enter this code.
5. **Settling Debts**: 
   - If a friend owes money, you can't just delete them.
   - Click Delete -> **Upload Receipt**. 
   - The system scans the image (OCR) for words like "Paid", "UPI", "₹". If valid, it settles the debt.
6. **Visuals**: A 3D Spinning Gold Coin in the header (Three.js).
7. **Audio**: Immersive Nature sounds (Birds/Wind). Toggle via the Volume icon top-right.
8. **About Us**: A dedicated page featuring the founder **Om Kokane**.
   - **Mission**: "Calculated Friendships" - using math to save relationships.
   - **Founder**: Om Kokane is the Lead Engineer and Visionary behind SplitLite.
   - **Tech**: Built with passion using Three.js, GSAP, and Google Gemini.

BEHAVIOR:
- Keep answers concise (under 3 sentences if possible).
- Be friendly and professional.
- Use emojis occasionally.
- If asked about things outside the app (like "What is the capital of France?"), politely decline: "I can only help with SplitLite features."
`;

export function initChatbot() {
    injectChatUI();
    setupChatEvents();
}

function injectChatUI() {
    const html = `
    <!-- Floating Button -->
    <button id="chat-fab" class="chat-fab">
        <i class="fa-solid fa-robot"></i>
    </button>

    <!-- Chat Window -->
    <div id="chat-window" class="chat-window glass hidden">
        <div class="chat-header">
            <div class="header-info">
                <i class="fa-solid fa-bolt" style="color:var(--primary)"></i>
                <span>SplitBot AI</span>
            </div>
            <button id="chat-close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        
        <div id="chat-messages" class="chat-messages">
            <div class="message bot">
                Hi! 👋 I'm SplitBot. I can help you with splitting bills, verifying expenses, or fixing errors. Ask me anything!
            </div>
        </div>

        <div class="chat-input-area">
            <input type="text" id="chat-input" placeholder="Type your question..." autocomplete="off">
            <button id="chat-send"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function setupChatEvents() {
    const fab = document.getElementById('chat-fab');
    const window = document.getElementById('chat-window');
    const close = document.getElementById('chat-close');
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');
    const msgs = document.getElementById('chat-messages');

    // Toggle
    const toggle = () => {
        window.classList.toggle('hidden');
        if (!window.classList.contains('hidden')) {
            input.focus();
            // Scroll to bottom
            msgs.scrollTop = msgs.scrollHeight;
        }
    };

    fab.addEventListener('click', toggle);
    close.addEventListener('click', toggle);

    // Send logic
    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;

        // User Message
        appendMessage('user', text);
        input.value = '';

        // Loading State (Create distinct element)
        const loadingId = `loading-${Date.now()}`;
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot loading-msg';
        loadingDiv.id = loadingId;
        loadingDiv.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Thinking...';
        msgs.appendChild(loadingDiv);
        msgs.scrollTop = msgs.scrollHeight;

        try {
            const response = await callGemini(text);

            // Remove Loader
            const loader = document.getElementById(loadingId);
            if (loader) loader.remove();

            // Append Real Response
            const responseDiv = document.createElement('div');
            responseDiv.className = 'message bot';
            responseDiv.innerHTML = marked.parse(response);
            msgs.appendChild(responseDiv);
            msgs.scrollTop = msgs.scrollHeight;

        } catch (error) {
            // Remove Loader
            const loader = document.getElementById(loadingId);
            if (loader) loader.remove();

            appendMessage('bot', `⚠️ **Error:** ${error.message}`);
            console.error(error);
        }
    };

    send.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function appendMessage(role, text) {
    const msgs = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.id = `msg-${Date.now()}`;
    div.innerHTML = text; // Safe here as we generate content
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div.id;
}

function updateMessage(id, newText) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = marked.parse(newText); // Use marked for formatting if available, else plain
    const msgs = document.getElementById('chat-messages');
    msgs.scrollTop = msgs.scrollHeight;
}

async function callGemini(userPrompt) {
    const payload = {
        contents: [{
            parts: [
                { text: SYSTEM_PROMPT + `\n\nUser Question: ${userPrompt}` }
            ]
        }]
    };

    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
        if (res.status === 404) {
            // Try to help debug by listing models
            const models = await listModels();
            throw new Error(`Model Not Found. Available Models:\n${models}`);
        }
        const errMsg = data.error?.message || 'Unknown API Error';
        throw new Error(`Google AI Error (${res.status}): ${errMsg}`);
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('No response candidates returned.');
    }

    return data.candidates[0].content.parts[0].text;
}

async function listModels() {
    try {
        const res = await fetch(MODELS_URL);
        const data = await res.json();
        if (data.models) {
            return data.models.map(m => `- \`${m.name.replace('models/', '')}\``).join('\n');
        }
        return 'Could not list models.';
    } catch (e) {
        return 'Network Error listing models.';
    }
}
