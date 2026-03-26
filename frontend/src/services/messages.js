import { getCsrfToken } from './auth'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const directMessagesEndpoint = `${apiBaseUrl}/api/direct-messages/`

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

export async function fetchDirectMessages(participantId = '') {
  const query = participantId
    ? `?participantId=${encodeURIComponent(participantId)}`
    : ''

  let response

  try {
    response = await fetch(`${directMessagesEndpoint}${query}`, {
      credentials: 'include',
    })
  } catch {
    throw new Error(
      'Unable to reach the messaging API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        formatErrors(data?.errors) ||
        'Unable to load direct messages.',
    )
  }

  return data
}

export async function sendDirectMessage(recipientId, body) {
  const csrfToken = await getCsrfToken()
  let response

  try {
    response = await fetch(directMessagesEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({
        recipientId,
        body,
      }),
    })
  } catch {
    throw new Error(
      'Unable to reach the messaging API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        formatErrors(data?.errors) ||
        'Unable to send the message.',
    )
  }

  return data
}

export async function deleteDirectMessage(messageId) {
  const csrfToken = await getCsrfToken()
  let response

  try {
    response = await fetch(directMessagesEndpoint, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({
        id: messageId,
      }),
    })
  } catch {
    throw new Error(
      'Unable to reach the messaging API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        formatErrors(data?.errors) ||
        'Unable to delete the message.',
    )
  }

  return data
}
