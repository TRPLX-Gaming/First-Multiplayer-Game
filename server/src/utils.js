"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeName = exports.validateType = exports.generateID = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateID = (length = 16) => {
    const size = length / 2;
    return new Promise((resolve, reject) => {
        crypto_1.default.randomBytes(size, (err, buffer) => {
            if (err)
                reject(err);
            resolve(buffer.toString('hex'));
        });
    });
};
exports.generateID = generateID;
const validateType = (data) => {
    if (typeof data.type !== 'string')
        return false;
    return true;
};
exports.validateType = validateType;
const changeName = (ws, newName) => {
    ws.username = newName;
    ws.send(JSON.stringify({
        type: 'update',
        data: null,
        message: `changed ${ws.id} name to ${newName}`
    }));
};
exports.changeName = changeName;
