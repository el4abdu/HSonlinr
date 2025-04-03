/**
 * Shadow Heist Online - Firebase Service
 * Handles database operations with Firebase
 */

// Firebase Service Module
const FirebaseService = (function() {
    // Firebase references
    let db = null;
    let isInitialized = false;
    
    /**
     * Initialize Firebase
     */
    function init() {
        console.log("Initializing Firebase service");
        
        try {
            // Check if Firebase is already initialized
            if (firebase.apps.length === 0) {
                // Get config from window.config
                const firebaseConfig = window.config?.FIREBASE_CONFIG;
                
                if (!firebaseConfig) {
                    console.error("Firebase configuration not found");
                    return;
                }
                
                // Initialize Firebase
                firebase.initializeApp(firebaseConfig);
            }
            
            // Get database reference
            db = firebase.database();
            isInitialized = true;
            
            console.log("Firebase service initialized successfully");
            
            // Dispatch event to notify other components
            document.dispatchEvent(new CustomEvent('firebase-ready'));
            
            return true;
        } catch (error) {
            console.error("Error initializing Firebase:", error);
            return false;
        }
    }
    
    /**
     * Check if Firebase is initialized
     * @return {boolean} - Whether Firebase is initialized
     */
    function checkInitialized() {
        if (!isInitialized) {
            console.error("Firebase not initialized. Call init() first.");
            return false;
        }
        return true;
    }
    
    /**
     * Get data from database
     * @param {string} path - Database path
     * @return {Promise} - Resolves with data
     */
    function getData(path) {
        if (!checkInitialized()) return Promise.reject(new Error("Firebase not initialized"));
        
        return db.ref(path).once('value')
            .then(snapshot => snapshot.val());
    }
    
    /**
     * Set data in database
     * @param {string} path - Database path
     * @param {Object} data - Data to set
     * @return {Promise} - Resolves when operation is complete
     */
    function setData(path, data) {
        if (!checkInitialized()) return Promise.reject(new Error("Firebase not initialized"));
        
        return db.ref(path).set(data);
    }
    
    /**
     * Update data in database
     * @param {string} path - Database path
     * @param {Object} data - Data to update
     * @return {Promise} - Resolves when operation is complete
     */
    function updateData(path, data) {
        if (!checkInitialized()) return Promise.reject(new Error("Firebase not initialized"));
        
        return db.ref(path).update(data);
    }
    
    /**
     * Push data to database list
     * @param {string} path - Database path
     * @param {Object} data - Data to push
     * @return {Promise} - Resolves with reference to new data
     */
    function pushData(path, data) {
        if (!checkInitialized()) return Promise.reject(new Error("Firebase not initialized"));
        
        const ref = db.ref(path).push();
        return ref.set(data).then(() => ref);
    }
    
    /**
     * Remove data from database
     * @param {string} path - Database path
     * @return {Promise} - Resolves when operation is complete
     */
    function removeData(path) {
        if (!checkInitialized()) return Promise.reject(new Error("Firebase not initialized"));
        
        return db.ref(path).remove();
    }
    
    /**
     * Add a realtime listener for database changes
     * @param {string} path - Database path
     * @param {string} eventType - Event type ('value', 'child_added', etc.)
     * @param {Function} callback - Callback function
     * @return {Function} - Unsubscribe function
     */
    function addRealtimeListener(path, eventType, callback) {
        if (!checkInitialized()) {
            console.error("Firebase not initialized");
            return () => {};
        }
        
        const ref = db.ref(path);
        ref.on(eventType, callback);
        
        // Return unsubscribe function
        return () => ref.off(eventType, callback);
    }
    
    /**
     * Remove a realtime listener
     * @param {string} path - Database path
     * @param {string} eventType - Event type ('value', 'child_added', etc.)
     * @param {Function} callback - Original callback function
     */
    function removeRealtimeListener(path, eventType, callback) {
        if (!checkInitialized()) return;
        
        db.ref(path).off(eventType, callback);
    }
    
    /**
     * Get current user ID from firebase auth
     * @return {string|null} - Current user ID or null
     */
    function getCurrentUserId() {
        const firebaseUser = firebase.auth().currentUser;
        if (firebaseUser) {
            return firebaseUser.uid;
        }
        
        // Fall back to Clerk if available
        const clerkUser = window.Clerk?.user;
        return clerkUser ? clerkUser.id : null;
    }
    
    /**
     * Get current user from firebase auth
     * @return {Object|null} - Current user or null
     */
    function getCurrentUser() {
        const firebaseUser = firebase.auth().currentUser;
        if (firebaseUser) {
            return firebaseUser;
        }
        
        // Fall back to Clerk if available
        return window.Clerk?.user || null;
    }
    
    /**
     * Add XP to user and handle level up
     * @param {string} userId - User ID
     * @param {number} xpAmount - Amount of XP to add
     * @return {Promise} - Resolves with level up info if user leveled up
     */
    function addUserXP(userId, xpAmount) {
        if (!checkInitialized()) return Promise.reject(new Error("Firebase not initialized"));
        if (!userId) return Promise.reject(new Error("Invalid user ID"));
        if (!xpAmount || xpAmount <= 0) return Promise.resolve(null);
        
        // First get current XP and level
        return getData(`/users/${userId}`)
            .then(userData => {
                if (!userData) throw new Error("User not found");
                
                const currentXP = userData.xp || 0;
                const currentLevel = userData.level || 1;
                
                // Calculate new XP
                const newXP = currentXP + xpAmount;
                
                // Calculate level based on XP
                const newLevel = calculateLevel(newXP);
                
                // Check if user leveled up
                const leveledUp = newLevel > currentLevel;
                
                // Update user data
                return updateData(`/users/${userId}`, {
                    xp: newXP,
                    level: newLevel
                }).then(() => {
                    // If leveled up, return level info
                    if (leveledUp) {
                        return {
                            previousLevel: currentLevel,
                            newLevel: newLevel,
                            leveledUp: true
                        };
                    }
                    
                    return null;
                });
            });
    }
    
    /**
     * Calculate level based on XP
     * @param {number} xp - Experience points
     * @return {number} - Level
     */
    function calculateLevel(xp) {
        // Simple level formula: level = 1 + sqrt(xp / 100)
        return Math.floor(1 + Math.sqrt(xp / 100));
    }
    
    /**
     * Get XP required for next level
     * @param {number} currentLevel - Current level
     * @return {number} - XP required for next level
     */
    function getXPForNextLevel(currentLevel) {
        // Level formula: level = 1 + sqrt(xp / 100)
        // So xp = 100 * (level - 1)^2
        return 100 * Math.pow(currentLevel, 2);
    }
    
    // Public API
    return {
        init,
        getData,
        setData,
        updateData,
        pushData,
        removeData,
        addRealtimeListener,
        removeRealtimeListener,
        getCurrentUserId,
        getCurrentUser,
        addUserXP,
        calculateLevel,
        getXPForNextLevel
    };
})();

// Initialize Firebase service when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase
    FirebaseService.init();
    
    // Make available globally
    window.FirebaseService = FirebaseService;
}); 