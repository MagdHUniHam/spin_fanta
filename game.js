// Add a global variable to track if we have permission
let hasMotionPermission = false;

// Global game instance
let currentGame = null;

// Global start game function
async function startGame() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission !== 'granted') {
                alert('Please enable motion sensors to play the game.');
                return;
            }
        } catch (error) {
            console.error('Error requesting motion permission:', error);
            alert('Error accessing motion sensors. Please try again.');
            return;
        }
    }
    
    if (currentGame) {
        currentGame.messageElement.style.display = 'none';
        currentGame.start();
    }
}

class FantaGame {
    constructor() {
        // Get DOM elements
        this.canContainer = document.getElementById('canContainer');
        this.beam = document.getElementById('beam');
        this.livesElement = document.getElementById('lives');
        this.hitsElement = document.getElementById('hits');
        this.drops = Array.from(this.hitsElement.getElementsByClassName('drop'));
        this.messageElement = document.getElementById('message');
        
        // Bind methods
        this.handleMotion = this.handleMotion.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        
        this.initializeGame();
    }

    initializeGame() {
        // Reset game state
        this.rotation = 0;
        this.speed = 2.75;
        this.lives = 3;
        this.sips = 0;
        this.isGameOver = false;
        this.lastTiltTime = 0;
        this.lastBeta = null;
        this.recentBetas = [];
        this.isBlinking = false;
        this.animationFrameId = null;

        // Reset UI elements
        this.canContainer.style.transform = 'translate(-50%, -50%) rotate(0deg)';
        this.beam.style.background = 'linear-gradient(to top, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.2))';
        this.livesElement.textContent = 'Lives: 3';
        this.updateSipsDisplay();
        
        this.showWelcomeMessage();
    }

    showWelcomeMessage() {
        this.messageElement.innerHTML = `
            <h2 style="color: white; font-size: 24px;">Ready to have a sip of Fanta?</h2>
            <p style="font-size: 16px;">
                Tilt your phone forward when the beam is in the blue zone to take a sip.<br>
                I dare you take 5 sips to win.<br><br>
                Tap anywhere to start.
            </p>
        `;
        this.messageElement.style.display = 'block';
    }

    cleanup() {
        // Remove the motion event listener
        window.removeEventListener('deviceorientation', this.handleMotion);
        
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Reset game state
        this.isGameOver = true;
        this.rotation = 0;
        this.lives = 3;
        this.sips = 0;
        this.speed = 2.75; // Ensure speed is reset
        this.canContainer.style.transform = 'translate(-50%, -50%) rotate(0deg)';
        this.livesElement.textContent = 'Lives: 3';
        this.updateSipsDisplay();
    }

    handleMotion(e) {
        if (!e.beta && e.beta !== 0) return;
        
        this.recentBetas.push(e.beta);
        if (this.recentBetas.length > 3) this.recentBetas.shift();

        const movement = this.recentBetas.length >= 2 ? 
            this.recentBetas[this.recentBetas.length - 1] - this.recentBetas[0] : 0;

        if (movement > 8 && Date.now() - this.lastTiltTime > 200) {
            this.checkHit();
            this.lastTiltTime = Date.now();
        }
    }

    updateSipsDisplay() {
        this.drops.forEach((drop, index) => {
            drop.classList.toggle('filled', index < this.sips);
        });
    }

    start() {
        // Ensure any existing game loop is stopped
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Reset game state before starting
        this.lives = 3;
        this.sips = 0;
        this.isGameOver = false;
        this.rotation = 0;
        this.speed = 2.75;
        
        // Reset UI
        this.livesElement.textContent = 'Lives: 3';
        this.updateSipsDisplay();
        this.canContainer.style.transform = 'translate(-50%, -50%) rotate(0deg)';
        
        // Remove any existing motion listener before adding a new one
        window.removeEventListener('deviceorientation', this.handleMotion);
        window.addEventListener('deviceorientation', this.handleMotion);
        
        // Start the game loop
        this.gameLoop();
    }

    blinkBeam(color) {
        if (this.isBlinking) return;
        this.isBlinking = true;
        
        let blinkCount = 0;
        const maxBlinks = 3;
        const blinkInterval = setInterval(() => {
            if (blinkCount >= maxBlinks * 2) {
                clearInterval(blinkInterval);
                this.beam.style.background = 'linear-gradient(to top, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.2))';
                this.isBlinking = false;
                return;
            }
            
            this.beam.style.background = blinkCount % 2 === 0 ? color : 'transparent';
            blinkCount++;
        }, 100);
    }

    checkHit() {
        const normalizedRotation = ((this.rotation % 360) + 360) % 360;
        // 25 degrees on each side of top center (50 degrees total)
        const isInTargetZone = normalizedRotation >= 335 || normalizedRotation <= 25;

        if (isInTargetZone) {
            // Hit
            this.sips++;
            this.updateSipsDisplay();
            this.blinkBeam('linear-gradient(to top, #00FF00, rgba(0, 255, 0, 0.2))');
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);

            if (this.sips >= 5) this.endGame(true);
        } else {
            // Miss
            this.lives--;
            this.livesElement.textContent = `Lives: ${this.lives}`;
            this.blinkBeam('linear-gradient(to top, #FF0000, rgba(255, 0, 0, 0.2))');
            if ('vibrate' in navigator) navigator.vibrate(500);

            if (this.lives <= 0) this.endGame(false);
        }
    }

    endGame(isWinner) {
        this.cleanup();
        this.messageElement.innerHTML = `
            <h2 style="color: #FF4500; font-size: 32px;">
                ${isWinner ? 'Congrats, you won!<br><span style="font-size: 24px;">code: winner</span>' : 'Game Over'}
            </h2>
            ${!isWinner ? '<p style="font-size: 16px;">Better luck next time!</p>' : ''}
            <button onclick="restartGame()" style="
                background-color: #FF4500;
                border: none;
                color: white;
                padding: 15px 30px;
                border-radius: 25px;
                font-size: 18px;
                margin-top: 20px;
                cursor: pointer;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);">
                Play Again
            </button>
        `;
        this.messageElement.style.display = 'block';
    }

    gameLoop() {
        // Only proceed if we don't have another loop running
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (!this.isGameOver) {
            this.rotation = (this.rotation + this.speed) % 360;
            this.canContainer.style.transform = `translate(-50%, -50%) rotate(${this.rotation}deg)`;
            this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
        }
    }
}

function restartGame() {
    if (currentGame) {
        currentGame.cleanup();
    }
    currentGame = new FantaGame();
    // Set up the click/touch handlers for the new game
    document.addEventListener('click', startGame, { once: true });
    document.addEventListener('touchstart', startGame, { once: true });
}

// Start the game when the page loads
window.addEventListener('load', () => {
    currentGame = new FantaGame();
    // Set up initial click/touch handlers
    document.addEventListener('click', startGame, { once: true });
    document.addEventListener('touchstart', startGame, { once: true });
});
 
