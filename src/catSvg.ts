import head from './images/head.svg';
import body from './images/body.svg';
import bodySide from './images/body-side.svg';
import tail from './images/tail.svg';
import legs from './images/legs.svg';

export type CatRole = 'head' | 'body' | 'tail' | 'legs' | 'body-side';

const renderedImages = new Map<string, HTMLImageElement>();
export const BLOCK_SIZE = 40;
const IMAGE_SIZE = 100; // original SVG size
const IMAGE_PADDING = 35;
const IMAGE_BLOCK_SIZE = IMAGE_SIZE - IMAGE_PADDING * 2;

// Spezialfarben für Spezialsteine
const SPECIAL_COLORS = ['#ff00ff', '#00ffff', '#ffff00', '#ff8800', '#00ff55'];

function createCatSvg(role: CatRole): string {
    switch (role) {
        case 'head': return head;
        case 'body': return body;
        case 'body-side': return bodySide;
        case 'tail': return tail;
        case 'legs': return legs;
    }
}

export function drawCatBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    role: CatRole,
    special?: boolean
) {
    const key = `${special ? 'special-' : ''}${color}-${role}`;
    const img = renderedImages.get(key);

    if (img) {
        ctx.drawImage(
            img,
            x * BLOCK_SIZE - (IMAGE_PADDING * BLOCK_SIZE) / IMAGE_BLOCK_SIZE,
            y * BLOCK_SIZE - (IMAGE_PADDING * BLOCK_SIZE) / IMAGE_BLOCK_SIZE,
            (BLOCK_SIZE * IMAGE_SIZE) / IMAGE_BLOCK_SIZE,
            (BLOCK_SIZE * IMAGE_SIZE) / IMAGE_BLOCK_SIZE
        );
    }
}

export function preloadCatImages(pieces: { color: string; roles: (CatRole | null)[][] }[]): Promise<void> {
    const roles: CatRole[] = ['head', 'body', 'tail', 'legs', 'body-side'];
    const colors = pieces.map(p => p.color);
    const allCombinations = new Set<string>();

    // normale Farben
    colors.forEach(color => roles.forEach(role => allCombinations.add(`${color}-${role}`)));
    // Spezialfarben
    SPECIAL_COLORS.forEach(color => roles.forEach(role => allCombinations.add(`special-${color}-${role}`)));

    const promises: Promise<void>[] = [];

    for (const key of allCombinations) {
        let color: string;
        let role: string;

        if (key.startsWith('special-')) {
            const parts = key.replace('special-', '').split('-');
            color = parts[0];
            role = parts.slice(1).join('-');
        } else {
            [color, role] = key.split('-');
        }

        const svgString = createCatSvg(role as CatRole).replace('<svg', `<svg fill="${color}"`);
        const url = `data:image/svg+xml;base64,${btoa(svgString)}`;

        const promise = new Promise<void>(resolve => {
            const img = new Image();
            img.onload = () => {
                renderedImages.set(key, img);
                resolve();
            };
            img.src = url;
        });
        promises.push(promise);
    }

    return Promise.all(promises).then(() => {});
}

// --- NEU --- liefert zufällige Spezialfarbe
export function getRandomSpecialColor(): string {
    const i = Math.floor(Math.random() * SPECIAL_COLORS.length);
    return SPECIAL_COLORS[i];
}
