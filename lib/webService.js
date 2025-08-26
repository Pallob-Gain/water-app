import bodyParser from "body-parser";
import express from "express";
import cookieParser from "cookie-parser";
import sessions from "express-session";
import fileUpload from "express-fileupload";
import http from 'node:http'
import ip from "ip";
import jsx from './jsx.js';
import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { includeApi, includeView, includeJson } from './include.js';
import rest from './rest.js';
import { v4 as uuidv4 } from 'uuid';
import httpolyglot from "httpolyglot";
import { getDirname } from './loader.js';
import serveStatic from "serve-static";
import webSocket from './webSocket.js';
import {serverFunctionHandler} from './React/server-function-handle.js';

import global_share from "./global-share.js";

const __dirname = getDirname(import.meta.url);

const app = express();

const rawBodySaver = function (req, res, buffer, encoding) {
    if (buffer && buffer.length) {
        req.rawBody = { buffer, encoding };// buf.toString(encoding || 'utf8');
    }
}

let app_server;
let __public_ledger;
const closeCallbacks = [];

export default class webService {

    static onClose(callback) {
        closeCallbacks.push(callback);
    }

    static async close(closeCode) {

        const [...closingCallbacks] = closeCallbacks;
        closeCallbacks.splice(0, closeCallbacks.length); //clearing the webservice close callbacks
        if (closingCallbacks.length == 0) return;

        //console.log('Web Service closing');

        for await (const callback of closingCallbacks) {
            //console.log('Callback calling')
            await callback(closeCode);
            //console.log('Callback called')
        }

        //console.log('Service close done')

    }

    static getHttpServer() {
        return this.app_server;
    }

    static routing(details) {

        app.use(async function (request, response, next) {
            // console.log('Access happening:',request.url);

            //console.log('ext:',path.extname(request.url));

            //rout the .pjs extension to pjs engine
            if (path.extname(request.url) == '.jsx') {

                response.setHeader("Access-Control-Allow-Origin", "*");
                response.setHeader("content-type", "text/html");

                const local = Object.assign({}, details);
                local.__page_name = path.basename(request.url, path.extname(request.url));
                const file_link = path.join(details.__viewdir, request.url);
                try {
                   
                    const html = await includeView.call(local,file_link, request, response, local);
                    if (!response.headersSent) response.send(html);
                }
                catch (err) {
                    details.debugSys.error(`View error: ${file_link} \r\n`, err);
                    if (!response.headersSent) rest.viewOut(response, 500, "Internal Server Error");
                }
                return;
            }
            next();
        });


        if (!fs.existsSync(details.__links)) return;
        const link_info=includeJson(details.__links);
        if(!('views' in link_info))return;

        const __linkdir = dirname(details.__links);
        const links = link_info.views;
        const __viewdir = details.__viewdir;

        async function viewAccess(link, requset, result) {
            
            const local = Object.assign({}, details);
            local.__page_name = link.name;
            const file_link = path.join(__viewdir, link.filename);
            try {
                const html = await includeView.call(local, file_link, requset, result, local);
                if (!result.headersSent) result.send(html);
            }
            catch (err) {
                details.debugSys.error(`View error: ${file_link} \r\n`, err);
                if (!result.headersSent) rest.viewOut(result, 500, "Internal Server Error");
            }
        }

        for (const i in links) {
            if (!('filename' in links[i])) continue; //if that is not file redirection type

            app.get(links[i].link, async function (link, requset, result) {
                await viewAccess(link, requset, result);
            }.bind(details, links[i]));

            app.post(links[i].link, async function (link, requset, result) {
                await viewAccess(link, requset, result);
            }.bind(details, links[i]));
        }

    }

