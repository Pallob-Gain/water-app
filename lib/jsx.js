//import { h } from "preact";

//import { renderToHtml } from "@nhttp/nhttp/jsx";

import path from 'node:path';
import { pathToFileURL } from "node:url";
//import ServerComponent from './UI/ServerComponent.jsx';

//import global_share from "./global-share.js";

import { renderToStringHtml,renderToStreamHtml } from './React/render-ssr.js'

//import {renderToStaticMarkup } from 'react-dom/server';
//import {prerender  } from 'react-dom/static';
//import { renderToStringAsync } from "npm:preact-render-to-string@^6.5.13";

// import {
//   renderToString,
//   renderToStringAsync,
// } from "app:preact-render-to-string";

//import ReactDOMServer from 'npm:react-dom@19.1.0';
//import ReactDOMServer from 'https://jspm.dev/react-dom@16.14.0/server';

async function renderFile(filename, local = {}) {

    // Convert to an absolute path
    const absolutePath = path.resolve(filename);
    // Convert to a file URL
    const fileUrl = pathToFileURL(absolutePath);

    if (!('__dirname' in local)) Object.assign(local, {
        __filename: filename,
        __dirname: path.parse(filename).dir,
        __viewdir: path.parse(filename).dir,
        __currentfile: path.parse(filename).base,
    });


    const result = await renderToStringHtml(fileUrl, local);

    return result;
}


export default { renderFile };
