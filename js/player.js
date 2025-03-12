/**
 * Ljus & Mörker - Enhanced Player Class
 * Controls player character, movement, light mechanics, and interactions.
 */
class Player {
    /**
     * Creates a new player instance
     * @param {object} scene - Reference to the Phaser scene
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     */
    constructor(scene, x, y) {
        this.scene = scene;

        // ===== CORE PROPERTIES =====
        this.x = x;
        this.y = y;
        this.radius = PLAYER_SIZE / 2;
        this.baseSpeed = PLAYER_SPEED;
        this.currentSpeed = PLAYER_SPEED;
        this.internalState = {
            moving: false,
            sprinting: false,
            tired: false,
            direction: 0,
            tiredUntil: 0,
            stamina: MAX_STAMINA
        };

        // ===== LIGHT PROPERTIES =====
        // Get maximum light radius based on level difficulty
        const maxLightRadius = typeof getMaxLightRadius === 'function' ? 
            getMaxLightRadius(scene.currentLevel) : MAX_LIGHT_RADIUS;
            
        this.lightProperties = {
            radius: maxLightRadius,
            intensity: 100,
            isOn: true,
            pulseTime: 0,
            pulseAmount: 0.1,
            pulseSpeed: 0.03
        };

        // ===== FLASHLIGHT PROPERTIES =====
        this.flashlightProperties = {
            active: false,
            endTime: 0,
            angle: FLASHLIGHT_ANGLE || Math.PI / 3,
            range: FLASHLIGHT_RANGE || 200,
            duration: FLASHLIGHT_DURATION || 1000,
            sprite: null,
            lastUseTime: 0,
            cooldown: 3000  // Cooldown period in ms
        };

        // ===== GAMEPLAY PROPERTIES =====
        this.gameProperties = {
            crystalsCollected: 0,
            score: 0,
            invincible: false  // Debug/cheat property
        };

        // ===== ANIMATION PROPERTIES =====
        this.animationProperties = {
            antennaWaveSpeed: 3,
            antennaWaveAmount: 0.2,
            eyeMovementAmount: 0.1,
            blinkInterval: {min: 2000, max: 4000},
            lastBlinkTime: 0,
            nextBlinkTime: 0,
            isBlinking: false,
            blinkDuration: 150
        };

        // Create visual elements
        this._createVisuals();
        
        // Optional particle effects for movement
        this._createParticleEffects();
        
        // Initialize blink timer
        this._resetBlinkTimer();
    }

    /**
     * Creates all visual elements for the player
     * @private
     */
    _createVisuals() {
        try {
            // ===== CONTAINER FOR ALL PLAYER VISUALS =====
            this.container = this.scene.add.container(this.x + this.radius, this.y + this.radius);

            // ===== BODY =====
            this.body = this.scene.add.circle(0, 0, this.radius, 0xffffff);
            this.bodyGlow = this.scene.add.circle(0, 0, this.radius * 1.2, 0xffffcc, 0.3);

            // ===== EYES =====
            const eyeRadius = this.radius * 0.25;
            this.leftEye = this.scene.add.circle(-this.radius * 0.3, -this.radius * 0.2, eyeRadius, 0x000000);
            this.rightEye = this.scene.add.circle(this.radius * 0.3, -this.radius * 0.2, eyeRadius, 0x000000);

            const pupilRadius = eyeRadius * 0.6;
            this.leftPupil = this.scene.add.circle(-this.radius * 0.3, -this.radius * 0.2, pupilRadius, 0x4080ff);
            this.rightPupil = this.scene.add.circle(this.radius * 0.3, -this.radius * 0.2, pupilRadius, 0x4080ff);

            // ===== ANTENNAS =====
            const antennaWidth = 2;

            // Left antenna
            this.leftAntenna = this.scene.add.graphics();
            this.leftAntenna.lineStyle(antennaWidth, 0xffffff, 1);
            this.leftAntenna.lineBetween(-this.radius * 0.3, -this.radius * 0.7, -this.radius * 0.5, -this.radius * 1.3);
            this.leftAntennaTip = this.scene.add.circle(-this.radius * 0.5, -this.radius * 1.3, antennaWidth * 1.5, 0xffffcc);

            // Right antenna
            this.rightAntenna = this.scene.add.graphics();
            this.rightAntenna.lineStyle(antennaWidth, 0xffffff, 1);
            this.rightAntenna.lineBetween(this.radius * 0.3, -this.radius * 0.7, this.radius * 0.5, -this.radius * 1.3);
            this.rightAntennaTip = this.scene.add.circle(this.radius * 0.5, -this.radius * 1.3, antennaWidth * 1.5, 0xffffcc);

            // ===== MOUTH =====
            this.mouth = this.scene.add.graphics();
            this._updateMouth('happy'); // Default expression

            // ===== EYELIDS FOR BLINKING =====
            this.leftEyelid = this.scene.add.graphics();
            this.rightEyelid = this.scene.add.graphics();
            this._updateEyelids(false); // Not blinking initially

            // ===== ADD ALL ELEMENTS TO CONTAINER =====
            this.container.add([
                this.bodyGlow,
                this.body,
                this.leftEye,
                this.rightEye,
                this.leftPupil,
                this.rightPupil,
                this.leftAntenna,
                this.rightAntenna,
                this.leftAntennaTip,
                this.rightAntennaTip,
                this.mouth,
                this.leftEyelid,
                this.rightEyelid
            ]);

            // ===== LIGHT LAYERS =====
            // Main light circle
            this.lightSprite = this.scene.add.circle(
                this.x + this.radius, 
                this.y + this.radius, 
                this.lightProperties.radius, 
                0xffffcc, 
                0.4
            );

            // Inner light (more intense)
            this.innerLightSprite = this.scene.add.circle(
                this.x + this.radius, 
                this.y + this.radius, 
                this.lightProperties.radius * 0.6, 
                0xffffee, 
                0.3
            );

            // Outer glow (subtle)
            this.outerLightSprite = this.scene.add.circle(
                this.x + this.radius, 
                this.y + this.radius, 
                this.lightProperties.radius * 1.2, 
                0xffffcc, 
                0.1
            );
        } catch (error) {
            console.error("Error creating player visuals:", error);
        }
    }

