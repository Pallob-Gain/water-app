import webview_suchipi from "suchipi-webview";
import debugSys from './debug.js';
import puppeteer from 'puppeteer-core';
import { URL, fileURLToPath } from 'node:url';
import path from 'node:path';
//import child_process from 'node:child_process';
import chromePaths from 'chrome-paths';
import * as edgePaths from 'edge-paths';
import { copy } from "@std/fs/copy";
//import { cwd } from "node:process";
import process from "node:process";
import ProcessHandler from './ProcessHandler.js';
//import ResourceModifier from "./tools/ResourceHacker.exe" with {type: "bytes"};
//import rcedit from 'rcedit';
//import * as ResEdit from 'resedit';
//import * as PELibrary from 'pe-library';
//import resedit from 'resedit-cli';

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);

//app running dir: TODO
//const appDir = Deno.cwd();



function isCurrentUserRoot() {
    return process.getuid() == 0; // UID 0 is always root
}

class webViewEngine {
    worker;
    closeCallbacks = [];
    errorCallbacks = [];

    constructor(link) {
        const worker = new Worker(link, {
            type: "module",
        });

        worker.onmessage = (e) => {
            if ('data' in e) {
                const data = e.data;
                if ('exitCode' in data) {
                    this.close(data.exitCode);
                }
                if ('error' in data) {
                    this.error(data.error);
                }
            }
        };

        worker.onerror = (err) => {
            this.error(err);
        }

        this.worker = worker;
    }

    send(data) {
        this.worker.postMessage(data);
    }

    on(name, cb) {
        if (name == 'close') this.closeCallbacks.push(cb);
        else if (name == 'error') this.errorCallbacks.push(cb);
    }

    error(err) {
        for (const cb of this.errorCallbacks) {
            cb(err);
        }
    }

    close(exitCode = 0) {
        for (const cb of this.closeCallbacks) {
            cb(exitCode);
        }
    }
}

// function watchAllPages(context, onPage) {
//     const browser = context.browser();
//     //const seen = new Set();

//     async function handlePage(page) {
//         console.log("--->Page detected:", page.url());
//         if (!page) return;
//         const url = page.url();
//         //if (seen.has(url)) return;
//         //seen.add(url);
//         await onPage(page);
//     }

//     async function handleTarget(target) {
//         console.log("--->Target detected:", target.url(), target.type());
//         if (target.type() !== "page") return;
//         const page = await target.page();
//         await handlePage(page);
//     }

//     // 1) Existing pages (covers the very first page)
//     context.pages().then(pages => pages.forEach(handlePage)).catch(() => { });

//     // 2) Future pages
//     browser.on("targetcreated", handleTarget);

//     // 3) Optional: also catch navigations / url changes early
//     browser.on("targetchanged", handleTarget);

//     // Return an unsubscribe function
//     return () => {
//         browser.off("targetcreated", handleTarget);
//         browser.off("targetchanged", handleTarget);
//     };
// }

let instant;
export default class webView {

