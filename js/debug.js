/**
 * Ljus & Mörker - Debug Utilities
 * Enhanced debug panel and tools for game troubleshooting
 */

// Add debug panel when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Debug module loaded");
    
    // Create debug panel function
    const createDebugPanel = function() {
        // Remove existing panel if it exists
        const existingPanel = document.getElementById('debug-panel');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }
        
        // Create debug panel container
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.position = 'fixed';
        debugPanel.style.top = '10px';
        debugPanel.style.right = '10px';
        debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        debugPanel.style.color = 'white';
        debugPanel.style.padding = '10px';
        debugPanel.style.borderRadius = '5px';
        debugPanel.style.zIndex = '10000';
        debugPanel.style.display = 'flex';
        debugPanel.style.flexDirection = 'column';
        debugPanel.style.gap = '5px';
        debugPanel.style.maxWidth = '300px';
        debugPanel.style.maxHeight = '80vh';
        debugPanel.style.overflow = 'auto';
        debugPanel.style.fontFamily = 'monospace';
        debugPanel.style.fontSize = '12px';
        debugPanel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        
        // Add title
        const title = document.createElement('div');
        title.textContent = 'DEBUG PANEL';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '14px';
        title.style.borderBottom = '1px solid #555';
        title.style.paddingBottom = '5px';
        title.style.marginBottom = '5px';
        title.style.textAlign = 'center';
        debugPanel.appendChild(title);
        
        // Create game info section
        const gameInfo = document.createElement('div');
        gameInfo.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold;">Game Status:</div>
            <div>Game state: <span id="debug-game-state">${window.gameState ? JSON.stringify(window.gameState) : 'Not initialized'}</span></div>
            <div>Current level: <span id="debug-level">${window.game?.scene?.scenes[0]?.currentLevel || 'N/A'}</span></div>
            <div>Crystals: <span id="debug-crystals">${window.game?.scene?.scenes[0]?.player?.crystalsCollected || '0'}</span>/<span id="debug-total-crystals">${window.game?.scene?.scenes[0]?.requiredCrystals || '0'}</span></div>
            <div>Score: <span id="debug-score">${window.game?.scene?.scenes[0]?.player?.score || '0'}</span></div>
        `;
        gameInfo.style.marginBottom = '10px';
        debugPanel.appendChild(gameInfo);
        
        // Create button factory function
        const createButton = (text, onClick) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.onclick = onClick;
            button.style.cursor = 'pointer';
            button.style.margin = '2px 0';
            button.style.padding = '5px';
            button.style.backgroundColor = '#444';
            button.style.border = 'none';
            button.style.borderRadius = '3px';
            button.style.color = 'white';
            return button;
        };
        
        // Add UI control buttons
        debugPanel.appendChild(createButton('Show Message', () => {
            console.log("Showing test message");
            const messageText = document.getElementById('message-text');
            if (messageText) messageText.textContent = 'Detta är ett testmeddelande';
            document.getElementById('message-overlay').classList.remove('hidden');
            document.getElementById('restart-button').classList.remove('hidden');
        }));
        
        debugPanel.appendChild(createButton('Show Highscore', () => {
            console.log("Showing highscore screen");
            document.getElementById('highscore-screen').classList.remove('hidden');
        }));
        
        debugPanel.appendChild(createButton('Show Easter Egg', () => {
            console.log("Showing easter egg");
            document.getElementById('easter-egg').classList.remove('hidden');
        }));
        
        debugPanel.appendChild(createButton('Toggle UI', () => {
            const uiOverlay = document.getElementById('ui-overlay');
            uiOverlay.classList.toggle('hidden');
            console.log("UI-overlay visible:", !uiOverlay.classList.contains('hidden'));
        }));
        
        // Add game control buttons
        const gameControls = document.createElement('div');
        gameControls.style.borderTop = '1px solid #555';
        gameControls.style.borderBottom = '1px solid #555';
        gameControls.style.padding = '8px 0';
        gameControls.style.margin = '8px 0';
        
        gameControls.appendChild(createButton('Skip to Next Level', () => {
            if (window.game?.scene?.scenes[0] && window.gameState?.running) {
                // Collect all crystals to trigger next level
                if (window.game.scene.scenes[0].crystals) {
                    window.game.scene.scenes[0].crystals.forEach(crystal => {
                        if (!crystal.collected) {
                            crystal.collect();
                            window.game.scene.scenes[0].player.crystalsCollected++;
                        }
                    });
                    
                    // Update UI
                    window.game.scene.scenes[0].updateCrystalsUI(window.game.scene.scenes[0].player.crystalsCollected);
                    
                    // Trigger next level
                    window.game.scene.scenes[0].nextLevel();
                    console.log("Skipped to next level");
                }
            } else {
                console.log("Game not running, can't skip level");
            }
        }));
        
        gameControls.appendChild(createButton('Add 1000 Points', () => {
            if (window.game?.scene?.scenes[0]?.player) {
                window.game.scene.scenes[0].player.score += 1000;
                window.game.scene.scenes[0].updateScoreUI(window.game.scene.scenes[0].player.score);
                console.log("Added 1000 points");
            }
        }));
        
        gameControls.appendChild(createButton('Toggle Invincibility', () => {
            if (window.game?.scene?.scenes[0]) {
                // Toggle invincibility flag
                window.game.scene.scenes[0].debugInvincible = !window.game.scene.scenes[0].debugInvincible;
                
                // Patch the endGame function to check for invincibility
                if (window.game.scene.scenes[0].debugInvincible) {
                    // Save original function
                    if (!window.game.scene.scenes[0]._originalEndGame) {
                        window.game.scene.scenes[0]._originalEndGame = window.game.scene.scenes[0].endGame;
                    }
                    
                    // Replace with invincible version
                    window.game.scene.scenes[0].endGame = function(message) {
                        console.log("Game would end, but invincibility is on:", message);
                    };
                    console.log("Invincibility enabled");
                } else {
                    // Restore original function
                    if (window.game.scene.scenes[0]._originalEndGame) {
                        window.game.scene.scenes[0].endGame = window.game.scene.scenes[0]._originalEndGame;
                        console.log("Invincibility disabled");
                    }
                }
            }
        }));
        
        debugPanel.appendChild(gameControls);
        
        // Add diagnostics section
        const diagnostics = document.createElement('div');
        diagnostics.style.marginBottom = '10px';
        
        diagnostics.appendChild(createButton('Run Diagnostics', () => {
            runDiagnostics();
        }));
        
        diagnostics.appendChild(createButton('Fix Common Issues', () => {
            applyCommonFixes();
        }));
        
        diagnostics.appendChild(createButton('Show Game Objects', () => {
            if (window.game?.scene?.scenes[0]) {
                const scene = window.game.scene.scenes[0];
                console.group('Game Objects');
                console.log('Player:', scene.player);
                console.log('Enemies:', scene.enemies);
                console.log('Crystals:', scene.crystals);
                console.log('Projectiles:', scene.darkProjectiles);
                console.log('Particles:', scene.projectileParticles);
                console.groupEnd();
            } else {
                console.log('Game scene not available');
            }
        }));
        
        debugPanel.appendChild(diagnostics);
        
        // Add close button
        const closeBtn = createButton('Close Debug', () => {
            debugPanel.remove();
        });
        closeBtn.style.marginTop = '10px';
        debugPanel.appendChild(closeBtn);
        
        // Add panel to body
        document.body.appendChild(debugPanel);
        
        console.log("Debug panel created");
        
        // Start periodic updates of debug info
        updateDebugInfo();
    };
    
    // Update debug info every second
    function updateDebugInfo() {
        const panel = document.getElementById('debug-panel');
        if (!panel) return;
        
        // Update game state info
        const gameStateElem = document.getElementById('debug-game-state');
        const levelElem = document.getElementById('debug-level');
        const crystalsElem = document.getElementById('debug-crystals');
        const totalCrystalsElem = document.getElementById('debug-total-crystals');
        const scoreElem = document.getElementById('debug-score');
        
        if (gameStateElem) {
            gameStateElem.textContent = window.gameState ? 
                Object.entries(window.gameState)
                    .filter(([key, value]) => typeof value === 'boolean' && value)
                    .map(([key]) => key)
                    .join(', ') || 'none' 
                : 'Not initialized';
        }
        
        if (levelElem) {
            levelElem.textContent = window.game?.scene?.scenes[0]?.currentLevel || 'N/A';
        }
        
        if (crystalsElem) {
            crystalsElem.textContent = window.game?.scene?.scenes[0]?.player?.crystalsCollected || '0';
        }
        
        if (totalCrystalsElem) {
            totalCrystalsElem.textContent = window.game?.scene?.scenes[0]?.requiredCrystals || '0';
        }
        
        if (scoreElem) {
            scoreElem.textContent = window.game?.scene?.scenes[0]?.player?.score || '0';
        }
        
        // Schedule next update
        setTimeout(updateDebugInfo, 1000);
    }
    
    // Create debug panel when user presses Ctrl+D
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            createDebugPanel();
        }
    });
});

/**
 * Run diagnostics on the game
 */
function runDiagnostics() {
    console.group('🔍 Game Diagnostics');
    
    // Check game initialization
    console.log('Game Initialization:');
    console.log(`- window.game: ${window.game ? '✅' : '❌'}`);
    console.log(`- Game scene: ${window.game?.scene?.scenes[0] ? '✅' : '❌'}`);
    console.log(`- Player: ${window.game?.scene?.scenes[0]?.player ? '✅' : '❌'}`);
    
    // Check game state
    console.log('Game State:');
    console.log(`- gameState: ${window.gameState ? '✅' : '❌'}`);
    console.log(`- gameRunning: ${window.gameRunning !== undefined ? '✅' : '❌'}`);
    console.log(`- Current state: ${window.gameState ? 
        Object.entries(window.gameState)
            .filter(([key, value]) => typeof value === 'boolean' && value)
            .map(([key]) => key)
            .join(', ') || 'none' 
        : 'Not initialized'}`);
    
    // Check for required DOM elements
    console.log('DOM Elements:');
    const requiredElements = [
        'game-container', 'ui-overlay', 'message-overlay', 
        'highscore-screen', 'easter-egg', 'title-screen',
        'light-level', 'crystals-collected', 'total-crystals',
        'score', 'level', 'stamina-bar'
    ];
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`- ${id}: ${element ? '✅' : '❌'}`);
    });
    
    // Check touch controls
    console.log('Touch Controls:');
    const touchButtons = document.querySelectorAll('.touch-button');
    console.log(`- Touch buttons: ${touchButtons.length} found`);
    console.log(`- virtualKeys: ${window.virtualKeys ? '✅' : '❌'}`);
    
    // Check for CSS
    console.log('CSS Styles:');
    let touchControlsFound = false;
    for (let i = 0; i < document.styleSheets.length; i++) {
        try {
            const rules = document.styleSheets[i].cssRules;
            for (let j = 0; j < rules.length; j++) {
                if (rules[j].selectorText && rules[j].selectorText.includes('.touch-button')) {
                    touchControlsFound = true;
                    break;
                }
            }
        } catch (e) {
            // Cross-origin stylesheet error, ignore
        }
    }
    console.log(`- Touch control styles: ${touchControlsFound ? '✅' : '❌'}`);
    
    // Check for errors
    console.log('Error Detection:');
    const errors = [];
    
    if (!window.game) {
        errors.push('Game not initialized');
    }
    
    if (!window.gameState) {
        errors.push('Game state not initialized');
    }
    
    if (!touchControlsFound) {
        errors.push('Touch control styles missing');
    }
    
    if (errors.length > 0) {
        console.log('❌ Issues found:');
        errors.forEach(error => console.log(`  - ${error}`));
    } else {
        console.log('✅ No major issues detected');
    }
    
    console.groupEnd();
    
    return {
        hasErrors: errors.length > 0,
        errors: errors
    };
}

/**
 * Apply common fixes to the game
 */
function applyCommonFixes() {
    console.group('🔧 Applying Fixes');
    
    // Fix 1: Ensure gameState is properly initialized
    if (!window.gameState) {
        window.gameState = {
            running: false,
            paused: false,
            over: false,
            won: false
        };
        
        // For backwards compatibility
        Object.defineProperty(window, 'gameRunning', {
            get: function() { return window.gameState.running; },
            set: function(value) { 
                if (value) {
                    window.gameState.running = true;
                    window.gameState.paused = false;
                } else {
                    window.gameState.running = false;
                    window.gameState.paused = true;
                }
            }
        });
        
        console.log('✅ Fixed: Created gameState object');
    }
    
    // Fix 2: Add missing touch control styles
    let touchControlsFound = false;
    for (let i = 0; i < document.styleSheets.length; i++) {
        try {
            const rules = document.styleSheets[i].cssRules;
            for (let j = 0; j < rules.length; j++) {
                if (rules[j].selectorText && rules[j].selectorText.includes('.touch-button')) {
                    touchControlsFound = true;
                    break;
                }
            }
        } catch (e) {
            // Cross-origin stylesheet error, ignore
        }
    }
    
    if (!touchControlsFound) {
        const style = document.createElement('style');
        style.textContent = `
            .touch-button {
                position: fixed;
                padding: 15px 25px;
                background: rgba(20, 40, 80, 0.7);
                color: white;
                border: 2px solid rgba(100, 200, 255, 0.6);
                border-radius: 50px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                z-index: 1001;
                box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
                transition: all 0.2s ease;
            }
            
            .touch-button:active, .touch-button.active {
                background-color: rgba(100, 200, 255, 0.7);
                box-shadow: 0 0 20px rgba(100, 200, 255, 0.8);
                transform: scale(1.1);
            }
            
            .virtual-joystick {
                position: absolute;
                width: 120px;
                height: 120px;
                background-color: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.6);
                border-radius: 50%;
                z-index: 1001;
                box-shadow: 0 0 20px rgba(100, 200, 255, 0.3);
                touch-action: none;
            }
            
            .virtual-joystick-inner {
                position: absolute;
                width: 50px;
                height: 50px;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(100, 200, 255, 0.8) 100%);
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            }
            
            .touch-indicator {
                position: absolute;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background-color: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.6);
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s, transform 0.3s;
            }
        `;
        document.head.appendChild(style);
        console.log('✅ Fixed: Added missing touch control styles');
    }
    
    // Fix 3: Ensure touch buttons are properly initialized
    const touchButtons = document.querySelectorAll('.touch-button');
    if (touchButtons.length > 0) {
        // Re-attach event listeners to buttons
        touchButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            if (button.parentNode) {
                button.parentNode.replaceChild(newButton, button);
            }
            
            // Add touch event listeners
            newButton.addEventListener('touchstart', () => {
                newButton.classList.add('active');
            });
            
            newButton.addEventListener('touchend', () => {
                newButton.classList.remove('active');
            });
            
            // Add click listener based on ID
            if (newButton.id === 'toggle-light-button') {
                newButton.addEventListener('click', () => {
                    if (window.game?.scene?.scenes[0] && window.gameState?.running) {
                        window.game.scene.scenes[0].player.toggleLight();
                    }
                });
            } else if (newButton.id === 'flashlight-button') {
                newButton.addEventListener('click', () => {
                    if (window.game?.scene?.scenes[0] && window.gameState?.running && 
                        !window.game.scene.scenes[0].player.flashlightActive) {
                        window.game.scene.scenes[0].player.activateFlashlight();
                    }
                });
            } else if (newButton.id === 'easter-egg-button') {
                newButton.addEventListener('click', () => {
                    if (window.game?.scene?.scenes[0] && window.gameState?.running && 
                        window.game.scene.scenes[0].currentLevel === 1) {
                        window.game.scene.scenes[0].pauseGame();
                        document.getElementById('easter-egg').classList.remove('hidden');
                    }
                });
            }
        });
        console.log('✅ Fixed: Reattached event listeners to touch buttons');
    }
    
    // Fix 4: Ensure the correct script loading order
    if (!window.game && typeof Phaser !== 'undefined') {
        console.log('⚠️ Game not initialized but Phaser is available. You may need to manually start the game.');
    }
    
    console.groupEnd();
    
    return {
        touchStylesAdded: !touchControlsFound,
        touchButtonsFixed: touchButtons.length > 0,
        gameStateFixed: !window.gameState
    };
}