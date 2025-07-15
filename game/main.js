// imports
import {Player} from './objects.js'

// dom 
const connectBtn = document.querySelector('.connect-btn')
const baseContainer = document.querySelector('.base-container')
const connectLoader = document.querySelector('.connect-loader')
const canvas = document.querySelector('.game-display')
const playerDisplayId = document.querySelector('.player-id')
const roomDisplayId = document.querySelector('.room-id')
const playerCountDisplay = document.querySelector('.player-count')
const rightBtn = document.querySelector('.right-btn')
const leftBtn = document.querySelector('.left-btn')
const upBtn = document.querySelector('.up-btn')
const downBtn = document.querySelector('.down-btn')
const disconnectBtn = document.querySelector('.disconnect')
const globalChatArea = document.querySelector('.global-chat')
const globalChatList = globalChatArea.querySelector('.chat-list')
const globalChatInput = globalChatArea.querySelector('.chat-input')
const globalSendBtn = globalChatArea.querySelector('.send-btn')

// consts
const worker = new Worker('./worker.js')
const PROTOCOL = window.location.protocol === 'http:' ? 'ws' : 'wss'
const ENVIRONMENT = window.location.host.split(':')[0] === 'localhost' ? 'DEV' : 'PROD'
const HOST = ENVIRONMENT === 'DEV' ? 'localhost:3000' : window.location.host
const ctx = canvas.getContext('2d')
const FPS = 60
const frameTime = 1000/FPS
let ws = new WebSocket(`${PROTOCOL}://${HOST}`)
let players = new Map() // player id => player game Object

// event listeners 
connectBtn.addEventListener('click',() => {
  ws = new WebSocket(`${PROTOCOL}://${HOST}`)
  window.location.href = window.location.href
  disconnectBtn.style.display = 'block'
  startLoader()
})

// horizontal motiom
rightBtn.addEventListener('touchstart',e=>{startMover(e,'right')})
rightBtn.addEventListener('touchend',e=>{endMover(e)})
leftBtn.addEventListener('touchstart',e=>{startMover(e,'left')})
leftBtn.addEventListener('touchend',e=>{endMover(e)})
// vertical motion
upBtn.addEventListener('touchstart',e=>{startMover(e,'up')})
upBtn.addEventListener('touchend',e=>{endMover(e)})
downBtn.addEventListener('touchstart',e=>{startMover(e,'down')})
downBtn.addEventListener('touchend',e=>{endMover(e)})

// global chat 
globalSendBtn.addEventListener('click',e=>{
  e.preventDefault()
  let message = globalChatInput.value.trim()
  if(message === '') {
    alert('empty msg cant be sent')
    return
  }
  sendGlobalMessage(message)
  globalChatInput.value = ''
})

disconnectBtn.addEventListener('click',()=>{
  ws.close()
  disconnectBtn.style.display = 'none'
  baseContainer.style.display = 'block'
  alert('disconnected')
})

// game logic
let player = null
function renderGameObjects(ctx) {
  if(players.size > 0) {
    players.forEach(player => {
      player.render(ctx)
      player.update()
      playerMotion(player)
    })
  }
}

function updatePlayers(playersData) {
  let existingPlayers = new Set(players.keys())
  
  playersData.forEach(player => {
    if(player) {
      let playerObj = players.get(player.id)
      // console.log('obj',playerObj)
      if(!playerObj) {
        const newAdd = new Player(player.x,player.y,player.color)
        players.set(player.id,newAdd)
      }
      
      playerObj.x = player.x 
      playerObj.y = player.y 
      existingPlayers.delete(player.id)
    }
  })
  
  existingPlayers.forEach(pl => {
    players.delete(pl)
  })
}

function startMover(e,direction) {
  e.preventDefault()
  player.isMoving = true
  switch (direction) {
    case 'right':
      player.isMoving = true
      player.vx = 5 
      break
    case 'left':
      player.vx = -5
      break
    case 'up':
      player.vy = -5
      break
    case 'down':
      player.vy = 5
      break
  }
}

function endMover(e) {
  e.preventDefault()
  player.isMoving = false
  player.vx = 0 
  player.vy = 0
}

function playerMotion(player) {
  if(player.isMoving) {
    ws.send(JSON.stringify({
      type:'player-moved',
      data:{
        player:{
          x:player.x,
          y:player.y
        }
      }
    }))
  }
}

let lastTime = 0
let loopID = null
function gameLoop(timestamp) {
  let dTime = timestamp - lastTime
  if(dTime >= frameTime) {
    lastTime = timestamp
    // runming functs
    ctx.clearRect(0,0,canvas.width,canvas.height)
    renderGameObjects(ctx)
  }
  loopID = requestAnimationFrame(gameLoop)
}
loopID = requestAnimationFrame(gameLoop)

let decoy = new Player(230,110,'blue')
players.set('bruh',decoy)

// util functs 
function startLoader() {
  connectLoader.style.display = 'block'
  connectLoader.style.animation = 'spin 1.2s linear infinite'
}

function stopLoader() {
  connectLoader.style.animation = 'none'
  baseContainer.style.display = 'none'
}

function appendMessage(msgInfo) {
  const {from,message} = msgInfo
  const newMsg = document.createElement('li')
  newMsg.style.listStyleType = 'none'
  newMsg.textContent = `${from} => ${message}`
  globalChatList.append(newMsg)
}

function sendGlobalMessage(message) {
  ws.send(JSON.stringify({
    type:'global-chat',
    message:message
  }))
}


// websocket logic
ws.onopen = () => {
  stopLoader()
  console.log('connected')
  alert('connected')
}

ws.onmessage = e => {
  try {
    if(e.data === 'ping') {
      ws.send('pong')
      return
    }
    
    let data = JSON.parse(e.data)
    switch(data.type) {
      case 'connected':
        player = new Player(50,40,'red')
        const playerID = data.data
        playerDisplayId.textContent = playerID
        players.set(playerID,player)
        console.log(data)
        ws.send(JSON.stringify({
          type:'join-global',
          data:{
            player:{
              x:player.x,
              y:player.y,
              color:player.color
            }
          }
        }))
        roomDisplayId.textContent = 'GLOBAL'
        break
      case 'state-update':
        playerCountDisplay.textContent = `${data.data.playerCount}`
        let updateArr = data.data.update
        updatePlayers(updateArr)
        break
      case 'global-chat':
        const msgInfo = {
          from:data.data.from,
          message:data.data.message
        }
        appendMessage(msgInfo)
        break
      case 'joined-room':
        const joinInfo = {
          from:'THE_GAME',
          message:data.message
        }
        appendMessage(joinInfo)
        break
      case 'player-out':
        const leftInfo = {
          from:'THE_GAME',
          message:data.message
        }
        appendMessage(leftInfo)
        break
      case 'player-in':
        const newInfo = {
          from:'THE_GAME',
          message:data.message
        }
        appendMessage(newInfo)
        break
      
      default:
        console.log(data)
    }
    console.log(data)
  } catch(err) {
    console.error('err',err.stack)
  }
}

ws.onclose = () => {
  players.clear()
  playerCountDisplay.textContent = 'null'
  playerDisplayId.textContent = 'null'
}