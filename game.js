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
        this.tiltCooldown = 200; // Reduced from 300ms to 200ms for quicker response
        this.isFirstClick = true;
        this.baseOrientation = null;
        this.useFallback = false;
        this.tiltThreshold = 15; // New variable for tilt sensitivity
        
        this.setupGame();
    }

    setupGame() {
        // Check if device orientation is supported
        if (!window.DeviceOrientationEvent) {
            this.useFallback = true;
        }

        this.showMessage(
            'Welcome to Fanta Spin!',
            this.useFallback ? 
                'Tap the screen or press SPACE to play!<br><br>Hit the target when the beam aligns!' :
                'Hold your phone in a comfortable position and tap anywhere to start.<br><br>Tilt your phone forward when the beam hits the target!',
            false
        );

        // Add keyboard controls for desktop testing
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.checkBeamPosition();
            }
        });

        // Add touch controls
        document.addEventListener('touchstart', () => {
            if (this.isFirstClick) {
                this.handleFirstClick();
            } else if (this.useFallback) {
                this.checkBeamPosition();
            }
        });

        // Add click for desktop
        document.addEventListener('click', () => {
            if (this.isFirstClick) {
                this.handleFirstClick();
            } else if (this.useFallback) {
                this.checkBeamPosition();
            }
        });
    }

    async handleFirstClick() {
        if (!this.isFirstClick) return;
        this.isFirstClick = false;
        this.messageElement.style.display = 'none';
        
        if (!this.useFallback) {
            try {
                if (typeof DeviceOrientationEvent !== 'undefined' && 
                    typeof DeviceOrientationEvent.requestPermission === 'function') {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission === 'granted') {
                        this.startGame();
                    } else {
                        this.useFallback = true;
                        this.startGame();
                    }
                } else {
                    this.startGame();
                }
            } catch (error) {
                console.log('Motion sensor error, using fallback:', error);
                this.useFallback = true;
                this.startGame();
            }
        } else {
            this.startGame();
        }
    }

    startGame() {
        if (!this.useFallback) {
            window.addEventListener('deviceorientation', (e) => {
                if (this.baseOrientation === null) {
                    this.baseOrientation = {
                        beta: e.beta || 0,
                        gamma: e.gamma || 0
                    };
                    return;
                }
                this.handleTilt(e);
            }, { frequency: 60 }); // Add higher frequency updates
        }

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
        
        // More sensitive tilt detection
        if (deltaBeta > 5) {  // Reduced from 10 to 5 degrees for much easier tilting
            this.lastTiltTime = now;
            this.checkBeamPosition();
            
            // Gradually update base orientation for smoother detection
            this.baseOrientation = {
                beta: this.baseOrientation.beta * 0.7 + currentBeta * 0.3, // Smooth transition
                gamma: event.gamma || 0
            };
        }
    }

    checkBeamPosition() {
        if (this.isGameOver) return;
        
        const normalizedRotation = ((this.rotation % 360) + 360) % 360;
        // Hit zone at the top (150 degrees total, centered at top)
        const isInTargetZone = normalizedRotation >= 285 || normalizedRotation <= 75;

        if (isInTargetZone) {
            this.hits++;
            this.hitsElement.textContent = this.hits;
            
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
            this.lives--;
            this.livesElement.textContent = this.lives;
            
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

    showMessage(title, text, showReload = false) {
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
            ${showReload ? `<button onclick="location.reload()" ${buttonStyle}>Try Again</button>` : ''}
        `;
    }

    gameOver(isWinner) {
        this.isGameOver = true;
        
        if (isWinner) {
            this.showMessage(
                '🎉 Congratulations! 🎉',
                'You\'ve successfully hit the target 5 times!<br><br>Your code is: <strong>winner</strong>',
                true
            );
            if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100, 50, 200]);
            }
        } else {
            this.showMessage(
                'Game Over',
                'You ran out of lives!<br>Remember to hit only when the beam aligns with the target!',
                true
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
    new FantaGame();
}); 
