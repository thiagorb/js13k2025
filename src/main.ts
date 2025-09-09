// src/main.ts
import { drawCatBlock, preloadCatImages, CatRole, BLOCK_SIZE } from './catSvg';
import { resetScore, addRowsCleared, updateTimeScore, getScore, updateScoreDisplay } from './index';

const COLS = 10;
const ROWS = 20;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

const previewCanvas = document.getElementById('nextPiece') as HTMLCanvasElement;
const previewCtx = previewCanvas.getContext('2d')!;

const textOverlay = document.getElementById('textOverlay') as HTMLDivElement;
let textOverlayTimeout: ReturnType<typeof setTimeout> | null = null;
function showTextOverlay(text: string) {
    if (textOverlayTimeout) {
        clearTimeout(textOverlayTimeout);
        textOverlay.classList.remove('show');
    }
    textOverlay.textContent = text;
    textOverlayTimeout = setTimeout(() => {
        textOverlay.classList.remove('show');
    }, 2000);
    requestAnimationFrame(() => {
        textOverlay.classList.add('show');
    });
}

type Cell = {
    color: string;
    role: CatRole;
    special: Special;
    hp?: number;
    // group: Set<Cell>;
    x: number;
    y: number;
} | null;

interface Piece {
    roles: (CatRole | null)[][];
    color: string;
    x: number;
    y: number;
    special: Special
}

interface HighscoreEntry {
    name: string;
    score: number;
}

class PieceCount {
    name: string;
    count: number;
    constructor(name: string, count: number = 1) {
        this.name = name;
        this.count = count;
    }
}

const SPECIAL_COLOR = '#333333';
const enum Special {
    NONE,
    UNROTATABLE,
    UNMOVABLE,
    HARD_DROP,
} 
const PIECES: { name: string; roles: (CatRole | null)[][]; color: string }[] = [
    { name: '4', roles: [['head','body','body','tail']], color:'#ff6666' },
    { name: 'Q', roles: [['head','body'],['legs','tail']], color:'#0044ffff' },
    { name: 'T', roles: [[null,'head',null],['tail','body','legs']], color:'#99ff99' },
    { name: 'L', roles: [['head',null,null],['tail','body','legs']], color:'#ffcc66' },
    { name: 'L2', roles: [[null,null,'head'],['legs','body','tail']], color:'#ff7b00ff' },
    { name: 'S', roles: [['head','body',null],[null,'legs','tail']], color:'#f266ffff' },
    { name: 'S2', roles: [[null,'body','head'],['tail','legs',null]], color:'#62cdffff' },
];

let board: (Cell | null)[][] = Array.from({length: ROWS},()=>Array(COLS).fill(null));
let current: Piece;
let next: Piece;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameOver = false;
let gameStarted = false;
let lastSpecialSpawn = 0;
let lastSpecial: Special = Special.NONE;
let lastPiece: PieceCount;

const highscoreList = document.getElementById('highscoreList') as HTMLOListElement;

let highscores: HighscoreEntry[] = [];

if (highscores.length === 0) {
    addHighscore("Player", 1500);
    addHighscore("Mouse", 15890);
    addHighscore("Black Cat", 25000);
    addHighscore("4Player", 780);
    addHighscore("CasualGamer", 900);
    addHighscore("TetrisMaster", 250);
    addHighscore("ProGamer", 100);
    addHighscore("Spicy Chicken", 8000);
    addHighscore("Player9", 100);
    addHighscore("Harry Dotter", 3750);
}


function addHighscore(name: string, score: number) {
    highscores.push({ name, score });

    highscores.sort((a, b) => b.score - a.score);

    if (highscores.length > 10) highscores = highscores.slice(0, 10);

    updateHighscoreDisplay();
}

function updateHighscoreDisplay() {
    highscoreList.innerHTML = '';
    highscores.forEach(entry => {
        const li = document.createElement('li');
        li.innerHTML = `${entry.name} <span style="float:right; font-weight:700">${entry.score}</span>`;
        highscoreList.appendChild(li);
    });
}

