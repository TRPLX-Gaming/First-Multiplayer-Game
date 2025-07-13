import crypto from 'crypto'
import {WSPayload,WSClient} from './types'

const generateID = (length:number=16):Promise<string> => {
  const size = length/2
  return new Promise((resolve,reject) => {
    crypto.randomBytes(size,(err:Error | null,buffer:Buffer) => {
      if(err) reject(err)
      resolve(buffer.toString('hex'))
    })
  })
}

const validateType = (data:WSPayload):boolean => {
  if(typeof data.type !== 'string') return false
  return true
}

const changeName = (ws:WSClient,newName:string):void => {
  ws.username = newName
  ws.send(JSON.stringify({
    type:'update',
    data:null,
    message:`changed ${ws.id} name to ${newName}`
  }))
}

export {
  generateID,
  validateType,
  changeName
}