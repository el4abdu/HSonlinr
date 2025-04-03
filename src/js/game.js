/**
 * Shadow Heist Online - Main Game Interface
 * Modern immersive game experience for 2025
 */

// Global variables
let gameState = {
    loading: true,
    loadingProgress: 0,
    currentScreen: 'loading',
    playerData: null,
    playerLevel: 1,
    playerXP: 0,
    playerCurrency: 0,
    playerInventory: [],
    playerSkills: {},
    playerStats: {
        wins: 0,
        losses: 0,
        heistsCompleted: 0,
        itemsCollected: 0
    },
    settings: {
        soundEnabled: true,
        musicEnabled: true,
        theme: 'dark'
    },
    selectedAvatar: 'default',
    lastLocation: null
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("Game.js - DOM Content Loaded");
    
    // Initialize game
    initGame();
});

// Listen for Firebase initialization
document.addEventListener('firebase-initialized', function() {
    console.log("Game.js - Firebase initialized event received");
    if (gameState.loading) {
        updateLoadingProgress(40, "Connecting to game servers...");
    }
});

// Listen for authentication changes
document.addEventListener('auth-initialized', function(event) {
    console.log("Game.js - Auth initialized event received");
    const user = event.detail?.user;
    if (user) {
        console.log("Game.js - User is authenticated:", user.uid);
        if (gameState.loading) {
            updateLoadingProgress(60, "Loading player data...");
        }
    } else {
        console.log("Game.js - User is not authenticated");
    }
});

// Listen for player data changes
document.addEventListener('player-data-changed', function(event) {
    console.log("Game.js - Player data changed event received");
    const data = event.detail?.data;
    if (data) {
        gameState.playerData = data;
        updatePlayerUI(data);
        if (gameState.loading) {
            updateLoadingProgress(80, "Preparing game interface...");
        }
    }
});

/**
 * Initialize the game interface
 */
function initGame() {
    console.log("Game.js - Initializing game interface");
    
    // Main elements
    const loadingScreen = document.getElementById('loading-screen');
    const mainScreen = document.getElementById('main-screen');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingPercentage = document.getElementById('loading-percentage');
    const loadingMessage = document.getElementById('loading-message');
    
    // Make sure loading screen is visible
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
    
    // Hide main screen
    if (mainScreen) {
        mainScreen.style.display = 'none';
    }
    
    // Start loading process
    startLoading();
    
    // Setup event listeners
    setupEventListeners();
    
    // Set theme from localStorage
    const savedTheme = localStorage.getItem('game-theme') || 'dark';
    setTheme(savedTheme);
    
    // Initialize stats for the dashboard
    initializeStats();
}

/**
 * Start the loading process
 */
function startLoading() {
    console.log("Game.js - Starting loading process");
    
    // Reset loading progress
    gameState.loadingProgress = 0;
    
    // Update initial loading state
    updateLoadingProgress(10, "Initializing game systems...");
    
    // Check if required libraries are available
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not loaded!");
        showErrorScreen("Failed to load game resources. Please refresh or try again later.");
        return;
    }
    
    // Update progress after checking libraries
    updateLoadingProgress(20, "Loading game assets...");
    
    // Start simulated loading process
    simulateLoading();
}

/**
 * Update loading progress
 * @param {number} progress - Loading progress (0-100)
 * @param {string} message - Loading message
 */
function updateLoadingProgress(progress, message) {
    gameState.loadingProgress = progress;
    
    const loadingProgress = document.getElementById('loading-progress');
    const loadingPercentage = document.getElementById('loading-percentage');
    const loadingMessage = document.getElementById('loading-message');
    
    if (loadingProgress) {
        loadingProgress.style.width = `${progress}%`;
    }
    
    if (loadingPercentage) {
        loadingPercentage.textContent = `${Math.floor(progress)}%`;
    }
    
    if (loadingMessage && message) {
        loadingMessage.textContent = message;
    }
}

/**
 * Simulate loading process
 */
