/**
 * Ljus & Mörker Game Engine
 * Enhanced version with improved structure, error handling, and touch control support
 */

// Game state management
const GameState = {
    INITIALIZING: 'initializing',
    TITLE_SCREEN: 'title_screen',
    RUNNING: 'running',
    PAUSED: 'paused',
    LEVEL_TRANSITION: 'level_transition',
    GAME_OVER: 'game_over',
    GAME_WON: 'game_won'
};

// Game configuration and state variables
let currentState = GameState.INITIALIZING;
let newHighscore = false;
let highscores = [];

// Make game state accessible globally
window.gameState = {
    get running() { return currentState === GameState.RUNNING; },
    get paused() { return currentState === GameState.PAUSED; },
    get over() { return currentState === GameState.GAME_OVER; },
    get won() { return currentState === GameState.GAME_WON; }
};

// For backwards compatibility
Object.defineProperty(window, 'gameRunning', {
    get: function() { return window.gameState.running; },
    set: function(value) { 
        if (value) {
            currentState = GameState.RUNNING;
        } else if (currentState === GameState.RUNNING) {
            currentState = GameState.PAUSED;
        }
    }
});

// Virtual keys for control handling
if (!window.virtualKeys) {
    window.virtualKeys = {
        up: false,
        down: false,
        left: false,
        right: false
    };
}

// Phaser game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000',
    pixelArt: false,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    // Responsive handling
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    // Audio configuration
    audio: {
        disableWebAudio: false
    }
};

/**
 * Utility function to safely add event listeners to elements
 * @param {string} elementId - Element ID to attach listener to
 * @param {string} eventType - Event type (click, etc.)
 * @param {Function} callback - Function to execute on event
 */
function safeAddEventListener(elementId, eventType, callback) {
    const element = document.getElementById(elementId);
    if (element) {
        // Remove existing listeners to prevent duplicates
        const newElement = element.cloneNode(true);
        if (element.parentNode) {
            element.parentNode.replaceChild(newElement, element);
        }
        newElement.addEventListener(eventType, callback);
        return true;
    }
    console.warn(`Element with ID '${elementId}' not found for event listener`);
    return false;
}

/**
 * Set up all UI event listeners
 */
function setupEventListeners() {
    const buttonHandlers = {
        'start-button': () => {
            transitionToGameScreen();
            startGame();
        },
        'restart-button': () => {
            hideElement('message-overlay');
            hideElement('restart-button');
            startNewGame();
        },
        'next-level-button': () => {
            hideElement('message-overlay');
            hideElement('next-level-button');
            if (window.game?.scene?.scenes[0]) {
                window.game.scene.scenes[0].resumeGame();
            }
        },
        'save-score-button': () => {
            const nameInput = document.getElementById('player-name');
            const nameInputContainer = document.getElementById('name-input-container');

            if (window.game?.scene?.scenes[0]) {
                const playerName = (nameInput && nameInput.value) ? nameInput.value.trim() : "Okänd spelare";
                const score = window.game.scene.scenes[0].player.score;
                const level = window.game.scene.scenes[0].currentLevel;

                saveHighscore(playerName, score, level);

                if (nameInputContainer) {
                    nameInputContainer.classList.add('hidden');
                    nameInputContainer.style.display = 'none';
                }

                updateHighscoreTable();
            }
        },
        'play-again-button': () => {
            hideElement('highscore-screen');
            startNewGame();
        },
        'clear-highscores-button': () => {
            if (confirm("Är du säker på att du vill rensa topplistan?")) {
                highscores = [];
                try {
                    localStorage.removeItem(STORAGE_KEY);
                } catch (error) {
                    console.error('Error clearing highscores:', error);
                }
                updateHighscoreTable();
            }
        },
        'easter-egg-close': () => {
            const easterEgg = document.getElementById('easter-egg');
            if (easterEgg) easterEgg.classList.add('hidden');

            if (window.game?.scene?.scenes[0]) {
                window.game.scene.scenes[0].resumeGame();

                if (window.game.scene.scenes[0].easterEggHint) {
                    window.game.scene.scenes[0].easterEggHint.visible = false;
                }
            }
        },
        'toggle-light-button': () => {
            if (window.game?.scene?.scenes[0] && window.gameState.running) {
                window.game.scene.scenes[0].player.toggleLight();
            }
        },
        'flashlight-button': () => {
            if (window.game?.scene?.scenes[0] && window.gameState.running && 
                !window.game.scene.scenes[0].player.flashlightActive) {
                window.game.scene.scenes[0].player.activateFlashlight();
            }
        },
        'easter-egg-button': () => {
            if (window.game?.scene?.scenes[0] && window.gameState.running && 
                window.game.scene.scenes[0].currentLevel === 1) {
                window.game.scene.scenes[0].pauseGame();
                const easterEgg = document.getElementById('easter-egg');
                if (easterEgg) easterEgg.classList.remove('hidden');

                if (window.game.scene.scenes[0].easterEggHint) {
                    window.game.scene.scenes[0].easterEggHint.setScale(2);
                    window.game.scene.scenes[0].easterEggHint.setAlpha(1);
                    window.game.scene.scenes[0].tweens.add({
                        targets: window.game.scene.scenes[0].easterEggHint,
                        scale: { from: 2, to: 0 },
                        alpha: { from: 1, to: 0 },
                        duration: 500,
                        onComplete: () => {
                            window.game.scene.scenes[0].easterEggHint.visible = false;
                        }
                    });
                }
            }
        }
    };

    // Set up event listeners for each button
    Object.entries(buttonHandlers).forEach(([id, handler]) => {
        safeAddEventListener(id, 'click', handler);
    });

    // Prevent propagation of keyboard events for name input
    const nameInput = document.getElementById('player-name');
    if (nameInput) {
        ['keydown', 'keypress', 'keyup'].forEach(eventType => {
            nameInput.addEventListener(eventType, e => e.stopPropagation());
        });

        nameInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const saveButton = document.getElementById('save-score-button');
                if (saveButton) saveButton.click();
            }
        });
    }

    // Set up window resize handler
    window.addEventListener('resize', handleResize);

    // Debug keyboard shortcuts
    document.addEventListener('keydown', e => {
        // Ctrl+Shift+D for debug panel
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            toggleDebugPanel();
        }
    });
}

