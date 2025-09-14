/*
import type { NHttp } from "jsr:@nhttp/nhttp@^2.0.2";
import * as esbuild from "npm:esbuild@0.25.5";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.11.1";
import type { JSX } from "npm:preact@10.26.8/jsx-runtime";
*/

//import * as esbuild from "https://deno.land/x/esbuild@v0.17.19/mod.js";
import * as esbuild from "esbuild"; //"https://deno.land/x/esbuild@v0.19.11/mod.js";
//import alias from 'npm:esbuild-plugin-alias@0.2.1';
//import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.7.0/mod.ts";
//import { denoPlugins } from "npm:@oazmi/esbuild-plugin-deno";
import { denoPlugins } from "esbuild_deno_loader"; //"https://deno.land/x/esbuild_deno_loader@0.8.5/mod.ts";
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
//import alias from 'npm:esbuild-plugin-alias';
import { loadAllModuleAlias, loadExportedAlias } from "../loader.js";
import global_share from "../global-share.js";

import { dummyPlugins, setImportMap } from './dummy-module-analyzers.js';
import { Buffer } from "node:buffer";
import alias from 'esbuild_plugin_alias';
import { resolveImportMap } from "deno-importmap";
import debugSys from '../debug.js';
//import { windowsPosixFilePlugin } from './windows_posix_file_plugin.js';

//throw "test error";

// await esbuild.initialize({
//   // create it's own worker thread
//   //worker: true,
//   wasmURL: import.meta.resolve('../tools/esbuild/esbuild.wasm'),
// });

const running_deno_config = path.join(Deno.cwd(), './deno.json'); //loading the running main dir
const running_file_exists = (await Deno.stat(running_deno_config).then(() => true).catch(() => false));

const [dummyResolver, dummyLoader] = dummyPlugins();

//windowsPosixFilePlugin(),
const all_resolvers = [dummyResolver];
const all_loaders = [dummyLoader];

//console.log('running_file_exists:',running_file_exists,running_deno_config);
//const importMapURL = import.meta.resolve('../../import_map.json');

const [mainAppResolver, mainAppLoader] = running_file_exists ? denoPlugins({ loader: 'native', configPath: running_deno_config }) : denoPlugins({ loader: 'native' });
all_resolvers.push(mainAppResolver);
all_loaders.push(mainAppLoader);

const config_details = running_file_exists ? (await import(pathToFileURL(running_deno_config), { with: { type: "json" } })).default : null;
//if not config file found then default config
const compilerOptions = null;
/*config_details?.config_details ?? {
  "jsx": "react",
  "jsxFactory": "React.createElement",
  "jsxFragmentFactory": "React.Fragment",
  "lib": ["dom", "DOM", "ES2016", "ES2017", "ES2018", "ES2019", "deno.window", "DOM.Iterable", "ES2022"]
};
*/
const extra_plugins = [];
if (running_file_exists && config_details) {
  const importMapBaseURL = new URL(pathToFileURL(running_deno_config));

  //console.log('config_details:',config_details);
  //console.log('importMapBaseURL:',importMapBaseURL);

  const resolvedImportMap = resolveImportMap(config_details, importMapBaseURL);
  setImportMap(resolvedImportMap);
}

//extra_plugins.push(await loadAllModuleAlias(import.meta.resolve('../../deno.json'),false));


const PageBounderCache = new Map(); //maps url to client path (caching will block to not hook the client path request)
const PageModuleCache = new Map(); //it will hold the compiled module code

export const urlToHash = (link) => {
  return createHash("sha256").update(link, "utf8").digest("hex");
}

export const getClientPath = (url) => {
  //console.log('url:',url);
  //get relative path from url by global_share?.__manifest?.app?.dir
  const appDir = global_share?.__appdir;
  if (!appDir) throw new Error('App directory not found in global space.');

  //console.log('appDir:',appDir);
  const relativePath = path.relative(appDir, fileURLToPath(url));
  //console.log('relativePath:',relativePath);
  const hash = urlToHash(relativePath);
  //console.log('hash:',hash);
  return `app.${hash}.build.js`;
}

export const ClearCache = (url) => {
  //TODO: for now clear all cache on WMR becaause, if child module clear, it will not idenitfy
  PageBounderCache.clear();
  PageModuleCache.clear();
  //console.log('All bundle cache cleared.');
  /*
  const clientPath = getClientPath(url);
  console.log('ClearCache URL:',url);
  console.log('ClearCache clientPath:',clientPath);
  PageModuleCache.delete(clientPath);
  */
}

export const cacheBundle = (clientPath, bundleCode) => {
  PageModuleCache.set(clientPath, bundleCode);
}


export function getCompiledBundle(clientPath) {
  if (!PageModuleCache.has(clientPath)) return null;
  return Buffer.from(PageModuleCache.get(clientPath));
}