// ==== Spawn / Next Piece ====
function spawnPiece(): Piece {
    const score = getScore();
    let special: Special = Special.NONE;

    let i = Math.floor(Math.random()*PIECES.length);
    let newPiece = PIECES[i];

    if (lastPiece && lastPiece.name === newPiece.name) {
        lastPiece.count++;
    } else {
        lastPiece = new PieceCount(newPiece.name, 1);
    }

    if (lastPiece.count >= 3) {
        do {
            i = Math.floor(Math.random()*PIECES.length);
        } while (lastPiece.name !== PIECES[i].name);
    }
    const p = PIECES[i];

    if(score >= 100){
        const now = Date.now();
        if(now - lastSpecialSpawn >= 25000 - Math.min(20000, score) || lastSpecialSpawn === 0){
            special = Math.ceil(Math.random() * 3);

            if (lastSpecial === special) {
                if (lastSpecial === Special.UNMOVABLE) {
                    special = Special.UNROTATABLE;
                }
                if (lastSpecial === Special.UNROTATABLE) {
                    special = Special.HARD_DROP;
                }
                if (lastSpecial === Special.HARD_DROP) {
                    special = Special.UNMOVABLE;
                }
            }

            lastSpecialSpawn = now;
            lastSpecial = special;
        }
    }

    const x = special === Special.UNMOVABLE
        ? Math.floor(Math.random() * (COLS - p.roles[0].length + 1))
        : Math.floor(COLS/2 - Math.ceil(p.roles[0].length/2));

    return {
        roles: p.roles.map(r=>[...r]),
        color: special !== Special.NONE ? SPECIAL_COLOR : p.color,
        x,
        y: 0,
        special: special
    };
}

function setNewPiece() {
    current = next;
    next = spawnPiece();
    drawNextPreview();

    if (current.special === Special.UNMOVABLE) showTextOverlay('UNMOVABLE!');
    else if (current.special === Special.UNROTATABLE) showTextOverlay('UNROTATABLE!');
    else if (current.special === Special.HARD_DROP) showTextOverlay('HARD DROP!');
}

// ==== Collision / Merge / Clear ====
function collide(piece: Piece): boolean {
    for(let r=0;r<piece.roles.length;r++){
        for(let c=0;c<piece.roles[r].length;c++){
            if(piece.roles[r][c]){
                const x = piece.x+c;
                const y = piece.y+r;
                if(x<0||x>=COLS||y>=ROWS||(y>=0&&board[y][x])) return true;
            }
        }
    }
    return false;
}

function merge() {
    current.roles.forEach((row,r)=>{
        row.forEach((val,c)=>{
            if(val){
                const nx = current.x+c;
                const ny = current.y+r;
                if(ny>=0){
                    board[ny][nx] = {
                        color: current.color,
                        role: current.roles[r][c]!,
                        special: current.special,
                        x: nx,
                        y: ny,
                    };
                }
            }
        });
    });
}

// ==== Clear Lines + Local Gravity ====
function clearLines() {
    let linesCleared = 0;
    // Process from bottom to top
    for(let r = ROWS - 1; r >= 0; r--) {
        let full = true;
        for(let c = 0; c < COLS; c++) {
            if(!board[r][c]) { 
                full = false; 
                break; 
            }
        }
        
        if(full) {
            // Clear this line
            for(let c = 0; c < COLS; c++) {
                board[r][c] = null;
            }
            linesCleared++;
        } else if(linesCleared > 0) {
            // Shift this line down by the number of lines cleared so far
            for(let c = 0; c < COLS; c++) {
                board[r + linesCleared][c] = board[r][c];
                board[r][c] = null;
            }
        }
    }

    if(linesCleared>0){
        addRowsCleared(linesCleared);
        updateScoreDisplay();
    }
}

// ==== Drop / Hard Drop ====
function drop() {
    current.y++;
    if(collide(current)){
        current.y--;
        merge();
        clearLines();
        setNewPiece();
        if(collide(current)) gameOver = true;
    }
    dropCounter=0;
}

function hardDrop() {
    while(!collide(current)) current.y++;
    current.y--;
    merge();
    clearLines();
    setNewPiece();
    if(collide(current)) gameOver = true;
}

// ==== Draw ====
function drawBoard(){
    ctx.fillStyle='#1c1c2e';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    for(let r=0;r<ROWS;r++){
        for(let c=0;c<COLS;c++){
            const cell = board[r][c];
            if(cell) drawCatBlock(ctx,c,r,cell.color,cell.role);
        }
    }

    current.roles.forEach((row,r)=>row.forEach((val,c)=>{
        if(val) drawCatBlock(ctx,current.x+c,current.y+r,current.color,current.roles[r][c]!);
    }));
}

