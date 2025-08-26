import React from 'react';
import { ssrOnly, AppHelmet as AppHelmetSSR, fromServer } from './SSR.jsx';

import StyleSSR from './Style.jsx';
import HeaderScriptsSSR from "./HeaderScripts.jsx";
import global_share from "../global-share.js";
import { defaultLinkMaker, defaultListLinks } from "./default-setups.js";


function Head(props) {

    const AppHelmet = fromServer(this, AppHelmetSSR);
    const Style = fromServer(this, StyleSSR);
    const HeaderScripts = fromServer(this, HeaderScriptsSSR);

    const { children, ...other_props } = props;
    const { __manifest } = global_share;

    const bootstrap = defaultLinkMaker('@water-app:UI/assets/js/bootstrap@5.3.0-alpha1/bootstrap.min.css', __manifest?.app?.default?.bootstrap);
    const fontawesome = defaultLinkMaker('@water-app:UI/assets/css/fontawesome/v5.6.3/css/all.min.css', __manifest?.app?.default?.fontawesome);
    const datatables = defaultLinkMaker('@water-app:UI/assets/js/datatables/css/datatables.min.css', __manifest?.app?.default?.datatables);


    const extra_styles = defaultListLinks(__manifest?.app?.default?.styles).map(src=>{return {src}});
    const conditional_styles=[];
    if(bootstrap !== false){
        conditional_styles.push({src:bootstrap,crossOrigin:"anonymous"});
    }
    if(fontawesome !== false){
        conditional_styles.push({src:fontawesome});
    }
    if(datatables !== false){
        conditional_styles.push({src:datatables});
    }

    const all_styles=[...extra_styles,...conditional_styles];

    AppHelmet({
        id: 'head-content-info',
        type:'header',
        children: <>
            <base href="/" target="_blank" />
            {children ? children : <></>}
            {
                __manifest?.description ? <meta name="description" content={__manifest.description} /> : <></>
            }
            {
                __manifest?.keywords ? <meta name="keywords" content={__manifest.keywords} /> : <></>
            }
            {
                __manifest?.author ? <meta name="author" content={__manifest.author} /> : <></>
            }
        </>
    });

    for(const style_props of all_styles){
        Style({...style_props,header:true});
    }

    HeaderScripts({
        ...other_props,
    });

}

export default ssrOnly(Head);
