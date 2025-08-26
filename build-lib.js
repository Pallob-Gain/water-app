// import { build, emptyDir } from "https://deno.land/x/dnt@0.37.0/mod.ts";
// import info from './package.json' with {type:'json'};

// await emptyDir("./npm");

// await build({
//   entryPoints: info.entryPoints,
//   outDir: "./npm",
//   test: false,
//   shims: {
//     deno: true,
//   },
//   package:info,
// //   postBuild() {
// //     Deno.copyFileSync("LICENSE", "npm/LICENSE");
// //     Deno.copyFileSync("README.md", "npm/README.md");
// //   },
// })