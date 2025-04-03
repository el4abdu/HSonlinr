# Shadow Heist - Online Multiplayer Game

Shadow Heist is a social deduction game where players work together to complete a heist while trying to identify traitors among them. Inspired by games like Among Us and Secret Hitler, but with a unique heist theme and special roles.

## Game Overview

**Theme**: A group of thieves (Players) plan a heist, but among them are Traitors working for the security force. Players must complete tasks while uncovering the Traitors before time runs out.

**Roles (6 Players)**:
- **Master Thief (Hero)** – Knows one innocent player. Can "lockpick" to delay sabotage.
- **Hacker (Hero)** – Can reveal a player's true alignment once per game.
- **Infiltrator (Traitor)** – Sabotages tasks secretly. Can frame a player as suspicious.
- **Double Agent (Traitor)** – Appears innocent in investigations. Can fake tasks.
- **2 Civilians (Neutral)** – Must complete tasks to win but can be framed.

**Gameplay Flow**:
1. **Night Phase (Secret Actions)**:
   - Traitors sabotage tasks or frame players.
   - Heroes use abilities (e.g., Hacker investigates).

2. **Day Phase (Discussion/Voting)**:
   - Players debate suspicions.
   - Majority vote to banish one player (reveal role).

3. **Task Phase (Quick Minigames)**:
   - Heroes/Civilians complete small puzzles to progress the heist.
   - Too many sabotages → Traitors win.

**Win Conditions**:
- **Heroes/Civilians**: Complete 3 tasks before time ends OR banish all Traitors.
- **Traitors**: Sabotage 3 tasks OR outnumber players.

## Technologies Used

- HTML5, CSS3, JavaScript
- Firebase Realtime Database (for multiplayer functionality)
- Clerk Authentication

## Setup Instructions

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Set up Realtime Database
   - Register a web app to get your config details
   - Replace the Firebase config in `src/js/config.js` with your own

2. **Set Up Clerk Authentication**
   - Go to [Clerk Dashboard](https://dashboard.clerk.dev/)
   - Create a new application
   - Get your API keys
   - Replace the Clerk public key in `src/js/config.js` with your own

3. **Run the Game**
   - Host the files on a web server (you can use Firebase Hosting, GitHub Pages, or a local server)
   - For local development, you can use the following:
     ```
     npm install -g http-server
     http-server
     ```

## Project Structure

```
/
├── index.html              # Landing page
├── lobby.html              # Game lobby
├── role-assignment.html    # Role assignment page
├── game.html               # Main game page (to be implemented)
├── public/
│   ├── assets/             # Images and assets
├── src/
│   ├── css/                # Stylesheets
│   │   ├── styles.css      # Main styles
│   │   ├── lobby.css       # Lobby styles
│   │   └── role-assignment.css # Role assignment styles
│   └── js/                 # JavaScript files
│       ├── config.js       # Firebase and game configuration
│       ├── auth.js         # Authentication
│       ├── main.js         # Main functionality
│       ├── lobby.js        # Lobby functionality
│       └── role-assignment.js # Role assignment functionality
└── README.md               # This file
```

## Future Features

- Customizable game settings (role distribution, timers)
- More task minigames (lockpicking, safe cracking, etc.)
- Spectator mode for eliminated players
- Mobile responsive design
- Sound effects and music
- Player statistics and achievements

## Credits

- Developed by [Your Name]
- UI/UX Design inspired by modern gaming interfaces
- Special thanks to Firebase and Clerk for their services

## License

This project is licensed under the MIT License - see the LICENSE file for details. 