// src/catSvg.ts
export type CatRole = "head" | "body" | "tail" | "legs" | "body-side";

const renderedImages = new Map<string, HTMLImageElement>();
const BLOCK_SIZE = 30;

function createCatSvg(color: string, role: CatRole): string {
    const viewBox = "0 0 100 100";
    let path = "";

    switch (role) {
        case "head":
            // A more angular head with triangle ears and a defined snout area
            path = `
                <path d="M10 50 Q15 20 40 10 L50 10 L60 10 Q85 20 90 50 Q85 80 50 90 Q15 80 10 50 Z" fill="${color}" />
                <polygon points="40,10 50,0 50,10" fill="${color}" />
                <polygon points="60,10 50,0 50,10" fill="${color}" />
                <circle cx="45" cy="45" r="5" fill="#000" />
                <circle cx="55" cy="45" r="5" fill="#000" />
                <path d="M48 55 L50 60 L52 55" stroke="#000" stroke-width="2" fill="none" />
            `;
            break;
        case "body":
            // A simple, rounded square body
            path = `
                <rect x="10" y="10" width="80" height="80" rx="10" ry="10" fill="${color}" />
            `;
            break;
        case "body-side":
            // A rectangular body for horizontal pieces
            path = `
                <rect x="10" y="30" width="80" height="40" rx="10" ry="10" fill="${color}" />
            `;
            break;
        case "tail":
            // A simple, geometric tail that curls slightly
            path = `
                <path d="M20 90 Q30 40 70 50 L80 50" stroke="${color}" stroke-width="15" fill="none" stroke-linecap="round" />
            `;
            break;
        case "legs":
            // Simple rectangular leg shapes
            path = `
                <rect x="15" y="60" width="25" height="30" fill="${color}" />
                <rect x="60" y="60" width="25" height="30" fill="${color}" />
            `;
            break;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${path}</svg>`;
}

export function drawCatBlock(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, role: CatRole) {
    const key = `${color}-${role}`;
    const img = renderedImages.get(key);
    if (img) {
        ctx.drawImage(img, x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
}

export function preloadCatImages(pieces: { color: string; roles: (CatRole | null)[][] }[]): Promise<void> {
    const roles: CatRole[] = ["head", "body", "tail", "legs", "body-side"];
    const colors = pieces.map(p => p.color);
    const allCombinations = new Set<string>();
    colors.forEach(color => roles.forEach(role => allCombinations.add(`${color}-${role}`)));

    const promises: Promise<void>[] = [];

    for (const key of allCombinations) {
        const [color, role] = key.split('-');
        const svgString = createCatSvg(color, role as CatRole);
        const url = `data:image/svg+xml;base64,${btoa(svgString)}`;

        const promise = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
                renderedImages.set(key, img);
                resolve();
            };
            img.src = url;
        });
        promises.push(promise);
    }

    return Promise.all(promises).then(() => { });
}