// --- Spielfeld-Größe ---
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// --- Canvas ---
const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;

// --- Shapes (Tetrominos) ---
const SHAPES: number[][][] = [
    [[1, 1, 1, 1]], // I
    [
        [1, 1],
        [1, 1],
    ], // O
    [
        [0, 1, 0],
        [1, 1, 1],
    ], // T
    [
        [1, 0, 0],
        [1, 1, 1],
    ], // J
    [
        [0, 0, 1],
        [1, 1, 1],
    ], // L
    [
        [0, 1, 1],
        [1, 1, 0],
    ], // S
    [
        [1, 1, 0],
        [0, 1, 1],
    ], // Z
];

// Farben für die Steine
const COLORS = [
    "#00f0f0", // I
    "#f0f000", // O
    "#a000f0", // T
    "#0000f0", // J
    "#f0a000", // L
    "#00f000", // S
    "#f00000", // Z
];

// --- Spielfeld ---
let board: (string | null)[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(null)
);

// --- Aktuelles Teil ---
let current: {
    shape: number[][];
    color: string;
    x: number;
    y: number;
} = spawnPiece();

function spawnPiece() {
    const i = Math.floor(Math.random() * SHAPES.length);
    return {
        shape: SHAPES[i],
        color: COLORS[i],
        x: Math.floor(COLS / 2) - 1,
        y: 0,
    };
}

// --- Kollision prüfen ---
function collides(shape: number[][], x: number, y: number): boolean {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                const nx = x + c;
                const ny = y + r;
                if (
                    nx < 0 ||
                    nx >= COLS ||
                    ny >= ROWS ||
                    (ny >= 0 && board[ny][nx])
                ) {
                    return true;
                }
            }
        }
    }
    return false;
}

// --- Shape in Spielfeld „einbrennen“ ---
function merge() {
    current.shape.forEach((row, r) =>
        row.forEach((val, c) => {
            if (val) {
                const nx = current.x + c;
                const ny = current.y + r;
                if (ny >= 0) board[ny][nx] = current.color;
            }
        })
    );
}

// --- Volle Reihen löschen ---
function clearRows() {
    board = board.filter((row) => row.some((c) => !c));
    while (board.length < ROWS) {
        board.unshift(Array(COLS).fill(null));
    }
}

// --- Rotieren ---
function rotate(shape: number[][]): number[][] {
    return shape[0].map((_, i) => shape.map((row) => row[i]).reverse());
}

// --- Zeichnen ---
function drawBlock(x: number, y: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK - 1, BLOCK - 1);
}

function drawBoard() {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Board
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawBlock(c, r, board[r][c]!);
            }
        }
    }

    // Aktuelles Teil
    current.shape.forEach((row, r) =>
        row.forEach((val, c) => {
            if (val) {
                drawBlock(current.x + c, current.y + r, current.color);
            }
        })
    );
}

// --- Steuerung ---
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
        if (!collides(current.shape, current.x - 1, current.y)) current.x--;
    }
    if (e.key === "ArrowRight") {
        if (!collides(current.shape, current.x + 1, current.y)) current.x++;
    }
    if (e.key === "ArrowDown") {
        if (!collides(current.shape, current.x, current.y + 1)) current.y++;
    }
    if (e.key === "ArrowUp") {
        const rotated = rotate(current.shape);
        if (!collides(rotated, current.x, current.y)) {
            current.shape = rotated;
        }
    }
    if (e.key === " ") {
        while (!collides(current.shape, current.x, current.y + 1)) current.y++;
        tick();
    }
});

// --- Spiel-Loop ---
let dropCounter = 0;
let lastTime = 0;

function update(time = 0) {
    const delta = time - lastTime;
    lastTime = time;
    dropCounter += delta;

    if (dropCounter > 500) {
        tick();
        dropCounter = 0;
    }

    drawBoard();
    requestAnimationFrame(update);
}

function tick() {
    if (!collides(current.shape, current.x, current.y + 1)) {
        current.y++;
    } else {
        merge();
        clearRows();
        current = spawnPiece();
        if (collides(current.shape, current.x, current.y)) {
            alert("Game Over!");
            board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        }
    }
}

update();
