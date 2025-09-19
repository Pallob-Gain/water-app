import React, { useState, isValidElement, useEffect, use } from "react";
import clientSessions from "../React/client-sessions.js";
import { isServer, reCreateElement, isPromise, fromServer, ssrValueEncode, ssrValueDecode, serverPlugClientHandler, ClientSigneture } from './SSR.jsx';
import { sendServerHookTrigger, sendServerHookTriggerFor, attachServerHookState, attachServerInterface } from "../React/server-function-handle.js";

//it will hold all the server state and will attach with the client from the server so that all the states are available to client
/*
    If the server access the state later, then it will not be render with the client to avoid the issue we need keep available all the state data to a client
*/
export const app_all_server_states = new Map();
const client_hook_state_flag = new Map(); //that will be for client to check a state is initialized or not

export function sendServerState(key, result) {
    const value = ssrValueEncode(result);
    app_all_server_states.set(key, value); //restore the update
    sendServerHookTrigger(key, value);
}

function serverStateHandler(key, result, ...args) {
    //console.log(key,{element_type: isValidElement(result), result});
    //console.log(key,sendServerStateX);
    sendClientStateToServer(key, ssrValueEncode(result), ...args); //it is global define at ./client-js/socket-handle.js
}

export function attachServerState(key, initialValue) {
    // console.log('attachServerState:',key,initialValue);
    const valueLoader = () => {
        //console.log('Loading state for:', key);
        if (isServer()) return typeof initialValue == 'function' ? initialValue() : initialValue;
        //if the latest server update available (cation only if the hydration completed, otherwise hydration could fail because of mismatched state) then use that data other wise use the initial value
        return socketSharedState.has(key) && clientSessions.isHydrated ? ssrValueDecode(socketSharedState.get(key)) : (typeof initialValue == 'function' ? initialValue() : initialValue);
    };

    const [value, setValue] = useState(valueLoader); //socketSharedState from global


    const client_setValue = async (state, ...args) => {

        if (isServer()) return; //only execute in client
        //console.log('state:',state);
        const result_value = typeof state == 'function' ? await state(value) : state;
        //console.log('result_value:',result_value);
        serverStateHandler(key, result_value, ...args);
    };

    useEffect(() => {
        const latest_value = valueLoader();
        //console.log('State initialized for:', key, latest_value);
        setValue(latest_value);

        const callback = (value) => {
            if (clientSessions.isHydrated) setValue(ssrValueDecode(value)); //only update after hydration
        };

        //console.log('Subscription');

        subscribeSocket(key, callback);

        return () => {
            unsubscribeSocket(key, callback);
            //console.log('unsubscription');
        };
    }, [key, initialValue]);

    return [value, client_setValue];
}



export function createServerState(key, initial_value, update_callback = null) {
    if (!key) throw new Error('Creating a server state requires a key.');

    //key=Symbol(key);
    let current_value = typeof initial_value == 'function' ? (isServer() ? initial_value(key) : null) : initial_value; //only at server make the action
    //console.log('initalize current value:',current_value);

    if (isPromise(current_value)) return new Promise((accept, reject) => {
        current_value.then(state => {
            //console.log('parsed state:',state);
            accept(createServerState(key, state, update_callback));
        }).catch(reject);
    });

    const valueUpdateCallbackHolder = [];

    const getCurrentState = () => {
        //console.log('current_value:',current_value);
        return current_value;
    }

    const onSet = (cb) => {
        //onSet only available to server
        if (!isServer() || typeof cb != 'function') {
            //if calling from client or the callback is not function
            return;
        }

        valueUpdateCallbackHolder.push(cb);
    }

    const setData = (current_value, ...args) => {
        sendServerState(key, current_value);
        for (const cb of valueUpdateCallbackHolder) {
            cb(current_value, ...args);
        }
    }

    onSet(update_callback); //attach the updater

    const setState = async (result, ...args) => {
        if (!isServer()) return; //that will be for only server
        current_value = typeof result == 'function' ? await result(current_value) : result;
        setData(current_value, ...args);
    }

    //update data only update the holder data and the remote listender not the onSet callbacks
    const updateData = async (result, ...args) => {
        if (!isServer()) return; //that will be for only server
        current_value = typeof result == 'function' ? await result(current_value) : result;
        sendServerState(key, current_value);
    }

    if (isServer()) {
        //only applicable to server
        attachServerHookState(key, (state, ...args) => {
            current_value = ssrValueDecode(state);
            setData(current_value, ...args);
        });
    }

    if (app_all_server_states.has(key)) throw new Error('A server state with this ID has already been assigned.');
    app_all_server_states.set(key, ssrValueEncode(current_value)); //keep the inititial server data

    return [Object.freeze({ key, getCurrentState, onSet, get: getCurrentState, set: setState, update: updateData }), setState];
}

