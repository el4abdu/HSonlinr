/**
 * Shadow Heist Online - Main Application Entry
 */

// Global state
let appState = {
    initialized: false,
    authenticated: false,
    loading: true,
    darkMode: true,
    clerkReady: false,
    firebaseReady: false
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Shadow Heist Online - Initializing application');
    
    // Initialize main components
    initializeApp();
    
    // Set up global event listeners
    setupGlobalEventListeners();
});

/**
 * Initialize the main application
 */
function initializeApp() {
    // Show loading screen
    showLoadingScreen();
    
    // Set up dependency listeners
    setupDependencyListeners();
    
    // Initialize UI components
    initializeUI();
    
    // Check authentication status
    checkAuthStatus();
    
    // Start loading game assets
    loadGameAssets();
}

/**
 * Set up listeners for external dependencies
 */
function setupDependencyListeners() {
    // Listen for Clerk initialization
    document.addEventListener('clerkLoaded', function() {
        console.log('Clerk initialized and ready');
        appState.clerkReady = true;
        checkDependencies();
    });
    
    // Listen for Firebase initialization
    document.addEventListener('firebase-initialized', function() {
        console.log('Firebase initialized and ready');
        appState.firebaseReady = true;
        checkDependencies();
    });
    
    // Listen for configuration loaded
    document.addEventListener('config-loaded', function() {
        console.log('Configuration loaded');
        
        // Initialize Firebase service once config is available
        if (window.FirebaseService && typeof window.FirebaseService.init === 'function') {
            window.FirebaseService.init();
        }
    });
    
    // Listen for auth state changes
    document.addEventListener('auth-initialized', function(event) {
        const user = event.detail?.user;
        appState.authenticated = !!user;
        updateInterfaceForAuthState(user);
    });
    
    // Listen for player data changes
    document.addEventListener('player-data-changed', function(event) {
        const data = event.detail?.data;
        if (data) {
            updatePlayerInterface(data);
        }
    });
    
    // Set safety timeout for dependencies
    setTimeout(function() {
        if (!appState.clerkReady || !appState.firebaseReady) {
            console.warn("Some dependencies failed to initialize within timeout period");
            
            // Try to initialize Firebase if it hasn't loaded
            if (!appState.firebaseReady && window.config) {
                if (window.FirebaseService && typeof window.FirebaseService.init === 'function') {
                    window.FirebaseService.init();
                }
            }
            
            // Force check dependencies to proceed
            checkDependencies(true);
        }
    }, 8000);
}

/**
 * Check if all dependencies are loaded
 * @param {boolean} force - Force proceed even if not all dependencies are ready
 */
function checkDependencies(force = false) {
    if (force || (appState.clerkReady && appState.firebaseReady)) {
        appState.initialized = true;
        proceedToMainInterface();
    }
}

/**
 * Initialize UI components
 */
function initializeUI() {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    
    // Initialize any UI components that don't depend on authentication
    initializeNavigation();
    
    // Initialize tooltip system
    initializeTooltips();
}

/**
 * Initialize navigation system
 */
function initializeNavigation() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('[data-navlink]');
    
    // Add click handlers to each link
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-navlink');
            if (target) {
                navigateTo(target);
            }
        });
    });
    
    // Setup back buttons
    const backButtons = document.querySelectorAll('.back-button');
    backButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            if (target) {
                navigateTo(target);
            }
        });
    });
}

/**
 * Navigate to a specific screen
 * @param {string} screenId - ID of the screen to navigate to
 */
function navigateTo(screenId) {
    // Hide all screens
    const allScreens = document.querySelectorAll('.screen');
    allScreens.forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Show the target screen
    const targetScreen = document.getElementById(`${screenId}-screen`);
    if (targetScreen) {
        targetScreen.style.display = 'block';
    } else {
        console.error(`Screen with ID "${screenId}-screen" not found`);
    }
    
    // Update active navigation state
    const navLinks = document.querySelectorAll('[data-navlink]');
    navLinks.forEach(link => {
        if (link.getAttribute('data-navlink') === screenId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Save last navigation
    localStorage.setItem('lastScreen', screenId);
}

/**
 * Initialize tooltips
 */
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltipText = this.getAttribute('data-tooltip');
            if (tooltipText) {
                showTooltip(this, tooltipText);
            }
        });
        
        element.addEventListener('mouseleave', function() {
            hideTooltip();
        });
    });
}

/**
 * Show tooltip
 * @param {Element} element - Element to show tooltip for
 * @param {string} text - Tooltip text
 */
