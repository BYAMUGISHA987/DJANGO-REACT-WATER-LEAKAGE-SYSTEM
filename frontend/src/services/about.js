import { getCsrfToken } from './auth'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const teamMembersEndpoint = `${apiBaseUrl}/api/team-members/`
const contactMessagesEndpoint = `${apiBaseUrl}/api/contact-messages/`

function formatErrors(errors) {
  if (!errors || typeof errors !== 'object') {
    return 'Request failed.'
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

async function requestJson(url, { method = 'GET', body, needsCsrf = false } = {}) {
  const csrfToken = needsCsrf ? await getCsrfToken() : ''
  let response

  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new Error(
      'Unable to reach the Aqual Sentinel content API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(data?.detail || formatErrors(data?.errors))
  }

  return data
}

export async function fetchTeamMembers() {
  return requestJson(teamMembersEndpoint)
}

export async function createTeamMember(details) {
  const csrfToken = await getCsrfToken()
  const formData = new FormData()

  formData.append('fullName', details.fullName)
  formData.append('title', details.title)
  formData.append('bio', details.bio)

  if (details.displayOrder !== '') {
    formData.append('displayOrder', details.displayOrder)
  }

  if (details.photo) {
    formData.append('photo', details.photo)
  }

  let response

  try {
    response = await fetch(teamMembersEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      body: formData,
    })
  } catch {
    throw new Error(
      'Unable to reach the Aqual Sentinel content API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(data?.detail || formatErrors(data?.errors))
  }

  return data
}

export async function updateTeamMember(memberId, details) {
  const csrfToken = await getCsrfToken()
  const formData = new FormData()

  formData.append('fullName', details.fullName)
  formData.append('title', details.title)
  formData.append('bio', details.bio)

  if (details.displayOrder !== '') {
    formData.append('displayOrder', details.displayOrder)
  }

  if (details.photo) {
    formData.append('photo', details.photo)
  }

  let response

  try {
    response = await fetch(`${teamMembersEndpoint}${memberId}/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      body: formData,
    })
  } catch {
    throw new Error(
      'Unable to reach the Aqual Sentinel content API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(data?.detail || formatErrors(data?.errors))
  }

  return data
}

export async function createContactMessage(details) {
  return requestJson(contactMessagesEndpoint, {
    method: 'POST',
    body: details,
    needsCsrf: true,
  })
}

export async function fetchContactMessages() {
  return requestJson(contactMessagesEndpoint)
}
