const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const authApiBase = `${apiBaseUrl}/api/auth`

let csrfToken = ''

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

async function requestJson(
  path,
  { method = 'GET', body, needsCsrf = false, retryOnCsrfFailure = true } = {},
) {
  if (needsCsrf) {
    await fetchSession()
  }

  let response

  try {
    response = await fetch(`${authApiBase}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(needsCsrf && csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new Error(
      'Unable to reach the authentication API. Start the service or update VITE_API_BASE_URL.',
    )
  }

  const data = await parseJson(response)

  if (data?.csrfToken) {
    csrfToken = data.csrfToken
  }

  if (!response.ok && needsCsrf && response.status === 403 && retryOnCsrfFailure) {
    csrfToken = ''
    await fetchSession()
    return requestJson(path, {
      method,
      body,
      needsCsrf,
      retryOnCsrfFailure: false,
    })
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        formatErrors(data?.errors) ||
        `Request failed with status ${response.status}.`,
    )
  }

  return data
}

export async function fetchSession() {
  return requestJson('/session/')
}

export async function getCsrfToken() {
  if (!csrfToken) {
    await fetchSession()
  }

  return csrfToken
}

export async function loginAccount(credentials) {
  return requestJson('/login/', {
    method: 'POST',
    body: credentials,
    needsCsrf: true,
  })
}

export async function signupAccount(details) {
  return requestJson('/signup/', {
    method: 'POST',
    body: details,
    needsCsrf: true,
  })
}

export async function checkAccountAvailability(details) {
  const params = new URLSearchParams()

  if (details.username) {
    params.set('username', details.username)
  }

  if (details.email) {
    params.set('email', details.email)
  }

  const query = params.toString()
  return requestJson(query ? `/availability/?${query}` : '/availability/')
}

export async function logoutAccount() {
  const response = await requestJson('/logout/', {
    method: 'POST',
    needsCsrf: true,
  })

  csrfToken = ''
  return response
}

export async function fetchUsers() {
  return requestJson('/users/')
}

export async function createManagedUser(details) {
  return requestJson('/users/', {
    method: 'POST',
    body: details,
    needsCsrf: true,
  })
}

export async function updateManagedUser(userId, details) {
  return requestJson(`/users/${userId}/`, {
    method: 'POST',
    body: details,
    needsCsrf: true,
  })
}

export async function deleteManagedUser(userId) {
  return requestJson(`/users/${userId}/`, {
    method: 'DELETE',
    needsCsrf: true,
  })
}

export async function changePassword(details) {
  return requestJson('/password/', {
    method: 'POST',
    body: details,
    needsCsrf: true,
  })
}
