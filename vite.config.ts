import { defineConfig } from "vite";

export default defineConfig({
    root: "src",
    build: {
        outDir: "../dist",
        emptyOutDir: true
    },
    server: {
        host: true, // wichtig für Docker: bindet an 0.0.0.0
        port: 5173
    }
});
