import React from 'react';
import { ssrOnly, AppHelmet as AppHelmetSSR, fromServer } from './SSR.jsx';

import ScriptSSR from "./Script.jsx";
import { Links } from "./ClientScripts.js";
import global_share from "../global-share.js";
import { defaultLinkMaker, defaultListLinks } from "./default-setups.js";


function FooterScript(props) {
    const AppHelmet = fromServer(this, AppHelmetSSR);
    const Script = fromServer(this, ScriptSSR);

    const { __manifest } = global_share;

    const bootstrap = defaultLinkMaker('@water-app:UI/assets/js/bootstrap@5.3.0-alpha1/bootstrap.bundle.min.js', __manifest?.app?.default?.bootstrap);
    const jQuery = defaultLinkMaker('@water-app:UI/assets/js/jquery-3.5.1.min.js', __manifest?.app?.default?.jQuery);
    const datatables = defaultLinkMaker('@water-app:UI/assets/js/datatables/js/datatables.min.js', __manifest?.app?.default?.datatables);

    const extra_scripts = defaultListLinks(__manifest?.app?.default?.scripts).map(src =>{
        return {src,crossOrigin:"anonymous",header:false};
    }); //(<Script src={link} crossorigin="anonymous" />)


    const all_footer_scripts=[];

    if(jQuery !== false){
        all_footer_scripts.push(...[
            {src:jQuery,crossOrigin:"anonymous",header:false},
            {src: '@water-app:UI/assets/js/jquery-ui.min.js',header:false},
            {src:'@water-app:UI/assets/js/popper.min.js',header:false},
            { src: '@water-app:UI/assets/js/owl.carousel.min.js', header: false },
            { src: '@water-app:UI/assets/js/multiple-carousel.js', header: false },
            { src: '@water-app:UI/assets/js/jquery.accrue.js', header: false },
            { src: '@water-app:UI/assets/js/return-to-top.js', header: false },
            { src: '@water-app:UI/assets/js/bootbox.js/5.4.0/bootbox.min.js', header: false },
            { src: '@water-app:UI/assets/js/jquery.templates/beta1/jquery.tmpl.js', header: false }
        ]);
    }

    if(bootstrap !== false){
        all_footer_scripts.push({src:bootstrap,crossOrigin:"anonymous",header:false});
    }

    if(datatables !== false){
        all_footer_scripts.push({src:datatables,crossOrigin:"anonymous",header:false});
    }

    all_footer_scripts.push(...[
        { src: Links.FooterScriptLink, defer: true, header: false },
        { src: Links.AsyncRenderScriptLink, defer: true, header: false },
        { src: Links.LinkControlLink, defer: true, header: false }
    ]);

    all_footer_scripts.push(...extra_scripts);

    for(const script_props of all_footer_scripts){
        Script(script_props);
    }
}


export default ssrOnly(FooterScript);