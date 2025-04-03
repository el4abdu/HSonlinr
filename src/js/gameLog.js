// Game Log System
document.addEventListener('DOMContentLoaded', function() {
    // Create and expose the gameLog object
    window.gameLog = {
        // Add log entry to Firebase
        addLogEntry(roomId, type, message, playerId = null, targetId = null) {
            if (!roomId) return Promise.reject(new Error('Room ID is required'));
            
            const logRef = database.ref(`rooms/${roomId}/log`).push();
            
            const logEntry = {
                type,
                message,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            
            if (playerId) logEntry.playerId = playerId;
            if (targetId) logEntry.targetId = targetId;
            
            return logRef.set(logEntry);
        },
        
        // Load log entries from Firebase
        getLogEntries(roomId, limit = 20) {
            if (!roomId) return Promise.reject(new Error('Room ID is required'));
            
            return database.ref(`rooms/${roomId}/log`)
                .orderByChild('timestamp')
                .limitToLast(limit)
                .once('value')
                .then(snapshot => {
                    const entries = [];
                    snapshot.forEach(childSnapshot => {
                        entries.push({
                            id: childSnapshot.key,
                            ...childSnapshot.val()
                        });
                    });
                    return entries.sort((a, b) => a.timestamp - b.timestamp);
                });
        },
        
        // Render log entries to a container element
        renderLogTo(containerEl, entries, playerData = {}) {
            if (!containerEl) return;
            
            // Clear container
            containerEl.innerHTML = '';
            
            // Create log entries
            for (const entry of entries) {
                const logItem = document.createElement('div');
                logItem.className = `log-entry ${entry.type}`;
                
                // Format timestamp
                const timestamp = new Date(entry.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                // Get player names if available
                let playerName = 'Unknown';
                let targetName = 'Unknown';
                
                if (entry.playerId && playerData[entry.playerId]) {
                    playerName = playerData[entry.playerId].username;
                }
                
                if (entry.targetId && playerData[entry.targetId]) {
                    targetName = playerData[entry.targetId].username;
                }
                
                // Replace placeholders in message
                let message = entry.message
                    .replace('{player}', `<span class="player-name">${playerName}</span>`)
                    .replace('{target}', `<span class="player-name">${targetName}</span>`);
                
                // Create log entry HTML
                logItem.innerHTML = `
                    <div class="log-time">${timestamp}</div>
                    <div class="log-icon ${getIconForLogType(entry.type)}"></div>
                    <div class="log-message">${message}</div>
                `;
                
                containerEl.appendChild(logItem);
            }
            
            // Scroll to bottom
            containerEl.scrollTop = containerEl.scrollHeight;
        },
        
        // Setup live log updates
        setupLiveLog(roomId, containerEl, playerDataGetter) {
            if (!roomId || !containerEl) return;
            
            const logRef = database.ref(`rooms/${roomId}/log`);
            
            // Initial load
            this.getLogEntries(roomId, 50).then(entries => {
                this.renderLogTo(containerEl, entries, playerDataGetter());
            });
            
            // Listen for changes
            logRef.on('child_added', snapshot => {
                const newEntries = [{
                    id: snapshot.key,
                    ...snapshot.val()
                }];
                
                // Check if entry is already in container
                const existingEntry = containerEl.querySelector(`[data-log-id="${snapshot.key}"]`);
                if (existingEntry) return;
                
                this.renderLogTo(containerEl, newEntries, playerDataGetter());
            });
            
            // Return function to remove listeners
            return () => {
                logRef.off('child_added');
            };
        }
    };
    
    // Helper function to get icon class for log type
    function getIconForLogType(type) {
        switch (type) {
            case 'night':
                return 'icon-moon';
            case 'day':
                return 'icon-sun';
            case 'task':
                return 'icon-task';
            case 'vote':
                return 'icon-vote';
            case 'system':
                return 'icon-system';
            case 'reveal':
                return 'icon-reveal';
            case 'sabotage':
                return 'icon-sabotage';
            case 'death':
                return 'icon-death';
            case 'ability':
                return 'icon-ability';
            default:
                return 'icon-system';
        }
    }
    
    // CSS for log styling
    addLogStyles();
    
    // Add CSS styles for log
    function addLogStyles() {
        const styleEl = document.createElement('style');
        styleEl.innerHTML = `
            .game-log-container {
                max-height: 300px;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.7);
                border-radius: 8px;
                padding: 10px;
                font-family: 'Space Mono', monospace;
                scrollbar-width: thin;
                scrollbar-color: rgba(255, 255, 255, 0.2) rgba(0, 0, 0, 0.1);
            }
            
            .log-entry {
                display: grid;
                grid-template-columns: 50px 30px 1fr;
                gap: 8px;
                margin-bottom: 8px;
                padding: 6px;
                border-radius: 4px;
                background: rgba(0, 0, 0, 0.5);
                font-size: 14px;
                align-items: center;
            }
            
            .log-time {
                font-size: 12px;
                color: #9c9c9c;
            }
            
            .log-icon {
                width: 24px;
                height: 24px;
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            }
            
            .log-message {
                color: #f0f0f0;
            }
            
            .player-name {
                color: #f7d36e;
                font-weight: bold;
            }
            
            /* Log type styles */
            .log-entry.night {
                border-left: 3px solid #5a6bc9;
            }
            
            .log-entry.day {
                border-left: 3px solid #f9a53f;
            }
            
            .log-entry.task {
                border-left: 3px solid #3fafe0;
            }
            
            .log-entry.vote {
                border-left: 3px solid #e04f3f;
            }
            
            .log-entry.system {
                border-left: 3px solid #7c7c7c;
            }
            
            .log-entry.reveal {
                border-left: 3px solid #d44ff4;
            }
            
            .log-entry.sabotage {
                border-left: 3px solid #ff3300;
            }
            
            .log-entry.death {
                border-left: 3px solid #b30000;
            }
            
            .log-entry.ability {
                border-left: 3px solid #42b883;
            }
            
            /* Icon classes - replace with actual icon paths when available */
            .icon-moon {
                background-image: url('public/assets/icons/moon.svg');
            }
            
            .icon-sun {
                background-image: url('public/assets/icons/sun.svg');
            }
            
            .icon-task {
                background-image: url('public/assets/icons/task.svg');
            }
            
            .icon-vote {
                background-image: url('public/assets/icons/vote.svg');
            }
            
            .icon-system {
                background-image: url('public/assets/icons/system.svg');
            }
            
            .icon-reveal {
                background-image: url('public/assets/icons/reveal.svg');
            }
            
            .icon-sabotage {
                background-image: url('public/assets/icons/sabotage.svg');
            }
            
            .icon-death {
                background-image: url('public/assets/icons/death.svg');
            }
            
            .icon-ability {
                background-image: url('public/assets/icons/ability.svg');
            }
        `;
        
        document.head.appendChild(styleEl);
    }
}); 