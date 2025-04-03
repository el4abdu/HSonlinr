/**
 * Shadow Heist Online - Firebase Service
 * Handles all Firebase operations, authentication, and database interactions
 */

// Firebase Service Singleton
const FirebaseService = (function() {
    // Private variables
    let _initialized = false;
    let _currentUser = null;
    let _playerData = null;
    let _onAuthStateChangedListeners = [];
    let _onPlayerDataChangedListeners = [];
    
    // Initialize Firebase with config from config.js
    function init() {
        if (_initialized) return;
        
        try {
            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(config.FIREBASE_CONFIG);
            }
            
            // Set up authentication listener
            firebase.auth().onAuthStateChanged(handleAuthStateChanged);
            
            console.log("Firebase Service initialized successfully");
            _initialized = true;
            
            // Dispatch event for other modules to know Firebase is ready
            document.dispatchEvent(new CustomEvent('firebase-initialized'));
        } catch (error) {
            console.error("Error initializing Firebase:", error);
        }
    }
    
    // Handle authentication state changes
    function handleAuthStateChanged(user) {
        _currentUser = user;
        
        if (user) {
            console.log("User authenticated:", user.uid);
            loadPlayerData(user.uid);
        } else {
            console.log("User signed out");
            _playerData = null;
            
            // Notify listeners about auth state change
            notifyAuthStateChangedListeners(null);
        }
    }
    
    // Load player data from Firebase
    function loadPlayerData(userId) {
        const userRef = firebase.database().ref(`players/${userId}`);
        
        // One-time initial load
        userRef.once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    _playerData = snapshot.val();
                    console.log("Player data loaded:", _playerData);
                    
                    // Notify listeners
                    notifyAuthStateChangedListeners(_currentUser);
                    notifyPlayerDataChangedListeners(_playerData);
                    
                    // Setup real-time listener
                    setupPlayerDataListener(userId);
                } else {
                    console.log("No player profile found, creating new one");
                    createNewPlayerProfile(userId);
                }
            })
            .catch(error => {
                console.error("Error loading player data:", error);
            });
    }
    
    // Setup real-time listener for player data changes
    function setupPlayerDataListener(userId) {
        const userRef = firebase.database().ref(`players/${userId}`);
        
        // Remove any existing listeners
        userRef.off();
        
        // Add new listener
        userRef.on('value', snapshot => {
            if (snapshot.exists()) {
                _playerData = snapshot.val();
                
                // Notify listeners
                notifyPlayerDataChangedListeners(_playerData);
            }
        });
    }
    
    // Create a new player profile
    function createNewPlayerProfile(userId) {
        // Generate a random player ID
        const playerId = generatePlayerId();
        
        // Get user details from Clerk or Firebase Auth
        let displayName = "Agent";
        let email = "";
        
        if (_currentUser) {
            displayName = _currentUser.displayName || "Agent";
            email = _currentUser.email || "";
        }
        
        // Create new player object
        const newPlayer = {
            userId: userId,
            playerId: playerId,
            displayName: displayName,
            email: email,
            created: firebase.database.ServerValue.TIMESTAMP,
            lastLogin: firebase.database.ServerValue.TIMESTAMP,
            level: 1,
            xp: 0,
            avatarId: Math.floor(Math.random() * 6) + 1, // Random avatar 1-6
            stats: {
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                tasksCompleted: 0,
                traitorWins: 0,
                civilianWins: 0
            },
            gameHistory: [],
            friends: {},
            achievements: {},
            settings: {
                theme: 'dark',
                soundEnabled: true,
                musicEnabled: true
            }
        };
        
        // Save to Firebase
        firebase.database().ref(`players/${userId}`).set(newPlayer)
            .then(() => {
                console.log("Player profile created successfully");
                _playerData = newPlayer;
                
                // Notify listeners
                notifyAuthStateChangedListeners(_currentUser);
                notifyPlayerDataChangedListeners(_playerData);
                
                // Setup real-time listener
                setupPlayerDataListener(userId);
            })
            .catch(error => {
                console.error("Error creating player profile:", error);
            });
    }
    
    // Generate a unique player ID
    function generatePlayerId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = '';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }
    
    // Update player data
    function updatePlayerData(updates) {
        if (!_currentUser) {
            console.error("Cannot update player data: User not authenticated");
            return Promise.reject("User not authenticated");
        }
        
        const userId = _currentUser.uid;
        const updateObject = {};
        
        // Convert simple updates object to Firebase update paths
        for (const key in updates) {
            updateObject[`players/${userId}/${key}`] = updates[key];
        }
        
        // Update last modified timestamp
        updateObject[`players/${userId}/lastModified`] = firebase.database.ServerValue.TIMESTAMP;
        
        // Send updates
        return firebase.database().ref().update(updateObject)
            .then(() => {
                console.log("Player data updated successfully");
                return true;
            })
            .catch(error => {
                console.error("Error updating player data:", error);
                return Promise.reject(error);
            });
    }
    
    // Update specific player stats
    function updatePlayerStats(statsUpdates) {
        if (!_currentUser || !_playerData) {
            console.error("Cannot update stats: User not authenticated or player data not loaded");
            return Promise.reject("User not authenticated or player data not loaded");
        }
        
        const updates = {};
        for (const key in statsUpdates) {
            updates[`stats/${key}`] = statsUpdates[key];
        }
        
        return updatePlayerData(updates);
    }
    
    // Add XP to player
    function addPlayerXP(xpAmount) {
        if (!_currentUser || !_playerData) {
            console.error("Cannot add XP: User not authenticated or player data not loaded");
            return Promise.reject("User not authenticated or player data not loaded");
        }
        
        const currentXP = _playerData.xp || 0;
        const currentLevel = _playerData.level || 1;
        
        let newXP = currentXP + xpAmount;
        let newLevel = currentLevel;
        
        // Check for level up
        while (newXP >= getXPForNextLevel(newLevel)) {
            newLevel++;
            console.log(`Player leveled up to ${newLevel}!`);
        }
        
        return updatePlayerData({
            xp: newXP,
            level: newLevel
        });
    }
    
    // Calculate XP needed for next level
    function getXPForNextLevel(currentLevel) {
        // XP formula: 100 * level^2
        return 100 * Math.pow(currentLevel + 1, 2);
    }
    
    // Add a friend connection
    function addFriend(friendId) {
        if (!_currentUser || !_playerData) {
            console.error("Cannot add friend: User not authenticated or player data not loaded");
            return Promise.reject("User not authenticated or player data not loaded");
        }
        
        // First check if friend exists
        return firebase.database().ref(`players`).orderByChild('playerId').equalTo(friendId).once('value')
            .then(snapshot => {
                if (!snapshot.exists()) {
                    return Promise.reject("Friend ID not found");
                }
                
                // Get the friend's userId
                let friendUserId = null;
                snapshot.forEach(child => {
                    friendUserId = child.key;
                });
                
                if (!friendUserId) {
                    return Promise.reject("Friend user ID not found");
                }
                
                // Add as friend on both sides
                const updates = {};
                
                // My friend list
                updates[`players/${_currentUser.uid}/friends/${friendUserId}`] = {
                    added: firebase.database.ServerValue.TIMESTAMP,
                    status: 'active'
                };
                
                // Their friend list
                updates[`players/${friendUserId}/friends/${_currentUser.uid}`] = {
                    added: firebase.database.ServerValue.TIMESTAMP,
                    status: 'active'
                };
                
                return firebase.database().ref().update(updates);
            })
            .then(() => {
                console.log("Friend added successfully");
                return true;
            })
            .catch(error => {
                console.error("Error adding friend:", error);
                return Promise.reject(error);
            });
    }
    
    // Get current player's friends
    function getFriends() {
        if (!_currentUser || !_playerData) {
            console.error("Cannot get friends: User not authenticated or player data not loaded");
            return Promise.reject("User not authenticated or player data not loaded");
        }
        
        if (!_playerData.friends) {
            return Promise.resolve([]);
        }
        
        const friendPromises = [];
        
        // For each friend, get their data
        for (const friendUserId in _playerData.friends) {
            const promise = firebase.database().ref(`players/${friendUserId}`).once('value')
                .then(snapshot => {
                    if (snapshot.exists()) {
                        const friendData = snapshot.val();
                        return {
                            userId: friendUserId,
                            playerId: friendData.playerId,
                            displayName: friendData.displayName,
                            avatarId: friendData.avatarId,
                            level: friendData.level,
                            lastLogin: friendData.lastLogin,
                            status: _playerData.friends[friendUserId].status
                        };
                    }
                    return null;
                });
            
            friendPromises.push(promise);
        }
        
        return Promise.all(friendPromises)
            .then(friends => {
                // Filter out null values and sort by name
                return friends.filter(friend => friend !== null)
                    .sort((a, b) => a.displayName.localeCompare(b.displayName));
            });
    }
    
    // Save game result
    function saveGameResult(gameResult) {
        if (!_currentUser || !_playerData) {
            console.error("Cannot save game result: User not authenticated or player data not loaded");
            return Promise.reject("User not authenticated or player data not loaded");
        }
        
        // Create game history entry
        const gameEntry = {
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            role: gameResult.role,
            outcome: gameResult.outcome,
            map: gameResult.map,
            players: gameResult.players || [],
            tasksCompleted: gameResult.tasksCompleted || 0,
            xpEarned: gameResult.xpEarned || 0
        };
        
        // Stats updates
        const statsUpdates = {
            gamesPlayed: (_playerData.stats?.gamesPlayed || 0) + 1
        };
        
        // Update win/loss records
        if (gameResult.outcome === 'win') {
            statsUpdates.wins = (_playerData.stats?.wins || 0) + 1;
            
            // Track wins by role type
            if (gameResult.role === 'INFILTRATOR' || gameResult.role === 'DOUBLE_AGENT') {
                statsUpdates.traitorWins = (_playerData.stats?.traitorWins || 0) + 1;
            } else {
                statsUpdates.civilianWins = (_playerData.stats?.civilianWins || 0) + 1;
            }
        } else {
            statsUpdates.losses = (_playerData.stats?.losses || 0) + 1;
        }
        
        // Track tasks completed
        if (gameResult.tasksCompleted) {
            statsUpdates.tasksCompleted = (_playerData.stats?.tasksCompleted || 0) + gameResult.tasksCompleted;
        }
        
        // Update the database
        const updates = {};
        
        // Update stats
        for (const key in statsUpdates) {
            updates[`players/${_currentUser.uid}/stats/${key}`] = statsUpdates[key];
        }
        
        // Add game to history
        const newGameKey = firebase.database().ref().child(`players/${_currentUser.uid}/gameHistory`).push().key;
        updates[`players/${_currentUser.uid}/gameHistory/${newGameKey}`] = gameEntry;
        
        // Add XP
        if (gameResult.xpEarned) {
            updates[`players/${_currentUser.uid}/xp`] = (_playerData.xp || 0) + gameResult.xpEarned;
            
            // Check for level up
            const currentLevel = _playerData.level || 1;
            const newTotalXP = (_playerData.xp || 0) + gameResult.xpEarned;
            let newLevel = currentLevel;
            
            while (newTotalXP >= getXPForNextLevel(newLevel)) {
                newLevel++;
            }
            
            if (newLevel > currentLevel) {
                updates[`players/${_currentUser.uid}/level`] = newLevel;
            }
        }
        
        // Save everything
        return firebase.database().ref().update(updates)
            .then(() => {
                console.log("Game result saved successfully");
                return true;
            })
            .catch(error => {
                console.error("Error saving game result:", error);
                return Promise.reject(error);
            });
    }
    
    // Update player settings
    function updateSettings(newSettings) {
        if (!_currentUser || !_playerData) {
            console.error("Cannot update settings: User not authenticated or player data not loaded");
            return Promise.reject("User not authenticated or player data not loaded");
        }
        
        const updates = {};
        for (const key in newSettings) {
            updates[`settings/${key}`] = newSettings[key];
        }
        
        return updatePlayerData(updates);
    }
    
    // Update player avatar
    function updateAvatar(avatarId) {
        if (!_currentUser || !_playerData) {
            console.error("Cannot update avatar: User not authenticated or player data not loaded");
            return Promise.reject("User not authenticated or player data not loaded");
        }
        
        return updatePlayerData({ avatarId: avatarId });
    }
    
    // Add listener for auth state changes
    function addAuthStateChangedListener(listener) {
        if (typeof listener === 'function') {
            _onAuthStateChangedListeners.push(listener);
            
            // Call immediately with current state if available
            if (_initialized) {
                listener(_currentUser);
            }
        }
    }
    
    // Remove listener for auth state changes
    function removeAuthStateChangedListener(listener) {
        const index = _onAuthStateChangedListeners.indexOf(listener);
        if (index !== -1) {
            _onAuthStateChangedListeners.splice(index, 1);
        }
    }
    
    // Add listener for player data changes
    function addPlayerDataChangedListener(listener) {
        if (typeof listener === 'function') {
            _onPlayerDataChangedListeners.push(listener);
            
            // Call immediately with current data if available
            if (_playerData) {
                listener(_playerData);
            }
        }
    }
    
    // Remove listener for player data changes
    function removePlayerDataChangedListener(listener) {
        const index = _onPlayerDataChangedListeners.indexOf(listener);
        if (index !== -1) {
            _onPlayerDataChangedListeners.splice(index, 1);
        }
    }
    
    // Notify all auth state change listeners
    function notifyAuthStateChangedListeners(user) {
        _onAuthStateChangedListeners.forEach(listener => {
            try {
                listener(user);
            } catch (error) {
                console.error("Error in auth state change listener:", error);
            }
        });
        
        // Also dispatch a DOM event for compatibility
        document.dispatchEvent(new CustomEvent('auth-initialized', { detail: { user } }));
    }
    
    // Notify all player data change listeners
    function notifyPlayerDataChangedListeners(data) {
        _onPlayerDataChangedListeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error("Error in player data change listener:", error);
            }
        });
        
        // Also dispatch a DOM event for compatibility
        document.dispatchEvent(new CustomEvent('player-data-changed', { detail: { data } }));
    }
    
    // Sign out
    function signOut() {
        return firebase.auth().signOut()
            .then(() => {
                console.log("User signed out");
                return true;
            })
            .catch(error => {
                console.error("Error signing out:", error);
                return Promise.reject(error);
            });
    }
    
    // Public API
    return {
        init,
        updatePlayerData,
        updatePlayerStats,
        addPlayerXP,
        addFriend,
        getFriends,
        saveGameResult,
        updateSettings,
        updateAvatar,
        addAuthStateChangedListener,
        removeAuthStateChangedListener,
        addPlayerDataChangedListener,
        removePlayerDataChangedListener,
        signOut,
        // Getters
        get currentUser() { return _currentUser; },
        get playerData() { return _playerData; },
        get initialized() { return _initialized; }
    };
})();

// Auto-initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize if config is available
    if (window.config) {
        FirebaseService.init();
    } else {
        // Wait for config to be available
        document.addEventListener('config-loaded', () => {
            FirebaseService.init();
        });
        
        // Safety timeout
        setTimeout(() => {
            if (!FirebaseService.initialized && window.config) {
                FirebaseService.init();
            }
        }, 2000);
    }
});

// Make available globally
window.FirebaseService = FirebaseService; 