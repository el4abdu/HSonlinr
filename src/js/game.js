/**
 * Shadow Heist Online - Main Game Interface
 * Modern immersive game experience for 2025
 */

document.addEventListener('DOMContentLoaded', () => {
    // Main elements
    const loadingScreen = document.querySelector('.loading-screen');
    const loadingProgress = document.querySelector('.loading-progress');
    const loadingPercentage = document.querySelector('.loading-percentage');
    const navLinks = document.querySelectorAll('.nav-link');
    const pageContents = document.querySelectorAll('.page-content');
    const gameModals = document.querySelectorAll('.modal');
    const loadingGameModal = document.getElementById('loading-game-modal');
    const mapCards = document.querySelectorAll('.map-card');
    const difficultyOptions = document.querySelectorAll('.difficulty-option');
    const toggleButtons = document.querySelectorAll('.toggle-button');
    const privateCodeGroup = document.getElementById('private-code-group');
    const startGameButton = document.querySelector('.start-game-button');
    const quickPlayButton = document.getElementById('quick-play-button');
    const themeToggle = document.querySelector('.theme-toggle');
    const playerAvatar = document.getElementById('player-avatar-img');
    const playerNameDisplay = document.getElementById('player-name-display');
    const playerNameElement = document.querySelector('.player-name');
    const playerLevelElement = document.querySelector('.level-number');
    const xpFill = document.querySelector('.xp-fill');
    const xpText = document.querySelector('.xp-text');
    
    // Game settings
    let selectedGameMode = 'classic';
    let selectedMap = 'bank';
    let selectedDifficulty = 'easy';
    let isPrivateMatch = false;
    let privateMatchCode = '';
    let playerData = null;
    
    // Loading tips for the loading screen
    const loadingTips = [
        "The Hacker role can disable security systems temporarily, allowing the team to move through restricted areas undetected.",
        "Communication is key! Use the team chat to coordinate your movements and actions.",
        "Each role has unique abilities that can turn the tide of a mission. Learn to use them effectively.",
        "Watch out for traitors! They look like allies but work against the team's objectives.",
        "The Detective can investigate players to determine if they're trustworthy.",
        "Security cameras can be hacked, disabled, or avoided - choose your approach based on your team's strengths.",
        "Some doors require specific tools or skills to open. Make sure your team has the right combination of roles.",
        "The Mastermind can see everything but can only communicate through limited means. Learn to interpret their signals.",
        "Don't stay in high-security areas for too long - guards will become suspicious and may trigger alarms.",
        "Use the environment to your advantage. Create distractions to slip past guards unnoticed."
    ];
    
    /**
     * Initialize the game interface
     */
    function initGame() {
        // Load game state
        loadPlayerData();
        
        // Simulate loading
        simulateLoading();
        
        // Setup event listeners
        setupEventListeners();
        
        // Set theme from localStorage
        const savedTheme = localStorage.getItem('game-theme') || 'dark';
        setTheme(savedTheme);
        
        // Initialize stats for the dashboard
        initializeStats();
    }
    
    /**
     * Simulate loading progress
     */
    function simulateLoading() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 500);
                }, 500);
            }
            loadingProgress.style.width = `${progress}%`;
            loadingPercentage.textContent = `${Math.floor(progress)}%`;
        }, 200);
    }
    
    /**
     * Load player data from Firebase
     */
    function loadPlayerData() {
        if (!firebase.auth().currentUser) {
            // If not logged in, show the Clerk sign-in modal instead of redirecting
            if (window.Clerk) {
                window.Clerk.openSignIn();
            }
            return;
        }
        
        const userId = firebase.auth().currentUser.uid;
        
        firebase.database().ref(`/users/${userId}`).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    playerData = snapshot.val();
                    updatePlayerUI(playerData);
                } else {
                    console.error("User profile not found");
                }
            })
            .catch(error => {
                console.error("Error loading player data:", error);
                showNotification("Error loading your profile data. Please try again.", "error");
            });
    }
    
    /**
     * Update player UI with data
     * @param {Object} data - Player data object
     */
    function updatePlayerUI(data) {
        if (!data) return;
        
        // Update player name
        if (playerNameDisplay) playerNameDisplay.textContent = data.username || 'Agent';
        if (playerNameElement) playerNameElement.textContent = data.username || 'Agent';
        
        // Update player level
        if (playerLevelElement) playerLevelElement.textContent = data.level || 1;
        
        // Update XP bar
        const level = data.level || 1;
        const xp = data.xp || 0;
        const xpForCurrentLevel = calcXpForLevel(level);
        const xpForNextLevel = calcXpForLevel(level + 1);
        const xpNeeded = xpForNextLevel - xpForCurrentLevel;
        const currentLevelXp = xp - xpForCurrentLevel;
        const progressPercent = Math.min(100, Math.floor((currentLevelXp / xpNeeded) * 100));
        
        if (xpFill) xpFill.style.width = `${progressPercent}%`;
        if (xpText) xpText.textContent = `${currentLevelXp}/${xpNeeded} XP`;
        
        // Update avatar
        if (playerAvatar && data.avatarId) {
            playerAvatar.src = `public/assets/avatars/avatar${data.avatarId}.png`;
        }
        
        // Update stats on dashboard
        updateDashboardStats(data);
        
        // Update leaderboard position
        updateLeaderboardPosition(data);
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
     * Update dashboard statistics
     * @param {Object} data - Player data
     */
    function updateDashboardStats(data) {
        if (!data || !data.stats) return;
        
        const stats = data.stats;
        
        // Update stats display
        const gamesPlayedElement = document.getElementById('games-played');
        const gamesWonElement = document.getElementById('games-won');
        const killCountElement = document.getElementById('kill-count');
        const heistsCompletedElement = document.getElementById('heists-completed');
        
        if (gamesPlayedElement) gamesPlayedElement.textContent = stats.gamesPlayed || 0;
        if (gamesWonElement) gamesWonElement.textContent = stats.gamesWon || 0;
        if (killCountElement) killCountElement.textContent = stats.killCount || 0;
        if (heistsCompletedElement) heistsCompletedElement.textContent = stats.heistsCompleted || 0;
    }
    
    /**
     * Update leaderboard position
     * @param {Object} data - Player data
     */
    function updateLeaderboardPosition(data) {
        if (!data) return;
        
        const yourRankAvatar = document.getElementById('your-rank-avatar');
        const yourRankName = document.getElementById('your-rank-name');
        const yourRankLevel = document.getElementById('your-rank-level');
        const yourRankScore = document.getElementById('your-rank-score');
        const yourRankWins = document.getElementById('your-rank-wins');
        const yourRankKd = document.getElementById('your-rank-kd');
        
        if (yourRankAvatar && data.avatarId) {
            yourRankAvatar.src = `public/assets/avatars/avatar${data.avatarId}.png`;
        }
        
        if (yourRankName) yourRankName.textContent = data.username || 'You';
        if (yourRankLevel) yourRankLevel.textContent = data.level || 1;
        if (yourRankScore) yourRankScore.textContent = `${data.xp || 0} XP`;
        
        if (yourRankWins && data.stats) {
            yourRankWins.textContent = data.stats.gamesWon || 0;
        }
        
        if (yourRankKd && data.stats) {
            const kills = data.stats.killCount || 0;
            const deaths = data.stats.deathCount || 1; // Avoid division by zero
            const kd = (kills / deaths).toFixed(1);
            yourRankKd.textContent = kd;
        }
    }
    
    /**
     * Initialize stats in the dashboard
     */
    function initializeStats() {
        // This would typically load stats from the server
        // For now, we'll just use placeholder data or player data
    }
    
    /**
     * Setup all event listeners for the game interface
     */
    function setupEventListeners() {
        // Tab navigation
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetPage = link.getAttribute('data-page');
                if (!targetPage) return;
                
                // Update active states
                navLinks.forEach(navLink => navLink.classList.remove('active'));
                link.classList.add('active');
                
                // Show the target page
                pageContents.forEach(page => page.classList.remove('active'));
                document.getElementById(`${targetPage}-page`).classList.add('active');
            });
        });
        
        // Map selection
        mapCards.forEach(card => {
            if (card.classList.contains('locked')) return;
            
            card.addEventListener('click', () => {
                mapCards.forEach(mapCard => mapCard.classList.remove('active'));
                card.classList.add('active');
                selectedMap = card.getAttribute('data-map');
            });
        });
        
        // Difficulty options
        difficultyOptions.forEach(option => {
            option.addEventListener('click', () => {
                difficultyOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                selectedDifficulty = option.getAttribute('data-difficulty');
            });
        });
        
        // Match type toggle
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                toggleButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                isPrivateMatch = button.getAttribute('data-match') === 'private';
                privateCodeGroup.classList.toggle('hidden', !isPrivateMatch);
            });
        });
        
        // Generate private code
        const generateCodeButton = document.querySelector('.generate-code-button');
        if (generateCodeButton) {
            generateCodeButton.addEventListener('click', () => {
                const privateCodeInput = document.getElementById('private-code');
                privateCodeInput.value = generateRandomCode(6);
                privateMatchCode = privateCodeInput.value;
            });
        }
        
        // Start game button
        if (startGameButton) {
            startGameButton.addEventListener('click', () => startGame());
        }
        
        // Quick play button
        if (quickPlayButton) {
            quickPlayButton.addEventListener('click', () => {
                // Show Play tab and auto-start game
                navLinks.forEach(navLink => {
                    if (navLink.getAttribute('data-page') === 'play') {
                        navLink.click();
                        setTimeout(() => startGame(), 500);
                    }
                });
            });
        }
        
        // Close modals on background click
        gameModals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        });
        
        // Theme toggle
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
                setTheme(currentTheme);
                localStorage.setItem('game-theme', currentTheme);
            });
        }
    }
    
    /**
     * Set theme (dark/light)
     * @param {string} theme - Theme name ('dark' or 'light')
     */
    function setTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            if (themeToggle) {
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        } else {
            document.body.classList.remove('light-theme');
            if (themeToggle) {
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            }
        }
    }
    
    /**
     * Start a new game with selected options
     */
    function startGame() {
        // Validate settings
        if (isPrivateMatch) {
            const privateCodeInput = document.getElementById('private-code');
            privateMatchCode = privateCodeInput.value.trim();
            
            if (!privateMatchCode) {
                showNotification("Please enter a private match code", "warning");
                return;
            }
        }
        
        // Show loading game modal
        const loadingTip = document.getElementById('loading-tip');
        if (loadingTip) {
            loadingTip.textContent = getRandomLoadingTip();
        }
        
        showModal(loadingGameModal);
        
        // Simulate connection to game server
        setTimeout(() => {
            // This would connect to the game server and start the game
            // For now, we'll just simulate the process
            closeModal(loadingGameModal);
            showNotification("Game starting functionality is not implemented in this demo", "info");
        }, 3000);
    }
    
    /**
     * Show a modal dialog
     * @param {HTMLElement} modal - The modal element to show
     */
    function showModal(modal) {
        if (!modal) return;
        modal.classList.add('active');
    }
    
    /**
     * Close a modal dialog
     * @param {HTMLElement} modal - The modal element to close
     */
    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('active');
    }
    
    /**
     * Generate a random code for private matches
     * @param {number} length - Length of the code
     * @return {string} - Generated code
     */
    function generateRandomCode(length = 6) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    /**
     * Get a random loading tip
     * @return {string} - A random tip
     */
    function getRandomLoadingTip() {
        return loadingTips[Math.floor(Math.random() * loadingTips.length)];
    }
    
    /**
     * Show a notification message
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
    
    // Wait for authentication to be initialized before starting the game
    document.addEventListener('auth-initialized', () => {
        initGame();
    });
    
    // Initialize game if auth already initialized
    if (window.authInitialized) {
        initGame();
    } else {
        // Show loading screen while waiting for auth
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }
}); 