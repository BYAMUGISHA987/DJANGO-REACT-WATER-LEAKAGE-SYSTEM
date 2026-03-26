import { getCsrfToken } from './auth'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const sensorsEndpoint = `${apiBaseUrl}/api/sensors/`
const announcementsEndpoint = `${apiBaseUrl}/api/announcements/`
const leakReportsEndpoint = `${apiBaseUrl}/api/leak-reports/`

function formatErrors(errors) {
  if (!errors || typeof errors !== 'object') {
    return ''
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
      'Unable to reach the Aqual Sentinel operations API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        formatErrors(data?.errors) ||
        `Request failed with status ${response.status}.`,
    )
  }

  return data
}

export async function fetchAnnouncements() {
  return requestJson(announcementsEndpoint)
}

export async function fetchSensors() {
  return requestJson(sensorsEndpoint)
}

export async function fetchLeakReports() {
  return requestJson(leakReportsEndpoint)
}

export async function createAnnouncement(details) {
  const csrfToken = await getCsrfToken()
  const formData = new FormData()

  if (details.id) {
    formData.append('id', details.id)
  }

  formData.append('kind', details.kind)
  formData.append('title', details.title)
  formData.append('message', details.message)
  formData.append('ctaLabel', details.ctaLabel)
  formData.append('ctaLink', details.ctaLink)
  formData.append('isActive', String(details.isActive ?? true))

  if (details.displayOrder !== '') {
    formData.append('displayOrder', details.displayOrder)
  }

  if (details.image) {
    formData.append('image', details.image)
  }

  if (details.video) {
    formData.append('video', details.video)
  }

  let response

  try {
    response = await fetch(announcementsEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      body: formData,
    })
  } catch {
    throw new Error(
      'Unable to reach the Aqual Sentinel operations API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        formatErrors(data?.errors) ||
        `Request failed with status ${response.status}.`,
    )
  }

  return data
}

export async function deleteAnnouncement(id) {
  return requestJson(announcementsEndpoint, {
    method: 'DELETE',
    body: { id },
    needsCsrf: true,
  })
}

export async function createSensor(details) {
  return requestJson(sensorsEndpoint, {
    method: 'POST',
    body: details,
    needsCsrf: true,
  })
}

export async function deleteSensor(id) {
  return requestJson(sensorsEndpoint, {
    method: 'DELETE',
    body: { id },
    needsCsrf: true,
  })
}

export async function createLeakReport(details) {
  return requestJson(leakReportsEndpoint, {
    method: 'POST',
    body: details,
    needsCsrf: true,
  })
}

export async function deleteLeakReport(id) {
  return requestJson(leakReportsEndpoint, {
    method: 'DELETE',
    body: { id },
    needsCsrf: true,
  })
}
