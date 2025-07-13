import express,{Request,Response,NextFunction} from 'express'
import * as http from 'http'
import path from 'path'
import {WebSocket, WebSocketServer} from 'ws'
import {generateID,validateType} from './utils'
import {WSClient,WSPayload} from './types'
import handleOperation from './Handler'
import {activeRooms,getRoomData} from './room'

// consts
const PATH = path.join(__dirname,'../../game')
const TARGET = path.join(PATH,'/index.html')
const connectedClients = new Map<string,WSClient>()

// init server 
const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({server})
app.use(express.static(PATH))

// logic...
app.get('/',async (req:Request,res:Response) => {
  res.sendFile(TARGET)
})

// global chat
const globalChat = async (ws:WSClient,message:string):Promise<void> => {
  if(typeof message !== 'string') {
    ws.send(JSON.stringify({
      type:'error',
      data:null,
      message:'imvalid message format'
    }))
  }
  
  if(connectedClients.has(ws.id)) {
    connectedClients.forEach(client => {
      if(client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type:'global-chat',
          data:{
            from:ws.username ? ws.username : ws.id,
            message:message
          }
        }))
      }
    })
  }
}

// loop checker
let loopCheck:any = null
 
// websocketssss
wss.on('connection',async (ws:WebSocket) => {
  const client = ws as WSClient
  client.id = await generateID(8)
  console.log(`client, id:${client.id} joined the global lobby`)
  
  connectedClients.set(client.id,client)
  client.send(JSON.stringify({
    type:'connected',
    data:client.id,
    message:`joined with id: ${client.id}`
  }))
  
  // incoming data
  client.on('message',async (message:string) => {
    let data:WSPayload
    try {
      data = JSON.parse(message)
      if(validateType(data)) {
        if(data.type === 'global-chat') {
          await globalChat(client,data.message)
          return
        }
        await handleOperation(client,data)
      } else {
        console.log(data)
        client.send(JSON.stringify({
          type:'err',
          data:null,
          message:'invalid JSON format'
        }))
      }
    } catch(err) {
      console.error('WebSocket err: could not parse string')
      client.send(JSON.stringify({
        type:'error',
        data:null,
        message:'invalid JSON string'
      }))
    }
  })
  
  // update all connections on room states
  if(!loopCheck) {
    loopCheck = setInterval(()=>{
      connectedClients.forEach(client => {
        if(client.readyState === WebSocket.OPEN) {
          getRoomData(client)
        }
      })
    },10000)
  }
  
  client.on('close',()=>{
    console.log(`client ${client.id} disconnected`)
    connectedClients.delete(client.id)
    // remove their room presence
    // for bigger projects try storing their info to retain session state
    if(client.roomID) {
      const clientRoom = activeRooms.get(client.roomID)
      clientRoom.clients.delete(client.id)
      clientRoom.state.players[client.id] = null
      client.roomID = null
    }
    
    // stop updating if no users
    if(connectedClients.size === 0) {
      clearInterval(loopCheck)
      loopCheck = null
      console.log('no users')
    }
  })
  
  client.on('error',(err:any) => {
    console.log('WebSocket err',err)
  })
})

// display frontend for undefined backend routes
app.use((req:Request,res:Response,next:NextFunction) => {
  res.sendFile(TARGET)
})

// listen
server.listen(3000,()=>console.log('http server active on port 3000'))