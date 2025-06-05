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
        this.speed = 5.4;
        this.lives = 3;
        this.hits = 0;
        this.isGameOver = false;
        this.lastTiltTime = 0;
        this.lastLifeLossTime = 0;
        this.tiltCooldown = 200;
        this.isFirstClick = true;
        this.baseOrientation = null;
        this.useFallback = false;
        this.isTilting = false;
        this.tiltStartRotation = null;
        this.lastBeta = null;
        this.recentBetas = [];
        
        this.resetGame();
        this.setupGame();
    }

    resetGame() {
        this.rotation = 0;
        this.speed = 5.4;
        this.lives = 3;
        this.hits = 0;
        this.isGameOver = false;
        this.lastTiltTime = 0;
        this.lastLifeLossTime = 0;
        this.tiltCooldown = 200;
        this.isFirstClick = true;
        this.baseOrientation = null;
        this.useFallback = false;
        this.isTilting = false;
        this.tiltStartRotation = null;
        this.lastBeta = null;
        this.recentBetas = [];

        this.livesElement.textContent = this.lives;
        this.hitsElement.textContent = this.hits;
    }

    setupGame() {
        this.showMessage(
            'Welcome to Fanta Spin!',
            'Hold your phone in a comfortable position and tap anywhere to start.<br><br>Tilt your phone forward when the beam hits the target!',
            false
        );

        const startHandler = () => {
            if (this.isFirstClick) {
                this.handleFirstClick();
            }
        };

        document.addEventListener('touchstart', startHandler);
        document.addEventListener('click', startHandler);
    }

    async handleFirstClick() {
        if (!this.isFirstClick) return;
        this.isFirstClick = false;
        this.messageElement.style.display = 'none';
        
        try {
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
            'Please enable motion sensors in your browser settings and tap retry.',
            true,
            () => {
                location.reload();
            }
        );
    }

    startGame() {
        window.addEventListener('deviceorientation', (e) => {
            if (!e.beta && e.beta !== 0) {
                this.showMessage(
                    'Sensor Error',
                    'Motion sensors not available. Please try on a device with motion sensors.',
                    true
                );
                return;
            }
            
            if (this.baseOrientation === null) {
                this.baseOrientation = {
                    beta: e.beta || 0,
                    gamma: e.gamma || 0
                };
                this.lastBeta = e.beta || 0;
                return;
            }
            this.handleTilt(e);
        }, { frequency: 60 });

        this.gameLoop();
        
        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
    }

    handleTilt(event) {
        if (this.isGameOver || !this.baseOrientation) return;
        
        const now = Date.now();
        const currentBeta = event.beta || 0;

        if (this.lastBeta === null) {
            this.lastBeta = currentBeta;
            return;
        }

        this.recentBetas.push(currentBeta);
        if (this.recentBetas.length > 3) {
            this.recentBetas.shift();
        }

        const recentMovement = this.recentBetas.length >= 2 ? 
            this.recentBetas[this.recentBetas.length - 1] - this.recentBetas[0] : 0;

        if (!this.isTilting && recentMovement > 8) {
            this.isTilting = true;
            this.tiltStartRotation = this.rotation;
            this.checkBeamPosition(true);
            this.lastTiltTime = now;
        } else if (this.isTilting && (Math.abs(currentBeta - this.lastBeta) < 2 || recentMovement < 0)) {
            this.isTilting = false;
            this.tiltStartRotation = null;
        }

        this.lastBeta = currentBeta;
        
        if (now - this.lastTiltTime > 1000) {
            this.baseOrientation = {
                beta: currentBeta,
                gamma: event.gamma || 0
            };
        }
    }

    checkBeamPosition(isTiltStart = false) {
        if (this.isGameOver) return;

        if (!isTiltStart && Date.now() - this.lastTiltTime < this.tiltCooldown) return;
        
        const normalizedRotation = ((this.rotation % 360) + 360) % 360;
        
        // 135 degrees total (67.5 degrees on each side of top)
        const isInTargetZone = normalizedRotation >= 292.5 || normalizedRotation <= 67.5;

        if (isInTargetZone && isTiltStart) {
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
        } else if (!isInTargetZone && isTiltStart) {
            const now = Date.now();
            if (now - this.lastLifeLossTime < 2000) return;
            this.lastLifeLossTime = now;
            
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

    showMessage(title, text, showReload = false, onRetry = null) {
        this.messageElement.style.display = 'block';
        const buttonStyle = `
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
                       font-size: ${title.includes('Game Over') ? '32px' : '24px'};">
                ${title}
            </h2>
            <p style="font-size: 16px;">${text}</p>
            ${showReload ? `<button ${buttonStyle}>Retry</button>` : ''}
        `;

        if (showReload && typeof onRetry === 'function') {
            const button = this.messageElement.querySelector('button');
            button.addEventListener('click', onRetry);
        }
    }

    gameOver(isWinner) {
        this.isGameOver = true;
        const title = isWinner ? 'Game Over – You Win!' : 'Game Over';
        const text = isWinner 
            ? 'Awesome job! You hit all 5 targets! 🎉'
            : 'Better luck next time! You ran out of lives.';
        
        this.showMessage(title, text, true, () => {
            this.resetGame();
            this.setupGame();
        });

        if ('vibrate' in navigator) {
            navigator.vibrate(isWinner ? [100, 50, 100, 50, 200] : [500, 100, 500]);
        }
    }

    gameLoop() {
        if (!this.isGameOver) {
            this.rotation = (this.rotation + this.speed) % 360;
            this.canContainer.style.transform = `translate(-50%, -50%) rotate(${this.rotation}deg)`;
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        
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
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        `;
        
        document.body.appendChild(permissionButton);
        
        permissionButton.addEventListener('click', async () => {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    permissionButton.remove();
                    const game = new FantaGame();
                } else {
                    alert('Please enable motion sensors in Safari settings to play the game.');
                }
            } catch (error) {
                console.error('Error requesting permission:', error);
                alert('Error requesting motion permission. Please check your Safari settings.');
            }
        });
    } else {
        const game = new FantaGame();
    }
});
 