// ==== Next Preview ====
function drawNextPreview() {
    if(!previewCtx) return;
    previewCtx.clearRect(0,0,previewCanvas.width,previewCanvas.height);

    const { roles, color } = next;

    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(let y=0;y<roles.length;y++){
        for(let x=0;x<roles[y].length;x++){
            if(roles[y][x]){
                if(x<minX) minX=x;
                if(x>maxX) maxX=x;
                if(y<minY) minY=y;
                if(y>maxY) maxY=y;
            }
        }
    }

    const pieceWidth = maxX - minX +1;
    const pieceHeight = maxY - minY +1;

    const offsetX = Math.floor((previewCanvas.width - pieceWidth*BLOCK_SIZE)/2);
    const offsetY = Math.floor((previewCanvas.height - pieceHeight*BLOCK_SIZE)/2);

    previewCtx.save();
    previewCtx.translate(offsetX, offsetY);

    for(let y=0;y<roles.length;y++){
        for(let x=0;x<roles[y].length;x++){
            if(roles[y][x]){
                drawCatBlock(previewCtx,x-minX,y-minY,color,roles[y][x]!);
            }
        }
    }

    previewCtx.restore();
}

// ==== Controls ====
document.addEventListener('keydown',(e)=>{
    if(!gameStarted||gameOver) return;
    if (current.special !== Special.UNMOVABLE) {
        if(e.key==='ArrowLeft'){current.x--;if(collide(current)) current.x++;}
        if(e.key==='ArrowRight'){current.x++;if(collide(current)) current.x--;}
    }
    if(e.key==='ArrowDown'){drop();}
    if(e.key==='ArrowUp'){rotate(current);}
    if(e.key===' '){hardDrop();}
});

function rotate(piece: Piece){
    if (piece.special === Special.UNROTATABLE) return; // Spezialteile können sich nicht drehen

    const newRoles=piece.roles[0].map((_,i)=>piece.roles.map(row=>row[i]).reverse());
    const oldRoles=piece.roles;
    piece.roles=newRoles;
    if(collide(piece)){piece.roles=oldRoles;}
}

// ==== Game Loop ====
function update(time=0){
    if(!gameStarted) return;
    if(gameOver){endGame();return;}
    const delta = time - lastTime;
    lastTime=time;
    dropCounter += delta;
    if(dropCounter>dropInterval) {
        if (current.special === Special.HARD_DROP) {
            hardDrop();
        } else {
            drop();
        }
    }
    updateTimeScore(time);
    drawBoard();
    requestAnimationFrame(update);
}

const startButton=document.getElementById('startGame');

async function endGame() {
    gameOver = true;
    gameStarted = false;
    addHighscore("New Player", getScore());
    showTextOverlay('Game Over! Points: ' + getScore());
    await new Promise(resolve => setTimeout(resolve, 3500));
    startButton.style.display = 'inline-block';
}

// ==== Start Button ====
if(startButton){
    startButton.addEventListener('click',()=>{
        preloadCatImages([...PIECES.map(p => p.color), SPECIAL_COLOR]).then(()=>{
            startButton.style.display='none';
            startGame();
        });
    });
}

function startGame(){
    resetScore();
    board = Array.from({length: ROWS},()=>Array(COLS).fill(null));
    current=spawnPiece();
    next=spawnPiece();
    drawNextPreview();
    gameOver=false;
    gameStarted=true;
    lastTime=0;
    dropCounter=0;
    update();
}

// ==== Viewport Scaling ====
function scaleGameUI() {
    const gameUI = document.getElementById('gameUi') as HTMLDivElement;
    if (!gameUI) return;
    
    const viewportHeight = window.innerHeight;
    const gameUIHeight = gameUI.offsetHeight;
    
    if (gameUIHeight > 0) {
        const scale = viewportHeight / gameUIHeight;
        gameUI.style.transform = `scale(${scale})`;
    }
}

// Add resize event listener
window.addEventListener('resize', scaleGameUI);

// Initial scaling when page loads
window.addEventListener('load', scaleGameUI);
