import { createRequire } from 'node:module';
import debugSys from './debug.js';
import rest from './rest.js';
import { includeApi, includeView, includeJson, extractJsonFile } from './include.js';
import webService from './webService.js';
import webView from './webView.js';
import { fileURLToPath, pathToFileURL } from 'node:url'
import path, { dirname } from 'node:path'
import open from 'open';
import { importModule, getDirname } from "./loader.js";
import global_share from "./global-share.js";
import { ClearCache, loadAllBundles } from './React/bundle.js';
import process from "node:process";


//it is nessary to serve static files with express
// Patch Deno.stat to return Node-like objects
const originalStat = Deno.stat;
Deno.stat = async (path) => {
  const stat = await originalStat(path);
  return {
    ...stat,
    mtime: stat.modified || new Date(),
    mtimeMs: stat.modified ? new Date(stat.modified).getTime() : Date.now()
  };
};

const require = createRequire(import.meta.url);

const appView = new webView();
//sleep function
const sleep = function (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

let desk_app;


async function exitHandler(options, exitCode) {
  if (options.cleanup) {
    debugSys.log("Closing Application");
    if (desk_app) appView.close();
    await webService.close();
  }

  if (exitCode !== undefined) {
    debugSys.log(`exitCode:${exitCode}`);
  }

  if (options.exit) {
    await webService.close();
    await appView.close();
    exitCode ? Deno.exit(exitCode) : Deno.exit();
  }
}

function watchAndReload(modulePath, socketIO) {
  //$ deno run --watch-hmr

  const running_dir = path.resolve(modulePath);

  //console.log(`Debug Watching ${running_dir} for changes...`);

  globalThis.addEventListener("hmr", (e) => {
    try {
      const meta_url = e.detail.path;

      //console.log(meta_url);

      const change_path = fileURLToPath(meta_url);
      const src = path.relative(running_dir, change_path); //remake path

      ClearCache(meta_url);
      //console.log("HMR triggered", change_path, src);
      socketIO.emit('hmr-reload', src);
    }
    catch (err) {
      debugSys.error('HMR Error:', err);
    }
  });

}

export const initializeManifest = (manifest_filename) => {
  //console.log(manifest_filename);
  const __dirname = getDirname(manifest_filename);
  let manifest_link = fileURLToPath(manifest_filename);

  //console.log('starting....',__dirname);

  const manifest = includeJson(manifest_link); //or direct object

  if (manifest == null) {
    throw new Error('No configuration file exists.');
  }

  //if the file and path attached with orginal device path.
  //that is harmful for security if orginal_path is true.
  //__dirname = 'orginal_path' in manifest && manifest.orginal_path ? __dirname : '';

  debugSys.mode(manifest.debug); //taking debug state from manifest.json

  const __executedir = __dirname;
  const __version = manifest.version;
  const __name = manifest.name;
  const __appdir = path.join(__dirname, manifest.app.dir);
  const __apidir = path.join(__dirname, manifest.app.apidir);
  const __viewdir = path.join(__dirname, manifest.app.viewdir);
  const __links = path.join(__dirname, manifest.app.links);
  const __bundles_dir = path.join(__dirname, '.wapp', 'bundles');
  const isStandalone = Deno.build.standalone;

  const ledger = {
    debugSys, restSys: rest, appView, webService, require, includeApi, includeView, includeJson, extractJsonFile, sleep, __manifest: manifest, __version, __name, __executedir, __appdir, __apidir, __viewdir, __links, __bundles_dir, __web: 'web' in manifest ? manifest.web : null, __desktop: 'desktop' in manifest ? manifest.desktop : null, isStandalone
  };

  return global_share.assignConst(ledger);
}

const WaterApp = (manifest_filename) => {
  const __dirname = getDirname(manifest_filename);
  // Handle application exit (before window unload)
  globalThis.addEventListener("beforeunload", () => exitHandler({ cleanup: true }));

  // Handle Uncaught Exceptions
  process.on('uncaughtException', (err) => {
    debugSys.error("Process Uncaught Exception:", err);
  });

  globalThis.addEventListener("error", (event) => {
    debugSys.error("Uncaught Exception:", event.error);
  });

  // Windows SIGINT Handling (Deno automatically supports SIGINT)
  if (Deno.build.os === "windows") {
    // Handle Ctrl+C (SIGINT)
    Deno.addSignalListener("SIGINT", () => exitHandler({ exit: true }));
  }
  else {
    // Handle termination signals (like `kill pid`)
    Deno.addSignalListener("SIGUSR1", () => exitHandler({ exit: true }));
    Deno.addSignalListener("SIGUSR2", () => exitHandler({ exit: true }));
  }



  //console.log('starting....2');
  const manifest_ladger = initializeManifest(manifest_filename);
  const { __manifest, __name, __executedir } = manifest_ladger;

  return new Promise((accept, reject) => {


    webService.open(manifest_ladger, async (err, data_info) => {
      if (err) return reject(err);
      const { info, socketIO } = data_info;

      //console.log('starting....4');

      //include main
      //console.log('starting....3');

      //adding to public ladger
      global_share.assignConst({ socketIO }); //socketIO can be access directly

      debugSys.log("webService.open:", info);

      //run main app
      try {

        if (global_share.isStandalone) {
          //in standalone exe file we need to load all bundles on start
          await loadAllBundles(); //load all available bundles
        }
        //console.log('going 1');

        if (__manifest?.app?.main) {
          const fileUrl = pathToFileURL(path.resolve(path.join(__dirname, __manifest.app.main)));
          const page_import = await import(fileUrl);
          if (!('default' in page_import)) throw 'App main must  have default export!';
          const { default: page } = page_import;

          //console.log('going 2');

          if (typeof page == 'function') await page(global_share);
          else throw 'App main default must be a function!';
        }

        if (!global_share.isStandalone && !__manifest?.production && __manifest?.app?.dir) watchAndReload(path.join(__dirname, __manifest.app.dir), socketIO);

        accept(global_share);
      }
      catch (err) {
        // console.log('going 3');

        if (webService) await webService.close();
        if (appView) await appView.close();
        reject(err);

        return; //exit system
      }

      if (global_share.__desktop.auto_start) {
        try {
          let { browser, context } = await appView.open(info.link_local, 'title' in global_share.__desktop ? global_share.__desktop.title : __name, global_share.__desktop.width, global_share.__desktop.height, __executedir, global_share.__desktop.engine, __manifest);

          global_share.assignConst({ desk_app: browser, desk_context: context });

          if (context) {
            //await context.overridePermissions(info.link, ['geolocation','midi','notifications','camera','microphone']);
          }

          appView.on('exit', async (code) => {
            debugSys.log('Exiting Desk App:', code);
            Deno.exit(code);
          });

          appView.on('error', async (err) => {
            debugSys.log('Desk App Error:', err);
            Deno.exit(-1);
          });

          appView.on('close', async (exitcode) => {
            debugSys.log('Closing Desk App');
            await webService.close();
            Deno.exit(exitcode);
          });

          appView.on('disconnected', async () => {
            debugSys.log('Disconnected Desk App');
            await webService.close();
            await appView.close();
            Deno.exit(0);
          });
        }
        catch (err) {
          debugSys.error(err);
          Deno.exit(-1);
        }
      }
      else if (global_share.__web.auto_start) {
        await open(info.link, '_self');
      }


    });
  });
}

export default WaterApp;