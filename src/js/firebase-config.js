/**
 * Shadow Heist Online - Firebase Configuration
 * Setup for Firebase services including Realtime Database
 */

// Initialize Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "shadow-heist-online.firebaseapp.com",
  databaseURL: "https://shadow-heist-online-default-rtdb.firebaseio.com",
  projectId: "shadow-heist-online",
  storageBucket: "shadow-heist-online.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789jkl",
  measurementId: "G-ABC123DEF4"
};

// Firebase services
let auth;
let database;
let realTimeListeners = [];

/**
 * Initialize Firebase services
 */
function initializeFirebase() {
  // Initialize Firebase app
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  // Get service instances
  auth = firebase.auth();
  database = firebase.database();
  
  // Set up auth state listener
  setupAuthStateListener();
  
  console.log("Firebase initialized successfully");
}

/**
 * Set up auth state change listener
 */
function setupAuthStateListener() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("User is signed in:", user.uid);
      // Dispatch auth initialized event
      window.authInitialized = true;
      document.dispatchEvent(new Event('auth-initialized'));
      
      // Keep user online status
      updateUserOnlineStatus(user.uid, true);
      setupUserPresence(user.uid);
    } else {
      console.log("User is signed out");
      // Dispatch auth initialized event
      window.authInitialized = true;
      document.dispatchEvent(new Event('auth-initialized'));
    }
  });
}

/**
 * Update user online status in database
 * @param {string} userId - User ID to update
 * @param {boolean} isOnline - Whether user is online
 */
function updateUserOnlineStatus(userId, isOnline) {
  if (!userId) return;
  
  const userStatusRef = database.ref(`/users/${userId}/status`);
  userStatusRef.update({
    online: isOnline,
    lastSeen: firebase.database.ServerValue.TIMESTAMP
  }).catch(error => {
    console.error("Error updating online status:", error);
  });
}

/**
 * Setup user presence tracking with connection state
 * @param {string} userId - User ID to track
 */
function setupUserPresence(userId) {
  if (!userId) return;
  
  // Create a reference to this user's specific status node
  const userStatusRef = database.ref(`/users/${userId}/status`);
  
  // Create a reference to the special '.info/connected' path in Firebase Realtime Database
  const connectedRef = database.ref('.info/connected');
  
  // When the client's connection state changes...
  connectedRef.on('value', (snapshot) => {
    if (snapshot.val() === false) {
      // We're not connected (or we lost our connection)
      return;
    }
    
    // If we're connected, we need to set up our presence system
    // When this device disconnects, update the user status
    userStatusRef.onDisconnect().update({
      online: false,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
      // The onDisconnect() will only trigger once this device disconnects.
      // Now, we update the current connection state to 'online'
      updateUserOnlineStatus(userId, true);
    });
  });
}

/**
 * Add a real-time listener to a database path
 * @param {string} path - Database path to listen to
 * @param {string} event - Event type (e.g., 'value', 'child_added')
 * @param {Function} callback - Callback function when data changes
 * @return {Function} - Function to remove the listener
 */
function addRealtimeListener(path, event, callback) {
  if (!database) {
    console.error("Firebase not initialized yet");
    return () => {};
  }
  
  const ref = database.ref(path);
  ref.on(event, callback);
  
  // Store the listener details to allow for cleanup
  const listenerInfo = { path, event, callback, ref };
  realTimeListeners.push(listenerInfo);
  
  // Return function to remove the listener
  return () => removeRealtimeListener(listenerInfo);
}

/**
 * Remove a real-time listener
 * @param {Object} listenerInfo - Listener info object
 */
function removeRealtimeListener(listenerInfo) {
  if (!listenerInfo || !listenerInfo.ref) return;
  
  listenerInfo.ref.off(listenerInfo.event, listenerInfo.callback);
  
  // Remove from our tracking array
  const index = realTimeListeners.findIndex(l => 
    l.path === listenerInfo.path && 
    l.event === listenerInfo.event && 
    l.callback === listenerInfo.callback
  );
  
  if (index !== -1) {
    realTimeListeners.splice(index, 1);
  }
}

/**
 * Remove all real-time listeners
 */
function removeAllListeners() {
  realTimeListeners.forEach(listener => {
    if (listener.ref) {
      listener.ref.off(listener.event, listener.callback);
    }
  });
  
  realTimeListeners = [];
}

