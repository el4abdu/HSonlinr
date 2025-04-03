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
        measurementId: "G-ZP1ZXJ8XW3"
    },
    
    // Clerk Configuration
    CLERK_PUBLISHABLE_KEY: "pk_test_Z2VuZXJvdXMtcXVhZ2dhLTI4LmNsZXJrLmFjY291bnRzLmRldiQ",
    
    // Game Features
    FEATURES: {
        // Avatar System
        AVATARS: {
            ENABLED: true,
            COUNT: 18,
            BASE_PATH: "assets/avatars/"
        },
        
        // Dynamic Difficulty
        DIFFICULTY: {
            EASY: {
                TIME_MODIFIER: 1.5,
                CLUE_MODIFIER: 1.3,
                TASK_MODIFIER: 0.8
            },
            NORMAL: {
                TIME_MODIFIER: 1.0,
                CLUE_MODIFIER: 1.0,
                TASK_MODIFIER: 1.0
            },
            HARD: {
                TIME_MODIFIER: 0.8,
                CLUE_MODIFIER: 0.7,
                TASK_MODIFIER: 1.2
            }
        },
        
        // UI Features
        UI: {
            ANIMATIONS: true,
            THEMES: {
                LIGHT: {
                    PRIMARY: "#4a90e2",
                    SECONDARY: "#50e3c2",
                    BACKGROUND: "#f5f7fa",
                    TEXT: "#333333",
                    ACCENT: "#ff5252"
                },
                DARK: {
                    PRIMARY: "#4a90e2",
                    SECONDARY: "#50e3c2",
                    BACKGROUND: "#121212",
                    TEXT: "#e0e0e0",
                    ACCENT: "#ff5252"
                }
            }
        }
    },
    
    // Game Roles
    ROLES: {
        DETECTIVE: {
            ID: "detective",
            NAME: "Detective",
            TEAM: "agents",
            DESCRIPTION: "Investigate suspects and gather evidence to identify the infiltrator.",
            ABILITIES: ["investigate", "review_evidence", "accuse"],
            COLOR: "#4a90e2"
        },
        HACKER: {
            ID: "hacker",
            NAME: "Hacker",
            TEAM: "agents",
            DESCRIPTION: "Access secured systems and provide valuable intelligence.",
            ABILITIES: ["hack", "trace", "disrupt"],
            COLOR: "#50e3c2"
        },
        DOCTOR: {
            ID: "doctor",
            NAME: "Doctor",
            TEAM: "agents",
            DESCRIPTION: "Protect team members from attacks and revive incapacitated agents.",
            ABILITIES: ["protect", "heal", "analyze"],
            COLOR: "#7ed321"
        },
        INFILTRATOR: {
            ID: "infiltrator",
            NAME: "Infiltrator",
            TEAM: "shadow",
            DESCRIPTION: "Sabotage operations and eliminate agents without being detected.",
            ABILITIES: ["sabotage", "disguise", "eliminate"],
            COLOR: "#ff5252"
        },
        TRAITOR: {
            ID: "traitor",
            NAME: "Traitor",
            TEAM: "shadow",
            DESCRIPTION: "Appear as a team member but secretly working against the mission.",
            ABILITIES: ["deceive", "frame", "sabotage"],
            COLOR: "#9013fe"
        },
        MASTERMIND: {
            ID: "mastermind",
            NAME: "Mastermind",
            TEAM: "shadow",
            DESCRIPTION: "Lead the shadow team with enhanced abilities and information.",
            ABILITIES: ["orchestrate", "manipulate", "override"],
            COLOR: "#ff9500"
        }
    },
    
    // Game Phases
    PHASES: {
        SETUP: {
            ID: "setup",
            NAME: "Mission Briefing",
            DESCRIPTION: "Prepare for the mission and learn your role.",
            DURATION: 30 // seconds
        },
        DAY: {
            ID: "day",
            NAME: "Operation",
            DESCRIPTION: "Complete tasks and gather intelligence.",
            DURATION: 300 // seconds
        },
        DISCUSSION: {
            ID: "discussion",
            NAME: "Debrief",
            DESCRIPTION: "Discuss findings and suspicions with the team.",
            DURATION: 120 // seconds
        },
        VOTING: {
            ID: "voting",
            NAME: "Evaluation",
            DESCRIPTION: "Vote on who might be working against the mission.",
            DURATION: 30 // seconds
        },
        NIGHT: {
            ID: "night",
            NAME: "Covert Actions",
            DESCRIPTION: "Special role actions occur at night.",
            DURATION: 30 // seconds
        },
        RESULT: {
            ID: "result",
            NAME: "Operation Results",
            DESCRIPTION: "Review the outcome of the current round.",
            DURATION: 15 // seconds
        }
    },
    
    // Game Settings
    SETTINGS: {
        MAX_PLAYERS: 12,
        MIN_PLAYERS: 4,
        DEFAULT_ROOM_SIZE: 8,
        TIME_LIMITS: {
            SETUP: 30,
            DAY: 300,
            DISCUSSION: 120,
            VOTING: 30,
            NIGHT: 30,
            RESULT: 15
        },
        TASK_COUNT: {
            MIN: 6,
            MAX: 12
        }
    },
    
    // Achievement System
    ACHIEVEMENTS: {
        MASTER_DETECTIVE: {
            ID: "master_detective",
            TITLE: "Master Detective",
            DESCRIPTION: "Correctly identify the infiltrator 5 times",
            ICON: "fa-magnifying-glass",
            REWARD: {
                XP: 1000
            }
        },
        NIGHT_OPERATOR: {
            ID: "night_operator",
            TITLE: "Night Operator",
            DESCRIPTION: "Successfully complete 10 night actions",
            ICON: "fa-moon",
            REWARD: {
                XP: 800
            }
        },
        TEAM_PLAYER: {
            ID: "team_player",
            TITLE: "Team Player",
            DESCRIPTION: "Complete 20 team tasks",
            ICON: "fa-users",
            REWARD: {
                XP: 500
            }
        }
    },
    
    // Asset Paths
    ASSETS: {
        AVATARS: "assets/avatars/",
        ICONS: "assets/icons/",
        SOUNDS: "assets/sounds/",
        LOGO: "assets/images/logo.png"
    }
};

// Initialize Clerk
function initClerk() {
    if (window.Clerk) {
        window.Clerk.load({
            // Use the publishable key from config
            publishableKey: config.CLERK_PUBLISHABLE_KEY
        });
    }
}

// Export config
window.config = config;

// Initialize Clerk
function initializeClerk() {
    if (!window.Clerk) {
        console.error('Clerk SDK not loaded');
        return;
    }
    
    window.Clerk.load({
        publishableKey: config.CLERK_PUBLISHABLE_KEY
    });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        config,
        CLERK_PUBLISHABLE_KEY: config.CLERK_PUBLISHABLE_KEY,
        ACHIEVEMENTS: config.ACHIEVEMENTS,
        FEATURES: config.FEATURES,
        ROLES: config.ROLES,
        PHASES: config.PHASES,
        SETTINGS: config.SETTINGS,
        ASSETS: config.ASSETS
    };
}

// Initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Clerk
    initializeClerk();
}); 