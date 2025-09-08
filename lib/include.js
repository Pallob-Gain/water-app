import path from 'node:path'
import fs from 'node:fs'
import rest from './rest.js';
import jsx from './jsx.js';
import { createRequire } from 'node:module'
import url from 'node:url';
import { codeCompile } from './compiler.js';
import { pathToFileURL } from "node:url";
import { v4 as uuidv4 } from 'uuid';


function includeApi(file_link_all, requset, result, datapass = {}, fallback_state = 0) {
    //fallback states [0=raw,1=not found try,2=internal server error try]

    let apiTimeout = 30000;
    if ('__web' in datapass && 'timeout' in datapass.__web) {
        apiTimeout = datapass.__web.timeout;
    }

    const [file_link] = file_link_all.split('?');

    const work_local = Object.assign({}, datapass);
    const absolutePath = path.resolve(file_link);
    const fileUrl = url.pathToFileURL(absolutePath);

    //device token
    if(!requset.session?.device_token){
        requset.session.device_token=uuidv4();
    }

    Object.assign(work_local, {
        require: createRequire(fileUrl),
        __filename: file_link,
        __dirname: path.parse(file_link).dir,
        __currentfile: path.parse(file_link).base,
        __postdata: requset.body,
        __getquery: requset.query,
        __getparams: requset.params,
        __request: requset,
        __result: result,
        __session: requset.session,
    });

    return new Promise((resolve, reject) => {


        if (apiTimeout != 0) {
            work_local.timeOutChecker = setTimeout(() => {
                reject('API timeout:' + file_link);
            }, apiTimeout);
        }

        import(fileUrl).then(async (page_import) => {
            if (!('default' in page_import)) throw 'API must will export default!';
            const { default: page } = page_import;
            if (typeof page !== 'function') throw 'API default must will be a function!';

            const messages = await page(work_local);
            if ('timeOutChecker' in work_local && work_local.timeOutChecker) clearTimeout(work_local.timeOutChecker);
            resolve(messages);
        }).catch(async err => {
            if ('timeOutChecker' in work_local && work_local.timeOutChecker) clearTimeout(work_local.timeOutChecker);
            if (fallback_state !== 0) return reject(err);

            const filedir = path.dirname(file_link);

            if (!result.headersSent) {
                //recreate the params
                Object.assign(requset.params, {
                    [path.basename(filedir)]: path.parse(file_link).name
                });

                //console.log(filename);
                if (err instanceof TypeError && (err.message.includes('Module not found') || err.message.includes('Cannot find module')) && err.message.includes(fileUrl.href)) {


                    const route_link = path.join(filedir, 'route.js');
                    return await fs.promises.stat(route_link).then(async () => {
                        try {
                            //try route
                            return resolve(await includeApi(route_link, requset, result, datapass, 1));
                        }
                        catch (error_try) {
                            rest.apiOut(result, rest.API_ERROR, "Routing is facing issue!");
                            return reject(error_try);
                        }
                    }).catch(() => {
                        rest.apiOut(result, rest.API_ERROR, "Sorry can't find that!");
                        return reject(err);
                    });
                }
                else {

                    const fallback_link = path.join(filedir, 'fallback.js');
                    return await fs.promises.stat(fallback_link).then(async () => {
                        try {
                            //try fallback
                            return resolve(await includeApi(fallback_link, requset, result, datapass, 2));
                        }
                        catch (error_try) {
                            rest.apiOut(result, rest.API_ERROR, rest.API_NON_DISCLOSEMENT_MSG);
                            return reject(error_try);
                        }
                    }).catch(() => {
                        rest.apiOut(result, rest.API_ERROR, rest.API_NON_DISCLOSEMENT_MSG);
                        return reject(err);
                    });


                }
            }

            reject(err);
        })
    });
}