function simulateLoading() {
    console.log("Game.js - Simulating loading process");
    
    // Define key loading checkpoints
    const loadingCheckpoints = [
        { progress: 30, message: "Establishing secure connection..." },
        { progress: 50, message: "Downloading game assets..." },
        { progress: 70, message: "Preparing game interface..." },
        { progress: 90, message: "Finalizing setup..." },
        { progress: 100, message: "Ready to play!" }
    ];
    
    let checkpointIndex = 0;
    let lastProgress = gameState.loadingProgress;
    
    // Process loading checkpoints
    const loadingInterval = setInterval(() => {
        // Check if we've reached the next checkpoint
        if (checkpointIndex < loadingCheckpoints.length) {
            const checkpoint = loadingCheckpoints[checkpointIndex];
            
            // If we've reached or passed this checkpoint
            if (gameState.loadingProgress >= checkpoint.progress) {
                updateLoadingProgress(checkpoint.progress, checkpoint.message);
                checkpointIndex++;
                
                // If this is the last checkpoint, complete loading
                if (checkpointIndex >= loadingCheckpoints.length) {
                    clearInterval(loadingInterval);
                    
                    // Give a small delay before completion for UI effect
                    setTimeout(() => {
                        completeLoading();
                    }, 500);
                }
            } else {
                // Increment progress towards next checkpoint
                const newProgress = Math.min(
                    gameState.loadingProgress + Math.random() * 2, 
                    checkpoint.progress
                );
                updateLoadingProgress(newProgress);
            }
        }
    }, 200);
    
    // Safety timeout - ensure loading completes
    setTimeout(() => {
        clearInterval(loadingInterval);
        if (gameState.loading) {
            console.log("Game.js - Loading safety timeout triggered");
            updateLoadingProgress(100, "Ready to play!");
            completeLoading();
        }
    }, 10000);
}

/**
 * Complete loading and show main screen
 */
function completeLoading() {
    console.log("Game.js - Completing loading process");
    
    gameState.loading = false;
    
    const loadingScreen = document.getElementById('loading-screen');
    const mainScreen = document.getElementById('main-screen');
    
    // Add fade-out class to loading screen
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        
        // Hide loading screen after animation
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            loadingScreen.classList.remove('fade-out');
        }, 500);
    }
    
    // Show main screen with fade-in effect
    if (mainScreen) {
        mainScreen.style.display = 'block';
        mainScreen.classList.add('fade-in');
        
        // Remove fade-in class after animation
        setTimeout(() => {
            mainScreen.classList.remove('fade-in');
        }, 500);
    }
    
    // Check if player is authenticated
    checkPlayerAuthentication();
}

/**
 * Check if player is authenticated
 */
function checkPlayerAuthentication() {
    console.log("Game.js - Checking player authentication");
    
    if (firebase.auth().currentUser) {
        // User is already authenticated
        console.log("Game.js - User already authenticated:", firebase.auth().currentUser.uid);
        loadPlayerData();
    } else {
        // Listen for auth state changes
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                // User is signed in
                console.log("Game.js - User authenticated:", user.uid);
                loadPlayerData();
            } else {
                // User is signed out
                console.log("Game.js - User is not authenticated");
                showLoginOptions();
            }
        });
    }
}

/**
 * Show login options
 */
function showLoginOptions() {
    console.log("Game.js - Showing login options");
    
    // Show login/signup buttons
    const loginButtons = document.querySelectorAll('#login-button');
    loginButtons.forEach(button => {
        button.style.display = 'block';
    });
    
    const signupButtons = document.querySelectorAll('#signup-button');
    signupButtons.forEach(button => {
        button.style.display = 'block';
    });
    
    // Hide logout buttons
    const logoutButtons = document.querySelectorAll('#logout-button');
    logoutButtons.forEach(button => {
        button.style.display = 'none';
    });
    
    // Hide profile options
    const profileOptions = document.querySelectorAll('#profile-option');
    profileOptions.forEach(option => {
        option.style.display = 'none';
    });
}

/**
 * Load player data from Firebase
 */
