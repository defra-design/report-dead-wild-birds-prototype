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

  // Show or clear a GOV.UK field error on the postcode input.
  function setPostcodeError (message) {
    if (!postcode) return
    const group = postcode.closest('.govuk-form-group')
    let error = document.getElementById('postcode-error')
    if (message) {
      group.classList.add('govuk-form-group--error')
      postcode.classList.add('govuk-input--error')
      if (!error) {
        error = document.createElement('p')
        error.id = 'postcode-error'
        error.className = 'govuk-error-message'
        postcode.parentNode.insertBefore(error, postcode)
      }
      error.innerHTML = '<span class="govuk-visually-hidden">Error:</span> ' + message
      error.hidden = false
    } else {
      group.classList.remove('govuk-form-group--error')
      postcode.classList.remove('govuk-input--error')
      if (error) error.hidden = true
    }
  }

  // "Find address": the prototype only knows about NG7 5JH.
  if (findBtn && postcode) {
    findBtn.addEventListener('click', function (e) {
      e.preventDefault()
      const entered = postcode.value.trim()
      const normalised = entered.toUpperCase().replace(/\s+/g, '')
      if (noResults) noResults.hidden = true
      if (!entered) {
        setPostcodeError('Enter a full UK postcode')
        return
      }
      setPostcodeError(null)
      if (normalised === 'NG75JH') {
        if (foundPostcode) foundPostcode.textContent = entered
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

  // Up to this many photos.
  const MAX = 3

  const added = document.getElementById('photo-added')
  const addedList = document.getElementById('photo-added-list') // multi-photo pages (with previews)
  const addedName = document.getElementById('photo-added-name') // older, single-photo pages
  const removeLink = document.getElementById('photo-remove')

  // Show or clear a GOV.UK field error on the file upload.
  function setError (message) {
    const group = fileInput.closest('.govuk-form-group')
    if (!group) return
    let err = document.getElementById('photo-error')
    if (message) {
      group.classList.add('govuk-form-group--error')
      if (!err) {
        err = document.createElement('p')
        err.id = 'photo-error'
        err.className = 'govuk-error-message'
        fileInput.parentNode.insertBefore(err, fileInput)
      }
      err.innerHTML = '<span class="govuk-visually-hidden">Error:</span> ' + message
      err.hidden = false
    } else {
      group.classList.remove('govuk-form-group--error')
      if (err) err.hidden = true
    }
  }

  // --- Newer pages: previews with a Remove button per photo -----------------
  // Works alongside the JavaScript-enhanced GOV.UK file upload: the input's own
  // FileList stays authoritative, so the component's "x photos selected" text
  // and these previews never disagree. Removing one rebuilds the FileList.
  if (addedList) {
    const supportsDataTransfer = typeof DataTransfer !== 'undefined'
    let syncing = false

    function filesArr () { return fileInput.files ? Array.prototype.slice.call(fileInput.files) : [] }

    // Rebuild the input's FileList (used to cap at MAX and to remove one photo),
    // then let the enhanced component refresh its own status text.
    function setFiles (arr) {
      if (!supportsDataTransfer) return
      const dt = new DataTransfer()
      arr.forEach(function (f) { dt.items.add(f) })
      fileInput.files = dt.files
      syncing = true
      fileInput.dispatchEvent(new Event('change', { bubbles: true }))
      syncing = false
    }

    function renderFiles () {
      const files = filesArr()
      addedList.innerHTML = ''
      files.forEach(function (f, idx) {
        const li = document.createElement('li')
        li.className = 'app-photo-item'

        const img = document.createElement('img')
        img.className = 'app-photo-thumb'
        img.alt = ''
        const reader = new FileReader()
        reader.onload = function () { img.src = reader.result }
        reader.readAsDataURL(f)
        li.appendChild(img)

        const name = document.createElement('span')
        name.className = 'app-photo-name'
        name.textContent = f.name
        li.appendChild(name)

        if (supportsDataTransfer) {
          const rm = document.createElement('a')
          rm.href = '#'
          rm.className = 'govuk-link app-photo-remove'
          rm.innerHTML = 'Remove<span class="govuk-visually-hidden"> ' + f.name + '</span>'
          rm.addEventListener('click', function (e) {
            e.preventDefault()
            setError(null)
            setFiles(filesArr().filter(function (_, i) { return i !== idx }))
            renderFiles()
            fileInput.focus()
          })
          li.appendChild(rm)
        }

        addedList.appendChild(li)
      })
      nameField.value = files.map(function (f) { return f.name }).join(', ')
      if (added) added.hidden = files.length === 0
    }

    // Names stored from a previous step (no File objects to preview).
    const existing = (nameField.value || '').split(',').map(function (s) { return s.trim() }).filter(Boolean)
    if (existing.length && !filesArr().length) {
      addedList.innerHTML = ''
      existing.forEach(function (n) {
        const li = document.createElement('li'); li.className = 'app-photo-item'
        const ph = document.createElement('span'); ph.className = 'app-photo-thumb app-photo-thumb--placeholder'; ph.setAttribute('aria-hidden', 'true')
        li.appendChild(ph)
        const nm = document.createElement('span'); nm.className = 'app-photo-name'; nm.textContent = n
        li.appendChild(nm)
        addedList.appendChild(li)
      })
      if (added) added.hidden = false
    }

    fileInput.addEventListener('change', function () {
      if (syncing) return
      let files = filesArr()
      if (files.length > MAX) {
        setError('You can upload up to ' + MAX + ' photos.')
        if (supportsDataTransfer) { setFiles(files.slice(0, MAX)) }
      } else {
        setError(null)
      }
      renderFiles()
    })
    return
  }

  // --- Older single-photo pages: just remember the name ---------------------
  function setPhoto (name) {
    nameField.value = name || ''
    if (addedName) addedName.textContent = name || ''
    if (added) added.hidden = !name
  }

  fileInput.addEventListener('change', function () {
    setPhoto(fileInput.files && fileInput.files[0] ? fileInput.files[0].name : '')
  })

  if (removeLink) {
    removeLink.addEventListener('click', function (e) {
      e.preventDefault()
      fileInput.value = ''
      setPhoto('')
      fileInput.focus()
    })
  }
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
