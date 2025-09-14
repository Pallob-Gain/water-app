import React, { isValidElement, Suspense, useState, useEffect, use } from "react";
import { renderToStaticMarkup } from 'react-dom/server';
import { deepPromiseAll } from './componentPorcess.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import global_share from "../global-share.js";

const SIGNETURE_NO_VALID_WARN = 'Client-Signeture is not passed or it is invalid!';

export function isPromise(p) {
  return p instanceof Promise || (
    p &&
    (typeof p === 'object' || typeof p === 'function') &&
    typeof p.then === 'function'
  );
}

export function isServer() {
  return typeof window === "undefined";
}

function isConstructableElement(elem) {
  if (!elem) return false;
  if (!(typeof elem == 'object')) return false;
  //return ('type' in elem || 'key' in elem) && 'props' in elem && '_owner' in elem && '_store' in elem;
  return ('type' in elem || 'key' in elem) && 'props' in elem && '_jsx_element' in elem && elem._jsx_element;
}

export class ClientSigneture {
  client_id;
  device_token;

  app_helmet_data_logger;
  server_plug_rendered_data;
  travel_id_counter;

  constructor(__client) {
    this.client_id = __client?.client_id ?? uuidv4();//crypto.randomUUID();
    this.device_token = __client?.device_token ?? uuidv4();

    this.app_helmet_data_logger = {
      header: __client?.app_helmet_data_logger?.header ?? [],
      footer: __client?.app_helmet_data_logger?.footer ?? [],
      info: __client?.app_helmet_data_logger?.info ?? []
    };

    this.server_plug_rendered_data = __client?.server_plug_rendered_data ? new Map(Object.entries(__client.server_plug_rendered_data)) : new Map();
    this.travel_id_counter = __client?.travel_id_counter ? Number(__client.travel_id_counter) : 0;
  }

  destroy() {
    this.clearHelmet();
    this.clearPlugRenderData();

    this.client_id = null;
    this.app_helmet_data_logger = null;
    this.server_plug_rendered_data = null;
    this.travel_id_counter = null;
  }

  getSigneture() {
    return {
      client_id: this.client_id,
      device_token: this.device_token
    };
  }

  stepIDCounter() {
    this.travel_id_counter++;
    return this.travel_id_counter;
  }

  getHelmetLogger() {
    return this.app_helmet_data_logger;
  }


  getPlugRenderData() {
    return this.server_plug_rendered_data;
  }

  clearIDcounter() {
    this.travel_id_counter = 0;
  }

  clearHelmet() {
    for (const [_k, arr] of Object.entries(this.getHelmetLogger())) {
      arr.splice(0, arr.length);
    }
  }


  clearPlugRenderData() {
    this.server_plug_rendered_data.clear();
  }

}


export function clearHelmetHolders(clientSigneture) {
  if (!clientSigneture) throw new Error(SIGNETURE_NO_VALID_WARN);
  //TODO cancle signal
  // for (const [key, value] of server_plug_promise_logger) {
  // } 
  clientSigneture.clearHelmet();
}

function is_helmet_data_present(clientSigneture) {
  let all_len = Object.entries(clientSigneture.getHelmetLogger()).map(([k, arr]) => arr.length);
  return Math.max(0, ...all_len) > 0;
}

function parseInfoFormat(htmlString) {
  // Regex to match opening tag, attributes, and body
  const regex = /<([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>([\s\S]*?)<\/\1>/;
  const match = htmlString.match(regex);

  if (match) {
    const [, tagName, attrString, bodyContent] = match;

    // Parse attributes (supports quoted and unquoted values)
    const attrRegex = /([a-zA-Z-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^>\s]+)))?/g;
    const attributes = {};
    let attrMatch;

    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      const [, name, val1, val2, val3] = attrMatch;
      attributes[name] = val1 || val2 || val3 || true; // `true` for boolean attributes like "disabled"
    }

    // console.log("Tag Name:", tagName);
    // console.log("Attributes:", attributes);
    // console.log("Body Content:", bodyContent.trim());
    return [tagName, attributes, bodyContent.trim()];
  } else {
    return null;
    //console.log("No valid HTML element found.");
  }
}

