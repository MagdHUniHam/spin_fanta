// Add a global variable to track if we have permission
let hasMotionPermission = false;

class FantaGame {
    constructor() {
        this.canContainer = document.getElementById('canContainer');
        this.beam = document.getElementById('beam');
        this.livesElement = document.getElementById('lives');
        this.hitsElement = document.getElementById('hits');
        this.messageElement = document.getElementById('message');
        this.targetZone = document.getElementById('targetZone');
        
        this.rotation = 0;
        this.speed = 5.4; // Reduced from 6 (10% slower)
        this.lives = 3; // Increased from 2 to 3
        this.hits = 0;
        this.isGameOver = false;
        this.lastTiltTime = 0;
        this.lastLifeLossTime = 0; // Add tracking for life loss timing
        this.tiltCooldown = 200; // Reduced from 300ms to 200ms for quicker response
        this.isFirstClick = true;
        this.baseOrientation = null;
        this.useFallback = false;
        this.tiltThreshold = 15; // New variable for tilt sensitivity
        
        this.setupGame();
    }

    setupGame() {
        // Only check if DeviceOrientationEvent is not supported at all
        if (typeof DeviceOrientationEvent === 'undefined') {
            this.useFallback = true;
        }

        this.showMessage(
            'Welcome to Fanta Spin!',
            'Hold your phone in a comfortable position and tap anywhere to start.<br><br>Tilt your phone forward when the beam hits the target!',
            false
        );

        // Only add touch/click controls for the first tap to start
        document.addEventListener('touchstart', () => {
            if (this.isFirstClick) {
                this.handleFirstClick();
            }
        });

        document.addEventListener('click', () => {
            if (this.isFirstClick) {
                this.handleFirstClick();
            }
        });
    }

