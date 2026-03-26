import { getCsrfToken } from './auth'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const productsEndpoint = `${apiBaseUrl}/api/products/`

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
      'Unable to reach the Aqual Sentinel product API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(data?.detail || formatErrors(data?.errors))
  }

  return data
}

export async function fetchProducts() {
  return requestJson(productsEndpoint)
}

export async function saveProduct(details) {
  const csrfToken = await getCsrfToken()
  const formData = new FormData()

  if (details.id) {
    formData.append('id', details.id)
  }

  formData.append('name', details.name)
  formData.append('summary', details.summary)
  formData.append('description', details.description)

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
    response = await fetch(productsEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      body: formData,
    })
  } catch {
    throw new Error(
      'Unable to reach the Aqual Sentinel product API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (!response.ok) {
    throw new Error(data?.detail || formatErrors(data?.errors))
  }

  return data
}

export async function deleteProduct(id) {
  return requestJson(productsEndpoint, {
    method: 'DELETE',
    body: { id },
    needsCsrf: true,
  })
}
