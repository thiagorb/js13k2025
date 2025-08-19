import html from '../game.html';
import cat from './cat';

const main = async () => {
    document.body.innerHTML = html;

    const resize = () => {
        const canvas = document.getElementById('catCanvas') as HTMLCanvasElement;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const canvas = document.getElementById('catCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D & {
        setFillStyle: (color: string) => void;
        setStrokeStyle: (color: string) => void;
    };
    const contextPrototype = Object.getPrototypeOf(ctx);
    contextPrototype.setFillStyle = color => {
        ctx.fillStyle = color;
    };
    contextPrototype.setStrokeStyle = color => {
        ctx.strokeStyle = color;
    };
    // ctx.scale(0.2, 0.2);

    let catX = 0;
    let catY = 0;
    let arrowLeft = false;
    let arrowRight = false;
    let arrowUp = false;
    let arrowDown = false;
    let faceLeft = false;

    let frame = 0;
    setInterval(() => {
        catX += arrowLeft ? -80 : arrowRight ? 80 : 0;
        if (arrowLeft) {
            faceLeft = true;
        } else if (arrowRight) {
            faceLeft = false;
        }
        catY += arrowUp ? -40 : arrowDown ? 40 : 0;
        if (arrowLeft || arrowRight || arrowUp || arrowDown) {
            frame = (frame + 1) % 8;
        }

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(canvas.width / 2 - 200, canvas.height / 2 - 200);
        ctx.scale(0.4 * ((catY * 0.5 + 1000) / 2000), 0.4 * ((catY * 0.5 + 1000) / 2000));

        ctx.translate(catX, catY);
        ctx.beginPath();
        ctx.rect(0, 0, 1000, 1000);
        ctx.clip();

        if (faceLeft) {
            ctx.translate(1000, 0);
            ctx.scale(-1, 1);
        }

        ctx.translate(-(frame % 8) * 1000, 0);
        cat(ctx);
        ctx.restore();
    }, 1000 / 12);

    // add keyboard controls
    document.addEventListener('keydown', event => {
        switch (event.key) {
            case 'ArrowLeft':
                arrowLeft = true;
                break;
            case 'ArrowRight':
                arrowRight = true;
                break;
            case 'ArrowUp':
                arrowUp = true;
                break;
            case 'ArrowDown':
                arrowDown = true;
                break;
        }
    });

    document.addEventListener('keyup', event => {
        switch (event.key) {
            case 'ArrowLeft':
                arrowLeft = false;
                break;
            case 'ArrowRight':
                arrowRight = false;
                break;
            case 'ArrowUp':
                arrowUp = false;
                break;
            case 'ArrowDown':
                arrowDown = false;
                break;
        }
    });
};

window.onload = main;