function showTooltip(element, text) {
    // Remove any existing tooltips
    hideTooltip();
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    
    // Add to document
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
    tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
    
    // Add visible class after layout is calculated
    setTimeout(() => {
        tooltip.classList.add('visible');
    }, 10);
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => {
        tooltip.classList.remove('visible');
        setTimeout(() => {
            tooltip.remove();
        }, 200);
    });
}

/**
 * Check authentication status
 */
function checkAuthStatus() {
    if (window.AuthSystem && typeof window.AuthSystem.init === 'function') {
        // Initialize authentication system
        window.AuthSystem.init();
        
        // Check if user is already authenticated
        if (window.AuthSystem.isAuthenticated) {
            appState.authenticated = true;
            updateInterfaceForAuthState(window.AuthSystem.currentUser);
        } else {
            appState.authenticated = false;
            updateInterfaceForAuthState(null);
        }
    } else {
        console.error("Auth system not found or not properly initialized");
    }
}

/**
 * Update interface based on authentication state
 * @param {Object|null} user - User object or null if not authenticated
 */
function updateInterfaceForAuthState(user) {
    const loginButtons = document.querySelectorAll('#login-button');
    const signupButtons = document.querySelectorAll('#signup-button');
    const logoutButtons = document.querySelectorAll('#logout-button');
    const profileOptions = document.querySelectorAll('#profile-option');
    const userElements = document.querySelectorAll('.user-info');
    
    if (user) {
        // Hide login/signup buttons
        loginButtons.forEach(btn => btn.style.display = 'none');
        signupButtons.forEach(btn => btn.style.display = 'none');
        
        // Show logout button and profile options
        logoutButtons.forEach(btn => btn.style.display = 'block');
        profileOptions.forEach(opt => opt.style.display = 'block');
        
        // Show user elements
        userElements.forEach(el => el.style.display = 'flex');
        
        // Update user display (name will be updated by player-data-changed event)
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = user.displayName || 'Agent';
        });
        
        // Enable gameplay elements
        enableGameplayElements();
    } else {
        // Show login/signup buttons
        loginButtons.forEach(btn => btn.style.display = 'block');
        signupButtons.forEach(btn => btn.style.display = 'block');
        
        // Hide logout button and profile options
        logoutButtons.forEach(btn => btn.style.display = 'none');
        profileOptions.forEach(opt => opt.style.display = 'none');
        
        // Hide user elements
        userElements.forEach(el => el.style.display = 'none');
        
        // Disable gameplay elements
        disableGameplayElements();
    }
}

/**
 * Update player interface with player data
 * @param {Object} playerData - Player data
 */
function updatePlayerInterface(playerData) {
    if (!playerData) return;
    
    // Update player level
    const playerLevelElements = document.querySelectorAll('#player-level');
    playerLevelElements.forEach(element => {
        element.textContent = playerData.level || 1;
    });
    
    // Update player XP
    const playerXPElements = document.querySelectorAll('#player-xp');
    playerXPElements.forEach(element => {
        element.textContent = playerData.xp || 0;
    });
    
    // Update player name
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(element => {
        element.textContent = playerData.displayName || 'Agent';
    });
    
    // Update player avatar
    const userAvatarElements = document.querySelectorAll('.user-avatar');
    userAvatarElements.forEach(element => {
        // Clear previous avatar classes
        element.className = 'user-avatar avatar';
        // Add appropriate avatar class
        element.classList.add(`avatar-${playerData.avatarId || 'default'}`);
    });
    
    // Update player ID
    const playerIdElements = document.querySelectorAll('.player-id');
    playerIdElements.forEach(element => {
        element.textContent = playerData.playerId || '';
    });
}

/**
 * Enable gameplay elements for authenticated users
 */
function enableGameplayElements() {
    const gameplayButtons = document.querySelectorAll('.gameplay-button');
    gameplayButtons.forEach(button => {
        button.disabled = false;
        button.classList.remove('disabled');
    });
    
    // Additional handling for gameplay elements
}

/**
 * Disable gameplay elements for unauthenticated users
 */
function disableGameplayElements() {
    const gameplayButtons = document.querySelectorAll('.gameplay-button');
    gameplayButtons.forEach(button => {
        button.disabled = true;
        button.classList.add('disabled');
    });
    
    // Additional handling for gameplay elements
}

/**
 * Set application theme
 * @param {string} theme - Theme name ('dark' or 'light')
 */
function setTheme(theme) {
    const body = document.body;
    
    if (theme === 'light') {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        appState.darkMode = false;
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        appState.darkMode = true;
    }
    
    // Save theme preference
    localStorage.setItem('theme', theme);
}

