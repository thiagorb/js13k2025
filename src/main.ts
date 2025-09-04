// src/main.ts
import { drawCatBlock, preloadCatImages, CatRole, getRandomSpecialColor, BLOCK_SIZE } from './catSvg';
import { resetScore, addRowsCleared, updateTimeScore, getScore, updateScoreDisplay } from './index';

const COLS = 10;
const ROWS = 20;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

const previewCanvas = document.getElementById('nextPiece') as HTMLCanvasElement;
const previewCtx = previewCanvas.getContext('2d')!;

type Cell = {
    color: string;
    role: CatRole;
    special?: boolean;
    hp?: number;
    // group: Set<Cell>;
    x: number;
    y: number;
} | null;

interface Piece {
    shape: number[][];
    roles: (CatRole | null)[][];
    color: string;
    x: number;
    y: number;
    special?: boolean;
}

const PIECES: { shape: number[][]; roles: (CatRole | null)[][]; color: string }[] = [
    { shape: [[1,1,1,1]], roles: [['head','body','body-side','tail']], color:'#ff6666' },
    { shape: [[1,1],[1,1]], roles: [['head','body'],['legs','tail']], color:'#66ccff' },
    { shape: [[0,1,0],[1,1,1]], roles: [[null,'head',null],['tail','body','legs']], color:'#99ff99' },
    { shape: [[1,0,0],[1,1,1]], roles: [['head',null,null],['tail','body','legs']], color:'#ffcc66' }
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

// ==== Spawn / Next Piece ====
function spawnPiece(): Piece {
    const score = getScore();
    let isSpecial = false;

    if(score >= 500){
        const now = Date.now();
        if(now - lastSpecialSpawn >= 25000 || lastSpecialSpawn === 0){
            isSpecial = false;
            lastSpecialSpawn = now;
        }
    }

    const i = Math.floor(Math.random()*PIECES.length);
    const p = PIECES[i];

    return {
        shape: p.shape.map(r=>[...r]),
        roles: p.roles.map(r=>[...r]),
        color: isSpecial ? getRandomSpecialColor() : p.color,
        x: Math.floor(COLS/2 - Math.ceil(p.shape[0].length/2)),
        y: 0,
        special: isSpecial
    };
}

function setNewPiece() {
    current = next;
    next = spawnPiece();
    drawNextPreview();
}

// ==== Collision / Merge / Clear ====
function collide(piece: Piece): boolean {
    for(let r=0;r<piece.shape.length;r++){
        for(let c=0;c<piece.shape[r].length;c++){
            if(piece.shape[r][c]){
                const x = piece.x+c;
                const y = piece.y+r;
                if(x<0||x>=COLS||y>=ROWS||(y>=0&&board[y][x])) return true;
            }
        }
    }
    return false;
}

function merge() {
    // const group = new Set<Cell>();
    current.shape.forEach((row,r)=>{
        row.forEach((val,c)=>{
            if(val){
                const nx = current.x+c;
                const ny = current.y+r;
                if(ny>=0){
                    board[ny][nx] = {
                        color: current.color,
                        role: current.roles[r][c]!,
                        special: current.special ?? false,
                        hp: current.special ? 2 : undefined,
                        // group,
                        x: nx,
                        y: ny,
                    };
                    // group.add(board[ny][nx]);
                }
            }
        });
    });
}

// ==== Clear Lines + Local Gravity ====
function clearLines() {
    let linesCleared = 0;
    let firstLineCleared = 0;
    for(let r=ROWS-1;r>=0;r--){
        let full = true;
        for(let c=0;c<COLS;c++){
            if(!board[r][c]) { full=false; break; }
        }
        if(full){
            linesCleared++;
            if (!firstLineCleared) {
                firstLineCleared = r;
            }


            for(let c=0;c<COLS;c++){
                 board[r][c]=null;
            }
        }
    }
    // todo
    applyGravityAboveLine(firstLineCleared, linesCleared);

    if(linesCleared>0){
        addRowsCleared(linesCleared);
        updateScoreDisplay();
    }
}
//
// ==== Gravity nur oberhalb der gelöschten Reihe ====
function applyGravityAboveLine(firstLineCleared: number, linesCleared: number) {
    for(let r=firstLineCleared-linesCleared;r>=0;r--){
        for(let c=0;c<COLS;c++){
            const cell = board[r][c];
            if(!cell) continue;

            board[r + linesCleared][c] = board[r][c];
            board[r][c] = null;
        }
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
            if(cell) drawCatBlock(ctx,c,r,cell.color,cell.role,cell.special);
        }
    }

    current.shape.forEach((row,r)=>row.forEach((val,c)=>{
        if(val) drawCatBlock(ctx,current.x+c,current.y+r,current.color,current.roles[r][c]!,current.special);
    }));
}

// ==== Next Preview ====
function drawNextPreview() {
    if(!previewCtx) return;
    previewCtx.clearRect(0,0,previewCanvas.width,previewCanvas.height);

    const { shape, roles, color, special } = next;

    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(let y=0;y<shape.length;y++){
        for(let x=0;x<shape[y].length;x++){
            if(shape[y][x]){
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

    for(let y=0;y<shape.length;y++){
        for(let x=0;x<shape[y].length;x++){
            if(shape[y][x] && roles[y][x]){
                drawCatBlock(previewCtx,x-minX,y-minY,color,roles[y][x]!,special);
            }
        }
    }

    previewCtx.restore();
}

// ==== Controls ====
document.addEventListener('keydown',(e)=>{
    if(!gameStarted||gameOver) return;
    if(e.key==='ArrowLeft'){current.x--;if(collide(current)) current.x++;}
    else if(e.key==='ArrowRight'){current.x++;if(collide(current)) current.x--;}
    else if(e.key==='ArrowDown'){drop();}
    else if(e.key==='ArrowUp'){rotate(current);}
    else if(e.key===' '){hardDrop();}
});

function rotate(piece: Piece){
    const newShape=piece.shape[0].map((_,i)=>piece.shape.map(row=>row[i]).reverse());
    const newRoles=piece.roles[0].map((_,i)=>piece.roles.map(row=>row[i]).reverse());
    const oldShape=piece.shape;
    const oldRoles=piece.roles;
    piece.shape=newShape;
    piece.roles=newRoles;
    if(collide(piece)){piece.shape=oldShape;piece.roles=oldRoles;}
}

// ==== Game Loop ====
function update(time=0){
    if(!gameStarted) return;
    if(gameOver){alert('Game Over! Punkte: '+getScore());gameStarted=false;return;}
    const delta = time - lastTime;
    lastTime=time;
    dropCounter += delta;
    if(dropCounter>dropInterval) drop();
    updateTimeScore(time);
    drawBoard();
    requestAnimationFrame(update);
}

// ==== Start Button ====
const startButton=document.getElementById('startGame');
if(startButton){
    startButton.addEventListener('click',()=>{
        preloadCatImages(PIECES).then(()=>{
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