    /**
     * Creates particle effects for player movement
     * @private
     */
    _createParticleEffects() {
        try {
            // Dust particles when moving
            this.dustParticles = [];
            
            // Trail particles when sprinting
            this.sprintTrail = [];
            
            // Exhaustion particles when tired
            this.exhaustionParticles = [];
        } catch (error) {
            console.error("Error creating particle effects:", error);
        }
    }

    /**
     * Main update function called every frame
     * @param {number} time - Current game time
     * @param {number} delta - Time since last frame in ms
     */
    update(time, delta) {
        try {
            // Skip update if game is not running
            if ((typeof window.gameState !== 'undefined' && !window.gameState.running) || 
                (typeof window.gameState === 'undefined' && !window.gameRunning)) {
                this.internalState.moving = false;
                return;
            }
            
            // Skip update during level transitions
            if (this.scene.isLevelTransitioning) {
                this.internalState.moving = false;
                return;
            }

            // Update tired status
            if (this.internalState.tired && time >= this.internalState.tiredUntil) {
                this.internalState.tired = false;
            }

            // Update flashlight
            this._updateFlashlight(time);

            // Skip movement if flashlight is active
            if (this.flashlightProperties.active) {
                this.internalState.moving = false;
                return;
            }

            // Handle movement and update position
            this._handleMovement(time, delta);

            // Recover stamina when not sprinting
            if (!this.internalState.sprinting && this.internalState.stamina < MAX_STAMINA) {
                this.internalState.stamina = Math.min(
                    MAX_STAMINA, 
                    this.internalState.stamina + (STAMINA_RECOVERY_RATE * delta / 16)
                );
            }

            // Restore light intensity when not sprinting or not moving
            if (this.lightProperties.isOn && 
                this.lightProperties.intensity < 100 && 
                (!this.internalState.sprinting || !this.internalState.moving)) {
                this.lightProperties.intensity = Math.min(
                    100, 
                    this.lightProperties.intensity + (0.01 * delta / 16)
                );
                if (typeof this.scene.updateLightLevelUI === 'function') {
                    this.scene.updateLightLevelUI(Math.floor(this.lightProperties.intensity));
                }
            }

            // Update UI elements
            if (typeof this.scene.updateStaminaUI === 'function') {
                this.scene.updateStaminaUI(this.internalState.stamina, this.internalState.tired);
            }
            
            // Update visual elements
            this._updateVisuals(time, delta);
            
            // Check for crystal collisions
            this._checkCrystalCollisions();
            
            // Handle blinking animation
            this._updateBlinking(time);
            
            // Update all particle effects
            this._updateParticles(delta);
        } catch (error) {
            console.error("Error in player update:", error);
        }
    }

    /**
     * Updates all particle effects
     * @private
     */
    _updateParticles(delta) {
        try {
            // Update dust particles
            for (let i = this.dustParticles.length - 1; i >= 0; i--) {
                const particle = this.dustParticles[i];
                particle.life -= particle.decay * (delta / 16);
                
                if (particle.life <= 0) {
                    particle.sprite.destroy();
                    this.dustParticles.splice(i, 1);
                } else {
                    particle.sprite.setAlpha(particle.life * 0.5);
                    
                    // If particle has velocity, update position
                    if (particle.vx !== undefined && particle.vy !== undefined) {
                        particle.sprite.x += particle.vx * (delta / 16);
                        particle.sprite.y += particle.vy * (delta / 16);
                    }
                }
            }
            
            // Update sprint trail
            for (let i = this.sprintTrail.length - 1; i >= 0; i--) {
                const particle = this.sprintTrail[i];
                particle.life -= particle.decay * (delta / 16);
                
                if (particle.life <= 0) {
                    particle.sprite.destroy();
                    this.sprintTrail.splice(i, 1);
                } else {
                    particle.sprite.setAlpha(particle.life * 0.3);
                    particle.sprite.setRadius(particle.size * particle.life);
                }
            }
            
            // Update exhaustion particles
            for (let i = this.exhaustionParticles.length - 1; i >= 0; i--) {
                const particle = this.exhaustionParticles[i];
                particle.life -= particle.decay * (delta / 16);
                
                if (particle.life <= 0) {
                    particle.sprite.destroy();
                    this.exhaustionParticles.splice(i, 1);
                } else {
                    // Update position to oscillate around player
                    const osc = Math.sin(particle.life * 10 * particle.oscSpeed) * 5;
                    const distance = particle.distance + osc;
                    
                    particle.sprite.x = this.x + this.radius + Math.cos(particle.angle) * distance;
                    particle.sprite.y = this.y + this.radius + Math.sin(particle.angle) * distance;
                    particle.sprite.setAlpha(particle.life * 0.7);
                }
            }
        } catch (error) {
            console.error("Error updating particles:", error);
        }
    }

