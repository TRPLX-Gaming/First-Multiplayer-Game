import {WebSocket} from 'ws'

export interface WSPayload {
  type:string,
  data:any,
  message?:string
}

export interface WSClient extends WebSocket {
  id:string,
  username?:string,
  roomID?:string | null,
  isAlive:boolean
}

export interface Player {
  id:string,
  x:number,
  y:number,
  color:string
}

export interface RoomState {
  id:string,
  type:RoomAccess,
  players:{ [playerID:string]: Player | null} //using nested objects with IDs as indexes for speed, ease of use
}

export type RoomAccess = 'PUBLIC' | 'PRIVATE'
// public anyone can join
// private will generate and give the cteator a secret key through which others can join

export interface AvailableRooms {
  id:string,
  type:RoomAccess,
  playerCount:number,
  playerLimit:number
}