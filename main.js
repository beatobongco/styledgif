// Settings
let GIF_LENGTH_MS = 2000
let CAPTURE_INTERVAL = 200

function $(query) {
  return document.querySelector(query)
}

function showSection(n) {
  const sections = ['#style-section', '#record-section', '#output-section']
  sections.forEach(s => {
    $(s).style.display = 'none'
  })

  $(sections[n - 1]).style.display = 'block'
}

/*
  STYLE SECTION
*/

$('#style-btn').onclick = () => {
  showSection(2)
}

$('#style-input').onchange = () => {
  const url = URL.createObjectURL($('#style-input').files[0])
  $('#style').src = url
}

/*
  RECORD SECTION
*/

let IMAGES = []
const model = new mi.ArbitraryStyleTransferNetwork()
const videoEl = $('#inputVideo')

function delay(f, time = 250) {
  setTimeout(f, time)
}

function captureStill() {
  requestAnimationFrame(() => {
    const canvas = document.createElement('canvas')
    canvas.height = videoEl.videoHeight
    canvas.width = videoEl.videoWidth
    canvas
      .getContext('2d')
      .drawImage(videoEl, 0, 0, canvas.width, canvas.height)
    const img = new Image()
    img.src = canvas.toDataURL()
    IMAGES.push(img)
  })
}

async function init() {
  const spinner = $('#spinner-1')
  await model.initialize()
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { width: { ideal: 200 }, height: { ideal: 200 }, facingMode: 'user' }
  })
  videoEl.srcObject = stream
  spinner.style.display = 'none'
  $('#start-btn').style.display = 'block'

  $('#start-btn').onclick = () => {
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
          $('#start-btn').style.display = 'none'
          overlay.style.display = 'none'
          const start = performance.now()
          const captureInterval = setInterval(() => {
            captureStill()
            if (performance.now() - start > GIF_LENGTH_MS) {
              clearInterval(captureInterval)
              requestAnimationFrame(() => {
                showSection(3)
              })
              delay(() => {
                stylize(IMAGES)
              }, 300)
            }
          }, CAPTURE_INTERVAL)
        })
      }
    }, 1000)
  }
}

/*
  OUTPUT SECTION
*/

$('#reset-btn').onclick = () => {
  showSection(1)
  IMAGES = []
  $('#outfile').src = ''
  $('#start-btn').style.display = 'block'
  $('#spinner-2').style.display = 'block'
  $('#rendering-text').style.display = 'block'
  $('#reset-btn').style.display = 'none'
}

async function stylize(imgArr) {
  const start = performance.now()
  const gif = new GIF({
    workers: 2,
    quality: 10
  })

  gif.on('finished', function(blob) {
    $('#outfile').src = URL.createObjectURL(blob)
    $('#rendering-text').style.display = 'none'
    $('#rendering-text').innerHTML = 'Rendering GIF...'
    $('#spinner-2').style.display = 'none'
    $('#reset-btn').style.display = 'block'
  })

  let counter = 0
  const stylizedImgs = []
  for (const img of imgArr) {
    requestAnimationFrame(() => {
      counter++
      $('#rendering-text').innerHTML = `Rendering ${counter} of ${
        imgArr.length
      } frames...`
    })
    stylizedImgs.push(await model.stylize(img, $('#style')))
  }

  stylizedImgs.forEach(img => {
    gif.addFrame(img, {
      delay: CAPTURE_INTERVAL / 2
    })
  })
  stylizedImgs.reverse()
  stylizedImgs.forEach(img => {
    gif.addFrame(img, {
      delay: CAPTURE_INTERVAL / 2
    })
  })
  gif.render()
  console.log(`Took ${(performance.now() - start) / 1000} seconds`)
}

init()