/**
 * Handle window resize events
 */
function handleResize() {
    if (window.game) {
        // Ensure game canvas resizes properly
        window.game.scale.refresh();
        
        // Adjust UI elements positioning if needed
        positionUIElements();
    }
}

/**
 * Position UI elements based on current screen size
 */
function positionUIElements() {
    // Position virtual joystick and touch buttons for better mobile experience
    if (isMobileDevice()) {
        const touchButtons = document.querySelectorAll('.touch-button');
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        touchButtons.forEach(button => {
            if (button.id === 'toggle-light-button') {
                button.style.left = '20px';
                button.style.bottom = '30px';
            } else if (button.id === 'flashlight-button') {
                button.style.left = '50%';
                button.style.transform = 'translateX(-50%)';
                button.style.bottom = '30px';
            } else if (button.id === 'easter-egg-button') {
                button.style.right = '20px';
                button.style.bottom = '30px';
            }
        });
    }
}

/**
 * Show debug panel for game diagnostics
 */
function toggleDebugPanel() {
    if (document.getElementById('debug-panel')) {
        document.getElementById('debug-panel').remove();
        return;
    }
    
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.position = 'fixed';
    debugPanel.style.top = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    debugPanel.style.padding = '10px';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.zIndex = '10000';
    debugPanel.style.color = 'white';
    debugPanel.style.fontFamily = 'monospace';
    debugPanel.style.fontSize = '12px';
    
    const createButton = (text, onClick) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.display = 'block';
        btn.style.margin = '5px 0';
        btn.style.padding = '5px';
        btn.style.width = '100%';
        btn.addEventListener('click', onClick);
        return btn;
    };
    
    const showMessageBtn = createButton('Show Message Test', () => {
        const messageText = document.getElementById('message-text');
        if (messageText) messageText.textContent = 'This is a test message';
        showElement('message-overlay');
        showElement('restart-button');
    });
    
    const showHighscoreBtn = createButton('Show Highscore', () => {
        showElement('highscore-screen');
    });
    
    const showEasterEggBtn = createButton('Show Easter Egg', () => {
        showElement('easter-egg');
    });
    
    const toggleUIBtn = createButton('Toggle UI', () => {
        const uiOverlay = document.getElementById('ui-overlay');
        uiOverlay.classList.toggle('hidden');
    });
    
    const toggleTouchControlsBtn = createButton('Toggle Touch Controls', () => {
        const touchButtons = document.querySelectorAll('.touch-button');
        touchButtons.forEach(btn => {
            btn.style.display = btn.style.display === 'none' ? 'block' : 'none';
        });
    });
    
    const closeBtn = createButton('Close Debug', () => {
        debugPanel.remove();
    });
    
    [showMessageBtn, showHighscoreBtn, showEasterEggBtn, 
     toggleUIBtn, toggleTouchControlsBtn, closeBtn].forEach(btn => {
        debugPanel.appendChild(btn);
    });
    
    document.body.appendChild(debugPanel);
}

/**
 * Detect if device is mobile
 * @return {boolean} True if device is mobile
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 800 && window.innerHeight <= 600);
}

/**
 * Show UI element by ID
 * @param {string} elementId Element ID to show
 */
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('hidden');
        element.style.display = elementId === 'name-input-container' ? 'block' : 
                               elementId === 'highscore-screen' ? 'flex' : '';
    }
}

/**
 * Hide UI element by ID
 * @param {string} elementId Element ID to hide
 */
function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

/**
 * Transition from title screen to game screen
 */
function transitionToGameScreen() {
    hideElement('title-screen');
    showElement('ui-overlay');
    showElement('instructions');
}

/**
 * Phaser preload function
 */
function preload() {
    // You can add asset loading here if needed
    // this.load.image('key', 'path/to/image.png');
    
    // Add audio loading
    // this.load.audio('crystal', 'assets/sounds/crystal.mp3');
    // this.load.audio('enemy', 'assets/sounds/enemy.mp3');
    // this.load.audio('hurt', 'assets/sounds/hurt.mp3');
    // this.load.audio('level', 'assets/sounds/level.mp3');
    
    // Add loading screen if needed
    const loadingText = this.add.text(
        this.cameras.main.width / 2, 
        this.cameras.main.height / 2, 
        'Laddar spelet...', 
        { 
            font: '32px Arial', 
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }
    ).setOrigin(0.5);
    
    this.load.on('complete', () => {
        loadingText.destroy();
    });
}

/**
 * Phaser create function - initializes game scene
 */
