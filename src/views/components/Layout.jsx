import React, { use, useState, useEffect, Suspense } from 'react';

import global_share from "@mvc/water-app/global-share";
import { Warper, Script as ScriptSSR, Style as StyleSSR, ssrOnly, fromServer, useServer, AppHelmet as AppHelmetSSR } from "@mvc/water-app/UI/components";

import SideSection from './sidebar/SideSection.jsx';

const AssetsSSR = ssrOnly((props) => {
  const { __client: client } = props;

  const AppHelmet = fromServer({ client }, AppHelmetSSR);


  const { __manifest } = global_share;
  console.log('Assests running');
  console.log('__manifest:', __manifest?.name);

  AppHelmet({
    type: 'header',
    children: <>
      <base href="/" target="_blank" />
      {/*Facebook and Twitter integration */}
      <meta property="og:title" content={'name' in __manifest ? __manifest.name : ''} />
      <meta property="og:image" content="/images/icon.png" />
      <meta property="og:url" content="/" />
      <meta property="og:site_name" content={'name' in __manifest ? __manifest.name : ''} />
      <meta property="og:description" content={'description' in __manifest ? __manifest.description : ''} />
      <meta name="twitter:title" content={'name' in __manifest ? __manifest.name : ''} />
      <meta name="twitter:image" content="/images/icon.png" />
      <meta name="twitter:url" content="/" />
      <meta name="twitter:card" content={'description' in __manifest ? __manifest.description : ''} />

      <meta name="theme-color" content="#3C205F" />
      <link rel="apple-touch-icon" href="/images/icon.png" />

      <link rel="icon" type="image/png" href="/images/icon.png" />
      <link href="/images/icon.png" rel="shortcut icon" />

      <link rel="icon" href="/images/icon.png" type="image/x-icon" />

      <link rel="manifest" href="/manifest.webmanifest" />
    </>
  });

  //<Style src={import.meta.resolve('./index.css')} top={true} />
  //<Script src={import.meta.resolve("../service-worker-installer.js")} lazy={true} defer={true} top={false} />

});

export default function Layout(props) {
  const { id: _id, children, ...other_props } = props;
  const Style = fromServer({ client: props.__client }, StyleSSR);
  const Script = fromServer({ client: props.__client }, ScriptSSR);
  AssetsSSR(props); //run to add headers

  return <Warper  {...other_props}  >
    <Style src={import.meta.resolve('./index.css')} header={true} lazy={true}/>
    <div className="wrapper d-flex align-items-stretch">

      <SideSection {...other_props} /> 

      <div id="content" className="container-fluid mx-0 px-0 page-main-container" style={{ overflowY: 'auto', minWidth: '390px', height: '100vh' }}>
        <div className="row px-0 mx-0" style={{ marginTop: '50px' }}>
          <div className={`col-12 ` + (props && 'class' in props ? props.className : '')}>
            {children}
          </div>

        </div>
      </div>
    </div>
    <Script src={import.meta.resolve("../service-worker-installer.js")} lazy={true} defer={true} header={false} />
  </Warper>;
}