    /**
     * Handles player movement input and collision
     * @param {number} time - Current game time
     * @param {number} delta - Time since last frame in ms
     * @private
     */
    _handleMovement(time, delta) {
        try {
            const cursors = this.scene.cursors;
            const keys = this.scene.keys;

            // Calculate movement direction
            let dx = 0, dy = 0;

            // Check keyboard input with null checks
            if ((cursors?.up?.isDown || keys?.W?.isDown)) dy -= 1;
            if ((cursors?.down?.isDown || keys?.S?.isDown)) dy += 1;
            if ((cursors?.left?.isDown || keys?.A?.isDown)) dx -= 1;
            if ((cursors?.right?.isDown || keys?.D?.isDown)) dx += 1;

            // Check touch input
            if (window.virtualKeys) {
                if (window.virtualKeys.up) dy -= 1;
                if (window.virtualKeys.down) dy += 1;
                if (window.virtualKeys.left) dx -= 1;
                if (window.virtualKeys.right) dx += 1;
            }

            // Normalize diagonal movement for consistent speed
            if (dx !== 0 && dy !== 0) {
                const norm = 1 / Math.sqrt(dx * dx + dy * dy);
                dx *= norm;
                dy *= norm;
            }

            // Update movement status
            this.internalState.moving = dx !== 0 || dy !== 0;

            if (this.internalState.moving) {
                // Update direction for visuals
                this.internalState.direction = Math.atan2(dy, dx);

                // Handle sprint and stamina
                const wantToSprint = cursors?.shift?.isDown && !this.internalState.tired && this.internalState.stamina > 0;

                if (wantToSprint) {
                    this.internalState.sprinting = true;
                    this.internalState.stamina = Math.max(0, this.internalState.stamina - (STAMINA_DRAIN_RATE * delta / 16));

                    if (this.internalState.stamina <= 0) {
                        this.internalState.tired = true;
                        this.internalState.tiredUntil = time + TIRED_DURATION;
                        this.internalState.sprinting = false;
                        
                        // Create exhaustion effect
                        this._createExhaustionEffect();
                    }

                    // Gradually increase speed to sprint speed
                    this.currentSpeed = Phaser.Math.Linear(
                        this.currentSpeed, 
                        PLAYER_MAX_SPRINT_SPEED, 
                        0.1
                    );

                    // Decrease light intensity when sprinting
                    if (this.lightProperties.isOn) {
                        this.lightProperties.intensity = Math.max(
                            50, 
                            this.lightProperties.intensity - (0.1 * delta / 16)
                        );
                        if (typeof this.scene.updateLightLevelUI === 'function') {
                            this.scene.updateLightLevelUI(Math.floor(this.lightProperties.intensity));
                        }
                    }
                    
                    // Create sprint trail effect
                    if (Math.random() < 0.2) {
                        this._createSprintTrailEffect();
                    }
                } else {
                    this.internalState.sprinting = false;

                    // Target speed based on tired state
                    const targetSpeed = this.internalState.tired ? PLAYER_TIRED_SPEED : PLAYER_SPEED;

                    // Smoothly transition to target speed
                    this.currentSpeed = Phaser.Math.Linear(
                        this.currentSpeed, 
                        targetSpeed, 
                        0.1
                    );
                    
                    // Create dust particles when moving
                    if (Math.random() < 0.05) {
                        this._createDustEffect();
                    }
                }

                // Calculate new position
                const moveDistance = this.currentSpeed * (delta / 1000);
                const newX = this.x + dx * moveDistance;
                const newY = this.y + dy * moveDistance;

                // Move with collision detection
                this._moveWithCollision(newX, newY);
            } else {
                // Gradually slow down when not moving
                if (this.currentSpeed > this.baseSpeed) {
                    this.currentSpeed = Phaser.Math.Linear(
                        this.currentSpeed, 
                        this.baseSpeed, 
                        0.15
                    );
                }
                this.internalState.sprinting = false;
            }
        } catch (error) {
            console.error("Error handling player movement:", error);
        }
    }

    /**
     * Moves player with collision detection
     * @param {number} newX - Target X position
     * @param {number} newY - Target Y position
     * @private
     */
    _moveWithCollision(newX, newY) {
        try {
            // Check x-axis movement
            if (!this._collideWithWalls(newX, this.y)) {
                this.x = newX;
            } else {
                // Try to slide along walls on x-axis
                for (let offset = 1; offset <= this.radius; offset++) {
                    if (!this._collideWithWalls(newX, this.y - offset)) {
                        this.x = newX;
                        this.y -= offset;
                        break;
                    } else if (!this._collideWithWalls(newX, this.y + offset)) {
                        this.x = newX;
                        this.y += offset;
                        break;
                    }
                }
            }

            // Check y-axis movement
            if (!this._collideWithWalls(this.x, newY)) {
                this.y = newY;
            } else {
                // Try to slide along walls on y-axis
                for (let offset = 1; offset <= this.radius; offset++) {
                    if (!this._collideWithWalls(this.x - offset, newY)) {
                        this.x -= offset;
                        this.y = newY;
                        break;
                    } else if (!this._collideWithWalls(this.x + offset, newY)) {
                        this.x += offset;
                        this.y = newY;
                        break;
                    }
                }
            }
            
            // Create wall collision dust if we hit a wall
            if (this.x !== newX || this.y !== newY) {
                this._createWallCollisionEffect();
            }
        } catch (error) {
            console.error("Error in player collision handling:", error);
        }
    }