function create() {
    try {
        // Set initial state
        currentState = GameState.TITLE_SCREEN;
        
        // Get or set current level
        if (window.savedGameLevel) {
            this.currentLevel = window.savedGameLevel;
            window.savedGameLevel = null;
        } else if (!this.currentLevel) {
            this.currentLevel = 1;
        }
        
        // Initialize level parameters
        this.requiredCrystals = TOTAL_CRYSTALS + (this.currentLevel - 1) * LEVEL_CRYSTAL_INCREASE;
        this.isLevelTransitioning = false;
        
        // Generate maze
        const mazeData = generateMaze(this.game.config.width, this.game.config.height, TILE_SIZE);
        this.maze = mazeData.walls;
        
        // Create maze graphics
        this.mazeGraphics = this.add.graphics();
        this.drawMaze = function() {
            this.mazeGraphics.clear();
            this.mazeGraphics.fillStyle(0x333333);
            
            for (const wall of this.maze) {
                this.mazeGraphics.fillRect(wall.x, wall.y, wall.width, wall.height);
            }
        };
        this.drawMaze();
        
        // Set up enemy creation function
        this.createEnemies = function(count) {
            // Clear existing enemies
            if (this.enemies) {
                for (const enemy of this.enemies) {
                    enemy.destroy();
                }
            }
            this.enemies = [];
            
            // Create new enemies
            for (let i = 0; i < count; i++) {
                let x, y;
                let validPosition = false;
                let attempts = 0;
                
                // Find valid position for enemy
                while (!validPosition && attempts < 100) {
                    attempts++;
                    x = Math.random() * (this.game.config.width - 2 * ENEMY_SIZE) + ENEMY_SIZE;
                    y = Math.random() * (this.game.config.height - 2 * ENEMY_SIZE) + ENEMY_SIZE;
                    
                    // Ensure enemy is not too close to player
                    const distToPlayer = calculateDistance(
                        x, y,
                        this.player.x, this.player.y
                    );
                    
                    if (distToPlayer < 200) continue;
                    
                    // Check for wall collisions
                    let collides = false;
                    for (const wall of this.maze) {
                        if (checkCollision(
                            x, y, ENEMY_SIZE, ENEMY_SIZE,
                            wall.x, wall.y, wall.width, wall.height
                        )) {
                            collides = true;
                            break;
                        }
                    }
                    
                    if (!collides) {
                        validPosition = true;
                    }
                }
                
                // If no valid position found, use safe position
                if (!validPosition) {
                    const safePos = findSafePosition(
                        this.maze,
                        this.game.config.width - TILE_SIZE * 3,
                        this.game.config.height - TILE_SIZE * 3,
                        ENEMY_SIZE,
                        this.game.config.width,
                        this.game.config.height
                    );
                    x = safePos.x;
                    y = safePos.y;
                }
                
                // Create enemy with difficulty based on level
                const enemy = new Enemy(this, x, y, this.currentLevel);
                this.enemies.push(enemy);
            }
        };
        
        // Set up crystal creation function
        this.createCrystals = function(count) {
            // Clear existing crystals
            if (this.crystals) {
                for (const crystal of this.crystals) {
                    if (crystal.sprite) crystal.sprite.destroy();
                    if (crystal.glowSprite) crystal.glowSprite.destroy();
                }
            }
            this.crystals = [];
            
            // Create new crystals
            for (let i = 0; i < count; i++) {
                let x, y;
                let validPosition = false;
                let attempts = 0;
                
                // Find valid position for crystal
                while (!validPosition && attempts < 100) {
                    attempts++;
                    
                    x = Math.random() * (this.game.config.width - 2 * CRYSTAL_SIZE) + CRYSTAL_SIZE;
                    y = Math.random() * (this.game.config.height - 2 * CRYSTAL_SIZE) + CRYSTAL_SIZE;
                    
                    // Ensure crystal is not too close to player
                    const distToPlayer = calculateDistance(
                        x, y,
                        this.player.x, this.player.y
                    );
                    
                    if (distToPlayer < 100) continue;
                    
                    // Ensure crystal is not too close to walls
                    let tooCloseToWall = false;
                    const minDistanceFromWalls = TILE_SIZE * 0.5;
                    
                    for (const wall of this.maze) {
                        const distX = Math.abs((x + CRYSTAL_SIZE/2) - (wall.x + wall.width/2)) - (wall.width/2 + CRYSTAL_SIZE/2);
                        const distY = Math.abs((y + CRYSTAL_SIZE/2) - (wall.y + wall.height/2)) - (wall.height/2 + CRYSTAL_SIZE/2);
                        
                        if (distX < minDistanceFromWalls && distY < minDistanceFromWalls) {
                            tooCloseToWall = true;
                            break;
                        }
                    }
                    
                    if (!tooCloseToWall) {
                        validPosition = true;
                    }
                }
                
                // If no valid position found, use predefined safe positions
                if (!validPosition) {
                    const safePositions = [
                        { x: TILE_SIZE * 2.5, y: TILE_SIZE * 2.5 },
                        { x: this.game.config.width - TILE_SIZE * 3.5, y: TILE_SIZE * 2.5 },
                        { x: TILE_SIZE * 2.5, y: this.game.config.height - TILE_SIZE * 3.5 },
                        { x: this.game.config.width - TILE_SIZE * 3.5, y: this.game.config.height - TILE_SIZE * 3.5 },
                        { x: this.game.config.width / 2, y: this.game.config.height / 2 }
                    ];
                    
                    const pos = safePositions[i % safePositions.length];
                    x = pos.x;
                    y = pos.y;
                }
                
                // Create crystal with properties
                this.crystals.push({
                    x: x,
                    y: y,
                    radius: CRYSTAL_SIZE / 2,
                    points: BASE_POINTS_PER_CRYSTAL * this.currentLevel,
                    collected: false,
                    glow: 0,
                    glowDir: 1,
                    sprite: this.add.circle(x, y, CRYSTAL_SIZE / 2, 0x64c8ff),
                    glowSprite: this.add.circle(x, y, CRYSTAL_SIZE * 2, 0x64c8ff, 0.15),
                    
                    // Crystal collection method
                    collect: function() {
                        this.collected = true;
                        this.sprite.setVisible(false);
                        this.glowSprite.setVisible(false);
                    }
                });
            }
        };
        
        // Update crystal animations
        this.updateCrystals = function(delta) {
            for (const crystal of this.crystals) {
                if (!crystal.collected) {
                    // Update glow animation
                    crystal.glow += 0.05 * crystal.glowDir * (delta / 16);
                    
                    if (crystal.glow >= 1) {
                        crystal.glow = 1;
                        crystal.glowDir = -1;
                    } else if (crystal.glow <= 0) {
                        crystal.glow = 0;
                        crystal.glowDir = 1;
                    }
                    
                    // Handle visibility based on level difficulty
                    if (this.currentLevel >= CRYSTAL_VISIBILITY_LEVEL) {
                        const distanceToCrystal = calculateDistance(
                            crystal.x, crystal.y,
                            this.player.x + this.player.radius, this.player.y + this.player.radius
                        );
                        
                        const isVisible = distanceToCrystal <= this.player.lightRadius;
                        crystal.sprite.setVisible(isVisible);
                        crystal.glowSprite.setVisible(isVisible);
                    }
                    
                    // Update glow opacity
                    crystal.glowSprite.setAlpha(0.1 + crystal.glow * 0.2);
                }
            }
        };
        
        // Set up projectile functions
        this.createDarkProjectile = function(x, y, direction) {
            const projectile = new DarkProjectile(this, x, y, direction);
            this.darkProjectiles.push(projectile);
            return projectile;
        };
        
        this.createProjectileEffect = function(x, y, direction) {
            const particleCount = 10;
            
            for (let i = 0; i < particleCount; i++) {
                const spreadAngle = 0.5;
                const particleDirection = direction + (Math.random() - 0.5) * spreadAngle;
                
                this.createProjectileParticle(
                    x + Math.cos(particleDirection) * 5,
                    y + Math.sin(particleDirection) * 5,
                    particleDirection,
                    1 + Math.random() * 3,
                    1 + Math.random() * 3,
                    1.0,
                    0.05 + Math.random() * 0.1
                );
            }
        };
        
        this.createProjectileParticle = function(x, y, direction, speed, size, life, decay) {
            const particle = new ProjectileParticle(this, x, y, direction, speed, size, life, decay);
            this.projectileParticles.push(particle);
            return particle;
        };
        
        this.createExplosionEffect = function(x, y, particleCount) {
            for (let i = 0; i < particleCount; i++) {
                const direction = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 3;
                
                this.createProjectileParticle(
                    x, y, direction, speed,
                    1 + Math.random() * 3,
                    1.0,
                    0.03 + Math.random() * 0.05
                );
            }
        };
        
        // UI update functions
        this.updateLightLevelUI = function(value) {
            const element = document.getElementById('light-level');
            if (element) element.textContent = value;
        };
        
        this.updateCrystalsUI = function(value) {
            const element = document.getElementById('crystals-collected');
            if (element) element.textContent = value;
        };
        
        this.updateTotalCrystalsUI = function(value) {
            const element = document.getElementById('total-crystals');
            if (element) element.textContent = value;
        };
        
        this.updateScoreUI = function(value) {
            const element = document.getElementById('score');
            if (element) element.textContent = value;
        };
        
        this.updateLevelUI = function(value) {
            const element = document.getElementById('level');
            if (element) element.textContent = value;
        };
        
        this.updateStaminaUI = function(stamina, isTired) {
            const percentage = (stamina / MAX_STAMINA) * 100;
            const staminaBar = document.getElementById('stamina-bar');
            
            if (staminaBar) {
                staminaBar.style.width = `${percentage}%`;
                
                if (percentage > 60) {
                    staminaBar.style.backgroundColor = "#4CAF50";
                } else if (percentage > 30) {
                    staminaBar.style.backgroundColor = "#FFC107";
                } else {
                    staminaBar.style.backgroundColor = "#F44336";
                }
                
                staminaBar.style.opacity = isTired ? "0.5" : "1";
            }
        };
        
        // Game message display
        this.showMessage = function(text) {
            const messageText = document.getElementById('message-text');
            const messageOverlay = document.getElementById('message-overlay');
            
            if (messageText) {
                messageText.textContent = text;
                
                // Add animation for better UX
                messageText.style.animation = 'none';
                void messageText.offsetWidth; // Force reflow
                messageText.style.animation = 'messageAppear 0.5s ease-out forwards';
            }
            
            if (messageOverlay) {
                messageOverlay.style.display = 'flex';
                messageOverlay.style.flexDirection = 'column';
                messageOverlay.style.justifyContent = 'center';
                messageOverlay.style.alignItems = 'center';
                messageOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                messageOverlay.style.color = 'white';
                messageOverlay.style.fontSize = '24px';
                messageOverlay.style.padding = '20px';
                messageOverlay.style.zIndex = '1000';
                
                messageOverlay.classList.remove('hidden');
            }
        };
        
        // Level progression
        this.nextLevel = function() {
            try {
                this.isLevelTransitioning = true;
                currentState = GameState.LEVEL_TRANSITION;
                
                // Clean up easter egg if it's level 1
                if (this.currentLevel === 1 && this.easterEggHint) {
                    this.easterEggHint.destroy();
                    this.easterEggHint = null;
                }
                
                // Add bonus points for completing level
                this.player.score += POINTS_PER_LEVEL * this.currentLevel;
                this.updateScoreUI(this.player.score);
                
                // Progress to next level
                this.currentLevel++;
                this.updateLevelUI(this.currentLevel);
                
                // Calculate level parameters
                const crystalCount = TOTAL_CRYSTALS + (this.currentLevel - 1) * LEVEL_CRYSTAL_INCREASE;
                const enemyCount = 3 + (this.currentLevel - 1) * LEVEL_ENEMY_INCREASE;
                
                // Generate new maze
                const mazeData = generateMaze(this.game.config.width, this.game.config.height, TILE_SIZE);
                this.maze = mazeData.walls;
                this.drawMaze();
                
                // Find safe starting position
                const safeStart = findSafePosition(
                    this.maze, TILE_SIZE * 2, TILE_SIZE * 2, PLAYER_SIZE,
                    this.game.config.width, this.game.config.height
                );
                
                // Clean up existing projectiles
                for (const proj of this.darkProjectiles) {
                    proj.destroy();
                }
                this.darkProjectiles = [];
                
                for (const part of this.projectileParticles) {
                    part.destroy();
                }
                this.projectileParticles = [];
                
                // Reset player for new level
                this.player.resetForNewLevel(safeStart.x, safeStart.y);
                
                // Update UI for new level
                this.requiredCrystals = crystalCount;
                this.updateTotalCrystalsUI(crystalCount);
                
                // Create new enemies and crystals
                this.createEnemies(enemyCount);
                this.createCrystals(crystalCount);
                
                // Create level message
                let levelMessage = `Nivå ${this.currentLevel} - Hitta ${crystalCount} kristaller!`;
                
                if (this.currentLevel === CRYSTAL_VISIBILITY_LEVEL) {
                    levelMessage += "\nKristallerna syns nu bara inom ljuset!";
                } else if (this.currentLevel === REDUCED_LIGHT_LEVEL) {
                    levelMessage += "\nDitt ljus har blivit svagare!";
                }
                
                this.showMessage(levelMessage);
                
                const messageOverlay = document.getElementById('message-overlay');
                const restartButton = document.getElementById('restart-button');
                const nextLevelButton = document.getElementById('next-level-button');
                
                if (messageOverlay) {
                    messageOverlay.style.display = 'flex';
                    messageOverlay.style.flexDirection = 'column';
                    messageOverlay.style.justifyContent = 'center';
                    messageOverlay.style.alignItems = 'center';
                    messageOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                    messageOverlay.style.zIndex = '1000';
                }
                
                if (restartButton) restartButton.classList.add('hidden');
                
                if (nextLevelButton) {
                    nextLevelButton.style.display = 'block';
                    nextLevelButton.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Error transitioning to next level:', error);
                this.isLevelTransitioning = false;
            }
        };
        
        // Game over handling
        this.endGame = function(message) {
            currentState = GameState.GAME_OVER;
            
            const finalScore = this.player.score;
            checkHighscore(finalScore);
            
            this.showMessage(message);
            
            const restartButton = document.getElementById('restart-button');
            const nextLevelButton = document.getElementById('next-level-button');
            
            if (restartButton) {
                restartButton.style.display = 'block';
                restartButton.classList.remove('hidden');
            }
            
            if (nextLevelButton) nextLevelButton.classList.add('hidden');
            
            this.time.delayedCall(1100, () => {
                const messageOverlay = document.getElementById('message-overlay');
                if (messageOverlay) messageOverlay.classList.add('hidden');
                showHighscoreScreen();
            });
        };
        
        // Game pause/resume
        this.pauseGame = function() {
            currentState = GameState.PAUSED;
        };
        
        this.resumeGame = function() {
            currentState = GameState.RUNNING;
            this.isLevelTransitioning = false;
        };
        
        // Initialize player at safe position
        const playerStart = findSafePosition(
            this.maze, TILE_SIZE * 2, TILE_SIZE * 2, PLAYER_SIZE,
            this.game.config.width, this.game.config.height
        );
        
        this.player = new Player(this, playerStart.x, playerStart.y);
        
        // Calculate level parameters
        const enemyCount = 3 + (this.currentLevel - 1) * LEVEL_ENEMY_INCREASE;
        const crystalCount = TOTAL_CRYSTALS + (this.currentLevel - 1) * LEVEL_CRYSTAL_INCREASE;
        
        // Initialize game entities
        this.enemies = [];
        this.createEnemies(enemyCount);
        
        this.crystals = [];
        this.createCrystals(crystalCount);
        
        // Easter egg hint for level 1
        if (this.currentLevel === 1) {
            const eggHintX = this.game.config.width / 2;
            const eggHintY = this.game.config.height / 2;
            
            this.easterEggHint = this.add.text(eggHintX, eggHintY, "E", {
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#ffff00',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5, 0.5);
            
            this.tweens.add({
                targets: this.easterEggHint,
                alpha: { from: 0.4, to: 1 },
                scale: { from: 0.8, to: 1.2 },
                duration: 1500,
                yoyo: true,
                repeat: -1
            });
        } else if (this.easterEggHint) {
            this.easterEggHint.destroy();
            this.easterEggHint = null;
        }
        
        // Initialize game objects
        this.darkProjectiles = [];
        this.projectileParticles = [];
        
        // Set up input handling
        this.cursors = this.input.keyboard.createCursorKeys();
        
        this.keys = {
            W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            F: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F)
        };
        
        // Add keyboard event handlers
        this.input.keyboard.on('keydown-SPACE', () => {
            if (currentState === GameState.RUNNING) this.player.toggleLight();
        });
        
        this.input.keyboard.on('keydown-F', () => {
            if (currentState === GameState.RUNNING && !this.player.flashlightActive) {
                this.player.activateFlashlight();
            }
        });
        
        this.input.keyboard.on('keydown-E', () => {
            if (currentState === GameState.RUNNING && this.currentLevel === 1) {
                this.pauseGame();
                document.getElementById('easter-egg').classList.remove('hidden');
                
                if (this.easterEggHint) {
                    this.easterEggHint.setScale(2);
                    this.easterEggHint.setAlpha(1);
                    this.tweens.add({
                        targets: this.easterEggHint,
                        scale: { from: 2, to: 0 },
                        alpha: { from: 1, to: 0 },
                        duration: 500,
                        onComplete: () => {
                            this.easterEggHint.visible = false;
                        }
                    });
                }
            }
        });
        
        // Initialize UI
        this.updateLightLevelUI(100);
        this.updateCrystalsUI(0);
        this.updateScoreUI(0);
        this.updateLevelUI(this.currentLevel);
        this.updateTotalCrystalsUI(this.requiredCrystals);
        this.updateStaminaUI(MAX_STAMINA, false);
        
        // Set game as running
        currentState = GameState.RUNNING;
    } catch (error) {
        console.error('Error in create function:', error);
        // Show error message to user
        const errorMessage = document.getElementById('message-text');
        const messageOverlay = document.getElementById('message-overlay');
        
        if (errorMessage) {
            errorMessage.textContent = 'Ett fel uppstod vid initiering av spelet. Ladda om sidan för att försöka igen.';
        }
        
        if (messageOverlay) {
            messageOverlay.classList.remove('hidden');
        }
    }
}

/**
 * Phaser update function - called every frame
 * @param {number} time Current time
 * @param {number} delta Time since last frame
 */
function update(time, delta) {
    // Skip updates if game is not running
    if (currentState !== GameState.RUNNING) return;
    
    // Skip updates during level transitions
    if (this.isLevelTransitioning) return;
    
    try {
        // Update player
        this.player.update(time, delta);
        
        // Update enemies
        for (let i = 0; i < this.enemies.length; i++) {
            this.enemies[i].update(time, delta);
        }
        
        // Update projectiles
        for (let i = this.darkProjectiles.length - 1; i >= 0; i--) {
            const removed = this.darkProjectiles[i].update(time, delta);
            if (removed) {
                this.darkProjectiles.splice(i, 1);
            }
        }
        
        // Update particles
        for (let i = this.projectileParticles.length - 1; i >= 0; i--) {
            const removed = this.projectileParticles[i].update(delta);
            if (removed) {
                this.projectileParticles.splice(i, 1);
            }
        }
        
        // Update crystals
        this.updateCrystals(delta);
    } catch (error) {
        console.error('Error in update function:', error);
        // Attempt to recover
        currentState = GameState.PAUSED;
        
        // Show error message
        const messageText = document.getElementById('message-text');
        const messageOverlay = document.getElementById('message-overlay');
        const restartButton = document.getElementById('restart-button');
        
        if (messageText) {
            messageText.textContent = 'Ett fel uppstod. Försök starta om spelet.';
        }
        
        if (messageOverlay) {
            messageOverlay.classList.remove('hidden');
        }
        
        if (restartButton) {
            restartButton.classList.remove('hidden');
        }
    }
}

/**
 * Start the game
 */
function startGame() {
    try {
        if (window.game?.scene?.scenes[0]) {
            const currentLevel = window.game.scene.scenes[0].currentLevel || 1;
            
            hideElement('highscore-screen');
            
            window.savedGameLevel = currentLevel;
            
            window.game.scene.scenes[0].scene.restart();
        } else {
            window.savedGameLevel = 1;
            window.game = new Phaser.Game(config);
        }
    } catch (error) {
        console.error('Error starting game:', error);
        // Show error to user
        alert('Ett fel uppstod när spelet skulle startas. Ladda om sidan för att försöka igen.');
    }
}

/**
 * Start a new game from level 1
 */
function startNewGame() {
    try {
        hideElement('highscore-screen');
        
        window.savedGameLevel = 1;
        
        if (window.game?.scene?.scenes[0]) {
            window.game.scene.scenes[0].scene.restart();
        } else {
            window.game = new Phaser.Game(config);
        }
    } catch (error) {
        console.error('Error starting new game:', error);
        alert('Ett fel uppstod när spelet skulle startas om. Ladda om sidan för att försöka igen.');
    }
}

/**
 * Check if score qualifies for highscore
 * @param {number} score Player's score
 */
function checkHighscore(score) {
    highscores.sort((a, b) => b.score - a.score);
    
    if (highscores.length < MAX_HIGHSCORES || score > (highscores.length > 0 ? highscores[highscores.length - 1].score : 0)) {
        newHighscore = true;
    } else {
        newHighscore = false;
    }
}

/**
 * Save highscore to storage
 * @param {string} name Player name
 * @param {number} score Player score
 * @param {number} level Level reached
 */
function saveHighscore(name, score, level) {
    highscores.push({
        name: name,
        score: score,
        level: level,
        date: new Date().toISOString().split('T')[0]
    });
    
    highscores.sort((a, b) => b.score - a.score);
    
    if (highscores.length > MAX_HIGHSCORES) {
        highscores = highscores.slice(0, MAX_HIGHSCORES);
    }
    
    try {
        saveHighscores(highscores);
    } catch (error) {
        console.error("Error saving highscores:", error);
    }
    
    newHighscore = false;
}

/**
 * Update highscore table in the UI
 */
function updateHighscoreTable() {
    const tbody = document.getElementById('highscore-body');
    if (!tbody) return;
    
    // Clear existing rows
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    
    if (highscores.length === 0) {
        // Show message if no highscores
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 4;
        emptyCell.textContent = "Inga highscores än!";
        emptyCell.style.textAlign = "center";
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
    } else {
        // Create rows for each highscore
        highscores.forEach((score, index) => {
            const row = document.createElement('tr');
            
            const placeCell = document.createElement('td');
            placeCell.textContent = index + 1;
            row.appendChild(placeCell);
            
            const nameCell = document.createElement('td');
            nameCell.textContent = score.name;
            row.appendChild(nameCell);
            
            const scoreCell = document.createElement('td');
            scoreCell.textContent = score.score;
            row.appendChild(scoreCell);
            
            const levelCell = document.createElement('td');
            levelCell.textContent = score.level;
            row.appendChild(levelCell);
            
            tbody.appendChild(row);
        });
    }
}

/**
 * Show highscore screen
 */
function showHighscoreScreen() {
    updateHighscoreTable();
    
    currentState = GameState.GAME_OVER;
    
    const nameInputContainer = document.getElementById('name-input-container');
    const highscoreScreen = document.getElementById('highscore-screen');
    const playerNameInput = document.getElementById('player-name');
    
    if (newHighscore) {
        if (nameInputContainer) {
            nameInputContainer.classList.remove('hidden');
            nameInputContainer.style.display = 'block';
            
            if (playerNameInput) {
                playerNameInput.value = "";
                playerNameInput.focus();
                
                playerNameInput.addEventListener('keydown', function(e) {
                    e.stopPropagation();
                });
            }
        }
    } else if (nameInputContainer) {
        nameInputContainer.classList.add('hidden');
    }
    
    if (highscoreScreen) {
        highscoreScreen.style.display = 'flex';
        highscoreScreen.classList.remove('hidden');
    }
}

/**
 * Create star background for title screen
 */
function createStars() {
    const starsContainer = document.getElementById('stars-container');
    if (!starsContainer) return;
    
    const numStars = 100;
    
    for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        
        const size = Math.random() * 3 + 1;
        const opacity = Math.random() * 0.7 + 0.3;
        
        const twinkleDuration = Math.random() * 5 + 3 + 's';
        const twinkleDelay = Math.random() * 5 + 's';
        
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.setProperty('--star-opacity', opacity);
        star.style.setProperty('--twinkle-duration', twinkleDuration);
        star.style.setProperty('--twinkle-delay', twinkleDelay);
        
        starsContainer.appendChild(star);
    }
}

/**
 * Create particles for title screen
 */
function createParticles() {
    const particlesContainer = document.getElementById('particles-container');
    if (!particlesContainer) return;
    
    const numParticles = 30;
    
    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        setInterval(() => {
            const startX = Math.random() * 40 - 20;
            const startY = Math.random() * 40 - 20;
            
            const moveX = (Math.random() - 0.5) * 200;
            const moveY = (Math.random() - 0.5) * 200;
            
            const scale = Math.random() * 2 + 0.5;
            const opacity = Math.random() * 0.7 + 0.3;
            const duration = Math.random() * 3 + 2 + 's';
            
            particle.style.left = `${30 + startX}px`;
            particle.style.top = `${30 + startY}px`;
            particle.style.setProperty('--move-x', `${moveX}px`);
            particle.style.setProperty('--move-y', `${moveY}px`);
            particle.style.setProperty('--scale-to', scale);
            particle.style.setProperty('--particle-opacity', opacity);
            particle.style.setProperty('--particle-duration', duration);
            particle.style.setProperty('--particle-delay', '0s');
            
            const hue = Math.floor(Math.random() * 40) + 200;
            const saturation = Math.floor(Math.random() * 20) + 80;
            const lightness = Math.floor(Math.random() * 30) + 60;
            
            particle.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            
            particle.style.animation = 'none';
            particle.offsetHeight;
            particle.style.animation = `particleMove ${duration} 1 forwards`;
            
        }, 200 + Math.random() * 300);
        
        particlesContainer.appendChild(particle);
    }
}

