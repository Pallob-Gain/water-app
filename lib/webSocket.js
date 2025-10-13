import { Server } from 'socket-io';


export default class webSocket {
    socket_clients = new Map();
    socket_varified_clients = new Map();
    all_events = [];
    connect_events = [];
    disconnect_events = [];

    socketServer;

    constructor(webServer) {
        const config = {
            path: '/socket.io/',  // important to separate by path
        };

        this.socketServer = webServer && webServer.getHttpServer() ? new Server(webServer.getHttpServer(), config) : new Server(config);


        this.socketServer.on('connection', (socket) => {

            //console.log('Client Connected');

            for (const callback of this.connect_events) {
                callback(socket);
            }

            for (const { key, callback } of this.all_events) {
                socket.on(key, (data) => callback(socket, data));
            }

            socket.emit('client-connect', socket.id);

            socket.on('disconnect', (reason) => {

                if (this.socket_clients.has(socket.id)) {
                    const user_token = this.socket_clients.get(socket.id);
                    const user_clients = this.socket_varified_clients.get(user_token);
                    user_clients.delete(socket.id); //remove the client
                    if (user_clients.size == 0) this.socket_varified_clients.delete(user_token);
                    this.socket_clients.delete(socket.id);
                }

                for (const callback of this.disconnect_events) {
                    callback(socket, reason);
                }
            });

            socket.on('token', (token) => {
                this.socket_clients.set(socket.id, token);
                //for a single token there could have multiple devices
                if (!this.socket_varified_clients.has(token)) this.socket_varified_clients.set(token, new Set());
                this.socket_varified_clients.get(token).add(socket.id);
            });

        });

    }

    handler(request_back) {
        return this.socketServer.handler(request_back);
    }

    emitByToken(token, key, data) {
        if (typeof token == 'string') {
            if (this.socket_varified_clients.has(token)) {
                this.socket_varified_clients.get(token).forEach(socket_id => {
                    this.socketServer.to(socket_id).emit(key, data);
                });
            }
        }
        else if (Array.isArray(token)) {
            for (const tkn of token) {
                emitByToken(tkn, key, data);
            }
        }
    }

    emitById(id, key, data) {
        this.socketServer.to(id).emit(key, data);
    }

    emit(key, data) {
        //this.socketServer.emit(key, data);
        this.socket_varified_clients.entries().forEach(([_token, clients]) => {
            clients.forEach(socket_id => {
                this.socketServer.to(socket_id).emit(key, data);
            });
        });
    }

    on(key, callback) {
        this.all_events.push({ key, callback });
    }

    onConnect(callback) {
        this.connect_events.push(callback);
    }

    onDisconnect(callback) {
        this.disconnect_events.push(callback);
    }

}