function loadPlayerData() {
    console.log("Game.js - Loading player data");
    
    if (!firebase.auth().currentUser) {
        console.error("Cannot load player data: User not authenticated");
        return;
    }
    
    const userId = firebase.auth().currentUser.uid;
    
    // First check if FirebaseService is available
    if (window.FirebaseService && window.FirebaseService.playerData) {
        console.log("Game.js - Using player data from FirebaseService");
        gameState.playerData = window.FirebaseService.playerData;
        updatePlayerUI(gameState.playerData);
        return;
    }
    
    // Fallback: load data directly
    console.log("Game.js - Loading player data directly from Firebase");
    firebase.database().ref(`players/${userId}`).once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                gameState.playerData = snapshot.val();
                console.log("Game.js - Player data loaded:", gameState.playerData);
                updatePlayerUI(gameState.playerData);
            } else {
                console.log("Game.js - No player profile found, creating new one");
                createNewPlayerProfile(userId);
            }
        })
        .catch(error => {
            console.error("Error loading player data:", error);
            showNotification("Error loading your profile data. Please try again.", "error");
        });
}

/**
 * Create a new player profile
 * @param {string} userId - Firebase user ID
 */
function createNewPlayerProfile(userId) {
    console.log("Game.js - Creating new player profile");
    
    // Generate random player ID
    const playerId = generatePlayerId();
    
    // Get user details from Firebase Auth
    let displayName = "Agent";
    let email = "";
    
    if (firebase.auth().currentUser) {
        displayName = firebase.auth().currentUser.displayName || "Agent";
        email = firebase.auth().currentUser.email || "";
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
            console.log("Game.js - Player profile created successfully");
            gameState.playerData = newPlayer;
            updatePlayerUI(newPlayer);
        })
        .catch(error => {
            console.error("Error creating player profile:", error);
            showNotification("Error creating your profile. Please try again.", "error");
        });
}

/**
 * Generate a unique player ID
 * @returns {string} - Random player ID
 */
function generatePlayerId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

/**
 * Update player UI with data
 * @param {Object} data - Player data object
 */
function updatePlayerUI(data) {
    console.log("Game.js - Updating player UI with data");
    
    if (!data) {
        console.error("Cannot update UI: No player data provided");
        return;
    }
    
    // Update player name
    const playerNameDisplay = document.getElementById('player-name-display');
    if (playerNameDisplay) {
        playerNameDisplay.textContent = data.displayName || 'Agent';
    }
    
    // Update player level
    const playerLevelElements = document.querySelectorAll('#player-level');
    playerLevelElements.forEach(element => {
        element.textContent = data.level || 1;
    });
    
    // Update player XP
    const playerXPElements = document.querySelectorAll('#player-xp');
    playerXPElements.forEach(element => {
        element.textContent = data.xp || 0;
    });
    
    // Update player currency
    const playerCurrencyElements = document.querySelectorAll('#player-currency');
    playerCurrencyElements.forEach(element => {
        element.textContent = data.currency || 500;
    });
    
    // Update player avatar
    const userAvatarElements = document.querySelectorAll('#user-avatar');
    userAvatarElements.forEach(element => {
        // Clear previous avatar classes
        element.className = 'player-avatar avatar';
        // Add appropriate avatar class
        element.classList.add(`avatar-${data.avatarId || 'default'}`);
    });
    
    // Hide login/signup buttons
    const loginButtons = document.querySelectorAll('#login-button');
    loginButtons.forEach(button => {
        button.style.display = 'none';
    });
    
    const signupButtons = document.querySelectorAll('#signup-button');
    signupButtons.forEach(button => {
        button.style.display = 'none';
    });
    
    // Show logout buttons
    const logoutButtons = document.querySelectorAll('#logout-button');
    logoutButtons.forEach(button => {
        button.style.display = 'block';
    });
    
    // Show profile options
    const profileOptions = document.querySelectorAll('#profile-option');
    profileOptions.forEach(option => {
        option.style.display = 'block';
    });
    
    // Update dashboard stats
    updateDashboardStats(data);
}

/**
 * Calculate XP required for a specific level
 * @param {number} level - Level to calculate XP for
 * @returns {number} - XP required
 */
function calcXpForLevel(level) {
    // XP formula: 100 * level^2
    return 100 * Math.pow(level, 2);
}

