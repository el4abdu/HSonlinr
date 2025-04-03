/**
 * Shadow Heist Online - In-Game Chat System
 * Handles player communication during different game phases
 */

// Chat System Module
const ChatSystem = (function() {
    // Private variables
    let _initialized = false;
    let _gameId = null;
    let _currentUser = null;
    let _playerRole = null;
    let _gamePhase = null;
    let _chatListeners = [];
    let _messageQueue = [];
    let _chatContainer = null;
    let _messageInput = null;
    let _sendButton = null;
    let _chatToggle = null;
    let _isMinimized = false;
    
    // Initialize chat system
    function init(gameId, playerRole) {
        if (_initialized) return;
        
        console.log("Initializing chat system for game:", gameId);
        
        // Store game ID and player role
        _gameId = gameId;
        _playerRole = playerRole;
        
        // Get current user
        _currentUser = firebase.auth().currentUser;
        if (!_currentUser) {
            console.error("Cannot initialize chat: User not authenticated");
            return;
        }
        
        // Get player data
        const playerData = window.FirebaseService?.playerData || null;
        
        // Find chat elements
        _chatContainer = document.getElementById('game-chat');
        _messageInput = document.getElementById('chat-message-input');
        _sendButton = document.getElementById('chat-send-button');
        _chatToggle = document.getElementById('chat-toggle');
        
        if (!_chatContainer || !_messageInput || !_sendButton) {
            console.error("Chat elements not found in DOM");
            return;
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Set up Firebase listeners
        setupChatListeners();
        
        // Mark as initialized
        _initialized = true;
        
        // Set default game phase
        setGamePhase('setup');
        
        console.log("Chat system initialized successfully");
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Send message on button click
        if (_sendButton) {
            _sendButton.addEventListener('click', sendMessage);
        }
        
        // Send message on Enter key
        if (_messageInput) {
            _messageInput.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                }
            });
        }
        
        // Toggle chat visibility
        if (_chatToggle) {
            _chatToggle.addEventListener('click', toggleChat);
        }
    }
    
    // Set up Firebase chat listeners
    function setupChatListeners() {
        if (!_gameId) {
            console.error("Cannot setup chat listeners: Game ID not provided");
            return;
        }
        
        // Remove existing listeners
        removeChatListeners();
        
        // Set up listeners for different chat channels
        setupChannelListener('global');
        setupChannelListener('team');
        
        // Special channels based on role
        if (_playerRole) {
            if (_playerRole === 'traitor' || _playerRole === 'infiltrator' || _playerRole === 'double_agent') {
                setupChannelListener('traitors');
            }
            if (_playerRole === 'hero' || _playerRole === 'master_thief' || _playerRole === 'hacker') {
                setupChannelListener('heroes');
            }
        }
    }
    
    // Set up listener for a specific chat channel
    function setupChannelListener(channel) {
        const channelRef = firebase.database().ref(`games/${_gameId}/chat/${channel}`);
        
        // Listen for new messages
        const listener = channelRef.orderByChild('timestamp').startAt(Date.now()).on('child_added', (snapshot) => {
            const message = snapshot.val();
            displayMessage(message, channel);
        });
        
        // Store listener reference for later cleanup
        _chatListeners.push({
            ref: channelRef,
            event: 'child_added',
            callback: listener
        });
    }
    
    // Remove all chat listeners
    function removeChatListeners() {
        _chatListeners.forEach(listener => {
            listener.ref.off(listener.event, listener.callback);
        });
        _chatListeners = [];
    }
    
    // Send a message
    function sendMessage() {
        if (!_messageInput || !_gameId || !_currentUser) return;
        
        const messageText = _messageInput.value.trim();
        if (!messageText) return;
        
        // Clear input
        _messageInput.value = '';
        
        // Determine channel based on game phase and player role
        const channel = determineMessageChannel();
        
        // Get player data
        const playerData = window.FirebaseService?.playerData || { displayName: _currentUser.displayName || 'Unknown', playerId: 'unknown' };
        
        // Create message object
        const message = {
            senderId: _currentUser.uid,
            senderName: playerData.displayName,
            senderRole: _playerRole,
            text: messageText,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            channel: channel
        };
        
        // Add to Firebase
        firebase.database().ref(`games/${_gameId}/chat/${channel}`).push(message)
            .catch(error => {
                console.error("Error sending message:", error);
                showNotification("Failed to send message. Please try again.", "error");
            });
    }
    
    // Determine message channel based on game phase and player role
    function determineMessageChannel() {
        // Default channel
        let channel = 'global';
        
        // Use target channel if specified
        const targetChannel = document.querySelector('input[name="chat-channel"]:checked')?.value;
        if (targetChannel) {
            return targetChannel;
        }
        
        // Otherwise determine based on game phase and role
        switch (_gamePhase) {
            case 'night':
                // During night, traitors can talk to each other
                if (_playerRole === 'traitor' || _playerRole === 'infiltrator' || _playerRole === 'double_agent') {
                    channel = 'traitors';
                } else if (_playerRole === 'hero' || _playerRole === 'master_thief' || _playerRole === 'hacker') {
                    channel = 'heroes';
                } else {
                    // No chat for civilians during night
                    showNotification("You cannot chat during the night phase", "warning");
                    return null;
                }
                break;
                
            case 'day':
            case 'voting':
                // Everyone can talk to everyone during day/voting
                channel = 'global';
                break;
                
            case 'task':
                // Team members can talk during tasks
                channel = 'team';
                break;
                
            default:
                channel = 'global';
        }
        
        return channel;
    }
    
    // Display a message in the chat container
    function displayMessage(message, channel) {
        if (!_chatContainer) return;
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        // Add appropriate class based on sender
        if (message.senderId === _currentUser.uid) {
            messageElement.classList.add('own-message');
        }
        
        // Add channel class
        messageElement.classList.add(`channel-${channel}`);
        
        // Add role class if available
        if (message.senderRole) {
            messageElement.classList.add(`role-${message.senderRole}`);
        }
        
        // Create sender info
        const senderElement = document.createElement('div');
        senderElement.className = 'message-sender';
        senderElement.textContent = message.senderName || 'Unknown';
        
        // Create message text
        const textElement = document.createElement('div');
        textElement.className = 'message-text';
        textElement.textContent = message.text;
        
        // Create timestamp
        const timestampElement = document.createElement('div');
        timestampElement.className = 'message-time';
        
        // Format timestamp
        const date = new Date(message.timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        timestampElement.textContent = `${hours}:${minutes}`;
        
        // Assemble message
        messageElement.appendChild(senderElement);
        messageElement.appendChild(textElement);
        messageElement.appendChild(timestampElement);
        
        // Add to chat container
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.appendChild(messageElement);
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Show notification if chat is minimized
        if (_isMinimized && message.senderId !== _currentUser.uid) {
            const notificationText = `${message.senderName}: ${message.text}`;
            showChatNotification(notificationText, channel);
        }
    }
    
    // Show chat notification
    function showChatNotification(text, channel) {
        // Create notification element if it doesn't exist
        let notificationElement = document.getElementById('chat-notification');
        
        if (!notificationElement) {
            notificationElement = document.createElement('div');
            notificationElement.id = 'chat-notification';
            notificationElement.className = 'chat-notification';
            document.body.appendChild(notificationElement);
        }
        
        // Add channel class
        notificationElement.className = 'chat-notification';
        notificationElement.classList.add(`channel-${channel}`);
        
        // Update text
        notificationElement.textContent = text;
        
        // Show notification
        notificationElement.classList.add('show');
        
        // Hide after a few seconds
        setTimeout(() => {
            notificationElement.classList.remove('show');
        }, 5000);
    }
    
    // Toggle chat visibility
    function toggleChat() {
        if (!_chatContainer) return;
        
        _isMinimized = !_isMinimized;
        
        if (_isMinimized) {
            _chatContainer.classList.add('minimized');
        } else {
            _chatContainer.classList.remove('minimized');
            
            // Scroll to bottom when maximizing
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    }
    
    // Set game phase
    function setGamePhase(phase) {
        _gamePhase = phase;
        
        // Update UI for the new phase
        updateChatUIForPhase(phase);
        
        // Add system message about phase change
        const phaseNames = {
            setup: 'Setup',
            night: 'Night',
            day: 'Day',
            voting: 'Voting',
            task: 'Task',
            result: 'Result'
        };
        
        const systemMessage = {
            senderId: 'system',
            senderName: 'System',
            text: `${phaseNames[phase] || phase.toUpperCase()} phase has begun`,
            timestamp: Date.now(),
            channel: 'global'
        };
        
        displayMessage(systemMessage, 'global');
    }
    
    // Update chat UI based on game phase
    function updateChatUIForPhase(phase) {
        if (!_chatContainer) return;
        
        // Remove all phase classes
        _chatContainer.classList.remove(
            'phase-setup', 
            'phase-night', 
            'phase-day', 
            'phase-voting', 
            'phase-task', 
            'phase-result'
        );
        
        // Add current phase class
        _chatContainer.classList.add(`phase-${phase}`);
        
        // Update channel options based on phase and role
        updateChannelOptions(phase);
        
        // Update placeholder text
        if (_messageInput) {
            switch (phase) {
                case 'night':
                    if (_playerRole === 'traitor' || _playerRole === 'infiltrator' || _playerRole === 'double_agent') {
                        _messageInput.placeholder = "Chat with fellow traitors...";
                    } else if (_playerRole === 'hero' || _playerRole === 'master_thief' || _playerRole === 'hacker') {
                        _messageInput.placeholder = "Chat with fellow heroes...";
                    } else {
                        _messageInput.placeholder = "You cannot chat during the night phase";
                        _messageInput.disabled = true;
                        if (_sendButton) _sendButton.disabled = true;
                    }
                    break;
                    
                case 'day':
                case 'voting':
                    _messageInput.placeholder = "Chat with everyone...";
                    _messageInput.disabled = false;
                    if (_sendButton) _sendButton.disabled = false;
                    break;
                    
                case 'task':
                    _messageInput.placeholder = "Chat with your team...";
                    _messageInput.disabled = false;
                    if (_sendButton) _sendButton.disabled = false;
                    break;
                    
                default:
                    _messageInput.placeholder = "Type your message...";
                    _messageInput.disabled = false;
                    if (_sendButton) _sendButton.disabled = false;
            }
        }
    }
    
    // Update channel options
    function updateChannelOptions(phase) {
        const channelOptions = document.getElementById('chat-channels');
        if (!channelOptions) return;
        
        // Clear options
        channelOptions.innerHTML = '';
        
        // Add options based on phase and role
        const channels = [];
        
        // Global chat (day/voting)
        if (phase === 'day' || phase === 'voting' || phase === 'setup' || phase === 'result') {
            channels.push({
                id: 'global',
                name: 'Global',
                checked: true
            });
        }
        
        // Team chat (during task)
        if (phase === 'task') {
            channels.push({
                id: 'team',
                name: 'Team',
                checked: true
            });
        }
        
        // Traitor chat (night phase for traitors)
        if (phase === 'night' && 
            (_playerRole === 'traitor' || _playerRole === 'infiltrator' || _playerRole === 'double_agent')) {
            channels.push({
                id: 'traitors',
                name: 'Traitors',
                checked: true
            });
        }
        
        // Hero chat (night phase for heroes)
        if (phase === 'night' && 
            (_playerRole === 'hero' || _playerRole === 'master_thief' || _playerRole === 'hacker')) {
            channels.push({
                id: 'heroes',
                name: 'Heroes',
                checked: true
            });
        }
        
        // Create channel options
        channels.forEach(channel => {
            const label = document.createElement('label');
            label.className = 'channel-option';
            
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'chat-channel';
            input.value = channel.id;
            input.checked = channel.checked;
            
            const span = document.createElement('span');
            span.textContent = channel.name;
            
            label.appendChild(input);
            label.appendChild(span);
            channelOptions.appendChild(label);
        });
    }
    
    // Add a system message
    function addSystemMessage(text, channel = 'global') {
        const systemMessage = {
            senderId: 'system',
            senderName: 'System',
            text: text,
            timestamp: Date.now(),
            channel: channel
        };
        
        displayMessage(systemMessage, channel);
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        // Check if window.showNotification is available
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    // Clean up
    function cleanup() {
        console.log("Cleaning up chat system");
        
        // Remove event listeners
        if (_sendButton) {
            _sendButton.removeEventListener('click', sendMessage);
        }
        
        if (_messageInput) {
            _messageInput.removeEventListener('keydown', sendMessage);
        }
        
        if (_chatToggle) {
            _chatToggle.removeEventListener('click', toggleChat);
        }
        
        // Remove Firebase listeners
        removeChatListeners();
        
        // Reset variables
        _gameId = null;
        _currentUser = null;
        _playerRole = null;
        _gamePhase = null;
        _initialized = false;
    }
    
    // Public API
    return {
        init,
        setGamePhase,
        addSystemMessage,
        cleanup,
        get isInitialized() { return _initialized; },
        get gamePhase() { return _gamePhase; }
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatSystem;
}

// Make available globally
window.ChatSystem = ChatSystem; 