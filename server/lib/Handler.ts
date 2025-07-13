// imports
import {WSClient,WSPayload} from './types'
import {
  createRoom,
  joinRoom,
  leaveRoom,
  roomChat
} from './room'
import {changeName} from './utils'
import {
  joinGlobal,
  playerMove
} from './GlobalRoom'

// handling....
async function test():Promise<void> {
  let test = await createRoom()
}
test()
const handleOperation = async (ws:WSClient,data:WSPayload):Promise<void> => {
  const type:string = data.type
  switch(type) {
    case 'join-room':
      await joinRoom(ws,data.data.roomID,data.data.player)
      break
    case 'leave-room':
      await leaveRoom(ws,data.data.roomID)
      break
    case 'room-chat':
      await roomChat(ws,data.data.message)
      break
    case 'change-name':
      changeName(ws,data.data.username)
      break
    case 'join-global':// same shi as joining multiplayer
      await joinGlobal(ws,data.data.player)
      break
      
// --------this will be handled by the frontend cuz leaving the global lobby is exiting multiplayer
    // case 'leave-global':
    //   await leaveGlobal(ws)
    //   break
    
    case 'player-moved':
      await playerMove(ws,data.data.player)
      break
    default:
      ws.send(JSON.stringify({
        type:'not-found',
        data:null
      }))
  }
}

export default handleOperation