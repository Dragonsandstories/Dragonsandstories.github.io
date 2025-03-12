// Initialize virtual keys for touch controls
if (!window.virtualKeys) {
    window.virtualKeys = {
        up: false,
        down: false,
        left: false,
        right: false
    };
}

// Add touch controls styles directly to avoid external CSS file reference
(function() {
    const style = document.createElement('style');
    style.textContent = `
        /* Touch controls styles */
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
        
        /* Updated positioning for mobile buttons */
        #toggle-light-button {
            bottom: 80px;
            left: 20px;
        }
        
        #flashlight-button {
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
        }
        
        #flashlight-button:active, #flashlight-button.active {
            transform: translateX(-50%) scale(1.1);
        }
        
        #easter-egg-button {
            bottom: 80px;
            right: 20px;
        }
        
        /* Adjust for smaller screens */
        @media (max-width: 768px) {
            .touch-button {
                padding: 12px 20px;
                font-size: 14px;
            }
        }
        
        @media (max-width: 480px) {
            .touch-button {
                padding: 10px 16px;
                font-size: 12px;
            }
        }
    `;
    document.head.appendChild(style);
    console.log("Touch controls styles added directly");
})();

// Set up touch controls when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all DOM elements are properly rendered
    setTimeout(() => {
        setupTouchControls();
        console.log("Touch controls initialized");
    }, 100);
});

function setupTouchControls() {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
        console.error("Game container not found");
        return;
    }

    // Area for swipe recognition - entire screen except UI area
    let touchStartX = 0;
    let touchStartY = 0;
    let touchTime = 0;
    let isSwiping = false;

    // Constants for touch sensitivity
    const SWIPE_THRESHOLD = 30;
    const SWIPE_TIME_THRESHOLD = 300; // ms
    
    // Create touch indicator element
    const touchIndicator = document.createElement('div');
    touchIndicator.className = 'touch-indicator';
    gameContainer.appendChild(touchIndicator);
    
    // Get touch buttons - with defensive check
    const touchButtons = document.querySelectorAll('.touch-button');
    
    // Add visual feedback for button presses (with check if buttons exist)
    if (touchButtons && touchButtons.length > 0) {
        console.log("Found " + touchButtons.length + " touch buttons");
        touchButtons.forEach(button => {
            if (button) {
                button.addEventListener('touchstart', () => {
                    button.classList.add('active');
                });
                
                button.addEventListener('touchend', () => {
                    button.classList.remove('active');
                });
            }
        });
    } else {
        console.warn("No touch buttons found. This is expected if UI is not yet rendered.");
    }

    // Handle touch start
    gameContainer.addEventListener('touchstart', (event) => {
        // Don't process if touching a UI element
        if (event.target.closest('#ui-overlay, .touch-button, #message-overlay, #highscore-screen, #easter-egg')) {
            return;
        }

        const touch = event.touches[0];
        
        // Show touch indicator
        touchIndicator.style.left = touch.clientX + 'px';
        touchIndicator.style.top = touch.clientY + 'px';
        touchIndicator.style.opacity = '1';
        touchIndicator.style.transform = 'translate(-50%, -50%) scale(1)';
        
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchTime = Date.now();
        isSwiping = true;
        
        // Reset virtual keys state
        resetVirtualKeys();
    }, { passive: true });

    // Handle touch move
    gameContainer.addEventListener('touchmove', (event) => {
        if (!isSwiping) return;
        
        const touch = event.touches[0];
        
        // Update touch indicator
        touchIndicator.style.left = touch.clientX + 'px';
        touchIndicator.style.top = touch.clientY + 'px';
        
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        
        // Only set direction if sufficient movement detected
        if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
            window.virtualKeys.left = deltaX < 0;
            window.virtualKeys.right = deltaX > 0;
        }
        
        if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
            window.virtualKeys.up = deltaY < 0;
            window.virtualKeys.down = deltaY > 0;
        }
    }, { passive: true });

    // Handle touch end
    gameContainer.addEventListener('touchend', (event) => {
        if (!isSwiping) return;
        
        // Hide touch indicator with fade out effect
        touchIndicator.style.opacity = '0';
        touchIndicator.style.transform = 'translate(-50%, -50%) scale(0.5)';
        
        // Check if it was a quick tap (potential toggle light action)
        const touchDuration = Date.now() - touchTime;
        if (touchDuration < SWIPE_TIME_THRESHOLD) {
            // If touch didn't move much, consider it a tap to toggle light
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;
            
            if (Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) {
                triggerLightToggle();
            }
        }
        
        // Reset state
        isSwiping = false;
        resetVirtualKeys();
    }, { passive: true });
    
    // Handle touch cancel
    gameContainer.addEventListener('touchcancel', () => {
        // Hide touch indicator
        touchIndicator.style.opacity = '0';
        
        isSwiping = false;
        resetVirtualKeys();
    }, { passive: true });
    
    // Reset virtual keys to initial state
    function resetVirtualKeys() {
        window.virtualKeys.up = false;
        window.virtualKeys.down = false;
        window.virtualKeys.left = false;
        window.virtualKeys.right = false;
    }
    
    // Trigger light toggle function (same as spacebar)
    function triggerLightToggle() {
        if (window.game && window.game.scene && 
            window.game.scene.scenes && 
            window.game.scene.scenes[0] && 
            typeof window.gameState !== 'undefined' && 
            window.gameState.running) {
            window.game.scene.scenes[0].player.toggleLight();
            console.log("Light toggled via screen tap");
        } else {
            console.log("Game not ready for light toggle");
        }
    }
    
    // Reposition UI buttons
    repositionTouchButtons();
}

// Function to reposition touch buttons based on screen size
function repositionTouchButtons() {
    // Get touch buttons
    const toggleLightButton = document.getElementById('toggle-light-button');
    const flashlightButton = document.getElementById('flashlight-button');
    const easterEggButton = document.getElementById('easter-egg-button');
    
    // Apply new positions if buttons exist
    if (toggleLightButton) {
        toggleLightButton.style.bottom = '80px';
        toggleLightButton.style.left = '20px';
    }
    
    if (flashlightButton) {
        flashlightButton.style.bottom = '80px';
        flashlightButton.style.left = '50%';
        flashlightButton.style.transform = 'translateX(-50%)';
    }
    
    if (easterEggButton) {
        easterEggButton.style.bottom = '80px';
        easterEggButton.style.right = '20px';
    }
}

// Window resize event handler
window.addEventListener('resize', repositionTouchButtons);

// Export virtual keys object to ensure it's globally available
window.getVirtualKeys = function() {
    return window.virtualKeys;
};

// Debug function to check if touch controls are working
window.debugTouchControls = function() {
    console.log("Current virtual keys state:", window.virtualKeys);
    
    // Test setting values
    window.virtualKeys.up = true;
    console.log("After setting up=true:", window.virtualKeys);
    
    // Reset after 1 second
    setTimeout(() => {
        window.virtualKeys.up = false;
        console.log("After 1s reset:", window.virtualKeys);
    }, 1000);
};