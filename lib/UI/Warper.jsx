import React, { Suspense } from 'react';
import { ssrOnly, AppHelmet as AppHelmetSSR, fromServer } from './SSR.jsx';

import HeadSSR from "./Head.jsx";
import FooterScriptsSSR from "./FooterScripts.jsx";

export default function Warper(props) {
    const { id: _id, lang, className, children, assets, ...otherprops } = props;
    const {__client:client}=props;

    const AppHelmet = fromServer({ client }, AppHelmetSSR);
    const Head = fromServer({ client }, HeadSSR);
    const FooterScripts = fromServer({ client }, FooterScriptsSSR);

    //no need to run as component as it is not going to add anything
    Head({
        ...otherprops,
        children: <>
            {
                ('title' in props) ? <title>{props.title}</title> : <></>
            }
            {
                assets
            }
        </>
    });

    AppHelmet({
        type:'info',
        children: <html-info lang={lang ? lang : 'en'} />
    });


    AppHelmet({
        type:'info',
        children: <body-info className={className} />
    });


    FooterScripts(otherprops);


    return (<>
                {children}
            </>);
};