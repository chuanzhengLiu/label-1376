document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const CANVAS_SIZE = 600;
    const GRID_SIZE = 20;
    const TILE_COUNT = CANVAS_SIZE / GRID_SIZE;
    const SPEED_LEVELS = [150, 100, 60]; // ms per frame (Show, Normal, Fast)

    // --- DOM Elements ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const currentScoreEl = document.getElementById('current-score');
    const highScoreEl = document.getElementById('high-score');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const gameStatusEl = document.getElementById('game-status');
    const statusDot = document.querySelector('.status-dot');
    const overlay = document.getElementById('overlay');
    const finalScoreEl = document.getElementById('final-score');
    const restartBtnOverlay = document.getElementById('restart-btn-overlay');
    const speedIndicators = document.querySelectorAll('.level-indicators span');
    const finalMaxSpeedEl = document.getElementById('final-max-speed');
    const newRecordBadge = document.getElementById('new-record-badge');

    // --- Game State ---
    let snake = [];
    let food = { x: 0, y: 0 };
    let dx = 0;
    let dy = 0;
    let score = 0;
    let highScore = localStorage.getItem('neonSnakeHighScore') || 0;
    let gameInterval;
    let isGameRunning = false;
    let isPaused = false;
    let speedIndex = 1; // Default to Normal
    let maxSpeedIndexThisRound = speedIndex; // Track highest speed level reached this round

    // --- Initialization ---
    function init() {
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
        highScoreEl.innerText = highScore;
        resetGame();
        draw(); // Draw initial state
    }

    function resetGame() {
        snake = [
            { x: 10, y: 15 },
            { x: 10, y: 16 },
            { x: 10, y: 17 }
        ];
        dx = 0;
        dy = -1; // Move up initially
        score = 0;
        updateScore(0);
        placeFood();
        isPaused = false;
        isGameRunning = false;
        clearInterval(gameInterval);
        // Reset round-only summary info; do not touch high score
        maxSpeedIndexThisRound = speedIndex;
        finalMaxSpeedEl.innerText = speedIndex + 1;
        newRecordBadge.classList.add('hidden');
        setStatus('准备就绪', 'active');
        overlay.classList.add('hidden');
    }

    function startGame() {
        if (isGameRunning && !isPaused) return;

        if (isPaused) {
            resumeGame();
            return;
        }

        isGameRunning = true;
        isPaused = false;
        // Start a fresh round of speed tracking from current speedIndex
        maxSpeedIndexThisRound = speedIndex;
        setStatus('游戏中', 'active');
        gameInterval = setInterval(gameLoop, SPEED_LEVELS[speedIndex]);
        startBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> 重新开始';
    }

    function pauseGame() {
        if (!isGameRunning || isPaused) return;
        isPaused = true;
        clearInterval(gameInterval);
        setStatus('已暂停', 'paused');
        pauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> 继续';
    }

    function resumeGame() {
        if (!isGameRunning || !isPaused) return;
        isPaused = false;
        gameInterval = setInterval(gameLoop, SPEED_LEVELS[speedIndex]);
        setStatus('游戏中', 'active');
        pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> 暂停';
    }

    function gameOver() {
        isGameRunning = false;
        clearInterval(gameInterval);
        setStatus('游戏结束', 'paused');

        // Determine if this round set a new high score before persisting
        const isNewRecord = score > 0 && score > highScore;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('neonSnakeHighScore', highScore);
            highScoreEl.innerText = highScore;
        }

        finalScoreEl.innerText = score;
        finalMaxSpeedEl.innerText = maxSpeedIndexThisRound + 1;
        if (isNewRecord) {
            newRecordBadge.classList.remove('hidden');
        } else {
            newRecordBadge.classList.add('hidden');
        }
        overlay.classList.remove('hidden');
        startBtn.innerHTML = '<i class="fa-solid fa-play"></i> 开始';
    }

    // --- Game Logic ---
    function gameLoop() {
        moveSnake();
        if (checkCollision()) {
            gameOver();
            return;
        }
        if (checkFoodCollision()) {
            score += 10;
            updateScore(score);
            placeFood();
            // Grow snake (don't pop tail)
        } else {
            snake.pop(); // Remove tail
        }
        draw();
    }

    function moveSnake() {
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };
        snake.unshift(head);
    }

    function checkCollision() {
        const head = snake[0];

        // Wall Collision
        if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
            return true;
        }

        // Self Collision
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                return true;
            }
        }

        return false;
    }

    function checkFoodCollision() {
        const head = snake[0];
        return head.x === food.x && head.y === food.y;
    }

    function placeFood() {
        food = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        // Ensure food doesn't spawn on snake
        snake.forEach(segment => {
            if (segment.x === food.x && segment.y === food.y) {
                placeFood();
            }
        });
    }

    // --- Rendering ---
    function draw() {
        // Clear Canvas
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, canvas.width, canvas.height); // Redraw background to clear trails

        // Draw Helper Grid (Optional, handled by CSS mostly but can add subtle lines)
        // drawGrid();

        // Draw Food
        drawFood();

        // Draw Snake
        drawSnake();
    }

    function drawSnake() {
        snake.forEach((segment, index) => {
            // Head Color vs Body Color
            if (index === 0) {
                ctx.fillStyle = '#ffffff'; // White Head
                ctx.shadowColor = '#00ff88';
                ctx.shadowBlur = 15;
            } else {
                // Gradient effect for body
                ctx.fillStyle = `hsl(${140 + (index * 2)}, 100%, 50%)`;
                ctx.shadowColor = '#00ff88';
                ctx.shadowBlur = 5;
            }

            const x = segment.x * GRID_SIZE;
            const y = segment.y * GRID_SIZE;
            
            // Draw rounded rect for segment
            roundRect(ctx, x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2, 4);
            ctx.fill();
            
            ctx.shadowBlur = 0; // Reset shadow
        });
    }

    function drawFood() {
        const x = food.x * GRID_SIZE;
        const y = food.y * GRID_SIZE;

        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 15;

        // Draw glowing fruit (circle)
        ctx.beginPath();
        ctx.arc(x + GRID_SIZE / 2, y + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }

    // Utility: Rounded Rectangle
    function roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // --- UI & Controls ---
    function updateScore(val) {
        currentScoreEl.innerText = val;
    }

    function setStatus(text, type) {
        gameStatusEl.innerText = text;
        statusDot.className = 'status-dot ' + type;
    }

    // Input Handling
    document.addEventListener('keydown', (e) => {
        // Prevent default scrolling for arrow keys and space
        if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }

        if (e.key === ' ' || e.code === 'Space') {
             if (isGameRunning) {
                 isPaused ? resumeGame() : pauseGame();
             } else {
                 startGame();
             }
             return;
        }

        if (!isGameRunning || isPaused) return;

        switch(e.key) {
            case 'ArrowUp':
                if (dy === 0) { dx = 0; dy = -1; }
                break;
            case 'ArrowDown':
                if (dy === 0) { dx = 0; dy = 1; }
                break;
            case 'ArrowLeft':
                if (dx === 0) { dx = -1; dy = 0; }
                break;
            case 'ArrowRight':
                if (dx === 0) { dx = 1; dy = 0; }
                break;
        }
    });

    // Button Listeners
    startBtn.addEventListener('click', () => {
        if(isGameRunning) {
            resetGame();
            startGame();
        } else {
            startGame();
        }
    });

    pauseBtn.addEventListener('click', () => {
        isPaused ? resumeGame() : pauseGame();
    });

    restartBtnOverlay.addEventListener('click', () => {
        resetGame();
        startGame();
    });

    // Speed Control
    speedIndicators.forEach((ind, idx) => {
        ind.addEventListener('click', () => {
            speedIndicators.forEach(s => s.classList.remove('active'));
            ind.classList.add('active');
            speedIndex = idx;
            // Track highest speed level reached during the running round
            if (isGameRunning && speedIndex > maxSpeedIndexThisRound) {
                maxSpeedIndexThisRound = speedIndex;
            }
            // If running, restart timer with new speed
            if (isGameRunning && !isPaused) {
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, SPEED_LEVELS[speedIndex]);
            }
        });
    });

    init();
});
