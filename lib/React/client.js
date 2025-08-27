import React from "react";
import { hydrateRoot } from 'react-dom/client';
import {ClientSigneture} from '../UI/SSR.jsx';
import clientSessions from "./client-sessions.js";
import debugSys from '../debug.js';

const withClient =(
  Fc
) => {
  if (typeof document === "undefined") {
     Fc.hydrate=true; //in server //only add meta data
     return Fc; 
  } else {
    if(Fc?.hydrated){
      //console.log('already hydrated');
      return Fc; //if already hydrated then just return it
    }

    //these are global functions
    if(typeof debug !== 'undefined')debugSys.mode(debug); // set the debug mode

    // client support window.
    // deno-lint-ignore no-window
    if(window.__INIT_PROPS__ && '__client' in window.__INIT_PROPS__ && window.__INIT_PROPS__.__client?.client_id){
      //revive __client
      //console.log('CLient reviving:',props.__client);
      const client=new ClientSigneture(window.__INIT_PROPS__.__client);
      window.__INIT_PROPS__.__client=client;
      clientSessions.client=client; //use it for various purpose
      //console.log('Client Stub:',window.__INIT_PROPS__);
    }

    const props = window.__INIT_PROPS__ ?? {};
    //console.log('Client loading:',props);
   
    // deno-lint-ignore no-window
    //window.__INIT_PROPS__ = void 0;
    //render(h(Fc, props), document.body);
    //hydrate(h(Fc, props), document.body);
    hydrateRoot(document.getElementById("root"), React.createElement(Fc,props));
    Fc.hydrated=true; //signeture of hydrated already

    /*
    //console.log('socket:',socket);
    if(typeof socket!=='undefined'){
      //server function client handle
      socket.on('client-connect',function(){
        console.log('Client Socket Connected');
      });
    }
      */

    return Fc;
  }
};

export default withClient;
