// src/main.ts
import { drawCatBlock, CatRole, preloadCatImages } from './catSvg';

// --- Spielfeld-Größe ---
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// --- Canvas ---
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;

// --- Typen ---
type Cell = { color: string; role: CatRole } | null;

type Piece = {
    shape: number[][];
    roles: (CatRole | null)[][];
    color: string;
    x: number;
    y: number;
};

// --- Katzen-Tetrominos ---
const PIECES: Piece[] = [
    {
        shape: [[1, 1, 1, 1]],
        roles: [['head', 'body', 'body', 'tail']],
        color: '#ff8800',
        x: 0,
        y: 0,
    },
    {
        shape: [
            [1, 1],
            [1, 1],
        ],
        roles: [
            ['head', 'body'],
            ['legs', 'tail'],
        ],
        color: '#ff00aa',
        x: 0,
        y: 0,
    },
    {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
        ],
        roles: [
            [null, 'head', null],
            ['legs', 'body', 'tail'],
        ],
        color: '#00ccff',
        x: 0,
        y: 0,
    },
    {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
        ],
        roles: [
            ['head', null, null],
            ['legs', 'body', 'tail'],
        ],
        color: '#00ff00',
        x: 0,
        y: 0,
    },
    {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
        ],
        roles: [
            [null, null, 'head'],
            ['legs', 'body', 'tail'],
        ],
        color: '#ff0000',
        x: 0,
        y: 0,
    },
    {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
        ],
        roles: [
            [null, 'head', 'body'],
            ['legs', 'body', null],
        ],
        color: '#ffaa00',
        x: 0,
        y: 0,
    },
    {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
        ],
        roles: [
            ['head', 'body', null],
            [null, 'body', 'tail'],
        ],
        color: '#8800ff',
        x: 0,
        y: 0,
    },
];

// --- Spielfeld ---
let board: Cell[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// --- Aktuelles Teil ---
//let current: Piece = spawnPiece();
let next: Piece = spawnPiece();
let current: Piece = next;

drawNextPreview();

function setNewPiece() {
    current = next;
    next = spawnPiece();
    drawNextPreview();
}

// Funktion, um das nächste Piece im Vorschau-Canvas darzustellen
function drawNextPreview() {
    const canvas = document.getElementById('nextPiece') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { shape, roles, color } = next;

    // Ermittele die Begrenzung des Pieces
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    // Blockanzahl in X und Y Richtung des tatsächlichen Pieces
    const pieceWidth = maxX - minX + 1;
    const pieceHeight = maxY - minY + 1;

    // Passe Blockgröße bei großem Preview-Canvas ggf. an, sonst nimm festen Wert wie in catSvg.BLOCK_SIZE:
    const previewBlockSize = 30;

    // Berechne Offset, um das Piece zentriert darzustellen
    const offsetX = Math.floor((canvas.width - pieceWidth * previewBlockSize) / 2) - minX * previewBlockSize;
    const offsetY = Math.floor((canvas.height - pieceHeight * previewBlockSize) / 2) - minY * previewBlockSize;

    // Zeichne das Teil
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] && roles[y][x]) {
                // drawCatBlock erwartet Block-Koordinaten multipliziert mit previewBlockSize ‒ also vorher Offset einrechnen
                ctx.save();
                ctx.translate(offsetX, offsetY);
                drawCatBlock(ctx, x, y, color, roles[y][x]!);
                ctx.restore();
            }
        }
    }
}

function spawnPiece(): Piece {
    const i = Math.floor(Math.random() * PIECES.length);
    const p = PIECES[i];
    return {
        shape: p.shape.map((r) => [...r]),
        roles: p.roles.map((r) => [...r]),
        color: p.color,
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
                if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx])) return true;
            }
        }
    }
    return false;
}

// --- Shape einbrennen ---
function merge() {
    current.shape.forEach((row, r) =>
        row.forEach((val, c) => {
            if (val) {
                const nx = current.x + c;
                const ny = current.y + r;
                if (ny >= 0) board[ny][nx] = { color: current.color, role: current.roles[r][c]! };
            }
        }),
    );
}

// --- Volle Reihen löschen ---
function clearRows() {
    board = board.filter((row) => row.some((c) => !c));

    while (board.length < ROWS) {
        board.unshift(Array(COLS).fill(null));
        addRowsCleared(1);
    }
}

// --- Rotieren ---
function rotate(shape: number[][]): number[][] {
    const n = shape.length;
    const m = shape[0].length;
    const newShape: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < m; c++) {
            newShape[c][n - r - 1] = shape[r][c];
        }
    }
    return newShape;
}