export async function rewindHelmetData(clientSigneture, data = null) {
  if (!clientSigneture) throw new Error(SIGNETURE_NO_VALID_WARN);

  if (!is_helmet_data_present(clientSigneture)) return data;
  const app_helmet_data_logger = clientSigneture.getHelmetLogger();

  const store_data = { ...app_helmet_data_logger };
  const extracted_entries = await Promise.all(Object.entries(store_data).map(async ([k, arr]) => {
    const temp_store = [...arr];
    arr.splice(0, arr.length); //clearing necause, during process await it could be fill again for next round
    const res_arr = await deepPromiseAll(temp_store); //copied in new (non html)
    if (k == 'info') {
      //need to handle in different way
      const res = res_arr.map(v => {
        const htmlString = renderToStaticMarkup(v);
        const [tagName, attributes, bodyContent] = parseInfoFormat(htmlString);
        return [tagName, { attributes, bodyContent }];
      });

      return [k, Object.fromEntries(res)];
    }
    else {
      const res = res_arr.map(v => renderToStaticMarkup(v));
      // console.log('key:',k,res);
      // console.log('process:',res);
      return [k, res];
    }
  }));
  const extracted_info = Object.fromEntries(extracted_entries);

  return rewindHelmetData(clientSigneture, extracted_info);
}

function AppHelmetBase(props) {
  if (!isServer()) {
    return '';
  }

  //verifing if that is binded or not
  if (!('client' in this) || !(this.client instanceof ClientSigneture)) throw new Error('Missing client signature binding for AppHelmet!');
  const app_helmet_data_logger = this.client.getHelmetLogger();
  if (!app_helmet_data_logger) throw new Error('Invalid helment logger');
  const { type, children, ...otherprops } = props;

  //console.log('app_helmet_data_logger:',app_helmet_data_logger);

  if (children) app_helmet_data_logger[type && type in app_helmet_data_logger ? type : 'header'].push(...(Array.isArray(children) ? children : [children]));

  return '';
}


export function clearServerPlug(clientSigneture) {
  if (!clientSigneture) throw new Error(SIGNETURE_NO_VALID_WARN);
  clientSigneture.clearPlugRenderData();
}



export async function receiveServerPlugHolderData(clientSigneture) {
  if (!clientSigneture) throw new Error(SIGNETURE_NO_VALID_WARN);
  const server_plug_rendered_data = clientSigneture.getPlugRenderData();
  //console.log('server_plug_rendered_data:',server_plug_rendered_data);

  const render_data = await Promise.all(server_plug_rendered_data.entries().map(async ([id, component]) => {
    component.result = await component.result;
    return [id, component];
  }));

  return Object.fromEntries(render_data);
}


export function getUniqueTreeID(clientSigneture) {
  if (!clientSigneture) throw new Error(SIGNETURE_NO_VALID_WARN);
  return `water-app-element-id-${clientSigneture.stepIDCounter()}`;
}

export function clearUniuqeTreeID(clientSigneture) {
  if (!clientSigneture) throw new Error(SIGNETURE_NO_VALID_WARN);
  clientSigneture.clearIDcounter();
}


export function reCreateElement(elem) {
  //console.log('Element:',elem,isConstructableElement(elem));

  if (Array.isArray(elem)) return elem.map(reCreateElement);
  else if (!isConstructableElement(elem)) return elem;
  const { type, props } = elem;
  //console.log('Element X:',type,props);

  if (!type) {
    //probably an empty element
    return props?.children ? reCreateElement(props.children) : [];
  }

  //if(Object.keys(props).length==0)props.children=[];

  const correct_details = Object.fromEntries(Object.entries(props).map(([k, v]) => {
    return [k, reCreateElement(v)];
  }));

  return React.createElement(type, correct_details);
}

export function getElementContext(elem) {
  if (Array.isArray(elem)) return elem.map(getElementContext);
  if (!isValidElement(elem)) return elem;
  const elem_next = { ...elem };

  //remove unnessary elements
  //if ('_owner' in elem_next) elem_next._owner = null;
  //if ('_store' in elem_next) elem_next._store = null;
  delete elem_next._owner;
  delete elem_next._store;

  elem_next._jsx_element = true; //enable signeture

  const { type, props } = elem_next;

  if (!type && props?.children) {
    //probably an empty element
    for (const i in props.children) {
      props.children[i] = getElementContext(props.children[i]);
    }
  }

  elem_next.props = Object.fromEntries(Object.entries(props).map(([k, v]) => {
    return [k, getElementContext(v)];
  }));


  return elem_next;
}