    /**
     * Checks for collisions with walls
     * @param {number} x - Position to check X
     * @param {number} y - Position to check Y
     * @returns {boolean} True if collision detected
     * @private
     */
    _collideWithWalls(x, y) {
        try {
            const playerObj = {
                x: x,
                y: y,
                width: this.radius * 2,
                height: this.radius * 2
            };

            for (const wall of this.scene.maze) {
                if (checkCollision(
                    playerObj.x, playerObj.y, playerObj.width, playerObj.height,
                    wall.x, wall.y, wall.width, wall.height
                )) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error("Error checking wall collisions:", error);
            return false; // Safer to return false to avoid getting stuck
        }
    }
    
    /**
     * Creates dust particle effect when moving
     * @private
     */
    _createDustEffect() {
        try {
            if (!this.internalState.moving) return;
            
            // Create dust behind player in opposite direction of movement
            const dustX = this.x + this.radius - Math.cos(this.internalState.direction) * this.radius * 0.8;
            const dustY = this.y + this.radius - Math.sin(this.internalState.direction) * this.radius * 0.8;
            
            const size = Math.random() * 2 + 1;
            const dustParticle = this.scene.add.circle(dustX, dustY, size, 0xcccccc, 0.5);
            
            // Add to dust particles array for tracking
            this.dustParticles.push({
                sprite: dustParticle,
                life: 1.0,
                decay: 0.05
            });
            
            // Limit max number of particles
            if (this.dustParticles.length > 20) {
                const oldestParticle = this.dustParticles.shift();
                if (oldestParticle.sprite) {
                    oldestParticle.sprite.destroy();
                }
            }
            
            // Removed duplicate particle update code - now handled in _updateParticles
        } catch (error) {
            console.error("Error creating dust effect:", error);
        }
    }
    
    /**
     * Creates sprint trail effect when sprinting
     * @private
     */
    _createSprintTrailEffect() {
        try {
            if (!this.internalState.sprinting) return;
            
            // Create trail behind player in opposite direction of movement
            const trailX = this.x + this.radius - Math.cos(this.internalState.direction) * this.radius;
            const trailY = this.y + this.radius - Math.sin(this.internalState.direction) * this.radius;
            
            const size = this.radius * 0.8;
            const trailParticle = this.scene.add.circle(trailX, trailY, size, 0xaaddff, 0.3);
            
            // Add to sprint trail array for tracking
            this.sprintTrail.push({
                sprite: trailParticle,
                life: 1.0,
                decay: 0.1,
                size: size
            });
            
            // Limit max number of particles
            if (this.sprintTrail.length > 5) {
                const oldestParticle = this.sprintTrail.shift();
                if (oldestParticle.sprite) {
                    oldestParticle.sprite.destroy();
                }
            }
            
            // Removed duplicate particle update code - now handled in _updateParticles
        } catch (error) {
            console.error("Error creating sprint trail effect:", error);
        }
    }
    
    /**
     * Creates exhaustion effect when player gets tired
     * @private
     */
    _createExhaustionEffect() {
        try {
            // Create exhaustion particles around player
            for (let i = 0; i < 8; i++) {
                const angle = Math.PI * 2 * (i / 8);
                const particleX = this.x + this.radius + Math.cos(angle) * this.radius * 1.5;
                const particleY = this.y + this.radius + Math.sin(angle) * this.radius * 1.5;
                
                const size = 3;
                const particle = this.scene.add.circle(particleX, particleY, size, 0xff9999, 0.7);
                
                // Add to exhaustion particles array
                this.exhaustionParticles.push({
                    sprite: particle,
                    life: 1.0,
                    decay: 0.02,
                    angle: angle,
                    distance: this.radius * 1.5,
                    oscSpeed: 0.1 + Math.random() * 0.1
                });
            }
            
            // Removed manual update loop - now handled in _updateParticles
        } catch (error) {
            console.error("Error creating exhaustion effect:", error);
        }
    }
    
    /**
     * Creates wall collision effect when hitting walls
     * @private
     */
    _createWallCollisionEffect() {
        try {
            // Only create effect when moving at speed
            if (this.currentSpeed < this.baseSpeed * 0.5) return;
            
            // Create dust particles at collision point
            for (let i = 0; i < 3; i++) {
                const angle = this.internalState.direction + Math.PI + (Math.random() - 0.5);
                const distance = this.radius * 1.2;
                const particleX = this.x + this.radius + Math.cos(angle) * distance;
                const particleY = this.y + this.radius + Math.sin(angle) * distance;
                
                const size = Math.random() * 2 + 1;
                const particle = this.scene.add.circle(particleX, particleY, size, 0xdddddd, 0.6);
                
                // Add velocity for movement
                const vx = Math.cos(angle) * 0.5 + (Math.random() - 0.5) * 0.5;
                const vy = Math.sin(angle) * 0.5 + (Math.random() - 0.5) * 0.5;
                
                // Add to dust particles array
                this.dustParticles.push({
                    sprite: particle,
                    life: 1.0,
                    decay: 0.05 + Math.random() * 0.05,
                    vx: vx,
                    vy: vy
                });
            }
        } catch (error) {
            console.error("Error creating wall collision effect:", error);
        }
    }

    /**
     * Updates appearance of the player
     * @param {number} time - Current game time
     * @param {number} delta - Time since last frame in ms
     * @private
     */
    _updateVisuals(time, delta) {
        try {
            // Update container position
            this.container.setPosition(this.x + this.radius, this.y + this.radius);

            // Pulsing effect calculation
            this.lightProperties.pulseTime += this.lightProperties.pulseSpeed;
            const pulse = Math.sin(this.lightProperties.pulseTime) * this.lightProperties.pulseAmount + 
                          (1 - this.lightProperties.pulseAmount);

            // Update eye positions based on movement direction
            if (this.internalState.moving) {
                // Move pupils in direction of movement
                const eyeOffset = this.radius * this.animationProperties.eyeMovementAmount;
                const pupilDx = Math.cos(this.internalState.direction) * eyeOffset;
                const pupilDy = Math.sin(this.internalState.direction) * eyeOffset;

                this.leftPupil.setPosition(-this.radius * 0.3 + pupilDx, -this.radius * 0.2 + pupilDy);
                this.rightPupil.setPosition(this.radius * 0.3 + pupilDx, -this.radius * 0.2 + pupilDy);
            } else {
                // Reset pupils to center position
                this.leftPupil.setPosition(-this.radius * 0.3, -this.radius * 0.2);
                this.rightPupil.setPosition(this.radius * 0.3, -this.radius * 0.2);
            }

            // Animate antennas based on speed and direction
            if (this.internalState.moving) {
                const antennaAngle = Math.sin(this.lightProperties.pulseTime * 
                                    this.animationProperties.antennaWaveSpeed) * 
                                    this.animationProperties.antennaWaveAmount;

                // Left antenna
                this.leftAntenna.clear();
                this.leftAntenna.lineStyle(2, 0xffffff, 1);
                const leftAntennaEndX = -this.radius * 0.5 - 
                                      Math.cos(this.internalState.direction + antennaAngle) * 
                                      this.radius * 0.3;
                const leftAntennaEndY = -this.radius * 1.3 - 
                                      Math.sin(this.internalState.direction + antennaAngle) * 
                                      this.radius * 0.3;
                this.leftAntenna.lineBetween(
                    -this.radius * 0.3, -this.radius * 0.7, 
                    leftAntennaEndX, leftAntennaEndY
                );
                this.leftAntennaTip.setPosition(leftAntennaEndX, leftAntennaEndY);

                // Right antenna
                this.rightAntenna.clear();
                this.rightAntenna.lineStyle(2, 0xffffff, 1);
                const rightAntennaEndX = this.radius * 0.5 - 
                                       Math.cos(this.internalState.direction - antennaAngle) * 
                                       this.radius * 0.3;
                const rightAntennaEndY = -this.radius * 1.3 - 
                                       Math.sin(this.internalState.direction - antennaAngle) * 
                                       this.radius * 0.3;
                this.rightAntenna.lineBetween(
                    this.radius * 0.3, -this.radius * 0.7, 
                    rightAntennaEndX, rightAntennaEndY
                );
                this.rightAntennaTip.setPosition(rightAntennaEndX, rightAntennaEndY);
            }

            // Update mouth expression based on state
            if (this.internalState.tired) {
                this._updateMouth('sad');
            } else if (this.internalState.sprinting) {
                this._updateMouth('surprised');
            } else {
                this._updateMouth('happy');
            }

            // Update glow effect with pulsation
            this.bodyGlow.setAlpha(0.3 * pulse);

            // Update light position and size
            const lightX = this.x + this.radius;
            const lightY = this.y + this.radius;
            
            // Calculate effective light radius based on intensity
            const effectiveRadius = this.lightProperties.isOn ? 
                this.lightProperties.radius * (this.lightProperties.intensity / 100) : 
                MIN_LIGHT_RADIUS;

            // Determine light alpha based on light state
            const mainLightAlpha = this.lightProperties.isOn ? 0.4 * pulse : 0.15;
            const innerLightAlpha = this.lightProperties.isOn ? 0.3 * pulse : 0.1;
            const outerLightAlpha = this.lightProperties.isOn ? 0.15 * pulse : 0.05;

            // Update light layers
            this.lightSprite.setPosition(lightX, lightY);
            this.lightSprite.setRadius(effectiveRadius);
            this.lightSprite.setAlpha(mainLightAlpha);

            this.innerLightSprite.setPosition(lightX, lightY);
            this.innerLightSprite.setRadius(effectiveRadius * 0.6);
            this.innerLightSprite.setAlpha(innerLightAlpha);

            this.outerLightSprite.setPosition(lightX, lightY);
            this.outerLightSprite.setRadius(effectiveRadius * 1.2);
            this.outerLightSprite.setAlpha(outerLightAlpha);
        } catch (error) {
            console.error("Error updating player visuals:", error);
        }
    }

    /**
     * Toggle player light on/off
     */
    toggleLight() {
        try {
            this.lightProperties.isOn = !this.lightProperties.isOn;

            // Update light radius based on state
            if (this.lightProperties.isOn) {
                const maxLightRadius = typeof getMaxLightRadius === 'function' ? 
                    getMaxLightRadius(this.scene.currentLevel) : MAX_LIGHT_RADIUS;
                    
                this.lightProperties.radius = maxLightRadius;
                const effectiveRadius = this.lightProperties.radius * (this.lightProperties.intensity / 100);
                
                // Set all light sprites to new radius
                this.lightSprite.setRadius(effectiveRadius);
                this.innerLightSprite.setRadius(effectiveRadius * 0.6);
                this.outerLightSprite.setRadius(effectiveRadius * 1.2);
            } else {
                const minRadius = MIN_LIGHT_RADIUS || 30;
                
                // Set all light sprites to minimum radius
                this.lightSprite.setRadius(minRadius);
                this.innerLightSprite.setRadius(minRadius * 0.6);
                this.outerLightSprite.setRadius(minRadius * 1.2);
            }

            // Update UI light level indicator
            if (typeof this.scene.updateLightLevelUI === 'function') {
                this.scene.updateLightLevelUI(
                    this.lightProperties.isOn ? Math.floor(this.lightProperties.intensity) : 0
                );
            }
            
            // Add visual feedback for toggling light
            this._createLightToggleEffect();
        } catch (error) {
            console.error("Error toggling player light:", error);
        }
    }
    
    /**
     * Create visual effect when toggling light
     * @private
     */
    _createLightToggleEffect() {
        try {
            // Create ripple effect around player
            const ripple = this.scene.add.circle(
                this.x + this.radius, 
                this.y + this.radius, 
                this.lightProperties.radius * 0.8,
                this.lightProperties.isOn ? 0xffffdd : 0x555555,
                0.5
            );
            
            // Animate ripple
            this.scene.tweens.add({
                targets: ripple,
                radius: this.lightProperties.radius * 1.5,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    ripple.destroy();
                }
            });
        } catch (error) {
            console.error("Error creating light toggle effect:", error);
        }
    }