/**
 * Handle mouse movement for title screen parallax effect
 * @param {Event} event Mouse move event
 */
function handleMouseMove(event) {
    const titleScreen = document.getElementById('title-screen');
    if (!titleScreen) return;
    
    const player = document.querySelector('.player-3d');
    if (!player) return;
    
    const rect = titleScreen.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) - 0.5;
    const mouseY = ((event.clientY - rect.top) / rect.height) - 0.5;
    
    // Apply parallax effect to player
    const moveX = mouseX * 30;
    const moveY = mouseY * 20;
    
    player.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px)) translateZ(50px)`;
    
    // Move player pupils
    const pupils = document.querySelectorAll('.player-pupil');
    pupils.forEach(pupil => {
        pupil.style.transform = `translate(${mouseX * 3}px, ${mouseY * 3}px)`;
    });
    
    // Apply parallax to enemies
    const enemies = document.querySelectorAll('.enemy');
    enemies.forEach((enemy, index) => {
        const depth = 1 - (index * 0.2);
        enemy.style.marginLeft = `${-mouseX * 20 * depth}px`;
        enemy.style.marginTop = `${-mouseY * 10 * depth}px`;
    });
    
    // Apply parallax to floor
    const floor = document.querySelector('.maze-floor');
    if (floor) {
        floor.style.marginLeft = `${-mouseX * 40}px`;
        floor.style.marginTop = `${-mouseY * 40}px`;
    }
}

/**
 * Set up mobile controls for touch devices
 */
function setupMobileControls() {
    const gameContainer = document.getElementById('game-container');
    
    if (!gameContainer) return;
    
    if (isMobileDevice()) {
        // Create virtual joystick
        const joystickSize = 120;
        const joystickInnerSize = 50;
        
        const joystick = document.createElement('div');
        joystick.className = 'virtual-joystick';
        joystick.style.cssText = `
            position: absolute;
            bottom: 100px;
            left: 30px;
            width: ${joystickSize}px;
            height: ${joystickSize}px;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            display: none;
            z-index: 1001;
            touch-action: none;
        `;
        
        const joystickInner = document.createElement('div');
        joystickInner.className = 'virtual-joystick-inner';
        joystickInner.style.cssText = `
            position: absolute;
            width: ${joystickInnerSize}px;
            height: ${joystickInnerSize}px;
            background-color: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        `;
        
        joystick.appendChild(joystickInner);
        gameContainer.appendChild(joystick);
        
        let joystickActive = false;
        let joystickTouchId = null;
        
        // Handle joystick touch events
        gameContainer.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const touchX = touch.clientX;
            const touchY = touch.clientY;
            
            if (touchX < window.innerWidth / 2 && touchY > window.innerHeight / 2) {
                e.preventDefault();
                joystickActive = true;
                joystickTouchId = touch.identifier;
                
                joystick.style.display = 'block';
                joystick.style.left = (touchX - joystickSize / 2) + 'px';
                joystick.style.bottom = (window.innerHeight - touchY - joystickSize / 2) + 'px';
                
                joystickInner.style.top = '50%';
                joystickInner.style.left = '50%';
            }
        }, { passive: false });
        
        window.addEventListener('touchmove', (e) => {
            if (!joystickActive) return;
            
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                
                if (touch.identifier === joystickTouchId) {
                    e.preventDefault();
                    
                    const joystickRect = joystick.getBoundingClientRect();
                    const centerX = joystickRect.left + joystickRect.width / 2;
                    const centerY = joystickRect.top + joystickRect.height / 2;
                    
                    let deltaX = touch.clientX - centerX;
                    let deltaY = touch.clientY - centerY;
                    
                    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                    const maxDistance = joystickRect.width / 2 - joystickInnerSize / 2;
                    
                    if (distance > maxDistance) {
                        const factor = maxDistance / distance;
                        deltaX *= factor;
                        deltaY *= factor;
                    }
                    
                    joystickInner.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
                    
                    const deadzone = 0.25;
                    const normalizedX = Math.abs(deltaX / maxDistance) > deadzone ? deltaX / maxDistance : 0;
                    const normalizedY = Math.abs(deltaY / maxDistance) > deadzone ? deltaY / maxDistance : 0;
                    
                    window.virtualKeys.left = normalizedX < -deadzone;
                    window.virtualKeys.right = normalizedX > deadzone;
                    window.virtualKeys.up = normalizedY < -deadzone;
                    window.virtualKeys.down = normalizedY > deadzone;
                    
                    break;
                }
            }
        }, { passive: false });
        
        window.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                
                if (touch.identifier === joystickTouchId) {
                    e.preventDefault();
                    joystickActive = false;
                    joystick.style.display = 'none';
                    
                    window.virtualKeys.up = false;
                    window.virtualKeys.down = false;
                    window.virtualKeys.left = false;
                    window.virtualKeys.right = false;
                    
                    break;
                }
            }
        }, { passive: false });
        
        // Make buttons more visible on mobile
        const touchButtons = document.querySelectorAll('.touch-button');
        touchButtons.forEach(button => {
            button.style.display = 'block';
            button.style.padding = '15px 25px';
            button.style.fontSize = '16px';
        });
    }
}

// Initialize game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Load highscores
        try {
            highscores = loadHighscores();
        } catch (error) {
            console.error('Error loading highscores:', error);
            highscores = [];
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Create visual effects
        createStars();
        createParticles();
        
        // Set up touch controls for mobile
        setupMobileControls();
        
        // Set up title screen mouse effect
        const titleScreen = document.getElementById('title-screen');
        if (titleScreen) {
            titleScreen.addEventListener('mousemove', handleMouseMove);
        }
        
        // Set initial state
        currentState = GameState.TITLE_SCREEN;
        
        // Debug log
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        alert('Ett fel uppstod vid initiering av spelet. Ladda om sidan för att försöka igen.');
    }
});