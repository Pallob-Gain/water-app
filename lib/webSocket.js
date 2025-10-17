import { Server } from 'socket-io';


export default class webSocket {
    socket_clients = new Map();
    socket_varified_clients = new Map();
    all_events = [];
    connect_events = [];
    disconnect_events = [];
    close_events = [];
    error_events = [];

    socketServer;

    constructor(webServer) {
        const config = {
            path: '/socket.io/',  // important to separate by path
        };

        this.socketServer = webServer && webServer.getHttpServer() ? new Server(webServer.getHttpServer(), config) : new Server(config);

        // this.socketServer.on('error', (error) => {
        //     console.error('Socket.IO Error----->:', error);
        // });

        const socketDismissHandler = (socket) => {
            if (this.socket_clients.has(socket.id)) {
                const user_token = this.socket_clients.get(socket.id);
                const user_clients = this.socket_varified_clients.get(user_token);
                user_clients.delete(socket.id); //remove the client
                if (user_clients.size == 0) this.socket_varified_clients.delete(user_token);
                this.socket_clients.delete(socket.id);
            }
        };

        const disconnectHandler = (socket, reason) => {

            socketDismissHandler(socket);

            for (const callback of this.disconnect_events) {
                callback(socket, reason);
            }
        };

        const closeHandler = (socket) => {
            socketDismissHandler(socket);

            for (const callback of this.close_events) {
                callback(socket);
            }
        };

        const errorHandler = (socket, error) => {
            for (const callback of this.error_events) {
                callback(socket, error);
            }
        };

        const stablishHandlers = (socket, token) => {
            this.socket_clients.set(socket.id, token);
            //for a single token there could have multiple devices
            if (!this.socket_varified_clients.has(token)) this.socket_varified_clients.set(token, new Set());
            this.socket_varified_clients.get(token).add(socket.id);
        };

        this.socketServer.on('connection', (socket) => {

            //console.log('Client Connected');

            for (const callback of this.connect_events) {
                callback(socket);
            }

            //plats all registered events
            for (const { key, callback } of this.all_events) {
                socket.on(key, (data) => callback(socket, data));
            }

            socket.emit('client-connect', socket.id);

            socket.conn.on("close", () => {
                //console.log('Socket connection closed');
                closeHandler(socket);
            });

            socket.conn.on("error", (err) => {
                //console.error("Socket connection error:", err);
                errorHandler(socket, err);
            });

            socket.on('disconnect', (reason) => {
                //console.log('Socket disconnected:', reason);
                disconnectHandler(socket, reason);
            });

            socket.on('token', (token) => {
                //console.log('Socket token received:', token);
                stablishHandlers(socket, token);
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
        this.socketServer.emit(key, data);
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

    onClose(callback) {
        this.close_events.push(callback);
    }

    onError(callback) {
        this.error_events.push(callback);
    }
}