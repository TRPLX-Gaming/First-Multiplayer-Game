const SIZE = 30

export class Player {
  constructor(x,y,color='black') {
    this.x = x 
    this.y = y 
    this.color = color
    this.width = SIZE
    this.height = SIZE
  }
  
  render(ctx) {
    ctx.fillStyle = this.color
    ctx.fillRect(this.x,this.y,this.width,this.height)
  }
}