export function ssrValueEncode(value) {
  const element_type = isValidElement(value);
  return { element_type, result: element_type ? getElementContext(value) : value };
}

export function ssrValueDecode(value) {
  if (typeof value != 'object' || !('element_type' in value)) return value;
  const { element_type, result } = value;
  return element_type ? reCreateElement(result) : result;
}

export function serverPlugClientHandler(props) {
  //if rendering from client, for the server side components
  if (props && ('id' in props)) {
    if (__SSR_STORE_DATA__ && props.id in __SSR_STORE_DATA__) {
      const element_data = __SSR_STORE_DATA__[props.id];
      //console.log('element_data:', props.id, element_data);
      if (element_data.element_type) {
        if (__SSR_STORE_CACHING__ && props.id in __SSR_STORE_CACHING__) return __SSR_STORE_CACHING__[props.id]; //if already complied and cached
        const render_result = reCreateElement(element_data.result);
        __SSR_STORE_CACHING__[props.id] = render_result;
        return render_result;
        //const {type,props}=element_data.result;
        //const r_element=React.createElement(type,props);
        //console.log('isElement:',isValidElement(r_element),r_element);

        //return r_element;
      }
      else {
        return element_data.result;
      }
    }
    console.warn('Server Component missing information:', props);
  }
  else console.warn('A server component without an associated ID:', props);
  return '';
}

async function serverFunctionCaller(details, ...args) {
  const { client, name, origin, timeout } = details;
  if (!client || !(client instanceof ClientSigneture)) throw new Error('Client signature is invalid!');
  const client_info = client.getSigneture();

  const response = await new Promise((accept, reject) => {
    requestServerFunction({ name, origin, timeout, client_info, args, accept, reject }); //it is global define at ./client-js/socket-handle.js
  });

  return ssrValueDecode(response);
}

export function clearPageCache(clientSigneture) {
  if (!clientSigneture) throw new Error(SIGNETURE_NO_VALID_WARN);
  clearUniuqeTreeID(clientSigneture);
  clearHelmetHolders(clientSigneture);
  clearServerPlug(clientSigneture);
}


export function ssrOnly(Component) {
  //ssrOnly kind of function will will do some SSR process will not have any output at all
  const ssr_fun = function (props) {
    if (!isServer()) {
      //it will not run anything in client
      return '';
    }

    Component.call(this, props);

    return '';
  };
  ssr_fun.ssr_only = true;

  return ssr_fun;
}

export const app_all_server_functions = new Map();
//attach all the server states to a new client
export function attachServerFunctionsToClient(client) {
  const server_plug_rendered_data = client.getPlugRenderData();
  for (const [key, value] of app_all_server_functions.entries()) {
    server_plug_rendered_data.set(key, value); //plugging the values
  }
}

export function serverOnly(Component, details) {
  if (!details) throw new Error('Server only function details is not supplied');
  if (!('origin' in details)) throw new Error('Origin of server only function is not available');
  if (!('id' in details)) throw new Error('ID signeture of the server only function is not present');
  if (!(Component?.name)) throw new Error('Server only function is not exported directly');

  //if(!origin)throw new Error('The ServerOnly function definition must include the origin!');
  //Server Only marked compoents communicate to the backend over socket
  const server_fun = async function (props) {
    const result = await Component.call(this, props);
    return ssrValueEncode(result);
  };

  server_fun.server_only = true;
  server_fun.fun_name = Component.name;
  server_fun.origin = details.origin;
  server_fun.id = details.id;
  server_fun.timeout = details?.timeout ?? 60000; //default timeout is 60 sec

  if (isServer()) {
    if(!global_share?.__appdir)throw new Error('Global app dir is not defined!');
    const fun_origin = path.relative(global_share.__appdir, fileURLToPath(details.origin));
    if (app_all_server_functions.has(details.id)) throw new Error('This ID is already assigned to another server function.');
    app_all_server_functions.set(details.id, { server_only: true, fun_name: Component.name, fun_origin }); //need to store the function name, otherwise it will not work with minification
  }

  /*
  server_fun.server_only = true;
  server_fun.fun_name = Component?.name??server_fun.name;
  server_fun.origin=origin??import.meta.url;
  */
  //console.log('Component:',Component);
  return server_fun;
}

