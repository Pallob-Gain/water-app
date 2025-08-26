import React from 'react';

async function AttachStoreData(props){
    const client=props.client;
    console.log('Data Rendering');
    
    const server_plug_rendered_data = client.getPlugRenderData();
    const render_data=await Promise.all(server_plug_rendered_data.entries().map(async ([id,component])=>{
        component.result=await  component.result;
        return [id, component];
    }));

    console.log('render_data:',render_data);
    const store_SSR_data = JSON.stringify(Object.fromEntries(render_data));
    
    return React.createElement('script',{
        dangerouslySetInnerHTML: {
            __html: `window.__SSR_STORE_DATA__=${store_SSR_data}`.replace(
            /</g,
            "\\u003c",
            ),
        },
    });
}

export function getStoreScriptID(client_id){
    return `(#--STORE_SCRIPT:${client_id}--#)`;
}

export function getStoreHeadID(client_id){
    return `(#--STORE_HEAD:${client_id}--#)`;
}

export function getStoreFooterID(client_id){
    return `(#--STORE_FOOTER:${client_id}--#)`;
}

export   function htmlBaseFormat(App,local={}){
    const client=local.__client;
    
    /*
    return (<html>
        <head>
            <meta charSet="utf-8" />
            {getStoreHeadID(client.client_id)}
        </head>
        <body>
            <div id="root">
                  <App {...local}/>
            </div>
            {getStoreFooterID(client.client_id)}
            <script>{getStoreScriptID(client.client_id)}</script>
        </body>
        </html>
    );
    */
    return <div id="root">
                  <App {...local}/>
            </div>;
}

export function htmlConstruct(body,{store_data,options}){
    const store_SSR_data = JSON.stringify(store_data);
    const SSR_STORE_DATA=React.createElement('script',{
        dangerouslySetInnerHTML: {
            __html: `window.__SSR_STORE_DATA__=${store_SSR_data}`.replace(
            /</g,
            "\\u003c",
            ),
        },
    });

    return (<html>
        <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>My app</title>
        </head>
        <body>
            <div id="root">
                {body}
            </div>
            {
                SSR_STORE_DATA
            }
        </body>
        </html>
    );
}