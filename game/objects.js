const SIZE = 30

export class Player {
  constructor(x,y,color='black') {
    this.x = x 
    this.y = y 
    this.vy = 0
    this.vx = 0
    this.color = color
    this.width = SIZE
    this.height = SIZE
    this.isMoving = false
  }
  
  render(ctx) {
    ctx.fillStyle = this.color
    ctx.fillRect(this.x,this.y,this.width,this.height)
  }
  
  update() {
    if(this.isMoving) {
      this.x += this.vx
      this.y += this.vy
    }
  }
}