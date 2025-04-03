/**
 * Shadow Heist Online - Configuration
 * Global game configuration and constants
 */

// Game Configuration
const config = {
    // Firebase Configuration
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyBUKyRMxw2TI1KeUt0SjE5mdh1gJozcgkg",
        authDomain: "hsonline-2d022.firebaseapp.com",
        projectId: "hsonline-2d022",
        storageBucket: "hsonline-2d022.firebasestorage.app",
        messagingSenderId: "790135168815",
        appId: "1:790135168815:web:e43ab3e10c2263c9398bda",
        measurementId: "G-ZP1ZXJ8XW3",
        databaseURL: "https://hsonline-2d022-default-rtdb.firebaseio.com"
    },
    
    // Clerk Configuration
    CLERK_PUBLISHABLE_KEY: "pk_test_Z2VuZXJvdXMtcXVhZ2dhLTI4LmNsZXJrLmFjY291bnRzLmRldiQ",
    
    // Game Features
    FEATURES: {
        // Avatar System
        AVATARS: {
            ENABLED: true,
            COUNT: 6,
            BASE_PATH: "assets/avatars/"
        },
        
        // Dynamic Difficulty
        DIFFICULTY: {
            EASY: {
                TIME_MULTIPLIER: 1.3,
                SABOTAGE_DELAY: 60,
                TASK_COUNT: 3
            },
            NORMAL: {
                TIME_MULTIPLIER: 1.0,
                SABOTAGE_DELAY: 45,
                TASK_COUNT: 3
            },
            HARD: {
                TIME_MULTIPLIER: 0.8,
                SABOTAGE_DELAY: 30,
                TASK_COUNT: 4
            }
        },
        
        // UI Features
        UI_ANIMATIONS: true,
        THEMES: {
            LIGHT: "light-theme",
            DARK: "dark-theme"
        }
    },
    
    // Game Roles
    ROLES: {
        MASTER_THIEF: {
            ID: "master_thief",
            NAME: "Master Thief",
            TEAM: "hero",
            DESCRIPTION: "Knows one innocent player. Can 'lockpick' to delay sabotage.",
            ABILITIES: ["lockpick", "identify_innocent"],
            COLOR: "#7551FF",
            ICON: "key"
        },
        HACKER: {
            ID: "hacker",
            NAME: "Hacker",
            TEAM: "hero",
            DESCRIPTION: "Can reveal a player's true alignment once per game.",
            ABILITIES: ["investigate"],
            COLOR: "#00E5FF",
            ICON: "laptop-code"
        },
        INFILTRATOR: {
            ID: "infiltrator",
            NAME: "Infiltrator",
            TEAM: "traitor",
            DESCRIPTION: "Sabotages tasks secretly. Can frame a player as suspicious.",
            ABILITIES: ["sabotage", "frame"],
            COLOR: "#FF4B4B",
            ICON: "user-ninja"
        },
        DOUBLE_AGENT: {
            ID: "double_agent",
            NAME: "Double Agent",
            TEAM: "traitor",
            DESCRIPTION: "Appears innocent in investigations. Can fake tasks.",
            ABILITIES: ["fake_task", "deceive"],
            COLOR: "#FF5E8A",
            ICON: "user-secret"
        },
        CIVILIAN: {
            ID: "civilian",
            NAME: "Civilian",
            TEAM: "neutral",
            DESCRIPTION: "Must complete tasks to win but can be framed.",
            ABILITIES: ["complete_task"],
            COLOR: "#FFB13C",
            ICON: "user"
        }
    },
    
    // Game Phases
    PHASES: {
        SETUP: "setup",
        NIGHT: "night",
        DAY: "day",
        VOTING: "voting",
        TASK: "task",
        RESULT: "result"
    },
    
    // Game Settings
    SETTINGS: {
        PLAYERS_COUNT: 6,
        NIGHT_PHASE_TIME: 30, // seconds
        DAY_PHASE_TIME: 120, // seconds
        VOTING_PHASE_TIME: 30, // seconds
        TASK_PHASE_TIME: 60, // seconds
        RESULT_PHASE_TIME: 15, // seconds
        TASKS_TO_WIN: 3,
        SABOTAGES_TO_LOSE: 3
    },
    
    // Tasks Configuration
    TASKS: {
        WIRING: {
            ID: "wiring",
            NAME: "Connect the Wires",
            DESCRIPTION: "Connect matching colored wires to bypass security",
            DIFFICULTY: 1,
            TIME_LIMIT: 30
        },
        HACKING: {
            ID: "hacking",
            NAME: "Hack the Terminal",
            DESCRIPTION: "Enter the correct code sequence to access the system",
            DIFFICULTY: 2,
            TIME_LIMIT: 45
        },
        LOCKPICKING: {
            ID: "lockpicking",
            NAME: "Pick the Lock",
            DESCRIPTION: "Align the pins correctly to unlock the door",
            DIFFICULTY: 2,
            TIME_LIMIT: 40
        },
        KEYPAD: {
            ID: "keypad",
            NAME: "Keypad Code",
            DESCRIPTION: "Enter the correct sequence on the keypad",
            DIFFICULTY: 1,
            TIME_LIMIT: 30
        }
    },
    
    // Achievement System
    ACHIEVEMENTS: {
        MASTER_THIEF: {
            ID: "master_thief_achievement",
            TITLE: "Shadow Master",
            DESCRIPTION: "Win 5 games as the Master Thief",
            ICON: "fa-key",
            REWARD: {
                XP: 1000
            }
        },
        HACKER_ELITE: {
            ID: "hacker_elite",
            TITLE: "Code Breaker",
            DESCRIPTION: "Successfully identify 10 traitors as Hacker",
            ICON: "fa-laptop-code",
            REWARD: {
                XP: 800
            }
        },
        PERFECT_INFILTRATOR: {
            ID: "perfect_infiltrator",
            TITLE: "Perfect Saboteur",
            DESCRIPTION: "Win a game as Infiltrator without being suspected",
            ICON: "fa-user-ninja",
            REWARD: {
                XP: 1200
            }
        }
    },
    
    // Asset Paths
    ASSETS: {
        AVATARS: "public/assets/avatars/",
        ICONS: "public/assets/icons/",
        SOUNDS: "public/assets/sounds/",
        MAPS: "public/assets/maps/"
    }
};

