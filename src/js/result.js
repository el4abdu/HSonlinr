// Results Page Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    
    // Redirect if no roomId provided
    if (!roomId) {
        window.location.href = 'index.html';
        return;
    }
    
    // DOM Elements
    const roomNameEl = document.getElementById('room-name');
    const winnerBannerEl = document.getElementById('winner-banner');
    const rolesGridEl = document.getElementById('roles-grid');
    const statsListEl = document.getElementById('stats-list');
    const timelineEl = document.getElementById('timeline');
    const rematchBtn = document.getElementById('rematch-btn');
    const lobbyBtn = document.getElementById('lobby-btn');
    const homeBtn = document.getElementById('home-btn');
    
    // Game Results Data (will be fetched from Firebase)
    let gameData = {
        roomName: '',
        winner: '',
        players: {},
        stats: {},
        timeline: []
    };
    
    // Initialize results
    function init() {
        // Check if user is authenticated
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Fetch game results
        fetchGameResults();
    }
    
    // Set up event listeners
    function setupEventListeners() {
        if (rematchBtn) {
            rematchBtn.addEventListener('click', handleRematch);
        }
        
        if (lobbyBtn) {
            lobbyBtn.addEventListener('click', () => {
                window.location.href = `lobby.html?roomId=${roomId}`;
            });
        }
        
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }
    }
    
    // Fetch game results from Firebase
    function fetchGameResults() {
        const roomRef = database.ref(`rooms/${roomId}`);
        
        roomRef.once('value')
            .then(snapshot => {
                const data = snapshot.val();
                
                if (!data) {
                    // Room doesn't exist
                    showNotification('Room not found', 'error');
                    window.location.href = 'index.html';
                    return;
                }
                
                // Process game data
                processGameData(data);
                
                // Update UI
                updateUI();
            })
            .catch(error => {
                console.error('Error fetching game results:', error);
                showNotification('Failed to load game results', 'error');
            });
    }
    
    // Process game data
    function processGameData(data) {
        // Room info
        gameData.roomName = data.name || 'Shadow Heist';
        
        // Winner info
        const gameState = data.gameState || {};
        gameData.winner = gameState.winner || 'unknown';
        
        // Player data
        const players = data.players || {};
        for (const [playerId, player] of Object.entries(players)) {
            if (player.status !== 'disconnected') {
                gameData.players[playerId] = {
                    id: playerId,
                    username: player.username,
                    imageUrl: player.imageUrl,
                    role: gameState.roles ? gameState.roles[playerId] : 'unknown',
                    status: player.status || 'survived',
                    alignment: getRoleAlignment(gameState.roles ? gameState.roles[playerId] : 'unknown')
                };
            }
        }
        
        // Stats data
        gameData.stats = {
            totalPlayers: Object.keys(gameData.players).length,
            totalRounds: gameState.round || 0,
            tasksCompleted: gameState.completedTasks || 0,
            tasksSabotaged: gameState.sabotages || 0,
            votesCount: gameState.totalVotes || 0,
            eliminations: gameState.eliminations?.length || 0,
            gameDuration: formatDuration(data.endTime ? data.endTime - data.startTime : 0)
        };
        
        // Timeline data
        if (data.log) {
            const logEntries = Object.values(data.log);
            logEntries.sort((a, b) => a.timestamp - b.timestamp);
            
            // Convert log to timeline events
            gameData.timeline = logEntries.map(log => {
                return {
                    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    phase: getPhaseFromLogType(log.type),
                    description: log.message
                };
            });
        }
    }
    
    // Get role alignment
    function getRoleAlignment(role) {
        if (!role || role === 'unknown') return 'neutral';
        
        const roleData = GAME_CONSTANTS.ROLES[role];
        return roleData ? roleData.alignment : 'neutral';
    }
    
    // Get phase from log type
    function getPhaseFromLogType(type) {
        switch (type) {
            case 'night':
                return 'Night Phase';
            case 'day':
                return 'Day Phase';
            case 'task':
                return 'Task Phase';
            case 'vote':
                return 'Voting';
            case 'system':
                return 'Game Event';
            case 'reveal':
                return 'Reveal';
            case 'sabotage':
                return 'Sabotage';
            default:
                return 'Game Event';
        }
    }
    
    // Format duration in milliseconds to readable time
    function formatDuration(ms) {
        if (!ms) return '0:00';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    // Update UI with game results
    function updateUI() {
        // Update room name
        roomNameEl.textContent = gameData.roomName;
        
        // Update winner banner
        updateWinnerBanner();
        
        // Update roles grid
        updateRolesGrid();
        
        // Update stats list
        updateStatsList();
        
        // Update timeline
        updateTimeline();
    }
    
    // Update winner banner
    function updateWinnerBanner() {
        let bannerText = 'Game Over!';
        let bannerClass = '';
        
        if (gameData.winner === 'heroes') {
            bannerText = 'Heroes Win! The Heist Was Successful';
            bannerClass = 'hero-win';
        } else if (gameData.winner === 'traitors') {
            bannerText = 'Traitors Win! The Heist Was Sabotaged';
            bannerClass = 'traitor-win';
        }
        
        winnerBannerEl.textContent = bannerText;
        winnerBannerEl.className = `winner-banner ${bannerClass}`;
    }
    
    // Update roles grid
    function updateRolesGrid() {
        rolesGridEl.innerHTML = '';
        
        for (const player of Object.values(gameData.players)) {
            const roleData = GAME_CONSTANTS.ROLES[player.role] || {
                name: 'Unknown',
                description: 'Role information unavailable'
            };
            
            const roleCard = document.createElement('div');
            roleCard.className = `player-role-card ${player.alignment}`;
            
            roleCard.innerHTML = `
                <div class="player-avatar" style="background-image: url('${player.imageUrl || 'public/assets/images/default-avatar.png'}')"></div>
                <div class="player-info">
                    <div class="player-name">${player.username}</div>
                    <div class="player-role">${roleData.name}</div>
                    <div class="player-status ${player.status}">${player.status === 'dead' ? 'Eliminated' : 'Survived'}</div>
                </div>
            `;
            
            rolesGridEl.appendChild(roleCard);
        }
    }
    
    // Update stats list
    function updateStatsList() {
        statsListEl.innerHTML = '';
        
        const stats = [
            { label: 'Players', value: gameData.stats.totalPlayers },
            { label: 'Game Duration', value: gameData.stats.gameDuration },
            { label: 'Tasks Completed', value: gameData.stats.tasksCompleted },
            { label: 'Tasks Sabotaged', value: gameData.stats.tasksSabotaged },
            { label: 'Eliminations', value: gameData.stats.eliminations },
            { label: 'Total Votes Cast', value: gameData.stats.votesCount }
        ];
        
        for (const stat of stats) {
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            
            statItem.innerHTML = `
                <div class="stat-label">${stat.label}</div>
                <div class="stat-value">${stat.value}</div>
            `;
            
            statsListEl.appendChild(statItem);
        }
    }
    
    // Update timeline
    function updateTimeline() {
        timelineEl.innerHTML = '';
        
        for (const event of gameData.timeline) {
            const timelineEvent = document.createElement('div');
            timelineEvent.className = 'timeline-event';
            
            timelineEvent.innerHTML = `
                <div class="event-time">${event.time}</div>
                <div class="event-phase">${event.phase}</div>
                <div class="event-description">${event.description}</div>
            `;
            
            timelineEl.appendChild(timelineEvent);
        }
        
        // If no events, show message
        if (gameData.timeline.length === 0) {
            const noEventsMsg = document.createElement('div');
            noEventsMsg.className = 'timeline-event';
            noEventsMsg.innerHTML = `
                <div class="event-description">No events recorded for this game.</div>
            `;
            timelineEl.appendChild(noEventsMsg);
        }
    }
    
    // Handle rematch request
    function handleRematch() {
        if (!currentUser) return;
        
        // Check if user is in the player list and the game is over
        const isPlayerInGame = Object.keys(gameData.players).includes(currentUser.id);
        
        if (!isPlayerInGame) {
            showNotification('You must have played in the game to request a rematch', 'error');
            return;
        }
        
        // Update rematch requests in Firebase
        const rematchRequestRef = database.ref(`rooms/${roomId}/rematchRequests/${currentUser.id}`);
        
        rematchRequestRef.set({
            username: currentUser.username,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            showNotification('Rematch request sent', 'success');
            rematchBtn.disabled = true;
            rematchBtn.textContent = 'Rematch Requested';
        }).catch(error => {
            console.error('Error requesting rematch:', error);
            showNotification('Failed to request rematch', 'error');
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
                init();
            } else {
                window.location.href = 'index.html';
            }
        }
    }, 100);
}); 