/**
 * Toggle application theme
 */
function toggleTheme() {
    const newTheme = appState.darkMode ? 'light' : 'dark';
    setTheme(newTheme);
}

/**
 * Load game assets
 */
function loadGameAssets() {
    let assetsLoaded = 0;
    const totalAssets = 10; // Adjust based on actual asset count
    
    // Simulate asset loading
    const assetLoadInterval = setInterval(() => {
        assetsLoaded++;
        updateLoadingProgress(assetsLoaded, totalAssets);
        
        if (assetsLoaded >= totalAssets) {
            clearInterval(assetLoadInterval);
            finishLoading();
        }
    }, 300);
    
    // Setup safety timeout
    setTimeout(() => {
        clearInterval(assetLoadInterval);
        finishLoading();
    }, 8000);
}

/**
 * Update loading progress
 * @param {number} current - Current progress
 * @param {number} total - Total progress
 */
function updateLoadingProgress(current, total) {
    const progress = Math.min(100, Math.floor((current / total) * 100));
    const loadingBar = document.getElementById('loading-progress');
    const loadingPercentage = document.getElementById('loading-percentage');
    const loadingMessage = document.getElementById('loading-message');
    
    if (loadingBar) {
        loadingBar.style.width = `${progress}%`;
    }
    
    if (loadingPercentage) {
        loadingPercentage.textContent = `${progress}%`;
    }
    
    // Update loading message
    if (loadingMessage) {
        const messages = [
            "Initializing systems...",
            "Loading game assets...",
            "Establishing secure connection...",
            "Calibrating neural interface...",
            "Synchronizing quantum matrices...",
            "Decrypting data streams...",
            "Bypassing security protocols...",
            "Enhancing user interface...",
            "Preparing immersive experience...",
            "Almost ready..."
        ];
        
        const messageIndex = Math.min(Math.floor(progress / 10), messages.length - 1);
        loadingMessage.textContent = messages[messageIndex];
    }
}

/**
 * Show loading screen
 */
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
}

/**
 * Hide loading screen
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            loadingScreen.classList.remove('fade-out');
        }, 500);
    }
}

/**
 * Finish loading and proceed to main interface
 */
function finishLoading() {
    appState.loading = false;
    
    // Wait for dependencies before showing main interface
    if (appState.initialized) {
        proceedToMainInterface();
    }
}

/**
 * Proceed to main interface after loading
 */
function proceedToMainInterface() {
    // Hide loading screen
    hideLoadingScreen();
    
    // Show main screen
    const mainScreen = document.getElementById('main-screen');
    if (mainScreen) {
        mainScreen.style.display = 'block';
        mainScreen.classList.add('fade-in');
    }
    
    // Navigate to last screen or default
    const lastScreen = localStorage.getItem('lastScreen') || 'map';
    navigateTo(lastScreen);
}

/**
 * Set up global event listeners
 */
function setupGlobalEventListeners() {
    // Theme toggle
    const themeToggleButton = document.getElementById('theme-toggle');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }
    
    // Login button
    const loginButtons = document.querySelectorAll('#login-button');
    loginButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.AuthSystem) {
                window.AuthSystem.signIn();
            }
        });
    });
    
    // Signup button
    const signupButtons = document.querySelectorAll('#signup-button');
    signupButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.AuthSystem) {
                window.AuthSystem.signUp();
            }
        });
    });
    
    // Logout button
    const logoutButtons = document.querySelectorAll('#logout-button');
    logoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.AuthSystem) {
                window.AuthSystem.signOut();
            }
        });
    });
    
    // Map location buttons
    const mapLocations = document.querySelectorAll('.map-location');
    mapLocations.forEach(location => {
        location.addEventListener('click', function() {
            const locationId = this.getAttribute('data-location');
            if (locationId) {
                navigateTo(locationId);
            }
        });
    });
    
    // Start mission buttons
    const startMissionButtons = document.querySelectorAll('.start-mission-button');
    startMissionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Only allow if authenticated
            if (!appState.authenticated) {
                // Show login dialog
                if (window.AuthSystem) {
                    window.AuthSystem.signIn();
                }
                return;
            }
            
            // Get parent location screen
            const locationScreen = this.closest('.location-screen');
            if (locationScreen) {
                const locationId = locationScreen.id.replace('-screen', '');
                // Here we would trigger game start with the selected location
                console.log(`Starting mission at location: ${locationId}`);
                // For now, just navigate to lobby
                navigateTo('lobby');
            }
        });
    });
} 