// Make configuration available globally
window.config = config;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}

// Wrap Clerk initialization in a safer pattern
document.addEventListener('DOMContentLoaded', function() {
    // Check if Clerk script has loaded
    if (typeof window.Clerk !== 'undefined') {
        // Initialize right away if available
        initializeClerk();
    } else {
        // Set up a listener for when Clerk becomes available
        document.addEventListener('clerkLoaded', initializeClerk);
        
        // Also set a timeout to check periodically
        const clerkCheckInterval = setInterval(function() {
            if (typeof window.Clerk !== 'undefined') {
                clearInterval(clerkCheckInterval);
                initializeClerk();
            }
        }, 100);
        
        // Give up after 10 seconds to prevent endless checking
        setTimeout(function() {
            clearInterval(clerkCheckInterval);
        }, 10000);
    }
    
    function initializeClerk() {
        if (window.Clerk) {
            try {
                window.Clerk.load({
                    publishableKey: config.CLERK_PUBLISHABLE_KEY,
                    afterSignIn: function(session) {
                        // After sign in, reload page to update UI
                        window.location.reload();
                    },
                    afterSignUp: function(session) {
                        // After sign up, create a new player profile
                        window.location.reload();
                    }
                });
                console.log("Clerk initialized successfully");
            } catch (e) {
                console.error("Error initializing Clerk:", e);
            }
        }
    }
}); 