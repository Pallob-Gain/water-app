import React from 'react';
import { ssrOnly, AppHelmet as AppHelmetSSR, fromServer } from './SSR.jsx';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';

import global_share from "../global-share.js";

async function ScriptProcess(props) {
     let { children, header, src, lazy, ...attrs } = props;


     if (src && typeof src == 'string' && src.trim().indexOf('http') == 0) {
          attrs.src = src; //attrs attach src
     }
     else if (src && typeof src == 'string' && src.trim().indexOf('@') == 0 && src.indexOf('@') < src.indexOf(':')) {
          //TODO
          const find = src.indexOf(':');
          const first = src.substring(1, find);
          const last = src.substring(find + 1, src.length);
          attrs.src = `@${first}/${last}`;
     }
     else if (lazy === true && src) {
          //if lazy load from client
          if (global_share?.__viewdir) {
               const link = typeof src == 'string' ? (src.startsWith("file://") ? fileURLToPath(src) : path.resolve(src)) : src;
               src = path.relative(global_share.__viewdir, link); //remake path
          }
          attrs.src = src; //attrs attach src
     }
     else if (src) {
          if (!children) children = [];
          const link = typeof src == 'string' ? (src.startsWith("file://") ? fileURLToPath(src) : path.resolve(src)) : src;
          const file_text = await fs.readFile(link);
          children.push(file_text.toString());
     }

     const script_content = Array.isArray(children) ? children.join('') : (children ? children : '');
     return <script {...attrs} dangerouslySetInnerHTML={{ __html: script_content }} />;
}

function Script(props) {
     //console.log('checking');
     const AppHelmet = fromServer(this, AppHelmetSSR); //here Script already should be under client Signeture as it is SSRonly
     let { header } = props;

     AppHelmet({
          id: uuidv4(),//crypto.randomUUID(),
          type: (header ? 'header' : 'footer'),
          children: ScriptProcess(props)
     });
}


export default ssrOnly(Script);