function lazyStateBinder(stateDefinition, import_func) {
    if (!stateDefinition || !import_func) throw new Error('Invalid arguments provided.');

    const [state, setState] = stateDefinition;

    const refreashCallbacks = [];

    const onRefresh = (cb) => {
        if (!isServer() || typeof cb != 'function') return;
        refreashCallbacks.push(cb);
    }

    const refresh = async (...args) => {
        if (!isServer()) return; // Only allowed on server
        const newState = await import_func(state.key, ...args);
        await state.update(newState);
        for (const cb of refreashCallbacks) {
            cb(newState, ...args);
        }
    }

    return [Object.freeze({ ...state, onRefresh, refresh }), setState];
}

export function createLazyServerState(key, import_func, update_callback = null) {
    if (typeof import_func != 'function') throw new Error('The lazy server state requires an import function.');

    const stateDefinition = createServerState(key, import_func, update_callback);
    if (isPromise(stateDefinition)) return stateDefinition.then(def => lazyStateBinder(def, import_func));

    return lazyStateBinder(stateDefinition, import_func);
}

//attach all the server states to a new client
export function attachServerStatesToClient(client) {
    const server_plug_rendered_data = client.getPlugRenderData();
    for (const [key, value] of app_all_server_states.entries()) {
        server_plug_rendered_data.set(key, value); //plugging the values
    }
}

export function useServerState(serverState) {
    //console.log('mount useServerState:', serverState);

    if (!serverState || !('key' in serverState)) throw new Error('Valid server state was not provided!');
    const { key, getCurrentState } = serverState;
    if (isServer()) {
        client_hook_state_flag.set(key, getCurrentState());
    }
    else if (!client_hook_state_flag.has(key)) {
        if (!clientSessions.client) throw new Error('Client signature was not provided!');
        if (!(clientSessions.client instanceof ClientSigneture)) throw new Error('Client signature is invalid!');

        //server state data will be attach to the client auto matically so it does not need to call from server explicitly before
        client_hook_state_flag.set(key, serverPlugClientHandler({ id: key, client: clientSessions.client }));
    }

    return attachServerState(key, client_hook_state_flag.get(key));
}

/**
 * @deprecated Use `useServerState()` instead. Will be removed in v2.0.
 */
export function fromServerState(props, serverState) {
    if (!props || !('client' in props)) throw new Error('Client signature was not provided!');
    if (!serverState || !('key' in serverState)) throw new Error('Valid server state was not provided!');
    const { client } = props;
    const { key, getCurrentState } = serverState;
    //is server or inital state then load fully


    if (isServer()) {
        //in server use for promise parse
        const read_value = fromServer({ id: key, client }, getCurrentState());
        // console.log('server read_value:',key,read_value);

        const value = use(read_value);
        // console.log('server fromServerState:',key,value,read_value);

        client_hook_state_flag.set(key, value);
    }
    else if (!client_hook_state_flag.has(key)) {
        //in client 
        const read_value = fromServer({ id: key, client }, getCurrentState(), true); //direct access
        //console.log('client read_value:',key,read_value);
        client_hook_state_flag.set(key, read_value);
    }


    return attachServerState(key, client_hook_state_flag.get(key));
}

