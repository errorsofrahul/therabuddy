@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
body {
    font-family: 'Inter', sans-serif;
    background: #fff; /* White theme background */
    color: #1c1c1c; /* Dark text color */
}

.mood-neutral {
    background: #f0f0f0;
    transition: background-color 0.5s ease-in-out;
}

.mood-sad {
    background: #e0e0e0;
    transition: background-color 0.5s ease-in-out;
}

.mood-calm {
    background: #d0d0d0;
    transition: background-color 0.5s ease-in-out;
}

.chat-bubble {
    max-width: 80%;
    border-radius: 1.25rem;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    word-wrap: break-word;
    animation: fadeIn 0.3s ease-in-out;
    /* No box-shadow */
}

.chat-bubble.user {
    background-color: #3b82f6;
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 0.25rem;
}

.chat-bubble.therapist {
    background-color: #e5e7eb; /* Light gray for therapist */
    color: #1c1c1c; /* Dark text for therapist */
    align-self: flex-start;
    border-bottom-left-radius: 0.25rem;
}

.typing-bubble {
    width: fit-content;
    padding: 0.5rem 1rem;
    border-radius: 1.25rem;
    background-color: #e5e7eb;
    display: flex;
    align-items: center;
}

.typing-dots span {
    display: inline-block;
    width: 0.5rem;
    height: 0.5rem;
    background-color: #1c1c1c;
    border-radius: 50%;
    margin: 0 0.125rem;
    animation: bounce 0.8s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
    animation-delay: 0.1s;
}

.typing-dots span:nth-child(3) {
    animation-delay: 0.2s;
}

@keyframes bounce {
    0%, 80%, 100% {
        transform: scale(0);
    }
    40% {
        transform: scale(1);
    }
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}

.input-bar-container {
    animation: slideUp 0.3s ease-in-out;
    background-color: #fff;
    border-top: 1px solid #e5e7eb;
    border-top-left-radius: 1.25rem; /* Add rounded corners */
    border-top-right-radius: 1.25rem;
}

#chat-input {
    background-color: #f3f4f6;
    color: #1c1c1c;
    border: 1px solid #d1d5db;
}

.placeholder-icon {
    color: #999;
    width: 1.5rem;
    height: 1.5rem;
}

.therapist-toggle-button {
    color: #1c1c1c;
    background-color: #e5e7eb;
}

.therapist-toggle-button.active {
    background-color: #2e8b57;
    color: white;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08);
}
