<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Fanta Spin</title>
  <style>
    /* Add your CSS styles here */
    #message {
      display: none; /* Initially hidden */
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      z-index: 1000;
    }
    /* Other styles */
    #canContainer {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 200px;
      height: 200px;
      background-color: orange;
      border-radius: 50%;
    }
    #beam {
      position: absolute;
      top: 0;
      left: 50%;
      width: 4px;
      height: 100px;
      background: linear-gradient(to top, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.2));
      transform: translateX(-50%);
    }
    #targetZone {
      position: absolute;
      top: 0;
      left: 50%;
      width: 100px;
      height: 100px;
      border: 2px dashed white;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }
    #lives, #hits {
      position: absolute;
      top: 10px;
      font-size: 18px;
      color: white;
    }
    #lives {
      left: 10px;
    }
    #hits {
      right: 10px;
    }
  </style>
</head>
<body>
  <div id="canContainer">
    <div id="beam"></div>
    <div id="targetZone"></div>
  </div>
  <div id="lives">3</div>
  <div id="hits">0</div>
  <div id="message"></div>

  <script>
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
        this.isTilting = false; // Track if we're in a tilt motion
        this.tiltStartRotation = null; // Store rotation when tilt starts
        this.lastBeta = null; // Track last beta value
        this.recentBetas = []; // Track recent beta values for movement detection

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

        // Update display
        this.livesElement.textContent = this.lives;
        this.hitsElement.textContent = this.hits;
      }

      setupGame() {
        // Show welcome message first
        this.showMessage(
          'Welcome to Fanta Spin!',
          'Hold your phone in a comfortable position and tap anywhere to start.<br><br>Tilt your phone forward when the beam hits the target!',
          false
        );

        // Add touch/click controls for the first tap to start
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
          'Please enable motion sensors in your browser settings and tap retry.',
          true,
          () => {
            location.reload();
          }
        );
      }

      startGame() {
        // Always try to use device orientation
        window.addEventListener('deviceorientation', (e) => {
          if (!e.beta && e.beta !== 0) {
            // If we're not getting real sensor data, show error
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

        // Initialize lastBeta if needed
        if (this.lastBeta === null) {
          this.lastBeta = currentBeta;
          return;
        }

        // Track recent movements
        this.recentBetas.push(currentBeta);
        if (this.recentBetas.length > 3) {
          this.recentBetas.shift();
        }

        // Calculate recent movement (positive means forward tilt)
        const recentMovement = this.recentBetas.length >= 2 ?
          this.recentBetas[this.recentBetas.length - 1] - this.recentBetas[0] : 0;

        // More forgiving tilt detection
        if (!this.isTilting && recentMovement > 8) { // Reduced from 10 to 8 degrees for easier tilting
          this.isTilting = true;
          this.tiltStartRotation = this.rotation;
          this.checkBeamPosition(true);
          this.lastTiltTime = now;
        }
        // Reset when movement stops or reverses
        else if (this.isTilting && (Math.abs(currentBeta - this.lastBeta) < 2 || recentMovement < 0)) {
          this.isTilting = false;
          this.tiltStartRotation = null;
        }

        this.lastBeta = currentBeta;

        // Update base orientation less frequently
        if (now - this.lastTiltTime > 1000) {
          this.baseOrientation = {
            beta: currentBeta,
            gamma: event.gamma || 0
          };
        }
      }

      checkBeamPosition(isTiltStart = false) {
        if (this.isGameOver) return;

        // Only process if this is the start of a tilt or we haven't checked recently
        if (!isTiltStart && Date.now() - this.lastTiltTime < this.tiltCooldown) return;

        const normalizedRotation = ((this.rotation % 360) + 360) % 360;

        // Simple hit zone check - 180 degrees total (wider target for easier hits)
        const isInTargetZone = normalizedRotation >= 270 || normalizedRotation <= 90;

        if (isInTargetZone && isTiltStart) {
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
        } else if (!isInTargetZone && isTiltStart) { // Miss -
::contentReference[oaicite:11]{index=11}
 
