class FantaGame {
    constructor() {
        this.can = document.getElementById('can');
        this.beam = document.getElementById('beam');
        this.livesElement = document.getElementById('lives');
        this.hitsElement = document.getElementById('hits');
        this.messageElement = document.getElementById('message');
        
        this.rotation = 0;
        this.speed = 6; // Fast rotation speed
        this.lives = 5;
        this.hits = 0;
        this.isGameOver = false;
        this.lastTiltTime = 0;
        this.tiltCooldown = 500; // Quick cooldown for harder gameplay
        this.isFirstClick = true;
        this.baseOrientation = null;
        
        this.setupGame();
    }

    setupGame() {
        this.showMessage(
            'Welcome to Fanta Spin!',
            'Hold your phone in a comfortable position and tap anywhere to start.<br><br>Tilt your phone forward when the beam hits the target!',
            false
        );

        document.body.addEventListener('click', () => this.handleFirstClick(), { once: true });
    }

    async handleFirstClick() {
        this.messageElement.style.display = 'none';
        
        try {
            if (typeof DeviceOrientationEvent !== 'undefined' && 
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    this.startGame();
                } else {
                    this.showMessage(
                        'Permission Denied',
                        'Please allow motion sensors to play the game.',
                        true
                    );
                }
            } else {
                this.startGame();
            }
        } catch (error) {
            this.showMessage(
                'Error',
                'Could not access motion sensors. Please try again.',
                true
            );
        }
    }

    startGame() {
        setTimeout(() => {
            window.addEventListener('deviceorientation', (e) => {
                if (this.baseOrientation === null) {
                    this.baseOrientation = {
                        beta: e.beta || 0,
                        gamma: e.gamma || 0
                    };
                }
                this.handleTilt(e);
            });
        }, 500);

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
        const deltaBeta = currentBeta - this.baseOrientation.beta;
        
        const tiltThreshold = 20;
        if (deltaBeta > tiltThreshold) {
            this.lastTiltTime = now;
            this.checkBeamPosition();
            
            this.baseOrientation = {
                beta: currentBeta,
                gamma: event.gamma || 0
            };
        }
    }

    checkBeamPosition() {
        // The target zone is at the top (between 350 and 10 degrees for a narrower window)
        const normalizedRotation = ((this.rotation % 360) + 360) % 360;
        const isInTargetZone = normalizedRotation > 350 || normalizedRotation < 10;

        if (isInTargetZone) {
            this.hits++;
            this.hitsElement.textContent = this.hits;
            
            // Success feedback
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
            
            // Failure feedback
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
                'You ran out of lives!<br>Remember to tilt only when the beam hits the target!',
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
            
            // Rotate both can and beam
            this.can.style.transform = `rotate(${this.rotation}deg)`;
            this.beam.style.transform = `translateX(-50%) rotate(${this.rotation}deg)`;
        }
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new FantaGame();
}); 
