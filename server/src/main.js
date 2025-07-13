"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http = __importStar(require("http"));
const path_1 = __importDefault(require("path"));
const ws_1 = require("ws");
const utils_1 = require("./utils");
const Handler_1 = __importDefault(require("./Handler"));
const room_1 = require("./room");
const GlobalRoom_1 = __importDefault(require("./GlobalRoom"));
const PATH = path_1.default.join(__dirname, '../../game');
const TARGET = path_1.default.join(PATH, '/index.html');
const PING_DELAY = 2000;
const connectedClients = new Map();
const app = (0, express_1.default)();
const server = http.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
app.use(express_1.default.static(PATH));
app.get('/', async (req, res) => {
    res.sendFile(TARGET);
});
const globalChat = async (ws, message) => {
    if (typeof message !== 'string') {
        ws.send(JSON.stringify({
            type: 'error',
            data: null,
            message: 'imvalid message format'
        }));
    }
    if (connectedClients.has(ws.id)) {
        connectedClients.forEach(client => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'global-chat',
                    data: {
                        from: ws.username ? ws.username : ws.id,
                        message: message
                    }
                }));
            }
        });
    }
};
let loopCheck = null;
wss.on('connection', async (ws) => {
    const client = ws;
    client.id = await (0, utils_1.generateID)(8);
    client.isAlive = true;
    console.log(`client, id:${client.id} joined the global lobby`);
    connectedClients.set(client.id, client);
    client.send(JSON.stringify({
        type: 'connected',
        data: client.id,
        message: `joined with id: ${client.id}`
    }));
    client.on('message', async (message) => {
        if (message.toString() === 'pong') {
            client.isAlive = true;
            return;
        }
        let data;
        try {
            data = JSON.parse(message);
            if ((0, utils_1.validateType)(data)) {
                if (data.type === 'global-chat') {
                    await globalChat(client, data.message);
                    return;
                }
                await (0, Handler_1.default)(client, data);
            }
            else {
                console.log(data);
                client.send(JSON.stringify({
                    type: 'err',
                    data: null,
                    message: 'invalid JSON format'
                }));
            }
        }
        catch (err) {
            console.error('WebSocket err: could not parse string');
            client.send(JSON.stringify({
                type: 'error',
                data: null,
                message: 'invalid JSON string'
            }));
        }
    });
    if (!loopCheck) {
        loopCheck = setInterval(() => {
            connectedClients.forEach(client => {
                if (client.readyState === ws_1.WebSocket.OPEN) {
                    (0, room_1.getRoomData)(client);
                }
            });
        }, 10000);
    }
    client.on('close', () => {
        console.log(`client ${client.id} disconnected`);
        connectedClients.delete(client.id);
        GlobalRoom_1.default.removePlayer(client);
        if (client.roomID) {
            const clientRoom = room_1.activeRooms.get(client.roomID);
            clientRoom.clients.delete(client.id);
            clientRoom.state.players[client.id] = null;
            client.roomID = null;
        }
        if (connectedClients.size === 0) {
            clearInterval(loopCheck);
            loopCheck = null;
            console.log('no users');
        }
    });
    client.on('error', (err) => {
        console.log('WebSocket err', err);
    });
});
setInterval(() => {
    wss.clients.forEach(client => {
        if (client.isAlive === false) {
            console.log(`${client.id} left`);
            connectedClients.delete(client.id);
            return client.terminate();
        }
        client.isAlive = false;
        client.send('ping');
        console.log(connectedClients.size);
    });
}, PING_DELAY);
app.use((req, res, next) => {
    res.sendFile(TARGET);
});
server.listen(3000, () => console.log('http server active on port 3000'));