    /**
     * Activate flashlight ability
     */
    activateFlashlight() {
        try {
            // Skip if flashlight is already active
            if (this.flashlightProperties.active) return;
            
            // Check cooldown
            const currentTime = this.scene.time.now;
            if (currentTime - this.flashlightProperties.lastUseTime < this.flashlightProperties.cooldown) {
                // Create visual feedback for cooldown
                this._createFlashlightCooldownEffect();
                return;
            }
            
            // Activate flashlight
            this.flashlightProperties.active = true;
            this.flashlightProperties.endTime = currentTime + this.flashlightProperties.duration;
            this.flashlightProperties.lastUseTime = currentTime;

            // Create flashlight sprite
            this._createFlashlightSprite();

            // Stun enemies in flashlight range
            this._stunEnemiesInFlashlightRange();
            
            // Create activation effect
            this._createFlashlightActivationEffect();
        } catch (error) {
            console.error("Error activating flashlight:", error);
        }
    }

    /**
     * Update flashlight state and visuals
     * @param {number} time - Current game time
     * @private
     */
    _updateFlashlight(time) {
        try {
            // Check if flashlight should turn off
            if (this.flashlightProperties.active && time >= this.flashlightProperties.endTime) {
                this.flashlightProperties.active = false;

                // Remove flashlight sprite
                if (this.flashlightProperties.sprite) {
                    this.flashlightProperties.sprite.destroy();
                    this.flashlightProperties.sprite = null;
                }
            }

            // Update flashlight position if active
            if (this.flashlightProperties.active && this.flashlightProperties.sprite) {
                this._updateFlashlightSprite();
            }
        } catch (error) {
            console.error("Error updating flashlight:", error);
        }
    }

