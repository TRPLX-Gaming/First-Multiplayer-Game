"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const room_1 = require("./room");
const utils_1 = require("./utils");
const GlobalRoom_1 = require("./GlobalRoom");
async function test() {
    let test = await (0, room_1.createRoom)();
}
test();
const handleOperation = async (ws, data) => {
    const type = data.type;
    switch (type) {
        case 'join-room':
            await (0, room_1.joinRoom)(ws, data.data.roomID, data.data.player);
            break;
        case 'leave-room':
            await (0, room_1.leaveRoom)(ws, data.data.roomID);
            break;
        case 'room-chat':
            await (0, room_1.roomChat)(ws, data.data.message);
            break;
        case 'change-name':
            (0, utils_1.changeName)(ws, data.data.username);
            break;
        case 'join-global':
            await (0, GlobalRoom_1.joinGlobal)(ws, data.data.player);
            break;
        case 'player-moved':
            await (0, GlobalRoom_1.playerMove)(ws, data.data.player);
            break;
        default:
            ws.send(JSON.stringify({
                type: 'not-found',
                data: null
            }));
    }
};
exports.default = handleOperation;
