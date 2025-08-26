import React from 'react';
import { fromServer, AppHelmet as AppHelmetSSR,ssrOnly } from './SSR.jsx';
import ScriptSSR from "./Script.jsx";
import { Links } from "./ClientScripts.js";
import global_share from "../global-share.js";


function HeaderScripts(props) {
    const AppHelmet = fromServer(this, AppHelmetSSR);
    const Script = fromServer(this, ScriptSSR);

    Script({
        header:true,
        src:Links.HeaderScriptLink
    });
};

export default ssrOnly(HeaderScripts);