/**
 * Get a reference to a database path
 * @param {string} path - Database path
 * @return {Object} - Firebase database reference
 */
function getDatabaseRef(path) {
  if (!database) {
    console.error("Firebase not initialized yet");
    return null;
  }
  
  return database.ref(path);
}

/**
 * Create or update data at a specific path
 * @param {string} path - Database path
 * @param {Object} data - Data to update
 * @return {Promise} - Promise that resolves when data is updated
 */
function setData(path, data) {
  const ref = getDatabaseRef(path);
  if (!ref) return Promise.reject(new Error("Database not initialized"));
  
  return ref.set(data);
}

/**
 * Update specific fields at a database path
 * @param {string} path - Database path
 * @param {Object} updates - Fields to update
 * @return {Promise} - Promise that resolves when update is complete
 */
function updateData(path, updates) {
  const ref = getDatabaseRef(path);
  if (!ref) return Promise.reject(new Error("Database not initialized"));
  
  return ref.update(updates);
}

/**
 * Push new data to a list at a database path
 * @param {string} path - Database path
 * @param {Object} data - Data to push
 * @return {Promise} - Promise that resolves with the new reference
 */
function pushData(path, data) {
  const ref = getDatabaseRef(path);
  if (!ref) return Promise.reject(new Error("Database not initialized"));
  
  const newRef = ref.push();
  return newRef.set(data).then(() => newRef);
}

/**
 * Get data once from a database path
 * @param {string} path - Database path
 * @return {Promise} - Promise that resolves with the data
 */
function getData(path) {
  const ref = getDatabaseRef(path);
  if (!ref) return Promise.reject(new Error("Database not initialized"));
  
  return ref.once('value').then(snapshot => snapshot.val());
}

/**
 * Remove data at a database path
 * @param {string} path - Database path
 * @return {Promise} - Promise that resolves when data is removed
 */
function removeData(path) {
  const ref = getDatabaseRef(path);
  if (!ref) return Promise.reject(new Error("Database not initialized"));
  
  return ref.remove();
}

/**
 * Get the current user
 * @return {Object|null} - Firebase user object or null if not signed in
 */
function getCurrentUser() {
  return auth ? auth.currentUser : null;
}

/**
 * Get the UID of the current user
 * @return {string|null} - User ID or null if not signed in
 */
function getCurrentUserId() {
  const user = getCurrentUser();
  return user ? user.uid : null;
}

/**
 * Initialize data structures for a new user
 * @param {string} userId - User ID
 * @param {Object} userData - User data to store
 * @return {Promise} - Promise that resolves when user is initialized
 */
function initializeNewUser(userId, userData) {
  if (!userId) return Promise.reject(new Error("No user ID provided"));
  
  const defaultUserData = {
    username: userData.username || `Agent${Math.floor(1000 + Math.random() * 9000)}`,
    email: userData.email || "",
    avatarId: userData.avatarId || 1,
    level: 1,
    xp: 0,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    status: {
      online: true,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    },
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      killCount: 0,
      deathCount: 0,
      heistsCompleted: 0
    },
    achievements: [],
    friends: [],
    settings: {
      notifications: true,
      theme: "dark",
      soundEffects: true,
      music: true
    }
  };
  
  return setData(`/users/${userId}`, defaultUserData);
}

/**
 * Check if a user exists in the database
 * @param {string} userId - User ID to check
 * @return {Promise<boolean>} - Promise that resolves with whether user exists
 */
function checkUserExists(userId) {
  if (!userId) return Promise.resolve(false);
  
  return getData(`/users/${userId}`).then(data => !!data);
}

/**
 * Update user statistics after a game
 * @param {string} userId - User ID to update
 * @param {Object} stats - Game statistics to update
 * @return {Promise} - Promise that resolves when stats are updated
 */
function updateUserStats(userId, stats) {
  if (!userId) return Promise.reject(new Error("No user ID provided"));
  
  // Get current user stats first
  return getData(`/users/${userId}/stats`).then(currentStats => {
    const updatedStats = {
      gamesPlayed: (currentStats?.gamesPlayed || 0) + 1,
      gamesWon: (currentStats?.gamesWon || 0) + (stats.won ? 1 : 0),
      killCount: (currentStats?.killCount || 0) + (stats.kills || 0),
      deathCount: (currentStats?.deathCount || 0) + (stats.died ? 1 : 0),
      heistsCompleted: (currentStats?.heistsCompleted || 0) + (stats.heistCompleted ? 1 : 0)
    };
    
    // Update stats
    return updateData(`/users/${userId}/stats`, updatedStats);
  });
}

