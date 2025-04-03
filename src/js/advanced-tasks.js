// Advanced Task System
class AdvancedTaskSystem {
    constructor() {
        this.tasks = new Map();
        this.activeTasks = new Set();
        this.taskProgress = new Map();
        this.difficultyModifiers = MODERN_FEATURES.DIFFICULTY.NORMAL.modifiers;
    }

    // Initialize task system
    initialize() {
        this.setupTaskListeners();
        this.loadTaskProgress();
        this.initializeTaskUI();
    }

    // Modern Task Types
    static TASK_TYPES = {
        HACKING: {
            id: 'hacking',
            name: 'System Hack',
            description: 'Hack into the security system',
            difficulty: 'medium',
            timeLimit: 120,
            rewards: {
                xp: 500,
                coins: 100
            },
            requirements: {
                minPlayers: 2,
                roles: ['HACKER']
            }
        },
        STEALTH: {
            id: 'stealth',
            name: 'Stealth Operation',
            description: 'Sneak past security cameras',
            difficulty: 'hard',
            timeLimit: 180,
            rewards: {
                xp: 800,
                coins: 150
            },
            requirements: {
                minPlayers: 3,
                roles: ['INFILTRATOR']
            }
        },
        DECRYPTION: {
            id: 'decryption',
            name: 'Code Decryption',
            description: 'Decrypt the security codes',
            difficulty: 'easy',
            timeLimit: 90,
            rewards: {
                xp: 300,
                coins: 50
            },
            requirements: {
                minPlayers: 1,
                roles: ['HACKER', 'MASTER_THIEF']
            }
        }
    };

    // Task Progress Tracking
    updateTaskProgress(taskId, progress) {
        const currentProgress = this.taskProgress.get(taskId) || 0;
        const newProgress = Math.min(100, currentProgress + progress);
        this.taskProgress.set(taskId, newProgress);

        // Check for completion
        if (newProgress >= 100) {
            this.completeTask(taskId);
        }

        // Update UI
        this.updateTaskUI(taskId);
    }

    // Modern Task Completion
    completeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        // Award rewards
        this.awardTaskRewards(task);

        // Trigger achievement check
        this.checkTaskAchievements(task);

        // Update statistics
        this.updateTaskStatistics(task);

        // Show completion animation
        this.showTaskCompletionAnimation(task);

        // Remove from active tasks
        this.activeTasks.delete(taskId);
    }

    // Modern Reward System
    awardTaskRewards(task) {
        const rewards = task.rewards;
        
        // Apply difficulty modifiers
        const modifiedRewards = {
            xp: Math.round(rewards.xp * this.difficultyModifiers.taskTime),
            coins: Math.round(rewards.coins * this.difficultyModifiers.taskTime)
        };

        // Update player stats
        this.updatePlayerStats(modifiedRewards);

        // Show reward notification
        this.showRewardNotification(modifiedRewards);
    }

    // Modern Achievement Integration
    checkTaskAchievements(task) {
        const taskType = task.type;
        const achievements = ACHIEVEMENTS;

        // Check for task-specific achievements
        switch (taskType) {
            case 'hacking':
                this.checkAchievement('NIGHT_OPERATOR');
                break;
            case 'stealth':
                this.checkAchievement('MASTER_DETECTIVE');
                break;
            // Add more cases as needed
        }
    }

    // Modern UI Updates
    updateTaskUI(taskId) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskElement) return;

        const progress = this.taskProgress.get(taskId) || 0;
        const progressBar = taskElement.querySelector('.progress-fill');
        const progressText = taskElement.querySelector('.progress-text');

        // Update progress bar with smooth animation
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;

        // Add modern visual feedback
        if (progress > 0) {
            taskElement.classList.add('task-in-progress');
        }
    }

    // Modern Animation System
    showTaskCompletionAnimation(task) {
        const template = document.getElementById('achievement-popup-template');
        const popup = template.content.cloneNode(true);
        
        // Configure popup content
        const popupElement = popup.querySelector('.achievement-popup');
        popupElement.querySelector('.achievement-title').textContent = `Task Completed: ${task.name}`;
        popupElement.querySelector('.achievement-description').textContent = task.description;
        popupElement.querySelector('.reward-points').textContent = `+${task.rewards.xp} XP`;
        
        // Add to document and show
        document.body.appendChild(popupElement);
        requestAnimationFrame(() => {
            popupElement.classList.add('show');
        });

        // Remove after animation
        setTimeout(() => {
            popupElement.classList.remove('show');
            setTimeout(() => popupElement.remove(), 300);
        }, 3000);
    }

    // Modern Statistics Tracking
    updateTaskStatistics(task) {
        const stats = {
            completedTasks: 0,
            totalXPEarned: 0,
            averageCompletionTime: 0
        };

        // Update Firebase with new statistics
        database.ref(`/statistics/tasks/${task.type}`).update(stats);
    }

    // Modern Difficulty System
    setDifficulty(level) {
        this.difficultyModifiers = MODERN_FEATURES.DIFFICULTY[level].modifiers;
        this.updateTaskParameters();
    }

    updateTaskParameters() {
        this.activeTasks.forEach(taskId => {
            const task = this.tasks.get(taskId);
            if (task) {
                task.timeLimit *= this.difficultyModifiers.taskTime;
                // Update UI with new parameters
                this.updateTaskUI(taskId);
            }
        });
    }
}

// Initialize the advanced task system
const taskSystem = new AdvancedTaskSystem();
document.addEventListener('DOMContentLoaded', () => {
    taskSystem.initialize();
}); 