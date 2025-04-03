/**
 * Shadow Heist Online - Database Models
 * Structure definitions for Firebase Realtime Database
 */

// Define database models and data structure

/**
 * User Model
 * Represents a user in the database
 * Path: /users/{userId}
 */
const UserModel = {
  // Basic Info
  username: String,         // Display name
  email: String,            // Email address
  avatarId: Number,         // ID of selected avatar (1-18)
  level: Number,            // Current level (default: 1)
  xp: Number,               // Total experience points
  createdAt: Number,        // Timestamp of account creation
  lastLogin: Number,        // Timestamp of last login
  
  // Status info
  status: {
    online: Boolean,        // Whether user is currently online
    lastSeen: Number,       // Timestamp when user was last seen
    playing: Boolean,       // Whether user is currently in a game
    currentGameId: String   // ID of current game session (if playing)
  },
  
  // Game statistics
  stats: {
    gamesPlayed: Number,    // Total number of games played
    gamesWon: Number,       // Total number of games won
    killCount: Number,      // Total number of eliminations
    deathCount: Number,     // Number of times eliminated
    heistsCompleted: Number, // Number of successful heists
    winRate: Number         // Computed win percentage
  },
  
  // Unlocked achievements
  achievements: Array,      // Array of achievement IDs
  
  // Friends list
  friends: Array,           // Array of friend user IDs
  
  // User preferences
  settings: {
    notifications: Boolean, // Whether to show notifications
    theme: String,          // UI theme ('dark' or 'light')
    soundEffects: Boolean,  // Whether to play sound effects
    music: Boolean          // Whether to play background music
  },
  
  // Recent played games (limited to last 10)
  recentGames: Array        // Array of recent game session IDs
};

/**
 * Game Session Model
 * Represents an active or completed game
 * Path: /gameSessions/{sessionId}
 */
const GameSessionModel = {
  // Basic session info
  name: String,             // Session name
  host: String,             // User ID of session host
  map: String,              // Map ID ('bank', 'mansion', etc.)
  difficulty: String,       // Difficulty ('easy', 'normal', 'hard')
  maxPlayers: Number,       // Maximum players allowed (4-10)
  status: String,           // Session status ('waiting', 'in_progress', 'completed')
  type: String,             // Session type ('public', 'private', 'ranked')
  isPrivate: Boolean,       // Whether this is a private match
  code: String,             // Code for private matches
  
  // Timestamps
  createdAt: Number,        // When session was created
  startedAt: Number,        // When game actually started
  endedAt: Number,          // When game ended
  lastUpdated: Number,      // Last update timestamp
  
  // Players in session
  players: {
    // Key is a pushed ID
    '{playerId}': {
      userId: String,       // User ID of player
      username: String,     // Username at time of game
      avatarId: Number,     // Avatar ID at time of game
      role: String,         // Assigned role ('DETECTIVE', 'HACKER', etc.)
      team: String,         // Team ('HEROES', 'TRAITORS')
      ready: Boolean,       // Whether player is ready to start
      connected: Boolean,   // Whether player is still connected
      alive: Boolean,       // Whether player is alive in the game
      joinedAt: Number,     // When player joined session
      stats: {
        kills: Number,      // Kills in this game
        voted: Number,      // Times voted against others
        tasksCompleted: Number // Tasks completed in this game
      }
    }
  },
  
  // Game state
  state: {
    phase: String,          // Current game phase ('LOBBY', 'DAY', 'NIGHT', etc.)
    phaseEndsAt: Number,    // When current phase ends (timestamp)
    day: Number,            // Current day/round number
    winner: String,         // Winner team ('HEROES', 'TRAITORS', null)
    tasksCompleted: Number, // Total tasks completed by all players
    taskTotal: Number,      // Total tasks required to win
    sabotageActive: Boolean, // Whether a sabotage is active
    sabotageType: String,   // Type of active sabotage
    sabotageEndsAt: Number  // When sabotage ends (timestamp)
  },
  
  // Game events log
  events: [
    {
      type: String,         // Event type ('KILL', 'VOTE', 'TASK', etc.)
      timestamp: Number,    // When event occurred
      playerId: String,     // User ID of player causing event
      targetId: String,     // User ID of target player (if applicable)
      message: String       // Description of event
    }
  ],
  
  // Chat messages
  chat: {
    // Key is a pushed ID
    '{messageId}': {
      senderId: String,     // User ID of sender
      type: String,         // Message type ('team', 'global', 'dead', etc.)
      message: String,      // Message content
      timestamp: Number     // When message was sent
    }
  }
};

/**
 * Leaderboard Entry Model
 * Represents a user's position on the leaderboard
 * Path: /leaderboard/{userId}
 */
const LeaderboardEntryModel = {
  userId: String,           // User ID
  username: String,         // Current username
  avatarId: Number,         // Current avatar ID
  level: Number,            // Current level
  xp: Number,               // Total XP
  stats: {
    gamesPlayed: Number,    // Total games played
    gamesWon: Number,       // Total games won
    winRate: Number,        // Win percentage
    killCount: Number,      // Total kills
    kd: Number              // Kill/death ratio
  },
  lastUpdated: Number       // When entry was last updated
};

/**
 * Achievement Definition Model
 * Defines available achievements
 * Path: /achievements/{achievementId}
 */
