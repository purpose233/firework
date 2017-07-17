(function (root, factory) {
  root.firework = factory()
} (this, () => {
  const defaultInstanceSettings = {
    targetId: undefined,
    width: 300,
    height: 300,
    range: 200,
    duration: 30,
    firePieceNumber: 30,
    firePieceSize: 25,
    style: 'dark',
    fullScreen: true
  }

  const styleList = ['dark', 'light']

  const colors = {
    'darkBackground' : 'rgb(10,10,20)',
    'lightBackground' : 'rgb(200,200,200)',
    'firePieceRed' : 'rgb(255,0,128)',
    'firePieceGreen' : 'rgb(0,255,128)',
    'firePieceBlue' : 'rgb(40,150,255)',
    'firePieceYellow' : 'rgb(250,250,130)'
  }

  const firePieceColors = ['rgb(255,0,128)', 'rgb(0,255,128)',
                           'rgb(40,150,255)', 'rgb(250,250,130)']

  function cloneObject (o) {
    let clone = {}
    for (let prop in o)
      clone[prop] = o[prop]
    return clone
  }

  function hasProp (o, prop) {
    return o.hasOwnProperty(prop)
  }

  function replaceObjectProps (target, source) {
    let clone = cloneObject(target)
    for (let prop in clone)
      clone[prop] = hasProp(source, prop) ? source[prop] : clone[prop]
    return clone
  }

  function createInstance (params) {
    const instanceSetting = replaceObjectProps(defaultInstanceSettings, params)
    return instanceSetting
  }

  function getEventPosition (e) {
    let e1 = e || event
    return {x: e1.clientX, y: e1.clientY}
  }

  function getWindowSize () {
    return {
      width: innerWidth,
      height: innerHeight
    }
  }

  function linearEase (number, delta, begin, end, offsetPercentage, direction) {
    offsetPercentage = ('undefined' === typeof offsetPercentage) ? 1.0 : offsetPercentage
    direction = ('undefined' === typeof direction) ? true : direction

    let processPercentage = (number - begin) / (end - begin)
    let deltaEased = delta *
      (1 + offsetPercentage * (processPercentage - 0.5) / 0.5 * (direction ? -1 : 1))

    return number + deltaEased
  }

  class FirePiece {
    constructor(params = {}) {
      this.position = {
        'x' : params['position']['x'],
        'y' : params['position']['y']
      },
      this.duration = params['duration']
      this.range = params['range']
      this.size = params['firePieceSize']

      this.color = firePieceColors[Math.floor(Math.random() * 4)]
      this.direction = {
        'x' : Math.random() * 2 - 1,
        'y' : Math.random() * 2 - 1
      }
      this.sizeReduce = this.size / this.duration
      this.positionDelta = {
        'x' : this.range * this.direction.x / this.duration,
        'y' : this.range * this.direction.y / this.duration
      }
      this.currentPosition = {
        'x' : this.position.x,
        'y' : this.position.y
      }
      this.finalPostion = {
        'x' : this.position.x + this.duration * this.positionDelta.x,
        'y' : this.position.y + this.duration * this.positionDelta.y
      }
    }
    draw (context) {
      this.size = (this.size - this.sizeReduce) < 0 ? 0 : (this.size - this.sizeReduce)

      this.currentPosition.x = linearEase(this.currentPosition.x, this.positionDelta.x,
                                          this.position.x, this.finalPostion.x)
      this.currentPosition.y = linearEase(this.currentPosition.y, this.positionDelta.y,
                                          this.position.y, this.finalPostion.y)

      context.beginPath()
      context.strokeStyle = this.color
      context.fillStyle = this.color
      context.arc(this.currentPosition.x, this.currentPosition.y,
                  this.size, 0, 2*Math.PI, true)
      context.closePath()
      context.fill()

      this.duration--
    }
  }

  class Fire {
    constructor(params = {}) {
      this.position = params['position']
      this.firePieceNumber = params['firePieceNumber']
      this.duration = params['duration']
      this.range = params['range']
      this.firePieceSize = params['firePieceSize']
      this.firePieceList = []

      this.getFirePieceList()
    }
    getFirePieceList () {
      for (let i = 0; i < this.firePieceNumber; i++) {
        let params = {
          'position' : this.position,
          'duration' : this.duration,
          'range' : this.range,
          'firePieceSize' : this.firePieceSize
        }
        this.firePieceList.push(new FirePiece(params))
      }
    }
    draw (context) {
      for (let i = 0; i < this.firePieceList.length; i++)
        this.firePieceList[i].draw(context)

      this.duration--
    }
    checkTimeUp () {
      return this.duration <= 0
    }
  }

  function firework (params = {}) {
    let instance = createInstance(params)
    let fireList = []

    let canvas = document.getElementById(instance['targetId']);
    let context = canvas.getContext('2d')

    function setCanvasStyle() {
      let windowSize = getWindowSize()
      canvas.setAttribute('width', (instance.fullScreen) ? windowSize.width : instance.width)
      canvas.setAttribute('height', (instance.fullScreen) ? windowSize.height : instance.height)
    }

    function initCanvasEvent () {
      canvas.addEventListener('click', (e) => {
        let params = {
          'position' : getEventPosition(e),
          'duration' : instance['duration'],
          'firePieceNumber' : instance['firePieceNumber'],
          'range' : instance['range'],
          'firePieceSize' : instance['firePieceSize']
        }

        fireList.push(new Fire(params))
      })

      if (instance.fullScreen)
        onresize = setCanvasStyle
    }

    function drawBackground(context) {
      context.fillStyle = colors.darkBackground
      let windowSize = getWindowSize()
      context.rect(0,0,windowSize.width,windowSize.height)
      context.fill()
    }

    function drawFirework () {
      drawBackground(context)

      for (let i = 0; i < fireList.length; i++) {
        fireList[i].draw(context)
        if (fireList[i].checkTimeUp()) {
          fireList.splice(i, 1)
          i--
        }
      }

      requestAnimationFrame(drawFirework)
    }

    if (!!canvas) {
      setCanvasStyle()
      initCanvasEvent()
      drawFirework()
    }
  }

  return firework
}))
