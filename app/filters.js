//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

const decision = require('./lib/decision')

// Turns a stored species value into the wording shown to users.
// Use in a view like: {{ data.species | speciesLabel }}
addFilter('speciesLabel', decision.speciesLabel)

// Turns a stored yes/no answer into "Yes" or "No" for check-your-answers.
// Use in a view like: {{ data.reachable | yesNo }}
addFilter('yesNo', function (value) {
  if (value === 'yes') return 'Yes'
  if (value === 'no') return 'No'
  return 'Not provided'
})