    /**
     * Create flashlight visual effect
     * @private
     */
    _createFlashlightSprite() {
        try {
            const centerX = this.x + this.radius;
            const centerY = this.y + this.radius;

            // Remove existing flashlight sprite
            if (this.flashlightProperties.sprite) {
                this.flashlightProperties.sprite.destroy();
            }

            // Create new graphics object for flashlight
            this.flashlightProperties.sprite = this.scene.add.graphics();

            // Define angles for flashlight cone
            const startAngle = this.internalState.direction - this.flashlightProperties.angle / 2;
            const endAngle = this.internalState.direction + this.flashlightProperties.angle / 2;

            // Draw multi-layered flashlight effect for better visuals
            // Inner bright core
            this.flashlightProperties.sprite.fillStyle(0xffffcc, 0.9);
            this.flashlightProperties.sprite.beginPath();
            this.flashlightProperties.sprite.moveTo(centerX, centerY);

            // Draw smooth arc with multiple points
            const steps = 25;
            const shortRadius = this.flashlightProperties.range * 0.1;

            for (let i = 0; i <= steps; i++) {
                const angle = startAngle + (endAngle - startAngle) * (i / steps);
                const x = centerX + Math.cos(angle) * shortRadius;
                const y = centerY + Math.sin(angle) * shortRadius;
                this.flashlightProperties.sprite.lineTo(x, y);
            }
            this.flashlightProperties.sprite.closePath();
            this.flashlightProperties.sprite.fill();

            // Medium intensity layer
            this.flashlightProperties.sprite.fillStyle(0xffffaa, 0.6);
            this.flashlightProperties.sprite.beginPath();
            this.flashlightProperties.sprite.moveTo(centerX, centerY);

            const mediumRadius = this.flashlightProperties.range * 0.5;
            for (let i = 0; i <= steps; i++) {
                const angle = startAngle + (endAngle - startAngle) * (i / steps);
                const x = centerX + Math.cos(angle) * mediumRadius;
                const y = centerY + Math.sin(angle) * mediumRadius;
                this.flashlightProperties.sprite.lineTo(x, y);
            }
            this.flashlightProperties.sprite.closePath();
            this.flashlightProperties.sprite.fill();

            // Outer glow layer
            this.flashlightProperties.sprite.fillStyle(0xffff88, 0.3);
            this.flashlightProperties.sprite.beginPath();
            this.flashlightProperties.sprite.moveTo(centerX, centerY);

            for (let i = 0; i <= steps; i++) {
                const angle = startAngle + (endAngle - startAngle) * (i / steps);
                const x = centerX + Math.cos(angle) * this.flashlightProperties.range;
                const y = centerY + Math.sin(angle) * this.flashlightProperties.range;
                this.flashlightProperties.sprite.lineTo(x, y);
            }
            this.flashlightProperties.sprite.closePath();
            this.flashlightProperties.sprite.fill();

            // Add light rays for realism
            this.flashlightProperties.sprite.lineStyle(1, 0xffffdd, 0.2);
            for (let i = 0; i <= 5; i++) {
                const rayAngle = startAngle + (endAngle - startAngle) * (i / 5);
                this.flashlightProperties.sprite.beginPath();
                this.flashlightProperties.sprite.moveTo(centerX, centerY);
                const rayX = centerX + Math.cos(rayAngle) * this.flashlightProperties.range;
                const rayY = centerY + Math.sin(rayAngle) * this.flashlightProperties.range;
                this.flashlightProperties.sprite.lineTo(rayX, rayY);
                this.flashlightProperties.sprite.strokePath();
            }
        } catch (error) {
            console.error("Error creating flashlight sprite:", error);
        }
    }

    /**
     * Update flashlight position and direction
     * @private
     */
    _updateFlashlightSprite() {
        // Simply recreate the sprite with updated position and direction
        this._createFlashlightSprite();
    }

    /**
     * Stun enemies in flashlight range
     * @private
     */
    _stunEnemiesInFlashlightRange() {
        try {
            if (!this.scene.enemies) return;
            
            this.scene.enemies.forEach(enemy => {
                // Calculate distance and angle to enemy
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distanceToEnemy = Math.sqrt(dx * dx + dy * dy);

                if (distanceToEnemy <= this.flashlightProperties.range) {
                    const angleToEnemy = Math.atan2(dy, dx);

                    // Calculate angle difference
                    let angleDiff = angleToEnemy - this.internalState.direction;
                    // Normalize angle to -PI to PI
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    // Check if enemy is within flashlight cone
                    if (Math.abs(angleDiff) <= this.flashlightProperties.angle / 2) {
                        // Stun the enemy
                        const stunDuration = ENEMY_STUN_DURATION || 2000;
                        enemy.stun(this.scene.time.now + stunDuration);
                    }
                }
            });
        } catch (error) {
            console.error("Error stunning enemies with flashlight:", error);
        }
    }
    
