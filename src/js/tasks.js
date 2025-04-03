// Task Minigames
document.addEventListener('DOMContentLoaded', function() {
    // Game state reference (will be set when tasks.js is initialized by game.js)
    let gameState = null;
    let roomId = null;
    let playerId = null;
    
    // Available tasks
    const TASKS = {
        WIRING: {
            name: 'Repair Wiring',
            description: 'Connect the matching colored wires to complete the circuit.',
            icon: '🔌',
            template: 'wiring-task-template',
            difficulty: 'easy'
        },
        CODE: {
            name: 'Decrypt Security Code',
            description: 'Crack the 4-digit security code to gain access.',
            icon: '🔐',
            template: 'code-task-template',
            difficulty: 'medium'
        },
        MEMORY: {
            name: 'Security Camera Bypass',
            description: 'Memorize and repeat the sequence to bypass security.',
            icon: '📹',
            template: 'memory-task-template',
            difficulty: 'hard'
        }
    };
    
    // Task states
    const TASK_STATE = {
        LOCKED: 'locked',
        UNLOCKED: 'unlocked',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        SABOTAGED: 'sabotaged'
    };
    
    // Initialize tasks module
    function initTasks(state, room, player) {
        gameState = state;
        roomId = room;
        playerId = player;
    }
    
    // Update task phase UI
    function updateTaskPhaseUI() {
        const tasksProgressBarEl = document.getElementById('tasks-progress-bar');
        const completedTasksEl = document.getElementById('completed-tasks');
        const totalTasksEl = document.getElementById('total-tasks');
        const tasksGridEl = document.getElementById('tasks-grid');
        const activeTaskEl = document.getElementById('active-task');
        
        // Update progress bar
        const totalTasks = gameState.tasks.length;
        const completedTasks = gameState.tasks.filter(task => task.state === TASK_STATE.COMPLETED).length;
        const progressPercentage = (completedTasks / totalTasks) * 100;
        
        tasksProgressBarEl.style.width = `${progressPercentage}%`;
        completedTasksEl.textContent = completedTasks;
        totalTasksEl.textContent = totalTasks;
        
        // Update task grid
        renderTasksGrid(tasksGridEl, activeTaskEl);
    }
    
    // Render tasks grid
    function renderTasksGrid(tasksGridEl, activeTaskEl) {
        tasksGridEl.innerHTML = '';
        
        gameState.tasks.forEach((task, index) => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            
            // Add state class
            if (task.state === TASK_STATE.COMPLETED) {
                taskItem.classList.add('completed');
            } else if (task.state === TASK_STATE.SABOTAGED) {
                taskItem.classList.add('sabotaged');
            }
            
            // Get task details
            const taskDetails = TASKS[task.type];
            
            taskItem.innerHTML = `
                <div class="task-icon">${taskDetails.icon}</div>
                <div class="task-name">${taskDetails.name}</div>
                <div class="task-status ${task.state}">${formatTaskState(task.state)}</div>
            `;
            
            // Add click event if task is unlocked and not completed/sabotaged
            if (task.state === TASK_STATE.UNLOCKED) {
                taskItem.addEventListener('click', () => {
                    startTask(task, index, activeTaskEl);
                });
            }
            
            tasksGridEl.appendChild(taskItem);
        });
    }
    
    // Start task minigame
    function startTask(task, taskIndex, activeTaskEl) {
        // Update task state to in progress
        updateTaskState(taskIndex, TASK_STATE.IN_PROGRESS);
        
        // Get task template
        const taskDetails = TASKS[task.type];
        const templateEl = document.getElementById(taskDetails.template);
        
        if (!templateEl) {
            console.error(`Template not found for task type: ${task.type}`);
            return;
        }
        
        // Clone template content
        const taskContent = document.importNode(templateEl.content, true);
        
        // Clear active task container and append new task
        activeTaskEl.innerHTML = '';
        activeTaskEl.appendChild(taskContent);
        
        // Show active task container
        activeTaskEl.style.display = 'block';
        
        // Initialize specific task
        switch (task.type) {
            case 'WIRING':
                initWiringTask(taskIndex);
                break;
            case 'CODE':
                initCodeTask(taskIndex);
                break;
            case 'MEMORY':
                initMemoryTask(taskIndex);
                break;
        }
    }
    
    // Update task state in Firebase
    function updateTaskState(taskIndex, state) {
        const taskRef = database.ref(`rooms/${roomId}/gameState/tasks/${taskIndex}/state`);
        taskRef.set(state);
    }
    
    // Complete task
    function completeTask(taskIndex) {
        updateTaskState(taskIndex, TASK_STATE.COMPLETED);
        
        // Update completed tasks count
        const completedTasksRef = database.ref(`rooms/${roomId}/gameState/completedTasks`);
        completedTasksRef.transaction(count => (count || 0) + 1);
        
        // Hide active task container
        document.getElementById('active-task').style.display = 'none';
        
        // Add log entry
        addLogEntry(`${currentUser.username} completed a task`, 'task');
        
        // Show notification
        showNotification('Task completed successfully!', 'success');
    }
    
    // Sabotage task (for traitors)
    function sabotageTask(taskIndex) {
        updateTaskState(taskIndex, TASK_STATE.SABOTAGED);
        
        // Update sabotages count
        const sabotagesRef = database.ref(`rooms/${roomId}/gameState/sabotages`);
        sabotagesRef.transaction(count => (count || 0) + 1);
        
        // Hide active task container
        document.getElementById('active-task').style.display = 'none';
        
        // Add log entry (without revealing who sabotaged)
        addLogEntry('A task was sabotaged!', 'sabotage');
        
        // Show notification (only to the saboteur)
        showNotification('Task sabotaged successfully!', 'success');
    }
    
    // Format task state for display
    function formatTaskState(state) {
        switch (state) {
            case TASK_STATE.LOCKED:
                return 'Locked';
            case TASK_STATE.UNLOCKED:
                return 'Available';
            case TASK_STATE.IN_PROGRESS:
                return 'In Progress';
            case TASK_STATE.COMPLETED:
                return 'Completed';
            case TASK_STATE.SABOTAGED:
                return 'Sabotaged';
            default:
                return 'Unknown';
        }
    }
    
    // Initialize wiring task
    function initWiringTask(taskIndex) {
        const canvas = document.getElementById('wires-canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = 300;
        canvas.height = 200;
        
        // Get wire endpoints
        const leftEndpoints = document.querySelectorAll('.left-endpoints .wire-endpoint');
        const rightEndpoints = document.querySelectorAll('.right-endpoints .wire-endpoint');
        
        // Wires state
        const wires = {
            activeWire: null,
            connections: {},
            selectedEndpoint: null
        };
        
        // Shuffle right endpoints
        const rightEndpointsArray = Array.from(rightEndpoints);
        shuffleArray(rightEndpointsArray);
        
        // Re-append shuffled endpoints
        const rightEndpointsContainer = document.querySelector('.right-endpoints');
        rightEndpointsContainer.innerHTML = '';
        rightEndpointsArray.forEach(endpoint => {
            rightEndpointsContainer.appendChild(endpoint);
        });
        
        // Add event listeners to endpoints
        leftEndpoints.forEach(endpoint => {
            endpoint.addEventListener('click', () => {
                if (wires.connections[endpoint.dataset.color]) {
                    // If already connected, disconnect it
                    delete wires.connections[endpoint.dataset.color];
                    wires.selectedEndpoint = null;
                } else {
                    // Select this endpoint
                    wires.selectedEndpoint = {
                        element: endpoint,
                        side: 'left',
                        color: endpoint.dataset.color
                    };
                }
                
                drawWires();
            });
        });
        
        rightEndpoints.forEach(endpoint => {
            endpoint.addEventListener('click', () => {
                if (!wires.selectedEndpoint) return;
                
                if (wires.selectedEndpoint.side === 'left') {
                    // Connect wire from left to right
                    wires.connections[wires.selectedEndpoint.color] = {
                        element: endpoint,
                        color: endpoint.dataset.color
                    };
                    
                    wires.selectedEndpoint = null;
                    
                    // Check if all wires are connected
                    if (Object.keys(wires.connections).length === leftEndpoints.length) {
                        checkWiringCompletion(taskIndex);
                    }
                }
                
                drawWires();
            });
        });
        
        // Draw wires function
        function drawWires() {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw active connections
            for (const [leftColor, rightConnection] of Object.entries(wires.connections)) {
                const leftEndpoint = Array.from(leftEndpoints).find(el => el.dataset.color === leftColor);
                const rightEndpoint = rightConnection.element;
                
                // Get positions
                const leftRect = leftEndpoint.getBoundingClientRect();
                const rightRect = rightEndpoint.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();
                
                const startX = 0;
                const startY = leftRect.top - canvasRect.top + leftRect.height / 2;
                const endX = canvas.width;
                const endY = rightRect.top - canvasRect.top + rightRect.height / 2;
                
                // Draw wire
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                
                // Bezier curve for natural wire look
                const controlPoint1X = startX + canvas.width * 0.3;
                const controlPoint1Y = startY;
                const controlPoint2X = endX - canvas.width * 0.3;
                const controlPoint2Y = endY;
                
                ctx.bezierCurveTo(controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y, endX, endY);
                
                // Set wire color and style
                ctx.strokeStyle = leftColor;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            
            // Draw active wire being connected
            if (wires.selectedEndpoint) {
                const endpoint = wires.selectedEndpoint.element;
                const endpointRect = endpoint.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();
                
                const startX = wires.selectedEndpoint.side === 'left' ? 0 : canvas.width;
                const startY = endpointRect.top - canvasRect.top + endpointRect.height / 2;
                
                // Get current mouse position (or center if not available)
                const mouseX = canvas.width / 2;
                const mouseY = canvas.height / 2;
                
                // Draw wire
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                
                // Bezier curve
                const controlPointX = startX + (mouseX - startX) * 0.5;
                const controlPointY = startY;
                
                ctx.quadraticCurveTo(controlPointX, controlPointY, mouseX, mouseY);
                
                // Set wire color and style
                ctx.strokeStyle = wires.selectedEndpoint.color;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }
        
        // Check if wiring is correct
        function checkWiringCompletion(taskIndex) {
            let allCorrect = true;
            
            for (const [leftColor, rightConnection] of Object.entries(wires.connections)) {
                if (leftColor !== rightConnection.color) {
                    allCorrect = false;
                    break;
                }
            }
            
            if (allCorrect) {
                // Complete task
                setTimeout(() => {
                    completeTask(taskIndex);
                }, 500);
            }
        }
        
        // Initial draw
        drawWires();
    }
    
    // Initialize code task
    function initCodeTask(taskIndex) {
        // Generate random 4-digit code
        const secretCode = Array(4).fill(0).map(() => Math.floor(Math.random() * 10));
        let currentGuess = ['', '', '', ''];
        let attempts = 0;
        let maxAttempts = 8;
        
        // Get DOM elements
        const codeSlots = document.querySelectorAll('.code-slot');
        const codeKeys = document.querySelectorAll('.code-key');
        const codeAttemptsEl = document.getElementById('code-attempts');
        
        // Add event listeners to keys
        codeKeys.forEach(key => {
            key.addEventListener('click', () => {
                const value = key.dataset.value;
                
                if (value === 'clear') {
                    // Clear entire code
                    currentGuess = ['', '', '', ''];
                    updateCodeDisplay();
                } else if (value === 'submit') {
                    // Submit guess
                    if (currentGuess.includes('')) {
                        // Not all digits filled
                        return;
                    }
                    
                    submitGuess();
                } else {
                    // Enter digit
                    const emptySlotIndex = currentGuess.findIndex(slot => slot === '');
                    if (emptySlotIndex !== -1) {
                        currentGuess[emptySlotIndex] = value;
                        updateCodeDisplay();
                    }
                }
            });
        });
        
        // Clicking on a slot clears it
        codeSlots.forEach((slot, index) => {
            slot.addEventListener('click', () => {
                currentGuess[index] = '';
                updateCodeDisplay();
            });
        });
        
        // Update code display
        function updateCodeDisplay() {
            codeSlots.forEach((slot, index) => {
                slot.textContent = currentGuess[index] === '' ? '_' : currentGuess[index];
            });
        }
        
        // Submit guess
        function submitGuess() {
            attempts++;
            
            // Check for exact match
            const isCorrect = currentGuess.every((digit, index) => digit == secretCode[index]);
            
            if (isCorrect) {
                // Complete task
                completeTask(taskIndex);
                return;
            }
            
            // Calculate clues
            let correctPosition = 0;
            let correctDigit = 0;
            
            // Count correct positions
            secretCode.forEach((digit, index) => {
                if (digit == currentGuess[index]) {
                    correctPosition++;
                }
            });
            
            // Count correct digits (including position matches)
            const secretCounts = Array(10).fill(0);
            const guessCounts = Array(10).fill(0);
            
            secretCode.forEach(digit => secretCounts[digit]++);
            currentGuess.forEach(digit => guessCounts[digit]++);
            
            for (let i = 0; i < 10; i++) {
                correctDigit += Math.min(secretCounts[i], guessCounts[i]);
            }
            
            // Correct digits but wrong position = total correct - correct position
            const correctDigitWrongPosition = correctDigit - correctPosition;
            
            // Add attempt to list
            const attemptEl = document.createElement('div');
            attemptEl.className = 'code-attempt';
            attemptEl.innerHTML = `
                Attempt ${attempts}: ${currentGuess.join('')}
                <div class="code-attempt-clue">
                    ${correctPosition} correct position, 
                    ${correctDigitWrongPosition} correct digit but wrong position
                </div>
            `;
            
            codeAttemptsEl.appendChild(attemptEl);
            
            // Clear guess for next attempt
            currentGuess = ['', '', '', ''];
            updateCodeDisplay();
            
            // Check if max attempts reached
            if (attempts >= maxAttempts) {
                // Failed - mission critical task, cannot be sabotaged
                const attemptEl = document.createElement('div');
                attemptEl.className = 'code-attempt code-failure';
                attemptEl.innerHTML = `
                    <strong>Access denied! Maximum attempts reached.</strong>
                    <div>Correct code was: ${secretCode.join('')}</div>
                `;
                
                codeAttemptsEl.appendChild(attemptEl);
                
                // Disable keypad
                codeKeys.forEach(key => {
                    key.disabled = true;
                });
                
                // Cancel task after delay
                setTimeout(() => {
                    // Return to task list
                    document.getElementById('active-task').style.display = 'none';
                    updateTaskState(taskIndex, TASK_STATE.UNLOCKED);
                }, 3000);
            }
        }
    }
    
    // Initialize memory task
    function initMemoryTask(taskIndex) {
        const memoryCells = document.querySelectorAll('.memory-cell');
        const memoryStatus = document.querySelector('.memory-status');
        
        // Game state
        const memoryGame = {
            sequence: [],
            playerSequence: [],
            round: 1,
            speed: 1000,
            maxRounds: 5,
            isShowingSequence: true,
            isTakingInput: false
        };
        
        // Generate sequence
        function generateSequence() {
            memoryGame.sequence = [];
            for (let i = 0; i < memoryGame.maxRounds; i++) {
                memoryGame.sequence.push(Math.floor(Math.random() * memoryCells.length));
            }
        }
        
        // Show sequence
        function showSequence() {
            memoryGame.isShowingSequence = true;
            memoryGame.isTakingInput = false;
            memoryStatus.textContent = `Watch the sequence (${memoryGame.round}/${memoryGame.maxRounds})...`;
            
            // Clear all active cells
            memoryCells.forEach(cell => cell.classList.remove('active'));
            
            // Show sequence up to current round
            let i = 0;
            const sequenceInterval = setInterval(() => {
                // Clear previous active cell
                memoryCells.forEach(cell => cell.classList.remove('active'));
                
                if (i < memoryGame.round) {
                    // Activate next cell in sequence
                    const cellIndex = memoryGame.sequence[i];
                    memoryCells[cellIndex].classList.add('active');
                    i++;
                } else {
                    // End of sequence
                    clearInterval(sequenceInterval);
                    
                    // Clear last active cell after delay
                    setTimeout(() => {
                        memoryCells.forEach(cell => cell.classList.remove('active'));
                        startPlayerInput();
                    }, memoryGame.speed);
                }
            }, memoryGame.speed);
        }
        
        // Start player input
        function startPlayerInput() {
            memoryGame.isShowingSequence = false;
            memoryGame.isTakingInput = true;
            memoryGame.playerSequence = [];
            memoryStatus.textContent = 'Your turn: Repeat the sequence';
            
            // Add click events
            memoryCells.forEach((cell, index) => {
                cell.addEventListener('click', () => {
                    if (!memoryGame.isTakingInput) return;
                    
                    // Highlight clicked cell
                    cell.classList.add('active');
                    
                    // Record player choice
                    memoryGame.playerSequence.push(index);
                    
                    // Check if correct
                    const currentIndex = memoryGame.playerSequence.length - 1;
                    if (memoryGame.playerSequence[currentIndex] !== memoryGame.sequence[currentIndex]) {
                        // Incorrect - fail the sequence
                        failSequence();
                        return;
                    }
                    
                    // Remove highlight after delay
                    setTimeout(() => {
                        cell.classList.remove('active');
                    }, 300);
                    
                    // Check if sequence complete for this round
                    if (memoryGame.playerSequence.length === memoryGame.round) {
                        // Round complete
                        if (memoryGame.round === memoryGame.maxRounds) {
                            // Task complete
                            completeTask(taskIndex);
                        } else {
                            // Move to next round
                            memoryGame.round++;
                            memoryStatus.textContent = 'Correct! Next sequence...';
                            
                            // Start next round after delay
                            setTimeout(showSequence, 1000);
                        }
                    }
                });
            });
        }
        
        // Fail sequence
        function failSequence() {
            memoryGame.isTakingInput = false;
            memoryStatus.textContent = 'Incorrect sequence! Try again.';
            
            // Flash all cells red
            memoryCells.forEach(cell => cell.classList.add('error'));
            
            // Reset to round 1 after delay
            setTimeout(() => {
                memoryCells.forEach(cell => {
                    cell.classList.remove('active');
                    cell.classList.remove('error');
                });
                
                memoryGame.round = 1;
                showSequence();
            }, 1500);
        }
        
        // Start game
        generateSequence();
        showSequence();
    }
    
    // Helper functions
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    // Add log entry (wrapper function)
    function addLogEntry(message, type = 'task') {
        const logRef = database.ref(`rooms/${roomId}/log`).push();
        
        logRef.set({
            message: message,
            type: type,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            playerId: playerId
        });
    }
    
    // Show notification (wrapper function)
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
    
    // Export functions
    window.TaskManager = {
        initTasks,
        updateTaskPhaseUI,
        TASKS,
        TASK_STATE
    };
}); 