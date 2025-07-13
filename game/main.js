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

// consts
const PROTOCOL = window.location.protocol === 'http:' ? 'ws' : 'wss'
const ctx = canvas.getContext('2d')
const FPS = 60
const frameTime = 1000/FPS
let ws = new WebSocket(`${PROTOCOL}://${window.location.host}`)
let players = new Map() // player id => player game Object

// event listeners 
connectBtn.addEventListener('click',() => {
  ws = new WebSocket('ws://192.168.43.193:3000')
  startLoader()
})

rightBtn.addEventListener('click',()=>{
  player.x += 20
  ws.send(JSON.stringify({
    type:'player-moved',
    data:{
      player:{
        x:player.x,
        y:player.y
      }
    }
  }))
})

// game logic
let player = null
function renderGameObjects(ctx) {
  if(players.size > 0) {
    players.forEach(player => {
      player.render(ctx)
    })
  }
}

function updatePlayers(playersData) {
  let existingPlayers = new Set(players.keys())
  
  playersData.forEach(player => {
    let playerObj = players.get(player.id)
    // console.log('obj',playerObj)
    if(!playerObj) {
      const newAdd = new Player(player.x,player.y,player.color)
      players.set(player.id,newAdd)
    }
    playerObj.x = player.x 
    playerObj.y = player.y 
    
    existingPlayers.delete(player.id)
  })
  
  existingPlayers.forEach(pl => {
    players.delete(pl)
  })
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

// websocket logic
ws.onopen = () => {
  stopLoader()
  console.log('connected')
  alert('connected')
}

ws.onmessage = e => {
  try {
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
      
      
      default:
        console.log(data)
    }
    console.log(data)
  } catch(err) {
    console.error('err',err.stack)
  }
}

