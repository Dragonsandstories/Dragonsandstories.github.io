// Initialize virtual keys for touch controls
if (!window.virtualKeys) {
    window.virtualKeys = {
        up: false,
        down: false,
        left: false,
        right: false
    };
}

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
    
    // Add CSS for touch feedback
    const style = document.createElement('style');
    style.textContent = `
        .touch-button.active {
            background-color: rgba(100, 200, 255, 0.7) !important;
            box-shadow: 0 0 15px rgba(100, 200, 255, 0.9) !important;
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
            typeof window.gameRunning !== 'undefined' && 
            window.gameRunning) {
            window.game.scene.scenes[0].player.toggleLight();
            console.log("Light toggled via screen tap");
        } else {
            console.log("Game not ready for light toggle");
        }
    }
}

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