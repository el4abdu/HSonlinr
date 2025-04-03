/**
 * Shadow Heist Online - Firebase Configuration
 * Setup for Firebase services including Realtime Database
 */

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUKyRMxw2TI1KeUt0SjE5mdh1gJozcgkg",
  authDomain: "hsonline-2d022.firebaseapp.com",
  projectId: "hsonline-2d022",
  storageBucket: "hsonline-2d022.firebasestorage.app",
  messagingSenderId: "790135168815",
  appId: "1:790135168815:web:e43ab3e10c2263c9398bda",
  measurementId: "G-ZP1ZXJ8XW3"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const database = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Track realtime database listeners for cleanup
let realTimeListeners = [];

/**
 * Sets up an auth state listener to track user sign-in status
 */
function setupAuthStateListener() {
  auth.onAuthStateChanged(user => {
    if (user) {
      // User is signed in
      updateUserOnlineStatus(user.uid, true);
      setupUserPresence(user.uid);
    } else {
      // User is signed out
      // Clean up any presence listeners
    }
  });
}

/**
 * Update user's online status in the database
 * @param {string} userId - The user ID
 * @param {boolean} isOnline - Whether the user is online
 */
function updateUserOnlineStatus(userId, isOnline) {
  if (!userId) return;
  
  const userStatusRef = database.ref(`/users/${userId}/status`);
  userStatusRef.update({
    online: isOnline,
    lastSeen: new Date().toISOString()
  }).catch(error => {
    console.error("Error updating online status:", error);
  });
}

/**
 * Setup presence system to track when users connect/disconnect
 * @param {string} userId - The user ID
 */
function setupUserPresence(userId) {
  if (!userId) return;
  
  // Create a reference to this user's specific status node
  const userStatusRef = database.ref(`/users/${userId}/status`);
  
  // Create a reference to the special '.info/connected' path
  const connectedRef = database.ref('.info/connected');
  
  // When the client's connection state changes...
  connectedRef.on('value', (snapshot) => {
    if (snapshot.val() === false) {
      // We're not connected (or we lost our connection)
      return;
    }
    
    // If we're connected, set up our presence system
    userStatusRef.onDisconnect().update({
      online: false,
      lastSeen: new Date().toISOString()
    }).then(() => {
      // The onDisconnect() will only trigger once this device disconnects
      // Now, update the current connection state to 'online'
      updateUserOnlineStatus(userId, true);
    });
  });
}

/**
 * Initialize Firebase services and set up listeners
 */
function initializeFirebase() {
  // Set up auth state listener
  setupAuthStateListener();
}

/**
 * Add a realtime listener to a database path
 * @param {string} path - Database path
 * @param {string} event - Event type (value, child_added, etc.)
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
function addRealtimeListener(path, event, callback) {
  if (!database) {
    console.error("Firebase not initialized yet");
    return () => {};
  }
  
  const ref = database.ref(path);
  ref.on(event, callback);
  
  // Store the listener for potential cleanup
  const listener = { ref, event, callback };
  realTimeListeners.push(listener);
  
  // Return a function to remove this specific listener
  return () => {
    ref.off(event, callback);
    realTimeListeners = realTimeListeners.filter(l => 
      l.ref !== ref || l.event !== event || l.callback !== callback
    );
  };
}

/**
 * Get a reference to a database path
 * @param {string} path - Database path
 * @returns {Object} Database reference
 */
function getDatabaseRef(path) {
  if (!database) {
    console.error("Firebase not initialized yet");
    return null;
  }
  
  return database.ref(path);
}

/**
 * Set data at a database path
 * @param {string} path - Database path
 * @param {Object} data - Data to set
 * @returns {Promise} Promise that resolves when complete
 */
function setData(path, data) {
  const ref = getDatabaseRef(path);
  if (!ref) return Promise.reject(new Error("Database not initialized"));
  
  return ref.set(data);
}

/**
 * Update data at a database path
 * @param {string} path - Database path
 * @param {Object} updates - Updates to apply
 * @returns {Promise} Promise that resolves when complete
 */
function updateData(path, updates) {
  const ref = getDatabaseRef(path);
  if (!ref) return Promise.reject(new Error("Database not initialized"));
  
  return ref.update(updates);
}

/**
 * Push new data to a database list
 * @param {string} path - Database path
 * @param {Object} data - Data to push
 * @returns {Promise<Object>} Promise that resolves with the new reference
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
 * @returns {Promise<Object>} Promise that resolves with the data
 */
function getData(path) {
  const ref = getDatabaseRef(path);
  if (!ref) return Promise.reject(new Error("Database not initialized"));
  
  return ref.once('value').then(snapshot => snapshot.val());
}

/**
 * Remove data at a database path
 * @param {string} path - Database path
 * @returns {Promise} Promise that resolves when complete
 */
function removeData(path) {
  const ref = getDatabaseRef(path);
  if (!ref) return Promise.reject(new Error("Database not initialized"));
  
  return ref.remove();
}

/**
 * Create a user profile in the database
 * @param {string} userId - User ID
 * @param {Object} userData - User data (displayName, email, etc.)
 * @returns {Promise} Promise that resolves when complete
 */
