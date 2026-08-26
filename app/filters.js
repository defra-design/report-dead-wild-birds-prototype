//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

// Turns a stored yes/no answer into "Yes" or "No" for check-your-answers.
// Use in a view like: {{ data.reachable | yesNo }}
addFilter('yesNo', function (value) {
  if (value === 'yes') return 'Yes'
  if (value === 'no') return 'No'
  return 'Not provided'
})

// Note: speciesLabel is provided per version via res.locals in app/routes.js
// (each version has its own species list), so it is not a global filter.
