import path from 'node:path';
import { pathToFileURL } from 'node:url';
import React, { isValidElement } from "react";
import { ssrValueEncode } from '../UI/SSR.jsx';
import global_share from "../global-share.js";

let current_running_socket = null;
const hookStateHolder = new Map(); //server state callback holder
const serverInterfaceHolder = new Map(); //hold all the server interface

export function sendServerHookTrigger(key, value) {
    if (current_running_socket) {
        current_running_socket.emit('react/server-hook/trigger', { key, value });
    }
}

export function sendServerHookTriggerFor(token, key, value) {
    if (current_running_socket) {
        //send for a list of particular device
        current_running_socket.emitByToken(token, 'react/server-hook/trigger', { key, value });
    }
}

export function attachServerHookState(key, callback) {
    hookStateHolder.set(key, callback);
}

export function attachServerInterface(key, callback) {
    if (serverInterfaceHolder.has(key)) throw new Error('This ID is already assigned to a server interface.');
    serverInterfaceHolder.set(key, callback);
}

export function serverFunctionHandler(socket) {
    current_running_socket = socket;

    //server interface handle
    socket.on('react/server-interface/call', async function (s_client, props) {
        //console.log('react/server-function/call:',props);
        const { request_id, id, client_info, args } = props;
        if (request_id) {
            try {
                if(!id || !serverInterfaceHolder.has(id)) throw `The server interface ID is invalid.`;
                const result = await serverInterfaceHolder.get(id).call(client_info, ...args);
                s_client.emit('react/server-interface/response', { request_id, response: ssrValueEncode(result) });
            }
            catch (err) {
                //console.log('Server function error:',err);
                s_client.emit('react/server-interface/response', { request_id, error: err instanceof Error ? `An error occurs when invoking the server interface ${id}.` : err });
                global_share.debugSys.error(err);
            }
        }
    });

    //server function handle
    socket.on('react/server-function/call', async function (s_client, props) {
        //console.log('react/server-function/call:',props);
        const { request_id, name, origin, client_info, args } = props;
        if (request_id) {
            try {
                if (!(name && origin && args)) throw `Server function: ${name} incomplete request prameters`;
                const file_link = pathToFileURL(path.join(global_share.__appdir, origin));
                
                //console.log('File Origin:',origin);
                //console.log('Server function file link:',file_link.href);

                const page = await import(file_link);
                if (!(name in page)) throw `The server function: ${name} is not exported from ${origin}.`;
                const result = await page[name].call(client_info, ...args);

                s_client.emit('react/server-function/response', { request_id, response: ssrValueEncode(result) });
            }
            catch (err) {
                //console.log('Server function error:',err);
                s_client.emit('react/server-function/response', { request_id, error: err instanceof Error ? `An error occurs when invoking the server function ${name}.` : err });
                global_share.debugSys.error(err);
            }
        }
    });

    //server state backflow
    socket.on('react/server-hook/set-state', function (s_client, props) {
        //console.log('react/server-hook/set-state:',props);
        const { request_id, key, state, args } = props;
        if (request_id && key) {
            if (hookStateHolder.has(key)) {
                const hook_state = hookStateHolder.get(key);
                if (typeof hook_state == 'function') {
                    hook_state(state, ...args);
                }
            }
        }
    });
}