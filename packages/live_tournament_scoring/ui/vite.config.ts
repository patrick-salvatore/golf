import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [solidPlugin(), tsconfigPaths()],
  server: {
    port: 3000,
    proxy: {
      "/v1": {
        target: "http://127.0.0.1:8090",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: "esnext",
    outDir: "build/client", // this sets the output directory
  },
});
