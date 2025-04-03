/**
 * Shadow Heist Online - Profile Manager
 * Handles user profiles, friends, achievements, and stats
 */

// Profile Manager Module
const ProfileManager = (function() {
    // Current user data
    let currentUserData = null;
    let isInitialized = false;
    let userListeners = [];
    
    // Callbacks
    let profileCallbacks = [];
    let achievementCallbacks = [];
    let friendCallbacks = [];
    let statsCallbacks = [];
    
    /**
     * Initialize profile manager
     */
    function init() {
        // Check if user is logged in
        const currentUser = FirebaseService.getCurrentUser();
        if (!currentUser) {
            console.warn("User not logged in. Profile manager waiting for authentication.");
            
            // Wait for auth to be initialized
            document.addEventListener('auth-initialized', () => {
                const user = FirebaseService.getCurrentUser();
                if (user) {
                    loadUserProfile(user.uid);
                }
            });
        } else {
            // User already logged in, load profile
            loadUserProfile(currentUser.uid);
        }
        
        console.log("Profile manager initialized");
    }
    
    /**
     * Load user profile data
     * @param {string} userId - User ID to load
     */
    function loadUserProfile(userId) {
        if (!userId) {
            console.error("Invalid user ID");
            return;
        }
        
        console.log(`Loading user profile for ${userId}`);
        
        // Get user data from Firebase
        FirebaseService.getData(`/users/${userId}`)
            .then(userData => {
                if (!userData) {
                    console.error(`User ${userId} not found in database`);
                    return;
                }
                
                // Store user data
                currentUserData = userData;
                
                // Set up real-time listeners
                setupUserListeners(userId);
                
                // Notify callbacks
                notifyProfileUpdated(userData);
                
                // Mark as initialized
                isInitialized = true;
                
                // Dispatch profile loaded event
                document.dispatchEvent(new CustomEvent('profile-loaded', {
                    detail: { userId, userData }
                }));
                
                console.log("User profile loaded successfully");
            })
            .catch(error => {
                console.error("Error loading user profile:", error);
            });
    }
    
    /**
     * Setup real-time listeners for user data
     * @param {string} userId - User ID to listen for
     */
    function setupUserListeners(userId) {
        // Remove any existing listeners
        removeAllUserListeners();
        
        // Listen for profile changes
        const profileListener = FirebaseService.addRealtimeListener(
            `/users/${userId}`,
            'value',
            handleProfileChange
        );
        userListeners.push(profileListener);
        
        // Listen for achievements
        const achievementsListener = FirebaseService.addRealtimeListener(
            `/users/${userId}/achievements`,
            'value',
            handleAchievementsChange
        );
        userListeners.push(achievementsListener);
        
        // Listen for friends list
        const friendsListener = FirebaseService.addRealtimeListener(
            `/users/${userId}/friends`,
            'value',
            handleFriendsChange
        );
        userListeners.push(friendsListener);
        
        // Listen for notifications
        const notificationsListener = FirebaseService.addRealtimeListener(
            `/notifications/${userId}`,
            'child_added',
            handleNewNotification
        );
        userListeners.push(notificationsListener);
        
        console.log("User listeners set up successfully");
    }
    
    /**
     * Remove all user data listeners
     */
    function removeAllUserListeners() {
        // Call each unsubscribe function
        userListeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        
        // Clear the array
        userListeners = [];
        
        console.log("All user listeners removed");
    }
    
    /**
     * Handle profile data changes
     * @param {Object} snapshot - Firebase data snapshot
     */
    function handleProfileChange(snapshot) {
        const userData = snapshot.val();
        if (!userData) return;
        
        // Update stored user data
        currentUserData = userData;
        
        console.log("User profile updated");
        
        // Notify callbacks
        notifyProfileUpdated(userData);
    }
    
    /**
     * Handle achievements changes
     * @param {Object} snapshot - Firebase data snapshot
     */
    function handleAchievementsChange(snapshot) {
        const achievements = snapshot.val() || [];
        
        // Update stored user data
        if (currentUserData) {
            currentUserData.achievements = achievements;
        }
        
        console.log("User achievements updated");
        
        // Notify callbacks
        notifyAchievementsUpdated(achievements);
    }
    
    /**
     * Handle friends list changes
     * @param {Object} snapshot - Firebase data snapshot
     */
    function handleFriendsChange(snapshot) {
        const friends = snapshot.val() || [];
        
        // Update stored user data
        if (currentUserData) {
            currentUserData.friends = friends;
        }
        
        console.log("User friends list updated");
        
        // Notify callbacks
        notifyFriendsUpdated(friends);
        
        // Load friend profiles if there are any
        if (friends.length > 0) {
            loadFriendProfiles(friends);
        }
    }
    
    /**
     * Handle new notifications
     * @param {Object} snapshot - Firebase data snapshot
     */
    function handleNewNotification(snapshot) {
        const notification = snapshot.val();
        if (!notification) return;
        
        // Add notification ID
        notification.id = snapshot.key;
        
        console.log(`New notification: ${notification.type}`);
        
        // Check if it's a friend request
        if (notification.type === 'FRIEND_REQUEST' && !notification.read) {
            // Dispatch event for UI to show notification
            document.dispatchEvent(new CustomEvent('new-friend-request', {
                detail: notification
            }));
        } else {
            // Dispatch general notification event
            document.dispatchEvent(new CustomEvent('new-notification', {
                detail: notification
            }));
        }
    }
    
    /**
     * Load friend profiles
     * @param {Array} friendIds - Array of friend user IDs
     */
    function loadFriendProfiles(friendIds) {
        if (!friendIds || !friendIds.length) return;
        
        // Load each friend's basic info
        const promises = friendIds.map(friendId => {
            return FirebaseService.getData(`/users/${friendId}`).then(friendData => {
                if (friendData) {
                    return {
                        userId: friendId,
                        username: friendData.username,
                        avatarId: friendData.avatarId,
                        level: friendData.level,
                        status: friendData.status
                    };
                }
                return null;
            }).catch(error => {
                console.error(`Error loading friend ${friendId} data:`, error);
                return null;
            });
        });
        
        // Process all friend data
        Promise.all(promises).then(friendsData => {
            // Filter out nulls
            const validFriendsData = friendsData.filter(friend => friend !== null);
            
            // Dispatch friends loaded event
            document.dispatchEvent(new CustomEvent('friends-loaded', {
                detail: { friends: validFriendsData }
            }));
        });
    }
    
    /**
     * Update user profile
     * @param {Object} updates - Profile fields to update
     * @return {Promise} - Resolves when profile is updated
     */
    function updateProfile(updates) {
        const userId = FirebaseService.getCurrentUserId();
        if (!userId) {
            return Promise.reject(new Error("User not logged in"));
        }
        
        console.log("Updating user profile");
        
        // Update allowed fields only
        const allowedUpdates = {};
        
        if (updates.username) allowedUpdates.username = updates.username;
        if (updates.avatarId) allowedUpdates.avatarId = updates.avatarId;
        
        if (updates.settings) {
            allowedUpdates.settings = {};
            
            if (typeof updates.settings.notifications === 'boolean') {
                allowedUpdates.settings.notifications = updates.settings.notifications;
            }
            
            if (typeof updates.settings.theme === 'string') {
                allowedUpdates.settings.theme = updates.settings.theme;
            }
            
            if (typeof updates.settings.soundEffects === 'boolean') {
                allowedUpdates.settings.soundEffects = updates.settings.soundEffects;
            }
            
            if (typeof updates.settings.music === 'boolean') {
                allowedUpdates.settings.music = updates.settings.music;
            }
        }
        
        // Only update if there are allowed changes
        if (Object.keys(allowedUpdates).length === 0) {
            return Promise.resolve(currentUserData);
        }
        
        // Update Firebase
        return FirebaseService.updateData(`/users/${userId}`, allowedUpdates).then(() => {
            // Return updated data
            return { ...currentUserData, ...allowedUpdates };
        });
    }
    
    /**
     * Get current user profile data
     * @return {Object|null} - Current user data
     */
    function getUserProfile() {
        return currentUserData;
    }
    
    /**
     * Get a specific user's profile data
     * @param {string} userId - User ID to get
     * @return {Promise} - Resolves with user data
     */
    function getOtherUserProfile(userId) {
        if (!userId) {
            return Promise.reject(new Error("Invalid user ID"));
        }
        
        return FirebaseService.getData(`/users/${userId}`).then(userData => {
            if (!userData) {
                throw new Error("User not found");
            }
            
            // Return only public info
            return {
                userId,
                username: userData.username,
                avatarId: userData.avatarId,
                level: userData.level,
                achievements: userData.achievements || [],
                status: {
                    online: userData.status?.online || false,
                    lastSeen: userData.status?.lastSeen || null,
                    playing: userData.status?.playing || false
                },
                stats: userData.stats || {}
            };
        });
    }
    
    /**
     * Send a friend request to another user
     * @param {string} targetUserId - User ID to send request to
     * @param {string} [message] - Optional message with request
     * @return {Promise} - Resolves when request is sent
     */
    function sendFriendRequest(targetUserId, message = "") {
        const userId = FirebaseService.getCurrentUserId();
        if (!userId) {
            return Promise.reject(new Error("User not logged in"));
        }
        
        if (!targetUserId) {
            return Promise.reject(new Error("Invalid target user ID"));
        }
        
        if (userId === targetUserId) {
            return Promise.reject(new Error("Cannot send friend request to yourself"));
        }
        
        console.log(`Sending friend request to ${targetUserId}`);
        
        // First check if users are already friends
        return FirebaseService.getData(`/users/${userId}/friends`).then(friends => {
            if (friends && friends.includes(targetUserId)) {
                throw new Error("Already friends with this user");
            }
            
            // Check if there's already a pending request
            return FirebaseService.getData(`/friendRequests`);
        }).then(requests => {
            if (requests) {
                // Check existing requests
                for (const requestId in requests) {
                    const request = requests[requestId];
                    if (
                        (request.senderId === userId && request.receiverId === targetUserId) || 
                        (request.senderId === targetUserId && request.receiverId === userId)
                    ) {
                        if (request.status === 'pending') {
                            throw new Error("Friend request already pending");
                        }
                    }
                }
            }
            
            // Create the friend request
            return FirebaseService.pushData('/friendRequests', {
                senderId: userId,
                receiverId: targetUserId,
                status: 'pending',
                message: message,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
        }).then(requestRef => {
            // Create notification for target user
            return FirebaseService.pushData(`/notifications/${targetUserId}`, {
                type: 'FRIEND_REQUEST',
                senderId: userId,
                message: `${currentUserData.username} sent you a friend request`,
                read: false,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                data: {
                    requestId: requestRef.key
                }
            });
        });
    }
    
    /**
     * Respond to a friend request
     * @param {string} requestId - Request ID to respond to
     * @param {boolean} accept - Whether to accept the request
     * @return {Promise} - Resolves when response is processed
     */
    function respondToFriendRequest(requestId, accept) {
        const userId = FirebaseService.getCurrentUserId();
        if (!userId) {
            return Promise.reject(new Error("User not logged in"));
        }
        
        if (!requestId) {
            return Promise.reject(new Error("Invalid request ID"));
        }
        
        console.log(`Responding to friend request ${requestId}: ${accept ? 'accept' : 'reject'}`);
        
        // Get the request data
        return FirebaseService.getData(`/friendRequests/${requestId}`).then(request => {
            if (!request) {
                throw new Error("Friend request not found");
            }
            
            // Make sure this user is the receiver
            if (request.receiverId !== userId) {
                throw new Error("Not authorized to respond to this request");
            }
            
            // Update the request status
            return FirebaseService.updateData(`/friendRequests/${requestId}`, {
                status: accept ? 'accepted' : 'rejected',
                respondedAt: firebase.database.ServerValue.TIMESTAMP
            });
        }).then(() => {
            if (accept) {
                // If accepted, add each user to the other's friends list
                return FirebaseService.getData(`/friendRequests/${requestId}`).then(request => {
                    // Get both users' current friends lists
                    return Promise.all([
                        FirebaseService.getData(`/users/${request.senderId}/friends`),
                        FirebaseService.getData(`/users/${request.receiverId}/friends`)
                    ]).then(([senderFriends, receiverFriends]) => {
                        // Initialize arrays if they don't exist
                        senderFriends = senderFriends || [];
                        receiverFriends = receiverFriends || [];
                        
                        // Add to friends lists if not already there
                        if (!senderFriends.includes(request.receiverId)) {
                            senderFriends.push(request.receiverId);
                        }
                        
                        if (!receiverFriends.includes(request.senderId)) {
                            receiverFriends.push(request.senderId);
                        }
                        
                        // Update both users
                        return Promise.all([
                            FirebaseService.updateData(`/users/${request.senderId}`, { friends: senderFriends }),
                            FirebaseService.updateData(`/users/${request.receiverId}`, { friends: receiverFriends })
                        ]);
                    });
                });
            }
            
            // If rejected, just mark the request as rejected (already done)
            return Promise.resolve();
        });
    }
    
    /**
     * Remove a friend
     * @param {string} friendId - User ID of friend to remove
     * @return {Promise} - Resolves when friend is removed
     */
    function removeFriend(friendId) {
        const userId = FirebaseService.getCurrentUserId();
        if (!userId) {
            return Promise.reject(new Error("User not logged in"));
        }
        
        if (!friendId) {
            return Promise.reject(new Error("Invalid friend ID"));
        }
        
        console.log(`Removing friend ${friendId}`);
        
        // Get both users' current friends lists
        return Promise.all([
            FirebaseService.getData(`/users/${userId}/friends`),
            FirebaseService.getData(`/users/${friendId}/friends`)
        ]).then(([userFriends, friendFriends]) => {
            // Initialize arrays if they don't exist
            userFriends = userFriends || [];
            friendFriends = friendFriends || [];
            
            // Remove from friends lists
            const updatedUserFriends = userFriends.filter(id => id !== friendId);
            const updatedFriendFriends = friendFriends.filter(id => id !== userId);
            
            // Update both users
            return Promise.all([
                FirebaseService.updateData(`/users/${userId}`, { friends: updatedUserFriends }),
                FirebaseService.updateData(`/users/${friendId}`, { friends: updatedFriendFriends })
            ]);
        });
    }
    
    /**
     * Check if an achievement has been unlocked
     * @param {string} achievementId - Achievement ID to check
     * @return {boolean} - Whether achievement is unlocked
     */
    function hasAchievement(achievementId) {
        if (!currentUserData || !currentUserData.achievements) {
            return false;
        }
        
        return currentUserData.achievements.includes(achievementId);
    }
    
    /**
     * Check if a user has enough stats to unlock an achievement
     * @param {string} achievementId - Achievement to check
     * @return {Promise} - Resolves with whether achievement can be unlocked
     */
    function checkAchievementEligibility(achievementId) {
        // Get achievement definition
        return FirebaseService.getData(`/achievements/${achievementId}`).then(achievement => {
            if (!achievement || !currentUserData) {
                return false;
            }
            
            const stats = currentUserData.stats || {};
            
            // Check if requirement is met
            switch (achievement.requirement.type) {
                case 'GAMES_PLAYED':
                    return (stats.gamesPlayed || 0) >= achievement.requirement.value;
                    
                case 'WINS':
                    return (stats.gamesWon || 0) >= achievement.requirement.value;
                    
                case 'KILLS':
                    return (stats.killCount || 0) >= achievement.requirement.value;
                    
                case 'HEISTS_COMPLETED':
                    return (stats.heistsCompleted || 0) >= achievement.requirement.value;
                    
                case 'LEVEL':
                    return (currentUserData.level || 1) >= achievement.requirement.value;
                    
                default:
                    return false;
            }
        });
    }
    
    /**
     * Unlock an achievement for the current user
     * @param {string} achievementId - Achievement ID to unlock
     * @return {Promise} - Resolves with achievement data when unlocked
     */
    function unlockAchievement(achievementId) {
        const userId = FirebaseService.getCurrentUserId();
        if (!userId) {
            return Promise.reject(new Error("User not logged in"));
        }
        
        if (!achievementId) {
            return Promise.reject(new Error("Invalid achievement ID"));
        }
        
        // First check if already unlocked
        if (hasAchievement(achievementId)) {
            return Promise.reject(new Error("Achievement already unlocked"));
        }
        
        console.log(`Unlocking achievement ${achievementId}`);
        
        // Get achievement data
        return FirebaseService.getData(`/achievements/${achievementId}`).then(achievement => {
            if (!achievement) {
                throw new Error("Achievement not found");
            }
            
            // Get current achievements
            return FirebaseService.getData(`/users/${userId}/achievements`).then(achievements => {
                // Initialize array if it doesn't exist
                achievements = achievements || [];
                
                // Add new achievement
                achievements.push(achievementId);
                
                // Update user
                return FirebaseService.updateData(`/users/${userId}`, { 
                    achievements 
                }).then(() => {
                    // Award XP if achievement has XP reward
                    if (achievement.reward && achievement.reward.xp) {
                        return FirebaseService.addUserXP(userId, achievement.reward.xp);
                    }
                    
                    return null;
                }).then(xpResult => {
                    // Create notification about achievement
                    return FirebaseService.pushData(`/notifications/${userId}`, {
                        type: 'ACHIEVEMENT_UNLOCKED',
                        message: `You unlocked: ${achievement.title}`,
                        read: false,
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        data: {
                            achievementId,
                            xpAwarded: achievement.reward?.xp || 0,
                            levelUp: xpResult?.leveledUp || false
                        }
                    }).then(() => {
                        // Return achievement data
                        return {
                            achievement,
                            xpResult
                        };
                    });
                });
            });
        });
    }
    
    /**
     * Register for profile updates
     * @param {Function} callback - Callback function(profileData)
     * @return {Function} - Unregister function
     */
    function onProfileUpdated(callback) {
        if (typeof callback !== 'function') return () => {};
        
        profileCallbacks.push(callback);
        
        // If we already have data, call the callback immediately
        if (currentUserData) {
            callback(currentUserData);
        }
        
        // Return unregister function
        return () => {
            const index = profileCallbacks.indexOf(callback);
            if (index !== -1) {
                profileCallbacks.splice(index, 1);
            }
        };
    }
    
    /**
     * Register for achievements updates
     * @param {Function} callback - Callback function(achievements)
     * @return {Function} - Unregister function
     */
    function onAchievementsUpdated(callback) {
        if (typeof callback !== 'function') return () => {};
        
        achievementCallbacks.push(callback);
        
        // If we already have data, call the callback immediately
        if (currentUserData && currentUserData.achievements) {
            callback(currentUserData.achievements);
        }
        
        // Return unregister function
        return () => {
            const index = achievementCallbacks.indexOf(callback);
            if (index !== -1) {
                achievementCallbacks.splice(index, 1);
            }
        };
    }
    
    /**
     * Register for friends updates
     * @param {Function} callback - Callback function(friends)
     * @return {Function} - Unregister function
     */
    function onFriendsUpdated(callback) {
        if (typeof callback !== 'function') return () => {};
        
        friendCallbacks.push(callback);
        
        // If we already have data, call the callback immediately
        if (currentUserData && currentUserData.friends) {
            callback(currentUserData.friends);
        }
        
        // Return unregister function
        return () => {
            const index = friendCallbacks.indexOf(callback);
            if (index !== -1) {
                friendCallbacks.splice(index, 1);
            }
        };
    }
    
    /**
     * Register for stats updates
     * @param {Function} callback - Callback function(stats)
     * @return {Function} - Unregister function
     */
    function onStatsUpdated(callback) {
        if (typeof callback !== 'function') return () => {};
        
        statsCallbacks.push(callback);
        
        // If we already have data, call the callback immediately
        if (currentUserData && currentUserData.stats) {
            callback(currentUserData.stats);
        }
        
        // Return unregister function
        return () => {
            const index = statsCallbacks.indexOf(callback);
            if (index !== -1) {
                statsCallbacks.splice(index, 1);
            }
        };
    }
    
    /**
     * Notify all profile callbacks
     * @param {Object} profileData - User profile data
     */
    function notifyProfileUpdated(profileData) {
        profileCallbacks.forEach(callback => {
            try {
                callback(profileData);
            } catch (error) {
                console.error("Error in profile callback:", error);
            }
        });
    }
    
    /**
     * Notify all achievement callbacks
     * @param {Array} achievements - Achievements array
     */
    function notifyAchievementsUpdated(achievements) {
        achievementCallbacks.forEach(callback => {
            try {
                callback(achievements);
            } catch (error) {
                console.error("Error in achievement callback:", error);
            }
        });
    }
    
    /**
     * Notify all friends callbacks
     * @param {Array} friends - Friends array
     */
    function notifyFriendsUpdated(friends) {
        friendCallbacks.forEach(callback => {
            try {
                callback(friends);
            } catch (error) {
                console.error("Error in friends callback:", error);
            }
        });
    }
    
    /**
     * Notify all stats callbacks
     * @param {Object} stats - User stats
     */
    function notifyStatsUpdated(stats) {
        statsCallbacks.forEach(callback => {
            try {
                callback(stats);
            } catch (error) {
                console.error("Error in stats callback:", error);
            }
        });
        
        // Also check for achievements when stats update
        checkForAchievements();
    }
    
    /**
     * Check if user has earned any new achievements based on current stats
     */
    function checkForAchievements() {
        if (!currentUserData || !currentUserData.stats) return;
        
        // Get all achievements
        FirebaseService.getData('/achievements').then(achievements => {
            if (!achievements) return;
            
            // Check each achievement
            Object.keys(achievements).forEach(achievementId => {
                // Skip if already unlocked
                if (hasAchievement(achievementId)) return;
                
                // Check if eligible to unlock
                checkAchievementEligibility(achievementId).then(eligible => {
                    if (eligible) {
                        // Unlock the achievement
                        unlockAchievement(achievementId).catch(error => {
                            console.error(`Error unlocking achievement ${achievementId}:`, error);
                        });
                    }
                }).catch(error => {
                    console.error(`Error checking achievement ${achievementId}:`, error);
                });
            });
        }).catch(error => {
            console.error("Error checking for achievements:", error);
        });
    }
    
    // Public API
    return {
        init,
        getUserProfile,
        getOtherUserProfile,
        updateProfile,
        sendFriendRequest,
        respondToFriendRequest,
        removeFriend,
        hasAchievement,
        checkAchievementEligibility,
        unlockAchievement,
        onProfileUpdated,
        onAchievementsUpdated,
        onFriendsUpdated,
        onStatsUpdated
    };
})();

// Initialize profile manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize after Firebase is ready
    if (window.FirebaseService) {
        ProfileManager.init();
    } else {
        // Wait for Firebase to initialize
        document.addEventListener('firebase-ready', () => {
            ProfileManager.init();
        });
    }
    
    // Make available globally
    window.ProfileManager = ProfileManager;
}); 