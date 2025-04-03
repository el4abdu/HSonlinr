/**
 * Shadow Heist Online - In-game Chat System
 * Modern chat functionality for team coordination and social features
 */

// Chat Module
const ShadowHeistChat = (function() {
    // Chat types
    const CHAT_TYPE = {
        TEAM: 'team',
        LOBBY: 'lobby',
        GLOBAL: 'global',
        PRIVATE: 'private',
        SYSTEM: 'system'
    };
    
    // Chat restrictions based on game state
    const CHAT_RESTRICTIONS = {
        DEAD: {
            canChatWith: ['DEAD'],
            canReadFrom: ['ALL']
        },
        TRAITOR: {
            canChatWith: ['ALL'],
            canReadFrom: ['ALL']
        },
        DETECTIVE: {
            canChatWith: ['ALIVE'],
            canReadFrom: ['ALIVE']
        }
    };
    
    // Message colors
    const MESSAGE_COLORS = {
        SYSTEM: '#ffcc00',
        ERROR: '#ff3333',
        TEAM: '#33cc33',
        PRIVATE: '#cc33cc',
        DEAD: '#888888',
        GLOBAL: '#ffffff'
    };
    
    // Elements
    let elements = {
        chatContainer: null,
        chatMessages: null,
        chatInput: null,
        chatSend: null,
        chatTypeSelector: null,
        chatTargetSelector: null,
        unreadBadge: null,
        chatToggle: null,
        emoteButton: null,
        emoteMenu: null
    };
    
    // State
    let currentChatType = CHAT_TYPE.TEAM;
    let currentChatTarget = null;
    let chatHistory = {};
    let unreadMessages = 0;
    let isMinimized = false;
    let userRole = null;
    let isDead = false;
    let mutedPlayers = [];
    let emotes = [];
    let socket = null;
    
    /**
     * Initialize chat module
     */
    function init() {
        // Cache elements
        cacheElements();
        
        // Initialize chat history storage
        initChatHistory();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize emotes
        initEmotes();
        
        // Setup socket connection (or hook into existing)
        setupSocketConnection();
        
        // Listen for game state changes
        listenForGameStateChanges();
    }
    
    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements.chatContainer = document.getElementById('chat-container');
        elements.chatMessages = document.getElementById('chat-messages');
        elements.chatInput = document.getElementById('chat-input');
        elements.chatSend = document.getElementById('chat-send');
        elements.chatTypeSelector = document.getElementById('chat-type-selector');
        elements.chatTargetSelector = document.getElementById('chat-target-selector');
        elements.unreadBadge = document.getElementById('chat-unread-badge');
        elements.chatToggle = document.getElementById('chat-toggle');
        elements.emoteButton = document.getElementById('emote-button');
        elements.emoteMenu = document.getElementById('emote-menu');
    }
    
    /**
     * Initialize chat history object
     */
    function initChatHistory() {
        // Create separate history for each chat type
        Object.values(CHAT_TYPE).forEach(type => {
            chatHistory[type] = [];
        });
        
        // Private chat history indexed by user ID
        chatHistory.privateUsers = {};
    }
    
    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Send message
        if (elements.chatSend) {
            elements.chatSend.addEventListener('click', sendMessage);
        }
        
        // Send message on Enter
        if (elements.chatInput) {
            elements.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }
        
        // Change chat type
        if (elements.chatTypeSelector) {
            elements.chatTypeSelector.addEventListener('change', (e) => {
                switchChatType(e.target.value);
            });
        }
        
        // Change chat target for private messages
        if (elements.chatTargetSelector) {
            elements.chatTargetSelector.addEventListener('change', (e) => {
                currentChatTarget = e.target.value;
                
                // Load appropriate history
                if (currentChatType === CHAT_TYPE.PRIVATE && currentChatTarget) {
                    loadChatHistory(CHAT_TYPE.PRIVATE, currentChatTarget);
                }
            });
        }
        
        // Toggle chat minimize/maximize
        if (elements.chatToggle) {
            elements.chatToggle.addEventListener('click', toggleChat);
        }
        
        // Mark as read when clicked
        if (elements.chatContainer) {
            elements.chatContainer.addEventListener('click', markAsRead);
        }
        
        // Emote button
        if (elements.emoteButton) {
            elements.emoteButton.addEventListener('click', toggleEmoteMenu);
        }
        
        // Close emote menu when clicking outside
        document.addEventListener('click', (e) => {
            if (elements.emoteMenu && elements.emoteMenu.classList.contains('active') && 
                !elements.emoteMenu.contains(e.target) && 
                !elements.emoteButton.contains(e.target)) {
                elements.emoteMenu.classList.remove('active');
            }
        });
    }
    
    /**
     * Initialize emotes
     */
    function initEmotes() {
        // Standard emotes
        emotes = [
            { id: 'smile', text: ':)', img: 'smile.png' },
            { id: 'sad', text: ':(', img: 'sad.png' },
            { id: 'laugh', text: ':D', img: 'laugh.png' },
            { id: 'wink', text: ';)', img: 'wink.png' },
            { id: 'shock', text: ':o', img: 'shock.png' },
            { id: 'cool', text: '8)', img: 'cool.png' },
            { id: 'angry', text: '>:(', img: 'angry.png' },
            { id: 'think', text: ':/', img: 'think.png' },
            { id: 'heart', text: '<3', img: 'heart.png' },
            { id: 'skull', text: '☠️', img: 'skull.png' },
            { id: 'silence', text: '🤫', img: 'silence.png' },
            { id: 'spy', text: '🕵️', img: 'spy.png' }
        ];
        
        // Create emote menu if it exists
        if (elements.emoteMenu) {
            emotes.forEach(emote => {
                const emoteElement = document.createElement('div');
                emoteElement.className = 'emote-item';
                
                // If image exists, use it, otherwise use text
                if (emote.img) {
                    emoteElement.innerHTML = `<img src="public/assets/emotes/${emote.img}" alt="${emote.id}" title="${emote.id}">`;
                } else {
                    emoteElement.textContent = emote.text;
                }
                
                emoteElement.addEventListener('click', () => {
                    insertEmote(emote.text);
                    elements.emoteMenu.classList.remove('active');
                });
                
                elements.emoteMenu.appendChild(emoteElement);
            });
        }
    }
    
    /**
     * Set up socket connection for chat
     */
    function setupSocketConnection() {
        // Check if socket already exists from sessions module
        if (window.ShadowHeistSessions && window.ShadowHeistSessions.getSocket) {
            socket = window.ShadowHeistSessions.getSocket();
        } else {
            // Create new socket connection or simulation
            // For now, we'll simulate socket behavior
            socket = {
                connected: false,
                eventListeners: {},
                
                connect: function() {
                    console.log('Connecting to chat server...');
                    setTimeout(() => {
                        this.connected = true;
                        this.emit('connect');
                        console.log('Connected to chat server');
                        
                        // Simulate welcome message
                        this.emit('chat_message', {
                            type: CHAT_TYPE.SYSTEM,
                            sender: 'System',
                            message: 'Welcome to Shadow Heist chat! Communication is key to success.',
                            timestamp: Date.now()
                        });
                    }, 1000);
                },
                
                on: function(event, callback) {
                    if (!this.eventListeners[event]) {
                        this.eventListeners[event] = [];
                    }
                    this.eventListeners[event].push(callback);
                },
                
                emit: function(event, data) {
                    if (this.eventListeners[event]) {
                        this.eventListeners[event].forEach(callback => callback(data));
                    }
                },
                
                send: function(event, data) {
                    console.log(`Sending ${event}:`, data);
                    
                    // Simulate server response for chat messages
                    if (event === 'chat_message') {
                        // Echo the message back as if it came from the server
                        setTimeout(() => {
                            this.emit('chat_message', {
                                ...data,
                                timestamp: Date.now(),
                                messageId: 'msg_' + Math.random().toString(36).substr(2, 9)
                            });
                        }, 300);
                    }
                }
            };
            
            // Connect to chat server
            socket.connect();
        }
        
        // Set up chat socket event listeners
        socket.on('chat_message', handleIncomingMessage);
        
        socket.on('user_muted', (data) => {
            mutedPlayers.push(data.userId);
            addSystemMessage(`${data.username} has been muted.`);
        });
        
        socket.on('user_unmuted', (data) => {
            mutedPlayers = mutedPlayers.filter(id => id !== data.userId);
            addSystemMessage(`${data.username} has been unmuted.`);
        });
        
        socket.on('chat_cleared', () => {
            clearChat();
            addSystemMessage('Chat has been cleared by a moderator.');
        });
    }
    
    /**
     * Listen for game state changes
     */
    function listenForGameStateChanges() {
        // Listen for player death
        document.addEventListener('player_died', (e) => {
            setPlayerDead(true);
        });
        
        // Listen for role assignment
        document.addEventListener('role_assigned', (e) => {
            setPlayerRole(e.detail.role);
        });
        
        // Listen for game phase changes
        document.addEventListener('game_phase_changed', (e) => {
            updateChatForGamePhase(e.detail.phase);
        });
        
        // Listen for game restart
        document.addEventListener('game_restart', () => {
            resetChatState();
        });
    }
    
    /**
     * Handle incoming chat message
     * @param {Object} messageData - Message data object
     */
    function handleIncomingMessage(messageData) {
        // Check if sender is muted
        if (messageData.senderId && mutedPlayers.includes(messageData.senderId)) {
            return;
        }
        
        // Check if message passes chat restrictions
        if (!canReadMessage(messageData)) {
            return;
        }
        
        // Add to appropriate history
        if (messageData.type === CHAT_TYPE.PRIVATE) {
            // For private messages, store by user ID
            const userId = messageData.senderId === getCurrentUserId() ? 
                messageData.targetId : messageData.senderId;
                
            if (!chatHistory.privateUsers[userId]) {
                chatHistory.privateUsers[userId] = [];
            }
            chatHistory.privateUsers[userId].push(messageData);
            
            // If this is the current chat view, display it
            if (currentChatType === CHAT_TYPE.PRIVATE && currentChatTarget === userId) {
                displayMessage(messageData);
            } else {
                incrementUnread();
            }
        } else {
            // For other chat types, store by type
            chatHistory[messageData.type].push(messageData);
            
            // If this is the current chat view, display it
            if (currentChatType === messageData.type) {
                displayMessage(messageData);
            } else {
                incrementUnread();
            }
        }
    }
    
    /**
     * Send a chat message
     */
    function sendMessage() {
        if (!elements.chatInput) return;
        
        const messageText = elements.chatInput.value.trim();
        if (!messageText) return;
        
        // Check if player can currently chat
        if (!canSendMessages()) {
            addSystemMessage('You cannot send messages at this time.', MESSAGE_COLORS.ERROR);
            return;
        }
        
        // Apply chat restrictions based on player state
        if (!canSendMessageOfType(currentChatType)) {
            addSystemMessage(`You cannot send ${currentChatType} messages in your current state.`, MESSAGE_COLORS.ERROR);
            return;
        }
        
        // Create message object
        const messageData = {
            type: currentChatType,
            message: messageText,
            sender: getCurrentUsername(),
            senderId: getCurrentUserId(),
            timestamp: Date.now()
        };
        
        // Add target for private messages
        if (currentChatType === CHAT_TYPE.PRIVATE) {
            if (!currentChatTarget) {
                addSystemMessage('Please select a recipient for your private message.', MESSAGE_COLORS.ERROR);
                return;
            }
            messageData.targetId = currentChatTarget;
        }
        
        // Send message through socket
        if (socket && socket.connected) {
            socket.send('chat_message', messageData);
            
            // Clear input
            elements.chatInput.value = '';
        } else {
            addSystemMessage('Not connected to chat server. Please refresh the page.', MESSAGE_COLORS.ERROR);
        }
    }
    
    /**
     * Display a message in the chat window
     * @param {Object} messageData - Message data object
     */
    function displayMessage(messageData) {
        if (!elements.chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${messageData.type}`;
        if (messageData.senderId === getCurrentUserId()) {
            messageElement.classList.add('self');
        }
        
        // Format timestamp
        const timestamp = new Date(messageData.timestamp);
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Add sender name with appropriate styling
        let senderDisplay = '';
        if (messageData.type !== CHAT_TYPE.SYSTEM) {
            let senderName = messageData.sender;
            let senderClass = '';
            
            // Add role or status indicators
            if (messageData.isAdmin) senderClass = 'admin';
            if (messageData.isModerator) senderClass = 'moderator';
            if (messageData.isDead) senderClass = 'dead';
            
            senderDisplay = `<span class="sender ${senderClass}">${senderName}</span>: `;
        }
        
        // Parse message content for emotes
        const messageContent = parseEmotes(messageData.message);
        
        // Set message HTML
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-content">
                ${senderDisplay}${messageContent}
            </div>
        `;
        
        // Add to chat window
        elements.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        scrollToBottom();
    }
    
    /**
     * Add a system message
     * @param {string} message - Message text
     * @param {string} color - Message color
     */
    function addSystemMessage(message, color = MESSAGE_COLORS.SYSTEM) {
        if (!elements.chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message system';
        
        messageElement.innerHTML = `
            <div class="message-content">
                <span style="color: ${color}">${message}</span>
            </div>
        `;
        
        // Add to chat window
        elements.chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        scrollToBottom();
    }
    
    /**
     * Parse text for emotes and replace with images
     * @param {string} text - Message text
     * @return {string} - Parsed message with emote images
     */
    function parseEmotes(text) {
        let parsedText = text;
        
        // Replace emote codes with images
        emotes.forEach(emote => {
            const regex = new RegExp(escapeRegExp(emote.text), 'g');
            if (emote.img) {
                parsedText = parsedText.replace(regex, 
                    `<img class="chat-emote" src="public/assets/emotes/${emote.img}" alt="${emote.id}">`);
            }
        });
        
        return parsedText;
    }
    
    /**
     * Escape special characters for regex
     * @param {string} string - String to escape
     * @return {string} - Escaped string
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Switch chat type
     * @param {string} type - Chat type to switch to
     */
    function switchChatType(type) {
        // Validate chat type
        if (!Object.values(CHAT_TYPE).includes(type)) {
            console.error('Invalid chat type:', type);
            return;
        }
        
        currentChatType = type;
        
        // Update chat input placeholder
        if (elements.chatInput) {
            if (type === CHAT_TYPE.TEAM) {
                elements.chatInput.placeholder = 'Type team message...';
            } else if (type === CHAT_TYPE.GLOBAL) {
                elements.chatInput.placeholder = 'Type global message...';
            } else if (type === CHAT_TYPE.PRIVATE) {
                elements.chatInput.placeholder = 'Type private message...';
            } else {
                elements.chatInput.placeholder = `Type ${type} message...`;
            }
        }
        
        // Show/hide target selector for private chat
        if (elements.chatTargetSelector) {
            elements.chatTargetSelector.style.display = type === CHAT_TYPE.PRIVATE ? 'block' : 'none';
        }
        
        // Load appropriate chat history
        if (type === CHAT_TYPE.PRIVATE && currentChatTarget) {
            loadChatHistory(type, currentChatTarget);
        } else {
            loadChatHistory(type);
        }
        
        // Update chat header if it exists
        const chatHeader = document.querySelector('.chat-header-title');
        if (chatHeader) {
            chatHeader.textContent = type.charAt(0).toUpperCase() + type.slice(1) + ' Chat';
        }
    }
    
    /**
     * Load chat history for a specific chat type
     * @param {string} type - Chat type to load
     * @param {string} [targetId] - Target user ID for private chat
     */
    function loadChatHistory(type, targetId = null) {
        if (!elements.chatMessages) return;
        
        // Clear chat window
        elements.chatMessages.innerHTML = '';
        
        let history;
        
        if (type === CHAT_TYPE.PRIVATE && targetId) {
            history = chatHistory.privateUsers[targetId] || [];
        } else {
            history = chatHistory[type] || [];
        }
        
        // Display messages
        history.forEach(msg => {
            displayMessage(msg);
        });
        
        // Scroll to bottom
        scrollToBottom();
    }
    
    /**
     * Toggle chat minimize/maximize
     */
    function toggleChat() {
        if (!elements.chatContainer) return;
        
        isMinimized = !isMinimized;
        
        if (isMinimized) {
            elements.chatContainer.classList.add('minimized');
        } else {
            elements.chatContainer.classList.remove('minimized');
            markAsRead();
        }
        
        // Update toggle button
        if (elements.chatToggle) {
            elements.chatToggle.innerHTML = isMinimized ? 
                '<i class="fas fa-chevron-up"></i>' : 
                '<i class="fas fa-chevron-down"></i>';
        }
    }
    
    /**
     * Mark chat as read
     */
    function markAsRead() {
        unreadMessages = 0;
        
        // Update unread badge
        if (elements.unreadBadge) {
            elements.unreadBadge.textContent = '';
            elements.unreadBadge.classList.remove('visible');
        }
    }
    
    /**
     * Increment unread messages counter
     */
    function incrementUnread() {
        if (isMinimized) {
            unreadMessages++;
            
            // Update unread badge
            if (elements.unreadBadge) {
                elements.unreadBadge.textContent = unreadMessages > 99 ? '99+' : unreadMessages;
                elements.unreadBadge.classList.add('visible');
            }
        }
    }
    
    /**
     * Set player dead status
     * @param {boolean} dead - Whether player is dead
     */
    function setPlayerDead(dead) {
        isDead = dead;
        
        if (dead) {
            addSystemMessage('You are now spectating. You can only chat with other spectators.', MESSAGE_COLORS.SYSTEM);
        }
    }
    
    /**
     * Set player role
     * @param {string} role - Player's role
     */
    function setPlayerRole(role) {
        userRole = role;
        
        // Add role-specific welcome message
        if (role === 'TRAITOR') {
            addSystemMessage('You are a Traitor. You can see all messages but be careful not to reveal yourself!', '#ff4d4d');
        } else if (role === 'DETECTIVE') {
            addSystemMessage('You are a Detective. Use chat to coordinate with your team!', '#4d79ff');
        }
    }
    
    /**
     * Update chat based on game phase
     * @param {string} phase - Current game phase
     */
    function updateChatForGamePhase(phase) {
        switch (phase) {
            case 'LOBBY':
                addSystemMessage('Lobby phase. Chat with other players before the game starts!');
                break;
            case 'DISCUSSION':
                addSystemMessage('Discussion phase. Talk with others to identify traitors!');
                break;
            case 'VOTING':
                addSystemMessage('Voting phase. Make your final arguments!');
                break;
            case 'NIGHT':
                addSystemMessage('Night phase. Only your team can see your messages.');
                break;
        }
    }
    
    /**
     * Reset chat state for a new game
     */
    function resetChatState() {
        // Reset player state
        isDead = false;
        userRole = null;
        
        // Clear chat for new game
        clearChat();
        addSystemMessage('New game has started. Good luck!');
        
        // Reset to team chat
        if (elements.chatTypeSelector) {
            elements.chatTypeSelector.value = CHAT_TYPE.TEAM;
            switchChatType(CHAT_TYPE.TEAM);
        }
    }
    
    /**
     * Clear all chat messages
     */
    function clearChat() {
        if (elements.chatMessages) {
            elements.chatMessages.innerHTML = '';
        }
    }
    
    /**
     * Toggle emote menu
     */
    function toggleEmoteMenu() {
        if (!elements.emoteMenu) return;
        
        elements.emoteMenu.classList.toggle('active');
    }
    
    /**
     * Insert emote into chat input
     * @param {string} emoteText - Emote text to insert
     */
    function insertEmote(emoteText) {
        if (!elements.chatInput) return;
        
        elements.chatInput.value += emoteText + ' ';
        elements.chatInput.focus();
    }
    
    /**
     * Scroll chat to bottom
     */
    function scrollToBottom() {
        if (elements.chatMessages) {
            elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        }
    }
    
    /**
     * Check if player can send messages in current state
     * @return {boolean} - Whether player can send messages
     */
    function canSendMessages() {
        // For now, always return true
        // In a real implementation, check if player is muted, etc.
        return true;
    }
    
    /**
     * Check if player can send a message of specific type
     * @param {string} type - Chat type
     * @return {boolean} - Whether player can send this type of message
     */
    function canSendMessageOfType(type) {
        // Apply role & state restrictions
        if (isDead) {
            // Dead players can only chat with other dead players
            return type === CHAT_TYPE.TEAM;
        }
        
        if (userRole === 'TRAITOR') {
            // Traitors can chat anywhere
            return true;
        }
        
        // Default - can chat anywhere
        return true;
    }
    
    /**
     * Check if player can read a specific message
     * @param {Object} messageData - Message data object
     * @return {boolean} - Whether player can read this message
     */
    function canReadMessage(messageData) {
        // System messages always visible
        if (messageData.type === CHAT_TYPE.SYSTEM) {
            return true;
        }
        
        // Apply role & state restrictions
        if (isDead) {
            // Dead players can only see dead chat and global
            if (messageData.type === CHAT_TYPE.TEAM && !messageData.isDead) {
                return false;
            }
        }
        
        // Private messages
        if (messageData.type === CHAT_TYPE.PRIVATE) {
            // Can only see private messages sent to/from current user
            return messageData.senderId === getCurrentUserId() || 
                   messageData.targetId === getCurrentUserId();
        }
        
        // By default, can read message
        return true;
    }
    
    /**
     * Get current user ID
     * @return {string} - Current user ID
     */
    function getCurrentUserId() {
        // In a real implementation, get from auth
        return window.firebase && window.firebase.auth().currentUser ? 
            window.firebase.auth().currentUser.uid : 'user123';
    }
    
    /**
     * Get current username
     * @return {string} - Current username
     */
    function getCurrentUsername() {
        // In a real implementation, get from user profile
        return 'Player';
    }
    
    /**
     * Update player list for private messaging
     * @param {Array} players - List of player objects
     */
    function updatePlayerList(players) {
        if (!elements.chatTargetSelector) return;
        
        // Clear current options
        elements.chatTargetSelector.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select player...';
        elements.chatTargetSelector.appendChild(defaultOption);
        
        // Add each player
        players.forEach(player => {
            // Don't add self to the list
            if (player.id === getCurrentUserId()) return;
            
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.username;
            
            // Add indicators for dead players or special roles if visible
            if (player.isDead) {
                option.textContent += ' [DEAD]';
            }
            
            elements.chatTargetSelector.appendChild(option);
        });
    }
    
    // Public API
    return {
        init,
        CHAT_TYPE,
        sendMessage,
        addSystemMessage,
        updatePlayerList,
        clearChat,
        toggleChat
    };
})();

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ShadowHeistChat.init();
    
    // Make available globally
    window.ShadowHeistChat = ShadowHeistChat;
}); 