import fs from 'fs/promises';

const svgInput = await fs.readFile('cat_walk_opt.svg', 'utf8');

// --- SVG PATH PARSER ------------------------------------------------------
function parsePath(d) {
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[+-]?\d+)?/gi);
    const instr = [];
    let i = 0,
        cx = 0,
        cy = 0,
        sx = 0,
        sy = 0;
    let prevCmd = '';
    let lastControlX = null,
        lastControlY = null;

    const nextNum = () => Math.round(parseFloat(tokens[i++]));

    while (i < tokens.length) {
        let cmd = tokens[i++];
        if (!/[a-zA-Z]/.test(cmd)) {
            // Implicit command repetition
            i--;
            cmd = prevCmd;
        }
        prevCmd = cmd;

        switch (cmd) {
            // Move --------------------------------------------------------
            case 'M':
                cx = nextNum();
                cy = nextNum();
                sx = cx;
                sy = cy;
                instr.push(`ctx.moveTo(${cx}, ${cy});`);
                break;
            case 'm':
                cx += nextNum();
                cy += nextNum();
                sx = cx;
                sy = cy;
                instr.push(`ctx.moveTo(${cx}, ${cy});`);
                break;

            // Line --------------------------------------------------------
            case 'L':
                cx = nextNum();
                cy = nextNum();
                instr.push(`ctx.lineTo(${cx}, ${cy});`);
                break;
            case 'l':
                cx += nextNum();
                cy += nextNum();
                instr.push(`ctx.lineTo(${cx}, ${cy});`);
                break;
            case 'H':
                cx = nextNum();
                instr.push(`ctx.lineTo(${cx}, ${cy});`);
                break;
            case 'h':
                cx += nextNum();
                instr.push(`ctx.lineTo(${cx}, ${cy});`);
                break;
            case 'V':
                cy = nextNum();
                instr.push(`ctx.lineTo(${cx}, ${cy});`);
                break;
            case 'v':
                cy += nextNum();
                instr.push(`ctx.lineTo(${cx}, ${cy});`);
                break;

            // Cubic Bézier ------------------------------------------------
            case 'C': {
                const x1 = nextNum(),
                    y1 = nextNum();
                const x2 = nextNum(),
                    y2 = nextNum();
                const x = nextNum(),
                    y = nextNum();
                instr.push(`ctx.bezierCurveTo(${x1}, ${y1}, ${x2}, ${y2}, ${x}, ${y});`);
                lastControlX = x2;
                lastControlY = y2;
                cx = x;
                cy = y;
                break;
            }
            case 'c': {
                const x1 = cx + nextNum(),
                    y1 = cy + nextNum();
                const x2 = cx + nextNum(),
                    y2 = cy + nextNum();
                const x = cx + nextNum(),
                    y = cy + nextNum();
                instr.push(`ctx.bezierCurveTo(${x1}, ${y1}, ${x2}, ${y2}, ${x}, ${y});`);
                lastControlX = x2;
                lastControlY = y2;
                cx = x;
                cy = y;
                break;
            }
            case 'S': {
                let x1 = cx,
                    y1 = cy;
                if (prevCmd === 'C' || prevCmd === 'c' || prevCmd === 'S' || prevCmd === 's') {
                    x1 = 2 * cx - lastControlX;
                    y1 = 2 * cy - lastControlY;
                }
                const x2 = nextNum(),
                    y2 = nextNum();
                const x = nextNum(),
                    y = nextNum();
                instr.push(`ctx.bezierCurveTo(${x1}, ${y1}, ${x2}, ${y2}, ${x}, ${y});`);
                lastControlX = x2;
                lastControlY = y2;
                cx = x;
                cy = y;
                break;
            }
            case 's': {
                let x1 = cx,
                    y1 = cy;
                if (prevCmd === 'C' || prevCmd === 'c' || prevCmd === 'S' || prevCmd === 's') {
                    x1 = 2 * cx - lastControlX;
                    y1 = 2 * cy - lastControlY;
                }
                const x2 = cx + nextNum(),
                    y2 = cy + nextNum();
                const x = cx + nextNum(),
                    y = cy + nextNum();
                instr.push(`ctx.bezierCurveTo(${x1}, ${y1}, ${x2}, ${y2}, ${x}, ${y});`);
                lastControlX = x2;
                lastControlY = y2;
                cx = x;
                cy = y;
                break;
            }

            // Quadratic Bézier --------------------------------------------
            case 'Q': {
                const x1 = nextNum(),
                    y1 = nextNum();
                const x = nextNum(),
                    y = nextNum();
                instr.push(`ctx.quadraticCurveTo(${x1}, ${y1}, ${x}, ${y});`);
                lastControlX = x1;
                lastControlY = y1;
                cx = x;
                cy = y;
                break;
            }
            case 'q': {
                const x1 = cx + nextNum(),
                    y1 = cy + nextNum();
                const x = cx + nextNum(),
                    y = cy + nextNum();
                instr.push(`ctx.quadraticCurveTo(${x1}, ${y1}, ${x}, ${y});`);
                lastControlX = x1;
                lastControlY = y1;
                cx = x;
                cy = y;
                break;
            }
            case 'T': {
                let x1 = cx,
                    y1 = cy;
                if (prevCmd === 'Q' || prevCmd === 'q' || prevCmd === 'T' || prevCmd === 't') {
                    x1 = 2 * cx - lastControlX;
                    y1 = 2 * cy - lastControlY;
                }
                const x = nextNum(),
                    y = nextNum();
                instr.push(`ctx.quadraticCurveTo(${x1}, ${y1}, ${x}, ${y});`);
                lastControlX = x1;
                lastControlY = y1;
                cx = x;
                cy = y;
                break;
            }
            case 't': {
                let x1 = cx,
                    y1 = cy;
                if (prevCmd === 'Q' || prevCmd === 'q' || prevCmd === 'T' || prevCmd === 't') {
                    x1 = 2 * cx - lastControlX;
                    y1 = 2 * cy - lastControlY;
                }
                const x = cx + nextNum(),
                    y = cy + nextNum();
                instr.push(`ctx.quadraticCurveTo(${x1}, ${y1}, ${x}, ${y});`);
                lastControlX = x1;
                lastControlY = y1;
                cx = x;
                cy = y;
                break;
            }

            // Close -------------------------------------------------------
            case 'Z':
            case 'z':
                instr.push('ctx.closePath();');
                cx = sx;
                cy = sy;
                break;
        }
    }
    return instr;
}

// --- MAIN FUNCTION --------------------------------------------------------
function svgToInstructions(svgString) {
    const pathRegex = /<path\b[^>]*>/gi;
    const attr = (tag, name) => {
        const m = new RegExp(`${name}="([^"]*)"`, 'i').exec(tag);
        return m ? m[1] : null;
    };

    const result = ['export default function(ctx) {'];

    let match;
    while ((match = pathRegex.exec(svgString))) {
        const tag = match[0];
        const d = attr(tag, 'd');
        if (!d) continue;

        const fill = attr(tag, 'fill');
        if (fill && fill !== 'none') result.push(`ctx.fillStyle = '${fill}';`);

        const stroke = attr(tag, 'stroke');
        if (stroke && stroke !== 'none') result.push(`ctx.strokeStyle = '${stroke}';`);

        result.push(`ctx.beginPath();`);
        result.push(...parsePath(d));

        if (fill && fill !== 'none') result.push(`ctx.fill();`);
        if (stroke && stroke !== 'none') result.push(`ctx.stroke();`);
    }

    result.push('}');

    return result;
}

// --- RUN WITH EXAMPLE -----------------------------------------------------
const instructions = svgToInstructions(svgInput);
console.log(instructions.join('\n'));
