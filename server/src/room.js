"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomChat = exports.leaveRoom = exports.joinRoom = exports.getRoomData = exports.createRoom = exports.activeRooms = void 0;
const ws_1 = require("ws");
class Room {
    id;
    name;
    type;
    playerCount = 0;
    clients;
    state;
    playerLimit = 4;
    TICK_RATE = 1000 / 30;
    loopCheck;
    constructor(id, name, type = 'PUBLIC', playerLimit = 4) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.state = {
            id: this.id,
            type: this.type,
            players: {}
        };
        this.clients = new Map();
        this.playerLimit = playerLimit;
    }
    async addPlayer(ws, info) {
        const playerID = ws.id;
        if (this.clients.has(playerID)) {
            ws.send(JSON.stringify({
                type: 'warning',
                data: null,
                message: `player ${playerID} already in room`
            }));
            console.log(`player ${playerID} already in room`);
            return;
        }
        const pos = {
            x: info.x,
            y: info.y,
            color: info.color
        };
        this.clients.set(playerID, ws);
        ws.roomID = this.id;
        this.state.players[playerID] = pos;
        this.playerCount++;
        ws.send(JSON.stringify({
            type: 'joined-room',
            data: pos,
            message: `player ${playerID} joined room ${this.id}`
        }));
        this.broadcast({
            type: 'player-in',
            data: pos,
        });
        await this.startGameLoop();
        console.log(`player ${playerID} joined room ${this.id}`);
    }
    async removePlayer(ws) {
        const playerID = ws.id;
        if (this.clients.has(playerID)) {
            this.clients.delete(playerID);
            this.state.players[playerID] = null;
            this.playerCount--;
            this.broadcast({
                type: 'player-out',
                data: null,
                message: `player ${playerID} left room ${this.id}`
            });
            ws.roomID = null;
            console.log(`player ${playerID} left room ${this.id}`);
            return;
        }
        else {
            ws.send(JSON.stringify({
                type: 'not-found',
                data: null,
                message: `player ${playerID} does not exist in room ${this.id}`
            }));
            console.log(`player ${playerID} does not exist in room ${this.id}`);
            return;
        }
        if (this.clients.size === 0) {
            ws.send(JSON.stringify({
                type: 'empty',
                data: null,
            }));
            console.log(`room:${this.id} is empty`);
        }
    }
    async broadcast(message) {
        const payload = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }
    async roomChatMessage(ws, message) {
        if (this.clients.has(ws.id)) {
            this.broadcast({
                type: 'room-chat',
                data: {
                    from: ws.id,
                    message
                },
                message
            });
            return;
        }
        ws.send(JSON.stringify({
            type: 'not-found',
            data: null,
            message: 'join a room to send a chat message'
        }));
    }
    async startGameLoop() {
        if (this.loopCheck)
            return;
        let asyncRunning = false;
        this.loopCheck = setInterval(async () => {
            if (asyncRunning)
                return;
            asyncRunning = true;
            try {
                await this.updateGameState();
            }
            finally {
                asyncRunning = false;
            }
        }, this.TICK_RATE);
    }
    async stopGameLoop() {
        if (this.loopCheck) {
            clearInterval(this.loopCheck);
            this.loopCheck = null;
        }
    }
    async updateGameState() {
        const newPositions = Object.values(this.state.players).map(p => {
            if (p)
                return {
                    id: p.id,
                    x: p.x,
                    y: p.y,
                    color: p.color
                };
        });
        await this.broadcast({
            type: 'state-update',
            data: newPositions,
            message: 'game state update'
        });
    }
    async updatePlayerPosition(playerID, newX, newY) {
        const player = this.state.players[playerID];
        if (player) {
            player.x = newX;
            player.y = newY;
            await this.broadcast({
                type: 'player-moved',
                data: {
                    id: playerID,
                    x: player.x,
                    y: player.y
                },
                message: 'player moved'
            });
        }
    }
}
exports.activeRooms = new Map();
const createRoom = async () => {
    const roomID = 'trplx';
    const newRoom = new Room(roomID, 'demo');
    exports.activeRooms.set(roomID, newRoom);
    return newRoom;
};
exports.createRoom = createRoom;
const getRoomData = (ws) => {
    let rooms = [...exports.activeRooms.values()].map(room => ({
        id: room.id,
        type: room.type,
        playerCount: room.playerCount,
        playerLimit: room.playerLimit
    }));
    ws.send(JSON.stringify({
        type: 'room-list',
        data: rooms,
        message: 'room list'
    }));
    console.log(rooms);
};
exports.getRoomData = getRoomData;
const joinRoom = async (ws, roomID, info) => {
    if (exports.activeRooms.has(roomID)) {
        const targetRoom = exports.activeRooms.get(roomID);
        if (targetRoom.playerCount === targetRoom.playerLimit) {
            ws.send(JSON.stringify({
                type: 'warning',
                data: null,
                message: 'room is full'
            }));
            return;
        }
        await targetRoom.addPlayer(ws, info);
        return;
    }
    ws.send(JSON.stringify({
        type: 'not-found',
        data: null,
        message: 'room does not exist'
    }));
    console.log(`room:${roomID} does not exist`);
};
exports.joinRoom = joinRoom;
const leaveRoom = async (ws, roomID) => {
    if (exports.activeRooms.has(roomID)) {
        const targetRoom = exports.activeRooms.get(roomID);
        await targetRoom.removePlayer(ws);
        return;
    }
    ws.send(JSON.stringify({
        type: 'not-found',
        data: null,
        message: 'room does not exist'
    }));
    console.log(`room:${roomID} does not exist`);
};
exports.leaveRoom = leaveRoom;
const roomChat = async (ws, message) => {
    if (ws.roomID) {
        const targetRoom = exports.activeRooms.get(ws.roomID);
        await targetRoom.roomChatMessage(ws, message);
        return;
    }
    ws.send(JSON.stringify({
        type: 'not-found',
        data: null,
        message: 'join a room to send a chat message'
    }));
};
exports.roomChat = roomChat;