export const AppHelmet = ssrOnly(AppHelmetBase);

//to have serverComponent, server data
export function fromServer(props, component, client_no_feature = false) {
  if (!props || !('client' in props)) throw new Error('Client signature was not provided!');
  const { client } = props;

  if (!(client instanceof ClientSigneture)) throw new Error('Client signature is invalid!');

  if (typeof component == 'function') {
    if (component?.ssr_only) {
      //it is server only fun and has no output
      return (function (...child_props) {
        component.call({ client }, ...child_props);
        return ''; //no output
      })
    }
    else {

      //console.log('Component:',component_name,Object.entries(component));

      if (component?.server_only && isServer()) {
        //during mounting server function: maybe it is not require as it will be passed globally and will be attach to the client globally
        /*
        const fun_name = component.fun_name;
        const fun_origin = path.relative(Deno.cwd(), fileURLToPath(component.origin));

        const server_plug_rendered_data = client.getPlugRenderData();
        server_plug_rendered_data.set(component.id, { server_only: true, fun_name, fun_origin });
        */
      }


      return (async function (...child_props) {

        if (component?.server_only) {
          //Server function handle
          //child function
          if (!isServer()) {
            //console.log('coming as:',component.id);
            //connect over socket
            //in client: server_plug_rendered_data is actually __SSR_STORE_DATA__
            if (__SSR_STORE_DATA__ && component.id in __SSR_STORE_DATA__) {
              const info = __SSR_STORE_DATA__[component.id];
              //console.log('info data:',info);
              const fun_name = info.fun_name;
              const fun_origin = info.fun_origin;
              //TODO
              const result = await serverFunctionCaller({ name: fun_name, origin: fun_origin, client, timeout: component.timeout }, ...child_props);
              //console.log('Server function result:',result);
              return result;
            }
            else throw new Error('Failed to access the required information for the server function.');
          }

          const result = await component.call({ client }, ...child_props); //this, as {client}
          //return res.result;
          return result; //for now(TEST)
        }
        else {
          //Server Component Handle
          const [props] = child_props;
          if (!props || !('id' in props)) throw new Error('SSR components need to have an ID to work properly.');
          const id = props.id;

          //console.log('accessing id:',id);

          //child function
          if (!isServer()) {
            return serverPlugClientHandler({ id, client });
          }

          //console.log('Server Component Loading:',child_props);

          const result = await component.call({ client }, ...child_props); //this, as {client}

          //console.log('Server component Saving:',result);

          const server_plug_rendered_data = client.getPlugRenderData();
          server_plug_rendered_data.set(id, ssrValueEncode(result));

          //console.log('server result:',result);

          return result;
        }
      });
    }
  }
  else {
    if (!('id' in props)) throw new Error('useSSR needs an ID to work with server component data.');
    const id = props.id;


    if (client_no_feature && !isServer()) {
      //if client  access the data directly without promise addition
      return serverPlugClientHandler({ id, client });
    }

    return new Promise((accept, reject) => {
      if (!isServer()) {
        return accept(serverPlugClientHandler({ id, client }));
      }

      if (isPromise(component)) {
        //console.log('Component is a promise:');
        component.then((c_result) => {
          const server_plug_rendered_data = client.getPlugRenderData();
          server_plug_rendered_data.set(id, ssrValueEncode(c_result)); //{ element_type: isValidElement(component), result: c_result }
          //console.log(c_result);
          accept(c_result);
        }).then(reject);
      }
      else {
        const server_plug_rendered_data = client.getPlugRenderData();
        server_plug_rendered_data.set(id, ssrValueEncode(component));

        return accept(component);
      }
    });
  }
}

//to call server function
// export function asServer(props, component){
//   return fromServer(props,serverOnly(component));
// }

//use serverComponent directly
export function useServer(props, component) {
  const component_process = fromServer(props, component);
  // const ComponentX=(otherprops)=>{
  //   const result=component_process(otherprops);
  //   return result;//isPromise(result)?use(result):result;
  // }

  return function (child_props) {
    const { fallback, ...otherprops } = child_props;

    //for server return with suspense
    return (<Suspense fallback={(fallback ? fallback : <label>Loading...</label>)}>
      {component_process(otherprops)}
    </Suspense>);
  };
}