    async open(link, title, width, height, rundir = "", engine = "webview", info) {

        //console.log("testing ------------------>>>>>>>>",rundir);

        let appName = info && 'name' in info ? info.name.replaceAll(' ', '-') : null;
        let kiosk = (info && 'fullscreen' in info.desktop && info.desktop.fullscreen) ? true : false;
        const url = new URL(link);

        //console.log('Url Origin:', url.origin);

        //console.log('APP NAME -------->'+appName);

        const extra_args = [];
        let edge_auto = false;

        const tempDir = Deno.env.get("TMPDIR") || Deno.env.get("TEMP") || Deno.env.get("TMP") || "/tmp";

        const target_dirname = path.join(tempDir, appName);

        if (engine == null || engine == "auto") {
            //  const win = new Deno.BrowserWindow({ title: "My App" });
            // return win;

            if (Deno.build.os == 'linux') {
                engine = 'chromium' in chromePaths && chromePaths.chromium ? chromePaths.chromium : "chromium";// "/usr/bin/chromium"; //the default browser for windows
            }
            else if (Deno.build.os == 'windows') {

                //console.log('test:',edgePaths.getEdgePath());

                engine = edgePaths.getEdgePath(); //the default browser for windows

                extra_args.push("--no-sandbox");
                extra_args.push("--disabled-setupid-sandbox");

                edge_auto = true;
            }
        }
        else if (engine === "webview") {

            //copy program
            const webvview_filename = 'webview.exe';
            const web_view_link = path.join(target_dirname, webvview_filename);
            //const web_view_dll = path.join(tempDir, appName, 'webview.dll');

            const window_icon_replace = async (_exe_link) => {
                if (info?.desktop && 'icon' in info.desktop && Deno.build.os == 'windows') {
                    //icon replace in the exe
                    const icon_link = path.resolve(rundir, info.desktop.icon);
                    const ext = path.extname(icon_link);
                    const app_icon_name = `app-icon${ext}`;
                    const web_view_icon = path.join(target_dirname, app_icon_name);
                    await Deno.copyFile(icon_link, web_view_icon); //copy icons


                    const args = Object.entries({
                        open: webvview_filename,
                        save: webvview_filename,
                        action: 'addoverwrite',
                        res: app_icon_name,
                        mask: 'ICONGROUP,1,0',
                    }).flatMap(([key, val]) => [`-${key}`, String(val)]);

                    //console.log('Args:',args);

                    const command = new Deno.Command('./ResourceHacker.exe', {
                        args,
                        cwd: path.resolve(target_dirname),
                        stdin: 'piped',
                        stdout: info?.debug ? 'piped' : 'null',
                        stderr: 'piped',
                    });

                    const process = command.spawn();
                    const { code } = await process.status;
                    //console.log('close:', code);
                    if (code < 0) throw new Error('Error in starting webview icon');

                    // console.log('Icon replaced');
                }
            }

            let already_icon_replaced = false;

            const final_link = await Deno.stat(web_view_link).then(_stats => {
                return web_view_link;
            }).catch(async error => {
                if (error instanceof Deno.errors.NotFound) {
                    //console.log("File does not exist");
                    const source_dirname = path.dirname(webview_suchipi.binaryPath);
                    await Deno.mkdir(target_dirname, { recursive: true });
                    await copy(source_dirname, target_dirname, { overwrite: true });

                    if (info?.desktop && 'icon' in info.desktop && Deno.build.os == 'windows') {
                        //TODO: When raw imports will be stablized
                        // await Deno.writeFile(path.join(target_dirname, './ResourceHacker.exe'), ResourceModifier, {
                        //     create: true,     // create if not exists
                        //     write: true,      // allow writing
                        //     truncate: true    // clear existing file before writing
                        // });
                        await Deno.copyFile(fileURLToPath(import.meta.resolve('./tools/ResourceHacker.exe')), path.join(target_dirname, './ResourceHacker.exe'));
                    }

                    await window_icon_replace(web_view_link);
                    already_icon_replaced = true;

                    return web_view_link;
                } else {
                    // Other unexpected errors
                    throw error;
                }
            });

            if (!already_icon_replaced && !(info?.production)) {
                //if not in production then replace the icon
                await window_icon_replace(final_link);
            }

            //console.log('link:', final_link);

            const args = webview_suchipi.optionsToArgv({
                title,
                width,
                height,
                url: link,
                cwd: Deno.cwd(),
            });

            const webview_process = new ProcessHandler(final_link, {
                args,
                cwd: Deno.cwd(),
                stdin: "piped",
                stdout: "piped",
                stderr: "piped",
            });


            debugSys.log('Webview PID:', webview_process.pid);

            instant = webview_process;

            return { browser: webview_process, context: null };
        }
        else if (['chrome', 'chromium'].includes(engine)) {
            engine = chromePaths[engine];
            //check if the path is exists
            if (!(await Deno.stat(engine).then(_stats => true).catch(_err => false))) {
                throw new Error(`The specified engine "${engine}" was not found on the system.`);
            }
        }

        //console.log('Testing 1');
        const app_cache_link = path.join(target_dirname, '/webviewCache/');
        await Deno.mkdir(app_cache_link, { recursive: true });

        //console.log({rundir,process_dir:process.cwd(),app_cache_link});

        //TODO: error fixing require at the very fast time puppeteer launch failed
        /*
            Error: Failed to launch the browser process!
        */

        let args = [
            // `--user-data-dir='${app_cache_link}'`,
            `--app=${url.origin}`, //hide address bar open with default link
            '--start-maximized',

            '--disable-session-crashed-bubble',
            '--no-default-browser-check',
            '--no-first-run',
            '--allow-hidden-media-playback',
            '--enable-media-stream',
            '--alsa-input-device',
        ];

        args = [...args, ...extra_args];

        //console.log('User ID:'+process.getuid());
        if (Deno.build.os == 'linux' && isCurrentUserRoot()) {

            //console.log('Root user');

            args.push('--single-process');
            args.push('--no-sandbox');
            args.push('--no-zygote');
        }

        let permissions;

        if ('desktop' in info && 'permissions' in info.desktop) {
            permissions = info.desktop.permissions;

        }
        //https://peter.sh/experiments/chromium-command-line-switches/
        args = [...args, ...[
            '--disable-web-security',
            '--test-type', //esential to remove the warnning banners
            `--unsafely-treat-insecure-origin-as-secure=${url.origin}`,
            '--allow-running-insecure-content',
            '--reduce-security-for-testing',
            '--disable-default-apps',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--allow-insecure-localhost',
            "--enable-features=ClipboardReadWrite,ClipboardAccess",
            '--disable-features=RendererCodeIntegrity,IsolateOrigins,site-per-process',
            '--disable-infobars',
            '--disable-safebrowsing',
            '--disable-extensions',
        ]];

        if (!edge_auto) args.push(...[
            "--enable-chrome-browser-cloud-management", //test for: --enable-automation 
        ]);

        if (width != null && height != null) {
            args.push(`--window-size=${width},${height}`);
        }
        if ('fullscreen' in info.desktop && info.desktop.fullscreen) args.push(`--start-fullscreen`);

        const ignoreDefaultArgs = [
            "--enable-blink-features=IdleDetection",
            '--mute-audio',
            '--disable-audio-input',
        ];

        //if (!edge_auto) 
        ignoreDefaultArgs.push(...[
            "--enable-automation", //hide chromium control bar
        ]);

        if ('developer' in info.desktop && info.desktop.developer) {
            args.push('--auto-open-devtools-for-tabs');
        }

        args.push(`--user-data-dir=${app_cache_link}`);

        const webview_process = new ProcessHandler(engine, {
            args,
            cwd: Deno.cwd(),
            stdin: "piped",
            stdout: "piped",
            stderr: "piped",
        });


        debugSys.log('Webview PID:', webview_process.pid);

        instant = webview_process;

        return { browser: webview_process, context: null };

        /*
        const options = {
            executablePath: engine,
            devtools: 'developer' in info.desktop ? info.desktop.developer : false,
            headless: false,
            ignoreHTTPSErrors: true,
            ExperimentalOption: true,
            excludeSwitches: [
                "enable-automation"
            ],
            useAutomationExtension: false,
            userDataDir: app_cache_link,
            //dumpio: true,
            args: args,
            ignoreDefaultArgs,
            prefs: {
                exited_cleanly: true,
                exit_type: 'Normal'
            },
            defaultViewport: null,
            appMode: true
        };


        try {

            const browser = await puppeteer.launch(options);
            const context = browser.defaultBrowserContext();
            
            if (permissions) {
                await context.clearPermissionOverrides();
                //['geolocation','midi','notifications','camera','microphone']
                await context.overridePermissions(url.origin, permissions);
            }

          

            instant = browser.process();
            return { browser: browser.process(), context };
        }
        catch (err) {
            throw err;
        }
            */

    }

    close() {

        if (instant) {

            if ('exit' in instant) {
                //console.log('closeing test 0');
                instant.exit();
            }
            else if ('close' in instant) {
                //console.log('closeing test 1');
                instant.close();
            }
            else if ('kill' in instant) {
                //console.log('closeing test 2');

                instant.kill();
                instant.kill('SIGINT');
                instant.kill('SIGKILL');
                instant.kill('SIGTERM');
            }
        }
    }

    on(event, callback) {
        if (instant && 'on' in instant) {
            instant.on(event, callback);
        }
    }
}