export const makeBundle = async (url) => {
  const debug = global_share?.__manifest?.debug;
  const filePath = fileURLToPath(url);
  const dirPath = path.normalize(path.dirname(filePath));
  const fileName = path.basename(filePath);
  const fileNameWithoutExt = path.parse(fileName).name;

  //console.log('fileNameWithoutExt:',fileNameWithoutExt)
  //@mvc/water-app/helpers/client , ${import.meta.resolve('./client.js')}
  //auto hydrating build
  const refactored_code = `
          import withClient from '@mvc/water-app/helpers/client';
          import App from './${fileName}';
          export default withClient(App);
        `;

  const building_details = {
    format: "esm", //or "iife" for browser (esm is failling because meta import)
    //target: ["esnext"],
    platform: "browser",
    bundle: true,
    minify: !debug,
    //entryPoints: [url],
    stdin: {
      contents: refactored_code,
      resolveDir: dirPath, // base directory for relative imports
      sourcefile: `app-${fileNameWithoutExt}.js`, // name used in error messages
      loader: 'js',
    },
    resolveExtensions: [".ts", ".js", ".tsx", ".jsx", ".json"], // Add extensions to try
    plugins: [
      //SSRmoduleFilter,
      //default_alias,
      //exported_alias,
      // alias({
      //   "wcapp:client": path.resolve(fileURLToPath(import.meta.resolve('./client.js'))) //water client name space bunderler component
      // }),
      ...all_resolvers,
      ...all_loaders,
      //...plugin_setups,
      ...extra_plugins
    ],
    write: false,
    external: [
      "node:*", // Externalize node namespace
      "deno:*", // Externalize node namespace
      "app:*", // Externalize node namespace
      "wapp:*", // Externalize node namespace
    ],
    logLevel: debug ? 'info' : 'silent', // or 'info', 'warning', 'error', 'silent'
  };

  if (compilerOptions) Object.assign(building_details, compilerOptions);

  //caching
  const res = await esbuild.build(building_details);
  //esbuild.stop();

  //console.log('Compile done');

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(res.outputFiles[0].contents);
}


//it loads modules using app request
export const Bundler = (fileUrl) => {
  if (!fileUrl) return null;
  const url = fileUrl.href;

  //console.log('Meta URL:',url,url.slice(-32));

  if (!PageBounderCache.has(url)) {

    const clientPath = getClientPath(url);

    //console.log('Bundler clientPath:',clientPath);
    global_share.running_app.get(`/${clientPath}`, async (request, response) => {
      try {
        if (!PageModuleCache.has(clientPath)) {
          //console.log('Bundler esBuilder:',clientPath);
          //console.log('Bundler URL:',url);
          const bundleCode = await makeBundle(url);
          //console.log(bundleCode);
          cacheBundle(clientPath, bundleCode);
        }

        const jsCode = PageModuleCache.get(clientPath);

        //console.log('global_share?.__manifest?.production:',global_share?.__manifest?.production);

        // response.setHeader("content-type", "js");
        // response.setHeader("cache-control", "no-store");
        // response.send(PageModuleCache.get(clientPath));

        //console.log(PageModuleCache.get(clientPath));

        //global_share.__manifest.production then cache control will be store and permanent
        // Set proper headers
        response.set({
          'Content-Type': 'application/javascript',
          //'Content-Length': jsBuffer.length,
          "cache-control": "no-store"// global_share?.__manifest?.production ? "public, max-age=31536000" : "no-store"
        });

        //always no store becaause, we are using hash name and it is making problem when once we are using cache and then changing the code it is not updating

        response.send(jsCode);

        // rev.response.type("js");
        // rev.response.setHeader(
        //   "cache-control",
        //   "no-store",
        // );

        // //console.log('Sending bundle:',clientPath);

        // return PageModuleCache.get(clientPath);
      }
      catch (err) {
        debugSys.log('Bundling error:', err);
        response.status(500).send('Bundling error');
      }
    });

    PageBounderCache.set(url, clientPath);
  }

  //console.log('Bundle name sender:',PageBounderCache.get(url));

  //console.log('Bundle name sender:',PageBounderCache.get(url));
  return PageBounderCache.get(url);
};


//loads __bundles_dir from global share
export async function dirExists(path) {
  try {
    const info = await Deno.stat(path); // follows symlinks
    return info.isDirectory;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    throw err; // other errors bubble up (e.g., permissions)
  }
}

export async function loadAllBundles() {
  //console.log('Loading all bundles...');

  if (!global_share?.__bundles_dir) throw new Error('App bundles directory not found in global space.');
  const bundles_dir = global_share.__bundles_dir;
  if (!await dirExists(bundles_dir)) throw new Error('App bundles directory does not exist.');

  // Load all bundle files from the bundles directory
  const bundleFiles = await Deno.readDir(bundles_dir);
  for await (const file of bundleFiles) {
    if (file.isFile && file.name.endsWith('.js')) {
      const filePath = path.join(bundles_dir, file.name);
      const fileUrl = pathToFileURL(filePath);
      const clientPath = file.name; //file name is client path
      const bundle_js_code = await Deno.readTextFile(fileUrl);
      cacheBundle(clientPath, bundle_js_code);
      //console.log('Loading bundle:',  clientPath);
    }
  }
}