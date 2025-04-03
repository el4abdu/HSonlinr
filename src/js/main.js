// Main game functionality
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const saveUsernameBtn = document.getElementById('save-username-btn');
    const rulesBtn = document.getElementById('rules-btn');
    const closeModalBtn = document.querySelector('.close-modal');
    const rulesModal = document.getElementById('rules-modal');
    const joinRoomInterface = document.getElementById('join-room-interface');
    const createRoomInterface = document.getElementById('create-room-interface');
    const landingPage = document.getElementById('landing-page');
    const joinRoomConfirmBtn = document.getElementById('join-room-confirm-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    const backFromCreateBtn = document.getElementById('back-from-create-btn');
    const roomCodeInput = document.getElementById('room-code-input');
    const createRoomConfirmBtn = document.getElementById('create-room-confirm-btn');
    
    // Game state
    let gameState = {
        roomId: null,
        isHost: false,
        players: [],
        currentPhase: GAME_CONSTANTS.PHASES.LOBBY,
        tasks: [],
        sabotages: 0,
        completedTasks: 0,
        timer: 0,
        playerRole: null
    };
    
    // Event listeners
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => showCreateRoomInterface());
    }
    
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', () => showJoinRoomInterface());
    }
    
    if (saveUsernameBtn) {
        saveUsernameBtn.addEventListener('click', () => {
            const newUsername = document.getElementById('username-input').value;
            if (newUsername.trim()) {
                updateUsername(newUsername);
                showNotification('Username updated successfully!');
            }
        });
    }
    
    if (rulesBtn) {
        rulesBtn.addEventListener('click', () => {
            rulesModal.style.display = 'flex';
        });
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            rulesModal.style.display = 'none';
        });
    }
    
    if (joinRoomConfirmBtn) {
        joinRoomConfirmBtn.addEventListener('click', () => {
            joinRoom(roomCodeInput.value);
        });
    }
    
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            showLandingPage();
        });
    }
    
    if (backFromCreateBtn) {
        backFromCreateBtn.addEventListener('click', () => {
            showLandingPage();
        });
    }
    
    if (createRoomConfirmBtn) {
        createRoomConfirmBtn.addEventListener('click', () => {
            createRoom();
        });
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === rulesModal) {
            rulesModal.style.display = 'none';
        }
    });
    
    // UI navigation functions
    function showLandingPage() {
        joinRoomInterface.style.display = 'none';
        createRoomInterface.style.display = 'none';
        landingPage.style.display = 'flex';
    }
    
    function showJoinRoomInterface() {
        landingPage.style.display = 'none';
        joinRoomInterface.style.display = 'flex';
        roomCodeInput.focus();
    }
    
    function showCreateRoomInterface() {
        landingPage.style.display = 'none';
        createRoomInterface.style.display = 'flex';
    }
    
    // Room functions
    function createRoom() {
        if (!currentUser) {
            showNotification('You must be logged in to create a room', 'error');
            return;
        }
        
        const roomName = document.getElementById('room-name-input').value || `${currentUser.username}'s Room`;
        const roles = getRoleSelections();
        
        // Generate a random room code
        const roomCode = generateRoomCode();
        
        // Create room in Firebase
        const roomRef = database.ref(`rooms/${roomCode}`);
        
        roomRef.set({
            name: roomName,
            host: currentUser.id,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'waiting', // waiting, playing, ended
            roles: roles,
            players: {
                [currentUser.id]: {
                    id: currentUser.id,
                    username: currentUser.username,
                    isHost: true,
                    isReady: true,
                    imageUrl: currentUser.imageUrl
                }
            },
            settings: {
                taskCount: GAME_CONSTANTS.TASK_COUNT
            }
        }).then(() => {
            // Join the room
            gameState.roomId = roomCode;
            gameState.isHost = true;
            
            // Navigate to lobby page
            navigateToLobby(roomCode);
            
            showNotification(`Room created! Share code: ${roomCode}`);
        }).catch(error => {
            console.error("Error creating room:", error);
            showNotification('Failed to create room. Please try again.', 'error');
        });
    }
    
    function joinRoom(roomCode) {
        if (!currentUser) {
            showNotification('You must be logged in to join a room', 'error');
            return;
        }
        
        if (!roomCode || roomCode.length !== 6) {
            showNotification('Please enter a valid room code', 'error');
            return;
        }
        
        // Check if room exists
        const roomRef = database.ref(`rooms/${roomCode}`);
        
        roomRef.once('value').then(snapshot => {
            const roomData = snapshot.val();
            
            if (!roomData) {
                showNotification('Room not found', 'error');
                return;
            }
            
            if (roomData.status !== 'waiting') {
                showNotification('Game already in progress', 'error');
                return;
            }
            
            // Check if player count is at maximum
            const playerCount = Object.keys(roomData.players || {}).length;
            if (playerCount >= GAME_CONSTANTS.MAX_PLAYERS) {
                showNotification('Room is full', 'error');
                return;
            }
            
            // Join the room
            const playerRef = roomRef.child(`players/${currentUser.id}`);
            playerRef.set({
                id: currentUser.id,
                username: currentUser.username,
                isHost: false,
                isReady: false,
                imageUrl: currentUser.imageUrl
            }).then(() => {
                gameState.roomId = roomCode;
                gameState.isHost = false;
                
                // Navigate to lobby page
                navigateToLobby(roomCode);
                
                showNotification(`Joined room: ${roomData.name}`);
            }).catch(error => {
                console.error("Error joining room:", error);
                showNotification('Failed to join room', 'error');
            });
        }).catch(error => {
            console.error("Error checking room:", error);
            showNotification('Failed to check room', 'error');
        });
    }
    
    // Navigate to the lobby
    function navigateToLobby(roomCode) {
        // In a real implementation, this would redirect to the lobby page
        // For now, we'll just show a notification
        showNotification(`Navigating to lobby for room ${roomCode}`);
        console.log("This function would navigate to lobby.html or load the lobby component");
        
        // You would typically do something like:
        // window.location.href = `lobby.html?roomId=${roomCode}`;
    }
    
    // Get selected roles from the create room interface
    function getRoleSelections() {
        const roles = {
            masterThief: document.getElementById('role-master-thief').checked,
            hacker: document.getElementById('role-hacker').checked,
            infiltrator: document.getElementById('role-infiltrator').checked,
            doubleAgent: document.getElementById('role-double-agent').checked,
            civilians: parseInt(document.getElementById('role-civilians').value) || 2
        };
        
        return roles;
    }
    
    // Generate a random room code
    function generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omitting I, O, 0, 1 to avoid confusion
        let code = '';
        
        for (let i = 0; i < 6; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            code += chars[randomIndex];
        }
        
        return code;
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
    
    // Add styles for notifications
    addNotificationStyles();
    
    function addNotificationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .notification {
                padding: 12px 20px;
                border-radius: var(--border-radius);
                color: white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                animation: slideIn 0.3s ease-out forwards;
                max-width: 350px;
            }
            
            .notification.success {
                background: var(--success-color);
            }
            
            .notification.error {
                background: var(--danger-color);
            }
            
            .notification.warning {
                background: var(--warning-color);
            }
            
            .notification.fade-out {
                animation: fadeOut 0.3s ease-out forwards;
            }
            
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes fadeOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(10px); opacity: 0; }
            }
        `;
        
        document.head.appendChild(style);
    }
}); 