function includeView(file_link_all, requset, result, datapass = {}, fallback_state = 0) {
    //fallback states [0=raw,1=not found try,2=internal server error try]

    let viewTimeout = 30000;
    if ('__web' in datapass && 'timeout' in datapass.__web) {
        viewTimeout = datapass.__web.timeout;
    }

    const [file_link] = file_link_all.split('?');
    const work_local = Object.assign({}, datapass);
    const absolutePath = path.resolve(file_link);
    const fileUrl = url.pathToFileURL(absolutePath);

    //device token
    if(!requset.session?.device_token){
        requset.session.device_token=uuidv4();
    }

    Object.assign(work_local, {
        require: createRequire(fileUrl),
        __filename: file_link,
        __dirname: path.parse(file_link).dir,
        __currentfile: path.parse(file_link).base,
        __postdata: requset.body,
        __getquery: requset.query,
        __getparams: requset.params,
        __request: requset,
        __result: result,
        __session: requset.session
    });

    return new Promise((resolve, reject) => {
        if (viewTimeout != 0) {
            work_local.timeOutChecker = setTimeout(() => {
                reject('View timeout:' + file_link);
            }, viewTimeout);
        }

        const extention = path.extname(file_link);
        if (extention != '.jsx') {
            if (!result.headersSent) rest.viewOut(result, 500, "Internal Server Error");
            return reject('View support only JSX. But accessing:', file_link);
        }

        //return reject('test');

        jsx.renderFile(file_link, work_local).then((html) => {
            if ('timeOutChecker' in work_local && work_local.timeOutChecker) clearTimeout(work_local.timeOutChecker);
            resolve(html);
        }).catch(async err => {
            //console.log('test-->',err);

            if ('timeOutChecker' in work_local && work_local.timeOutChecker) clearTimeout(work_local.timeOutChecker);
            if (fallback_state !== 0) return reject(err);
            const filedir = path.dirname(file_link);

            if (!result.headersSent) {
                //recreate the params
                Object.assign(requset.params, {
                    [path.basename(filedir)]: path.parse(file_link).name
                });

                //console.log('base:',requset.params);
                //console.log(err instanceof TypeError,err.message);
                //console.log(err instanceof TypeError,err.message,err.message.includes('Module not found'),err.message.includes(fileUrl.href),fileUrl.href);
                if (err instanceof TypeError && (err.message.includes('Module not found') || err.message.includes('Cannot find module')) && err.message.includes(fileUrl.href)) {

                    const route_link = path.join(filedir, 'route.jsx');
                    return await fs.promises.stat(route_link).then(async () => {
                        try {
                            //try route
                            //console.log('try routing');
                            resolve(await includeView(route_link, requset, result, datapass, 1));
                        }
                        catch (error_try) {
                            //console.log('try routing error:',error_try);
                            rest.viewOut(result, 401, "Routing is facing issue!");
                            reject(error_try);
                        }
                    }).catch(() => {
                        rest.viewOut(result, 404, "Sorry can't find that!");
                        return reject(err); //if route not found then show the not found error
                    });
                }
                else {
                    const fallback_link = path.join(filedir, 'fallback.jsx');
                    return await fs.promises.stat(fallback_link).then(async () => {
                        try {
                            //try route
                            return resolve(await includeView(fallback_link, requset, result, datapass, 2));
                        }
                        catch (error_try) {
                            rest.viewOut(result, 401, "Fallback is facing issue!");
                            return reject(error_try);
                        }
                    }).catch(() => {
                        rest.viewOut(result, 500, "Internal Server Error");
                        return reject(err);
                    });

                }
            }

            reject(err);
        });
    });
}

function includeJson(file_link) {
    //console.log('include link:',file_link);
    return fs.existsSync(file_link) ? JSON.parse(fs.readFileSync(file_link).toString()) : null;
}

function extractJsonFile(file_link) {
    return new Promise((accept, reject) => {
        fs.access(file_link, fs.constants.F_OK, (err) => {
            if (err) return reject(`JSON file: ${file_link} not found`);

            fs.readFile(file_link, (err, file_data) => {
                if (err) return reject(`JSON file: ${file_link} reading failed`);

                try {
                    accept(JSON.parse(file_data.toString()));
                }
                catch (_err) {
                    return reject(`JSON file: ${file_link} extracting failed`);
                }
            });
        });
    });
}


export { includeApi, includeView, includeJson, extractJsonFile };