// --- Update Roles after Rotation ---
function updateRoles(piece: Piece, newShape: number[][]): (CatRole | null)[][] {
    const oldRoles = piece.roles;
    const newRoles: (CatRole | null)[][] = newShape.map((row) => row.map((cell) => (cell ? 'body' : null)));

    let head = null;
    let tail = null;
    let headPos: { r: number; c: number } | null = null;
    let tailPos: { r: number; c: number } | null = null;

    oldRoles.forEach((row, r) =>
        row.forEach((role, c) => {
            if (role === 'head') headPos = { r, c };
            if (role === 'tail') tailPos = { r, c };
        }),
    );

    if (headPos) {
        const newHeadPos = { r: headPos.c, c: newShape[0].length - headPos.r - 1 };
        newRoles[newHeadPos.r][newHeadPos.c] = 'head';
    }

    if (tailPos) {
        const newTailPos = { r: tailPos.c, c: newShape[0].length - tailPos.r - 1 };
        newRoles[newTailPos.r][newTailPos.c] = 'tail';
    }

    oldRoles.forEach((row, r) =>
        row.forEach((role, c) => {
            if (role === 'legs') {
                const newLegsPos = { r: c, c: newShape[0].length - r - 1 };
                if (newShape[newLegsPos.r][newLegsPos.c]) {
                    newRoles[newLegsPos.r][newLegsPos.c] = 'legs';
                }
            }
        }),
    );

    if (newShape.length === 1 || newShape[0].length === 1) {
        newRoles.forEach((row, r) =>
            row.forEach((role, c) => {
                if (role === 'body') newRoles[r][c] = 'body-side';
            }),
        );
    }

    return newRoles;
}

// --- Zeichnen ---
function drawBoard() {
    ctx.fillStyle = '#1c1c2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = board[r][c];
            if (cell) drawCatBlock(ctx, c, r, cell.color, cell.role);
        }
    }

    current.shape.forEach((row, r) =>
        row.forEach((val, c) => {
            if (val) drawCatBlock(ctx, current.x + c, current.y + r, current.color, current.roles[r][c]!);
        }),
    );
}

// --- Steuerung ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && !collides(current.shape, current.x - 1, current.y)) current.x--;
    if (e.key === 'ArrowRight' && !collides(current.shape, current.x + 1, current.y)) current.x++;
    if (e.key === 'ArrowDown' && !collides(current.shape, current.x, current.y + 1)) current.y++;
    if (e.key === 'ArrowUp') {
        const newShape = rotate(current.shape);
        const newRoles = updateRoles(current, newShape);

        const kicks = [0, -1, 1, -2, 2];
        for (let i = 0; i < kicks.length; i++) {
            if (!collides(newShape, current.x + kicks[i], current.y)) {
                current.shape = newShape;
                current.roles = newRoles;
                current.x += kicks[i];
                break;
            }
        }
    }
    if (e.key === ' ') {
        while (!collides(current.shape, current.x, current.y + 1)) current.y++;
        tick();
    }
    drawBoard();
});

// --- Spiel-Loop ---
let dropCounter = 0;
let lastTime = 0;

function update(time = 0) {
    const delta = time - lastTime;
    lastTime = time;
    dropCounter += delta;
    updateTimeScore(time);

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
        setNewPiece();
        if (collides(current.shape, current.x, current.y)) {
            alert('Game Over!');
            resetScore();
            board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        }
    }
}

let gameStarted = false;

function startGame() {
    resetScore();
    if (gameStarted) return;
    gameStarted = true;
    lastTime = 0;
    dropCounter = 0;
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    setNewPiece(),
    update();
}

const startButton = document.getElementById('startGame');
if (startButton) {
    startButton.addEventListener('click', () => {
        preloadCatImages(PIECES)
            .then(() => {
                startButton.style.display = 'none';
                startGame();
            })
            .catch((e) => {
                console.error('Failed to preload cat images:', e);
            });
    });
}

// src/index.ts
let score = 0;
let lastSecondTimestamp = 0;

export function resetScore() {
    score = 0;
    updateScoreDisplay();
    lastSecondTimestamp = 0;
}

export function addRowsCleared(rows: number) {
    score += rows * 100;
    updateScoreDisplay();
}

export function updateTimeScore(time: number) {
    if (!lastSecondTimestamp) lastSecondTimestamp = time;
    let secondsPassed = 0;
    while (time - lastSecondTimestamp >= 10000) {
        score += 10;
        lastSecondTimestamp += 10000;
        secondsPassed++;
    }
    if (secondsPassed > 0) updateScoreDisplay();
}

export function updateScoreDisplay() {
    const el = document.getElementById('scoreValue');
    if (el) el.textContent = String(score);
}

export function getScore() {
    return score;
}