/**
 * Update dashboard statistics
 * @param {Object} data - Player data
 */
function updateDashboardStats(data) {
    if (!data || !data.stats) return;
    
    // Update stats on dashboard if dashboard elements exist
    const statsElements = {
        'games-played': data.stats.gamesPlayed || 0,
        'games-won': data.stats.wins || 0,
        'win-ratio': data.stats.gamesPlayed ? 
            Math.round((data.stats.wins / data.stats.gamesPlayed) * 100) + '%' : '0%',
        'tasks-completed': data.stats.tasksCompleted || 0,
        'traitor-wins': data.stats.traitorWins || 0,
        'civilian-wins': data.stats.civilianWins || 0
    };
    
    // Update each stat element if it exists
    for (const [id, value] of Object.entries(statsElements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}

/**
 * Initialize statistics
 */
function initializeStats() {
    // This will be filled in when we have player data
}

/**
 * Setup event listeners for game interface
 */
function setupEventListeners() {
    console.log("Game.js - Setting up event listeners");
    
    // Login button
    const loginButtons = document.querySelectorAll('#login-button');
    loginButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // Check if Clerk is available
            if (window.Clerk) {
                window.Clerk.openSignIn();
            } else if (window.AuthSystem) {
                window.AuthSystem.signIn();
            } else {
                console.error("No authentication system available");
                showNotification("Authentication system not available", "error");
            }
        });
    });
    
    // Signup button
    const signupButtons = document.querySelectorAll('#signup-button');
    signupButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // Check if Clerk is available
            if (window.Clerk) {
                window.Clerk.openSignUp();
            } else if (window.AuthSystem) {
                window.AuthSystem.signUp();
            } else {
                console.error("No authentication system available");
                showNotification("Authentication system not available", "error");
            }
        });
    });
    
    // Logout button
    const logoutButtons = document.querySelectorAll('#logout-button');
    logoutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // Check if Clerk is available
            if (window.Clerk) {
                window.Clerk.signOut();
            } else if (window.AuthSystem) {
                window.AuthSystem.signOut();
            } else if (firebase.auth) {
                firebase.auth().signOut();
            } else {
                console.error("No authentication system available");
                showNotification("Authentication system not available", "error");
            }
        });
    });
    
    // Map locations
    const mapLocations = document.querySelectorAll('.map-location');
    mapLocations.forEach(location => {
        location.addEventListener('click', function() {
            const locationId = this.getAttribute('data-location');
            if (locationId) {
                // Hide map screen
                const mapScreen = document.getElementById('map-screen');
                if (mapScreen) {
                    mapScreen.style.display = 'none';
                }
                
                // Show selected location screen
                const locationScreen = document.getElementById(`${locationId}-screen`);
                if (locationScreen) {
                    locationScreen.style.display = 'block';
                }
            }
        });
    });
    
    // Back buttons
    const backButtons = document.querySelectorAll('.back-button');
    backButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            if (target) {
                // Hide current screen (parent of the button)
                const currentScreen = this.closest('.location-screen');
                if (currentScreen) {
                    currentScreen.style.display = 'none';
                }
                
                // Show target screen
                const targetScreen = document.getElementById(`${target}-screen`);
                if (targetScreen) {
                    targetScreen.style.display = 'block';
                }
            }
        });
    });
    
    // Start mission buttons
    const startMissionButtons = document.querySelectorAll('.start-mission-button');
    startMissionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Only proceed if user is authenticated
            if (!firebase.auth().currentUser) {
                // Show login dialog
                if (window.Clerk) {
                    window.Clerk.openSignIn();
                } else if (window.AuthSystem) {
                    window.AuthSystem.signIn();
                }
                return;
            }
            
            // Get the location ID from the parent location screen
            const locationScreen = this.closest('.location-screen');
            if (locationScreen) {
                const locationId = locationScreen.id.replace('-screen', '');
                startGame(locationId);
            }
        });
    });
    
    // Settings button
    const settingsOption = document.getElementById('settings-option');
    if (settingsOption) {
        settingsOption.addEventListener('click', function() {
            showModal('settings-modal');
        });
    }
    
    // Profile button
    const profileOption = document.getElementById('profile-option');
    if (profileOption) {
        profileOption.addEventListener('click', function() {
            showModal('profile-modal');
        });
    }
}

