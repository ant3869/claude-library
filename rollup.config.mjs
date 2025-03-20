import typescript from "rollup-plugin-typescript2";
import postcss from "rollup-plugin-postcss";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.js",
      format: "cjs",
      sourcemap: true,
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true,
    }
  ],
  plugins: [
    peerDepsExternal(),
    typescript({
      tsconfig: "./tsconfig.json",
    }),
    postcss()
  ],
  external: ["react", "react-dom"]
};