    /**
     * Create flashlight activation effect
     * @private
     */
    _createFlashlightActivationEffect() {
        try {
            // Flash effect
            const flash = this.scene.add.circle(
                this.x + this.radius, 
                this.y + this.radius, 
                this.radius * 10,
                0xffffdd,
                0.5
            );
            
            // Animate flash
            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                radius: this.radius * 15,
                duration: 300,
                onComplete: () => {
                    flash.destroy();
                }
            });
        } catch (error) {
            console.error("Error creating flashlight activation effect:", error);
        }
    }
    
    /**
     * Create flashlight cooldown visual feedback
     * @private
     */
    _createFlashlightCooldownEffect() {
        try {
            // Calculate remaining cooldown
            const currentTime = this.scene.time.now;
            const elapsedTime = currentTime - this.flashlightProperties.lastUseTime;
            const remainingTime = this.flashlightProperties.cooldown - elapsedTime;
            const cooldownPercent = remainingTime / this.flashlightProperties.cooldown;
            
            // Create cooldown indicator
            const cooldownArc = this.scene.add.graphics();
            cooldownArc.setPosition(this.x + this.radius, this.y + this.radius);
            
            // Draw cooldown arc
            cooldownArc.clear();
            cooldownArc.lineStyle(3, 0xff9900, 0.8);
            cooldownArc.beginPath();
            
            // Draw arc showing remaining cooldown
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (Math.PI * 2 * cooldownPercent);
            cooldownArc.arc(0, 0, this.radius * 1.5, startAngle, endAngle, false);
            cooldownArc.strokePath();
            
            // Add text showing seconds
            const remainingSeconds = Math.ceil(remainingTime / 1000);
            const cooldownText = this.scene.add.text(
                this.x + this.radius, 
                this.y + this.radius - this.radius * 2,
                `${remainingSeconds}s`,
                {
                    font: '14px Arial',
                    fill: '#ffffff',
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            ).setOrigin(0.5);
            
            // Fade out after a short time
            this.scene.tweens.add({
                targets: [cooldownArc, cooldownText],
                alpha: 0,
                duration: 800,
                onComplete: () => {
                    cooldownArc.destroy();
                    cooldownText.destroy();
                }
            });
        } catch (error) {
            console.error("Error creating flashlight cooldown effect:", error);
        }
    }

    /**
     * Check for collisions with crystals
     * @private
     */
    _checkCrystalCollisions() {
        try {
            if (!this.scene.crystals) return;
            
            for (let i = 0; i < this.scene.crystals.length; i++) {
                const crystal = this.scene.crystals[i];

                if (!crystal.collected) {
                    const distance = calculateDistance(
                        this.x + this.radius, this.y + this.radius,
                        crystal.x, crystal.y
                    );

                    if (distance < this.radius + crystal.radius) {
                        // Collect crystal
                        crystal.collect();
                        this.gameProperties.crystalsCollected++;
                        this.gameProperties.score += crystal.points;

                        // Create collection effect
                        this._createCrystalCollectionEffect(crystal);

                        // Update UI
                        if (typeof this.scene.updateCrystalsUI === 'function') {
                            this.scene.updateCrystalsUI(this.gameProperties.crystalsCollected);
                        }
                        
                        if (typeof this.scene.updateScoreUI === 'function') {
                            this.scene.updateScoreUI(this.gameProperties.score);
                        }

                        // Check if level is complete
                        if (this.gameProperties.crystalsCollected >= this.scene.requiredCrystals) {
                            this.scene.nextLevel();
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error checking crystal collisions:", error);
        }
    }
    
    /**
     * Create effect when collecting a crystal
     * @param {object} crystal - The collected crystal
     * @private
     */
    _createCrystalCollectionEffect(crystal) {
        try {
            // Create spark particles
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.5 + Math.random() * 1.5;
                const distance = crystal.radius * 2;
                
                const sparkX = crystal.x + Math.cos(angle) * distance;
                const sparkY = crystal.y + Math.sin(angle) * distance;
                
                const size = Math.random() * 2 + 1;
                const spark = this.scene.add.circle(sparkX, sparkY, size, 0x64c8ff, 0.8);
                
                // Add velocity
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                
                // Animate particles
                this.scene.tweens.add({
                    targets: spark,
                    x: spark.x + vx * 50,
                    y: spark.y + vy * 50,
                    alpha: 0,
                    duration: 500 + Math.random() * 500,
                    onComplete: () => {
                        spark.destroy();
                    }
                });
            }
            
            // Create glow flash
            const flash = this.scene.add.circle(crystal.x, crystal.y, crystal.radius * 5, 0x64c8ff, 0.5);
            
            // Animate flash
            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                radius: crystal.radius * 10,
                duration: 400,
                onComplete: () => {
                    flash.destroy();
                }
            });
            
            // Show points text
            const pointsText = this.scene.add.text(
                crystal.x, 
                crystal.y - 20,
                `+${crystal.points}`,
                {
                    font: '16px Arial',
                    fill: '#ffffff',
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            ).setOrigin(0.5);
            
            // Animate points text
            this.scene.tweens.add({
                targets: pointsText,
                y: pointsText.y - 40,
                alpha: 0,
                duration: 1000,
                onComplete: () => {
                    pointsText.destroy();
                }
            });
        } catch (error) {
            console.error("Error creating crystal collection effect:", error);
        }
    }
    
    /**
     * Update mouth appearance based on expression
     * @param {string} expression - Type of expression: 'happy', 'sad', or 'surprised'
     * @private
     */
    _updateMouth(expression) {
        try {
            this.mouth.clear();
            
            switch (expression) {
                case 'happy':
                    this.mouth.lineStyle(2, 0x000000, 1);
                    this.mouth.beginPath();
                    this.mouth.arc(0, this.radius * 0.3, this.radius * 0.3, 0.1, Math.PI - 0.1, false);
                    this.mouth.strokePath();
                    break;
                    
                case 'sad':
                    this.mouth.lineStyle(2, 0x000000, 1);
                    this.mouth.beginPath();
                    this.mouth.arc(0, this.radius * 0.5, this.radius * 0.3, Math.PI + 0.1, Math.PI * 2 - 0.1, false);
                    this.mouth.strokePath();
                    break;
                    
                case 'surprised':
                    this.mouth.fillStyle(0x000000, 1);
                    this.mouth.fillCircle(0, this.radius * 0.3, this.radius * 0.15);
                    break;
                    
                default:
                    // Default to happy expression
                    this.mouth.lineStyle(2, 0x000000, 1);
                    this.mouth.beginPath();
                    this.mouth.arc(0, this.radius * 0.3, this.radius * 0.3, 0.1, Math.PI - 0.1, false);
                    this.mouth.strokePath();
            }
        } catch (error) {
            console.error("Error updating mouth expression:", error);
        }
    }
    
    /**
     * Initialize blinking animation
     * @private
     */
    _resetBlinkTimer() {
        try {
            const blinkIntervalMin = this.animationProperties.blinkInterval.min;
            const blinkIntervalMax = this.animationProperties.blinkInterval.max;
            
            // Set random time for next blink
            this.animationProperties.nextBlinkTime = this.scene.time.now + 
                blinkIntervalMin + Math.random() * (blinkIntervalMax - blinkIntervalMin);
        } catch (error) {
            console.error("Error resetting blink timer:", error);
        }
    }
    
    /**
     * Update eyelid graphics for blinking
     * @param {boolean} isBlinking - Whether eyes are currently blinking
     * @private
     */
    _updateEyelids(isBlinking) {
        try {
            // Clear previous eyelids
            this.leftEyelid.clear();
            this.rightEyelid.clear();
            
            // Skip drawing if not blinking
            if (!isBlinking) return;
            
            // Draw eyelids covering eyes
            this.leftEyelid.fillStyle(0xffffff, 1);
            this.leftEyelid.fillRect(
                -this.radius * 0.3 - this.radius * 0.25,
                -this.radius * 0.2 - this.radius * 0.25,
                this.radius * 0.5,
                this.radius * 0.5
            );
            
            this.rightEyelid.fillStyle(0xffffff, 1);
            this.rightEyelid.fillRect(
                this.radius * 0.3 - this.radius * 0.25,
                -this.radius * 0.2 - this.radius * 0.25,
                this.radius * 0.5,
                this.radius * 0.5
            );
        } catch (error) {
            console.error("Error updating eyelids:", error);
        }
    }
    
    /**
     * Update blinking animation
     * @param {number} time - Current game time
     * @private
     */
    _updateBlinking(time) {
        try {
            // Check if it's time to blink
            if (!this.animationProperties.isBlinking && time >= this.animationProperties.nextBlinkTime) {
                // Start blinking
                this.animationProperties.isBlinking = true;
                this.animationProperties.lastBlinkTime = time;
                this._updateEyelids(true);
                
                // Set timer to end blink
                setTimeout(() => {
                    this.animationProperties.isBlinking = false;
                    this._updateEyelids(false);
                    this._resetBlinkTimer();
                }, this.animationProperties.blinkDuration);
            }
        } catch (error) {
            console.error("Error updating blinking animation:", error);
        }
    }

    /**
     * Reset player for new level
     * @param {number} x - New x position
     * @param {number} y - New y position
     */
    resetForNewLevel(x, y) {
        try {
            // Reset position
            this.x = x;
            this.y = y;

            // Reset movement variables
            this.currentSpeed = this.baseSpeed;
            this.internalState.sprinting = false;
            this.internalState.tired = false;
            this.internalState.moving = false;

            // Reset light - adjust for level difficulty
            const maxLightRadius = typeof getMaxLightRadius === 'function' ? 
                getMaxLightRadius(this.scene.currentLevel) : MAX_LIGHT_RADIUS;
                
            this.lightProperties.radius = maxLightRadius;
            this.lightProperties.intensity = 100;
            this.lightProperties.isOn = true;

            // Reset flashlight
            this.flashlightProperties.active = false;
            if (this.flashlightProperties.sprite) {
                this.flashlightProperties.sprite.destroy();
                this.flashlightProperties.sprite = null;
            }

            // Reset crystal count for THIS level, but keep total score
            this.gameProperties.crystalsCollected = 0;

            // Reset stamina
            this.internalState.stamina = MAX_STAMINA;

            // Update UI for the new level
            if (typeof this.scene.updateLightLevelUI === 'function') {
                this.scene.updateLightLevelUI(100);
            }
            
            if (typeof this.scene.updateStaminaUI === 'function') {
                this.scene.updateStaminaUI(this.internalState.stamina, false);
            }
            
            if (typeof this.scene.updateCrystalsUI === 'function') {
                this.scene.updateCrystalsUI(0);
            }

            // Reset facial expression
            this._updateMouth('happy');

            // Update player position
            this.container.setPosition(this.x + this.radius, this.y + this.radius);
            this.lightSprite.setPosition(this.x + this.radius, this.y + this.radius);
            this.innerLightSprite.setPosition(this.x + this.radius, this.y + this.radius);
            this.outerLightSprite.setPosition(this.x + this.radius, this.y + this.radius);
            
            // Clean up any effects
            this._cleanupEffects();
            
            // Log level reset
            console.log("Player reset for level", this.scene.currentLevel, "with light radius", this.lightProperties.radius);
        } catch (error) {
            console.error("Error resetting player for new level:", error);
        }
    }
    
    /**
     * Clean up all particle effects
     * @private
     */
    _cleanupEffects() {
        try {
            // Clean up dust particles
            this.dustParticles.forEach(particle => {
                if (particle.sprite) particle.sprite.destroy();
            });
            this.dustParticles = [];
            
            // Clean up sprint trail
            this.sprintTrail.forEach(particle => {
                if (particle.sprite) particle.sprite.destroy();
            });
            this.sprintTrail = [];
            
            // Clean up exhaustion particles
            this.exhaustionParticles.forEach(particle => {
                if (particle.sprite) particle.sprite.destroy();
            });
            this.exhaustionParticles = [];
        } catch (error) {
            console.error("Error cleaning up effects:", error);
        }
    }

    /**
     * Clean up all player resources when destroyed
     */
    destroy() {
        try {
            // Stop any active tweens
            if (this.scene.tweens) {
                this.scene.tweens.killTweensOf(this.container);
                this.scene.tweens.killTweensOf(this.lightSprite);
                this.scene.tweens.killTweensOf(this.innerLightSprite);
                this.scene.tweens.killTweensOf(this.outerLightSprite);
            }
            
            // Clean up all particle effects
            this._cleanupEffects();
            
            // Destroy container and all its children
            if (this.container) this.container.destroy();
            
            // Destroy light sprites
            if (this.lightSprite) this.lightSprite.destroy();
            if (this.innerLightSprite) this.innerLightSprite.destroy();
            if (this.outerLightSprite) this.outerLightSprite.destroy();
            
            // Destroy flashlight
            if (this.flashlightProperties.sprite) this.flashlightProperties.sprite.destroy();
            
            console.log("Player resources cleaned up");
        } catch (error) {
            console.error("Error destroying player:", error);
        }
    }
}