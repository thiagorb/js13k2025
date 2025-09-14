import { defineConfig } from 'vite';
import svgo from 'vite-plugin-svgo';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
    root: 'src',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
    server: {
        host: true, // wichtig für Docker: bindet an 0.0.0.0
        port: 5173,
    },
    plugins: [
        viteSingleFile(),
        svgo({
            multipass: true,
            plugins: [
                {
                    name: 'preset-default',
                    params: {
                        overrides: {
                            convertColors: {
                                currentColor: true,
                            },
                        },
                    },
                },
                { name: 'removeViewBox' },
                { name: 'removeDimensions' },
                {
                    name: 'cleanupNumericValues',
                    params: { floatPrecision: 0 },
                },
                {
                    name: 'convertPathData',
                    params: { floatPrecision: 0 },
                },
            ],
        }),
    ],
});
