import webview from 'suchipi-webview';
import puppeteer from 'puppeteer-core';
import { URL } from 'node:url';
import { spawn } from 'node:child_process';


var instant;

export default class webView {

    async open(link, title, width, height, rundir = "", engine = "webview", info) {

        //console.log("testing ------------------>>>>>>>>");

        let appName = info && 'name' in info ? info.name.replaceAll(' ', '-') : null;
        let kiosk = (info && 'fullscreen' in info.desktop && info.desktop.fullscreen) ? true : false;

        // console.log('APP NAME -------->'+appName);
        if (process.platform == 'linux') {

            let args = [];

            if (engine == null || engine == "auto") {
                //for linux
                process.env.MOZ_USE_XINPUT2 = 1;
                engine = '"/usr/bin/firefox-esr"'; //the default browser for m10Xcore

                //ref: http://kb.mozillazine.org/Command_line_arguments
                //https://wiki.mozilla.org/Firefox/CommandLineOptions
                //firefox -CreateProfile "appName app_directory_profile"

                args.push('-new-instance');
                args.push('-foreground');
                args.push(appName ? '-P ' + appName : 'appName');
                args.push(width ? '-width ' + width : '');
                args.push(height ? '-height ' + height : '');
                args.push(kiosk ? '--kiosk' : '');
                args.push(`-url "${link}"`);
            }

            var child = await spawn(`${engine} ${args.join('')}`, {
                stdio: 'inherit',
                shell: true,
                cwd: rundir != "" ? rundir : process.cwd()
            });

            instant = child;
            return { browser: child, context: null };
        }
        else if (process.platform === "win32") {

            if (engine == null || engine == "auto") {
                engine = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"; //the default browser for windows
            }

            if (engine === "webview") {
                var child = await webview.spawn({
                    // options for webview
                    title: title,
                    width: width,
                    height: height,
                    url: link,
                    // options for child_process.spawn
                    cwd: rundir != "" ? rundir : process.cwd(),
                }, {
                    stdio: 'inherit',
                    shell: true
                });
                instant = child;
                return { browser: child, context: null };
            }
            else {
                //console.log('Testing 1');
                const url = new URL(link);

                var args = [
                    `--user-data-dir="${(rundir != "" ? rundir : process.cwd()) + '/webviewCache/'}"`,
                    `--app=${url.origin}`, //hide address bar open with default link
                    '--start-maximized',
                    //'--no-sandbox',
                    '--no-zygote',
                    '--disable-session-crashed-bubble',
                    '--no-default-browser-check',
                    '--no-first-run',
                    '--allow-hidden-media-playback',
                    '--enable-media-stream',
                    '--alsa-input-device',
                ];

                let permissions;

                if ('desktop' in info && 'permissions' in info.desktop) {
                    permissions = info.desktop.permissions;
                    //https://peter.sh/experiments/chromium-command-line-switches/
                    args = [...args, ...[
                        '--disable-web-security',
                        '--test-type', //esential to remove the warnning banners
                        `--unsafely-treat-insecure-origin-as-secure=${url.origin}`,
                        '--allow-running-insecure-content',
                        '--reduce-security-for-testing',
                        '--disable-extensions',
                        '--disable-default-apps',
                        '--ignore-certificate-errors',
                        '--allow-insecure-localhost',
                        '--disable-features=RendererCodeIntegrity',
                        '--disable-infobars',
                        '--disable-safebrowsing'
                    ]];
                }

                if (width != null && height != null) {
                    args.push(`--window-size=${width},${height}`);
                }
                if ('fullscreen' in info.desktop && info.desktop.fullscreen) args.push(`--start-fullscreen`);

                var options = {
                    executablePath: engine,
                    devtools: 'developer' in info.desktop ? info.desktop.developer : false,
                    headless: false,
                    ignoreHTTPSErrors: true,
                    userDataDir: (rundir != "" ? rundir : process.cwd()) + '/webviewCache/',
                    //dumpio: true,
                    args: args,
                    ignoreDefaultArgs: [
                        "--enable-automation", //hide chromium control bar
                        "--enable-blink-features=IdleDetection",
                        '--mute-audio',
                        '--disable-audio-input',
                    ],
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
                    let [default_page] = await context.pages();


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

        }
    }

    close() {
        if (instant) {
            if ('close' in instant) {
                instant.close();
            }
            else {
                instant.kill();
                instant.kill('SIGINT');
                instant.kill('SIGKILL');
            }
        }
    }

    on(event, callback) {
        if (instant) {
            instant.on(event, callback);
        }
    }
}