    static routingApi(details) {

        async function api_access(requset, result,api_link){
            try {               
                const local = Object.assign({}, details);
                const messages = await includeApi.call(local, api_link, requset, result, local);
                //if the function does not response keep it like that for the async functions

                const { type, payload, callback } = messages;
                if (type && payload && !result.headersSent) {
                    rest.apiOut(result, type, payload);
                    if (callback && typeof callback == 'function') callback(true);
                }
            }
            catch (err) {
                details.debugSys.error('Api Request Error:', err);
                if (!result.headersSent) rest.apiOut(result, rest.API_ERROR, rest.API_NON_DISCLOSEMENT_MSG);
            }
        }

        function apis_process(requset, result) {

            let pointer = requset.url.split('/');
            pointer.splice(0, 2);
            pointer = pointer.join('/');
            
            let api_link = path.join(details.__apidir, pointer);
            const ext_name = path.extname(api_link);
            if (ext_name.length == 0) api_link += '.js';

            api_access(requset, result,api_link);
        }

        app.post('/apis/*', apis_process);
        app.get('/apis/*', apis_process);
        //new update
        app.post('/@apis/*', apis_process);
        app.get('/@apis/*', apis_process);

        if (!fs.existsSync(details.__links)) return;
        const link_info=includeJson(details.__links);
        if(!('apis' in link_info))return;

        const links = link_info.apis;
        const __apidir = details.__apidir;

        function apis_process_files(api_link,requset, result) {
            api_access(requset, result,api_link);
        }

        for (const i in links) {
            if (!('filename' in links[i])) continue; //if that is not file redirection type
            const filename=path.join(__apidir,links[i].filename);

            app.get(links[i].link,apis_process_files.bind(details,filename));

            app.post(links[i].link,apis_process_files.bind(details,filename));
        }
    }

    static serverInitiate(app_server, details) {
        this.app_server = app_server;

        // creating 24 hours from milliseconds
        const oneDay = 1000 * 60 * 60 * 24;

        //session middleware
        app.use(sessions({
            secret: uuidv4(),
            saveUninitialized: true,
            cookie: { maxAge: oneDay },
            resave: false
        }));

        // cookie parser middleware
        app.use(cookieParser());

        global_share.assignConst({ running_app: app });  //asign to the share 

        //UPDATE: V1.1.56
        // parse application/x-www-form-urlencoded
        //app.use(bodyParser.urlencoded({ extended: false }));

        // parse application/json
        //app.use(bodyParser.json());

        //app.engine('html', renderFile);
        //app.set('view engine', 'html');
        //app.set('views', details.__executedir);
        app.engine('jsx', jsx.renderFile);
        app.set('view engine', 'jsx');
        app.set('views', details.__viewdir);
        app.use(fileUpload());
        // parse application/x-www-form-urlencoded
        // app.use(express.urlencoded({
        //     extend: true
        // }));
        //UPDATE: V1.1.56
        app.use(bodyParser.json({ limit: 'Infinity', verify: rawBodySaver }));
        app.use(bodyParser.urlencoded({ limit: 'Infinity', verify: rawBodySaver, extended: true }));


        //type could '*/*' for all
        const raw_exlcude_types = ['multipart/form-data'];

        const raw_parser = bodyParser.raw({
            limit: 'Infinity', verify: rawBodySaver, type: (request) => {
                const contentType = request.headers['content-type'];
                //console.log('type check:',contentType);
                return raw_exlcude_types.findIndex((exl_type) => contentType.indexOf(exl_type) != -1) == -1;
            }
        });

        app.use((request, response, next) => {
            raw_parser(request, response, (err) => {
                if (err) {
                    details.debugSys.error('Raw Body Parse Error:', err);
                }
                next();
            });
        });

        //console.log('view link:',details.__viewdir);
        //console.log('@water-app:',__dirname);

        
        __public_ledger = details;
        this.routing(__public_ledger);
        this.routingApi(__public_ledger);

        app.use(serveStatic(details.__viewdir)); //for other file use
        app.use(`/@views`, serveStatic(details.__viewdir)); //views directory specified
        app.use(`/@water-app`, serveStatic(__dirname)); //library files

        //staticdir
        if ('app' in details.__manifest && 'staticdir' in details.__manifest.app) {
            for (const { name, link } of details.__manifest.app.staticdir) {
                app.use(`/${name}`, serveStatic(link));
                //console.log(`/${name} --> ${link}`);
            }
        }
        //extra statics

        const socketIO = new webSocket(this);
        serverFunctionHandler(socketIO); //start server function handler over socket io
        return socketIO;
    }


