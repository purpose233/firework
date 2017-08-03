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
    easing: 'Quad',
    background: 'rgba(0,0,0,0.85)',
    //style: 'dark',
    trigger: 'click',
    fullScreen: true
  }

  // Thanks to BezierEasing https://github.com/gre/bezier-easing,
  //           and Anime.js https://github.com/juliangarnier/anime.
  const bezier = (() => {

    const kSplineTableSize = 11
    const kSampleStepSize = 1.0 / (kSplineTableSize - 1.0)

    function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1 }
    function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1 }
    function C (aA1)      { return 3.0 * aA1 }

    function calcBezier (aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT }
    function getSlope (aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1) }

    function binarySubdivide (aX, aA, aB, mX1, mX2) {
      let currentX, currentT, i = 0
      do {
        currentT = aA + (aB - aA) / 2.0
        currentX = calcBezier(currentT, mX1, mX2) - aX
        if (currentX > 0.0) { aB = currentT } else { aA = currentT }
      } while (Math.abs(currentX) > 0.0000001 && ++i < 10)
      return currentT
    }

    function newtonRaphsonIterate (aX, aGuessT, mX1, mX2) {
      for (let i = 0; i < 4; ++i) {
        const currentSlope = getSlope(aGuessT, mX1, mX2)
        if (currentSlope === 0.0) return aGuessT
        const currentX = calcBezier(aGuessT, mX1, mX2) - aX
        aGuessT -= currentX / currentSlope
      }
      return aGuessT
    }

    function bezier(mX1, mY1, mX2, mY2) {

      if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) return
      let sampleValues = new Float32Array(kSplineTableSize)

      if (mX1 !== mY1 || mX2 !== mY2) {
        for (let i = 0; i < kSplineTableSize; ++i) {
          sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2)
        }
      }

      function getTForX(aX) {

        let intervalStart = 0.0
        let currentSample = 1
        const lastSample = kSplineTableSize - 1

        for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
          intervalStart += kSampleStepSize
        }

        --currentSample

        const dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample])
        const guessForT = intervalStart + dist * kSampleStepSize
        const initialSlope = getSlope(guessForT, mX1, mX2)

        if (initialSlope >= 0.001) {
          return newtonRaphsonIterate(aX, guessForT, mX1, mX2)
        } else if (initialSlope === 0.0) {
          return guessForT
        } else {
          return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2)
        }

      }

      return x => {
        if (mX1 === mY1 && mX2 === mY2) return x
        if (x === 0) return 0
        if (x === 1) return 1
        return calcBezier(getTForX(x), mY1, mY2)
      }

    }

    return bezier
  })()

  // Data from Ceaser https://matthewlein.com/ceaser/
  const easings = (() => {
    const names = ['Quad', 'Cubic', 'Quart', 'Quint', 'Sine', 'Expo', 'Circ']

    const easingData = [
        [0.455, 0.030, 0.515, 0.955], // easeInOutQuad
        [0.645, 0.045, 0.355, 1.000], // easeInOutCubic
        [0.770, 0.000, 0.175, 1.000], // easeInOutQuart
        [0.860, 0.000, 0.070, 1.000], // easeInOutQuint
        [0.445, 0.050, 0.550, 0.950], // easeInOutSine
        [1.000, 0.000, 0.000, 1.000], // easeInOutExpo
        [0.785, 0.135, 0.150, 0.860]  // easeInOutCirc
    ]

    let functions = {}

    easingData.forEach((data, index) => {
      functions[names[index]] = bezier.apply(this, data)
    })

    return functions
  })()

  const styleList = ['dark', 'light']

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

  // No longer used customized linear way of easing.
  function linearEasing (number, delta, begin, end, offsetPercentage, direction) {
    offsetPercentage = ('undefined' === typeof offsetPercentage) ? 1.0 : offsetPercentage
    direction = ('undefined' === typeof direction) ? true : direction

    let processPercentage = (number - begin) / (end - begin)
    let deltaEased = delta *
      (1 + offsetPercentage * (processPercentage - 0.5) / 0.5 * (direction ? -1 : 1))

    return number + deltaEased
  }

  function firework (params = {}) {
    let instance = createInstance(params)
    let fireList = []

    let canvas = document.getElementById(instance['targetId']);
    let context = canvas.getContext('2d')

    let easing = easings[instance['easing']]

    class FirePiece {
      constructor(position) {
        this.position = {
          'x' : position['x'],
          'y' : position['y']
        }
        this.duration = instance['duration']
        this.range = instance['range']
        this.size = instance['firePieceSize']

        this.color = firePieceColors[Math.floor(Math.random() * 4)]
        this.direction = {
          'x' : Math.random() * 2 - 1,
          'y' : Math.random() * 2 - 1
        }
        this.currentSize = this.size
        this.currentPosition = {
          'x' : this.position.x,
          'y' : this.position.y
        }
        this.offestPostion = {
          'x' : this.range * this.direction.x,
          'y' : this.range * this.direction.y
        }
      }
      draw (context) {
        let currentProcess = easing(1 - this.duration / instance['duration'])

        this.currentSize = this.size - currentProcess * this.size
        this.currentPosition.x = this.position.x + this.offestPostion.x * currentProcess
        this.currentPosition.y = this.position.y + this.offestPostion.y * currentProcess

        context.beginPath()
        context.strokeStyle = this.color
        context.fillStyle = this.color
        context.arc(this.currentPosition.x, this.currentPosition.y,
          this.currentSize, 0, 2*Math.PI, true)
        context.closePath()
        context.fill()

        this.duration--
      }
    }

    class Fire {
      constructor(position) {
        this.position = {
          'x' : position['x'],
          'y' : position['y']
        }
        this.firePieceNumber = instance['firePieceNumber']
        this.duration = instance['duration']
        this.firePieceList = []

        this.getFirePieceList()
      }
      getFirePieceList () {
        for (let i = 0; i < this.firePieceNumber; i++)
          this.firePieceList.push(new FirePiece(this.position))
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

    function setCanvasStyle() {
      let windowSize = getWindowSize()
      canvas.setAttribute('width', (instance.fullScreen) ? windowSize.width : instance.width)
      canvas.setAttribute('height', (instance.fullScreen) ? windowSize.height : instance.height)
      canvas.style.background = instance.background
    }

    function initCanvasEvent () {
      if (instance.trigger === 'click') {
          addEventListener('click', (e) => {
              fireList.push(new Fire(getEventPosition(e)))
          })
          /*
          canvas.addEventListener('click', (e) => {
            fireList.push(new Fire(getEventPosition(e)))
          })*/
      }
      else if (instance.trigger === 'move') {
          addEventListener('mousemove', (e) => {
              fireList.push(new Fire(getEventPosition(e)))
          })
          /*
          canvas.addEventListener('mousemove', (e) => {
            fireList.push(new Fire(getEventPosition(e)))
          })*/
      }

      if (instance.fullScreen)
        onresize = setCanvasStyle
    }

    function drawBackground(context) {
      context.fillStyle = instance.background
      let windowSize = getWindowSize()
      context.rect(0,0,windowSize.width,windowSize.height)
      context.fill()
    }

    function drawFirework () {
      //drawBackground(context)

      context.clearRect(0,0,canvas.width,canvas.height)
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
      context.save()
      setCanvasStyle()
      initCanvasEvent()
      drawFirework()
    }
  }

  return firework
}))
