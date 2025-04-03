// Role Assignment Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    
    // Redirect if no roomId provided
    if (!roomId) {
        window.location.href = 'index.html';
        return;
    }
    
    // DOM Elements
    const roleIcon = document.getElementById('role-icon');
    const roleName = document.getElementById('role-name');
    const roleBadge = document.getElementById('role-badge');
    const roleDescription = document.getElementById('role-description');
    const roleAbilities = document.getElementById('role-abilities');
    const roleTips = document.getElementById('role-tips');
    const teamMembers = document.getElementById('team-members');
    const readyBtn = document.getElementById('ready-btn');
    const waitingIndicator = document.getElementById('waiting-indicator');
    const playersReadyCount = document.getElementById('players-ready-count');
    const totalPlayersCount = document.getElementById('total-players-count');
    const readyProgress = document.getElementById('ready-progress');
    
    // Game state
    let gameState = {
        playerRole: null,
        playerId: null,
        playerReady: false,
        playersData: {},
        gameData: null
    };
    
    // Role data - abilities and tips for each role
    const roleData = {
        MASTER_THIEF: {
            name: "Master Thief",
            type: "hero",
            description: "As the Master Thief, you are the leader of this operation. You have inside knowledge of one innocent player and can lock doors to prevent sabotage.",
            abilities: [
                {
                    name: "Innocent Knowledge",
                    description: "You know the identity of one innocent player (Civilian or Hero)."
                },
                {
                    name: "Lockpick",
                    description: "Once per game, you can lockpick a sabotaged task to prevent its failure."
                }
            ],
            tips: [
                "Pay close attention to who's acting suspicious around tasks.",
                "Use your knowledge of the innocent player to narrow down suspects.",
                "Save your lockpick ability for a critical moment.",
                "Take leadership during discussions to gather information."
            ]
        },
        HACKER: {
            name: "Hacker",
            type: "hero",
            description: "As the Hacker, you have access to digital systems and can investigate one player's true alignment.",
            abilities: [
                {
                    name: "System Access",
                    description: "Complete tasks faster than other players."
                },
                {
                    name: "Investigation",
                    description: "Once per game, reveal a player's true alignment (Hero/Traitor/Neutral)."
                }
            ],
            tips: [
                "Use your investigation on players who are acting suspiciously.",
                "Share your findings with others, but be careful of Double Agents.",
                "Focus on completing tasks quickly to help the team.",
                "Pay attention to patterns in how tasks are sabotaged."
            ]
        },
        INFILTRATOR: {
            name: "Infiltrator",
            type: "traitor",
            description: "As the Infiltrator, your job is to sabotage the heist from within without being detected.",
            abilities: [
                {
                    name: "Sabotage",
                    description: "Secretly sabotage tasks during the night phase."
                },
                {
                    name: "Frame",
                    description: "Once per game, frame a player to make them appear suspicious."
                }
            ],
            tips: [
                "Blend in by completing some tasks legitimately.",
                "Don't be too obvious with sabotages.",
                "Frame a player who is already under suspicion.",
                "Coordinate with other traitors to maximize effectiveness."
            ]
        },
        DOUBLE_AGENT: {
            name: "Double Agent",
            type: "traitor",
            description: "As the Double Agent, you appear innocent in investigations but work to undermine the heist.",
            abilities: [
                {
                    name: "Deception",
                    description: "Appear as innocent (not a traitor) when investigated."
                },
                {
                    name: "Fake Task",
                    description: "Pretend to complete tasks without actually doing so."
                }
            ],
            tips: [
                "Act helpful and proactive to avoid suspicion.",
                "Use your fake task ability to appear productive.",
                "Let the Infiltrator do most of the sabotage work.",
                "If investigated, use your innocent result to gain trust."
            ]
        },
        CIVILIAN: {
            name: "Civilian",
            type: "neutral",
            description: "As a Civilian, you're essential to the heist's success but have no special abilities.",
            abilities: [
                {
                    name: "Observation",
                    description: "Pay close attention to other players' behaviors to identify traitors."
                },
                {
                    name: "Task Focus",
                    description: "Complete tasks efficiently to help the team progress."
                }
            ],
            tips: [
                "Focus on completing tasks quickly and efficiently.",
                "Observe who is near tasks when they get sabotaged.",
                "Participate actively in discussions to help identify traitors.",
                "Stay with other players to establish trust and avoid being framed."
            ]
        }
    };
    
    // Initialize role assignment page
    function init() {
        // Check if user is authenticated
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        // Initialize player state
        gameState.playerId = currentUser.id;
        
        // Set up Firebase listeners
        setupGameListener();
        
        // Add ready button event listener
        if (readyBtn) {
            readyBtn.addEventListener('click', markPlayerReady);
        }
    }
    
    // Set up Firebase listeners
    function setupGameListener() {
        const roomRef = database.ref(`rooms/${roomId}`);
        
        roomRef.on('value', snapshot => {
            const data = snapshot.val();
            
            if (!data) {
                // Room doesn't exist
                showNotification('Room no longer exists', 'error');
                window.location.href = 'index.html';
                return;
            }
            
            if (data.status !== 'playing') {
                // Game hasn't started yet
                window.location.href = `lobby.html?roomId=${roomId}`;
                return;
            }
            
            // Store game data
            gameState.gameData = data;
            gameState.playersData = data.players || {};
            
            // Get total player count
            const totalPlayers = Object.keys(gameState.playersData).length;
            totalPlayersCount.textContent = totalPlayers;
            
            // Get player role
            const playerRole = data.gameState.roles[gameState.playerId];
            
            if (!playerRole) {
                showNotification('You are not part of this game', 'error');
                window.location.href = 'index.html';
                return;
            }
            
            // If role has changed or is being set for the first time
            if (gameState.playerRole !== playerRole) {
                gameState.playerRole = playerRole;
                displayRoleInfo(playerRole);
                
                // Show team members for certain roles
                displayTeamMembers(playerRole, data.gameState.roles, data.players);
            }
            
            // Update ready status
            updateReadyStatus(data.players);
        });
    }
    
    // Display role information
    function displayRoleInfo(roleKey) {
        const role = roleData[roleKey];
        
        if (!role) return;
        
        // Update role name and details
        roleName.textContent = role.name;
        roleBadge.textContent = capitalizeFirstLetter(role.type);
        roleBadge.className = `role-badge ${role.type}`;
        roleDescription.textContent = role.description;
        
        // Update role icon
        roleIcon.className = 'role-icon';
        roleIcon.classList.add(role.name.toLowerCase().replace(' ', '-'));
        
        // Update abilities
        roleAbilities.innerHTML = '';
        role.abilities.forEach(ability => {
            const abilityItem = document.createElement('li');
            abilityItem.className = 'ability-item';
            
            abilityItem.innerHTML = `
                <div class="ability-icon">${ability.name.charAt(0)}</div>
                <div class="ability-info">
                    <div class="ability-name">${ability.name}</div>
                    <div class="ability-desc">${ability.description}</div>
                </div>
            `;
            
            roleAbilities.appendChild(abilityItem);
        });
        
        // Update tips
        roleTips.innerHTML = '';
        role.tips.forEach(tip => {
            const tipItem = document.createElement('li');
            tipItem.className = 'tip';
            tipItem.textContent = tip;
            roleTips.appendChild(tipItem);
        });
    }
    
    // Display team members (for traitors and Master Thief)
    function displayTeamMembers(playerRole, roles, players) {
        // Only show for relevant roles
        if (!['MASTER_THIEF', 'INFILTRATOR', 'DOUBLE_AGENT'].includes(playerRole)) {
            teamMembers.style.display = 'none';
            return;
        }
        
        teamMembers.style.display = 'block';
        
        if (playerRole === 'MASTER_THIEF') {
            // Master Thief knows one innocent player
            displayInnocentForMasterThief(roles, players);
        } else {
            // Traitors know each other
            displayTraitorTeammates(roles, players);
        }
    }
    
    // Display innocent player for Master Thief
    function displayInnocentForMasterThief(roles, players) {
        // Find innocents (Civilians or Hacker)
        const innocents = [];
        
        for (const [playerId, roleKey] of Object.entries(roles)) {
            if (roleKey === 'CIVILIAN' || roleKey === 'HACKER') {
                innocents.push({
                    playerId,
                    role: roleKey
                });
            }
        }
        
        // If no innocents (shouldn't happen), return
        if (innocents.length === 0) return;
        
        // Select one random innocent to reveal
        const randomInnocent = innocents[Math.floor(Math.random() * innocents.length)];
        const player = players[randomInnocent.playerId];
        
        if (!player) return;
        
        // Display the innocent
        teamMembers.innerHTML = `
            <h3 class="team-members-title">You know this player is innocent:</h3>
            <div class="team-members-list">
                <div class="team-member">
                    <div class="team-member-avatar" style="background-image: url('${player.imageUrl || 'public/assets/default-avatar.png'}')"></div>
                    <div>
                        <div class="team-member-name">${player.username}</div>
                        <div class="team-member-role">${roleData[randomInnocent.role].name}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Display traitor teammates
    function displayTraitorTeammates(roles, players) {
        const traitors = [];
        
        // Find all traitors
        for (const [playerId, roleKey] of Object.entries(roles)) {
            if ((roleKey === 'INFILTRATOR' || roleKey === 'DOUBLE_AGENT') && playerId !== gameState.playerId) {
                traitors.push({
                    playerId,
                    role: roleKey
                });
            }
        }
        
        // If no other traitors, show message
        if (traitors.length === 0) {
            teamMembers.innerHTML = `
                <h3 class="team-members-title">You are the only traitor</h3>
                <p style="color: var(--text-secondary);">Work alone to sabotage the heist.</p>
            `;
            return;
        }
        
        // Create traitor list
        let teamMembersHTML = `
            <h3 class="team-members-title">Your Traitor Team:</h3>
            <div class="team-members-list">
        `;
        
        traitors.forEach(traitor => {
            const player = players[traitor.playerId];
            if (!player) return;
            
            teamMembersHTML += `
                <div class="team-member">
                    <div class="team-member-avatar" style="background-image: url('${player.imageUrl || 'public/assets/default-avatar.png'}')"></div>
                    <div>
                        <div class="team-member-name">${player.username}</div>
                        <div class="team-member-role">${roleData[traitor.role].name}</div>
                    </div>
                </div>
            `;
        });
        
        teamMembersHTML += `</div>`;
        teamMembers.innerHTML = teamMembersHTML;
    }
    
    // Mark player as ready
    function markPlayerReady() {
        const playerRef = database.ref(`rooms/${roomId}/players/${gameState.playerId}`);
        
        playerRef.update({
            roleReady: true
        }).then(() => {
            // Hide ready button and show waiting indicator
            readyBtn.style.display = 'none';
            waitingIndicator.style.display = 'block';
            
            // Set local state
            gameState.playerReady = true;
        }).catch(error => {
            console.error('Error marking player as ready:', error);
            showNotification('Failed to mark as ready', 'error');
        });
    }
    
    // Update ready status UI
    function updateReadyStatus(players) {
        const totalPlayers = Object.keys(players).length;
        const readyPlayers = Object.values(players).filter(player => player.roleReady).length;
        
        // Update counter
        playersReadyCount.textContent = readyPlayers;
        
        // Update progress bar
        const percentage = (readyPlayers / totalPlayers) * 100;
        readyProgress.style.width = `${percentage}%`;
        
        // If player is already marked as ready, update UI
        if (players[gameState.playerId]?.roleReady) {
            readyBtn.style.display = 'none';
            waitingIndicator.style.display = 'block';
            gameState.playerReady = true;
        }
        
        // If all players are ready, redirect to game
        if (readyPlayers === totalPlayers && readyPlayers > 0) {
            setTimeout(() => {
                window.location.href = `game.html?roomId=${roomId}`;
            }, 1500);
        }
    }
    
    // Show notification
    function showNotification(message, type = 'success') {
        // Check if notification container exists
        let notificationContainer = document.querySelector('.notification-container');
        
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Helper function to capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Initialize when auth is ready
    const checkAuth = setInterval(() => {
        if (typeof currentUser !== 'undefined') {
            clearInterval(checkAuth);
            
            if (currentUser) {
                init();
            } else {
                window.location.href = 'index.html';
            }
        }
    }, 100);
}); 