/**
 * Set theme for the game
 * @param {string} theme - Theme name ('dark' or 'light')
 */
function setTheme(theme) {
    const body = document.body;
    
    if (theme === 'light') {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
    }
    
    gameState.settings.theme = theme;
    localStorage.setItem('game-theme', theme);
}

/**
 * Start the game with selected location
 * @param {string} locationId - ID of the selected location
 */
function startGame(locationId) {
    console.log(`Game.js - Starting game at location: ${locationId}`);
    
    // Save last location
    gameState.lastLocation = locationId;
    
    // Show loading game modal
    showModal('loading-game-modal');
    
    // Update loading message
    const loadingGameMessage = document.querySelector('#loading-game-modal .loading-message');
    if (loadingGameMessage) {
        loadingGameMessage.textContent = `Preparing ${locationId.toUpperCase()} mission...`;
    }
    
    // Simulate game preparation
    setTimeout(() => {
        // Hide all location screens
        const locationScreens = document.querySelectorAll('.location-screen');
        locationScreens.forEach(screen => {
            screen.style.display = 'none';
        });
        
        // Hide map screen
        const mapScreen = document.getElementById('map-screen');
        if (mapScreen) {
            mapScreen.style.display = 'none';
        }
        
        // Close loading modal
        closeModal('loading-game-modal');
        
        // Show lobby screen or game screen
        // For now, just show map screen again
        if (mapScreen) {
            mapScreen.style.display = 'block';
        }
        
        // In a real implementation, we would transition to the lobby or game screen
        showNotification(`Started mission at ${locationId.toUpperCase()}. Game play to be implemented.`, 'success');
    }, 2000);
}

/**
 * Show a modal
 * @param {string} modalId - ID of the modal to show
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Close a modal
 * @param {string} modalId - ID of the modal to close
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Show error screen
 * @param {string} message - Error message
 */
function showErrorScreen(message) {
    // Create error overlay if it doesn't exist
    let errorScreen = document.getElementById('error-screen');
    
    if (!errorScreen) {
        errorScreen = document.createElement('div');
        errorScreen.id = 'error-screen';
        errorScreen.className = 'error-screen';
        
        const errorContent = document.createElement('div');
        errorContent.className = 'error-content';
        
        const errorTitle = document.createElement('h2');
        errorTitle.textContent = 'Error';
        
        const errorMessage = document.createElement('p');
        errorMessage.id = 'error-message';
        
        const errorButton = document.createElement('button');
        errorButton.className = 'btn btn-primary';
        errorButton.textContent = 'Reload';
        errorButton.addEventListener('click', () => {
            window.location.reload();
        });
        
        errorContent.appendChild(errorTitle);
        errorContent.appendChild(errorMessage);
        errorContent.appendChild(errorButton);
        errorScreen.appendChild(errorContent);
        
        document.body.appendChild(errorScreen);
    }
    
    // Update error message
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    
    // Show error screen
    errorScreen.style.display = 'flex';
}

/**
 * Show notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type (info, success, warning, error)
 * @param {number} duration - Duration in milliseconds
 */
function showNotification(message, type = 'info', duration = 5000) {
    // Create notification container if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add icon based on type
    const iconMap = {
        'info': 'fa-info-circle',
        'success': 'fa-check-circle',
        'warning': 'fa-exclamation-triangle',
        'error': 'fa-times-circle'
    };
    
    const icon = document.createElement('i');
    icon.className = `fas ${iconMap[type] || iconMap.info}`;
    
    const notificationMessage = document.createElement('span');
    notificationMessage.textContent = message;
    
    notification.appendChild(icon);
    notification.appendChild(notificationMessage);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
        notification.classList.add('notification-hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    notification.appendChild(closeButton);
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Add visible class after a small delay (for animation)
    setTimeout(() => {
        notification.classList.add('notification-show');
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        notification.classList.add('notification-hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
} 