    async handleFirstClick() {
        if (!this.isFirstClick) return;
        this.isFirstClick = false;
        this.messageElement.style.display = 'none';
        
        try {
            // Special handling for iOS
            if (typeof DeviceOrientationEvent !== 'undefined' && 
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission === 'granted') {
                        this.startGame();
                    } else {
                        this.showPermissionMessage();
                    }
                } catch (error) {
                    this.showPermissionMessage();
                }
            } else {
                // For non-iOS devices, just start
                this.startGame();
            }
        } catch (error) {
            console.log('Motion sensor error:', error);
            this.showPermissionMessage();
        }
    }

    showPermissionMessage() {
        this.showMessage(
            'Motion Access Needed',
            `Please follow these steps:<br>
            1. Open iPhone Settings<br>
            2. Go to Safari Settings<br>
            3. Tap "Settings for Websites"<br>
            4. Tap "Motion & Orientation Access"<br>
            5. Enable the toggle<br>
            6. Return here and tap retry`,
            true,
            () => {
                location.reload();
            }
        );
    }

    startGame() {
        let hasReceivedSensorData = false;

        window.addEventListener('deviceorientation', (e) => {
            // Mark that we've received sensor data
            if (!hasReceivedSensorData && (e.beta !== null || e.gamma !== null)) {
                hasReceivedSensorData = true;
            }

            // Initialize base orientation on first valid reading
            if (this.baseOrientation === null && hasReceivedSensorData) {
                this.baseOrientation = {
                    beta: e.beta || 0,
                    gamma: e.gamma || 0
                };
                return;
            }

            // Only handle tilt if we have valid sensor data
            if (hasReceivedSensorData) {
                this.handleTilt(e);
            }
        }, { frequency: 60 });

        // Start the game loop immediately
        this.gameLoop();
        
        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
    }

    handleTilt(event) {
        if (this.isGameOver || !this.baseOrientation) return;
        
        const now = Date.now();
        if (now - this.lastTiltTime < this.tiltCooldown) return;

        const currentBeta = event.beta || 0;
        
        // Only check forward tilt (beta) - like drinking motion
        const deltaBeta = currentBeta - this.baseOrientation.beta;
        
        // More forgiving tilt detection
        if (deltaBeta > 8) {  // Reduced from 15 to 8 degrees for easier tilting
            this.lastTiltTime = now;
            this.checkBeamPosition();
            
            // Update base orientation more gradually
            this.baseOrientation = {
                beta: this.baseOrientation.beta * 0.8 + currentBeta * 0.2,
                gamma: event.gamma || 0
            };
        }
    }

    checkBeamPosition() {
        if (this.isGameOver) return;

        // Add protection against rapid life loss
        const now = Date.now();
        if (now - this.lastTiltTime < this.tiltCooldown) return;
        
        const normalizedRotation = ((this.rotation % 360) + 360) % 360;
        // Hit zone at the top (150 degrees total, centered at top)
        const isInTargetZone = normalizedRotation >= 285 || normalizedRotation <= 75;

        if (isInTargetZone) {
            this.hits++;
            this.hitsElement.textContent = this.hits;
            
            // Visual feedback
            this.beam.style.backgroundColor = '#00FF00';
            setTimeout(() => {
                this.beam.style.background = 'linear-gradient(to top, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.2))';
            }, 300);
            
            if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
            }
            
            if (this.hits >= 5) {
                this.gameOver(true);
            }
        } else {
            // Add cooldown for life loss
            if (now - this.lastLifeLossTime < 1000) return; // Prevent losing lives too quickly
            this.lastLifeLossTime = now;
            
            this.lives--;
            this.livesElement.textContent = this.lives;
            
            // Visual feedback
            this.beam.style.backgroundColor = '#FF0000';
            setTimeout(() => {
                this.beam.style.background = 'linear-gradient(to top, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.2))';
            }, 300);
            
            if ('vibrate' in navigator) {
                navigator.vibrate(500);
            }
            
            if (this.lives <= 0) {
                this.gameOver(false);
            }
        }
    }

    showMessage(title, text, showReload = false, onRetry = null) {
        this.messageElement.style.display = 'block';
        let buttonStyle = `
            style="
                background-color: #FF4500;
                border: none;
                color: white;
                padding: 15px 30px;
                border-radius: 25px;
                font-size: 18px;
                margin-top: 20px;
                cursor: pointer;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                transition: transform 0.2s;
            "
            onmouseover="this.style.transform='scale(1.05)'"
            onmouseout="this.style.transform='scale(1)'"
        `;
        
        this.messageElement.innerHTML = `
            <h2 style="color: ${title.includes('Game Over') ? '#FF4500' : 'white'}; 
                       font-size: ${title.includes('Game Over') ? '32px' : '24px'};
                       margin-bottom: 20px;">${title}</h2>
            <p style="font-size: 18px; line-height: 1.5;">${text}</p>
            ${showReload ? `<button onclick="window.retryGame()" ${buttonStyle}>Try Again</button>` : ''}
        `;

        // Set up the retry function
        window.retryGame = () => {
            this.messageElement.style.display = 'none';
            if (onRetry) {
                onRetry();
            }
        };
    }

    gameOver(isWinner) {
        this.isGameOver = true;
        
        if (isWinner) {
            this.showMessage(
                '🎉 Congratulations! 🎉',
                'You\'ve successfully hit the target 5 times!<br><br>Your code is: <strong>winner</strong>',
                true,
                () => {
                    // Start a new game without requesting permission again
                    new FantaGame();
                }
            );
            if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100, 50, 200]);
            }
        } else {
            this.showMessage(
                'Game Over',
                'You ran out of lives!<br>Remember to hit only when the beam aligns with the target!',
                true,
                () => {
                    // Start a new game without requesting permission again
                    new FantaGame();
                }
            );
            if ('vibrate' in navigator) {
                navigator.vibrate([500, 100, 500]);
            }
        }
    }

    gameLoop() {
        if (!this.isGameOver) {
            this.rotation = (this.rotation + this.speed) % 360;
            this.canContainer.style.transform = `translate(-50%, -50%) rotate(${this.rotation}deg)`;
        }
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    requestMotionPermission();
});

async function requestMotionPermission() {
    // If we already have permission, start the game directly
    if (hasMotionPermission) {
        new FantaGame();
        return;
    }

    // Try to request permission on iOS
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        
        // Add a button to request permission
        const permissionButton = document.createElement('button');
        permissionButton.innerHTML = 'Tap to Enable Motion Controls';
        permissionButton.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #FF4500;
            border: none;
            color: white;
            padding: 20px 40px;
            border-radius: 25px;
            font-size: 18px;
            cursor: pointer;
            z-index: 1000;
        `;
        
        document.body.appendChild(permissionButton);
        
        permissionButton.addEventListener('click', async () => {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    hasMotionPermission = true;
                    permissionButton.remove();
                    new FantaGame();
                } else {
                    alert('Please enable motion sensors in Safari settings to play the game.');
                }
            } catch (error) {
                console.error('Error requesting permission:', error);
                alert('Error requesting motion permission. Please check your Safari settings.');
            }
        });
    } else {
        // Non-iOS device, start game directly
        hasMotionPermission = true;
        new FantaGame();
    }
} 
