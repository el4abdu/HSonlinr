// Simplified Player Leveling System
class PlayerLevelSystem {
    constructor() {
        this.currentLevel = 1;
        this.currentXP = 0;
        this.levelThresholds = this.generateLevelThresholds();
    }

    // Generate level thresholds with balanced scaling
    generateLevelThresholds() {
        const thresholds = new Map();
        let baseXP = 1000;
        const multiplier = 1.2;

        for (let level = 1; level <= 30; level++) {
            thresholds.set(level, Math.round(baseXP));
            baseXP *= multiplier;
        }

        return thresholds;
    }

    // Add XP and check for level up
    addXP(amount) {
        this.currentXP += amount;
        this.checkLevelUp();
        this.updateUI();
    }

    // Check if player should level up
    checkLevelUp() {
        const nextLevelThreshold = this.levelThresholds.get(this.currentLevel + 1);
        
        if (this.currentLevel < 30 && this.currentXP >= nextLevelThreshold) {
            this.levelUp();
        }
    }

    // Handle level up
    levelUp() {
        this.currentLevel++;
        this.showLevelUpAnimation();
        this.updateUI();
    }

    // Show level up animation
    showLevelUpAnimation() {
        const template = document.getElementById('achievement-popup-template');
        const popup = template.content.cloneNode(true);
        
        const popupElement = popup.querySelector('.achievement-popup');
        popupElement.querySelector('.achievement-title').textContent = `Level Up! Level ${this.currentLevel}`;
        popupElement.querySelector('.achievement-description').textContent = 'Congratulations on reaching a new level!';
        popupElement.querySelector('.achievement-icon').innerHTML = '🎉';
        
        document.body.appendChild(popupElement);
        requestAnimationFrame(() => {
            popupElement.classList.add('show');
        });

        setTimeout(() => {
            popupElement.classList.remove('show');
            setTimeout(() => popupElement.remove(), 300);
        }, 3000);
    }

    // Update UI elements
    updateUI() {
        const levelElement = document.getElementById('player-level');
        const xpElement = document.getElementById('xp-text');
        const progressElement = document.getElementById('xp-progress');
        
        if (levelElement) levelElement.textContent = `Level ${this.currentLevel}`;
        if (xpElement) {
            const nextLevelXP = this.levelThresholds.get(this.currentLevel + 1) || this.levelThresholds.get(30);
            xpElement.textContent = `${this.currentXP}/${nextLevelXP} XP`;
        }
        if (progressElement) {
            const nextLevelXP = this.levelThresholds.get(this.currentLevel + 1) || this.levelThresholds.get(30);
            const progress = (this.currentXP / nextLevelXP) * 100;
            progressElement.style.width = `${progress}%`;
        }
    }

    // Get player's current level info
    getLevelInfo() {
        const nextLevelXP = this.levelThresholds.get(this.currentLevel + 1) || this.levelThresholds.get(30);
        return {
            level: this.currentLevel,
            xp: this.currentXP,
            nextLevelXP: nextLevelXP,
            progress: (this.currentXP / nextLevelXP) * 100
        };
    }

    // Calculate XP reward for game completion
    calculateGameReward(gameResult) {
        let baseXP = 500;
        
        // Add XP based on game result
        if (gameResult.won) {
            baseXP += 300;
        }
        
        // Add XP based on performance
        if (gameResult.tasksCompleted) {
            baseXP += gameResult.tasksCompleted * 100;
        }
        
        // Add XP based on role performance
        if (gameResult.rolePerformance) {
            baseXP += gameResult.rolePerformance * 50;
        }

        return Math.round(baseXP);
    }
}

// Initialize the leveling system
const levelSystem = new PlayerLevelSystem();
document.addEventListener('DOMContentLoaded', () => {
    // Load player's level data from Firebase
    database.ref(`/players/${currentUser.uid}/stats`).once('value')
        .then(snapshot => {
            const stats = snapshot.val();
            if (stats) {
                levelSystem.currentLevel = stats.level || 1;
                levelSystem.currentXP = stats.xp || 0;
                levelSystem.updateUI();
            }
        });
}); 