//channel communication
export function createClientChannel(key) {
    if (!key) throw new Error('Creating a client channel requires a key.');

    const sendFor = (tokens, ...args) => {
        if (!isServer()) return; //only allowed to server

        const send_data = args.map(result => ssrValueEncode(result));

        if (tokens) sendServerHookTriggerFor(tokens, key, send_data);
        else sendServerHookTrigger(key, send_data);
    }

    const send = (...args) => {
        sendFor(null, ...args);
    }

    const sendTo = (tokens, ...args) => {
        sendFor(tokens, ...args); //send to particular device
    }

    const recv = (callback) => {
        if (isServer()) return; //only allowed to client

        useEffect(() => {

            const cb = (cb_params) => {
                const cb_rcv = cb_params ? cb_params.map(value => ssrValueDecode(value)) : [];
                callback(...cb_rcv);
            };
            subscribeSocket(key, cb);
            return () => {
                unsubscribeSocket(key, cb);
            };
        }, [key]);
    }

    return [{ key, recv }, { key, send, sendTo }]; //[receiver,sender]
}



export function createChannel(key) {
    if (!key) throw new Error('Creating a server channel requires a key.');

    const callbackHolder = [];
    const server_callback_runner = (...args) => {
        return Promise.allSettled(callbackHolder.map(cb => cb(...args)));
    };

    const send = (...args) => {
        if (isServer()) {
            //transmitting from server
            const send_data = args.map(result => ssrValueEncode(result));
            sendServerHookTrigger(key, send_data);
            return server_callback_runner(...args);
        }
    }

    const clientSend = (...args) => {
        if (!isServer()) {
            //transmitting from client
            if (!clientSessions.client) throw new Error('Client signature was not provided!');
            if (!(clientSessions.client instanceof ClientSigneture)) throw new Error('Client signature is invalid!');

            serverInterfaceCaller({ id: key, client: clientSessions.client }, ...args);
            return server_callback_runner(...args);
        }
    }


    const serverRecv = (callback) => {
        if (isServer()) {
            //In server recv should be only work outside of the component
            callbackHolder.push(callback);
        }
    }

    const recv = (callback) => {
        //it is only allowed in component in client it will be in component so useEffect
        useEffect(() => {
            const cb = (cb_params) => {
                const cb_rcv = cb_params ? cb_params.map(value => ssrValueDecode(value)) : [];
                callback(...cb_rcv);
            };
            subscribeSocket(key, cb);
            callbackHolder.push(callback);
            return () => {
                unsubscribeSocket(key, cb);
                const index = callbackHolder.indexOf(callback);
                if (index > -1) callbackHolder.splice(index, 1); //remove from the list
            };
        }, [key]);
    }

    if (isServer()) {
        //if mounded in  server then create the interface for the callback
        attachServerInterface(key, server_callback_runner); //once client will transmit something it will run the server callback
    }

    return [{ key, recv, serverRecv }, { key, send, clientSend }]; //[receiver,sender]
}

async function serverInterfaceCaller(details, ...args) {
    const { client, id } = details;
    if (!client || !(client instanceof ClientSigneture)) throw new Error('Client signature is invalid!');
    const client_info = client.getSigneture();

    const response = await new Promise((accept, reject) => {
        requestServerInterface({ id, client_info, args, accept, reject }); //it is global define at ./client-js/socket-handle.js
    });

    return ssrValueDecode(response);
}

//server Interface similar to server function but with different flavour
// only difference is that it will be only can be call from client event or useEffect
// also, the interface is not requied to be exported
//it also does not have timeout
export function createServerInterface(id, callback) {
    if (!id || typeof id != "string") throw new Error('Missing or invalid unique key ID.');
    if (typeof callback != "function") throw new Error('The server interface should provide a callback function.');

    if (isServer()) {

        attachServerInterface(id, callback);

        return async (...child_props) => {
            //server return function will not be run at server, it must need to be from client
            throw new Error('Use the server interface only inside an event handler or a useEffect hook.');
        };
    }
    else {
        //client running this function
        return async (...child_props) => {
            if (!clientSessions.client) throw new Error('Client signature was not provided!');
            if (!(clientSessions.client instanceof ClientSigneture)) throw new Error('Client signature is invalid!');

            const result = await serverInterfaceCaller({ id, client: clientSessions.client }, ...child_props);
            //console.log('Server interface result:',result);
            return result;
        }
    }
}

//runOnServer is a hook like useEffect but it will only run in server
export function runOnServer(callback) {
    if (typeof callback != 'function') throw new Error('The runOnServer hook requires a callback function.');
    if (isServer()) {
        return callback();
    }
    return null;
}