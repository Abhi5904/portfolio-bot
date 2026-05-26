import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/queues/worker.ts"],
  outDir: "dist",
  format: ["esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  target: "node22",
  treeshake: true,
  minify: false,
  esbuildOptions(options) {
    options.alias = { "@": "./src" };
  },
});