    static generateX509Certificate(altNames) {
        const issuer = [
            { name: 'commonName', value: 'ultimatemvc.com' },
            { name: 'organizationName', value: 'E Corp' },
            { name: 'organizationalUnitName', value: 'UltimateMVC automatic' }
        ]
        const certificateExtensions = [
            { name: 'basicConstraints', cA: true },
            { name: 'keyUsage', keyCertSign: true, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true },
            { name: 'extKeyUsage', serverAuth: true, clientAuth: true, codeSigning: true, emailProtection: true, timeStamping: true },
            { name: 'nsCertType', client: true, server: true, email: true, objsign: true, sslCA: true, emailCA: true, objCA: true },
            { name: 'subjectAltName', altNames },
            { name: 'subjectKeyIdentifier' }
        ]
        const keys = forge.pki.rsa.generateKeyPair(2048)
        const cert = forge.pki.createCertificate()
        cert.validity.notBefore = new Date()
        cert.validity.notAfter = new Date()
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
        cert.publicKey = keys.publicKey
        cert.setSubject(issuer)
        cert.setIssuer(issuer)
        cert.setExtensions(certificateExtensions)
        cert.sign(keys.privateKey)
        return {
            key: forge.pki.privateKeyToPem(keys.privateKey),
            cert: forge.pki.certificateToPem(cert)
        }
    }

    static open(details, callback) {
        try {
            if (details.__web.type == 'https') {
                if ('auto_secure' in details.__web && details.__web.auto_secure) {

                    //console.log('Secure with reverse proxy');

                    app.enable('trust proxy');

                    app.use(function (request, response, next) {

                        if (request.secure) {
                            //console.log('Process https:', request.headers.host + request.url);
                            next();
                        }
                        else {
                            //console.log('Process for http:', 'https://' + request.headers.host + request.url);
                            response.redirect('https://' + request.headers.host + request.url);
                        }

                    });

                }

                const web_options = this.generateX509Certificate([
                    { type: 6, value: 'https://localhost' },
                    { type: 7, ip: ip.address() }
                ]);

                if ('key' in details.__web) {
                    web_options.key = fs.readFileSync(details.__web.key);
                    //console.log('test');
                }
                if ('cert' in details.__web) web_options.cert = fs.readFileSync(details.__web.cert);
                if ('ca' in details.__web) web_options.ca = fs.readFileSync(details.__web.ca);


                app_server = httpolyglot.createServer(web_options, app);
                app_server.listen(details.__web.port, (err) => {
                    //console.log('Server Open:',err);
                    if (err) return callback(err);
                    const socketIO=this.serverInitiate(app_server, details);
                    const info={ host: ip.address(), port: details.__web.port, link: `https://${ip.address()}:${details.__web.port}`,link_local:`https://localhost:${details.__web.port}` };
                    callback(null,{info,socketIO});
                });

                app_server.on('error', callback);

            }
            else if (details.__web.type == 'http') {
                app_server = http.Server(app);
                app_server.listen(details.__web.port, (err) => {
                    //console.log('Server Open:',err);
                    if (err) return callback(err);
                    const socketIO=this.serverInitiate(app_server, details);
                    const info={ host: ip.address(), port: details.__web.port, link: `http://${ip.address()}:${details.__web.port}`,link_local:`http://localhost:${details.__web.port}` };
                    callback(null,{info,socketIO});
                });

                app_server.on('error', callback);
            }
            else {
                throw new Error('Invalid type of server');
            }
        }
        catch (err) {
            callback(err);
        }
    }


}