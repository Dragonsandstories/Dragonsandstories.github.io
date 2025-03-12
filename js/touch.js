// Touch control variables
let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let touchCurrentY = 0;
let isTouching = false;

// Simulated key states (to mimic WASD/arrow keys)
window.virtualKeys = {
    up: false,
    down: false,
    left: false,
    right: false
};

// Threshold for detecting movement (to avoid tiny unintended movements)
const TOUCH_THRESHOLD = 10;

// Get the game container
const gameContainer = document.getElementById('game-container');

// Touch start event
gameContainer.addEventListener('touchstart', (event) => {
    event.preventDefault(); // Prevent scrolling or zooming
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchCurrentX = touchStartX;
    touchCurrentY = touchStartY;
    isTouching = true;
});

// Touch move event
gameContainer.addEventListener('touchmove', (event) => {
    event.preventDefault();
    if (!isTouching) return;

    const touch = event.touches[0];
    touchCurrentX = touch.clientX;
    touchCurrentY = touch.clientY;

    // Calculate the delta (movement distance)
    const deltaX = touchCurrentX - touchStartX;
    const deltaY = touchCurrentY - touchStartY;

    // Reset virtual keys
    window.virtualKeys.up = false;
    window.virtualKeys.down = false;
    window.virtualKeys.left = false;
    window.virtualKeys.right = false;

    // Determine direction based on the larger delta
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal movement
        if (Math.abs(deltaX) > TOUCH_THRESHOLD) {
            window.virtualKeys.left = deltaX < 0;
            window.virtualKeys.right = deltaX > 0;
        }
    } else {
        // Vertical movement
        if (Math.abs(deltaY) > TOUCH_THRESHOLD) {
            window.virtualKeys.up = deltaY < 0;
            window.virtualKeys.down = deltaY > 0;
        }
    }
});

// Touch end event
gameContainer.addEventListener('touchend', (event) => {
    event.preventDefault();
    isTouching = false;
    // Reset virtual keys when the touch ends
    window.virtualKeys.up = false;
    window.virtualKeys.down = false;
    window.virtualKeys.left = false;
    window.virtualKeys.right = false;
});