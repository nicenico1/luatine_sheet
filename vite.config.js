import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    plugins: [svelte()],
    base: '/luatine_sheet/',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
});
