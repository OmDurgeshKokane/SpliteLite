import { init3DScene } from './3d-scene.js';
import { initAnimations } from './animations.js';
import { AudioManager } from './audio.js';
import { initChatbot } from './chatbot.js';
import { initMobileMenu } from './mobile_nav.js';
import { initCursor } from './cursor.js';
import { initTilt } from './tilt.js';
import { initScramble } from './scramble.js';
import { CONFIG } from './config.js';

// --- State Management ---
let state = {
    friends: [],
    expenses: [],
    ownerEmail: null
};

const audioInfo = {
    manager: new AudioManager()
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    init3DScene();
    initAnimations();
    setupEventListeners();
    updateUI();
    setupSoundToggle();

    injectModal();
    injectSettleModal();
    injectVerificationModal();
    initChatbot();
    initMobileMenu();

    // Premium UI Init
    initCursor();
    initTilt();
    initScramble();
});

function loadData() {
    const storedFriends = localStorage.getItem('splitLite_friends');
    const storedExpenses = localStorage.getItem('splitLite_expenses');
    const storedOwner = localStorage.getItem('splitLite_owner');

    if (storedFriends) state.friends = JSON.parse(storedFriends);
    if (storedExpenses) state.expenses = JSON.parse(storedExpenses);
    if (storedOwner) state.ownerEmail = storedOwner;
}

function saveData() {
    localStorage.setItem('splitLite_friends', JSON.stringify(state.friends));
    localStorage.setItem('splitLite_expenses', JSON.stringify(state.expenses));
    if (state.ownerEmail) localStorage.setItem('splitLite_owner', state.ownerEmail);
    updateUI();
}

function setupSoundToggle() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    const btn = document.createElement('button');
    btn.className = 'icon-btn';
    btn.id = 'sound-toggle'; // Fixed ID for mobile menu to find
    btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';

    // Attempt to start immediately (might be blocked by browser)
    if (audioInfo.manager.enabled) {
        audioInfo.manager.ctx.resume().then(() => {
            audioInfo.manager.startAmbient();
        }).catch(() => {
            // If blocked, wait for interaction
            const startAudio = () => {
                if (audioInfo.manager.enabled) {
                    audioInfo.manager.ctx.resume().then(() => {
                        audioInfo.manager.startAmbient();
                    });
                }
                document.removeEventListener('click', startAudio);
            };
            document.addEventListener('click', startAudio);
        });
    }

    btn.onclick = (e) => {
        e.stopPropagation();
        const enabled = audioInfo.manager.toggle();
        // Update icon based on state
        btn.innerHTML = enabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';

        if (enabled) {
            audioInfo.manager.play('click');
            showToast('Music Playing 🎵', 'success');
        } else {
            showToast('Music Paused 🔇', 'info');
        }
    };
    navLinks.appendChild(btn);
}

function injectModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'confirm-modal';
    modal.innerHTML = `
        <div class="modal-content glass">
            <h3>Are you sure?</h3>
            <p style="margin:1rem 0; color:var(--text-light)">This action will delete all data permanently. It cannot be undone.</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button class="btn btn-primary" style="background:var(--danger)" id="modal-confirm">Delete All</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showConfirmModal(onConfirm) {
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('active');
    audioInfo.manager.play('hover');

    const handleConfirm = () => {
        onConfirm();
        closeModal();
    };

    const closeModal = () => {
        modal.classList.remove('active');
        document.getElementById('modal-confirm').removeEventListener('click', handleConfirm);
        document.getElementById('modal-cancel').removeEventListener('click', closeModal);
    };

    // Clean up old listeners just in case
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    const newConfirm = confirmBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newConfirm.addEventListener('click', handleConfirm);
    newCancel.addEventListener('click', closeModal);
}

// --- Core Logic ---

function addFriend(name, email) {
    const newFriend = {
        id: Date.now().toString(),
        name: name,
        email: email,
        avatar: getInitials(name)
    };

    // First user becomes the Master Owner
    if (state.friends.length === 0) {
        state.ownerEmail = email;
    }

    state.friends.push(newFriend);
    audioInfo.manager.play('success');
    showToast(`Friend ${name} added!`, 'success');
    saveData();
}

function addExpense(desc, amount, payerId, splitWithIds) {
    const expense = {
        id: Date.now().toString(),
        desc,
        amount: parseFloat(amount),
        payerId,
        splitWithIds,
        date: new Date().toISOString()
    };
    state.expenses.push(expense);
    audioInfo.manager.play('success');
    showToast('Expense added successfully!', 'success');
    saveData();
}



function injectSettleModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'settle-modal';
    modal.innerHTML = `
        <div class="modal-content glass">
            <h3>Settle & Delete</h3>
            <p style="margin:1rem 0; color:var(--text-light)">This friend has active expenses. To verify they've settled up, please upload payment receipt.</p>
            
            <div class="file-upload-wrapper">
                <label class="file-upload-label">Payment Verification (Screenshot Only)</label>
                <input type="file" id="receipt-upload" accept="image/*" required>
            </div>

            <div class="modal-actions">
                <button class="btn btn-secondary" id="settle-cancel">Cancel</button>
                <button class="btn btn-primary" id="settle-confirm">Settle & Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showSettleModal(friendId, onConfirm) {
    const modal = document.getElementById('settle-modal');
    if (!modal) injectSettleModal();
    const modalEl = document.getElementById('settle-modal');
    const confirmBtn = document.getElementById('settle-confirm');
    const cancelBtn = document.getElementById('settle-cancel');
    const fileInput = document.getElementById('receipt-upload');
    const title = modalEl.querySelector('h3');
    const desc = modalEl.querySelector('p');

    // Reset State
    modalEl.classList.add('active');
    audioInfo.manager.play('hover');
    fileInput.value = '';
    confirmBtn.innerHTML = 'Verify & Settle';
    confirmBtn.disabled = false;
    title.textContent = 'Settle & Delete';
    desc.textContent = 'This friend has active expenses. Upload a payment receipt (Image only).';
    fileInput.parentElement.style.display = 'block';

    const handleConfirm = async () => {
        if (fileInput.files.length === 0) {
            audioInfo.manager.play('delete');
            showToast('Please upload a screenshot first.', 'error');
            return;
        }

        const file = fileInput.files[0];

        // Start Analysis
        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
        confirmBtn.disabled = true;
        title.textContent = 'Analyzing Receipt...';
        desc.textContent = 'Checking for payment details (Amount, Success, UPI, etc.)';
        audioInfo.manager.play('click');

        try {
            const { data: { text } } = await Tesseract.recognize(file, 'eng', { logger: m => console.log(m) });
            const lowerText = text.toLowerCase();

            // Validation Keywords
            const keywords = ['paid', 'success', 'successful', 'transaction', 'upi', 'phonepe', 'gpay', 'paytm', 'amount', '₹', 'rupee', 'sent', 'received', 'transfer'];

            // Check if at least 2 keywords match for robustness
            const matches = keywords.filter(word => lowerText.includes(word));

            if (matches.length >= 2) {
                // Success
                audioInfo.manager.play('success');
                showToast('Receipt Verified! Settling debts...', 'success');
                setTimeout(() => {
                    onConfirm();
                    closeModal();
                }, 1000);
            } else {
                // Failed Verification
                audioInfo.manager.play('delete');
                title.textContent = 'Verification Failed';
                desc.innerHTML = `<span style="color:var(--danger)">Could not detect clear payment details.</span><br>Found: ${matches.length > 0 ? matches.join(', ') : 'No keywords'}. Try a clearer screenshot.`;
                confirmBtn.innerHTML = 'Retry Upload';
                confirmBtn.disabled = false;
            }

        } catch (err) {
            console.error(err);
            audioInfo.manager.play('delete');
            showToast('Error analyzing image. Try another one.', 'error');
            confirmBtn.innerHTML = 'Retry';
            confirmBtn.disabled = false;
        }
    };

    const closeModal = () => {
        modalEl.classList.remove('active');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', closeModal);
    };

    // Clean listeners
    const newConfirm = confirmBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newConfirm.addEventListener('click', handleConfirm);
    newCancel.addEventListener('click', closeModal);
}

function removeFriend(id) {
    const involved = state.expenses.some(e => e.payerId === id || e.splitWithIds.includes(id));

    // Helper to actually remove
    const executeRemoval = () => {
        state.friends = state.friends.filter(f => f.id !== id);
        audioInfo.manager.play('delete');
        showToast('Friend settled and removed.', 'success');
        saveData();
    };

    if (involved) {
        // Show Settle Modal
        showSettleModal(id, () => {
            // Logic to adjust expenses
            state.expenses = state.expenses.filter(exp => {
                // 1. If Friend was Payer:
                // Assuming "Settled" means we can treat this expense as cleared/archived.
                // We will REMOVE it so debts to this friend are gone.
                if (exp.payerId === id) return false;

                // 2. If Friend was in Split:
                if (exp.splitWithIds.includes(id)) {
                    const originalCount = exp.splitWithIds.length;
                    const share = exp.amount / originalCount;

                    // Reduce amount by their share
                    exp.amount -= share;
                    // Remove from split list
                    exp.splitWithIds = exp.splitWithIds.filter(uid => uid !== id);

                    // If no one left to split with, remove expense
                    if (exp.splitWithIds.length === 0) return false;
                }
                return true;
            });

            executeRemoval();
        });
        return;
    }

    executeRemoval();
}



function injectVerificationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'verify-modal';
    modal.innerHTML = `
        <div class="modal-content glass">
            <h3>Owner Verification</h3>
            <p style="margin:1rem 0; color:var(--text-light)" id="verify-msg">Enter your email to receive a verification code.</p>
            
            <div class="form-group" id="email-step">
                <input type="email" id="verify-email" placeholder="owner@example.com" required>
            </div>

            <div class="form-group hidden" id="otp-step">
                <input type="text" id="verify-otp" placeholder="Enter 6-digit Code" maxlength="6" style="text-align:center; letter-spacing: 5px; font-weight:bold;">
            </div>

            <div class="modal-actions">
                <button class="btn btn-secondary" id="verify-cancel">Cancel</button>
                <button class="btn btn-primary" id="verify-confirm">Send Code</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// --- Config ---
const EMAILJS_CONFIG = CONFIG.EMAILJS;

// Initialize EmailJS
(function () {
    if (window.emailjs) emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
})();

function startOwnerVerification(onSuccess, targetData = null) {
    const modal = document.getElementById('verify-modal');
    if (!modal) injectVerificationModal();
    const modalEl = document.getElementById('verify-modal');

    // Elements
    const emailInput = document.getElementById('verify-email');
    const otpInput = document.getElementById('verify-otp');
    const emailStep = document.getElementById('email-step');
    const otpStep = document.getElementById('otp-step');
    const confirmBtn = document.getElementById('verify-confirm');
    const cancelBtn = document.getElementById('verify-cancel');
    const msg = document.getElementById('verify-msg');

    // Reset State
    modalEl.classList.add('active');
    audioInfo.manager.play('hover');
    emailInput.value = '';
    otpInput.value = '';
    emailStep.classList.remove('hidden');
    otpStep.classList.add('hidden');
    confirmBtn.textContent = 'Send Code';

    // Payer Logic
    if (targetData) {
        msg.innerHTML = `Security Check: <strong>${targetData.name}</strong> paid for this.<br>Enter their registered email to verify.`;
        if (targetData.email) {
            emailInput.value = targetData.email;
            emailInput.disabled = true; // Lock it
            emailInput.style.opacity = '0.7';
        } else {
            emailInput.disabled = false;
            emailInput.placeholder = `Enter email for ${targetData.name}`;
        }
    } else {
        msg.textContent = 'Enter your email to receive a verification code.';
        emailInput.disabled = false;
    }


    let generatedCode = null;

    const handleAction = () => {
        if (!generatedCode) {
            // STEP 1: SEND CODE
            const email = emailInput.value.trim().toLowerCase();

            if (!email.includes('@') || !email.includes('.')) {
                audioInfo.manager.play('delete');
                showToast('Invalid Email Address', 'error');
                return;
            }

            // If Payer had no email, we should probably save this one now? 
            // For now, let's just proceed with verification.

            // Real Email Sending
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending Email...';

            generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

            const templateParams = {
                to_email: email,
                user_email: email,
                reply_to: email,
                email: email,

                // Code Variables
                passcode: generatedCode,
                otp_code: generatedCode,
                message: generatedCode,
                one_time_password: generatedCode,
                otp: generatedCode,
                code: generatedCode,
                time: new Date().toLocaleString()
            };

            emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, templateParams)
                .then(() => {
                    audioInfo.manager.play('success');
                    showToast('📧 Code sent to Payer!', 'success');

                    // Switch UI
                    emailStep.classList.add('hidden');
                    otpStep.classList.remove('hidden');
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Verify Identity';
                    msg.textContent = `Type the code sent to ${email}`;
                    otpInput.focus();
                })
                .catch((error) => {
                    console.error('EmailJS Error:', error);
                    audioInfo.manager.play('delete');

                    // Show specific error to user
                    const errorMsg = error.text || error.message || 'Unknown Network Error';
                    alert(`Email Failed: ${errorMsg}\n\nPlease check your keys and template variables.`);
                    showToast(`Error: ${errorMsg}`, 'error');

                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = 'Retry Send';
                    generatedCode = null;
                });

        } else {
            // STEP 2: VERIFY CODE
            if (otpInput.value === generatedCode) {
                audioInfo.manager.play('success');
                showToast('Identity Verified! Deleting...', 'success');

                // Update friend email if it was missing?
                if (targetData && !targetData.email) {
                    const friend = state.friends.find(f => f.id === targetData.id);
                    if (friend) {
                        friend.email = emailInput.value.trim().toLowerCase();
                        saveData();
                    }
                }

                closeModal();
                onSuccess();
            } else {
                audioInfo.manager.play('delete');
                showToast('Invalid Code. Please try again.', 'error');
                otpInput.value = '';
                otpInput.focus();
            }
        }
    };

    const closeModal = () => {
        modalEl.classList.remove('active');
        confirmBtn.removeEventListener('click', handleAction);
        cancelBtn.removeEventListener('click', closeModal);
        // Reset styles
        emailInput.disabled = false;
        emailInput.style.opacity = '1';
    };

    // Clean listeners
    const newConfirm = confirmBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newConfirm.addEventListener('click', handleAction);
    newCancel.addEventListener('click', closeModal);
}

function removeExpense(id) {
    const expense = state.expenses.find(e => e.id === id);
    if (!expense) return;

    const payer = state.friends.find(f => f.id === expense.payerId);
    if (!payer) {
        // Fallback if payer deleted
        removeExpenseDirect(id);
        return;
    }

    // Require Payer verification
    startOwnerVerification(() => {
        state.expenses = state.expenses.filter(e => e.id !== id);
        audioInfo.manager.play('delete');
        showToast('Expense securely deleted.', 'success');
        saveData();
    }, { id: payer.id, name: payer.name, email: payer.email });
}

function removeExpenseDirect(id) {
    state.expenses = state.expenses.filter(e => e.id !== id);
    audioInfo.manager.play('delete');
    showToast('Expense deleted.', 'success');
    saveData();
}

function calculateDebts() {
    let balances = {};

    state.friends.forEach(f => balances[f.id] = 0);

    state.expenses.forEach(exp => {
        const amount = exp.amount;
        const payer = exp.payerId;
        const splitters = exp.splitWithIds;

        const splitAmount = amount / splitters.length;

        if (balances[payer] !== undefined) {
            balances[payer] += amount;
        }

        splitters.forEach(id => {
            if (balances[id] !== undefined) {
                balances[id] -= splitAmount;
            }
        });
    });

    let debtors = [];
    let creditors = [];

    for (const [id, amount] of Object.entries(balances)) {
        if (amount < -0.01) debtors.push({ id, amount });
        if (amount > 0.01) creditors.push({ id, amount });
    }

    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let transactions = [];

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        let debtor = debtors[i];
        let creditor = creditors[j];

        let amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        transactions.push({
            from: debtor.id,
            to: creditor.id,
            amount: amount
        });

        debtor.amount += amount;
        creditor.amount -= amount;

        if (Math.abs(debtor.amount) < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return { total: calculateTotalExpenses(), transactions, balances };
}

function calculateTotalExpenses() {
    return state.expenses.reduce((acc, curr) => acc + curr.amount, 0);
}

// --- UI Rendering ---

function updateUI() {
    renderFriendsList();
    renderExpenseList();
    renderDropdowns();
    renderDashboard();
}

function renderFriendsList() {
    const list = document.getElementById('friends-list');
    list.innerHTML = '';

    state.friends.forEach(friend => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="friend-avatar">${friend.avatar}</div>
            <div class="item-info">
                <strong>${friend.name}</strong>
            </div>
            <div class="item-actions">
                <button onclick="window.deleteFriend('${friend.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

function renderExpenseList() {
    const list = document.getElementById('expenses-list');
    list.innerHTML = '';

    [...state.expenses].reverse().forEach(exp => {
        const payer = state.friends.find(f => f.id === exp.payerId)?.name || 'Unknown';
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="item-info">
                <div style="font-weight:600">${exp.desc}</div>
                <div style="font-size:0.85rem; color: var(--text-light)">
                    ₹${exp.amount.toFixed(2)} paid by ${payer}
                </div>
            </div>
            <div class="item-actions">
                <button onclick="window.deleteExpense('${exp.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

function renderDropdowns() {
    const payerSelect = document.getElementById('payer-select');
    const splitSelect = document.getElementById('split-select');

    const currentPayer = payerSelect.value;

    payerSelect.innerHTML = '<option value="">Select Payer</option>';
    splitSelect.innerHTML = '';

    state.friends.forEach(f => {
        const opt1 = document.createElement('option');
        opt1.value = f.id;
        opt1.textContent = f.name;
        payerSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = f.id;
        opt2.textContent = f.name;
        opt2.selected = true;
        splitSelect.appendChild(opt2);
    });

    if (currentPayer) payerSelect.value = currentPayer;
}

function renderDashboard() {
    const { total, transactions } = calculateDebts();

    document.getElementById('total-expenses').textContent = `₹${total.toFixed(2)}`;

    const debtsList = document.getElementById('debts-list');
    debtsList.innerHTML = '';

    if (transactions.length === 0) {
        debtsList.innerHTML = '<div class="empty-state">All settled up! No debts.</div>';
        return;
    }

    transactions.forEach(t => {
        const fromName = state.friends.find(f => f.id === t.from)?.name || 'Unknown';
        const toName = state.friends.find(f => f.id === t.to)?.name || 'Unknown';

        const div = document.createElement('div');
        div.className = 'list-item glass';
        div.style.marginBottom = '0.5rem';
        div.innerHTML = `
            <div class="item-info" style="display:flex; align-items:center; gap:0.5rem">
                <span style="font-weight:600; color:var(--danger)">${fromName}</span>
                <span style="font-size:0.9rem">owes</span>
                <span style="font-weight:600; color:var(--success)">${toName}</span>
            </div>
            <div style="font-weight:700; font-size:1.1rem">₹${t.amount.toFixed(2)}</div>
        `;
        debtsList.appendChild(div);
    });
}

// --- Event Listeners ---

function setupEventListeners() {
    // Navigation
    document.querySelector('.cta-btn').addEventListener('click', () => {
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
        audioInfo.manager.play('click');
    });

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        audioInfo.manager.play('click');

        const isDark = document.body.classList.contains('dark-mode');
        const icon = themeBtn.querySelector('i');

        if (isDark) {
            icon.classList.replace('fa-moon', 'fa-sun');
            showToast('Dark Mode Enabled 🌙', 'success');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            showToast('Light Mode Enabled ☀️', 'success');
        }
    });

    // Add Friend
    document.getElementById('add-friend-btn').addEventListener('click', () => {
        audioInfo.manager.play('click');
        const form = document.getElementById('friend-form');
        form.style.display = form.style.display === 'block' ? 'none' : 'block';
        if (form.style.display === 'block') document.getElementById('friend-name').focus();
    });

    document.getElementById('friend-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('friend-name');
        const emailInput = document.getElementById('friend-email');

        if (nameInput.value.trim() && emailInput.value.trim()) {
            addFriend(nameInput.value.trim(), emailInput.value.trim().toLowerCase());
            nameInput.value = '';
            emailInput.value = '';
            document.getElementById('friend-form').style.display = 'none';
        }
    });

    // Add Expense
    document.getElementById('add-expense-btn').addEventListener('click', () => {
        audioInfo.manager.play('click');
        const form = document.getElementById('expense-form');
        form.style.display = form.style.display === 'block' ? 'none' : 'block';
    });

    document.getElementById('expense-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const desc = document.getElementById('expense-desc').value;
        const amount = document.getElementById('expense-amount').value;
        const payer = document.getElementById('payer-select').value;

        const splitSelect = document.getElementById('split-select');
        const splitters = Array.from(splitSelect.selectedOptions).map(opt => opt.value);

        if (!payer || splitters.length === 0) {
            audioInfo.manager.play('delete'); // Error sound
            showToast('Please select a payer and who to split with.', 'error');
            return;
        }

        addExpense(desc, amount, payer, splitters);

        // Reset form
        document.getElementById('expense-desc').value = '';
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-form').style.display = 'none';
    });

    // Reset All
    // Reset All
    document.getElementById('reset-data-btn').addEventListener('click', () => {
        const executeReset = () => {
            showConfirmModal(() => {
                localStorage.clear();
                state.friends = [];
                state.expenses = [];
                state.ownerEmail = null; // Clear owner too
                updateUI();
                audioInfo.manager.play('delete');
                showToast('All data reset.', 'success');
            });
        };

        if (state.ownerEmail) {
            // Require Owner Verification
            startOwnerVerification(() => {
                executeReset();
            }, { name: 'Owner', email: state.ownerEmail });
        } else {
            // No owner set, allow reset (or could force setup)
            executeReset();
        }
    });

    // Delegated Global Functions
    window.deleteFriend = removeFriend;
    window.deleteExpense = removeExpense;
}

// --- Helpers ---

function getInitials(name) {
    return name.slice(0, 2).toUpperCase();
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
        background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
        color: white;
        padding: 1rem 2rem;
        margin-bottom: 1rem;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        opacity: 0;
        transform: translateY(20px);
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2000;
        font-weight: 600;
    `;
    container.appendChild(toast);

    gsap.to(toast, { opacity: 1, y: 0, duration: 0.3 });
    gsap.to(toast, { opacity: 0, y: 20, duration: 0.3, delay: 3, onComplete: () => toast.remove() });
}
