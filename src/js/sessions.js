/**
 * Shadow Heist Online - Game Sessions Manager
 * Modern session handling and matchmaking for the 2025 gaming experience
 */

// Game Sessions Management Module
const ShadowHeistSessions = (function() {
    // Session states
    const SESSION_STATE = {
        LOBBY: 'lobby',
        LOADING: 'loading',
        IN_PROGRESS: 'in_progress',
        ROUND_END: 'round_end',
        GAME_END: 'game_end'
    };
    
    // Match types
    const MATCH_TYPE = {
        PUBLIC: 'public',
        PRIVATE: 'private',
        RANKED: 'ranked',
        TOURNAMENT: 'tournament'
    };
    
    // Internal data
    let currentSession = null;
    let availableSessions = [];
    let sessionListeners = [];
    let socket = null;
    
    // References to UI elements
    let elements = {
        sessionsList: null,
        createSessionBtn: null,
        joinSessionBtn: null,
        quickMatchBtn: null,
        sessionCodeInput: null,
        sessionFilters: null
    };
    
    /**
     * Initialize the sessions module
     */
    function init() {
        // Cache elements
        cacheElements();
        
        // Initialize session data if user is logged in
        if (window.firebase && window.firebase.auth().currentUser) {
            initializeSessionData();
        } else if (window.authInitialized) {
            // Auth is initialized but no user is logged in
            console.log('No user logged in. Session management limited.');
        } else {
            // Wait for auth to initialize
            document.addEventListener('auth-initialized', () => {
                if (window.firebase.auth().currentUser) {
                    initializeSessionData();
                }
            });
        }
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize socket connection for real-time updates
        initializeSocket();
    }
    
    /**
     * Cache DOM elements for better performance
     */
    function cacheElements() {
        elements.sessionsList = document.getElementById('sessions-list');
        elements.createSessionBtn = document.getElementById('create-session-btn');
        elements.joinSessionBtn = document.getElementById('join-session-btn');
        elements.quickMatchBtn = document.getElementById('quick-match-btn');
        elements.sessionCodeInput = document.getElementById('session-code-input');
        elements.sessionFilters = document.querySelectorAll('.session-filter');
    }
    
    /**
     * Initialize session data from Firebase
     */
    function initializeSessionData() {
        const userId = firebase.auth().currentUser.uid;
        
        // Check if user is in an active session
        firebase.database().ref(`/users/${userId}/currentSession`).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    const sessionId = snapshot.val();
                    loadSession(sessionId);
                }
            })
            .catch(error => {
                console.error('Error checking current session:', error);
                if (window.ShadowHeistUI) {
                    window.ShadowHeistUI.showNotification('Error loading session data', 'error');
                }
            });
        
        // Load available sessions
        loadAvailableSessions();
    }
    
    /**
     * Set up WebSocket connection for real-time updates
     */
    function initializeSocket() {
        // In a real app, you'd connect to your WebSocket server
        // For now, we'll simulate socket behavior
        
        // Create a simple event emitter for simulation
        socket = {
            connected: false,
            eventListeners: {},
            
            connect: function() {
                console.log('Connecting to game server...');
                setTimeout(() => {
                    this.connected = true;
                    this.emit('connect');
                    console.log('Connected to game server');
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
                // Simulate server response
                setTimeout(() => {
                    if (event === 'join_session') {
                        this.emit('session_joined', { 
                            success: true, 
                            sessionId: data.sessionId,
                            message: 'Successfully joined session' 
                        });
                    } else if (event === 'create_session') {
                        const sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
                        this.emit('session_created', { 
                            success: true, 
                            sessionId: sessionId,
                            sessionData: {
                                ...data.sessionData,
                                id: sessionId,
                                host: data.userId,
                                created: Date.now(),
                                players: [{ id: data.userId, ready: false }],
                                state: SESSION_STATE.LOBBY
                            }
                        });
                    }
                }, 800);
            }
        };
        
        // Connect
        socket.connect();
        
        // Set up event listeners
        socket.on('connect', () => {
            console.log('Connected to game server, ready to handle sessions');
        });
        
        socket.on('session_update', (sessionData) => {
            updateSessionData(sessionData);
        });
        
        socket.on('session_joined', (response) => {
            if (response.success) {
                loadSession(response.sessionId);
                notifyListeners('session_joined', response);
            } else {
                if (window.ShadowHeistUI) {
                    window.ShadowHeistUI.showNotification(response.message || 'Failed to join session', 'error');
                }
                notifyListeners('session_join_failed', response);
            }
        });
        
        socket.on('session_created', (response) => {
            if (response.success) {
                currentSession = response.sessionData;
                saveCurrentSession(response.sessionData.id);
                notifyListeners('session_created', response.sessionData);
            } else {
                if (window.ShadowHeistUI) {
                    window.ShadowHeistUI.showNotification(response.message || 'Failed to create session', 'error');
                }
                notifyListeners('session_create_failed', response);
            }
        });
        
        socket.on('player_joined', (data) => {
            if (currentSession && currentSession.id === data.sessionId) {
                // Update local session data
                if (!currentSession.players.find(p => p.id === data.player.id)) {
                    currentSession.players.push(data.player);
                    notifyListeners('player_joined', data.player);
                }
            }
        });
        
        socket.on('player_left', (data) => {
            if (currentSession && currentSession.id === data.sessionId) {
                // Update local session data
                currentSession.players = currentSession.players.filter(p => p.id !== data.playerId);
                notifyListeners('player_left', { playerId: data.playerId });
            }
        });
        
        socket.on('session_state_changed', (data) => {
            if (currentSession && currentSession.id === data.sessionId) {
                currentSession.state = data.state;
                notifyListeners('session_state_changed', { state: data.state });
            }
        });
    }
    
    /**
     * Set up event listeners for UI elements
     */
    function setupEventListeners() {
        // Create session button
        if (elements.createSessionBtn) {
            elements.createSessionBtn.addEventListener('click', () => {
                openCreateSessionModal();
            });
        }
        
        // Join session button
        if (elements.joinSessionBtn) {
            elements.joinSessionBtn.addEventListener('click', () => {
                if (elements.sessionCodeInput) {
                    const code = elements.sessionCodeInput.value.trim();
                    if (code) {
                        joinSession(code);
                    } else {
                        if (window.ShadowHeistUI) {
                            window.ShadowHeistUI.showNotification('Please enter a session code', 'warning');
                        }
                    }
                }
            });
        }
        
        // Quick match button
        if (elements.quickMatchBtn) {
            elements.quickMatchBtn.addEventListener('click', findQuickMatch);
        }
        
        // Session filters
        if (elements.sessionFilters) {
            elements.sessionFilters.forEach(filter => {
                filter.addEventListener('change', () => {
                    loadAvailableSessions();
                });
            });
        }
    }
    
    /**
     * Open modal to create a new session
     */
    function openCreateSessionModal() {
        if (window.ShadowHeistUI && window.ShadowHeistUI.showModal) {
            window.ShadowHeistUI.showModal('create-session-modal');
            
            // Set up submit handler if modal exists
            const modal = document.getElementById('create-session-modal');
            if (modal) {
                const form = modal.querySelector('form');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        
                        // Get form data
                        const formData = new FormData(form);
                        const sessionData = {
                            name: formData.get('session-name'),
                            map: formData.get('map'),
                            difficulty: formData.get('difficulty'),
                            maxPlayers: parseInt(formData.get('max-players')),
                            type: formData.get('session-type'),
                            isPrivate: formData.get('session-type') === 'private',
                            code: formData.get('session-type') === 'private' 
                                ? formData.get('private-code') || generateSessionCode() 
                                : null
                        };
                        
                        // Create session
                        createSession(sessionData);
                        
                        // Close modal
                        window.ShadowHeistUI.closeModal('create-session-modal');
                    });
                }
            }
        } else {
            // Fallback if UI module not available
            createSession({
                name: 'New Game Session',
                map: 'bank',
                difficulty: 'normal',
                maxPlayers: 8,
                type: MATCH_TYPE.PUBLIC,
                isPrivate: false
            });
        }
    }
    
    /**
     * Load available sessions from the server
     */
    function loadAvailableSessions() {
        if (!socket || !socket.connected) {
            console.log('Socket not connected, cannot load sessions');
            return;
        }
        
        // In a real app, you'd request sessions from the server
        // For now, we'll simulate with sample data
        
        // Get filter values if available
        let filters = {};
        if (elements.sessionFilters) {
            elements.sessionFilters.forEach(filter => {
                filters[filter.name] = filter.value;
            });
        }
        
        // Simulate network request
        if (window.ShadowHeistUI && elements.sessionsList) {
            window.ShadowHeistUI.showSpinner(elements.sessionsList);
        }
        
        setTimeout(() => {
            // Sample sessions data
            const sampleSessions = [
                {
                    id: 'sess_abc123',
                    name: 'Bank Heist Pro',
                    host: 'user_123',
                    hostName: 'NightShadow',
                    map: 'bank',
                    difficulty: 'hard',
                    playerCount: 3,
                    maxPlayers: 8,
                    type: MATCH_TYPE.PUBLIC,
                    state: SESSION_STATE.LOBBY,
                    created: Date.now() - 5 * 60 * 1000 // 5 minutes ago
                },
                {
                    id: 'sess_def456',
                    name: 'Casual Mission',
                    host: 'user_456',
                    hostName: 'GhostRunner',
                    map: 'mansion',
                    difficulty: 'easy',
                    playerCount: 2,
                    maxPlayers: 6,
                    type: MATCH_TYPE.PUBLIC,
                    state: SESSION_STATE.LOBBY,
                    created: Date.now() - 2 * 60 * 1000 // 2 minutes ago
                },
                {
                    id: 'sess_ghi789',
                    name: 'Tournament Match #5',
                    host: 'user_789',
                    hostName: 'EliteHacker',
                    map: 'laboratory',
                    difficulty: 'normal',
                    playerCount: 7,
                    maxPlayers: 8,
                    type: MATCH_TYPE.TOURNAMENT,
                    state: SESSION_STATE.LOBBY,
                    created: Date.now() - 10 * 60 * 1000 // 10 minutes ago
                }
            ];
            
            // Filter sessions based on filters
            let filteredSessions = sampleSessions;
            if (filters.map && filters.map !== 'all') {
                filteredSessions = filteredSessions.filter(s => s.map === filters.map);
            }
            if (filters.difficulty && filters.difficulty !== 'all') {
                filteredSessions = filteredSessions.filter(s => s.difficulty === filters.difficulty);
            }
            if (filters.type && filters.type !== 'all') {
                filteredSessions = filteredSessions.filter(s => s.type === filters.type);
            }
            
            // Update the sessions list
            availableSessions = filteredSessions;
            updateSessionsList(filteredSessions);
            
            // Hide spinner
            if (window.ShadowHeistUI && elements.sessionsList) {
                window.ShadowHeistUI.hideSpinner(elements.sessionsList);
            }
        }, 1000);
    }
    
    /**
     * Update the sessions list in the UI
     * @param {Array} sessions - List of session objects
     */
    function updateSessionsList(sessions) {
        if (!elements.sessionsList) return;
        
        // Clear current list
        elements.sessionsList.innerHTML = '';
        
        if (sessions.length === 0) {
            const noSessions = document.createElement('div');
            noSessions.className = 'no-sessions';
            noSessions.innerHTML = `
                <p>No active sessions found</p>
                <button class="btn primary refresh-sessions">Refresh</button>
            `;
            elements.sessionsList.appendChild(noSessions);
            
            const refreshBtn = noSessions.querySelector('.refresh-sessions');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', loadAvailableSessions);
            }
            
            return;
        }
        
        // Create session cards
        sessions.forEach(session => {
            const sessionCard = document.createElement('div');
            sessionCard.className = `session-card ${session.difficulty}`;
            sessionCard.setAttribute('data-session-id', session.id);
            
            const timeAgo = getTimeAgo(session.created);
            
            sessionCard.innerHTML = `
                <div class="session-info">
                    <h3 class="session-name">${session.name}</h3>
                    <div class="session-details">
                        <span class="host">Host: ${session.hostName}</span>
                        <span class="map">Map: ${session.map}</span>
                        <span class="difficulty">Difficulty: ${session.difficulty}</span>
                        <span class="players">Players: ${session.playerCount}/${session.maxPlayers}</span>
                        <span class="type">${session.type}</span>
                        <span class="time">${timeAgo}</span>
                    </div>
                </div>
                <div class="session-actions">
                    <button class="btn primary join-btn">Join</button>
                </div>
            `;
            
            // Add event listener to join button
            const joinBtn = sessionCard.querySelector('.join-btn');
            if (joinBtn) {
                joinBtn.addEventListener('click', () => {
                    joinSession(session.id);
                });
            }
            
            elements.sessionsList.appendChild(sessionCard);
        });
    }
    
    /**
     * Create a new game session
     * @param {Object} sessionData - Session data including name, map, etc.
     */
    function createSession(sessionData) {
        if (!firebase.auth().currentUser) {
            if (window.ShadowHeistUI) {
                window.ShadowHeistUI.showNotification('You must be logged in to create a session', 'error');
            }
            return;
        }
        
        if (!socket || !socket.connected) {
            if (window.ShadowHeistUI) {
                window.ShadowHeistUI.showNotification('Not connected to game server', 'error');
            }
            return;
        }
        
        const userId = firebase.auth().currentUser.uid;
        
        // Show creating message
        if (window.ShadowHeistUI) {
            window.ShadowHeistUI.showNotification('Creating session...', 'info');
        }
        
        // Send create session request
        socket.send('create_session', {
            userId: userId,
            sessionData: sessionData
        });
    }
    
    /**
     * Join an existing session
     * @param {string} sessionId - ID of the session to join
     */
    function joinSession(sessionId) {
        if (!firebase.auth().currentUser) {
            if (window.ShadowHeistUI) {
                window.ShadowHeistUI.showNotification('You must be logged in to join a session', 'error');
            }
            return;
        }
        
        if (!socket || !socket.connected) {
            if (window.ShadowHeistUI) {
                window.ShadowHeistUI.showNotification('Not connected to game server', 'error');
            }
            return;
        }
        
        const userId = firebase.auth().currentUser.uid;
        
        // Show joining message
        if (window.ShadowHeistUI) {
            window.ShadowHeistUI.showNotification('Joining session...', 'info');
        }
        
        // Send join session request
        socket.send('join_session', {
            userId: userId,
            sessionId: sessionId
        });
    }
    
    /**
     * Leave the current session
     */
    function leaveCurrentSession() {
        if (!currentSession) return;
        
        if (!socket || !socket.connected) {
            if (window.ShadowHeistUI) {
                window.ShadowHeistUI.showNotification('Not connected to game server', 'error');
            }
            return;
        }
        
        const userId = firebase.auth().currentUser.uid;
        
        // Send leave session request
        socket.send('leave_session', {
            userId: userId,
            sessionId: currentSession.id
        });
        
        // Clear current session locally
        currentSession = null;
        clearCurrentSession();
        
        // Notify listeners
        notifyListeners('session_left', { success: true });
    }
    
    /**
     * Find a quick match by joining a suitable available session or creating a new one
     */
    function findQuickMatch() {
        if (!firebase.auth().currentUser) {
            if (window.ShadowHeistUI) {
                window.ShadowHeistUI.showNotification('You must be logged in to find a match', 'error');
            }
            return;
        }
        
        // Show searching message
        if (window.ShadowHeistUI) {
            window.ShadowHeistUI.showNotification('Searching for a match...', 'info');
        }
        
        // First, check if there are any available sessions to join
        const publicSessions = availableSessions.filter(s => 
            s.type === MATCH_TYPE.PUBLIC && 
            s.state === SESSION_STATE.LOBBY &&
            s.playerCount < s.maxPlayers
        );
        
        if (publicSessions.length > 0) {
            // Sort by most players (to fill up games faster)
            publicSessions.sort((a, b) => b.playerCount - a.playerCount);
            joinSession(publicSessions[0].id);
        } else {
            // Create a new session if none available
            createSession({
                name: 'Quick Match',
                map: 'random',
                difficulty: 'normal',
                maxPlayers: 8,
                type: MATCH_TYPE.PUBLIC,
                isPrivate: false
            });
        }
    }
    
    /**
     * Load session data for a specific session
     * @param {string} sessionId - ID of the session to load
     */
    function loadSession(sessionId) {
        // In a real app, you'd fetch this from the server
        // For now, check the available sessions list
        const session = availableSessions.find(s => s.id === sessionId);
        
        if (session) {
            currentSession = session;
            notifyListeners('session_loaded', session);
        } else {
            // Session not in our list, request from server
            if (socket && socket.connected) {
                socket.send('get_session', { sessionId: sessionId });
            }
        }
    }
    
    /**
     * Update session data with new data from server
     * @param {Object} sessionData - Updated session data
     */
    function updateSessionData(sessionData) {
        if (currentSession && currentSession.id === sessionData.id) {
            currentSession = sessionData;
            notifyListeners('session_updated', sessionData);
        }
    }
    
    /**
     * Save current session ID to user's profile
     * @param {string} sessionId - ID of the current session
     */
    function saveCurrentSession(sessionId) {
        if (!firebase.auth().currentUser) return;
        
        const userId = firebase.auth().currentUser.uid;
        
        firebase.database().ref(`/users/${userId}/currentSession`).set(sessionId)
            .catch(error => {
                console.error('Error saving current session:', error);
            });
    }
    
    /**
     * Clear current session ID from user's profile
     */
    function clearCurrentSession() {
        if (!firebase.auth().currentUser) return;
        
        const userId = firebase.auth().currentUser.uid;
        
        firebase.database().ref(`/users/${userId}/currentSession`).remove()
            .catch(error => {
                console.error('Error clearing current session:', error);
            });
    }
    
    /**
     * Generate a random session code for private matches
     * @return {string} - Generated session code
     */
    function generateSessionCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    /**
     * Format a timestamp as a human-readable "time ago" string
     * @param {number} timestamp - The timestamp to format
     * @return {string} - Formatted time ago string
     */
    function getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) return interval + ' years ago';
        if (interval === 1) return '1 year ago';
        
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) return interval + ' months ago';
        if (interval === 1) return '1 month ago';
        
        interval = Math.floor(seconds / 86400);
        if (interval > 1) return interval + ' days ago';
        if (interval === 1) return '1 day ago';
        
        interval = Math.floor(seconds / 3600);
        if (interval > 1) return interval + ' hours ago';
        if (interval === 1) return '1 hour ago';
        
        interval = Math.floor(seconds / 60);
        if (interval > 1) return interval + ' minutes ago';
        if (interval === 1) return '1 minute ago';
        
        if (seconds < 10) return 'just now';
        return Math.floor(seconds) + ' seconds ago';
    }
    
    /**
     * Add a session event listener
     * @param {string} event - Event name to listen for
     * @param {Function} callback - Callback function
     */
    function addSessionListener(event, callback) {
        sessionListeners.push({ event, callback });
    }
    
    /**
     * Remove a session event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    function removeSessionListener(event, callback) {
        sessionListeners = sessionListeners.filter(
            listener => !(listener.event === event && listener.callback === callback)
        );
    }
    
    /**
     * Notify all listeners of an event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    function notifyListeners(event, data) {
        sessionListeners
            .filter(listener => listener.event === event)
            .forEach(listener => listener.callback(data));
    }
    
    // Public API
    return {
        init,
        SESSION_STATE,
        MATCH_TYPE,
        createSession,
        joinSession,
        leaveCurrentSession,
        findQuickMatch,
        loadAvailableSessions,
        getCurrentSession: () => currentSession,
        addSessionListener,
        removeSessionListener
    };
})();

// Initialize sessions when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize only after auth is ready
    if (window.authInitialized) {
        ShadowHeistSessions.init();
    } else {
        document.addEventListener('auth-initialized', () => {
            ShadowHeistSessions.init();
        });
    }
    
    // Make available globally
    window.ShadowHeistSessions = ShadowHeistSessions;
}); 