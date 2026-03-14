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
