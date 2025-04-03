/**
 * Shadow Heist Online - Auth System
 * Handles user authentication using Clerk
 */

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(config.FIREBASE_CONFIG);
}

// Initialize Firebase Auth
const auth = firebase.auth();
let currentUser = null;
let authInitialized = false;
let clerkReady = false;

// Config
const REDIRECT_URL = '/game.html';
const LOGIN_URL = '/login.html';

// Initialize Clerk
if (window.Clerk) {
    window.Clerk.load({
        publishableKey: config.CLERK_PUBLISHABLE_KEY
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});

function initializeAuth() {
    // Set up Firebase auth state listener
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        authInitialized = true;
        
        // Dispatch event that auth is initialized
        document.dispatchEvent(new CustomEvent('auth-initialized'));
        
        if (user) {
            // User is signed in
            checkUserProfile(user);
        } else {
            // No user is signed in, redirect to login
            if (!isLoginPage()) {
                window.location.href = 'login.html';
            }
        }
    });
    
    // Set up logout button listener
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            signOutUser();
        });
    }
}

/**
 * Load Clerk script dynamically if not available
 */
function loadClerkScript() {
    console.log("Loading Clerk script");
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
    script.async = true;
    script.onload = () => {
        console.log("Clerk script loaded");
        initializeClerk();
    };
    script.onerror = () => {
        console.error("Failed to load Clerk script");
    };
    
    document.head.appendChild(script);
}

/**
 * Initialize Clerk
 */
function initializeClerk() {
    // Get Clerk publishable key from config
    const publishableKey = window.config?.CLERK_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
        console.error("Clerk publishable key not found in config");
        return;
    }
    
    // Initialize Clerk with the publishable key
    window.Clerk.load({
        publishableKey
    }).then((clerk) => {
        console.log("Clerk initialized");
        
        // Store clerk instance globally
        window.clerk = clerk;
        clerkReady = true;
        
        // Set up auth state change listener
        clerk.addListener(({ user }) => {
            handleAuthStateChange(user);
        });
        
        // Check initial auth state
        if (clerk.user) {
            handleAuthStateChange(clerk.user);
        } else {
            // No user, check if we need to redirect to login
            if (!isLoginPage() && !isRegisterPage()) {
                redirectToLogin();
            } else {
                // We're already on login page, just mark auth as initialized
                markAuthInitialized();
            }
        }
        
        // Setup sign in/up components if on login page
        if (isLoginPage() || isRegisterPage()) {
            setupAuthComponents();
        }
    }).catch(error => {
        console.error("Error initializing Clerk:", error);
    });
}

/**
 * Handle auth state change
 * @param {Object} user - Clerk user object
 */
function handleAuthStateChange(user) {
    if (user) {
        // User is signed in
        console.log(`User is signed in: ${user.id}`);
        currentUser = user;
        
        // If on login page, redirect to game
        if (isLoginPage() || isRegisterPage()) {
            window.location.href = REDIRECT_URL;
            return;
        }
        
        // Check if user has a profile in our database
        checkUserProfile(user);
    } else {
        // User is signed out
        console.log("User is signed out");
        currentUser = null;
        
        // If not on login page, redirect to login
        if (!isLoginPage() && !isRegisterPage()) {
            redirectToLogin();
            return;
        }
        
        markAuthInitialized();
    }
}

/**
 * Setup Clerk auth components
 */
function setupAuthComponents() {
    if (!clerkReady) return;
    
    const signInContainer = document.getElementById('sign-in-container');
    const signUpContainer = document.getElementById('sign-up-container');
    
    if (signInContainer) {
        window.clerk.mountSignIn(signInContainer);
    }
    
    if (signUpContainer) {
        window.clerk.mountSignUp(signUpContainer);
    }
}

/**
 * Check if the current page is the login page
 * @return {boolean} - Whether current page is login page
 */
function isLoginPage() {
    return window.location.pathname.includes('login.html');
}

/**
 * Check if the current page is the register page
 * @return {boolean} - Whether current page is register page
 */
function isRegisterPage() {
    return window.location.pathname.includes('register.html');
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    window.location.href = LOGIN_URL;
}

/**
 * Check if user has a profile in our database
 * @param {Object} user - Clerk user object
 */
