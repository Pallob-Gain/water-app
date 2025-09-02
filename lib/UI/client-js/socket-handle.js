var socket = io();

var socket_client_id;

socket.on('client-connect', function (id) {
    //console.log('Socket connected');

    socket_client_id = id;
    if (device_token.length != 0) socket.emit('token', device_token);
});

socket.on('hmr-reload', function (src_link) {
    window.location.reload();
});

// state shared across components: Server Hooks
const socketSharedState = new Map();
const socketListeners = new Map();

function subscribeSocket(key, callback) {
    if (!socketListeners.has(key)) socketListeners.set(key, new Set());
    socketListeners.get(key).add(callback);
}

function unsubscribeSocket(key, callback) {
    socketListeners.get(key)?.delete(callback);
}

function socketNotify(key, value) {
    socketSharedState.set(key, value);
    socketListeners.get(key)?.forEach(cb => cb(value));
}

socket.on('react/server-hook/trigger', function ({ key, value }) {
    socketNotify(key, value);
});

function sendClientStateToServer(key, state, ...args) {
    const request_id = uuidWithCrypto();
    //console.log('react/server-hook/set-state',{request_id,key,state});
    socket.emit('react/server-hook/set-state', { request_id, key, state, args });
}

//server function hooks
const server_function_stacks = {};
socket.on('react/server-function/response', function (response_info) {
    //console.log('react/server-function/response:',response_info);
    const { request_id, ...other_info } = response_info;
    if (request_id && request_id in server_function_stacks) {

        const details = server_function_stacks[request_id];
        const { accept, reject, time_out_counter } = details;
        clearTimeout(time_out_counter);
        delete server_function_stacks[request_id];

        if ('error' in other_info) return reject(other_info.error);
        else accept(other_info.response);
    }
});


function requestServerFunction(details) {
    //console.log('requestServerFunction:',details);
    const request_id = uuidWithCrypto();//crypto.randomUUID();
    const { name, origin, timeout, client_info, args, reject } = details;
    details.time_out_counter = setTimeout(() => {
        reject(`Response Timeout for Server Function: ${name}`);
        clearTimeout(details.time_out_counter);
        delete server_function_stacks[request_id];
    }, timeout ?? 60000); //if the server function does not response with in next 60 sec it will through an error if the timeout is not set
    server_function_stacks[request_id] = details;
    socket.emit('react/server-function/call', { request_id, name, origin, client_info, args });
}

//server function hooks
const server_interface_stacks = {};
socket.on('react/server-interface/response', function (response_info) {
    //console.log('react/server-interface/response:',response_info);
    const { request_id, ...other_info } = response_info;
    if (request_id && request_id in server_interface_stacks) {

        const details = server_interface_stacks[request_id];
        const { accept, reject } = details;
        delete server_interface_stacks[request_id];

        if ('error' in other_info) return reject(other_info.error);
        else accept(other_info.response);
    }
});

function requestServerInterface(details) {
    //console.log('requestServerInterface:',details);
    const request_id = uuidWithCrypto();//crypto.randomUUID();
    const { id, client_info, args } = details;
    server_interface_stacks[request_id] = details;
    socket.emit('react/server-interface/call', { request_id, id, client_info, args });
}