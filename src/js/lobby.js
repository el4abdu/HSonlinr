// Lobby functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    
    // Redirect if no roomId provided
    if (!roomId) {
        window.location.href = 'index.html';
        return;
    }
    
    // DOM elements
    const roomNameElement = document.getElementById('room-name');
    const roomCodeElement = document.getElementById('room-code');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const playerCountElement = document.getElementById('player-count');
    const playerListElement = document.getElementById('player-list');
    const chatMessagesElement = document.getElementById('chat-messages');
    const chatInputElement = document.getElementById('chat-input-field');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const readyToggle = document.getElementById('ready-toggle');
    const startGameBtn = document.getElementById('start-game-btn');
    const leaveLobbyBtn = document.getElementById('leave-lobby-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const hostSettingsElement = document.getElementById('host-settings');
    
    // Settings elements
    const masterThiefToggle = document.getElementById('lobby-role-master-thief');
    const hackerToggle = document.getElementById('lobby-role-hacker');
    const infiltratorToggle = document.getElementById('lobby-role-infiltrator');
    const doubleAgentToggle = document.getElementById('lobby-role-double-agent');
    const civiliansCount = document.getElementById('lobby-role-civilians');
    const discussionTime = document.getElementById('discussion-time');
    const taskTime = document.getElementById('task-time');
    const nightTime = document.getElementById('night-time');
    
    // Summary elements
    const heroCountElement = document.getElementById('hero-count');
    const traitorCountElement = document.getElementById('traitor-count');
    const civilianCountElement = document.getElementById('civilian-count');
    const summaryDiscussionTimeElement = document.getElementById('summary-discussion-time');
    const summaryTaskTimeElement = document.getElementById('summary-task-time');
    const summaryNightTimeElement = document.getElementById('summary-night-time');
    
    // Number increment/decrement buttons
    const numberButtons = document.querySelectorAll('.number-increment, .number-decrement');
    
    // Game state
    let lobbyState = {
        roomData: null,
        players: {},
        isHost: false,
        isReady: false,
        chat: []
    };
    
    // Initialize number input buttons
    numberButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const inputElement = document.getElementById(targetId);
            const currentValue = parseInt(inputElement.value);
            const min = parseInt(inputElement.getAttribute('min'));
            const max = parseInt(inputElement.getAttribute('max'));
            const step = parseInt(inputElement.getAttribute('step') || 1);
            
            if (button.classList.contains('number-increment')) {
                inputElement.value = Math.min(currentValue + step, max);
            } else {
                inputElement.value = Math.max(currentValue - step, min);
            }
            
            // Update summary when values change
            updateSettingsSummary();
        });
    });
    
    // Initialize lobby
    function initLobby() {
        // Check authentication
        if (!currentUser) {
            // If not authenticated, redirect to login page
            window.location.href = 'index.html';
            return;
        }
        
        // Set room code
        roomCodeElement.textContent = roomId;
        
        // Setup Firebase listeners
        setupRoomListener();
        setupChatListener();
        
        // Event listeners
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', copyRoomCode);
        }
        
        if (sendChatBtn) {
            sendChatBtn.addEventListener('click', sendChatMessage);
        }
        
        if (chatInputElement) {
            chatInputElement.addEventListener('keypress', event => {
                if (event.key === 'Enter') {
                    sendChatMessage();
                }
            });
        }
        
        if (readyToggle) {
            readyToggle.addEventListener('change', toggleReady);
        }
        
        if (startGameBtn) {
            startGameBtn.addEventListener('click', startGame);
        }
        
        if (leaveLobbyBtn) {
            leaveLobbyBtn.addEventListener('click', leaveLobby);
        }
        
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', saveSettings);
        }
        
        // Initialize settings changes
        const settingsInputs = document.querySelectorAll('#host-settings input');
        settingsInputs.forEach(input => {
            input.addEventListener('change', updateSettingsSummary);
        });
    }
    
    // Setup room listener
    function setupRoomListener() {
        const roomRef = database.ref(`rooms/${roomId}`);
        
        roomRef.on('value', snapshot => {
            const data = snapshot.val();
            
            if (!data) {
                // Room doesn't exist
                showNotification('Room no longer exists', 'error');
                window.location.href = 'index.html';
                return;
            }
            
            lobbyState.roomData = data;
            
            // Update room name
            roomNameElement.textContent = data.name || 'Game Room';
            
            // Update player list
            updatePlayerList(data.players || {});
            
            // Check if current user is host
            lobbyState.isHost = data.host === currentUser.id;
            
            // Toggle host settings visibility
            hostSettingsElement.style.display = lobbyState.isHost ? 'flex' : 'none';
            
            // Update start button state
            updateStartButtonState();
            
            // Load room settings if host
            if (lobbyState.isHost) {
                loadRoomSettings(data);
            }
            
            // Update settings summary
            updateSettingsSummaryFromData(data);
        });
        
        // Handle disconnection
        roomRef.onDisconnect().update({
            [`players/${currentUser.id}/isConnected`]: false
        });
    }
    
    // Setup chat listener
    function setupChatListener() {
        const chatRef = database.ref(`chats/${roomId}`);
        
        chatRef.orderByChild('timestamp').limitToLast(50).on('value', snapshot => {
            const messages = snapshot.val() || {};
            const messageArray = Object.values(messages);
            
            // Sort messages by timestamp
            messageArray.sort((a, b) => a.timestamp - b.timestamp);
            
            lobbyState.chat = messageArray;
            renderChatMessages();
        });
    }
    
    // Update player list
    function updatePlayerList(players) {
        lobbyState.players = players;
        playerListElement.innerHTML = '';
        
        const playerCount = Object.keys(players).length;
        playerCountElement.textContent = `(${playerCount}/${GAME_CONSTANTS.MAX_PLAYERS})`;
        
        // Create player items
        Object.values(players).forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            
            const avatarUrl = player.imageUrl || 'public/assets/default-avatar.png';
            
            playerItem.innerHTML = `
                <div class="player-avatar" style="background-image: url('${avatarUrl}')"></div>
                <div class="player-info">
                    <div class="player-name">${player.username || 'Player'}</div>
                    <div class="player-status">
                        ${player.isHost ? '<span class="player-host-badge">Host</span>' : ''}
                    </div>
                </div>
                <div class="player-ready-status">
                    ${player.isReady ? 
                        '<div class="ready-indicator"></div> Ready' : 
                        '<div class="ready-indicator not-ready"></div> Not Ready'}
                </div>
            `;
            
            playerListElement.appendChild(playerItem);
        });
        
        // If this player isn't in the list (maybe was disconnected), re-add them
        if (!players[currentUser.id]) {
            joinRoom();
        }
    }
    
    // Render chat messages
    function renderChatMessages() {
        chatMessagesElement.innerHTML = '';
        
        lobbyState.chat.forEach(message => {
            const messageElement = document.createElement('div');
            
            if (message.system) {
                // System message
                messageElement.className = 'system-message';
                messageElement.textContent = message.text;
            } else {
                // User message
                messageElement.className = 'chat-message';
                const sender = lobbyState.players[message.userId] || { username: 'Player', imageUrl: 'public/assets/default-avatar.png' };
                const avatarUrl = sender.imageUrl || 'public/assets/default-avatar.png';
                
                messageElement.innerHTML = `
                    <div class="chat-avatar" style="background-image: url('${avatarUrl}')"></div>
                    <div class="chat-content">
                        <div class="chat-sender">${sender.username}</div>
                        <div class="chat-text">${message.text}</div>
                    </div>
                `;
            }
            
            chatMessagesElement.appendChild(messageElement);
        });
        
        // Scroll to bottom
        chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
    }
    
    // Send chat message
    function sendChatMessage() {
        const messageText = chatInputElement.value.trim();
        
        if (messageText) {
            const chatRef = database.ref(`chats/${roomId}`).push();
            
            chatRef.set({
                userId: currentUser.id,
                text: messageText,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            chatInputElement.value = '';
        }
    }
    
    // Copy room code to clipboard
    function copyRoomCode() {
        navigator.clipboard.writeText(roomId).then(() => {
            showNotification('Room code copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            showNotification('Failed to copy room code', 'error');
        });
    }
    
    // Toggle ready status
    function toggleReady() {
        const isReady = readyToggle.checked;
        
        const playerRef = database.ref(`rooms/${roomId}/players/${currentUser.id}`);
        playerRef.update({
            isReady: isReady
        });
        
        lobbyState.isReady = isReady;
        
        // Update start button state
        updateStartButtonState();
    }
    
    // Update start button state
    function updateStartButtonState() {
        if (!lobbyState.isHost) {
            startGameBtn.disabled = true;
            return;
        }
        
        const players = lobbyState.players;
        const playerCount = Object.keys(players).length;
        
        // Check if enough players
        if (playerCount < GAME_CONSTANTS.MIN_PLAYERS) {
            startGameBtn.disabled = true;
            return;
        }
        
        // Check if all players are ready
        const allReady = Object.values(players).every(player => player.isReady);
        startGameBtn.disabled = !allReady;
    }
    
    // Start the game
    function startGame() {
        if (!lobbyState.isHost) return;
        
        const roomRef = database.ref(`rooms/${roomId}`);
        
        // Assign roles to players
        const roles = assignRoles();
        
        if (!roles) {
            showNotification('Invalid role configuration', 'error');
            return;
        }
        
        // Update game state
        roomRef.update({
            status: 'playing',
            gameState: {
                phase: GAME_CONSTANTS.PHASES.NIGHT,
                round: 1,
                tasks: generateTasks(),
                completedTasks: 0,
                sabotages: 0,
                startTime: firebase.database.ServerValue.TIMESTAMP,
                roles: roles,
                settings: {
                    discussionTime: parseInt(discussionTime.value) || 60,
                    taskTime: parseInt(taskTime.value) || 30,
                    nightTime: parseInt(nightTime.value) || 20
                }
            }
        }).then(() => {
            // Add system message
            addSystemMessage('Game has started!');
            
            // Redirect to game page
            window.location.href = `game.html?roomId=${roomId}`;
        }).catch(error => {
            console.error('Error starting game:', error);
            showNotification('Failed to start game', 'error');
        });
    }
    
    // Generate tasks for the game
    function generateTasks() {
        const taskCount = GAME_CONSTANTS.TASK_COUNT;
        const taskTypes = ['wiring', 'code', 'memory', 'sequence', 'matching'];
        const tasks = [];
        
        for (let i = 0; i < taskCount; i++) {
            const randomType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
            tasks.push({
                id: `task-${i+1}`,
                type: randomType,
                completed: false,
                sabotaged: false
            });
        }
        
        return tasks;
    }
    
    // Assign roles to players
    function assignRoles() {
        const settings = getSettingsValues();
        const players = Object.keys(lobbyState.players);
        const playerCount = players.length;
        
        // Count total roles
        const totalHeroes = (settings.masterThief ? 1 : 0) + (settings.hacker ? 1 : 0);
        const totalTraitors = (settings.infiltrator ? 1 : 0) + (settings.doubleAgent ? 1 : 0);
        const totalCivilians = settings.civilians;
        
        const totalRoles = totalHeroes + totalTraitors + totalCivilians;
        
        // Check if we have enough players
        if (playerCount < totalRoles) {
            showNotification(`Not enough players for selected roles: Need ${totalRoles}`, 'error');
            return null;
        }
        
        // Check if we have too many roles
        if (totalRoles > playerCount) {
            showNotification(`Too many roles for players: Roles ${totalRoles}, Players ${playerCount}`, 'error');
            return null;
        }
        
        // Shuffle players
        const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
        
        // Assign roles
        const roles = {};
        let index = 0;
        
        // Assign hero roles
        if (settings.masterThief) {
            roles[shuffledPlayers[index]] = 'MASTER_THIEF';
            index++;
        }
        
        if (settings.hacker) {
            roles[shuffledPlayers[index]] = 'HACKER';
            index++;
        }
        
        // Assign traitor roles
        if (settings.infiltrator) {
            roles[shuffledPlayers[index]] = 'INFILTRATOR';
            index++;
        }
        
        if (settings.doubleAgent) {
            roles[shuffledPlayers[index]] = 'DOUBLE_AGENT';
            index++;
        }
        
        // Assign civilian roles
        for (let i = 0; i < settings.civilians; i++) {
            roles[shuffledPlayers[index]] = 'CIVILIAN';
            index++;
        }
        
        // If there are any unassigned players, make them civilians
        while (index < playerCount) {
            roles[shuffledPlayers[index]] = 'CIVILIAN';
            index++;
        }
        
        return roles;
    }
    
    // Leave the lobby
    function leaveLobby() {
        const playerRef = database.ref(`rooms/${roomId}/players/${currentUser.id}`);
        playerRef.remove().then(() => {
            // Check if this player is the host
            if (lobbyState.isHost) {
                // Assign a new host if possible
                assignNewHost();
            }
            
            // Navigate back to home
            window.location.href = 'index.html';
        }).catch(error => {
            console.error('Error leaving lobby:', error);
            showNotification('Failed to leave lobby', 'error');
        });
    }
    
    // Assign a new host if current host leaves
    function assignNewHost() {
        if (!lobbyState.isHost) return;
        
        const players = Object.keys(lobbyState.players)
            .filter(id => id !== currentUser.id);
        
        if (players.length > 0) {
            // Choose the first remaining player as new host
            const newHostId = players[0];
            const roomRef = database.ref(`rooms/${roomId}`);
            
            roomRef.update({
                host: newHostId,
                [`players/${newHostId}/isHost`]: true
            }).then(() => {
                addSystemMessage(`${lobbyState.players[newHostId].username} is now the host.`);
            });
        } else {
            // No players left, delete the room
            database.ref(`rooms/${roomId}`).remove();
            database.ref(`chats/${roomId}`).remove();
        }
    }
    
    // Join the room (or re-join if disconnected)
    function joinRoom() {
        const playerRef = database.ref(`rooms/${roomId}/players/${currentUser.id}`);
        
        playerRef.set({
            id: currentUser.id,
            username: currentUser.username,
            isHost: lobbyState.isHost,
            isReady: lobbyState.isReady,
            isConnected: true,
            imageUrl: currentUser.imageUrl
        });
        
        // Add system message for new player
        if (!lobbyState.players[currentUser.id]) {
            addSystemMessage(`${currentUser.username} has joined the room.`);
        }
    }
    
    // Add system message to chat
    function addSystemMessage(message) {
        const chatRef = database.ref(`chats/${roomId}`).push();
        
        chatRef.set({
            system: true,
            text: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }
    
    // Load room settings
    function loadRoomSettings(roomData) {
        if (!roomData.roles) return;
        
        const roles = roomData.roles;
        const settings = roomData.settings || {};
        
        // Set role toggles
        if (masterThiefToggle) masterThiefToggle.checked = roles.masterThief !== false;
        if (hackerToggle) hackerToggle.checked = roles.hacker !== false;
        if (infiltratorToggle) infiltratorToggle.checked = roles.infiltrator !== false;
        if (doubleAgentToggle) doubleAgentToggle.checked = roles.doubleAgent !== false;
        if (civiliansCount) civiliansCount.value = roles.civilians || 2;
        
        // Set other settings
        if (discussionTime) discussionTime.value = settings.discussionTime || 60;
        if (taskTime) taskTime.value = settings.taskTime || 30;
        if (nightTime) nightTime.value = settings.nightTime || 20;
        
        // Update summary
        updateSettingsSummary();
    }
    
    // Get current settings values
    function getSettingsValues() {
        return {
            masterThief: masterThiefToggle ? masterThiefToggle.checked : true,
            hacker: hackerToggle ? hackerToggle.checked : true,
            infiltrator: infiltratorToggle ? infiltratorToggle.checked : true,
            doubleAgent: doubleAgentToggle ? doubleAgentToggle.checked : true,
            civilians: civiliansCount ? parseInt(civiliansCount.value) : 2,
            discussionTime: discussionTime ? parseInt(discussionTime.value) : 60,
            taskTime: taskTime ? parseInt(taskTime.value) : 30,
            nightTime: nightTime ? parseInt(nightTime.value) : 20
        };
    }
    
    // Update settings summary from local inputs
    function updateSettingsSummary() {
        const settings = getSettingsValues();
        
        // Update hero count
        const heroCount = (settings.masterThief ? 1 : 0) + (settings.hacker ? 1 : 0);
        heroCountElement.textContent = heroCount;
        
        // Update traitor count
        const traitorCount = (settings.infiltrator ? 1 : 0) + (settings.doubleAgent ? 1 : 0);
        traitorCountElement.textContent = traitorCount;
        
        // Update civilian count
        civilianCountElement.textContent = settings.civilians;
        
        // Update time settings
        summaryDiscussionTimeElement.textContent = settings.discussionTime;
        summaryTaskTimeElement.textContent = settings.taskTime;
        summaryNightTimeElement.textContent = settings.nightTime;
    }
    
    // Update settings summary from room data
    function updateSettingsSummaryFromData(roomData) {
        if (!roomData.roles) return;
        
        const roles = roomData.roles;
        const settings = roomData.settings || {};
        
        // Update hero count
        const heroCount = (roles.masterThief !== false ? 1 : 0) + (roles.hacker !== false ? 1 : 0);
        heroCountElement.textContent = heroCount;
        
        // Update traitor count
        const traitorCount = (roles.infiltrator !== false ? 1 : 0) + (roles.doubleAgent !== false ? 1 : 0);
        traitorCountElement.textContent = traitorCount;
        
        // Update civilian count
        civilianCountElement.textContent = roles.civilians || 2;
        
        // Update time settings
        summaryDiscussionTimeElement.textContent = settings.discussionTime || 60;
        summaryTaskTimeElement.textContent = settings.taskTime || 30;
        summaryNightTimeElement.textContent = settings.nightTime || 20;
    }
    
    // Save settings
    function saveSettings() {
        if (!lobbyState.isHost) return;
        
        const settings = getSettingsValues();
        const roomRef = database.ref(`rooms/${roomId}`);
        
        roomRef.update({
            roles: {
                masterThief: settings.masterThief,
                hacker: settings.hacker,
                infiltrator: settings.infiltrator,
                doubleAgent: settings.doubleAgent,
                civilians: settings.civilians
            },
            settings: {
                discussionTime: settings.discussionTime,
                taskTime: settings.taskTime,
                nightTime: settings.nightTime,
                taskCount: GAME_CONSTANTS.TASK_COUNT
            }
        }).then(() => {
            showNotification('Settings saved');
            addSystemMessage('Game settings updated.');
        }).catch(error => {
            console.error('Error saving settings:', error);
            showNotification('Failed to save settings', 'error');
        });
    }
    
    // Show notification
    function showNotification(message, type = 'success') {
        // Check if notification container exists
        let notificationContainer = document.querySelector('.notification-container');
        
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Initialize when auth is ready
    const checkAuth = setInterval(() => {
        if (typeof currentUser !== 'undefined') {
            clearInterval(checkAuth);
            
            if (currentUser) {
                initLobby();
            } else {
                window.location.href = 'index.html';
            }
        }
    }, 100);
}); 