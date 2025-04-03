/**
 * Shadow Heist Online - Game Synchronization
 * Real-time game state synchronization using Firebase
 */

// Game Sync Module with advanced real-time synchronization
const ShadowHeistGameSync = (function() {
    // Game session data
    let currentSession = null;
    let currentGameId = null;
    let currentRole = null;
    let isPlayerAlive = true;
    let roleAssigned = false;
    let syncSubscriptions = [];
    
    // Callbacks for state changes
    let gameStateCallbacks = [];
    let playerStateCallbacks = [];
    let chatMessageCallbacks = [];
    let gameEventCallbacks = [];
    
    /**
     * Initialize game sync with Firebase
     */
    function init() {
        // Check if Firebase and FirebaseService are available
        if (!window.firebase || !window.FirebaseService) {
            console.error("Firebase not available. Game sync cannot initialize.");
            return;
        }
        
        console.log("Game sync initializing...");
        
        // Check if user is logged in
        const currentUser = FirebaseService.getCurrentUser();
        if (!currentUser) {
            console.warn("User not logged in. Game sync waiting for authentication.");
            
            // Wait for auth to be initialized
            document.addEventListener('auth-initialized', checkCurrentSession);
        } else {
            // User already logged in, check if they're in a game
            checkCurrentSession();
        }
    }
    
    /**
     * Check if user is currently in a game session
     */
    function checkCurrentSession() {
        const userId = FirebaseService.getCurrentUserId();
        if (!userId) return;
        
        console.log("Checking for current game session...");
        
        // Get user's current session ID from Firebase
        FirebaseService.getData(`/users/${userId}/status/currentGameId`)
            .then(gameId => {
                if (gameId) {
                    console.log(`Found active session: ${gameId}`);
                    // User is in a game, sync with it
                    joinGameSync(gameId);
                } else {
                    console.log("No active game session found");
                }
            })
            .catch(error => {
                console.error("Error checking current session:", error);
            });
    }
    
    /**
     * Join and sync with a game session
     * @param {string} gameId - Game session ID to join
     */
    function joinGameSync(gameId) {
        if (!gameId) {
            console.error("Invalid game ID");
            return;
        }
        
        // Set current game ID
        currentGameId = gameId;
        
        // Load initial game data
        FirebaseService.getData(`/gameSessions/${gameId}`)
            .then(sessionData => {
                if (!sessionData) {
                    console.error(`Game session ${gameId} not found`);
                    return;
                }
                
                // Store the current session
                currentSession = sessionData;
                
                // Set up real-time listeners
                setupSessionListeners(gameId);
                
                // Find current player in session
                findCurrentPlayerRole(sessionData);
                
                // Notify game state callbacks
                notifyGameStateChanged(sessionData);
                
                console.log(`Successfully synchronized with game session ${gameId}`);
            })
            .catch(error => {
                console.error("Error joining game sync:", error);
            });
    }
    
    /**
     * Leave the current game session sync
     */
    function leaveGameSync() {
        if (!currentGameId) return;
        
        console.log(`Leaving game sync for session ${currentGameId}`);
        
        // Remove all listeners
        removeAllSessionListeners();
        
        // Reset state
        currentGameId = null;
        currentSession = null;
        currentRole = null;
        isPlayerAlive = true;
        roleAssigned = false;
        
        console.log("Successfully left game sync");
    }
    
    /**
     * Setup all real-time listeners for the game session
     * @param {string} gameId - Game session ID
     */
    function setupSessionListeners(gameId) {
        // Remove any existing listeners first
        removeAllSessionListeners();
        
        // Listen for game state changes
        const gameStateListener = FirebaseService.addRealtimeListener(
            `/gameSessions/${gameId}/state`,
            'value',
            handleGameStateChange
        );
        syncSubscriptions.push(gameStateListener);
        
        // Listen for player changes
        const playersListener = FirebaseService.addRealtimeListener(
            `/gameSessions/${gameId}/players`,
            'value',
            handlePlayersChange
        );
        syncSubscriptions.push(playersListener);
        
        // Listen for new chat messages
        const chatListener = FirebaseService.addRealtimeListener(
            `/gameSessions/${gameId}/chat`,
            'child_added',
            handleNewChatMessage
        );
        syncSubscriptions.push(chatListener);
        
        // Listen for new game events
        const eventsListener = FirebaseService.addRealtimeListener(
            `/gameSessions/${gameId}/events`,
            'child_added',
            handleNewGameEvent
        );
        syncSubscriptions.push(eventsListener);
        
        console.log("Game session listeners set up successfully");
    }
    
    /**
     * Remove all session listeners
     */
    function removeAllSessionListeners() {
        // Call each unsubscribe function
        syncSubscriptions.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        
        // Clear the array
        syncSubscriptions = [];
        
        console.log("All game session listeners removed");
    }
    
    /**
     * Find the current player's role in session
     * @param {Object} sessionData - Game session data
     */
    function findCurrentPlayerRole(sessionData) {
        const userId = FirebaseService.getCurrentUserId();
        if (!userId || !sessionData || !sessionData.players) return;
        
        // Find player in session
        const playerEntries = Object.entries(sessionData.players);
        
        for (const [playerId, playerData] of playerEntries) {
            if (playerData.userId === userId) {
                // Found current player
                isPlayerAlive = playerData.alive !== false; // Default to true if not set
                
                if (playerData.role) {
                    roleAssigned = true;
                    currentRole = playerData.role;
                    
                    // Dispatch role assigned event
                    const event = new CustomEvent('role_assigned', {
                        detail: { role: currentRole, team: playerData.team }
                    });
                    document.dispatchEvent(event);
                    
                    console.log(`Player role found: ${currentRole}`);
                }
                
                // Notify player state changed
                notifyPlayerStateChanged(playerData);
                
                break;
            }
        }
    }
    
    /**
     * Handle game state changes
     * @param {Object} snapshot - Firebase data snapshot
     */
    function handleGameStateChange(snapshot) {
        const newState = snapshot.val();
        if (!newState) return;
        
        // Update current session state
        if (currentSession) {
            currentSession.state = newState;
        }
        
        console.log("Game state updated:", newState.phase);
        
        // If phase changed, dispatch event
        if (newState.phase) {
            const event = new CustomEvent('game_phase_changed', {
                detail: { phase: newState.phase }
            });
            document.dispatchEvent(event);
        }
        
        // Notify all callbacks
        notifyGameStateChanged(currentSession);
    }
    
    /**
     * Handle players data changes
     * @param {Object} snapshot - Firebase data snapshot
     */
    function handlePlayersChange(snapshot) {
        const players = snapshot.val();
        if (!players) return;
        
        // Update current session players
        if (currentSession) {
            currentSession.players = players;
        }
        
        console.log("Players data updated");
        
        // Find current player data
        const userId = FirebaseService.getCurrentUserId();
        if (!userId) return;
        
        let currentPlayerData = null;
        
        for (const playerId in players) {
            if (players[playerId].userId === userId) {
                currentPlayerData = players[playerId];
                
                // Check if role was assigned
                if (currentPlayerData.role && !roleAssigned) {
                    roleAssigned = true;
                    currentRole = currentPlayerData.role;
                    
                    // Dispatch role assigned event
                    const event = new CustomEvent('role_assigned', {
                        detail: { role: currentRole, team: currentPlayerData.team }
                    });
                    document.dispatchEvent(event);
                    
                    console.log(`Player role assigned: ${currentRole}`);
                }
                
                // Check if player died
                if (isPlayerAlive && !currentPlayerData.alive) {
                    isPlayerAlive = false;
                    
                    // Dispatch player died event
                    const event = new CustomEvent('player_died');
                    document.dispatchEvent(event);
                    
                    console.log("Player has died");
                }
                
                // Update player state
                notifyPlayerStateChanged(currentPlayerData);
                break;
            }
        }
    }
    
    /**
     * Handle new chat message
     * @param {Object} snapshot - Firebase data snapshot
     */
    function handleNewChatMessage(snapshot) {
        const message = snapshot.val();
        if (!message) return;
        
        // Add message ID to the object
        message.id = snapshot.key;
        
        console.log(`New chat message: ${message.type}`);
        
        // Notify chat message callbacks
        notifyChatMessageReceived(message);
    }
    
    /**
     * Handle new game event
     * @param {Object} snapshot - Firebase data snapshot
     */
    function handleNewGameEvent(snapshot) {
        const event = snapshot.val();
        if (!event) return;
        
        // Add event ID to the object
        event.id = snapshot.key;
        
        console.log(`New game event: ${event.type}`);
        
        // Notify game event callbacks
        notifyGameEventReceived(event);
    }
    
    /**
     * Send a chat message to the current game session
     * @param {string} message - Message content
     * @param {string} type - Message type (team, global, etc.)
     * @param {string} [targetId] - Target player ID for private messages
     * @return {Promise} - Resolves when message is sent
     */
    function sendChatMessage(message, type, targetId = null) {
        if (!currentGameId || !message || !type) {
            return Promise.reject(new Error("Invalid parameters or not in a game"));
        }
        
        const userId = FirebaseService.getCurrentUserId();
        if (!userId) {
            return Promise.reject(new Error("User not logged in"));
        }
        
        // Create message object
        const messageData = {
            senderId: userId,
            type: type,
            message: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            isDead: !isPlayerAlive
        };
        
        // Add target ID for private messages
        if (type === 'private' && targetId) {
            messageData.targetId = targetId;
        }
        
        // Add to Firebase
        return FirebaseService.pushData(`/gameSessions/${currentGameId}/chat`, messageData);
    }
    
    /**
     * Perform a game action
     * @param {string} actionType - Action type to perform
     * @param {Object} actionData - Action data
     * @return {Promise} - Resolves when action is processed
     */
    function performGameAction(actionType, actionData = {}) {
        if (!currentGameId || !actionType) {
            return Promise.reject(new Error("Invalid parameters or not in a game"));
        }
        
        const userId = FirebaseService.getCurrentUserId();
        if (!userId) {
            return Promise.reject(new Error("User not logged in"));
        }
        
        console.log(`Performing game action: ${actionType}`);
        
        // Create action based on type
        switch (actionType) {
            case 'vote': {
                if (!actionData.targetId) {
                    return Promise.reject(new Error("Target player required for vote action"));
                }
                
                // Add vote to Firebase
                return FirebaseService.pushData(`/gameSessions/${currentGameId}/votes`, {
                    voterId: userId,
                    targetId: actionData.targetId,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                }).then(() => {
                    // Add event log
                    return addGameEvent('VOTE', {
                        playerId: userId,
                        targetId: actionData.targetId,
                        message: `Player voted against another player`
                    });
                });
            }
            
            case 'useAbility': {
                if (!actionData.ability || !actionData.targetId) {
                    return Promise.reject(new Error("Ability and target required"));
                }
                
                // Add ability use to Firebase
                return FirebaseService.pushData(`/gameSessions/${currentGameId}/abilityUses`, {
                    playerId: userId,
                    ability: actionData.ability,
                    targetId: actionData.targetId,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                }).then(() => {
                    // Add event log
                    return addGameEvent('ABILITY_USE', {
                        playerId: userId,
                        targetId: actionData.targetId,
                        ability: actionData.ability,
                        message: `Player used an ability`
                    });
                });
            }
            
            case 'completeTask': {
                if (!actionData.taskId) {
                    return Promise.reject(new Error("Task ID required"));
                }
                
                // Mark task as completed
                return FirebaseService.updateData(
                    `/gameSessions/${currentGameId}/tasks/${actionData.taskId}`,
                    { completed: true, completedBy: userId, completedAt: firebase.database.ServerValue.TIMESTAMP }
                ).then(() => {
                    // Increment player's completed tasks counter
                    const playerPath = findPlayerPath(userId);
                    if (playerPath) {
                        return FirebaseService.getData(`${playerPath}/stats/tasksCompleted`)
                            .then(count => {
                                const newCount = (count || 0) + 1;
                                return FirebaseService.updateData(`${playerPath}/stats`, {
                                    tasksCompleted: newCount
                                });
                            });
                    }
                }).then(() => {
                    // Increment total completed tasks
                    return incrementTasksCompleted();
                }).then(() => {
                    // Add event log
                    return addGameEvent('TASK_COMPLETE', {
                        playerId: userId,
                        taskId: actionData.taskId,
                        message: `Player completed a task`
                    });
                });
            }
            
            case 'sabotage': {
                if (!actionData.sabotageType) {
                    return Promise.reject(new Error("Sabotage type required"));
                }
                
                // Calculate end time (usually 30-60 seconds)
                const duration = actionData.duration || 45; // seconds
                const endsAt = Date.now() + (duration * 1000);
                
                // Update game state with sabotage
                return FirebaseService.updateData(`/gameSessions/${currentGameId}/state`, {
                    sabotageActive: true,
                    sabotageType: actionData.sabotageType,
                    sabotageEndsAt: endsAt
                }).then(() => {
                    // Add event log
                    return addGameEvent('SABOTAGE', {
                        playerId: userId,
                        sabotageType: actionData.sabotageType,
                        message: `Player initiated a sabotage`
                    });
                });
            }
            
            case 'fixSabotage': {
                if (!actionData.sabotageType) {
                    return Promise.reject(new Error("Sabotage type required"));
                }
                
                // Update game state to clear sabotage
                return FirebaseService.updateData(`/gameSessions/${currentGameId}/state`, {
                    sabotageActive: false,
                    sabotageType: null,
                    sabotageEndsAt: null
                }).then(() => {
                    // Add event log
                    return addGameEvent('SABOTAGE_FIX', {
                        playerId: userId,
                        sabotageType: actionData.sabotageType,
                        message: `Player fixed a sabotage`
                    });
                });
            }
            
            case 'readyUp': {
                const playerPath = findPlayerPath(userId);
                if (!playerPath) {
                    return Promise.reject(new Error("Player not found in session"));
                }
                
                // Set player as ready
                return FirebaseService.updateData(playerPath, {
                    ready: true
                });
            }
            
            default:
                return Promise.reject(new Error(`Unknown action type: ${actionType}`));
        }
    }
    
    /**
     * Add a game event to the event log
     * @param {string} type - Event type
     * @param {Object} data - Event data
     * @return {Promise} - Resolves when event is added
     */
    function addGameEvent(type, data) {
        if (!currentGameId || !type) {
            return Promise.reject(new Error("Invalid parameters or not in a game"));
        }
        
        // Create event object
        const eventData = {
            type: type,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            ...data
        };
        
        // Add to Firebase
        return FirebaseService.pushData(`/gameSessions/${currentGameId}/events`, eventData);
    }
    
    /**
     * Increment the tasks completed counter
     * @return {Promise} - Resolves when counter is updated
     */
    function incrementTasksCompleted() {
        return FirebaseService.getData(`/gameSessions/${currentGameId}/state/tasksCompleted`)
            .then(count => {
                const newCount = (count || 0) + 1;
                return FirebaseService.updateData(`/gameSessions/${currentGameId}/state`, {
                    tasksCompleted: newCount
                });
            });
    }
    
    /**
     * Find the database path for a player in the current session
     * @param {string} userId - User ID to find
     * @return {string|null} - Database path or null if not found
     */
    function findPlayerPath(userId) {
        if (!currentSession || !currentSession.players || !userId) return null;
        
        // Find player entry
        for (const playerId in currentSession.players) {
            if (currentSession.players[playerId].userId === userId) {
                return `/gameSessions/${currentGameId}/players/${playerId}`;
            }
        }
        
        return null;
    }
    
    /**
     * Register callback for game state changes
     * @param {Function} callback - Callback function(sessionData)
     * @return {Function} - Unregister function
     */
    function onGameStateChanged(callback) {
        if (typeof callback !== 'function') return () => {};
        
        gameStateCallbacks.push(callback);
        
        // If we already have session data, call the callback immediately
        if (currentSession) {
            callback(currentSession);
        }
        
        // Return unregister function
        return () => {
            const index = gameStateCallbacks.indexOf(callback);
            if (index !== -1) {
                gameStateCallbacks.splice(index, 1);
            }
        };
    }
    
    /**
     * Register callback for player state changes
     * @param {Function} callback - Callback function(playerData)
     * @return {Function} - Unregister function
     */
    function onPlayerStateChanged(callback) {
        if (typeof callback !== 'function') return () => {};
        
        playerStateCallbacks.push(callback);
        
        // Return unregister function
        return () => {
            const index = playerStateCallbacks.indexOf(callback);
            if (index !== -1) {
                playerStateCallbacks.splice(index, 1);
            }
        };
    }
    
    /**
     * Register callback for chat messages
     * @param {Function} callback - Callback function(message)
     * @return {Function} - Unregister function
     */
    function onChatMessageReceived(callback) {
        if (typeof callback !== 'function') return () => {};
        
        chatMessageCallbacks.push(callback);
        
        // Return unregister function
        return () => {
            const index = chatMessageCallbacks.indexOf(callback);
            if (index !== -1) {
                chatMessageCallbacks.splice(index, 1);
            }
        };
    }
    
    /**
     * Register callback for game events
     * @param {Function} callback - Callback function(event)
     * @return {Function} - Unregister function
     */
    function onGameEventReceived(callback) {
        if (typeof callback !== 'function') return () => {};
        
        gameEventCallbacks.push(callback);
        
        // Return unregister function
        return () => {
            const index = gameEventCallbacks.indexOf(callback);
            if (index !== -1) {
                gameEventCallbacks.splice(index, 1);
            }
        };
    }
    
    /**
     * Notify all game state callbacks
     * @param {Object} sessionData - Current session data
     */
    function notifyGameStateChanged(sessionData) {
        gameStateCallbacks.forEach(callback => {
            try {
                callback(sessionData);
            } catch (error) {
                console.error("Error in game state callback:", error);
            }
        });
    }
    
    /**
     * Notify all player state callbacks
     * @param {Object} playerData - Current player data
     */
    function notifyPlayerStateChanged(playerData) {
        playerStateCallbacks.forEach(callback => {
            try {
                callback(playerData);
            } catch (error) {
                console.error("Error in player state callback:", error);
            }
        });
    }
    
    /**
     * Notify all chat message callbacks
     * @param {Object} message - Chat message
     */
    function notifyChatMessageReceived(message) {
        chatMessageCallbacks.forEach(callback => {
            try {
                callback(message);
            } catch (error) {
                console.error("Error in chat message callback:", error);
            }
        });
    }
    
    /**
     * Notify all game event callbacks
     * @param {Object} event - Game event
     */
    function notifyGameEventReceived(event) {
        gameEventCallbacks.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error("Error in game event callback:", error);
            }
        });
    }
    
    /**
     * Get the current game session data
     * @return {Object|null} - Current session data
     */
    function getCurrentSessionData() {
        return currentSession;
    }
    
    /**
     * Get the current player's role
     * @return {string|null} - Current role
     */
    function getCurrentRole() {
        return currentRole;
    }
    
    /**
     * Check if the current player is alive
     * @return {boolean} - Whether player is alive
     */
    function isAlive() {
        return isPlayerAlive;
    }
    
    // Public API
    return {
        init,
        joinGameSync,
        leaveGameSync,
        sendChatMessage,
        performGameAction,
        getCurrentSessionData,
        getCurrentRole,
        isAlive,
        onGameStateChanged,
        onPlayerStateChanged,
        onChatMessageReceived,
        onGameEventReceived
    };
})();

// Initialize game sync when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize after Firebase is ready
    if (window.FirebaseService) {
        ShadowHeistGameSync.init();
    } else {
        // Wait for Firebase to initialize
        document.addEventListener('firebase-ready', () => {
            ShadowHeistGameSync.init();
        });
    }
    
    // Make available globally
    window.ShadowHeistGameSync = ShadowHeistGameSync;
}); 