function createUserProfile(userId, userData) {
  if (!userId) return Promise.reject(new Error("User ID is required"));
  
  const defaultUserData = {
    ...userData,
    level: 1,
    xp: 0,
    createdAt: new Date().toISOString(),
    status: {
      online: true,
      lastSeen: new Date().toISOString()
    },
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      detectiveWins: 0,
      infiltratorWins: 0,
      tasksCompleted: 0,
      playersOuted: 0
    },
    achievements: {}
  };
  
  return setData(`/users/${userId}`, defaultUserData);
}

/**
 * Check if a user profile exists
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Promise that resolves with whether the profile exists
 */
function checkUserProfile(userId) {
  if (!userId) return Promise.resolve(false);
  
  return getData(`/users/${userId}`).then(data => !!data);
}

/**
 * Update user game stats after a game
 * @param {string} userId - User ID
 * @param {Object} gameResults - Game results
 * @returns {Promise} Promise that resolves when complete
 */
function updateUserGameStats(userId, gameResults) {
  if (!userId) return Promise.reject(new Error("User ID is required"));
  
  // Get current user stats first
  return getData(`/users/${userId}/stats`).then(currentStats => {
    const updatedStats = {
      gamesPlayed: (currentStats?.gamesPlayed || 0) + 1,
      gamesWon: (currentStats?.gamesWon || 0) + (gameResults.won ? 1 : 0),
      detectiveWins: (currentStats?.detectiveWins || 0) + 
        (gameResults.won && gameResults.role === 'detective' ? 1 : 0),
      infiltratorWins: (currentStats?.infiltratorWins || 0) + 
        (gameResults.won && gameResults.role === 'infiltrator' ? 1 : 0),
      tasksCompleted: (currentStats?.tasksCompleted || 0) + 
        (gameResults.tasksCompleted || 0),
      playersOuted: (currentStats?.playersOuted || 0) + 
        (gameResults.playersOuted || 0)
    };
    
    // Update stats
    return updateData(`/users/${userId}/stats`, updatedStats);
  });
}

/**
 * Award XP to a user and handle level up
 * @param {string} userId - User ID
 * @param {number} xpAmount - Amount of XP to award
 * @returns {Promise<Object>} Promise that resolves with level up info
 */
function awardUserXP(userId, xpAmount) {
  if (!userId) return Promise.reject(new Error("User ID is required"));
  if (!xpAmount || xpAmount <= 0) return Promise.resolve({ levelUp: false });
  
  // Get current user level and XP
  return getData(`/users/${userId}`).then(userData => {
    if (!userData) return Promise.reject(new Error("User not found"));
    
    const currentXP = userData.xp || 0;
    const currentLevel = userData.level || 1;
    
    // Calculate new XP
    const newXP = currentXP + xpAmount;
    
    // Calculate if level up (simple formula: need level * 100 XP to reach next level)
    const xpNeededForNextLevel = currentLevel * 100;
    const newLevel = currentXP < xpNeededForNextLevel && newXP >= xpNeededForNextLevel
      ? currentLevel + 1
      : currentLevel;
    
    const levelUp = newLevel > currentLevel;
    
    // Update user data
    return updateData(`/users/${userId}`, {
      xp: newXP,
      level: newLevel
    }).then(() => {
      return {
        levelUp,
        newLevel,
        newXP,
        xpAwarded: xpAmount
      };
    });
  });
}

/**
 * Create a new game session
 * @param {Object} sessionData - Session data
 * @returns {Promise<string>} Promise that resolves with session ID
 */
function createGameSession(sessionData) {
  if (!sessionData) return Promise.reject(new Error("Session data is required"));
  
  const enhancedData = {
    ...sessionData,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    status: 'waiting'
  };
  
  return pushData('/gameSessions', enhancedData).then(ref => {
    // Return the new session ID
    return ref.key;
  });
}

/**
 * Join a game session
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @returns {Promise} Promise that resolves when complete
 */
function joinGameSession(sessionId, userId) {
  if (!sessionId) return Promise.reject(new Error("Session ID is required"));
  if (!userId) return Promise.reject(new Error("User ID is required"));
  
  // Add player to session players list
  return pushData(`/gameSessions/${sessionId}/players`, {
    userId,
    joinedAt: new Date().toISOString(),
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
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @returns {Promise} Promise that resolves when complete
 */
function leaveGameSession(sessionId, userId) {
  if (!sessionId) return Promise.reject(new Error("Session ID is required"));
  if (!userId) return Promise.reject(new Error("User ID is required"));
  
  // First find the player entry in the session
  return getData(`/gameSessions/${sessionId}/players`).then(players => {
    if (!players) return Promise.reject(new Error("Session not found"));
    
    // Find the key for this user
    let playerKey = null;
    Object.keys(players).forEach(key => {
      if (players[key].userId === userId) {
        playerKey = key;
      }
    });
    
    if (!playerKey) return Promise.reject(new Error("Player not found in session"));
    
    // Remove player from session
    return removeData(`/gameSessions/${sessionId}/players/${playerKey}`).then(() => {
      // Clear user's current session
      return updateData(`/users/${userId}`, {
        currentSession: null
      });
    });
  });
}

// Initialize Firebase when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeFirebase();
});

// Export the Firebase services and functions
export { 
  app, analytics, db, database, auth, storage,
  addRealtimeListener, getDatabaseRef, setData, updateData,
  pushData, getData, removeData, createUserProfile,
  checkUserProfile, updateUserGameStats, awardUserXP,
  createGameSession, joinGameSession, leaveGameSession
}; 