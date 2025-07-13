"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerMove = exports.joinGlobal = void 0;
class GlobalRoom {
    name = 'GLOBAL';
    playerCount = 0;
    clients;
    state;
    TICK_RATE = 1000 / 30;
    loopCheck;
    constructor() {
        this.state = {
            id: this.id,
            type: this.type,
            players: {}
        };
        this.clients = new Map();
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
            id: ws.id,
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
            message: `player ${playerID} joined global room`
        }));
        await this.startGameLoop();
        this.broadcast({
            type: 'player-in',
            data: pos
        });
        console.log(`player ${playerID} joined global room`);
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
                message: `player ${playerID} left global room`
            });
            ws.roomID = null;
            console.log(`player ${playerID} left global room`);
            return;
        }
        if (this.clients.size === 0) {
            ws.send(JSON.stringify({
                type: 'empty',
                data: null,
            }));
            console.log(`global room is empty`);
        }
    }
    async broadcast(message) {
        const payload = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
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
            data: {
                update: newPositions,
                playerCount: this.playerCount
            },
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
const globalRoom = new GlobalRoom();
exports.default = globalRoom;
const joinGlobal = async (ws, info) => {
    await globalRoom.addPlayer(ws, info);
};
exports.joinGlobal = joinGlobal;
const playerMove = async (ws, info) => {
    await globalRoom.updatePlayerPosition(ws.id, info.x, info.y);
};
exports.playerMove = playerMove;
