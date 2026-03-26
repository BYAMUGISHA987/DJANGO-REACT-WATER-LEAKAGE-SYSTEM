import { getCsrfToken } from './auth'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const siteContentEndpoint = `${apiBaseUrl}/api/site-content/`

async function parseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchSiteContent() {
  let response

  try {
    response = await fetch(siteContentEndpoint, {
      credentials: 'include',
    })
  } catch {
    throw new Error(
      'Unable to reach the Aqual Sentinel site content API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(data?.detail || 'Unable to load site content.')
  }

  return data
}

export async function saveSiteContent(payload) {
  const csrfToken = await getCsrfToken()
  let response
  const hasFilePayload = Object.values(payload).some(
    (value) => value instanceof File,
  )
  const shouldUseMultipart =
    hasFilePayload ||
    Object.keys(payload).some((key) => key.startsWith('clear'))

  const requestOptions = shouldUseMultipart
    ? (() => {
        const formData = new FormData()

        Object.entries(payload).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            return
          }

          if (value instanceof File) {
            formData.append(key, value)
            return
          }

          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value))
            return
          }

          formData.append(key, String(value))
        })

        return {
          headers: {
            'X-CSRFToken': csrfToken,
          },
          body: formData,
        }
      })()
    : {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify(payload),
      }

  try {
    response = await fetch(siteContentEndpoint, {
      method: 'POST',
      credentials: 'include',
      ...requestOptions,
    })
  } catch {
    throw new Error(
      'Unable to reach the Aqual Sentinel site content API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    const joinedErrors =
      data?.errors && typeof data.errors === 'object'
        ? Object.entries(data.errors)
            .map(([field, messages]) =>
              `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`,
            )
            .join(' | ')
        : ''
    throw new Error(data?.detail || joinedErrors || 'Unable to save site content.')
  }

  return data
}

export async function deleteSiteContent() {
  const csrfToken = await getCsrfToken()
  let response

  try {
    response = await fetch(siteContentEndpoint, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
    })
  } catch {
    throw new Error(
      'Unable to reach the Aqual Sentinel site content API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(data?.detail || 'Unable to reset the site content.')
  }

  return data
}
