/**
 * Shadow Heist Online - Authentication Module
 * Handles authentication flow with both Clerk and Firebase
 */

const AuthSystem = (function() {
    // Private variables
    let _initialized = false;
    let _currentUser = null;
    let _isClerkUser = false;
    let _onAuthStateChangedListeners = [];
    
    // Initialize auth system
    function init() {
        if (_initialized) return;
        
        console.log("Initializing Auth System...");
        
        // Initialize Firebase Auth
        initFirebaseAuth();
        
        // Initialize Clerk integration
        initClerk();
        
        _initialized = true;
        console.log("Auth System initialized");
    }
    
    // Initialize Firebase Auth
    function initFirebaseAuth() {
        if (!firebase || !firebase.auth) {
            console.error("Firebase Auth SDK not available");
            return;
        }
        
        // Set up auth state listener
        firebase.auth().onAuthStateChanged(user => {
            if (user && !_isClerkUser) {
                console.log("Firebase Auth: User signed in", user.uid);
                _currentUser = user;
                
                // Notify listeners
                notifyAuthStateChanged(user);
                
                // Update last login time
                if (FirebaseService.initialized) {
                    FirebaseService.updatePlayerData({
                        lastLogin: firebase.database.ServerValue.TIMESTAMP
                    }).catch(error => console.error("Error updating lastLogin:", error));
                }
            } else if (!user && !_isClerkUser) {
                console.log("Firebase Auth: User signed out");
                _currentUser = null;
                
                // Notify listeners
                notifyAuthStateChanged(null);
            }
        });
    }
    
    // Initialize Clerk integration
    function initClerk() {
        if (typeof window.Clerk === 'undefined') {
            console.log("Clerk SDK not loaded yet, waiting...");
            
            // If Clerk is not loaded yet, wait for it
            const clerkCheckInterval = setInterval(() => {
                if (typeof window.Clerk !== 'undefined') {
                    clearInterval(clerkCheckInterval);
                    setupClerkListeners();
                }
            }, 100);
            
            // Safety timeout
            setTimeout(() => {
                clearInterval(clerkCheckInterval);
                if (typeof window.Clerk === 'undefined') {
                    console.warn("Clerk SDK did not load after waiting");
                }
            }, 5000);
        } else {
            setupClerkListeners();
        }
    }
    
    // Set up Clerk event listeners
    function setupClerkListeners() {
        if (!window.Clerk) return;
        
        // Listen for sign in events
        window.Clerk.addListener(({ user }) => {
            if (user) {
                _isClerkUser = true;
                
                // When Clerk user signs in, authenticate with Firebase too
                authenticateWithFirebase(user);
            } else {
                _isClerkUser = false;
                _currentUser = null;
                
                // Sign out of Firebase too
                if (firebase && firebase.auth) {
                    firebase.auth().signOut().catch(error => {
                        console.error("Error signing out of Firebase:", error);
                    });
                }
                
                // Notify listeners
                notifyAuthStateChanged(null);
                
                // Update UI
                updateAuthUI(false);
            }
        });
        
        // Check if already signed in
        if (window.Clerk.user) {
            _isClerkUser = true;
            authenticateWithFirebase(window.Clerk.user);
        }
    }
    
    // Authenticate with Firebase using Clerk user
    function authenticateWithFirebase(clerkUser) {
        if (!firebase || !firebase.auth) {
            console.error("Firebase Auth SDK not available");
            return;
        }
        
        // Create a custom token for Firebase authentication
        getFirebaseToken(clerkUser)
            .then(token => {
                return firebase.auth().signInWithCustomToken(token);
            })
            .then(userCredential => {
                console.log("Firebase Auth: Authenticated with Clerk", userCredential.user.uid);
                _currentUser = userCredential.user;
                
                // Update user profile to match Clerk data
                updateFirebaseProfile(clerkUser);
                
                // Notify listeners
                notifyAuthStateChanged(_currentUser);
                
                // Update UI
                updateAuthUI(true);
            })
            .catch(error => {
                console.error("Error authenticating with Firebase:", error);
                // Fallback: Still consider the user authenticated through Clerk
                _currentUser = {
                    uid: clerkUser.id,
                    displayName: clerkUser.fullName || clerkUser.username,
                    email: clerkUser.primaryEmailAddress?.emailAddress,
                    isClerkOnly: true
                };
                
                // Notify listeners
                notifyAuthStateChanged(_currentUser);
                
                // Update UI
                updateAuthUI(true);
            });
    }
    
    // Get Firebase token from backend
    // In a real app, this would call your backend endpoint that generates a Firebase custom token
    function getFirebaseToken(clerkUser) {
        // Since we don't have a real backend endpoint available, we'll simulate this for demo
        // NOTE: In a production app, you would NEVER do this on the client side
        
        // For demo purposes only: this is not secure and is just for demonstration
        // We're creating a simple token with the Clerk user ID, which Firebase will reject
        // but we'll handle that error gracefully
        
        return new Promise((resolve, reject) => {
            // In a real app: 
            // 1. Call your backend API with the Clerk session token
            // 2. Backend verifies the token with Clerk
            // 3. Backend generates a Firebase custom token
            // 4. Return the token to the client
            
            // Instead, we'll resolve with a fake token
            setTimeout(() => {
                resolve("demo-token-" + clerkUser.id);
            }, 500);
        });
    }
    
    // Update Firebase profile with Clerk data
    function updateFirebaseProfile(clerkUser) {
        if (!firebase || !firebase.auth().currentUser) return;
        
        const firebaseUser = firebase.auth().currentUser;
        
        // Only update if needed
        if (firebaseUser.displayName !== clerkUser.fullName && clerkUser.fullName) {
            firebaseUser.updateProfile({
                displayName: clerkUser.fullName
            }).catch(error => {
                console.error("Error updating profile:", error);
            });
        }
    }
    
    // Update UI based on auth state
    function updateAuthUI(isLoggedIn) {
        // Show/hide login and logout buttons
        const loginButtons = document.querySelectorAll('#login-button');
        const signupButtons = document.querySelectorAll('#signup-button');
        const logoutButtons = document.querySelectorAll('#logout-button');
        const profileOptions = document.querySelectorAll('#profile-option');
        
        loginButtons.forEach(button => {
            button.style.display = isLoggedIn ? 'none' : 'block';
        });
        
        signupButtons.forEach(button => {
            button.style.display = isLoggedIn ? 'none' : 'block';
        });
        
        logoutButtons.forEach(button => {
            button.style.display = isLoggedIn ? 'block' : 'none';
        });
        
        profileOptions.forEach(option => {
            option.style.display = isLoggedIn ? 'block' : 'none';
        });
        
        // Update user display
        if (isLoggedIn && _currentUser) {
            const userAvatarElements = document.querySelectorAll('.user-avatar');
            const userNameElements = document.querySelectorAll('.user-name');
            
            // If we have player data
            if (FirebaseService.initialized && FirebaseService.playerData) {
                const playerData = FirebaseService.playerData;
                
                // Update display name
                userNameElements.forEach(element => {
                    element.textContent = playerData.displayName || 'Agent';
                });
                
                // Set avatar
                userAvatarElements.forEach(element => {
                    element.className = '';
                    element.classList.add('avatar', `avatar-${playerData.avatarId || 'default'}`);
                });
            } else {
                // Use basic user data
                userNameElements.forEach(element => {
                    element.textContent = _currentUser.displayName || 'Agent';
                });
            }
        }
    }
    
    // Sign in with Clerk
    function signIn() {
        if (window.Clerk) {
            window.Clerk.openSignIn();
        } else {
            console.error("Clerk SDK not available");
        }
    }
    
    // Sign up with Clerk
    function signUp() {
        if (window.Clerk) {
            window.Clerk.openSignUp();
        } else {
            console.error("Clerk SDK not available");
        }
    }
    
    // Sign out
    function signOut() {
        if (window.Clerk && _isClerkUser) {
            window.Clerk.signOut();
        } else if (firebase && firebase.auth) {
            firebase.auth().signOut().catch(error => {
                console.error("Error signing out:", error);
            });
        }
    }
    
    // Add auth state changed listener
    function addAuthStateChangedListener(listener) {
        if (typeof listener === 'function') {
            _onAuthStateChangedListeners.push(listener);
            
            // Call immediately with current state if available
            if (_initialized && _currentUser) {
                listener(_currentUser);
            }
        }
    }
    
    // Remove auth state changed listener
    function removeAuthStateChangedListener(listener) {
        const index = _onAuthStateChangedListeners.indexOf(listener);
        if (index !== -1) {
            _onAuthStateChangedListeners.splice(index, 1);
        }
    }
    
    // Notify all auth state change listeners
    function notifyAuthStateChanged(user) {
        _onAuthStateChangedListeners.forEach(listener => {
            try {
                listener(user);
            } catch (error) {
                console.error("Error in auth state change listener:", error);
            }
        });
        
        // Also dispatch a DOM event for compatibility
        document.dispatchEvent(new CustomEvent('auth-initialized', { detail: { user } }));
    }
    
    // Public API
    return {
        init,
        signIn,
        signUp,
        signOut,
        addAuthStateChangedListener,
        removeAuthStateChangedListener,
        // Getters
        get currentUser() { return _currentUser; },
        get isAuthenticated() { return !!_currentUser; },
        get initialized() { return _initialized; }
    };
})();

// Initialize auth system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth system
    AuthSystem.init();
    
    // Set up auth-related event listeners
    setupAuthEventListeners();
});

// Set up event listeners for auth-related buttons
function setupAuthEventListeners() {
    // Login buttons
    const loginButtons = document.querySelectorAll('#login-button');
    loginButtons.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            AuthSystem.signIn();
        });
    });
    
    // Signup buttons
    const signupButtons = document.querySelectorAll('#signup-button');
    signupButtons.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            AuthSystem.signUp();
        });
    });
    
    // Logout buttons
    const logoutButtons = document.querySelectorAll('#logout-button');
    logoutButtons.forEach(button => {
        button.addEventListener('click', event => {
            event.preventDefault();
            AuthSystem.signOut();
        });
    });
}

// Make auth system available globally
window.AuthSystem = AuthSystem; 