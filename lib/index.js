import { createRequire } from 'node:module';
import debugSys from './debug.js';
import rest from './rest.js';
import {  includeApi, includeView, includeJson, extractJsonFile } from './include.js';
import webService from './webService.js';
import webView from './webView.js';
import { fileURLToPath, pathToFileURL } from 'node:url'
import path, { dirname } from 'node:path'
import open from 'open';
import { importModule,getDirname } from "./loader.js";
import global_share from "./global-share.js";
import {ClearCache} from './React/bundle.js';


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
    exitCode?Deno.exit(exitCode):Deno.exit();
  }
}

async function watchAndReload(modulePath,socketIO) {
  //$ deno run --watch-hmr

  const running_dir=path.resolve(modulePath);

  ///console.log(`Debug Watching ${running_dir} for changes...`);

  globalThis.addEventListener("hmr", (e) => {
    const meta_url=e.detail.path;

    //console.log(meta_url);

    const change_path=fileURLToPath(meta_url);
    const src = path.relative(running_dir,change_path); //remake path

    ClearCache(meta_url);
    //console.log("HMR triggered", change_path, src);
    socketIO.emit('hmr-reload',src);
  });

}


const WaterApp = (manifest_filename) => {
  //console.log(manifest_filename);
  const __dirname=getDirname(manifest_filename);
  let manifest_link=fileURLToPath(manifest_filename);
 
  //console.log('starting....',__dirname);

  const manifest = includeJson(manifest_link); //or direct object

  if (manifest == null) {
    throw new Error('No configuration file exists.');
  }

    //if the file and path attached with orginal device path.
  //that is harmful for security if orginal_path is true.
  //__dirname = 'orginal_path' in manifest && manifest.orginal_path ? __dirname : '';

  debugSys.mode(manifest.debug); //taking debug state from manifest.json

  // Handle application exit (before window unload)
  globalThis.addEventListener("beforeunload", () => exitHandler({ cleanup: true }));

  // Handle Uncaught Exceptions
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

  const __executedir = __dirname;
  const __version = manifest.version;
  const __name = manifest.name;
  const __appdir = path.join(__dirname, manifest.app.dir);
  const __apidir = path.join(__dirname, manifest.app.apidir);
  const __viewdir = path.join(__dirname, manifest.app.viewdir);
  const __links = path.join(__dirname, manifest.app.links);



  //used for holding all the data process variable arround scopes
  const __public_data = {
    //define a const function for objects
    assignConst: function (source) {
      for (let [key, value] of Object.entries(source)) {

        Object.defineProperty(this, key, {
          value,
          writable: false
        });

      }
    }

  };


  //console.log('starting....2');

  const __public_ledger = { debugSys, restSys: rest, appView, webService, require,  includeApi, includeView, includeJson, extractJsonFile, sleep, __manifest: manifest, __version, __name, __executedir, __appdir, __apidir, __viewdir, __links, __web: 'web' in manifest ? manifest.web : null, __desktop: 'desktop' in manifest ? manifest.desktop : null, __public_data };

  return new Promise((accept, reject) => {
   
   

    webService.open(__public_ledger, async (err, {info,socketIO})=> {
      if (err) return reject(err);

      //console.log('starting....4');
      
      //include main
       //console.log('starting....3');
    
    //adding to public ladger
    __public_ledger.socketIO = socketIO; //socketIO can be access directly

      debugSys.log("webService.open:", info);

      //run main app
      try {
        Object.assign(global_share,__public_ledger);

        //console.log('going 1');

        if(manifest?.app?.main){
          const fileUrl = pathToFileURL(path.resolve(path.join(__dirname, manifest.app.main)));
          const page_import = await import(fileUrl);
          if(!('default' in page_import))throw 'App main must  have default export!';
          const {default:page}=page_import;

          //console.log('going 2');

          if(typeof page =='function')await page(global_share);
          else throw 'App main default must be a function!';
        }
        if (manifest?.debug && manifest?.app?.dir) watchAndReload(path.join(__dirname, manifest.app.dir),socketIO);

        accept(global_share);
      }
      catch (err) {
       // console.log('going 3');

        if (webService) await webService.close();
        if (appView) await appView.close();
        reject(err);
        
        return; //exit system
      }

      if (__public_ledger.__desktop.auto_start) {
        try {
          let { browser, context } = await appView.open(info.link_local, 'title' in __public_ledger.__desktop ? __public_ledger.__desktop.title : __name, __public_ledger.__desktop.width, __public_ledger.__desktop.height, __executedir, __public_ledger.__desktop.engine, manifest);
          __public_ledger.desk_app = browser;
          __public_data.desk_app = browser;
          __public_ledger.desk_context = browser;
          __public_data.desk_context = context;

          global_share.desk_app = browser;
          global_share.desk_context = context;

          if (context) {
            //await context.overridePermissions(info.link, ['geolocation','midi','notifications','camera','microphone']);
          }

          appView.on('exit', async (code)=> {
            debugSys.log('Exiting Desk App:',code);
            Deno.exit(code);
          });

          appView.on('error', async (err)=> {
            debugSys.log('Desk App Error:',err);
            Deno.exit(-1);
          });

          appView.on('close', async (exitcode) =>{
            debugSys.log('Closing Desk App');
            await webService.close();
            Deno.exit(exitcode);
          });

          appView.on('disconnected', async ()=> {
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
      else if (__public_ledger.__web.auto_start) {
        await open(info.link, '_self');
      }

      
    });
  });
}

export default WaterApp;