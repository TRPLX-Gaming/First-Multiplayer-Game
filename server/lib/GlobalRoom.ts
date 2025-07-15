import {
  Player,
  WSClient,
  WSPayload,
  RoomState,
} from './types'

const GAME_WIDTH = 450
const GAME_HEIGHT = 300
const OBJ_SIZE = 30

class GlobalRoom {
  public readonly name:string = 'GLOBAL'
  public playerCount:number = 0
  public clients:Map<string,WSClient>
  public state:RoomState
  
  private TICK_RATE = 1000/30
  private loopCheck:any
  
  constructor() {
    this.state = {
      id:this.id,
      type:this.type,
      players:{}
    }
    this.clients = new Map()
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
      id:ws.id,
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
      message:`player ${playerID} joined global room`
    }))
    await this.startGameLoop()
    this.broadcast({
      type:'player-in',
      data:pos,
      message:`player ${playerID} joined global room`
    })
    console.log(`player ${playerID} joined global room`)
    
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
        message:`player ${playerID} left global room`
      })
      ws.roomID = null
      console.log(`player ${playerID} left global room`)
      return
    } 
    
    if(this.clients.size === 0) {
      ws.send(JSON.stringify({
        type:'empty',
        data:null,
      }))
      console.log(`global room is empty`)
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
        x:p.x < 0 ? Math.max(0,p.x) : p.x > GAME_WIDTH ? Math.min(GAME_WIDTH-OBJ_SIZE,GAME_WIDTH) : p.x,
        y:p.y < 0 ? Math.max(0,p.y) : p.y > GAME_HEIGHT ?
        Math.min(GAME_HEIGHT-OBJ_SIZE) : p.y,
        color:p.color
      }
    })
    
    await this.broadcast({
      type:'state-update',
      data:{
        update:newPositions,
        playerCount:this.playerCount
      },
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

const globalRoom = new GlobalRoom()

export default globalRoom

export const joinGlobal = async (ws:WSClient,info:Player):Promise<void> => {
  await globalRoom.addPlayer(ws,info)
}

// export const leaveGlobal = async (ws:WSClient):Promise<void> => {
//   await globalRoom.removePlayer(ws.id)
// }

export const playerMove = async (ws:WSClient,info:Player):Promise<void> => {
  await globalRoom.updatePlayerPosition(ws.id,info.x,info.y)
}