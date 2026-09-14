//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

window.GOVUKPrototypeKit.documentReady(() => {
  setUpMap()
  setUpPhotoName()
  setUpAddressToggle()
  setUpDebugPanel()
})

//
// Address entry: a prototype postcode lookup. It switches between three states
// — entering a postcode, selecting an address from a list, and entering the
// address lines manually. Only "NG7 5JH" returns a canned list of addresses.
//
function setUpAddressToggle () {
  const lookup = document.getElementById('address-lookup')
  const select = document.getElementById('address-select')
  const manual = document.getElementById('address-manual')
  if (!lookup || !select || !manual) return

  const findBtn = document.getElementById('address-find-btn')
  const postcode = document.getElementById('postcode')
  const noResults = document.getElementById('address-no-results')
  const foundPostcode = document.getElementById('address-found-postcode')

  function show (which) {
    lookup.hidden = which !== 'lookup'
    select.hidden = which !== 'select'
    manual.hidden = which !== 'manual'
    const focusId = { lookup: 'postcode', select: 'addressSelected', manual: 'addressLine1' }[which]
    const focusTarget = document.getElementById(focusId)
    if (focusTarget) focusTarget.focus()
  }

  // "Find address": the prototype only knows about NG7 5JH.
  if (findBtn && postcode) {
    findBtn.addEventListener('click', function (e) {
      e.preventDefault()
      const entered = postcode.value.trim()
      const normalised = entered.toUpperCase().replace(/\s+/g, '')
      if (normalised === 'NG75JH') {
        if (foundPostcode) foundPostcode.textContent = entered
        if (noResults) noResults.hidden = true
        show('select')
      } else if (noResults) {
        noResults.hidden = false
      }
    })
  }

  function onClick (id, fn) {
    const el = document.getElementById(id)
    if (el) el.addEventListener('click', function (e) { e.preventDefault(); fn() })
  }
  onClick('address-manual-link', function () { show('manual') })
  onClick('address-cantfind-link', function () { show('manual') })
  onClick('address-lookup-link', function () { show('lookup') })
  onClick('address-change-link', function () { if (noResults) noResults.hidden = true; show('lookup') })
}

//
// Map pin drop, on the "Where is the bird?" page.
//
// This is a stand-in for a real map so the journey can be tested end to end.
// Selecting a point stores coordinates in the hidden lat and lng fields, which
// is what a real map component would also do. Replace with an Ordnance Survey
// map before any public testing.
//
function setUpMap () {
  const map = document.getElementById('map')
  if (!map) return

  const pin = document.getElementById('map-pin')
  const readout = document.getElementById('map-readout')
  const latField = document.getElementById('lat')
  const lngField = document.getElementById('lng')

  // The area the stand-in map covers. Only used to turn a click into a
  // plausible looking coordinate.
  const NORTH = 54.6
  const WEST = -2.9
  const HEIGHT_IN_DEGREES = 0.03
  const WIDTH_IN_DEGREES = 0.05

  function dropPin (xFromLeft, yFromTop) {
    const bounds = map.getBoundingClientRect()
    const x = Math.max(0, Math.min(xFromLeft, bounds.width))
    const y = Math.max(0, Math.min(yFromTop, bounds.height))

    pin.style.left = x + 'px'
    pin.style.top = y + 'px'
    pin.style.display = 'block'

    const latitude = (NORTH - (y / bounds.height) * HEIGHT_IN_DEGREES).toFixed(6)
    const longitude = (WEST + (x / bounds.width) * WIDTH_IN_DEGREES).toFixed(6)

    latField.value = latitude
    lngField.value = longitude
    readout.textContent = 'Pin dropped at ' + latitude + ', ' + longitude
  }

  map.addEventListener('click', function (event) {
    const bounds = map.getBoundingClientRect()
    dropPin(event.clientX - bounds.left, event.clientY - bounds.top)
  })

  // Put the pin back if someone returns to this page after answering.
  if (latField.value && lngField.value) {
    const bounds = map.getBoundingClientRect()
    const y = (NORTH - parseFloat(latField.value)) / HEIGHT_IN_DEGREES * bounds.height
    const x = (parseFloat(lngField.value) - WEST) / WIDTH_IN_DEGREES * bounds.width
    dropPin(x, y)
  }
}

//
// Photo page: remember the chosen file name.
//
// The prototype does not store real uploads, so we record the file name only.
// That is enough to show the photo on check your answers.
//
function setUpPhotoName () {
  const fileInput = document.getElementById('photo')
  const nameField = document.getElementById('photoName')
  if (!fileInput || !nameField) return

  fileInput.addEventListener('change', function () {
    nameField.value = fileInput.files && fileInput.files[0] ? fileInput.files[0].name : ''
  })
}

//
// Debug panel: open and closed state, remembered between pages.
//
function setUpDebugPanel () {
  const panel = document.getElementById('app-debug')
  const toggle = document.getElementById('app-debug-toggle')
  if (!panel || !toggle) return

  // Collapsed by default; only open if the tester has explicitly opened it.
  let isOpen = window.localStorage.getItem('dwbDebugOpen') === 'true'

  function render () {
    panel.hidden = !isOpen
    toggle.setAttribute('aria-expanded', String(isOpen))
    toggle.textContent = isOpen ? 'Debug ✕' : 'Debug'
    document.body.classList.toggle('app-debug-open', isOpen)
  }

  toggle.addEventListener('click', function () {
    isOpen = !isOpen
    window.localStorage.setItem('dwbDebugOpen', String(isOpen))
    render()
  })

  render()
}
