/**
 * Shadow Heist Online - Profile Management
 * Modern user profile interface and functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    // Main elements
    const profileContainer = document.querySelector('.profile-container');
    const loadingOverlay = document.querySelector('.loading-overlay');
    const profileHeader = document.querySelector('.profile-header');
    const avatarContainer = document.querySelector('.avatar-container');
    const avatarPreview = document.getElementById('current-avatar');
    const usernameDisplay = document.getElementById('username-display');
    const editUsernameBtn = document.getElementById('edit-username-btn');
    const usernameForm = document.getElementById('username-form');
    const usernameInput = document.getElementById('username-input');
    const saveUsernameBtn = document.getElementById('save-username-btn');
    const cancelUsernameBtn = document.getElementById('cancel-username-btn');
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const statsContainer = document.querySelector('.stats-container');
    const achievementsContainer = document.querySelector('.achievements-container');
    const friendsContainer = document.querySelector('.friends-container');
    const settingsContainer = document.querySelector('.settings-container');
    const avatarModal = document.getElementById('avatar-modal');
    const avatarGrid = document.querySelector('.avatar-grid');
    const closeAvatarModal = document.getElementById('close-avatar-modal');
    const statElements = document.querySelectorAll('.stat-value');
    const levelBar = document.querySelector('.level-bar-fill');
    const levelNumber = document.querySelector('.level-number');
    const xpValue = document.querySelector('.xp-value');
    const logoutBtn = document.getElementById('logout-btn');
    
    // User data
    let userData = null;
    let originalUsername = '';
    
    /**
     * Initialize profile page
     */
    function initProfile() {
        // Show loading overlay
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
        
        // Fetch user data after authentication is initialized
        if (window.authInitialized) {
            fetchUserData();
        } else {
            document.addEventListener('auth-initialized', () => {
                fetchUserData();
            });
        }
        
        // Setup event listeners
        setupEventListeners();
    }
    
    /**
     * Setup event listeners for profile functionality
     */
    function setupEventListeners() {
        // Edit username functionality
        if (editUsernameBtn && usernameForm) {
            editUsernameBtn.addEventListener('click', () => {
                profileHeader.classList.add('editing');
                usernameInput.value = originalUsername;
                usernameInput.focus();
            });
        }
        
        // Save username
        if (saveUsernameBtn) {
            saveUsernameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                saveUsername();
            });
        }
        
        // Cancel username edit
        if (cancelUsernameBtn) {
            cancelUsernameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                profileHeader.classList.remove('editing');
            });
        }
        
        // Open avatar selection modal
        if (changeAvatarBtn && avatarModal) {
            changeAvatarBtn.addEventListener('click', () => {
                avatarModal.classList.add('show');
            });
        }
        
        // Close avatar modal
        if (closeAvatarModal) {
            closeAvatarModal.addEventListener('click', () => {
                avatarModal.classList.remove('show');
            });
        }
        
        // Avatar selection
        if (avatarGrid) {
            generateAvatarGrid();
        }
        
        // Close modal when clicking outside
        if (avatarModal) {
            avatarModal.addEventListener('click', (e) => {
                if (e.target === avatarModal) {
                    avatarModal.classList.remove('show');
                }
            });
        }
        
        // Logout button
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (typeof window.signOutUser === 'function') {
                    window.signOutUser();
                } else {
                    console.error('signOutUser function not available');
                    // Fallback: redirect to login page
                    window.location.href = 'login.html';
                }
            });
        }
        
        // Tab navigation
        const tabButtons = document.querySelectorAll('.profile-tab-button');
        const tabContents = document.querySelectorAll('.profile-tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Show target tab content
                tabContents.forEach(content => {
                    if (content.getAttribute('data-tab') === targetTab) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });
    }
    
    /**
     * Fetch user data from Firebase
     */
    function fetchUserData() {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            console.error('No user is signed in');
            window.location.href = 'login.html?reason=auth-required';
            return;
        }
        
        const userId = currentUser.uid;
        firebase.database().ref(`/users/${userId}`).once('value')
            .then(snapshot => {
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
                
                if (snapshot.exists()) {
                    userData = snapshot.val();
                    updateProfileUI(userData);
                } else {
                    showNotification('User profile not found', 'error');
                }
            })
            .catch(error => {
                if (loadingOverlay) loadingOverlay.classList.add('hidden');
                console.error('Error fetching user data:', error);
                showNotification('Error loading profile data', 'error');
            });
    }
    
    /**
     * Update profile UI with user data
     * @param {Object} data - User data object
     */
    function updateProfileUI(data) {
        if (!data) return;
        
        // Update username
        if (usernameDisplay) {
            usernameDisplay.textContent = data.username || 'Agent';
            originalUsername = data.username || 'Agent';
        }
        
        // Update avatar
        if (avatarPreview && data.avatarId) {
            avatarPreview.src = `public/assets/avatars/avatar${data.avatarId}.png`;
            
            // Mark current avatar as selected in the grid
            const currentAvatar = document.querySelector(`.avatar-option[data-avatar-id="${data.avatarId}"]`);
            if (currentAvatar) {
                currentAvatar.classList.add('selected');
            }
        }
        
        // Update level info
        updateLevelUI(data);
        
        // Update stats
        updateStats(data);
        
        // Update achievements
        updateAchievements(data);
        
        // Update friends list
        updateFriends(data);
    }
    
    /**
     * Update level UI with user data
     * @param {Object} data - User data object
     */
    function updateLevelUI(data) {
        if (!data) return;
        
        const level = data.level || 1;
        const xp = data.xp || 0;
        
        if (levelNumber) {
            levelNumber.textContent = level;
        }
        
        // Calculate XP progress
        const xpForCurrentLevel = calcXpForLevel(level);
        const xpForNextLevel = calcXpForLevel(level + 1);
        const xpNeeded = xpForNextLevel - xpForCurrentLevel;
        const currentLevelXp = xp - xpForCurrentLevel;
        const progressPercent = Math.min(100, Math.floor((currentLevelXp / xpNeeded) * 100));
        
        if (levelBar) {
            levelBar.style.width = `${progressPercent}%`;
        }
        
        if (xpValue) {
            xpValue.textContent = `${currentLevelXp}/${xpNeeded} XP`;
        }
    }
    
    /**
     * Calculate XP required for a specific level
     * @param {number} level - The player level
     * @return {number} - XP required
     */
    function calcXpForLevel(level) {
        // Formula: 100 * level^2
        return 100 * Math.pow(level, 2);
    }
    
    /**
     * Update stats with user data
     * @param {Object} data - User data object
     */
    function updateStats(data) {
        if (!data || !data.stats) return;
        
        const stats = data.stats;
        
        // Update each stat display
        if (statElements.length > 0) {
            // Games played
            if (statElements[0]) statElements[0].textContent = stats.gamesPlayed || 0;
            
            // Wins
            if (statElements[1]) statElements[1].textContent = stats.gamesWon || 0;
            
            // Win ratio
            if (statElements[2]) {
                const gamesPlayed = stats.gamesPlayed || 0;
                const gamesWon = stats.gamesWon || 0;
                const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
                statElements[2].textContent = `${winRate}%`;
            }
            
            // Missions completed
            if (statElements[3]) statElements[3].textContent = stats.heistsCompleted || 0;
            
            // Eliminations
            if (statElements[4]) statElements[4].textContent = stats.killCount || 0;
            
            // K/D ratio
            if (statElements[5]) {
                const kills = stats.killCount || 0;
                const deaths = stats.deathCount || 1; // Avoid division by zero
                const kd = (kills / deaths).toFixed(2);
                statElements[5].textContent = kd;
            }
        }
    }
    
    /**
     * Update achievements with user data
     * @param {Object} data - User data object
     */
    function updateAchievements(data) {
        if (!data || !data.achievements || !achievementsContainer) return;
        
        // Clear container first
        achievementsContainer.innerHTML = '';
        
        // Get config for achievements
        const achievements = window.gameConfig ? window.gameConfig.ACHIEVEMENTS : {};
        if (!achievements || Object.keys(achievements).length === 0) {
            achievementsContainer.innerHTML = '<p class="no-data">Achievement data not available</p>';
            return;
        }
        
        // Create achievement cards
        Object.keys(achievements).forEach(achievementId => {
            const achievement = achievements[achievementId];
            const isUnlocked = data.achievements.includes(achievementId);
            
            const card = document.createElement('div');
            card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            card.innerHTML = `
                <div class="achievement-icon">
                    <i class="fas fa-${achievement.icon || 'trophy'}"></i>
                </div>
                <div class="achievement-details">
                    <h3 class="achievement-title">${achievement.title}</h3>
                    <p class="achievement-description">${achievement.description}</p>
                </div>
                <div class="achievement-status">
                    ${isUnlocked 
                        ? '<span class="badge unlocked"><i class="fas fa-check"></i> Unlocked</span>'
                        : '<span class="badge locked"><i class="fas fa-lock"></i> Locked</span>'}
                </div>
            `;
            
            achievementsContainer.appendChild(card);
        });
        
        // If no achievements, show message
        if (achievementsContainer.children.length === 0) {
            achievementsContainer.innerHTML = '<p class="no-data">No achievements unlocked yet</p>';
        }
    }
    
    /**
     * Update friends list with user data
     * @param {Object} data - User data object
     */
    function updateFriends(data) {
        if (!data || !data.friends || !friendsContainer) return;
        
        // Clear container first
        friendsContainer.innerHTML = '';
        
        // If no friends, show message
        if (!data.friends.length) {
            friendsContainer.innerHTML = '<p class="no-data">No friends added yet</p>';
            return;
        }
        
        // Create friend list
        data.friends.forEach(friend => {
            const card = document.createElement('div');
            card.className = 'friend-card';
            
            const onlineStatus = friend.online ? 'online' : 'offline';
            
            card.innerHTML = `
                <div class="friend-avatar">
                    <img src="public/assets/avatars/avatar${friend.avatarId || 1}.png" alt="${friend.username}">
                    <span class="status-indicator ${onlineStatus}"></span>
                </div>
                <div class="friend-details">
                    <h3 class="friend-name">${friend.username}</h3>
                    <p class="friend-status">${friend.online ? 'Online' : 'Offline'}</p>
                </div>
                <div class="friend-actions">
                    <button class="action-button invite-button" ${!friend.online ? 'disabled' : ''}>
                        <i class="fas fa-user-plus"></i>
                    </button>
                    <button class="action-button message-button">
                        <i class="fas fa-comment"></i>
                    </button>
                </div>
            `;
            
            friendsContainer.appendChild(card);
        });
        
        // Add event listeners for friend actions
        const inviteButtons = friendsContainer.querySelectorAll('.invite-button');
        const messageButtons = friendsContainer.querySelectorAll('.message-button');
        
        inviteButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (button.disabled) return;
                showNotification('Game invite sent!', 'success');
            });
        });
        
        messageButtons.forEach(button => {
            button.addEventListener('click', () => {
                showNotification('Messaging feature coming soon', 'info');
            });
        });
    }
    
    /**
     * Generate avatar grid for selection
     */
    function generateAvatarGrid() {
        if (!avatarGrid) return;
        
        // Clear grid first
        avatarGrid.innerHTML = '';
        
        // Create 18 avatar options
        for (let i = 1; i <= 18; i++) {
            const avatarOption = document.createElement('div');
            avatarOption.className = 'avatar-option';
            avatarOption.setAttribute('data-avatar-id', i);
            
            avatarOption.innerHTML = `
                <img src="public/assets/avatars/avatar${i}.png" alt="Avatar ${i}">
            `;
            
            avatarOption.addEventListener('click', () => {
                // Visual selection
                document.querySelectorAll('.avatar-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                avatarOption.classList.add('selected');
                
                // Save selection
                saveAvatar(i);
            });
            
            avatarGrid.appendChild(avatarOption);
        }
    }
    
    /**
     * Save selected avatar to user profile
     * @param {number} avatarId - The selected avatar ID
     */
    function saveAvatar(avatarId) {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;
        
        const userId = currentUser.uid;
        
        // Show loading state
        avatarModal.classList.add('loading');
        
        firebase.database().ref(`/users/${userId}`).update({
            avatarId: avatarId
        })
        .then(() => {
            // Update preview
            if (avatarPreview) {
                avatarPreview.src = `public/assets/avatars/avatar${avatarId}.png`;
            }
            
            // Hide modal
            avatarModal.classList.remove('loading');
            avatarModal.classList.remove('show');
            
            showNotification('Avatar updated successfully!', 'success');
        })
        .catch(error => {
            console.error('Error updating avatar:', error);
            avatarModal.classList.remove('loading');
            showNotification('Failed to update avatar', 'error');
        });
    }
    
    /**
     * Save username to user profile
     */
    function saveUsername() {
        const newUsername = usernameInput.value.trim();
        
        if (!newUsername) {
            showNotification('Username cannot be empty', 'warning');
            return;
        }
        
        if (newUsername === originalUsername) {
            profileHeader.classList.remove('editing');
            return;
        }
        
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) return;
        
        const userId = currentUser.uid;
        
        // Show loading state
        profileHeader.classList.add('saving');
        
        firebase.database().ref(`/users/${userId}`).update({
            username: newUsername
        })
        .then(() => {
            // Update display
            if (usernameDisplay) {
                usernameDisplay.textContent = newUsername;
                originalUsername = newUsername;
            }
            
            // Hide form
            profileHeader.classList.remove('editing');
            profileHeader.classList.remove('saving');
            
            showNotification('Username updated successfully!', 'success');
        })
        .catch(error => {
            console.error('Error updating username:', error);
            profileHeader.classList.remove('saving');
            showNotification('Failed to update username', 'error');
        });
    }
    
    /**
     * Show notification message
     * @param {string} message - The message to display
     * @param {string} type - The type of notification ('error', 'success', 'warning', 'info')
     * @param {number} duration - How long to show the notification (ms)
     */
    function showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        if (type === 'error') icon = 'exclamation-circle';
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="notification-message">${message}</div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add notification to container
        container.appendChild(notification);
        
        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.animation = 'notificationSlideOut 0.3s forwards';
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                }
            }, 300);
        });
        
        // Auto-remove after duration
        setTimeout(() => {
            if (container.contains(notification)) {
                notification.style.animation = 'notificationSlideOut 0.3s forwards';
                setTimeout(() => {
                    if (container.contains(notification)) {
                        container.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
    }
    
    // Initialize profile
    initProfile();
}); 