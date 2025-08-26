import React from 'react';
import { ssrOnly, AppHelmet as AppHelmetSSR, fromServer } from './SSR.jsx';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';

import global_share from "../global-share.js";

async function StyleProcess(props){
     let { children, header, src, lazy, ...attrs } = props;


     if (src && typeof src == 'string' && src.trim().indexOf('http') == 0) {
          //no need to do anything
     }
     else if (src && typeof src == 'string' && src.trim().indexOf('@') == 0 && src.indexOf('@') < src.indexOf(':')) {
          //TODO
          const find = src.indexOf(':');
          const first = src.substring(1, find);
          const last = src.substring(find + 1, src.length);
          src = `@${first}/${last}`;
     }
     else if (lazy === true && src) {
          //if lazy load from client
          const { __manifest } = global_share;
          if (__manifest?.app?.viewdir) {
               const link = typeof src == 'string' ? (src.startsWith("file://") ? fileURLToPath(src) : path.resolve(src)) : src;
               src = path.relative(__manifest.app.viewdir, link); //remake path
          }
     }
     else if (src) {
          if (!children) children = [];
          const link = typeof src == 'string' ? (src.startsWith("file://") ? fileURLToPath(src) : path.resolve(src)) : src;
          const file_text = await fs.readFile(link);

          //console.log('testing--->');
          children.push(file_text.toString());
          src = null; //if direct push
     }

     //console.log('Style checking:',src);

     return <>
          {
               src ?
                    <link rel="stylesheet" type="text/css" href={src}  {...attrs} /> : <></>
          }
          {
               children ?
                    <style {...attrs} dangerouslySetInnerHTML={{ __html: children.join('') }} />
                    :
                    <></>
          }
     </>;
}

function Style(props) {
     const AppHelmet = fromServer(this, AppHelmetSSR); //here Style already should be under client Signeture as it is SSRonly
     
     AppHelmet({
          id: uuidv4(),//crypto.randomUUID(),
          type: 'header',
          children: StyleProcess(props)
     });
}

export default ssrOnly(Style);