let MODE = 'capture'
let IMAGES = []
let GIF_LENGTH_MS = 200
let CAPTURE_INTERVAL = 200
const model = new mi.ArbitraryStyleTransferNetwork()
const videoEl = $('#inputVideo')
const spinner = $('.spinner-container')

function $(query) {
  return document.querySelector(query)
}

function reset() {
  IMAGES = []
  $('#outfile').src = ''
  $('#start-btn').innerHTML = 'Start'
  videoEl.style.display = 'block'
}

function delay(f, time = 100) {
  setTimeout(f, time)
}

$('#style-input').onchange = () => {
  const url = URL.createObjectURL($('#style-input').files[0])
  $('#style').src = url
}

async function init() {
  await model.initialize()
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { width: 200, height: 200 }
  })
  videoEl.srcObject = stream
  spinner.style.display = 'none'
  $('#start-btn').style.display = 'block'

  $('#start-btn').onclick = () => {
    if (MODE === 'capture') {
      const overlay = $('.overlay')
      let countdown = 3
      overlay.innerHTML = countdown
      overlay.style.display = 'flex'
      const countdownInterval = setInterval(function() {
        requestAnimationFrame(() => {
          overlay.innerHTML = countdown
        })
        countdown -= 1
        if (countdown <= 0) {
          clearInterval(countdownInterval)
          requestAnimationFrame(() => {
            overlay.innerHTML = 'GO'
          })
          delay(() => {
            $('#start-btn').innerHTML = 'Please wait...'
            $('#start-btn').disabled = true
            overlay.style.display = 'none'
            const start = performance.now()
            const captureInterval = setInterval(() => {
              captureStill()
              if (performance.now() - start > GIF_LENGTH_MS) {
                clearInterval(captureInterval)
                requestAnimationFrame(() => {
                  videoEl.style.display = 'none'
                  spinner.style.display = 'block'
                  $('#loading-text').innerHTML = ''
                })
                delay(() => {
                  stylize(IMAGES)
                })
              }
            }, CAPTURE_INTERVAL)
          }, 250)
        }
      }, 1000)
    } else if (MODE === 'ready') {
      reset()
      MODE = 'capture'
    }
  }
}

function captureStill() {
  requestAnimationFrame(() => {
    var canvas = document.createElement('canvas')
    canvas.height = videoEl.videoHeight
    canvas.width = videoEl.videoWidth
    var ctx = canvas.getContext('2d')
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
    var img = new Image()
    img.src = canvas.toDataURL()
    IMAGES.push(img)
  })
}

// STYLIZE
async function stylize(imgArr) {
  const styleImg = $('#style')
  const start = performance.now()
  const gif = new GIF({
    workers: 2,
    quality: 10
  })

  gif.on('finished', function(blob) {
    const img = $('#outfile')
    img.src = URL.createObjectURL(blob)
    spinner.style.display = 'none'
    MODE = 'ready'
    $('#start-btn').disabled = false
    $('#start-btn').innerHTML = 'Take another'
  })

  let counter = 0
  for (const img of imgArr) {
    requestAnimationFrame(() => {
      counter++
      $('#loading-text').innerHTML = `Rendering ${counter} of ${
        imgArr.length
      } frames...`
    })
    const imageData = await model.stylize(img, styleImg)
    const canvas = document.createElement('canvas')
    canvas.height = videoEl.videoHeight
    canvas.width = videoEl.videoWidth
    const ctx = canvas.getContext('2d')
    ctx.putImageData(imageData, 0, 0)
    gif.addFrame(imageData, { frameDelay: CAPTURE_INTERVAL })
    if (counter === imgArr.length) {
      gif.render()
      console.log(`Took ${(performance.now() - start) / 1000} seconds`)
    }
  }
}

init()
