import webview_suchipi from "suchipi-webview";
import puppeteer from 'puppeteer-core';
import { URL, fileURLToPath } from 'node:url';
import path from 'node:path';
import child_process from 'node:child_process';
import chromePaths from 'chrome-paths';
import * as edgePaths from 'edge-paths';
import { copy } from "@std/fs/copy";
//import { cwd } from "node:process";
import process from "node:process";
//import ResourceModifier from "./tools/ResourceHacker.exe" with {type: "bytes"};
//import rcedit from 'rcedit';
//import * as ResEdit from 'resedit';
//import * as PELibrary from 'pe-library';
//import resedit from 'resedit-cli';

//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);

//app running dir: TODO
//const appDir = Deno.cwd();


let instant;

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

export default class webView {

    async open(link, title, width, height, rundir = "", engine = "webview", info) {

        //console.log("testing ------------------>>>>>>>>",rundir);

        let appName = info && 'name' in info ? info.name.replaceAll(' ', '-') : null;
        let kiosk = (info && 'fullscreen' in info.desktop && info.desktop.fullscreen) ? true : false;
        const url = new URL(link);

        //console.log('APP NAME -------->'+appName);

        const extra_args = [];
        let edge_auto = false;

        if (engine == null || engine == "auto") {
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
            const tempDir = Deno.env.get("TMPDIR") || Deno.env.get("TEMP") || Deno.env.get("TMP") || "/tmp";

            const target_dirname = path.join(tempDir, appName);
            const web_view_link = path.join(target_dirname, 'webview.exe');
            //const web_view_dll = path.join(tempDir, appName, 'webview.dll');

            const window_icon_replace = async (_exe_link) => {
                if (info?.desktop && 'icon' in info.desktop && Deno.build.os == 'windows') {
                    //icon replace in the exe
                    const icon_link = path.resolve(rundir, info.desktop.icon);
                    const ext = path.extname(icon_link);
                    const web_view_icon = path.join(target_dirname, `app-icon${ext}`);
                    await Deno.copyFile(icon_link, web_view_icon); //copy icons


                    const args = Object.entries({
                        open: `"${web_view_link}"`,
                        save: `"${web_view_link}"`,
                        action: 'addoverwrite',
                        res: `"${web_view_icon}"`,
                        mask: 'ICONGROUP,1,0',
                    }).map(([key, val]) => `-${key} ${val}`);


                    await new Promise((accept, reject) => {
                        //`"${path.join(target_dirname,'./ResourceHacker.exe')}" ${args.join(' ')}`
                        //path.join(target_dirname,'./ResourceHacker.exe'),args

                        const pross = child_process.spawn(path.join(target_dirname, './ResourceHacker.exe'), args, {
                            cwd: path.resolve(target_dirname),
                            windowsHide: true,
                            stdio: 'inherit',
                            shell: true
                        });


                        pross.on('close', (exitCode) => {
                            //console.log('close:',exitCode);
                            if (exitCode < 0) return reject('Error in starting webview icon');
                            accept(exitCode);
                        });

                        pross.on('data', (data) => {
                            //console.log('data:',data);
                        });

                        pross.on('error', (err) => {
                            //console.log('err:',err);
                            reject(err);
                        });

                    });

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

            const webview_process = child_process.spawn(final_link, webview_suchipi.optionsToArgv({
                title: title,
                width: width,
                height: height,
                url: link,
                cwd: Deno.cwd(),
            }),
                {
                    cwd: Deno.cwd(),
                    windowsHide: true,
                    stdio: 'inherit',
                    shell: false
                });

            // console.log('webview_process.pid:',webview_process.pid);
            // webview_process.on('error', (err) => {
            //     // This will be called with err being an AbortError if the controller aborts
            //     console.log('Error:',err);
            // });

            webview_process.exit = async () => {
                if (Deno.build.os == 'windows') {

                    const taskkillProcess = Deno.run({
                        cmd: ["taskkill", "/pid", webview_process.pid, "/f"],
                        stdin: "piped",
                        stdout: "piped",
                    });

                    // console.log('closing trigger');
                }
                else {
                    const taskkillProcess = Deno.run({
                        cmd: ["pkill", "-9", webview_process.pid],
                        stdin: "piped",
                        stdout: "piped",
                    });
                }
            };

            instant = webview_process;

            /*
            const command = new Deno.Command(final_link, {
                args: webview_suchipi.optionsToArgv({
                    title: title,
                    width: width,
                    height: height,
                    url: link,
                    cwd: Deno.cwd(),
                }), // Optional arguments
                stdout: "inherit",
                stdin: "inherit",
                stderr: "inherit",
                cwd: Deno.cwd(),
                });

            instant = command.spawn();
            */

            return { browser: webview_process, context: null };

            /*
            const child = await webview_suchipi.spawn({
                // options for webview
                title: title,
                width: width,
                height: height,
                url: link,
                // options for child_process.spawn
                cwd: rundir != "" ? rundir : Deno.cwd(),
            }, {
                stdio: 'inherit',
                shell: true
            });

            instant = child;

            return { browser: child, context: null };
            */


            /*
            const cp_process = await fork(import.meta.resolve('./webViewEngine.v2.js'));

            cp_process.on('message', (data) => {
                //console.log('Exiting==>');
                if ('exitCode' in data) {
                    this.close();
                }
            });

            cp_process.send({
                title: title,
                icon: 'icon' in info.desktop ? path.resolve(appDir, info.desktop.icon) : null,
                width: width,
                height: height,
                link: url.origin
            });

            instant = cp_process;

            return { browser: cp_process, context: null };
            */

            /*
            let engine = new webViewEngine(import.meta.resolve('./webViewEngine.js'));

            engine.send({
                debug:info.debug,
                title: title,
                icon: 'icon' in info.desktop ? path.resolve(appDir, info.desktop.icon) : null,
                width: width,
                height: height,
                link: url.origin
            });

            instant = engine;
            return { browser: engine, context: null };
            */
        }
        else if (['chrome', 'chromium'].includes(engine)) {
            engine = chromePaths[engine];
        }

        //console.log('Testing 1');
        let app_cache_link = path.join(rundir.length > 0 ? rundir : Deno.cwd(), '/webviewCache/');
        app_cache_link = app_cache_link.trim();

        //console.log({rundir,process_dir:process.cwd(),app_cache_link});

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
            '--disable-features=RendererCodeIntegrity',
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
            /*
            | 'geolocation'
            | 'midi'
            | 'notifications'
            | 'camera'
            | 'microphone'
            | 'background-sync'
            | 'ambient-light-sensor'
            | 'accelerometer'
            | 'gyroscope'
            | 'magnetometer'
            | 'accessibility-events'
            | 'clipboard-read'
            | 'clipboard-write'
            | 'payment-handler'
            | 'persistent-storage'
            | 'idle-detection'
            | 'midi-sysex';
            await context.overridePermissions('https://html5demos.com', ['geolocation','midi','notifications','camera','microphone']);
            */
            if (permissions) {
                await context.clearPermissionOverrides();
                //['geolocation','midi','notifications','camera','microphone']
                await context.overridePermissions(url.origin, permissions);
            }
            const [default_page] = await context.pages();


            //await default_page.setCacheEnabled(false);

            if ('debug' in info && !info.debug) {
                await default_page.evaluate(() => {
                    document.addEventListener('contextmenu', event => event.preventDefault());

                    document.addEventListener('keydown', event => {
                        if (event.keyCode == 123) // Prevent F12
                        {
                            event.preventDefault();
                            return false;
                        } else if (event.ctrlKey && event.shiftKey && event.keyCode == 73)
                        // Prevent Ctrl+Shift+I
                        {
                            event.preventDefault();
                            return false;
                        }
                    });

                });
            }


            instant = browser;
            return { browser, context };
        }
        catch (err) {
            throw err;
        }
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