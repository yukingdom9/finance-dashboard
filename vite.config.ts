import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 制約1（architecture.md）：file:// で開いても動作する単一HTMLとしてビルドする。
// 外部通信を行わないため、開発時も含めCDN参照は行わない。
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100_000_000, // すべてインライン化（単一HTML化）
    cssCodeSplit: false,
    chunkSizeWarningLimit: 5000,
  },
});
