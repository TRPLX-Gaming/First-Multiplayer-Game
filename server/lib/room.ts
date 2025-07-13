import {generateID} from './utils'
import {WebSocket} from 'ws'
import {
  Player,
  WSClient,
  WSPayload,
  RoomState,
  RoomAccess,
  AvailableRooms
} from './types'

class Room {
  public id:string
  public name:string
  public type:RoomAccess
  public playerCount:number = 0
  public clients:Map<string,WSClient>
  public state:RoomState
  public playerLimit:number = 4
  
  private TICK_RATE = 1000/30
  private loopCheck:any

  constructor(id:string,name:string,type:RoomAccess='PUBLIC',playerLimit:number = 4) {
    this.id = id
    this.name = name
    this.type = type
    this.state = {
      id:this.id,
      type:this.type,
      players:{}
    }
    this.clients = new Map()
    this.playerLimit = playerLimit
  }
  
  async addPlayer(ws:WSClient,info:Player):Promise<void> {
    const playerID = ws.id 
    if(this.clients.has(playerID)) {
      ws.send(JSON.stringify({
        type:'warning',
        data:null,
        message:`player ${playerID} already in room`
      }))
      console.log(`player ${playerID} already in room`)
      return
    }
    
    const pos:Player = {
      x:info.x,
      y:info.y,
      color:info.color
    }
    this.clients.set(playerID,ws)
    ws.roomID = this.id
    this.state.players[playerID] = pos 
    this.playerCount++
    ws.send(JSON.stringify({
      type:'joined-room',
      data:pos,
      message:`player ${playerID} joined room ${this.id}`
    }))
    this.broadcast({
      type:'player-in',
      data:pos,
      
    })
    
    await this.startGameLoop()
    console.log(`player ${playerID} joined room ${this.id}`)
    
  }
  
  async removePlayer(ws:WSClient):Promise<void> {
    const playerID = ws.id 
    if(this.clients.has(playerID)) {
      this.clients.delete(playerID)
      this.state.players[playerID] = null
      this.playerCount--
      this.broadcast({
        type:'player-out',
        data:null,
        message:`player ${playerID} left room ${this.id}`
      })
      ws.roomID = null
      console.log(`player ${playerID} left room ${this.id}`)
      return
    } else {
      ws.send(JSON.stringify({
        type:'not-found',
        data:null,
        message:`player ${playerID} does not exist in room ${this.id}`
      }))
      console.log(`player ${playerID} does not exist in room ${this.id}`)
      return
    }
    
    if(this.clients.size === 0) {
      ws.send(JSON.stringify({
        type:'empty',
        data:null,
      }))
      console.log(`room:${this.id} is empty`)
    }
  }
  
  private async broadcast(message:WSPayload):Promise<void> {
    const payload = JSON.stringify(message)
    this.clients.forEach(client => {
      if(client.readyState === WebSocket.OPEN) {
        client.send(payload)
      }
    })
  }
  
 async roomChatMessage(ws:WSClient,message:string):Promise<void> {
    if(this.clients.has(ws.id)) {
      this.broadcast({
        type:'room-chat',
        data:{
          from:ws.id,
          message
        },
        message
      })
      return
    }
    
    ws.send(JSON.stringify({
      type:'not-found',
      data:null,
      message:'join a room to send a chat message'
    }))
  }
  
  async startGameLoop():Promise<void> {
    if(this.loopCheck) return
    let asyncRunning:boolean = false
    this.loopCheck = setInterval(async ()=>{
      if(asyncRunning) return
      asyncRunning = true
      try {
        await this.updateGameState()
      } finally {
        asyncRunning = false
      }
    },this.TICK_RATE)
  }
  
  async stopGameLoop():Promise<void> {
    if(this.loopCheck) {
      clearInterval(this.loopCheck)
      this.loopCheck = null
    }
  }
  
  async updateGameState():Promise<void> {
    // update everyone on new positions
    const newPositions = Object.values(this.state.players).map(p => {
      if(p) return {
        id:p.id,
        x:p.x,
        y:p.y,
        color:p.color
      }
    })
    
    await this.broadcast({
      type:'state-update',
      data:newPositions,
      message:'game state update'
    })
  }
  
  // called by websocket event handler
  async updatePlayerPosition(playerID:string,newX:number,newY:number):Promise<void> {
    const player = this.state.players[playerID]
    if(player) {
      player.x = newX
      player.y = newY
      
      await this.broadcast({
        type:'player-moved',
        data:{
          id:playerID,
          x:player.x,
          y:player.y
        },
        message:'player moved'
      })
    }
  }
  
}

export const activeRooms = new Map<string,Room>()

// --------util functs
export const createRoom = async ():Promise<Room> => {
  //const roomID = await generateID()
  const roomID = 'trplx'
  const newRoom = new Room(roomID,'demo')
  activeRooms.set(roomID,newRoom)
  return newRoom
}

export const getRoomData = (ws:WSClient):void => {
  let rooms:AvailableRooms[] = [...activeRooms.values()].map(room => ({
    id:room.id,
    type:room.type,
    playerCount:room.playerCount,
    playerLimit:room.playerLimit
  }))
  ws.send(JSON.stringify({
    type:'room-list',
    data:rooms,
    message:'room list'
  }))
  console.log(rooms)
}

export const joinRoom = async (ws:WSClient,roomID:string,info:Player):Promise<void> => {
  if(activeRooms.has(roomID)) {
    /**
     * for room limiting, i could add a check like if the room size reaches a
     * point, no new players can join
     */
    
    const targetRoom = activeRooms.get(roomID)
    if(targetRoom.playerCount === targetRoom.playerLimit) {
      ws.send(JSON.stringify({
        type:'warning',
        data:null,
        message:'room is full'
      }))
      return
    }
    await targetRoom.addPlayer(ws,info)
    return
  }
  
  ws.send(JSON.stringify({
    type:'not-found',
    data:null,
    message:'room does not exist'
  }))
  console.log(`room:${roomID} does not exist`)
}

export const leaveRoom = async (ws:WSClient,roomID:string):Promise<void> => {
  if(activeRooms.has(roomID)) {
    const targetRoom = activeRooms.get(roomID)
    await targetRoom.removePlayer(ws)
    return
  }
  
  ws.send(JSON.stringify({
    type:'not-found',
    data:null,
    message:'room does not exist'
  }))
  console.log(`room:${roomID} does not exist`)
}

export const roomChat = async (ws:WSClient,message:string):Promise<void> => {
  if(ws.roomID) {
    const targetRoom = activeRooms.get(ws.roomID)
    await targetRoom.roomChatMessage(ws,message)
    return
  }
  
  ws.send(JSON.stringify({
    type:'not-found',
    data:null,
    message:'join a room to send a chat message'
  }))
}