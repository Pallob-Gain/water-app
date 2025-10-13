import React from 'react';
import { prerender } from 'react-dom/static';
import { renderToReadableStream, renderToString } from 'react-dom/server';
//mport { jsx as _jsx } from "react/jsx-runtime";
import { Bundler } from "./bundle.js";
import { htmlBaseFormat, getStoreScriptID, getStoreHeadID, getStoreFooterID } from "./htmlTemplates.jsx";
import { Buffer } from "node:buffer";
import { ClientSigneture, receiveServerPlugHolderData, rewindHelmetData, attachServerFunctionsToClient } from '../UI/SSR.jsx';
import { attachServerStatesToClient } from '../UI/ServerHooks.js';
import { Links } from "../UI/ClientScripts.js";
import global_share from "../global-share.js";

const exclude_items = [
  "__filename",
  "__dirname",
  "__currentfile",
  "__request",
  "__result",
  "__session",
  "__event",
  "__viewdir",
  "appView",
  "__manifest",
  "__version",
  "__name",
  "__executedir",
  "__apidir",
  "__links",
  "__web",
  "__desktop",
  "__appdir",
  "permissions",
  "socketIO",
  "timeOutChecker",
];

const initialPropsGetter = (props) => {
  return Object.fromEntries(
    Object.keys(props).filter((key) => !exclude_items.includes(key)).map(
      (key) => [key, props[key]]
    ),
  );
};

async function streamToString(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const result = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result.push(decoder.decode(value, { stream: true }));
  }

  // Flush any remaining bytes
  result.push(decoder.decode());
  return result.join('');
}

export async function renderToHtml(fileUrl, local = {}) {
  const page = await import(fileUrl);
  if (!('default' in page)) throw 'JSX must will export default!';

  const { default: MyPage } = page;

  const device_token = local?.__session?.device_token;

  const clientSigneture = new ClientSigneture(device_token ? { device_token: device_token } : null); //stablish a new client for the page renders

  local.__client = clientSigneture;

  const bootstrapScripts = [];
  const bootstrapModules = [];

  //console.log('TypeApp:',App);
  const clientPath = Bundler(fileUrl);

  //console.log('clientPath:', clientPath);
  if (clientPath) bootstrapModules.push(clientPath);

  //throw 'testing X';
  const ssr_data = await htmlBaseFormat(MyPage, local);//React.createElement(MyPage, local);

  const init_props = initialPropsGetter(local);
  const init_props_str = JSON.stringify(init_props);


  const request_url = local?.__request?.url;
  const { __manifest } = global_share;

  const all_data_scripts = [`const debug=${__manifest.debug ? 'true' : 'false'}`, `const url=${request_url ? '"' + request_url + '"' : 'window.location.href'}`, `const device_token="${device_token ? device_token : ''}"`, `window.__INIT_PROPS__=${init_props_str}`];

  const bootstrapScriptContent = all_data_scripts.join(';\r\n');

  return [ssr_data, { bootstrapScriptContent, bootstrapScripts, bootstrapModules }, clientSigneture];
}

export async function renderToStreamHtml(App, local) {
  const [rendering_app, options, clientSigneture] = await renderToHtml(App, local);

  const stream = await renderToReadableStream(rendering_app, options);

  return stream;
  // return new Response(stream, {
  //   headers: { 'content-type': 'text/html' },
  // });
}

export async function renderToStringHtml(App, local) {
  const [rendering_app, options, clientSigneture] = await renderToHtml(App, local);
  const { bootstrapModules, ...other_options } = options;
  // const { prelude } = await prerender(rendering_app, options); //options

  // const reader = prelude.getReader();
  // const content = [];
  // while (true) {
  //   const { done, value } = await reader.read();
  //   if (done) {
  //     break;
  //   }
  //   content.push(Buffer.from(value).toString('utf8'));
  // }

  // let html_data = content.join('');

  //console.log('---Converting');

  const stream = await renderToReadableStream(rendering_app, other_options);
  // Wait for the stream to be ready (or all Suspense boundaries to resolve)
  await stream.allReady;

  const html_data = await streamToString(stream);

  //console.log('---Done');

  //  console.log("--------------");
  // console.log(html_data);
  // console.log("--------------");
  //server states need to attach before grabing plug data
  attachServerStatesToClient(clientSigneture);
  attachServerFunctionsToClient(clientSigneture);
  const server_render_data = await receiveServerPlugHolderData(clientSigneture);

  //console.log('---rewind');
  const helmet_info = await rewindHelmetData(clientSigneture);
  //console.log('---r done');
  //console.log('helmet_info:', helmet_info.info);

  // console.log('helmet_info:',Object.entries(helmet_info).map(([k,v])=>{
  //      return [k,v.length];
  //     }));

  const dependencies_script_links = [Links.SocketIOScript, Links.SocketHandleScriptLink]; //these need to be preloaded
  const html_info = helmet_info?.info ? ('html-info' in helmet_info.info ? helmet_info.info['html-info']?.attributes : null) : null;
  const body_info = helmet_info?.info ? ('body-info' in helmet_info.info ? helmet_info.info['body-info']?.attributes : null) : null;
  const body_data = helmet_info?.info ? ('body-info' in helmet_info.info ? helmet_info.info['body-info']?.bodyContent : null) : null;

  //console.log('html_info:',html_info);
  //const html_info=helmet_info?.info?('html-info' in helmet_info.info?'attributes' in (helmet_info.info['html-info']?Object.entries(helmet_info.info['html-info'].attributes).map((k,v)=>`${k}="${v}"`).join(' '):''):''):'';

  const final_html = `<html ${html_info ? Object.entries(html_info).map(([k, v]) => { return `${k}="${v}"` }).join(" ") : ''}>
            <head>
              <meta charSet="utf-8" />
              ${helmet_info?.header.join('') ?? ''}
              <script>window.__SSR_STORE_DATA__=${JSON.stringify(server_render_data)};window.__SSR_STORE_CACHING__={};</script>
              ${dependencies_script_links.map(link => `<link rel="modulepreload" fetchpriority="low" href="${link}" />`).join('')}
              ${bootstrapModules.map(link => `<link rel="modulepreload" fetchpriority="low" href="${link}" />`).join('')}
            </head>
            <body ${body_info ? Object.entries(body_info).map(([k, v]) => { return `${k}="${v}"` }).join(" ") : ""}>
            ${body_data ?? ''}
            ${html_data ?? ''}
            </body>
             ${helmet_info?.footer.join('') ?? ''}
             ${dependencies_script_links.map(link => `<script  src="${link}" ></script>`).join('')}
             ${bootstrapModules.map(link => `<script type="module" src="${link}" async="true" defer="true"></script>`).join('')}
          </html>`;

  //console.log(final_html);

  clientSigneture.destroy();

  return final_html;

  /*
const remake_tokens=[
[getStoreHeadID(clientSigneture.client_id),helmet_info.header.join('')],
[getStoreFooterID(clientSigneture.client_id),helmet_info.footer.join('')],
[getStoreScriptID(clientSigneture.client_id),`window.__SSR_STORE_DATA__=${JSON.stringify(server_render_data)};window.__SSR_STORE_CACHING__={};`]
];

for(const [k,v] of remake_tokens){
html_data=html_data.replace(k,v);
}

//console.log('server_render_data:',server_render_data);

return html_data;
*/
}