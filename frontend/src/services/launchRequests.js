import { getCsrfToken } from './auth'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const launchRequestEndpoint = `${apiBaseUrl}/api/launch-requests/`
export const launchRequestStore = 'Application records'

function formatErrors(errors) {
  if (!errors || typeof errors !== 'object') {
    return 'Unable to save the request. Check that the service is available.'
  }

  return Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join(' | ')
}

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchLaunchDashboard() {
  let response

  try {
    response = await fetch(launchRequestEndpoint, {
      credentials: 'include',
    })
  } catch {
    throw new Error(
      'Unable to reach the API service. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(data?.detail || 'Unable to load the live dashboard.')
  }

  return data
}

export async function createLaunchRequest(request) {
  let response

  try {
    response = await fetch(launchRequestEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: request.fullName.trim(),
        organization: request.organization.trim(),
        email: request.email.trim().toLowerCase(),
        focusArea: request.focusArea,
      }),
    })
  } catch {
    throw new Error(
      'Unable to reach the API service. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(data?.detail || formatErrors(data?.errors))
  }

  return data
}

export async function deleteLaunchRequest(id) {
  const csrfToken = await getCsrfToken()
  let response

  try {
    response = await fetch(launchRequestEndpoint, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({ id }),
    })
  } catch {
    throw new Error(
      'Unable to reach the API service. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(data?.detail || formatErrors(data?.errors))
  }

  return data
}
