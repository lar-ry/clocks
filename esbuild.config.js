const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["src/extension.ts"], // 你的入口文件
    bundle: true,
    platform: "node",
    target: "node18",
    outfile: "out/extension.js",
    external: ["vscode"], // VS Code 自带模块不打包
    minify: true,
    sourcemap: false,
  })
  .catch(() => process.exit(1));