const AchievementModel = {
  id: String,               // Achievement identifier
  title: String,            // Display title
  description: String,      // Description of how to earn
  icon: String,             // Icon class or image path
  requirement: {
    type: String,           // Requirement type ('GAMES_PLAYED', 'WINS', 'KILLS', etc.)
    value: Number           // Value required to earn achievement
  },
  reward: {
    xp: Number,             // XP reward for earning achievement
    avatarId: Number        // Avatar unlock (if applicable)
  },
  difficulty: String,       // Difficulty to earn ('easy', 'medium', 'hard', 'expert')
  hidden: Boolean           // Whether achievement is revealed before earning
};

/**
 * Notification Model
 * Represents a notification to a user
 * Path: /notifications/{userId}/{notificationId}
 */
const NotificationModel = {
  userId: String,           // Recipient user ID
  type: String,             // Notification type ('FRIEND_REQUEST', 'GAME_INVITE', etc.)
  senderId: String,         // User ID of sender (if applicable)
  message: String,          // Notification message
  read: Boolean,            // Whether notification has been read
  createdAt: Number,        // When notification was created
  data: Object              // Additional data specific to notification type
};

/**
 * Friend Request Model
 * Represents a friend request between users
 * Path: /friendRequests/{requestId}
 */
const FriendRequestModel = {
  senderId: String,         // User ID of sender
  receiverId: String,       // User ID of receiver
  status: String,           // Status ('pending', 'accepted', 'rejected')
  message: String,          // Optional message with request
  createdAt: Number,        // When request was sent
  respondedAt: Number       // When request was responded to
};

/**
 * Determine a database path based on model type and IDs
 * @param {string} modelType - Type of model to create path for
 * @param {Object} ids - Object containing necessary IDs
 * @return {string} - Database path
 */
function getModelPath(modelType, ids = {}) {
  switch (modelType) {
    case 'user':
      return `/users/${ids.userId}`;
    case 'gameSession':
      return `/gameSessions/${ids.sessionId}`;
    case 'leaderboard':
      return `/leaderboard/${ids.userId}`;
    case 'achievement':
      return `/achievements/${ids.achievementId}`;
    case 'notification':
      return `/notifications/${ids.userId}/${ids.notificationId}`;
    case 'friendRequest':
      return `/friendRequests/${ids.requestId}`;
    default:
      throw new Error(`Unknown model type: ${modelType}`);
  }
}

/**
 * Create a new model instance with default values
 * @param {string} modelType - Type of model to create
 * @param {Object} data - Initial data for the model
 * @return {Object} - New model instance with defaults
 */
function createModel(modelType, data = {}) {
  let model = {};
  
  switch (modelType) {
    case 'user':
      model = {
        username: data.username || `Agent${Math.floor(1000 + Math.random() * 9000)}`,
        email: data.email || '',
        avatarId: data.avatarId || 1,
        level: 1,
        xp: 0,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        status: {
          online: true,
          lastSeen: Date.now(),
          playing: false,
          currentGameId: null
        },
        stats: {
          gamesPlayed: 0,
          gamesWon: 0,
          killCount: 0,
          deathCount: 0,
          heistsCompleted: 0,
          winRate: 0
        },
        achievements: [],
        friends: [],
        settings: {
          notifications: true,
          theme: 'dark',
          soundEffects: true,
          music: true
        },
        recentGames: []
      };
      break;
      
    case 'gameSession':
      model = {
        name: data.name || 'New Game',
        host: data.host || null,
        map: data.map || 'bank',
        difficulty: data.difficulty || 'normal',
        maxPlayers: data.maxPlayers || 8,
        status: 'waiting',
        type: data.type || 'public',
        isPrivate: data.isPrivate || false,
        code: data.isPrivate ? (data.code || generateSessionCode()) : null,
        createdAt: Date.now(),
        startedAt: null,
        endedAt: null,
        lastUpdated: Date.now(),
        players: {},
        state: {
          phase: 'LOBBY',
          phaseEndsAt: null,
          day: 0,
          winner: null,
          tasksCompleted: 0,
          taskTotal: 10,
          sabotageActive: false,
          sabotageType: null,
          sabotageEndsAt: null
        },
        events: [],
        chat: {}
      };
      break;
      
    case 'leaderboardEntry':
      model = {
        userId: data.userId,
        username: data.username,
        avatarId: data.avatarId || 1,
        level: data.level || 1,
        xp: data.xp || 0,
        stats: {
          gamesPlayed: data.stats?.gamesPlayed || 0,
          gamesWon: data.stats?.gamesWon || 0,
          winRate: data.stats?.winRate || 0,
          killCount: data.stats?.killCount || 0,
          kd: data.stats?.kd || 0
        },
        lastUpdated: Date.now()
      };
      break;
      
    default:
      throw new Error(`Unknown model type: ${modelType}`);
  }
  
  // Merge any additional data
  return { ...model, ...data };
}

/**
 * Generate a random session code for private matches
 * @return {string} - 6 character code
 */
function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Export model definitions and helper functions
window.DatabaseModels = {
  UserModel,
  GameSessionModel,
  LeaderboardEntryModel,
  AchievementModel,
  NotificationModel,
  FriendRequestModel,
  getModelPath,
  createModel
}; 