function checkUserProfile(user) {
    if (!user) return;
    
    // Get user profile from Firebase
    FirebaseService.getData(`/users/${user.id}`)
        .then(userProfile => {
            if (!userProfile) {
                console.log("User profile not found, creating new profile");
                return createUserProfile(user);
            } else {
                console.log("User profile found");
                return userProfile;
            }
        })
        .then(userProfile => {
            // Update user's online status
            return FirebaseService.updateData(`/users/${user.id}/status`, {
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            }).then(() => userProfile);
        })
        .then(() => {
            markAuthInitialized();
        })
        .catch(error => {
            console.error("Error checking user profile:", error);
            markAuthInitialized();
        });
}

/**
 * Create a new user profile
 * @param {Object} user - Clerk user object
 * @return {Promise} - Resolves with the created user profile
 */
function createUserProfile(user) {
    if (!user) return Promise.reject(new Error("No user provided"));
    
    // Create basic user data
    const userData = {
        userId: user.id,
        username: user.username || user.firstName || `Player${Math.floor(Math.random() * 10000)}`,
        email: user.primaryEmailAddress?.emailAddress,
        avatarId: 1,
        level: 1,
        xp: 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        status: {
            online: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP,
            playing: false
        },
        stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            killCount: 0,
            deathCount: 0,
            kd: 0,
            winRate: 0
        },
        settings: {
            notifications: true,
            theme: 'dark',
            soundEffects: true,
            music: true
        },
        friends: [],
        achievements: []
    };
    
    console.log("Creating new user profile", userData);
    
    // Save to database
    return FirebaseService.setData(`/users/${user.id}`, userData)
        .then(() => {
            console.log("User profile created successfully");
            return userData;
        });
}

/**
 * Sign out the current user
 */
function signOutUser() {
    if (!clerkReady) {
        showAuthError("Authentication not ready");
        return;
    }
    
    // Update user's online status before signing out
    if (currentUser) {
        FirebaseService.updateData(`/users/${currentUser.id}/status`, {
            online: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            // Now sign out
            window.clerk.signOut().then(() => {
                console.log("User signed out");
                // Redirect to login page
                window.location.href = LOGIN_URL;
            }).catch(error => {
                console.error("Error signing out:", error);
                showAuthError("Failed to sign out");
            });
        }).catch(error => {
            console.error("Error updating online status:", error);
            // Still attempt to sign out
            window.clerk.signOut();
        });
    } else {
        // No current user, just sign out
        window.clerk.signOut().then(() => {
            console.log("User signed out");
            // Redirect to login page
            window.location.href = LOGIN_URL;
        }).catch(error => {
            console.error("Error signing out:", error);
            showAuthError("Failed to sign out");
        });
    }
}

/**
 * Show authentication error message
 * @param {string} message - Error message to display
 */
function showAuthError(message) {
    const errorContainer = document.getElementById('auth-error');
    if (!errorContainer) {
        console.error("Auth error:", message);
        return;
    }
    
    errorContainer.textContent = message;
    errorContainer.classList.add('show');
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorContainer.classList.remove('show');
    }, 5000);
}

/**
 * Mark authentication as initialized
 */
function markAuthInitialized() {
    if (authInitialized) return;
    
    authInitialized = true;
    
    // Dispatch event to notify other components
    document.dispatchEvent(new CustomEvent('auth-initialized', {
        detail: { user: currentUser }
    }));
    
    console.log("Auth system initialized");
}

/**
 * Get current user
 * @return {Object|null} - Current user or null if not signed in
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Get current user ID
 * @return {string|null} - Current user ID or null if not signed in
 */
function getCurrentUserId() {
    return currentUser ? currentUser.id : null;
}

/**
 * Check if a user is signed in
 * @return {boolean} - Whether a user is signed in
 */
function isSignedIn() {
    return currentUser !== null;
}

/**
 * Check if the user's email is verified
 * @return {boolean} - Whether user's email is verified
 */
function isEmailVerified() {
    if (!currentUser) return false;
    
    // Check if primary email is verified
    const primaryEmail = currentUser.primaryEmailAddress;
    return primaryEmail ? primaryEmail.verification.status === 'verified' : false;
}

// Public API
const AuthSystem = {
    init: initializeAuth,
    signOut: signOutUser,
    getCurrentUser,
    getCurrentUserId,
    isSignedIn,
    isEmailVerified,
    showAuthError
};

// Make available globally
window.AuthSystem = AuthSystem; 