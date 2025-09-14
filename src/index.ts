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
