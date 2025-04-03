/**
 * Shadow Heist Online - Achievements System
 * Manages the game achievements and progression
 */

// Achievements Module
const AchievementsSystem = (function() {
    // Achievements data
    let achievementsData = {};
    let userAchievements = [];
    let isInitialized = false;
    let achievementsReady = false;
    
    // DOM cache
    let achievementsContainer = null;
    let achievementPopup = null;
    
    /**
     * Initialize achievements system
     * @param {string} containerId - ID of achievements container element
     * @param {string} popupId - ID of achievement popup element
     */
    function init(containerId, popupId) {
        console.log("Initializing achievements system");
        
        // Check if Firebase is available
        if (!window.firebase || !window.FirebaseService) {
            console.error("Firebase not available. Achievements system cannot initialize.");
            return;
        }
        
        // Set DOM references
        if (containerId) {
            achievementsContainer = document.getElementById(containerId);
        }
        
        if (popupId) {
            achievementPopup = document.getElementById(popupId);
        }
        
        // Load achievements data
        loadAchievements();
        
        // Listen for user achievements updates
        document.addEventListener('profile-loaded', handleProfileLoaded);
        
        // Listen for new achievements
        document.addEventListener('new-notification', handleNotification);
        
        isInitialized = true;
    }
    
    /**
     * Load achievements data from Firebase
     */
    function loadAchievements() {
        console.log("Loading achievements data");
        
        FirebaseService.getData('/achievements')
            .then(data => {
                if (!data) {
                    achievementsData = {};
                    achievementsReady = true;
                    return;
                }
                
                // Store achievements
                achievementsData = data;
                achievementsReady = true;
                
                console.log(`Loaded ${Object.keys(data).length} achievements`);
                
                // Dispatch event that achievements are loaded
                document.dispatchEvent(new CustomEvent('achievements-loaded', {
                    detail: { achievements: data }
                }));
                
                // Load user achievements if available
                loadUserAchievements();
                
                // Render achievements if DOM elements are ready
                if (achievementsContainer) {
                    renderAchievements();
                }
            })
            .catch(error => {
                console.error("Error loading achievements data:", error);
            });
    }
    
    /**
     * Load user's unlocked achievements
     */
    function loadUserAchievements() {
        const userId = FirebaseService.getCurrentUserId();
        if (!userId) return;
        
        FirebaseService.getData(`/users/${userId}/achievements`)
            .then(achievements => {
                // Store unlocked achievements
                userAchievements = achievements || [];
                
                console.log(`Loaded ${userAchievements.length} unlocked achievements`);
                
                // Re-render achievements if needed
                if (achievementsContainer) {
                    renderAchievements();
                }
            })
            .catch(error => {
                console.error("Error loading user achievements:", error);
            });
    }
    
    /**
     * Handle profile loaded event
     * @param {CustomEvent} event - Profile loaded event
     */
    function handleProfileLoaded(event) {
        const userData = event.detail.userData;
        
        if (userData && userData.achievements) {
            userAchievements = userData.achievements;
            
            // Re-render achievements if needed
            if (achievementsContainer && achievementsReady) {
                renderAchievements();
            }
        }
    }
    
    /**
     * Handle notification event
     * @param {CustomEvent} event - Notification event
     */
    function handleNotification(event) {
        const notification = event.detail;
        
        // Check if it's an achievement notification
        if (notification.type === 'ACHIEVEMENT_UNLOCKED') {
            const achievementId = notification.data?.achievementId;
            if (achievementId && achievementsData[achievementId]) {
                // Add to user achievements if not already there
                if (!userAchievements.includes(achievementId)) {
                    userAchievements.push(achievementId);
                }
                
                // Show popup if available
                showAchievementPopup(achievementId, notification.data?.xpAwarded || 0);
                
                // Re-render achievements if needed
                if (achievementsContainer) {
                    renderAchievements();
                }
            }
        }
    }
    
    /**
     * Render achievements in container
     */
    function renderAchievements() {
        if (!achievementsContainer || !achievementsReady) return;
        
        console.log("Rendering achievements");
        
        let html = '';
        
        // Organize by difficulty
        const difficulties = {
            easy: [],
            medium: [],
            hard: [],
            expert: []
        };
        
        // Sort achievements by difficulty
        Object.keys(achievementsData).forEach(id => {
            const achievement = achievementsData[id];
            const difficulty = achievement.difficulty || 'medium';
            
            if (difficulties[difficulty]) {
                difficulties[difficulty].push({
                    id,
                    ...achievement
                });
            } else {
                difficulties.medium.push({
                    id,
                    ...achievement
                });
            }
        });
        
        // Create sections for each difficulty
        Object.keys(difficulties).forEach(difficulty => {
            if (difficulties[difficulty].length === 0) return;
            
            html += `
                <div class="achievements-section">
                    <h3 class="difficulty-title">${getDifficultyLabel(difficulty)}</h3>
                    <div class="achievements-grid">
            `;
            
            // Add each achievement in this difficulty
            difficulties[difficulty].forEach(achievement => {
                const isUnlocked = userAchievements.includes(achievement.id);
                const isHidden = !isUnlocked && achievement.hidden;
                const achievementClass = isUnlocked ? 'unlocked' : isHidden ? 'hidden' : 'locked';
                
                html += `
                    <div class="achievement-card ${achievementClass}" data-id="${achievement.id}">
                        <div class="achievement-icon">
                            <i class="${achievement.icon || 'fas fa-trophy'}"></i>
                        </div>
                        <div class="achievement-info">
                            <h4 class="achievement-title">
                                ${isHidden ? '???' : achievement.title}
                            </h4>
                            <p class="achievement-description">
                                ${isHidden ? 'Complete secret objectives to unlock this achievement' : achievement.description}
                            </p>
                            <div class="achievement-reward">
                                ${achievement.reward?.xp ? `<span class="xp-reward">+${achievement.reward.xp} XP</span>` : ''}
                                ${achievement.reward?.avatarId ? `<span class="avatar-reward">New Avatar</span>` : ''}
                            </div>
                        </div>
                        <div class="achievement-status">
                            ${isUnlocked ? '<span class="status-unlocked">Unlocked</span>' : '<span class="status-locked">Locked</span>'}
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        // Set HTML
        achievementsContainer.innerHTML = html;
        
        // Update progress stats
        updateProgressStats();
    }
    
    /**
     * Update achievement progress statistics
     */
    function updateProgressStats() {
        const totalAchievements = Object.keys(achievementsData).length;
        const unlockedCount = userAchievements.length;
        const progressPercent = totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0;
        
        // Find or create progress stats container
        let statsContainer = document.querySelector('.achievements-progress');
        if (!statsContainer) {
            statsContainer = document.createElement('div');
            statsContainer.className = 'achievements-progress';
            achievementsContainer.insertAdjacentElement('afterbegin', statsContainer);
        }
        
        // Update stats
        statsContainer.innerHTML = `
            <div class="progress-header">
                <h2>Achievements Progress</h2>
                <div class="progress-numbers">
                    <span class="progress-count">${unlockedCount}/${totalAchievements}</span>
                    <span class="progress-percent">${progressPercent.toFixed(1)}%</span>
                </div>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progressPercent}%"></div>
            </div>
        `;
    }
    
    /**
     * Show achievement popup
     * @param {string} achievementId - Achievement ID
     * @param {number} xpAwarded - XP awarded for achievement
     */
    function showAchievementPopup(achievementId, xpAwarded) {
        if (!achievementPopup || !achievementsData[achievementId]) return;
        
        const achievement = achievementsData[achievementId];
        
        // Set popup content
        achievementPopup.innerHTML = `
            <div class="achievement-popup-content">
                <div class="achievement-icon">
                    <i class="${achievement.icon || 'fas fa-trophy'}"></i>
                </div>
                <div class="achievement-info">
                    <h3 class="popup-title">Achievement Unlocked!</h3>
                    <h4 class="achievement-title">${achievement.title}</h4>
                    <p class="achievement-description">${achievement.description}</p>
                    <div class="achievement-reward">
                        ${xpAwarded > 0 ? `<span class="xp-reward">+${xpAwarded} XP</span>` : ''}
                        ${achievement.reward?.avatarId ? `<span class="avatar-reward">New Avatar Unlocked!</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Show popup
        achievementPopup.classList.add('show');
        
        // Play sound if available
        if (window.SoundSystem && typeof window.SoundSystem.playSound === 'function') {
            window.SoundSystem.playSound('achievement');
        }
        
        // Hide after 5 seconds
        setTimeout(() => {
            achievementPopup.classList.remove('show');
        }, 5000);
    }
    
    /**
     * Get difficulty label
     * @param {string} difficulty - Difficulty key
     * @return {string} - Formatted difficulty label
     */
    function getDifficultyLabel(difficulty) {
        switch (difficulty) {
            case 'easy':
                return 'Rookie Achievements';
                
            case 'medium':
                return 'Agent Achievements';
                
            case 'hard':
                return 'Veteran Achievements';
                
            case 'expert':
                return 'Master Achievements';
                
            default:
                return 'Achievements';
        }
    }
    
    /**
     * Get achievement data by ID
     * @param {string} achievementId - Achievement ID
     * @return {Object|null} - Achievement data or null if not found
     */
    function getAchievement(achievementId) {
        return achievementsData[achievementId] || null;
    }
    
    /**
     * Get all achievements
     * @return {Object} - All achievements data
     */
    function getAllAchievements() {
        return achievementsData;
    }
    
    /**
     * Get user's unlocked achievements
     * @return {Array} - Array of unlocked achievement IDs
     */
    function getUnlockedAchievements() {
        return userAchievements;
    }
    
    /**
     * Check if user has unlocked an achievement
     * @param {string} achievementId - Achievement ID to check
     * @return {boolean} - Whether achievement is unlocked
     */
    function hasAchievement(achievementId) {
        return userAchievements.includes(achievementId);
    }
    
    /**
     * Get achievement progress
     * @return {Object} - Progress information
     */
    function getProgress() {
        const totalAchievements = Object.keys(achievementsData).length;
        const unlockedCount = userAchievements.length;
        const progressPercent = totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0;
        
        return {
            total: totalAchievements,
            unlocked: unlockedCount,
            percent: progressPercent,
            remaining: totalAchievements - unlockedCount
        };
    }
    
    /**
     * Manually trigger achievement check
     * @param {string} achievementId - Achievement ID to check
     * @return {Promise} - Resolves when check is complete
     */
    function checkAchievement(achievementId) {
        if (!window.ProfileManager) {
            return Promise.reject(new Error("Profile manager not available"));
        }
        
        // Skip if already unlocked
        if (hasAchievement(achievementId)) {
            return Promise.resolve(false);
        }
        
        return window.ProfileManager.checkAchievementEligibility(achievementId)
            .then(eligible => {
                if (eligible) {
                    // Try to unlock
                    return window.ProfileManager.unlockAchievement(achievementId)
                        .then(() => true)
                        .catch(error => {
                            console.error(`Error unlocking achievement ${achievementId}:`, error);
                            return false;
                        });
                }
                return false;
            })
            .catch(error => {
                console.error(`Error checking achievement ${achievementId}:`, error);
                return false;
            });
    }
    
    // Public API
    return {
        init,
        getAchievement,
        getAllAchievements,
        getUnlockedAchievements,
        hasAchievement,
        getProgress,
        checkAchievement
    };
})();

// Initialize achievements system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize after Firebase is ready
    if (window.FirebaseService) {
        // Don't auto-initialize, wait for explicit init call with container ID
    } else {
        // Wait for Firebase to initialize
        document.addEventListener('firebase-ready', () => {
            // Don't auto-initialize, wait for explicit init call with container ID
        });
    }
    
    // Make available globally
    window.AchievementsSystem = AchievementsSystem;
}); 