/**
 * Add XP to a user
 * @param {string} userId - User ID to update
 * @param {number} xpAmount - Amount of XP to add
 * @return {Promise} - Promise that resolves when XP is added and level is updated
 */
function addUserXP(userId, xpAmount) {
  if (!userId || !xpAmount) return Promise.reject(new Error("Invalid parameters"));
  
  // Get current user level and XP
  return getData(`/users/${userId}`).then(userData => {
    if (!userData) return Promise.reject(new Error("User not found"));
    
    const currentLevel = userData.level || 1;
    const currentXP = userData.xp || 0;
    const newXP = currentXP + xpAmount;
    
    // Calculate if level up occurred
    let newLevel = currentLevel;
    let leveledUp = false;
    
    // Calculate XP required for next level - formula: 100 * level^2
    const nextLevelXP = 100 * Math.pow(currentLevel + 1, 2);
    
    // Check if user leveled up
    if (newXP >= nextLevelXP) {
      // Find the appropriate level for the new XP amount
      while (100 * Math.pow(newLevel + 1, 2) <= newXP) {
        newLevel++;
      }
      leveledUp = true;
    }
    
    // Update user data
    return updateData(`/users/${userId}`, {
      xp: newXP,
      level: newLevel
    }).then(() => ({
      leveledUp,
      oldLevel: currentLevel,
      newLevel,
      newXP
    }));
  });
}

/**
 * Create a new game session in the database
 * @param {Object} sessionData - Game session data
 * @return {Promise} - Promise that resolves with the new session ID
 */
function createGameSession(sessionData) {
  if (!sessionData) return Promise.reject(new Error("No session data provided"));
  
  // Add creation timestamp and initial state
  const enhancedData = {
    ...sessionData,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP,
    status: 'waiting'
  };
  
  // Create the session
  return pushData('/gameSessions', enhancedData).then(ref => {
    // Return the new session ID
    return ref.key;
  });
}

/**
 * Join a player to a game session
 * @param {string} sessionId - Session ID to join
 * @param {string} userId - User ID joining the session
 * @return {Promise} - Promise that resolves when player is added
 */
function joinGameSession(sessionId, userId) {
  if (!sessionId || !userId) {
    return Promise.reject(new Error("Invalid session or user ID"));
  }
  
  // Add player to session players list
  return pushData(`/gameSessions/${sessionId}/players`, {
    userId,
    joinedAt: firebase.database.ServerValue.TIMESTAMP,
    ready: false
  }).then(() => {
    // Also update user's current session
    return updateData(`/users/${userId}`, {
      currentSession: sessionId
    });
  });
}

/**
 * Leave a game session
 * @param {string} sessionId - Session ID to leave
 * @param {string} userId - User ID leaving the session
 * @return {Promise} - Promise that resolves when player is removed
 */
function leaveGameSession(sessionId, userId) {
  if (!sessionId || !userId) {
    return Promise.reject(new Error("Invalid session or user ID"));
  }
  
  // First find the player entry in the session
  return getData(`/gameSessions/${sessionId}/players`).then(players => {
    if (!players) return Promise.reject(new Error("Session not found"));
    
    // Find the player's entry key
    let playerKey = null;
    Object.keys(players).forEach(key => {
      if (players[key].userId === userId) {
        playerKey = key;
      }
    });
    
    if (!playerKey) return Promise.reject(new Error("Player not in session"));
    
    // Remove player from session
    return removeData(`/gameSessions/${sessionId}/players/${playerKey}`).then(() => {
      // Clear user's current session
      return updateData(`/users/${userId}`, {
        currentSession: null
      });
    });
  });
}

// Export functions to make them available globally
window.FirebaseService = {
  initializeFirebase,
  addRealtimeListener,
  removeRealtimeListener,
  removeAllListeners,
  getDatabaseRef,
  setData,
  updateData,
  pushData,
  getData,
  removeData,
  getCurrentUser,
  getCurrentUserId,
  initializeNewUser,
  checkUserExists,
  updateUserStats,
  addUserXP,
  createGameSession,
  joinGameSession,
  leaveGameSession
};

// Initialize Firebase when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeFirebase();
}); 