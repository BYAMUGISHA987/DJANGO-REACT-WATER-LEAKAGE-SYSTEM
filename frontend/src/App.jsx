import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from 'react'
import './App.css'
import {
  createContactMessage,
  createTeamMember,
  deleteContactMessage,
  deleteTeamMember,
  fetchContactMessages,
  fetchTeamMembers,
  updateContactMessageStatus,
  updateTeamMember,
} from './services/about'
import {
  checkAccountAvailability,
  changePassword,
  createManagedUser,
  deleteManagedUser,
  fetchSession,
  fetchUsers,
  loginAccount,
  logoutAccount,
  signupAccount,
  updateManagedUser,
} from './services/auth'
import {
  createLaunchRequest,
  deleteLaunchRequest,
  fetchLaunchDashboard,
  launchRequestEndpoint,
  launchRequestStore,
} from './services/launchRequests'
import {
  deleteDirectMessage,
  fetchDirectMessages,
  sendDirectMessage,
} from './services/messages'
import {
  createAnnouncement,
  createLeakReport,
  createSensor,
  deleteAnnouncement,
  deleteLeakReport,
  deleteSensor,
  fetchAnnouncements,
  fetchLeakReports,
  fetchSensors,
} from './services/operations'
import { deleteProduct, fetchProducts, saveProduct } from './services/products'
import { deleteSiteContent, fetchSiteContent, saveSiteContent } from './services/siteContent'

function normalizeBasePath(value, fallback = '/') {
  if (!value) {
    return fallback
  }

  const trimmedValue = value.replace(/^\/+|\/+$/g, '')
  return trimmedValue ? `/${trimmedValue}/` : '/'
}

const appBasePath = normalizeBasePath(import.meta.env.VITE_APP_BASE_PATH, '/')

function stripAppBasePath(pathname) {
  if (appBasePath === '/') {
    return pathname || '/'
  }

  const baseWithoutTrailingSlash = appBasePath.slice(0, -1)
  if (pathname === baseWithoutTrailingSlash || pathname === appBasePath) {
    return '/'
  }

  if (pathname.startsWith(appBasePath)) {
    return pathname.slice(appBasePath.length - 1) || '/'
  }

  return pathname || '/'
}

function buildAppUrl(route) {
  const normalizedRoute = route === '/' ? '' : String(route).replace(/^\/+/, '')

  if (appBasePath === '/') {
    return normalizedRoute ? `/${normalizedRoute}` : '/'
  }

  return normalizedRoute ? `${appBasePath}${normalizedRoute}` : appBasePath
}

function resolvePublicAssetUrl(path) {
  return `${import.meta.env.BASE_URL}${String(path).replace(/^\/+/, '')}`
}

const focusAreaOptions = [
  'Leak monitoring',
  'Tank level visibility',
  'Incident dispatch',
  'Asset maintenance',
]

const announcementKindOptions = ['announcement', 'advert']
const leakStatusOptions = ['critical', 'investigating', 'stable', 'resolved']
const sitePageOptions = ['home', 'about', 'products', 'workspace']
const managedAccountRoleOptions = ['admin', 'user']
const browserSupportedVideoAccept =
  'video/mp4,video/webm,video/ogg,.mp4,.webm,.ogg,.ogv'
const sectionEditorLabelByPage = {
  home: 'Home',
  about: 'About',
  products: 'Products',
  workspace: 'Workspace',
}
const stockMedia = {
  ambientBackgroundVideo: resolvePublicAssetUrl('media/custom/water-network-background.mp4'),
  loginBackgroundVideo: resolvePublicAssetUrl('media/custom/water-network-background.mp4'),
  pipeBurstVideo: resolvePublicAssetUrl('media/stock/pipe-burst-loop.mp4'),
  tapDripVideo: resolvePublicAssetUrl('media/stock/tap-drip-loop.mp4'),
  faucetCloseupVideo: resolvePublicAssetUrl('media/stock/faucet-closeup-loop.mp4'),
  pipeLeakImage: resolvePublicAssetUrl('media/custom/field-pipe-water-leak.jpg'),
  leakingTapImage: resolvePublicAssetUrl('media/custom/brass-tap-drip.jpg'),
  tiledWallLeakImage: resolvePublicAssetUrl('media/custom/tiled-wall-water-leak.jpg'),
  brickDrainLeakImage: resolvePublicAssetUrl('media/custom/brick-drainpipe-leak.jpg'),
  yellowValveImage: resolvePublicAssetUrl('media/custom/yellow-water-valve.jpg'),
}

const defaultAccessHighlights = [
  {
    title: 'Secure workspace access',
    description:
      'Water teams can create accounts, sign in, and move from the public site into the protected monitoring workspace without switching tools.',
  },
  {
    title: 'Platform showcase',
    description:
      'The public product experience now pulls live platform details, visuals, and media instead of relying on fixed brochure copy.',
  },
  {
    title: 'Response team profile',
    description:
      'The team page now presents operators, engineers, and support staff from live content, making the platform feel current and credible.',
  },
  {
    title: 'Operational publishing',
    description:
      'Administrators can register systems, publish updates, add team profiles, and review incoming messages from one coordinated workspace.',
  },
]

const defaultAboutHighlights = [
  {
    title: 'Field-ready team presence',
    description:
      'The About page introduces the people behind monitoring, verification, communication, and water-network response.',
  },
  {
    title: 'Live roster updates',
    description:
      'Additional team members can be added from the workspace without changing the page code or redeploying the app.',
  },
  {
    title: 'Trusted communication flow',
    description:
      'Every contact submission is stored and routed into the workspace inbox so public questions never get lost.',
  },
]

const defaultProductHighlights = [
  {
    title: 'Live platform storytelling',
    description:
      'The product page now pulls live names, summaries, descriptions, images, and video so the platform story stays current.',
  },
  {
    title: 'Rich media publishing',
    description:
      'Admins can upload product images or videos directly from the workspace to give the platform a more professional presentation.',
  },
  {
    title: 'Built for water operations',
    description:
      'The experience ties platform visuals to leak telemetry, response workflows, team visibility, and public communication.',
  },
]

const defaultWorkspaceHighlights = [
  { title: 'Secure session-based authentication protects the workspace.', description: '' },
  {
    title: 'The request and telemetry dashboard refreshes automatically every 30 seconds.',
    description: '',
  },
  {
    title: 'The public product experience reads uploaded visuals and live platform copy from the workspace.',
    description: '',
  },
  {
    title: 'The team roster and contact inbox stay connected to live records.',
    description: '',
  },
  {
    title: 'Leak locations are resolved from registered systems instead of being typed manually.',
    description: '',
  },
]

const defaultPageSections = {
  home: [],
  about: [],
  products: [],
  workspace: [],
}

const defaultSiteContent = {
  brand: {
    name: 'Aqual Sentinel',
    tagline: 'Leak intelligence for pipes, taps, and water networks',
  },
  pages: {
    home: {
      eyebrow: 'Pipe and tap monitoring',
      title: 'Detect pipe and tap leakages early, respond faster, and protect every water line.',
      description:
        'Aqual Sentinel turns leak signals, field visuals, response priorities, and public communication into one live command surface for modern water operations.',
    },
    about: {
      eyebrow: 'Response team',
      title: 'Meet the engineers, operators, and responders behind the leak intelligence network.',
      description:
        'Meet the team coordinating monitoring, field verification, public communication, and response support across the water network.',
    },
    products: {
      eyebrow: 'Monitoring platform',
      description:
        'Aqual Sentinel combines live telemetry, leak verification, response coordination, and polished public communication in one monitoring platform for water operations teams.',
    },
    workspace: {
      eyebrow: 'Leak detection workspace',
      descriptionAdmin:
        'You are signed in as an admin. Monitor leak telemetry, publish updates, register systems, and coordinate response activity from one workspace.',
      descriptionUser:
        'You are signed in as a user. Monitor live leak telemetry, review public updates, and follow the current operating picture from one workspace.',
    },
  },
  adminNote: {
    title: 'Admin note',
    description:
      'The seeded admin account exists in the system, but the sign-in page does not display any password. Admins can create other system administrators, register systems, publish products, add team members, and review contact messages after sign-in.',
  },
  media: {
    loginBackgroundVideoUrl: '',
    loginBackgroundPrimaryUrl: '',
    loginBackgroundSecondaryUrl: '',
    workspaceBackgroundVideoUrl: '',
    workspaceBackgroundPrimaryUrl: '',
    workspaceBackgroundSecondaryUrl: '',
  },
  highlights: {
    home: defaultAccessHighlights,
    about: defaultAboutHighlights,
    products: defaultProductHighlights,
    workspace: defaultWorkspaceHighlights,
  },
  sections: defaultPageSections,
}

const emptyDashboard = {
  summary: {
    totalRequests: 0,
    organizationCount: 0,
    latestRequestAt: null,
    focusBreakdown: focusAreaOptions.map((focusArea) => ({
      focusArea,
      count: 0,
    })),
  },
  recentRequests: [],
  requests: [],
}

const emptyTeamData = {
  summary: {
    totalMembers: 0,
    supervisorCount: 0,
  },
  teamMembers: [],
}

const emptyInboxData = {
  summary: {
    totalMessages: 0,
    unreadMessages: 0,
  },
  messages: [],
}

const emptyDirectMessageData = {
  summary: {
    totalContacts: 0,
    unreadMessages: 0,
    totalMessages: 0,
  },
  contacts: [],
  activeParticipant: null,
  messages: [],
  systemMessages: [],
}

const emptyProductData = {
  summary: {
    totalProducts: 0,
  },
  products: [],
}

const emptyAnnouncementData = {
  summary: {
    totalItems: 0,
    activeItems: 0,
    advertCount: 0,
    announcementCount: 0,
  },
  announcements: [],
}

const emptySensorData = {
  summary: {
    totalSensors: 0,
    activeSensors: 0,
  },
  sensors: [],
}

const emptyLeakData = {
  summary: {
    totalSignals: 0,
    activeLeaks: 0,
    criticalLeaks: 0,
    currentStatus: null,
    firstActiveObservedAt: null,
    latestObservedAt: null,
  },
  leakReports: [],
}

const initialLoginForm = {
  username: '',
  password: '',
  role: '',
}

const initialSignupForm = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: '',
}

const initialPasswordChangeForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const initialPasswordVisibility = {
  login: false,
  signup: false,
  signupConfirm: false,
  managed: false,
  settingsCurrent: false,
  settingsNext: false,
  settingsConfirm: false,
}

const initialLaunchForm = {
  fullName: '',
  organization: '',
  email: '',
  focusArea: focusAreaOptions[0],
}

const initialManagedUserForm = {
  id: '',
  fullName: '',
  username: '',
  email: '',
  role: 'admin',
  password: '',
}

const initialTeamMemberForm = {
  fullName: '',
  title: 'Team Member',
  photo: null,
  photoName: '',
  bio: '',
  displayOrder: '',
}

const initialTeamPhotoUpdateForm = {
  memberId: '',
  fullName: '',
  title: '',
  bio: '',
  displayOrder: '',
  photo: null,
  photoName: '',
}

const initialContactForm = {
  fullName: '',
  email: '',
  subject: '',
  message: '',
}

function createContactForm(user = null) {
  return {
    ...initialContactForm,
    fullName: user?.fullName || '',
    email: user?.email || '',
  }
}

const initialDirectMessageForm = {
  body: '',
}

const initialProductForm = {
  id: '',
  name: 'Aqua Sentinel system',
  summary: '',
  description: '',
  image: null,
  imageName: '',
  video: null,
  videoName: '',
  displayOrder: '',
}

const initialAnnouncementForm = {
  id: '',
  kind: 'announcement',
  title: '',
  message: '',
  image: null,
  imageName: '',
  video: null,
  videoName: '',
  ctaLabel: '',
  ctaLink: '',
  displayOrder: '',
  isActive: true,
}

const initialSensorForm = {
  id: '',
  sensorCode: '',
  displayName: '',
  location: '',
  description: '',
  isActive: true,
}

const initialLeakForm = {
  id: '',
  sensorId: '',
  leakageRate: '',
  status: 'investigating',
  observedAt: '',
  displayOrder: '',
  isActive: true,
}

function createSiteContentForm(content = defaultSiteContent) {
  return {
    brandName: content.brand?.name || defaultSiteContent.brand.name,
    brandTagline: content.brand?.tagline || defaultSiteContent.brand.tagline,
    homeEyebrow: content.pages?.home?.eyebrow || defaultSiteContent.pages.home.eyebrow,
    homeTitle: content.pages?.home?.title || defaultSiteContent.pages.home.title,
    homeDescription:
      content.pages?.home?.description || defaultSiteContent.pages.home.description,
    aboutEyebrow:
      content.pages?.about?.eyebrow || defaultSiteContent.pages.about.eyebrow,
    aboutTitle: content.pages?.about?.title || defaultSiteContent.pages.about.title,
    aboutDescription:
      content.pages?.about?.description || defaultSiteContent.pages.about.description,
    productsEyebrow:
      content.pages?.products?.eyebrow || defaultSiteContent.pages.products.eyebrow,
    productsDescription:
      content.pages?.products?.description ||
      defaultSiteContent.pages.products.description,
    workspaceEyebrow:
      content.pages?.workspace?.eyebrow ||
      defaultSiteContent.pages.workspace.eyebrow,
    workspaceDescriptionAdmin:
      content.pages?.workspace?.descriptionAdmin ||
      defaultSiteContent.pages.workspace.descriptionAdmin,
    workspaceDescriptionUser:
      content.pages?.workspace?.descriptionUser ||
      defaultSiteContent.pages.workspace.descriptionUser,
    adminNoteTitle:
      content.adminNote?.title || defaultSiteContent.adminNote.title,
    adminNoteDescription:
      content.adminNote?.description || defaultSiteContent.adminNote.description,
  }
}

function createSiteMediaForm() {
  return {
    loginBackgroundVideo: null,
    loginBackgroundVideoName: '',
    clearLoginBackgroundVideo: false,
    loginBackgroundPrimary: null,
    loginBackgroundPrimaryName: '',
    clearLoginBackgroundPrimary: false,
    loginBackgroundSecondary: null,
    loginBackgroundSecondaryName: '',
    clearLoginBackgroundSecondary: false,
    workspaceBackgroundVideo: null,
    workspaceBackgroundVideoName: '',
    clearWorkspaceBackgroundVideo: false,
    workspaceBackgroundPrimary: null,
    workspaceBackgroundPrimaryName: '',
    clearWorkspaceBackgroundPrimary: false,
    workspaceBackgroundSecondary: null,
    workspaceBackgroundSecondaryName: '',
    clearWorkspaceBackgroundSecondary: false,
  }
}

function sanitizeSectionGroups(sections = {}) {
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) {
    return {}
  }

  return sitePageOptions.reduce((accumulator, key) => {
    if (Array.isArray(sections[key]) && sections[key].length) {
      accumulator[key] = sections[key]
    }

    return accumulator
  }, {})
}

function createSiteHighlightsForm(content = defaultSiteContent) {
  return sitePageOptions.reduce((accumulator, key) => {
    const pageHighlights = Array.isArray(content.highlights?.[key])
      ? content.highlights[key]
      : defaultSiteContent.highlights[key] || []

    accumulator[key] = pageHighlights.map((item, index) => ({
      id: item.id || `${key}-highlight-${index}`,
      title: item.title || '',
      description: item.description || '',
      displayOrder: item.displayOrder ?? index + 1,
    }))

    return accumulator
  }, {})
}

function createSiteSectionsDraft(content = defaultSiteContent) {
  return JSON.stringify(sanitizeSectionGroups(content.sections), null, 2)
}

function prepareSiteHighlightsPayload(highlights) {
  return sitePageOptions.reduce((accumulator, key) => {
    const pageHighlights = Array.isArray(highlights?.[key]) ? highlights[key] : []

    accumulator[key] = pageHighlights.map((item, index) => {
      const title = String(item.title || '').trim()
      if (!title) {
        throw new Error(
          `${sectionEditorLabelByPage[key]} highlight ${index + 1} needs a title before saving.`,
        )
      }

      const displayOrderValue = String(item.displayOrder ?? '').trim()
      const displayOrder = displayOrderValue ? Number.parseInt(displayOrderValue, 10) : index + 1

      if (!Number.isInteger(displayOrder) || displayOrder < 0) {
        throw new Error(
          `${sectionEditorLabelByPage[key]} highlight ${index + 1} needs a valid display order.`,
        )
      }

      return {
        title,
        description: String(item.description || '').trim(),
        displayOrder,
      }
    })

    return accumulator
  }, {})
}

function normalizeSiteContentSnapshot(content = {}) {
  return {
    ...content,
    highlights: {
      ...defaultSiteContent.highlights,
      ...(content.highlights || {}),
    },
    sections: sanitizeSectionGroups(content.sections),
  }
}

function refreshLegacyText(value, legacyValue, replacement) {
  return value === legacyValue ? replacement : value
}

function normalizeRoute(pathname) {
  if (pathname === '/login' || pathname === '/login/') {
    return '/login'
  }

  if (pathname === '/signup' || pathname === '/signup/') {
    return '/signup'
  }

  if (pathname === '/settings' || pathname === '/settings/') {
    return '/settings'
  }

  if (pathname === '/about' || pathname === '/about/') {
    return '/about'
  }

  if (pathname === '/products' || pathname === '/products/') {
    return '/products'
  }

  return '/'
}

function formatTimestamp(value) {
  if (!value) {
    return 'Awaiting activity'
  }

  return new Intl.DateTimeFormat('en-UG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Kampala',
  }).format(new Date(value))
}

function formatDateValue(value) {
  if (!value) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-UG', {
    dateStyle: 'medium',
    timeZone: 'Africa/Kampala',
  }).format(new Date(value))
}

function formatDateTimeLocalValue(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const timezoneOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function extractLeakRateValue(value) {
  return String(value || '').replace(/\s*L\/min$/, '')
}

function formatClock(value) {
  return new Intl.DateTimeFormat('en-UG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Africa/Kampala',
  }).format(new Date(value))
}

function formatRelativeTime(value) {
  if (!value) {
    return 'No activity yet'
  }

  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const ranges = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]

  for (const [unit, unitSeconds] of ranges) {
    if (Math.abs(seconds) >= unitSeconds || unit === 'minute') {
      return formatter.format(Math.round(seconds / unitSeconds), unit)
    }
  }

  return formatter.format(seconds, 'second')
}

function getTimeValue(value) {
  if (!value) {
    return 0
  }

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function updateFormState(setter) {
  return function handleFormChange(event) {
    const { name, value } = event.target
    setter((current) => ({ ...current, [name]: value }))
  }
}

function isLikelyValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateManagedPassword(value) {
  if (value.length < 8) {
    return 'Password must be at least 8 characters long.'
  }

  if (/^\d+$/.test(value)) {
    return 'Password cannot be entirely numeric.'
  }

  return ''
}

function getInitials(name) {
  const parts = name.split(' ').filter(Boolean)

  if (!parts.length) {
    return 'AS'
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function formatStatusLabel(value) {
  if (!value) {
    return 'Awaiting signal'
  }

  return value
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function resolveSection(sections, slot, audience) {
  return (
    sections.find(
      (section) => section.slot === slot && section.audience === audience,
    ) ||
    sections.find((section) => section.slot === slot && section.audience === 'all') ||
    null
  )
}

function resolveSectionCards(sections, slot, audience, fallbackCards) {
  const matchedSection = resolveSection(sections, slot, audience)

  if (!matchedSection?.cards?.length) {
    return fallbackCards
  }

  const fallbackCardsByKey = new Map(
    fallbackCards.map((fallbackCard) => [fallbackCard.key, fallbackCard]),
  )

  const resolvedCards = matchedSection.cards
    .map((sectionCard) => {
      const fallbackCard = fallbackCardsByKey.get(sectionCard.key) || {
        key: sectionCard.key,
        eyebrow: sectionCard.eyebrow || '',
        value: '',
        title: sectionCard.title || '',
        description: sectionCard.description || '',
        tone: sectionCard.tone || 'sea',
      }

      return {
        ...fallbackCard,
        eyebrow: sectionCard.eyebrow || fallbackCard.eyebrow,
        title: sectionCard.title || fallbackCard.title,
        description: sectionCard.description || fallbackCard.description,
        tone: sectionCard.tone || fallbackCard.tone,
      }
    })
    .filter((card) => card.title || card.description || card.value)

  return resolvedCards.length ? resolvedCards : fallbackCards
}

function resolveFeedSections(sections, fallbackSections) {
  const feedSections = sections.filter((section) => section.kind === 'feed')

  if (!feedSections.length) {
    return fallbackSections
  }

  const fallbackSectionsBySource = new Map(
    fallbackSections.map((fallbackSection) => [fallbackSection.sourceType, fallbackSection]),
  )

  const resolvedSections = feedSections
    .map((section) => {
      const fallbackSection = fallbackSectionsBySource.get(section.sourceType) || {
        id: section.slot,
        label: section.tabLabel || section.title || section.eyebrow || section.slot,
        eyebrow: section.eyebrow,
        title: section.title,
        description: section.description,
        state: 'ready',
        badge: 'Live',
        items: [],
      }

      return {
        ...fallbackSection,
        id: section.slot || fallbackSection.id,
        label:
          section.tabLabel ||
          section.title ||
          fallbackSection.label,
        eyebrow: section.eyebrow || fallbackSection.eyebrow,
        title: section.title || fallbackSection.title,
        description: section.description || fallbackSection.description,
        sourceType: section.sourceType || fallbackSection.sourceType,
        items: section.items?.length ? section.items : fallbackSection.items,
      }
    })
    .filter((section) => section.items.length)

  return resolvedSections.length ? resolvedSections : fallbackSections
}

function getVisitorDayPart(timestamp) {
  const hour = new Date(timestamp).getHours()

  if (hour < 12) {
    return 'morning'
  }

  if (hour < 18) {
    return 'afternoon'
  }

  return 'evening'
}

function RouteButton({ route, target, navigate, children }) {
  return (
    <button
      type="button"
      className={`nav-link-button${route === target ? ' is-active' : ''}`}
      onClick={() => navigate(target)}
    >
      {children}
    </button>
  )
}

function StatusBadge({ state, label }) {
  return <span className={`status-badge is-${state}`}>{label}</span>
}

function PasswordField({
  label,
  name,
  value,
  onChange,
  placeholder,
  visible,
  onToggle,
  required = false,
}) {
  return (
    <label>
      {label}
      <div className="password-field">
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={onToggle}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  )
}

function TeamCard({ member, brandName = 'Aqual Sentinel' }) {
  return (
    <article className="team-card">
      <div className="team-avatar-shell">
        {member.photoUrl ? (
          <img
            className="team-avatar"
            src={member.photoUrl}
            alt={`${member.fullName} profile`}
          />
        ) : (
          <div className="team-avatar-fallback">{getInitials(member.fullName)}</div>
        )}
      </div>

      <div className="team-copy">
        <span className="pill is-neutral">{member.title}</span>
        <h3>{member.fullName}</h3>
        <p>{member.bio || `${brandName} team member.`}</p>
      </div>
    </article>
  )
}

function MediaAsset({
  imageUrl,
  videoUrl,
  alt,
  className,
  fallback,
  controls = false,
}) {
  if (videoUrl) {
    return (
      <video
        className={className}
        src={videoUrl}
        autoPlay
        muted
        loop
        playsInline
        controls={controls}
      />
    )
  }

  if (imageUrl) {
    return <img className={className} src={imageUrl} alt={alt} />
  }

  return fallback
}

function ProductCard({ product }) {
  return (
    <article className="product-card">
      <div className="product-figure-shell">
        <MediaAsset
          imageUrl={product.imageUrl}
          videoUrl={product.videoUrl}
          alt={`${product.name} preview`}
          className="product-image"
          controls
          fallback={<div className="product-image-fallback">{product.name}</div>}
        />
      </div>

      <div className="product-copy">
        <div className="product-badges">
          <span className="pill is-neutral">Product</span>
          <span className="pill">Display order {product.displayOrder}</span>
          {product.videoUrl ? <span className="pill is-live">Video</span> : null}
        </div>
        <h3>{product.name}</h3>
        {product.summary ? <p className="product-summary">{product.summary}</p> : null}
        <p>
          {product.description ||
            'No product description has been published yet.'}
        </p>
      </div>
    </article>
  )
}

function ProductPulseRail({
  products,
  activeIndex,
  eyebrow,
  title,
  description,
  state,
  badge,
  emptyMessage,
  maxVisible = 6,
}) {
  const mediaProducts = products.filter((product) => product.imageUrl || product.videoUrl)
  const orderedProducts = mediaProducts.length
    ? Array.from({ length: mediaProducts.length }).map(
        (_, offset) => mediaProducts[(activeIndex + offset) % mediaProducts.length],
      )
    : []
  const activeProduct = orderedProducts[0] || null
  const queuedProducts = orderedProducts.slice(1, Math.min(maxVisible, orderedProducts.length))
  const hiddenProductCount = Math.max(
    mediaProducts.length - (queuedProducts.length + (activeProduct ? 1 : 0)),
    0,
  )

  return (
    <section className="product-pulse-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="muted-line product-pulse-description">{description}</p>
        </div>
        <div className="product-pulse-head">
          <StatusBadge state={state} label={badge} />
          <div className="product-pulse-note">
            <strong>{String(mediaProducts.length).padStart(2, '0')}</strong>
            <span>
              {mediaProducts.length === 1 ? 'published visual' : 'published visuals'}
            </span>
          </div>
        </div>
      </div>

      {activeProduct ? (
        <>
          <div className="product-pulse-stage">
            <article key={activeProduct.id} className="product-pulse-lead-card">
              <div className="product-pulse-lead-media-shell">
                <MediaAsset
                  imageUrl={activeProduct.imageUrl}
                  videoUrl={activeProduct.videoUrl}
                  alt={`${activeProduct.name} preview`}
                  className="product-pulse-lead-media"
                  fallback={
                    <div className="product-pulse-media-fallback">{activeProduct.name}</div>
                  }
                />
              </div>

              <div className="product-pulse-lead-copy">
                <div className="product-pulse-meta">
                  <span>{activeProduct.videoUrl ? 'Video media' : 'Image media'}</span>
                  <strong>{formatRelativeTime(activeProduct.createdAt)}</strong>
                </div>
                <h3>{activeProduct.name}</h3>
                <p>
                  {activeProduct.summary ||
                    activeProduct.description ||
                    'Published product media.'}
                </p>
                <div className="product-pulse-lead-footer">
                  <span className="pill">Product media</span>
                  <span>
                    {String((activeIndex % mediaProducts.length) + 1).padStart(2, '0')} /{' '}
                    {String(mediaProducts.length).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </article>

            <div className="product-pulse-grid">
              {queuedProducts.map((product) => (
                <article
                  key={`${product.id}-${activeIndex}`}
                  className="product-pulse-card"
                >
                  <div className="product-pulse-media-shell">
                    <MediaAsset
                      imageUrl={product.imageUrl}
                      videoUrl={product.videoUrl}
                      alt={`${product.name} preview`}
                      className="product-pulse-media"
                      fallback={
                        <div className="product-pulse-media-fallback">{product.name}</div>
                      }
                    />
                  </div>

                  <div className="product-pulse-copy">
                    <div className="product-pulse-meta">
                      <span>{product.videoUrl ? 'Video' : 'Image'}</span>
                      <strong>{formatRelativeTime(product.createdAt)}</strong>
                    </div>
                    <h3>{product.name}</h3>
                    <p>
                      {product.summary ||
                        product.description ||
                        'Published product media.'}
                    </p>
                  </div>
                </article>
              ))}

              {hiddenProductCount ? (
                <article className="product-pulse-card product-pulse-more-card">
                  <strong>+{hiddenProductCount}</strong>
                  <span>more published products</span>
                </article>
              ) : null}
            </div>
          </div>

          {mediaProducts.length > 1 ? (
            <div className="carousel-dots" aria-hidden="true">
              {mediaProducts.map((product, index) => (
                <span
                  key={product.id}
                  className={`carousel-dot${index === activeIndex % mediaProducts.length ? ' is-active' : ''}`}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-state">{emptyMessage}</div>
      )}
    </section>
  )
}

function TeamPulseRail({
  members,
  activeIndex,
  eyebrow,
  title,
  description,
  state,
  badge,
  emptyMessage,
  maxVisible = 6,
}) {
  const orderedMembers = members.length
    ? Array.from({ length: members.length }).map(
        (_, offset) => members[(activeIndex + offset) % members.length],
      )
    : []
  const activeMember = orderedMembers[0] || null
  const queuedMembers = orderedMembers.slice(1, Math.min(maxVisible, orderedMembers.length))
  const hiddenMemberCount = Math.max(
    members.length - (queuedMembers.length + (activeMember ? 1 : 0)),
    0,
  )

  return (
    <section className="product-pulse-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="muted-line product-pulse-description">{description}</p>
        </div>
        <div className="product-pulse-head">
          <StatusBadge state={state} label={badge} />
          <div className="product-pulse-note">
            <strong>{String(members.length).padStart(2, '0')}</strong>
            <span>{members.length === 1 ? 'team profile' : 'team profiles'}</span>
          </div>
        </div>
      </div>

      {activeMember ? (
        <>
          <div className="product-pulse-stage">
            <article key={activeMember.id} className="product-pulse-lead-card">
              <div className="product-pulse-lead-media-shell">
                <MediaAsset
                  imageUrl={activeMember.photoUrl}
                  videoUrl=""
                  alt={`${activeMember.fullName} profile`}
                  className="product-pulse-lead-media"
                  fallback={
                    <div className="team-pulse-avatar-fallback">
                      {getInitials(activeMember.fullName)}
                    </div>
                  }
                />
              </div>

              <div className="product-pulse-lead-copy">
                <div className="product-pulse-meta">
                  <span>{activeMember.title}</span>
                  <strong>{formatRelativeTime(activeMember.createdAt)}</strong>
                </div>
                <h3>{activeMember.fullName}</h3>
                <p>
                  {activeMember.bio ||
                    `${activeMember.fullName} is part of the public team roster.`}
                </p>
                <div className="product-pulse-lead-footer">
                  <span className="pill is-neutral">Team profile</span>
                  <span>
                    {String((activeIndex % members.length) + 1).padStart(2, '0')} /{' '}
                    {String(members.length).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </article>

            <div className="product-pulse-grid">
              {queuedMembers.map((member) => (
                <article key={`${member.id}-${activeIndex}`} className="product-pulse-card">
                  <div className="product-pulse-media-shell">
                    <MediaAsset
                      imageUrl={member.photoUrl}
                      videoUrl=""
                      alt={`${member.fullName} profile`}
                      className="product-pulse-media"
                      fallback={
                        <div className="team-pulse-avatar-fallback">
                          {getInitials(member.fullName)}
                        </div>
                      }
                    />
                  </div>

                  <div className="product-pulse-copy">
                    <div className="product-pulse-meta">
                      <span>{member.title}</span>
                      <strong>{formatRelativeTime(member.createdAt)}</strong>
                    </div>
                    <h3>{member.fullName}</h3>
                    <p>{member.bio || `${member.fullName} is visible on the About page.`}</p>
                  </div>
                </article>
              ))}

              {hiddenMemberCount ? (
                <article className="product-pulse-card product-pulse-more-card">
                  <strong>+{hiddenMemberCount}</strong>
                  <span>more team members</span>
                </article>
              ) : null}
            </div>
          </div>

          {members.length > 1 ? (
            <div className="carousel-dots" aria-hidden="true">
              {members.map((member, index) => (
                <span
                  key={member.id}
                  className={`carousel-dot${index === activeIndex % members.length ? ' is-active' : ''}`}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-state">{emptyMessage}</div>
      )}
    </section>
  )
}

function AnnouncementPulseRail({
  items,
  activeIndex,
  eyebrow,
  title,
  description,
  state,
  badge,
  emptyMessage,
  singularLabel,
  pluralLabel,
  leadPillLabel,
  maxVisible = 6,
}) {
  const orderedItems = items.length
    ? Array.from({ length: items.length }).map(
        (_, offset) => items[(activeIndex + offset) % items.length],
      )
    : []
  const activeItem = orderedItems[0] || null
  const queuedItems = orderedItems.slice(1, Math.min(maxVisible, orderedItems.length))
  const hiddenItemCount = Math.max(
    items.length - (queuedItems.length + (activeItem ? 1 : 0)),
    0,
  )

  return (
    <section className="product-pulse-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="muted-line product-pulse-description">{description}</p>
        </div>
        <div className="product-pulse-head">
          <StatusBadge state={state} label={badge} />
          <div className="product-pulse-note">
            <strong>{String(items.length).padStart(2, '0')}</strong>
            <span>{items.length === 1 ? singularLabel : pluralLabel}</span>
          </div>
        </div>
      </div>

      {activeItem ? (
        <>
          <div className="product-pulse-stage">
            <article key={activeItem.id} className="product-pulse-lead-card">
              <div className="product-pulse-lead-media-shell">
                <MediaAsset
                  imageUrl={activeItem.imageUrl}
                  videoUrl={activeItem.videoUrl}
                  alt={`${activeItem.title} visual`}
                  className="product-pulse-lead-media"
                  fallback={
                    <div className="announcement-image-fallback">{activeItem.title}</div>
                  }
                />
              </div>

              <div className="product-pulse-lead-copy">
                <div className="product-pulse-meta">
                  <span>{formatStatusLabel(activeItem.kind)}</span>
                  <strong>{formatRelativeTime(activeItem.createdAt)}</strong>
                </div>
                <h3>{activeItem.title}</h3>
                <p>{activeItem.message || 'Published from the workspace.'}</p>
                {activeItem.ctaLabel ? (
                  activeItem.ctaLink ? (
                    <a
                      className="announcement-cta"
                      href={activeItem.ctaLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {activeItem.ctaLabel}
                    </a>
                  ) : (
                    <span className="announcement-cta">{activeItem.ctaLabel}</span>
                  )
                ) : null}
                <div className="product-pulse-lead-footer">
                  <span className={`pill is-${activeItem.kind}`}>{leadPillLabel}</span>
                  <span>
                    {String((activeIndex % items.length) + 1).padStart(2, '0')} /{' '}
                    {String(items.length).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </article>

            <div className="product-pulse-grid">
              {queuedItems.map((item) => (
                <article key={`${item.id}-${activeIndex}`} className="product-pulse-card">
                  <div className="product-pulse-media-shell">
                    <MediaAsset
                      imageUrl={item.imageUrl}
                      videoUrl={item.videoUrl}
                      alt={`${item.title} visual`}
                      className="product-pulse-media"
                      fallback={
                        <div className="announcement-image-fallback">{item.title}</div>
                      }
                    />
                  </div>

                  <div className="product-pulse-copy">
                    <div className="product-pulse-meta">
                      <span>{formatStatusLabel(item.kind)}</span>
                      <strong>{formatRelativeTime(item.createdAt)}</strong>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.message || 'Published from the workspace.'}</p>
                  </div>
                </article>
              ))}

              {hiddenItemCount ? (
                <article className="product-pulse-card product-pulse-more-card">
                  <strong>+{hiddenItemCount}</strong>
                  <span>{pluralLabel}</span>
                </article>
              ) : null}
            </div>
          </div>

          {items.length > 1 ? (
            <div className="carousel-dots" aria-hidden="true">
              {items.map((item, index) => (
                <span
                  key={item.id}
                  className={`carousel-dot${index === activeIndex % items.length ? ' is-active' : ''}`}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-state">{emptyMessage}</div>
      )}
    </section>
  )
}

function AnnouncementCard({ item, isActive = false }) {
  const hasMedia = Boolean(item.imageUrl || item.videoUrl)

  return (
    <article
      className={`announcement-card${isActive ? ' is-active' : ''}${hasMedia ? '' : ' is-text-only'}`}
    >
      {hasMedia ? (
        <div className="announcement-media">
          <MediaAsset
            imageUrl={item.imageUrl}
            videoUrl={item.videoUrl}
            alt={`${item.title} visual`}
            className="announcement-image"
            controls
            fallback={<div className="announcement-image-fallback">{item.title}</div>}
          />
        </div>
      ) : null}

      <div className="announcement-copy">
        <div className="announcement-badges">
          <span className={`pill is-${item.kind}`}>{formatStatusLabel(item.kind)}</span>
          {item.isActive ? <span className="pill is-live">Live</span> : null}
          {item.videoUrl ? <span className="pill is-live">Video</span> : null}
        </div>
        <h3>{item.title}</h3>
        <p>{item.message}</p>
        {item.ctaLabel ? (
          item.ctaLink ? (
            <a
              className="announcement-cta"
              href={item.ctaLink}
              target="_blank"
              rel="noreferrer"
            >
              {item.ctaLabel}
            </a>
          ) : (
            <span className="announcement-cta">{item.ctaLabel}</span>
          )
        ) : null}
      </div>
    </article>
  )
}

function LeakCard({ leakReport, publicView = false }) {
  const title = publicView
    ? leakReport.location || 'Awaiting location'
    : leakReport.sensorName || leakReport.location
  const subtitle = publicView
    ? `Updated ${formatRelativeTime(leakReport.observedAt)}`
    : leakReport.location
  const footerNote = publicView
    ? leakReport.status === 'resolved'
      ? 'No leakage reported at the moment.'
      : `${leakReport.leakageRate} recorded ${formatRelativeTime(leakReport.observedAt)}.`
    : `Started ${formatRelativeTime(leakReport.observedAt)}`

  return (
    <article className={`leak-card is-${leakReport.status}`}>
      <div className="list-top">
        <div>
          <strong>{title}</strong>
          <p>{subtitle}</p>
        </div>
        <span className={`pill is-${leakReport.status}`}>
          {formatStatusLabel(leakReport.status)}
        </span>
      </div>
      <div className="leak-stats">
        <div>
          <span className="strip-label">Leakage</span>
          <strong>{leakReport.leakageRate}</strong>
        </div>
        <div>
          <span className="strip-label">Leak started</span>
          <strong>{formatTimestamp(leakReport.observedAt)}</strong>
        </div>
      </div>
      <p className="muted-line">{footerNote}</p>
    </article>
  )
}

function SignalStoryCard({ eyebrow, title, description, value, tone = 'sea' }) {
  return (
    <article className={`signal-story-card is-${tone}`}>
      <div className="signal-story-head">
        <span className="strip-label">{eyebrow}</span>
        {value ? <strong className="signal-story-value">{value}</strong> : null}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}

function TelemetryAccessPanel({
  eyebrow = 'Telemetry access',
  title = 'Sign in to view leak status',
  description = 'Live location, time, and leakage details are available inside the authenticated workspace.',
  actionLabel = 'Open sign in',
  onAction,
}) {
  return (
    <article className="signal-panel telemetry-access-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="pill is-neutral">Private</span>
      </div>

      <p className="muted-line">{description}</p>

      {onAction ? (
        <button
          type="button"
          className="secondary-button"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
  )
}

function NewsroomLeadCard({ item }) {
  return (
    <article className="newsroom-lead-card">
      <div className="newsroom-lead-media-shell">
        <MediaAsset
          imageUrl={item.imageUrl}
          videoUrl={item.videoUrl}
          alt={item.headline}
          className="newsroom-lead-media"
          fallback={
            <div className="newsroom-media-fallback">
              <span>{item.sectionLabel}</span>
              <strong>{item.headline}</strong>
            </div>
          }
        />
      </div>

      <div className="newsroom-lead-copy">
        <span className="water-chip">Lead update</span>
        <div className="newsroom-lead-meta">
          <span>{item.sectionLabel}</span>
          <strong>{formatRelativeTime(item.timestamp)}</strong>
        </div>
        <h2>{item.headline}</h2>
        <p>{item.summary}</p>
        <div className="newsroom-lead-footer">
          <span className={`pill is-${item.pillTone}`}>{item.pillLabel}</span>
          <span>{item.meta}</span>
        </div>
      </div>
    </article>
  )
}

function NewsroomBriefCard({ item, isActive = false }) {
  return (
    <article className={`newsroom-brief-card${isActive ? ' is-active' : ''}`}>
      <div className="newsroom-brief-visual-shell">
        <MediaAsset
          imageUrl={item.imageUrl}
          videoUrl={item.videoUrl}
          alt={item.headline}
          className="newsroom-brief-visual"
          fallback={
            <div className="newsroom-thumb-fallback">
              <span>{item.pillLabel}</span>
            </div>
          }
        />
      </div>

      <div className="newsroom-brief-copy">
        <div className="newsroom-brief-meta">
          <span>{item.sectionLabel}</span>
          <span>{formatRelativeTime(item.timestamp)}</span>
        </div>
        <strong>{item.headline}</strong>
        <p>{item.summary}</p>
        <div className="newsroom-brief-footer">
          <span className={`pill is-${item.pillTone}`}>{item.pillLabel}</span>
          <span>{item.meta}</span>
        </div>
      </div>
    </article>
  )
}

function DeskFeedRow({ item }) {
  return (
    <article className="desk-feed-row">
      <div className="desk-feed-meta">
        <span>{item.sectionLabel}</span>
        <span>{formatRelativeTime(item.timestamp)}</span>
      </div>
      <strong>{item.headline}</strong>
      <p>{item.summary}</p>
    </article>
  )
}

function JourneyStepCard({ step, title, description, compact = false }) {
  return (
    <article className={`journey-step-card${compact ? ' is-compact' : ''}`}>
      <span className="journey-step-index">{step}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  )
}

function SpotlightPanel({
  item,
  eyebrow,
  title,
  description,
  badges = [],
  stats = [],
  theme = 'sea',
  compact = false,
}) {
  const mediaTitle = item?.headline || title
  const mediaMeta = item?.timestamp ? formatRelativeTime(item.timestamp) : 'Live sync'
  const hasMedia = Boolean(item?.imageUrl || item?.videoUrl)

  return (
    <article className={`spotlight-panel is-${theme}${compact ? ' is-compact' : ''}`}>
      <div className="spotlight-media-shell">
        <MediaAsset
          imageUrl={item?.imageUrl}
          videoUrl={item?.videoUrl}
          alt={mediaTitle}
          className="spotlight-media"
          fallback={
            <div className="spotlight-fallback">
              <span>{eyebrow}</span>
              <strong>{mediaTitle}</strong>
            </div>
          }
        />
        <div className="spotlight-scan" aria-hidden="true" />
        {!hasMedia ? <div className="spotlight-grid-overlay" aria-hidden="true" /> : null}
      </div>

      <div className="spotlight-copy">
        <div className="spotlight-meta">
          <span>{eyebrow}</span>
          <strong>{mediaMeta}</strong>
        </div>
        <h3>{title}</h3>
        <p>{description}</p>

        {badges.length ? (
          <div className="spotlight-badge-row">
            {badges.map((badge) => (
              <span
                key={`${badge.label}-${badge.tone || 'neutral'}`}
                className={`pill${badge.tone ? ` is-${badge.tone}` : ' is-neutral'}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}

        {stats.length ? (
          <div className="spotlight-stat-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="spotlight-stat-card">
                <span className="strip-label">{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function AmbientMediaBackdrop({ route, currentUser, siteMedia }) {
  const loginBackgroundVideoUrl = siteMedia?.loginBackgroundVideoUrl || ''
  const loginBackgroundImages = [
    siteMedia?.loginBackgroundPrimaryUrl || '',
    siteMedia?.loginBackgroundSecondaryUrl || '',
  ]
    .filter(Boolean)
    .map((src, index) => ({
      src,
      className:
        index === 0
          ? 'ambient-backdrop-image-primary'
          : 'ambient-backdrop-image-secondary',
    }))
  const workspaceBackgroundVideoUrl = siteMedia?.workspaceBackgroundVideoUrl || ''
  const workspaceBackgroundImages = [
    siteMedia?.workspaceBackgroundPrimaryUrl || '',
    siteMedia?.workspaceBackgroundSecondaryUrl || '',
  ]
    .filter(Boolean)
    .map((src, index) => ({
      src,
      className:
        index === 0
          ? 'ambient-backdrop-image-primary'
          : 'ambient-backdrop-image-secondary',
    }))

  const variant = currentUser
    ? route === '/settings'
      ? 'settings'
      : 'workspace'
    : route === '/login'
      ? 'login'
    : route === '/signup'
      ? 'signup'
    : route === '/products'
      ? 'products'
    : route === '/about'
        ? 'about'
        : 'home'

  const authSurfaceVideos = [
    {
      src: loginBackgroundVideoUrl || stockMedia.loginBackgroundVideo,
      className: 'ambient-video-primary ambient-video-login',
      preload: 'auto',
    },
  ]
  const workspaceSurfaceVideos = workspaceBackgroundVideoUrl
    ? [
        {
          src: workspaceBackgroundVideoUrl,
          className: 'ambient-video-primary',
          preload: 'auto',
        },
      ]
    : [
        {
          src: stockMedia.ambientBackgroundVideo,
          className: 'ambient-video-primary',
          preload: 'auto',
        },
        {
          src: stockMedia.tapDripVideo,
          className: 'ambient-video-accent ambient-video-accent-right',
          preload: 'metadata',
        },
      ]

  const mediaByVariant = {
    home: {
      videos: [
        {
          src: stockMedia.ambientBackgroundVideo,
          className: 'ambient-video-primary',
          preload: 'auto',
        },
        {
          src: stockMedia.pipeBurstVideo,
          className: 'ambient-video-accent ambient-video-accent-right',
          preload: 'metadata',
        },
      ],
      images: [
        {
          src: stockMedia.tiledWallLeakImage,
          title: 'Water escaping behind tiled surfaces',
        },
        {
          src: stockMedia.pipeLeakImage,
          title: 'Pressurized pipe leakage in the field',
        },
      ],
    },
    login: {
      videos: authSurfaceVideos,
      backdropImages: loginBackgroundImages,
      images: [],
    },
    signup: {
      videos: authSurfaceVideos,
      backdropImages: loginBackgroundImages,
      images: [],
    },
    about: {
      videos: [
        {
          src: stockMedia.ambientBackgroundVideo,
          className: 'ambient-video-primary',
          preload: 'auto',
        },
        {
          src: stockMedia.faucetCloseupVideo,
          className: 'ambient-video-accent ambient-video-accent-right',
          preload: 'metadata',
        },
      ],
      backdropImages: [],
      images: [
        {
          src: stockMedia.leakingTapImage,
          title: 'Tap leakage close-up',
        },
        {
          src: stockMedia.yellowValveImage,
          title: 'Aging valve hardware',
        },
      ],
    },
    products: {
      videos: [
        {
          src: stockMedia.ambientBackgroundVideo,
          className: 'ambient-video-primary',
          preload: 'auto',
        },
        {
          src: stockMedia.pipeBurstVideo,
          className: 'ambient-video-accent ambient-video-accent-left',
          preload: 'metadata',
        },
      ],
      backdropImages: [],
      images: [
        {
          src: stockMedia.brickDrainLeakImage,
          title: 'Wall-mounted drainpipe leak',
        },
        {
          src: stockMedia.pipeLeakImage,
          title: 'Pipe network monitoring',
        },
      ],
    },
    workspace: {
      videos: workspaceSurfaceVideos,
      backdropImages: workspaceBackgroundImages,
      images: [
        {
          src: stockMedia.tiledWallLeakImage,
          title: 'Surface leak investigation',
        },
      ],
    },
    settings: {
      videos: workspaceSurfaceVideos,
      backdropImages: workspaceBackgroundImages,
      images: [
        {
          src: stockMedia.yellowValveImage,
          title: 'Secure valve and access control view',
        },
      ],
    },
  }

  const activeMedia = mediaByVariant[variant]

  return (
    <div
      className={`ambient-backdrop is-${variant}${activeMedia.backdropImages?.length ? ' has-background-images' : ''}`}
      aria-hidden="true"
    >
      {(activeMedia.backdropImages || []).map((item, index) => (
        <div
          key={`${variant}-background-image-${index}`}
          className={`ambient-backdrop-image ${item.className}`}
          style={{ backgroundImage: `url("${item.src}")` }}
        />
      ))}
      {activeMedia.videos.map((item, index) => (
        <video
          key={`${variant}-video-${item.src}-${index}`}
          className={`ambient-video ${item.className}`}
          src={item.src}
          autoPlay
          muted
          loop
          playsInline
          preload={item.preload || 'metadata'}
        />
      ))}
      <div className="ambient-backdrop-shade" />
      <div className="ambient-beam ambient-beam-1" />
      <div className="ambient-beam ambient-beam-2" />
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-rings" />
      <div className="ambient-grid" />
      <div className="ambient-vignette" />

    </div>
  )
}

function App() {
  const [route, setRoute] = useState(() =>
    normalizeRoute(stripAppBasePath(window.location.pathname)),
  )
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [dashboardState, setDashboardState] = useState('loading')
  const [dashboardMessage, setDashboardMessage] = useState(
    'Syncing live launch signals...',
  )
  const [teamData, setTeamData] = useState(emptyTeamData)
  const [teamState, setTeamState] = useState('loading')
  const [teamMessage, setTeamMessage] = useState(
    'Loading the team directory...',
  )
  const [productData, setProductData] = useState(emptyProductData)
  const [productState, setProductState] = useState('loading')
  const [productMessage, setProductMessage] = useState(
    'Loading the product catalog...',
  )
  const [announcementData, setAnnouncementData] = useState(emptyAnnouncementData)
  const [announcementState, setAnnouncementState] = useState('loading')
  const [announcementMessage, setAnnouncementMessage] = useState(
    'Loading announcements and adverts...',
  )
  const [sensorData, setSensorData] = useState(emptySensorData)
  const [sensorState, setSensorState] = useState('loading')
  const [sensorMessage, setSensorMessage] = useState(
    'Loading registered systems...',
  )
  const [leakData, setLeakData] = useState(emptyLeakData)
  const [leakState, setLeakState] = useState('loading')
  const [leakMessage, setLeakMessage] = useState(
    'Loading live IoT leak telemetry...',
  )
  const [siteContent, setSiteContent] = useState(defaultSiteContent)
  const [siteState, setSiteState] = useState('loading')
  const [siteMessage, setSiteMessage] = useState(
    'Loading site content...',
  )
  const [siteContentForm, setSiteContentForm] = useState(() =>
    createSiteContentForm(),
  )
  const [siteHighlightsForm, setSiteHighlightsForm] = useState(() =>
    createSiteHighlightsForm(),
  )
  const [siteSectionsDraft, setSiteSectionsDraft] = useState(() =>
    createSiteSectionsDraft(),
  )
  const [siteMediaForm, setSiteMediaForm] = useState(() => createSiteMediaForm())
  const [siteContentFormState, setSiteContentFormState] = useState('idle')
  const [siteContentFormMessage, setSiteContentFormMessage] = useState(
    'Update the live site copy here.',
  )
  const [siteEditorDirty, setSiteEditorDirty] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [sessionState, setSessionState] = useState('loading')
  const [sessionMessage, setSessionMessage] = useState(
    'Checking whether you already have an active session...',
  )
  const [authState, setAuthState] = useState('idle')
  const [authMessage, setAuthMessage] = useState(
    'Use your account to enter the workspace.',
  )
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [signupForm, setSignupForm] = useState(initialSignupForm)
  const [passwordChangeForm, setPasswordChangeForm] = useState(
    initialPasswordChangeForm,
  )
  const [passwordChangeState, setPasswordChangeState] = useState('idle')
  const [passwordChangeMessage, setPasswordChangeMessage] = useState(
    'Use at least 8 characters, confirm the new password, and keep it different from your current password.',
  )
  const [passwordVisibility, setPasswordVisibility] = useState(
    initialPasswordVisibility,
  )
  const [launchForm, setLaunchForm] = useState(initialLaunchForm)
  const [launchState, setLaunchState] = useState('idle')
  const [launchMessage, setLaunchMessage] = useState(
    'Requests submitted here are stored and reflected back into the live operations dashboard.',
  )
  const [managedUserForm, setManagedUserForm] = useState(initialManagedUserForm)
  const [managedUserState, setManagedUserState] = useState('idle')
  const [managedUserMessage, setManagedUserMessage] = useState(
    'Create or update user and admin accounts here. Use at least 8 characters for any password you set.',
  )
  const [teamMemberForm, setTeamMemberForm] = useState(initialTeamMemberForm)
  const [teamMemberState, setTeamMemberState] = useState('idle')
  const [teamMemberMessage, setTeamMemberMessage] = useState(
    'Add team members here and they will appear on the public response team page.',
  )
  const [teamPhotoUpdateForm, setTeamPhotoUpdateForm] = useState(
    initialTeamPhotoUpdateForm,
  )
  const [teamPhotoUpdateState, setTeamPhotoUpdateState] = useState('idle')
  const [teamPhotoUpdateMessage, setTeamPhotoUpdateMessage] = useState(
    'Select an existing team member and upload a real profile photo to replace the initials card.',
  )
  const [contactForm, setContactForm] = useState(() => createContactForm())
  const [contactState, setContactState] = useState('idle')
  const [contactMessage, setContactMessage] = useState(
    'Send an inquiry and it will appear in the admin inbox for follow-up.',
  )
  const [productForm, setProductForm] = useState(initialProductForm)
  const [productFormState, setProductFormState] = useState('idle')
  const [productFormMessage, setProductFormMessage] = useState(
    'Upload polished product images or videos from this workspace to strengthen the public platform story.',
  )
  const [announcementForm, setAnnouncementForm] = useState(initialAnnouncementForm)
  const [announcementFormState, setAnnouncementFormState] = useState('idle')
  const [announcementFormMessage, setAnnouncementFormMessage] = useState(
    'Publish service notices and awareness campaigns here. Uploaded images and videos appear on the public website.',
  )
  const [sensorForm, setSensorForm] = useState(initialSensorForm)
  const [sensorFormState, setSensorFormState] = useState('idle')
  const [sensorFormMessage, setSensorFormMessage] = useState(
    'Register each monitoring system once so leak locations and monitoring context come from the system record automatically.',
  )
  const [leakForm, setLeakForm] = useState(initialLeakForm)
  const [leakFormState, setLeakFormState] = useState('idle')
  const [leakFormMessage, setLeakFormMessage] = useState(
    'Publish the latest leak signal by selecting a registered system. The location is pulled automatically.',
  )
  const [userDirectory, setUserDirectory] = useState([])
  const [userDirectoryState, setUserDirectoryState] = useState('idle')
  const [userDirectoryMessage, setUserDirectoryMessage] = useState(
    'Admin access unlocks the account directory.',
  )
  const [contactInbox, setContactInbox] = useState(emptyInboxData)
  const [contactInboxState, setContactInboxState] = useState('idle')
  const [contactInboxMessage, setContactInboxMessage] = useState(
    'Admin access unlocks the contact inbox.',
  )
  const [directMessageData, setDirectMessageData] = useState(emptyDirectMessageData)
  const [directMessageState, setDirectMessageState] = useState('idle')
  const [directMessageMessage, setDirectMessageMessage] = useState(
    'Signed-in messaging appears here.',
  )
  const [directMessageForm, setDirectMessageForm] = useState(initialDirectMessageForm)
  const [selectedDirectParticipantId, setSelectedDirectParticipantId] = useState('')
  const [focusFilter, setFocusFilter] = useState('All focus areas')
  const [clock, setClock] = useState(Date.now())
  const [activeAdvertIndex, setActiveAdvertIndex] = useState(0)
  const [activeBulletinIndex, setActiveBulletinIndex] = useState(0)
  const [activeProductRailIndex, setActiveProductRailIndex] = useState(0)
  const [activeTeamRailIndex, setActiveTeamRailIndex] = useState(0)
  const [activeVisualIndex, setActiveVisualIndex] = useState(0)
  const [activeDeskIndex, setActiveDeskIndex] = useState(0)

  const deferredFocusFilter = useDeferredValue(focusFilter)
  const isAdmin = Boolean(currentUser?.isAdmin)
  const canViewLeakStatus = Boolean(currentUser)

  const refreshSession = useEffectEvent(async ({ silent = false } = {}) => {
    if (!silent) {
      setSessionState((current) => (current === 'ready' ? 'refreshing' : 'loading'))
      setSessionMessage('Checking account session...')
    }

    try {
      const payload = await fetchSession()

      startTransition(() => {
        setCurrentUser(payload.user)
        setSessionState('ready')
        setSessionMessage(
          payload.user
            ? `Signed in as ${payload.user.username}.`
            : 'No active session yet. Sign in or create an account.',
        )
      })
    } catch (error) {
      setSessionState('error')
      setSessionMessage(
        error instanceof Error
          ? error.message
          : 'Unable to verify the current session.',
      )
    }
  })

  const refreshDashboard = useEffectEvent(async ({ silent = false } = {}) => {
    if (!silent) {
      setDashboardState((current) => (current === 'ready' ? 'refreshing' : 'loading'))
      setDashboardMessage('Refreshing live launch demand...')
    }

    try {
      const nextDashboard = await fetchLaunchDashboard()

      startTransition(() => {
        setDashboard(nextDashboard)
        setDashboardState('ready')
        setDashboardMessage('Live demand synced successfully.')
      })
    } catch (error) {
      setDashboardState('error')
      setDashboardMessage(
        error instanceof Error
          ? error.message
          : 'Unable to refresh the launch dashboard.',
      )
    }
  })

  const refreshTeamMembers = useEffectEvent(async ({ silent = false } = {}) => {
    if (!silent) {
      setTeamState((current) => (current === 'ready' ? 'refreshing' : 'loading'))
      setTeamMessage('Refreshing the team directory...')
    }

    try {
      const payload = await fetchTeamMembers()

      startTransition(() => {
        setTeamData(payload)
        setTeamState('ready')
        setTeamMessage('Team directory synced successfully.')
      })
    } catch (error) {
      setTeamState('error')
      setTeamMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load the team directory.',
      )
    }
  })

  const refreshProducts = useEffectEvent(async ({ silent = false } = {}) => {
    if (!silent) {
      setProductState((current) => (current === 'ready' ? 'refreshing' : 'loading'))
      setProductMessage('Refreshing the product catalog...')
    }

    try {
      const payload = await fetchProducts()

      startTransition(() => {
        setProductData(payload)
        setProductState('ready')
        setProductMessage('Product catalog synced successfully.')
      })
    } catch (error) {
      setProductState('error')
      setProductMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load the product catalog.',
      )
    }
  })

  const refreshAnnouncements = useEffectEvent(async ({ silent = false } = {}) => {
    if (!silent) {
      setAnnouncementState((current) =>
        current === 'ready' ? 'refreshing' : 'loading',
      )
      setAnnouncementMessage('Refreshing announcements and adverts...')
    }

    try {
      const payload = await fetchAnnouncements()

      startTransition(() => {
        setAnnouncementData(payload)
        setAnnouncementState('ready')
        setAnnouncementMessage('Announcements and adverts synced successfully.')
      })
    } catch (error) {
      setAnnouncementState('error')
      setAnnouncementMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load announcements and adverts.',
      )
    }
  })

  const refreshSensors = useEffectEvent(async ({ silent = false } = {}) => {
    if (!silent) {
      setSensorState((current) => (current === 'ready' ? 'refreshing' : 'loading'))
      setSensorMessage('Refreshing registered systems...')
    }

    try {
      const payload = await fetchSensors()

      startTransition(() => {
        setSensorData(payload)
        setSensorState('ready')
        setSensorMessage('Registered systems synced successfully.')
      })
    } catch (error) {
      setSensorState('error')
      setSensorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load registered systems.',
      )
    }
  })

  const refreshLeakReports = useEffectEvent(async ({ silent = false } = {}) => {
    if (!silent) {
      setLeakState((current) => (current === 'ready' ? 'refreshing' : 'loading'))
      setLeakMessage('Refreshing the live IoT leak feed...')
    }

    try {
      const payload = await fetchLeakReports()

      startTransition(() => {
        setLeakData(payload)
        setLeakState('ready')
        setLeakMessage('Leak telemetry synced successfully.')
      })
    } catch (error) {
      setLeakState('error')
      setLeakMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load leak telemetry.',
      )
    }
  })

  const refreshSiteContent = useEffectEvent(async ({ silent = false } = {}) => {
    if (!silent) {
      setSiteState((current) => (current === 'ready' ? 'refreshing' : 'loading'))
      setSiteMessage('Refreshing site content...')
    }

    try {
      const payload = await fetchSiteContent()

      startTransition(() => {
        setSiteContent({
          brand: payload.brand || defaultSiteContent.brand,
          pages: {
            ...defaultSiteContent.pages,
            ...(payload.pages || {}),
          },
          adminNote: payload.adminNote || defaultSiteContent.adminNote,
          media: payload.media || defaultSiteContent.media,
          highlights: {
            ...defaultSiteContent.highlights,
            ...(payload.highlights || {}),
          },
          sections: sanitizeSectionGroups(payload.sections),
        })
        setSiteState('ready')
        setSiteMessage('Site content synced successfully.')
      })
    } catch (error) {
      setSiteState('error')
      setSiteMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load site content.',
      )
    }
  })

  const refreshUsers = useEffectEvent(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      startTransition(() => {
        setUserDirectory([])
        setUserDirectoryState('idle')
        setUserDirectoryMessage('Sign in as an admin to manage accounts.')
      })
      return
    }

    if (!silent) {
      setUserDirectoryState((current) =>
        current === 'ready' ? 'refreshing' : 'loading',
      )
      setUserDirectoryMessage('Loading the account directory...')
    }

    try {
      const payload = await fetchUsers()

      startTransition(() => {
        setUserDirectory(payload.users)
        setUserDirectoryState('ready')
        setUserDirectoryMessage('Account directory synced successfully.')
      })
    } catch (error) {
      setUserDirectoryState('error')
      setUserDirectoryMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load the account directory.',
      )
    }
  })

  const refreshContactInbox = useEffectEvent(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      startTransition(() => {
        setContactInbox(emptyInboxData)
        setContactInboxState('idle')
        setContactInboxMessage('Sign in as an admin to review contact messages.')
      })
      return
    }

    if (!silent) {
      setContactInboxState((current) =>
        current === 'ready' ? 'refreshing' : 'loading',
      )
      setContactInboxMessage('Loading contact messages...')
    }

    try {
      const payload = await fetchContactMessages()

      startTransition(() => {
        setContactInbox(payload)
        setContactInboxState('ready')
        setContactInboxMessage('Contact inbox synced successfully.')
      })
    } catch (error) {
      setContactInboxState('error')
      setContactInboxMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load contact messages.',
      )
    }
  })

  const refreshDirectMessages = useEffectEvent(
    async ({ silent = false, participantId = selectedDirectParticipantId } = {}) => {
      if (!currentUser) {
        startTransition(() => {
          setDirectMessageData(emptyDirectMessageData)
          setDirectMessageState('idle')
          setDirectMessageMessage('Sign in to access direct messages.')
        })
        return
      }

      if (!silent) {
        setDirectMessageState((current) =>
          current === 'ready' ? 'refreshing' : 'loading',
        )
        setDirectMessageMessage('Loading direct messages...')
      }

      try {
        const payload = await fetchDirectMessages(participantId)

        startTransition(() => {
          setDirectMessageData(payload)
          setDirectMessageState('ready')
          setSelectedDirectParticipantId(
            payload.activeParticipant ? String(payload.activeParticipant.id) : '',
          )
          setDirectMessageMessage('Direct messages synced successfully.')
        })
      } catch (error) {
        setDirectMessageState('error')
        setDirectMessageMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load direct messages.',
        )
      }
    },
  )

  const refreshLiveSite = useEffectEvent(async ({ silent = false } = {}) => {
    const requests = [
      refreshSession({ silent }),
      refreshDashboard({ silent }),
      refreshTeamMembers({ silent }),
      refreshProducts({ silent }),
      refreshAnnouncements({ silent }),
      refreshSensors({ silent }),
      refreshLeakReports({ silent }),
      refreshSiteContent({ silent }),
    ]

    if (currentUser) {
      requests.push(refreshDirectMessages({ silent }))
    }

    if (isAdmin) {
      requests.push(refreshUsers({ silent }), refreshContactInbox({ silent }))
    }

    await Promise.allSettled(requests)
  })

  useEffect(() => {
    if (siteEditorDirty) {
      return
    }

    setSiteContentForm(createSiteContentForm(siteContent))
    setSiteHighlightsForm(createSiteHighlightsForm(siteContent))
    setSiteSectionsDraft(createSiteSectionsDraft(siteContent))
    setSiteMediaForm(createSiteMediaForm())
  }, [siteContent, siteEditorDirty])

  useEffect(() => {
    const normalizedRoute = normalizeRoute(stripAppBasePath(window.location.pathname))
    const targetUrl = buildAppUrl(normalizedRoute)

    if (targetUrl !== window.location.pathname) {
      window.history.replaceState({}, '', targetUrl)
    }

    setRoute(normalizedRoute)

    const handlePopState = () => {
      setRoute(normalizeRoute(stripAppBasePath(window.location.pathname)))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (route === '/login') {
      setAuthState('idle')
      setAuthMessage('Use your account to enter the workspace.')
    }

    if (route === '/signup') {
      setAuthState('idle')
      setAuthMessage('Create your account to enter the workspace.')
    }
  }, [route])

  useEffect(() => {
    if (currentUser && (route === '/login' || route === '/signup')) {
      navigate('/')
    }
  }, [currentUser, route])

  useEffect(() => {
    if (sessionState !== 'ready') {
      return
    }

    if (!currentUser && route === '/settings') {
      navigate('/login')
    }
  }, [currentUser, route, sessionState])

  useEffect(() => {
    refreshLiveSite()

    const liveRefreshIntervalId = window.setInterval(() => {
      refreshLiveSite({ silent: true })
    }, 30000)

    const handleWindowFocus = () => {
      refreshLiveSite({ silent: true })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLiveSite({ silent: true })
      }
    }

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(liveRefreshIntervalId)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClock(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const activeAdverts = announcementData.announcements.filter(
      (item) => item.kind === 'advert' && item.isActive,
    )

    if (activeAdverts.length <= 1) {
      setActiveAdvertIndex(0)
      return
    }

    const intervalId = window.setInterval(() => {
      setActiveAdvertIndex((current) => (current + 1) % activeAdverts.length)
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [announcementData])

  useEffect(() => {
    const activeBulletins = announcementData.announcements.filter(
      (item) => item.kind === 'announcement' && item.isActive,
    )

    if (activeBulletins.length <= 1) {
      setActiveBulletinIndex(0)
      return
    }

    const intervalId = window.setInterval(() => {
      setActiveBulletinIndex((current) => (current + 1) % activeBulletins.length)
    }, 4200)

    return () => window.clearInterval(intervalId)
  }, [announcementData])

  useEffect(() => {
    if (!isAdmin) {
      startTransition(() => {
        setUserDirectory([])
        setUserDirectoryState('idle')
        setUserDirectoryMessage('Sign in as an admin to manage accounts.')
        setContactInbox(emptyInboxData)
        setContactInboxState('idle')
        setContactInboxMessage('Sign in as an admin to review contact messages.')
      })
      return
    }

    refreshUsers()
    refreshContactInbox()
  }, [isAdmin])

  useEffect(() => {
    setContactForm((current) => {
      const nextFullName = current.fullName || currentUser?.fullName || ''
      const nextEmail = current.email || currentUser?.email || ''

      if (nextFullName === current.fullName && nextEmail === current.email) {
        return current
      }

      return {
        ...current,
        fullName: nextFullName,
        email: nextEmail,
      }
    })
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      return
    }

    setPasswordChangeForm(initialPasswordChangeForm)
    setPasswordChangeState('idle')
    setPasswordChangeMessage(
      'Use at least 8 characters, confirm the new password, and keep it different from your current password.',
    )
    setPasswordVisibility((current) => ({
      ...current,
      settingsCurrent: false,
      settingsNext: false,
      settingsConfirm: false,
    }))
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) {
      startTransition(() => {
        setDirectMessageData(emptyDirectMessageData)
        setDirectMessageState('idle')
        setDirectMessageMessage('Sign in to access direct messages.')
        setDirectMessageForm(initialDirectMessageForm)
        setSelectedDirectParticipantId('')
      })
      return
    }

    refreshDirectMessages()
  }, [currentUser])

  function openWorkspacePanel(panelId) {
    navigate('/')

    window.setTimeout(() => {
      document.getElementById(panelId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 80)
  }

  function openDirectConversation(participantId = '') {
    navigate('/')

    startTransition(() => {
      setSelectedDirectParticipantId(participantId ? String(participantId) : '')
    })

    window.setTimeout(async () => {
      document.getElementById('direct-messages-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })

      await refreshDirectMessages({
        participantId: participantId ? String(participantId) : '',
      })
    }, 80)
  }

  function resetSiteContentEditor() {
    setSiteContentForm(createSiteContentForm(siteContent))
    setSiteHighlightsForm(createSiteHighlightsForm(siteContent))
    setSiteSectionsDraft(createSiteSectionsDraft(siteContent))
    setSiteMediaForm(createSiteMediaForm())
    setSiteContentFormState('idle')
    setSiteContentFormMessage('Content editor reset to the latest live values.')
    setSiteEditorDirty(false)
  }

  function navigate(nextRoute) {
    const normalizedRoute = normalizeRoute(nextRoute)
    const targetUrl = buildAppUrl(normalizedRoute)

    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl)
    }

    setRoute(normalizedRoute)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function confirmPanelDeletion(label) {
    return window.confirm(
      `Delete ${label}? This will remove it from the website and workspace lists.`,
    )
  }

  const handleLoginChange = updateFormState(setLoginForm)
  const handleSignupChange = updateFormState(setSignupForm)
  const handlePasswordChangeInput = updateFormState(setPasswordChangeForm)
  const handleLaunchChange = updateFormState(setLaunchForm)
  const handleManagedUserChange = updateFormState(setManagedUserForm)
  const handleSensorChange = updateFormState(setSensorForm)
  const handleDirectMessageChange = updateFormState(setDirectMessageForm)
  const togglePasswordVisibility = useEffectEvent((key) => {
    setPasswordVisibility((current) => ({
      ...current,
      [key]: !current[key],
    }))
  })
  const handleContactFormChange = updateFormState(setContactForm)
  const handleLeakChange = updateFormState(setLeakForm)

  function handleTeamMemberChange(event) {
    const { name, value, files } = event.target

    if (name === 'photo') {
      const file = files?.[0] || null
      setTeamMemberForm((current) => ({
        ...current,
        photo: file,
        photoName: file ? file.name : '',
      }))
      return
    }

    setTeamMemberForm((current) => ({ ...current, [name]: value }))
  }

  function handleTeamPhotoUpdateChange(event) {
    const { name, value, files } = event.target

    if (name === 'memberId') {
      const selectedMember =
        teamData.teamMembers.find((member) => String(member.id) === value) || null

      setTeamPhotoUpdateForm((current) => ({
        ...current,
        memberId: value,
        fullName: selectedMember?.fullName || '',
        title: selectedMember?.title || 'Team Member',
        bio: selectedMember?.bio || '',
        displayOrder:
          selectedMember !== null ? String(selectedMember.displayOrder) : '',
        photo: null,
        photoName: '',
      }))
      return
    }

    if (name === 'photo') {
      const file = files?.[0] || null
      setTeamPhotoUpdateForm((current) => ({
        ...current,
        photo: file,
        photoName: file ? file.name : '',
      }))
      return
    }

    setTeamPhotoUpdateForm((current) => ({ ...current, [name]: value }))
  }

  function handleProductChange(event) {
    const { name, value, files } = event.target

    if (name === 'image') {
      const file = files?.[0] || null
      setProductForm((current) => ({
        ...current,
        image: file,
        imageName: file ? file.name : '',
      }))
      return
    }

    if (name === 'video') {
      const file = files?.[0] || null
      setProductForm((current) => ({
        ...current,
        video: file,
        videoName: file ? file.name : '',
      }))
      return
    }

    setProductForm((current) => ({ ...current, [name]: value }))
  }

  function handleAnnouncementChange(event) {
    const { name, value, files } = event.target

    if (name === 'image') {
      const file = files?.[0] || null
      setAnnouncementForm((current) => ({
        ...current,
        image: file,
        imageName: file ? file.name : '',
      }))
      return
    }

    if (name === 'video') {
      const file = files?.[0] || null
      setAnnouncementForm((current) => ({
        ...current,
        video: file,
        videoName: file ? file.name : '',
      }))
      return
    }

    setAnnouncementForm((current) => ({ ...current, [name]: value }))
  }

  function handleSiteContentFieldChange(event) {
    const { name, value } = event.target
    setSiteEditorDirty(true)
    setSiteContentForm((current) => ({ ...current, [name]: value }))
  }

  function handleSiteHighlightFieldChange(page, index, field, value) {
    setSiteEditorDirty(true)
    setSiteHighlightsForm((current) => ({
      ...current,
      [page]: (current[page] || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  function addSiteHighlight(page) {
    setSiteEditorDirty(true)
    setSiteHighlightsForm((current) => ({
      ...current,
      [page]: [
        ...(current[page] || []),
        {
          id: `${page}-highlight-new-${Date.now()}`,
          title: '',
          description: '',
          displayOrder: (current[page] || []).length + 1,
        },
      ],
    }))
  }

  function removeSiteHighlight(page, index) {
    setSiteEditorDirty(true)
    setSiteHighlightsForm((current) => ({
      ...current,
      [page]: (current[page] || []).filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  function handleSiteSectionsDraftChange(event) {
    setSiteEditorDirty(true)
    setSiteSectionsDraft(event.target.value)
  }

  function handleSiteMediaChange(event) {
    const { name, files, checked, type } = event.target
    setSiteEditorDirty(true)

    if (type === 'checkbox') {
      setSiteMediaForm((current) => ({
        ...current,
        [name]: checked,
      }))
      return
    }

    const file = files?.[0] || null
    setSiteMediaForm((current) => ({
      ...current,
      [name]: file,
      [`${name}Name`]: file ? file.name : '',
      [`clear${name[0].toUpperCase()}${name.slice(1)}`]: false,
    }))
  }

  function loadProductIntoForm(product) {
    setProductForm({
      id: String(product.id),
      name: product.name,
      summary: product.summary || '',
      description: product.description || '',
      image: null,
      imageName: '',
      video: null,
      videoName: '',
      displayOrder: String(product.displayOrder ?? ''),
    })
    setProductFormState('idle')
    setProductFormMessage(`${product.name} loaded into the product editor.`)
  }

  function loadManagedUserIntoForm(user) {
    setManagedUserForm({
      id: String(user.id),
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      password: '',
    })
    setManagedUserState('idle')
    setManagedUserMessage(
      `${user.username} loaded into the account editor. Leave the password blank if it should stay unchanged.`,
    )
  }

  function loadAnnouncementIntoForm(announcement) {
    setAnnouncementForm({
      id: String(announcement.id),
      kind: announcement.kind,
      title: announcement.title,
      message: announcement.message,
      image: null,
      imageName: '',
      video: null,
      videoName: '',
      ctaLabel: announcement.ctaLabel || '',
      ctaLink: announcement.ctaLink || '',
      displayOrder: String(announcement.displayOrder ?? ''),
      isActive: announcement.isActive,
    })
    setAnnouncementFormState('idle')
    setAnnouncementFormMessage(`${announcement.title} loaded into the notice editor.`)
  }

  function loadSensorIntoForm(sensor) {
    setSensorForm({
      id: String(sensor.id),
      sensorCode: sensor.sensorCode,
      displayName: sensor.displayName,
      location: sensor.location,
      description: sensor.description || '',
      isActive: sensor.isActive,
    })
    setSensorFormState('idle')
    setSensorFormMessage(`${sensor.displayName} loaded into the system editor.`)
  }

  function loadLeakIntoForm(leakReport) {
    setLeakForm({
      id: String(leakReport.id),
      sensorId: String(leakReport.sensorId || ''),
      leakageRate: extractLeakRateValue(leakReport.leakageRate),
      status: leakReport.status,
      observedAt: formatDateTimeLocalValue(leakReport.observedAt),
      displayOrder: String(leakReport.displayOrder ?? ''),
      isActive: leakReport.isActive,
    })
    setLeakFormState('idle')
    setLeakFormMessage(`${leakReport.sensorName} loaded into the telemetry editor.`)
  }

  async function handleLoginSubmit(event) {
    event.preventDefault()

    if (!loginForm.role) {
      setAuthState('error')
      setAuthMessage('Select the role you want to use for sign in.')
      return
    }

    setAuthState('submitting')
    setAuthMessage('Signing you in...')

    try {
      const response = await loginAccount(loginForm)

      startTransition(() => {
        setLoginForm(initialLoginForm)
        setPasswordVisibility(initialPasswordVisibility)
        setAuthState('success')
        setAuthMessage(response.message || 'Login successful.')
      })

      navigate('/')
      await refreshSession({ silent: true })
    } catch (error) {
      setAuthState('error')
      setAuthMessage(
        error instanceof Error ? error.message : 'Unable to sign in.',
      )
    }
  }

  async function handleSignupSubmit(event) {
    event.preventDefault()

    if (!signupForm.role) {
      setAuthState('error')
      setAuthMessage('Select the role you want to create.')
      return
    }

    const normalizedUsername = signupForm.username.trim()
    const normalizedEmail = signupForm.email.trim().toLowerCase()

    if (!isLikelyValidEmail(normalizedEmail)) {
      setAuthState('error')
      setAuthMessage('Enter a valid email address.')
      return
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setAuthState('error')
      setAuthMessage('Passwords do not match.')
      return
    }

    const signupPasswordError = validateManagedPassword(signupForm.password)
    if (signupPasswordError) {
      setAuthState('error')
      setAuthMessage(signupPasswordError)
      return
    }

    setAuthState('submitting')
    setAuthMessage('Checking account details...')

    try {
      const availability = await checkAccountAvailability({
        username: normalizedUsername,
        email: normalizedEmail,
      })

      if (!availability.username.available) {
        setAuthState('error')
        setAuthMessage(
          `The username "${normalizedUsername}" already exists. Use a different username.`,
        )
        return
      }

      if (!availability.email.available) {
        setAuthState('error')
        setAuthMessage(
          `The email "${normalizedEmail}" is already in use. Use a different email address.`,
        )
        return
      }

      setAuthMessage('Creating your account...')
      const response = await signupAccount(signupForm)

      startTransition(() => {
        setSignupForm(initialSignupForm)
        setPasswordVisibility(initialPasswordVisibility)
        setAuthState('success')
        setAuthMessage(response.message || 'Account created successfully.')
      })

      navigate('/')
      await refreshSession({ silent: true })
    } catch (error) {
      setAuthState('error')
      setAuthMessage(
        error instanceof Error ? error.message : 'Unable to create the account.',
      )
    }
  }

  async function handlePasswordChangeSubmit(event) {
    event.preventDefault()

    if (!currentUser) {
      setPasswordChangeState('error')
      setPasswordChangeMessage('Sign in first before changing your password.')
      return
    }

    if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) {
      setPasswordChangeState('error')
      setPasswordChangeMessage('The new password confirmation does not match.')
      return
    }

    if (
      passwordChangeForm.currentPassword &&
      passwordChangeForm.currentPassword === passwordChangeForm.newPassword
    ) {
      setPasswordChangeState('error')
      setPasswordChangeMessage(
        'Choose a password that is different from your current password.',
      )
      return
    }

    const newPasswordError = validateManagedPassword(passwordChangeForm.newPassword)
    if (newPasswordError) {
      setPasswordChangeState('error')
      setPasswordChangeMessage(newPasswordError)
      return
    }

    setPasswordChangeState('submitting')
    setPasswordChangeMessage('Updating your password...')

    try {
      const response = await changePassword(passwordChangeForm)

      startTransition(() => {
        setPasswordChangeForm(initialPasswordChangeForm)
        setPasswordChangeState('success')
        setPasswordChangeMessage(response.message || 'Password changed successfully.')
        setPasswordVisibility((current) => ({
          ...current,
          settingsCurrent: false,
          settingsNext: false,
          settingsConfirm: false,
        }))
      })

      await refreshSession({ silent: true })
    } catch (error) {
      setPasswordChangeState('error')
      setPasswordChangeMessage(
        error instanceof Error ? error.message : 'Unable to update the password.',
      )
    }
  }

  async function handleLogout() {
    setSessionState('refreshing')
    setSessionMessage('Signing out...')

    try {
      await logoutAccount()
      navigate('/')
      await refreshSession({ silent: true })
    } catch (error) {
      setSessionState('error')
      setSessionMessage(
        error instanceof Error ? error.message : 'Unable to sign out right now.',
      )
    }
  }

  async function handleLaunchSubmit(event) {
    event.preventDefault()

    setLaunchState('submitting')
    setLaunchMessage('Saving the launch request...')

    try {
      const response = await createLaunchRequest(launchForm)

      startTransition(() => {
        setLaunchForm(initialLaunchForm)
        setLaunchState('success')
        setLaunchMessage(response.message || 'Launch request saved.')
      })

      await refreshDashboard({ silent: true })
    } catch (error) {
      setLaunchState('error')
      setLaunchMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save the launch request.',
      )
    }
  }

  async function handleManagedUserSubmit(event) {
    event.preventDefault()

    const isEditing = Boolean(managedUserForm.id)
    const normalizedUsername = managedUserForm.username.trim().toLowerCase()
    const normalizedEmail = managedUserForm.email.trim().toLowerCase()
    const usernameTaken = userDirectory.some(
      (user) =>
        user.username.trim().toLowerCase() === normalizedUsername &&
        String(user.id) !== managedUserForm.id,
    )
    const emailTaken = userDirectory.some(
      (user) =>
        user.email.trim().toLowerCase() === normalizedEmail &&
        String(user.id) !== managedUserForm.id,
    )
    const roleLabel =
      managedUserForm.role === 'admin' ? 'System administrator' : 'User account'

    if (usernameTaken) {
      setManagedUserState('error')
      setManagedUserMessage(
        `The username "${managedUserForm.username.trim()}" already exists. Use a different username.`,
      )
      return
    }

    if (emailTaken) {
      setManagedUserState('error')
      setManagedUserMessage(
        `The email "${managedUserForm.email.trim()}" is already in use. Use a different email address.`,
      )
      return
    }

    if (!isLikelyValidEmail(normalizedEmail)) {
      setManagedUserState('error')
      setManagedUserMessage('Enter a valid email address.')
      return
    }

    if (!isEditing && !managedUserForm.password) {
      setManagedUserState('error')
      setManagedUserMessage('Enter a password before saving the account.')
      return
    }

    if (managedUserForm.password) {
      const managedPasswordError = validateManagedPassword(managedUserForm.password)
      if (managedPasswordError) {
        setManagedUserState('error')
        setManagedUserMessage(managedPasswordError)
        return
      }
    }

    setManagedUserState('submitting')
    setManagedUserMessage(
      isEditing ? 'Updating the account...' : 'Checking account details...',
    )

    try {
      if (!isEditing) {
        const availability = await checkAccountAvailability({
          username: normalizedUsername,
          email: normalizedEmail,
        })

        if (!availability.username.available) {
          setManagedUserState('error')
          setManagedUserMessage(
            `The username "${managedUserForm.username.trim()}" already exists. Use a different username.`,
          )
          return
        }

        if (!availability.email.available) {
          setManagedUserState('error')
          setManagedUserMessage(
            `The email "${managedUserForm.email.trim()}" is already in use. Use a different email address.`,
          )
          return
        }
      }

      const payload = {
        username: managedUserForm.username.trim(),
        fullName: managedUserForm.fullName.trim(),
        email: managedUserForm.email.trim(),
        role: managedUserForm.role,
        ...(managedUserForm.password ? { password: managedUserForm.password } : {}),
      }

      setManagedUserMessage(
        isEditing ? 'Saving account changes...' : `Creating the ${roleLabel.toLowerCase()}...`,
      )
      const response = isEditing
        ? await updateManagedUser(managedUserForm.id, payload)
        : await createManagedUser(payload)

      startTransition(() => {
        setManagedUserForm(initialManagedUserForm)
        setPasswordVisibility((current) => ({
          ...current,
          managed: false,
        }))
        setUserDirectory((current) => [
          response.user,
          ...current.filter((user) => user.id !== response.user.id),
        ])
        setManagedUserState('success')
        setManagedUserMessage(
          isEditing
            ? `Account updated for ${response.user.username}.`
            : `${roleLabel} created for ${response.user.username}.`,
        )
      })

      try {
        await refreshUsers({ silent: true })
      } catch {
        startTransition(() => {
          setManagedUserMessage(
            isEditing
              ? `Account updated for ${response.user.username}. The directory did not refresh automatically, but the changes were saved.`
              : `${roleLabel} created for ${response.user.username}. The directory did not refresh automatically, but the account was saved.`,
          )
        })
      }

      if (currentUser && String(currentUser.id) === String(response.user.id)) {
        try {
          await refreshSession({ silent: true })
        } catch {}
      }
    } catch (error) {
      setManagedUserState('error')
      setManagedUserMessage(
        error instanceof Error
          ? error.message
          : isEditing
            ? 'Unable to update the account.'
            : 'Unable to create the account.',
      )
    }
  }

  async function handleDeleteManagedUser(user) {
    if (!confirmPanelDeletion(`${user.username} account`)) {
      return
    }

    setManagedUserState('submitting')
    setManagedUserMessage(`Deleting ${user.username}...`)

    try {
      const response = await deleteManagedUser(user.id)

      startTransition(() => {
        if (managedUserForm.id === String(user.id)) {
          setManagedUserForm(initialManagedUserForm)
          setPasswordVisibility((current) => ({
            ...current,
            managed: false,
          }))
        }

        setUserDirectory((current) =>
          current.filter((directoryUser) => directoryUser.id !== user.id),
        )
        setManagedUserState('success')
        setManagedUserMessage(response.message || `${user.username} deleted successfully.`)
      })

      await refreshUsers({ silent: true })
    } catch (error) {
      setManagedUserState('error')
      setManagedUserMessage(
        error instanceof Error ? error.message : 'Unable to delete the account.',
      )
    }
  }

  async function handleDeleteSiteContent() {
    if (
      !window.confirm(
        'Delete the live site content? This will clear uploaded media, highlights, and custom sections, then restore the default site copy.',
      )
    ) {
      return
    }

    setSiteContentFormState('submitting')
    setSiteContentFormMessage('Resetting the live site content...')

    try {
      const response = await deleteSiteContent()

      startTransition(() => {
        const normalizedSiteContent = normalizeSiteContentSnapshot(response.siteContent)

        setSiteContent(normalizedSiteContent)
        setSiteContentForm(createSiteContentForm(normalizedSiteContent))
        setSiteHighlightsForm(createSiteHighlightsForm(normalizedSiteContent))
        setSiteSectionsDraft(createSiteSectionsDraft(normalizedSiteContent))
        setSiteMediaForm(createSiteMediaForm())
        setSiteContentFormState('success')
        setSiteContentFormMessage(
          response.message || 'Site content reset successfully.',
        )
        setSiteEditorDirty(false)
      })
    } catch (error) {
      setSiteContentFormState('error')
      setSiteContentFormMessage(
        error instanceof Error ? error.message : 'Unable to reset the site content.',
      )
    }
  }

  async function handleSiteContentSubmit(event) {
    event.preventDefault()

    let parsedSections
    let sanitizedHighlights

    try {
      parsedSections = JSON.parse(siteSectionsDraft)
    } catch {
      setSiteContentFormState('error')
      setSiteContentFormMessage('Sections JSON is invalid. Fix it before saving.')
      return
    }

    const sanitizedSections = sanitizeSectionGroups(parsedSections)

    try {
      sanitizedHighlights = prepareSiteHighlightsPayload(siteHighlightsForm)
    } catch (error) {
      setSiteContentFormState('error')
      setSiteContentFormMessage(
        error instanceof Error ? error.message : 'Site highlights are invalid.',
      )
      return
    }

    setSiteContentFormState('submitting')
    setSiteContentFormMessage('Saving the live site content...')

    try {
      const response = await saveSiteContent({
        brand_name: siteContentForm.brandName,
        brand_tagline: siteContentForm.brandTagline,
        home_eyebrow: siteContentForm.homeEyebrow,
        home_title: siteContentForm.homeTitle,
        home_description: siteContentForm.homeDescription,
        about_eyebrow: siteContentForm.aboutEyebrow,
        about_title: siteContentForm.aboutTitle,
        about_description: siteContentForm.aboutDescription,
        products_eyebrow: siteContentForm.productsEyebrow,
        products_description: siteContentForm.productsDescription,
        workspace_eyebrow: siteContentForm.workspaceEyebrow,
        workspace_description_admin: siteContentForm.workspaceDescriptionAdmin,
        workspace_description_user: siteContentForm.workspaceDescriptionUser,
        admin_note_title: siteContentForm.adminNoteTitle,
        admin_note_description: siteContentForm.adminNoteDescription,
        highlights: sanitizedHighlights,
        sections: sanitizedSections,
        loginBackgroundVideo: siteMediaForm.loginBackgroundVideo,
        clearLoginBackgroundVideo: siteMediaForm.clearLoginBackgroundVideo,
        loginBackgroundPrimary: siteMediaForm.loginBackgroundPrimary,
        clearLoginBackgroundPrimary: siteMediaForm.clearLoginBackgroundPrimary,
        loginBackgroundSecondary: siteMediaForm.loginBackgroundSecondary,
        clearLoginBackgroundSecondary: siteMediaForm.clearLoginBackgroundSecondary,
        workspaceBackgroundVideo: siteMediaForm.workspaceBackgroundVideo,
        clearWorkspaceBackgroundVideo: siteMediaForm.clearWorkspaceBackgroundVideo,
        workspaceBackgroundPrimary: siteMediaForm.workspaceBackgroundPrimary,
        clearWorkspaceBackgroundPrimary: siteMediaForm.clearWorkspaceBackgroundPrimary,
        workspaceBackgroundSecondary: siteMediaForm.workspaceBackgroundSecondary,
        clearWorkspaceBackgroundSecondary: siteMediaForm.clearWorkspaceBackgroundSecondary,
      })

      startTransition(() => {
        const normalizedSiteContent = normalizeSiteContentSnapshot(
          response.siteContent,
        )

        setSiteContent(normalizedSiteContent)
        setSiteContentForm(createSiteContentForm(normalizedSiteContent))
        setSiteHighlightsForm(createSiteHighlightsForm(normalizedSiteContent))
        setSiteSectionsDraft(createSiteSectionsDraft(normalizedSiteContent))
        setSiteMediaForm(createSiteMediaForm())
        setSiteContentFormState('success')
        setSiteContentFormMessage(
          response.message || 'Site content saved successfully.',
        )
        setSiteEditorDirty(false)
      })
    } catch (error) {
      setSiteContentFormState('error')
      setSiteContentFormMessage(
        error instanceof Error ? error.message : 'Unable to save the site content.',
      )
    }
  }

  async function handleSensorSubmit(event) {
    event.preventDefault()
    const isEditing = Boolean(sensorForm.id)

    setSensorFormState('submitting')
    setSensorFormMessage(
      isEditing ? 'Updating the system...' : 'Registering the system...',
    )

    try {
      const response = await createSensor(sensorForm)

      startTransition(() => {
        setSensorForm(initialSensorForm)
        setSensorFormState('success')
        setSensorFormMessage(
          isEditing
            ? `${response.sensor.displayName} was updated successfully.`
            : `${response.sensor.displayName} is now available for live leak telemetry.`,
        )
        setLeakForm((current) => ({
          ...current,
          sensorId: String(response.sensor.id),
        }))
      })

      await refreshSensors({ silent: true })
    } catch (error) {
      setSensorFormState('error')
      setSensorFormMessage(
        error instanceof Error
          ? error.message
          : isEditing
            ? 'Unable to update the system.'
            : 'Unable to register the system.',
      )
    }
  }

  async function handleTeamMemberSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget

    if (!teamMemberForm.photo) {
      setTeamMemberState('error')
      setTeamMemberMessage('Select a real profile photo before adding the team member.')
      return
    }

    setTeamMemberState('submitting')
    setTeamMemberMessage('Adding the team member...')

    try {
      const response = await createTeamMember(teamMemberForm)

      startTransition(() => {
        setTeamMemberForm(initialTeamMemberForm)
        setTeamMemberState('success')
        setTeamMemberMessage(
          `${response.teamMember.fullName} was added to the About Us page.`,
        )
      })
      formElement.reset()

      await refreshTeamMembers({ silent: true })
    } catch (error) {
      setTeamMemberState('error')
      setTeamMemberMessage(
        error instanceof Error
          ? error.message
          : 'Unable to add the team member.',
      )
    }
  }

  async function handleTeamPhotoUpdateSubmit(event) {
    event.preventDefault()

    if (!teamPhotoUpdateForm.memberId) {
      setTeamPhotoUpdateState('error')
      setTeamPhotoUpdateMessage('Select the team member you want to update first.')
      return
    }

    setTeamPhotoUpdateState('submitting')
    setTeamPhotoUpdateMessage('Saving the team member update...')

    try {
      const response = await updateTeamMember(
        teamPhotoUpdateForm.memberId,
        teamPhotoUpdateForm,
      )

      startTransition(() => {
        setTeamPhotoUpdateForm(initialTeamPhotoUpdateForm)
        setTeamPhotoUpdateState('success')
        setTeamPhotoUpdateMessage(
          `${response.teamMember.fullName} was updated successfully.`,
        )
      })

      await refreshTeamMembers({ silent: true })
    } catch (error) {
      setTeamPhotoUpdateState('error')
      setTeamPhotoUpdateMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update the team member photo.',
      )
    }
  }

  async function handleDeleteTeamMember(member) {
    if (!confirmPanelDeletion(member.fullName)) {
      return
    }

    setTeamState('refreshing')
    setTeamMessage(`Deleting ${member.fullName}...`)

    try {
      const response = await deleteTeamMember(member.id)

      startTransition(() => {
        setTeamMessage(response.message || `${member.fullName} deleted successfully.`)
        if (String(teamPhotoUpdateForm.memberId) === String(member.id)) {
          setTeamPhotoUpdateForm(initialTeamPhotoUpdateForm)
          setTeamPhotoUpdateState('idle')
          setTeamPhotoUpdateMessage('Select another team member to continue editing photos.')
        }
      })

      await refreshTeamMembers({ silent: true })
    } catch (error) {
      setTeamState('error')
      setTeamMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete the team member.',
      )
    }
  }

  async function handleContactSubmit(event) {
    event.preventDefault()

    setContactState('submitting')
    setContactMessage('Sending your inquiry...')

    try {
      const response = await createContactMessage(contactForm)

      startTransition(() => {
        setContactForm(createContactForm(currentUser))
        setContactState('success')
        setContactMessage(response.message || 'Inquiry sent successfully.')
      })

      if (isAdmin) {
        await refreshContactInbox({ silent: true })
      }
    } catch (error) {
      setContactState('error')
      setContactMessage(
        error instanceof Error
          ? error.message
          : 'Unable to send the inquiry.',
      )
    }
  }

  async function handleContactMessageReadToggle(messageItem) {
    setContactInboxState('refreshing')
    setContactInboxMessage(
      messageItem.isRead
        ? 'Marking the inquiry as unread...'
        : 'Marking the inquiry as read...',
    )

    try {
      const response = await updateContactMessageStatus(
        messageItem.id,
        !messageItem.isRead,
      )
      await refreshContactInbox({ silent: true })
      setContactInboxMessage(
        response.message || 'Contact message updated successfully.',
      )
    } catch (error) {
      setContactInboxState('error')
      setContactInboxMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update the contact message.',
      )
    }
  }

  async function handleDeleteContactMessage(messageItem) {
    if (!confirmPanelDeletion(`${messageItem.subject} inquiry`)) {
      return
    }

    setContactInboxState('refreshing')
    setContactInboxMessage(`Deleting ${messageItem.subject}...`)

    try {
      const response = await deleteContactMessage(messageItem.id)
      await refreshContactInbox({ silent: true })
      setContactInboxMessage(
        response.message || `${messageItem.subject} deleted successfully.`,
      )
    } catch (error) {
      setContactInboxState('error')
      setContactInboxMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete the contact message.',
      )
    }
  }

  async function handleLaunchRequestDelete(requestItem) {
    if (!confirmPanelDeletion(`${requestItem.organization} request`)) {
      return
    }

    setDashboardState('refreshing')
    setDashboardMessage(`Deleting ${requestItem.organization}...`)

    try {
      const response = await deleteLaunchRequest(requestItem.id)
      await refreshDashboard({ silent: true })
      setDashboardMessage(
        response.message || `${requestItem.organization} deleted successfully.`,
      )
    } catch (error) {
      setDashboardState('error')
      setDashboardMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete the launch request.',
      )
    }
  }

  async function handleDirectMessageSubmit(event) {
    event.preventDefault()

    const recipientId =
      selectedDirectParticipantId ||
      (directMessageData.activeParticipant
        ? String(directMessageData.activeParticipant.id)
        : '')

    if (!recipientId) {
      setDirectMessageState('error')
      setDirectMessageMessage('Select a conversation before sending a message.')
      return
    }

    if (!directMessageForm.body.trim()) {
      setDirectMessageState('error')
      setDirectMessageMessage('Write a message before sending it.')
      return
    }

    setDirectMessageState('refreshing')
    setDirectMessageMessage('Sending the message...')

    try {
      const response = await sendDirectMessage(recipientId, directMessageForm.body.trim())

      startTransition(() => {
        setDirectMessageForm(initialDirectMessageForm)
        setDirectMessageMessage(response.message || 'Message sent successfully.')
      })

      await refreshDirectMessages({
        silent: true,
        participantId: recipientId,
      })
    } catch (error) {
      setDirectMessageState('error')
      setDirectMessageMessage(
        error instanceof Error ? error.message : 'Unable to send the message.',
      )
    }
  }

  async function handleDirectMessageDelete(messageItem) {
    if (!confirmPanelDeletion('this direct message')) {
      return
    }

    setDirectMessageState('refreshing')
    setDirectMessageMessage('Deleting the message...')

    try {
      const response = await deleteDirectMessage(messageItem.id)
      await refreshDirectMessages({
        silent: true,
        participantId: selectedDirectParticipantId,
      })
      setDirectMessageMessage(response.message || 'Direct message deleted successfully.')
    } catch (error) {
      setDirectMessageState('error')
      setDirectMessageMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete the direct message.',
      )
    }
  }

  async function handleProductSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const isEditing = Boolean(productForm.id)

    if (
      !productForm.image &&
      !productForm.video &&
      !existingManagedProduct?.imageUrl &&
      !existingManagedProduct?.videoUrl
    ) {
      setProductFormState('error')
      setProductFormMessage('Upload a real product image or video so it can appear on the website.')
      return
    }

    setProductFormState('submitting')
    setProductFormMessage('Saving the product...')

    try {
      const response = await saveProduct(productForm)

      startTransition(() => {
        setProductForm(initialProductForm)
        setProductFormState('success')
        setProductFormMessage(
          isEditing
            ? `${response.product.name} was updated on the product page.`
            : `${response.product.name} was saved to the product page.`,
        )
      })
      formElement.reset()

      await refreshProducts({ silent: true })
    } catch (error) {
      setProductFormState('error')
      setProductFormMessage(
        error instanceof Error ? error.message : 'Unable to save the product.',
      )
    }
  }

  async function handleDeleteProduct(product) {
    if (!confirmPanelDeletion(product.name)) {
      return
    }

    setProductFormState('submitting')
    setProductFormMessage(`Deleting ${product.name}...`)

    try {
      const response = await deleteProduct(product.id)

      startTransition(() => {
        if (String(productForm.id) === String(product.id)) {
          setProductForm(initialProductForm)
        }
        setProductFormState('success')
        setProductFormMessage(response.message || `${product.name} deleted successfully.`)
      })

      await refreshProducts({ silent: true })
    } catch (error) {
      setProductFormState('error')
      setProductFormMessage(
        error instanceof Error ? error.message : 'Unable to delete the product.',
      )
    }
  }

  async function handleAnnouncementSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const isEditing = Boolean(announcementForm.id)
    const currentAnnouncement = announcementData.announcements.find(
      (item) => String(item.id) === String(announcementForm.id),
    )

    if (
      !announcementForm.image &&
      !announcementForm.video &&
      !currentAnnouncement?.imageUrl &&
      !currentAnnouncement?.videoUrl
    ) {
      setAnnouncementFormState('error')
      setAnnouncementFormMessage('Upload a real image or video before publishing to the website.')
      return
    }

    setAnnouncementFormState('submitting')
    setAnnouncementFormMessage(
      isEditing ? 'Updating the announcement...' : 'Publishing the announcement...',
    )

    try {
      const response = await createAnnouncement(announcementForm)

      startTransition(() => {
        setAnnouncementForm(initialAnnouncementForm)
        setAnnouncementFormState('success')
        setAnnouncementFormMessage(
          isEditing
            ? `${response.announcement.title} was updated successfully.`
            : `${response.announcement.title} is now live on the website.`,
        )
      })
      formElement.reset()

      await refreshAnnouncements({ silent: true })
    } catch (error) {
      setAnnouncementFormState('error')
      setAnnouncementFormMessage(
        error instanceof Error
          ? error.message
          : isEditing
            ? 'Unable to update the announcement.'
            : 'Unable to publish the announcement.',
      )
    }
  }

  async function handleDeleteAnnouncement(item) {
    if (!confirmPanelDeletion(item.title)) {
      return
    }

    setAnnouncementFormState('submitting')
    setAnnouncementFormMessage(`Deleting ${item.title}...`)

    try {
      const response = await deleteAnnouncement(item.id)

      startTransition(() => {
        if (String(announcementForm.id) === String(item.id)) {
          setAnnouncementForm(initialAnnouncementForm)
        }
        setAnnouncementFormState('success')
        setAnnouncementFormMessage(response.message || `${item.title} deleted successfully.`)
      })

      await refreshAnnouncements({ silent: true })
    } catch (error) {
      setAnnouncementFormState('error')
      setAnnouncementFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete the announcement.',
      )
    }
  }

  async function handleLeakSubmit(event) {
    event.preventDefault()
    const isEditing = Boolean(leakForm.id)

    if (!leakForm.sensorId) {
      setLeakFormState('error')
      setLeakFormMessage('Select a registered system before publishing telemetry.')
      return
    }

    setLeakFormState('submitting')
    setLeakFormMessage(
      isEditing ? 'Updating the leak signal...' : 'Publishing the leak signal...',
    )

    try {
      const response = await createLeakReport({
        ...leakForm,
        observedAt: leakForm.observedAt
          ? new Date(leakForm.observedAt).toISOString()
          : '',
      })

      startTransition(() => {
        setLeakForm(initialLeakForm)
        setLeakFormState('success')
        setLeakFormMessage(
          isEditing
            ? `${response.leakReport.sensorName} was updated in the IoT leak feed.`
            : `${response.leakReport.sensorName} is now visible in the IoT leak feed at ${response.leakReport.location}.`,
        )
      })

      await refreshLeakReports({ silent: true })
    } catch (error) {
      setLeakFormState('error')
      setLeakFormMessage(
        error instanceof Error
          ? error.message
          : isEditing
            ? 'Unable to update the leak signal.'
            : 'Unable to publish the leak signal.',
      )
    }
  }

  async function handleDeleteLeakReport(report) {
    if (!confirmPanelDeletion(`${report.sensorName} leak signal`)) {
      return
    }

    setLeakFormState('submitting')
    setLeakFormMessage(`Deleting ${report.sensorName}...`)

    try {
      const response = await deleteLeakReport(report.id)

      startTransition(() => {
        if (String(leakForm.id) === String(report.id)) {
          setLeakForm(initialLeakForm)
        }
        setLeakFormState('success')
        setLeakFormMessage(
          response.message || `${report.sensorName} deleted successfully.`,
        )
      })

      await refreshLeakReports({ silent: true })
    } catch (error) {
      setLeakFormState('error')
      setLeakFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete the leak signal.',
      )
    }
  }

  async function toggleAnnouncementActive(announcement) {
    setAnnouncementFormState('submitting')
    setAnnouncementFormMessage(
      announcement.isActive ? 'Pausing the announcement...' : 'Reactivating the announcement...',
    )

    try {
      const response = await createAnnouncement({
        id: announcement.id,
        kind: announcement.kind,
        title: announcement.title,
        message: announcement.message,
        ctaLabel: announcement.ctaLabel || '',
        ctaLink: announcement.ctaLink || '',
        displayOrder: String(announcement.displayOrder ?? ''),
        isActive: !announcement.isActive,
        image: null,
        video: null,
      })

      setAnnouncementFormState('success')
      setAnnouncementFormMessage(
        response.message || 'Announcement updated successfully.',
      )
      await refreshAnnouncements({ silent: true })
    } catch (error) {
      setAnnouncementFormState('error')
      setAnnouncementFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update the announcement.',
      )
    }
  }

  async function handleDeleteSensor(sensor) {
    if (!confirmPanelDeletion(sensor.displayName)) {
      return
    }

    setSensorFormState('submitting')
    setSensorFormMessage(`Deleting ${sensor.displayName}...`)

    try {
      const response = await deleteSensor(sensor.id)

      startTransition(() => {
        if (String(sensorForm.id) === String(sensor.id)) {
          setSensorForm(initialSensorForm)
        }
        if (String(leakForm.sensorId) === String(sensor.id)) {
          setLeakForm((current) => ({
            ...current,
            sensorId: '',
          }))
        }
        setSensorFormState('success')
        setSensorFormMessage(
          response.message || `${sensor.displayName} deleted successfully.`,
        )
      })

      await refreshSensors({ silent: true })
    } catch (error) {
      setSensorFormState('error')
      setSensorFormMessage(
        error instanceof Error ? error.message : 'Unable to delete the system.',
      )
    }
  }

  async function toggleSensorActive(sensor) {
    setSensorFormState('submitting')
    setSensorFormMessage(
      sensor.isActive ? 'Pausing the system...' : 'Reactivating the system...',
    )

    try {
      const response = await createSensor({
        id: sensor.id,
        sensorCode: sensor.sensorCode,
        displayName: sensor.displayName,
        location: sensor.location,
        description: sensor.description || '',
        isActive: !sensor.isActive,
      })

      setSensorFormState('success')
      setSensorFormMessage(response.message || 'System updated successfully.')
      await refreshSensors({ silent: true })
    } catch (error) {
      setSensorFormState('error')
      setSensorFormMessage(
        error instanceof Error ? error.message : 'Unable to update the system.',
      )
    }
  }

  async function toggleLeakActive(leakReport) {
    setLeakFormState('submitting')
    setLeakFormMessage(
      leakReport.isActive
        ? 'Archiving the leak signal...'
        : 'Reactivating the leak signal...',
    )

    try {
      const response = await createLeakReport({
        id: leakReport.id,
        sensorId: leakReport.sensorId,
        leakageRate: extractLeakRateValue(leakReport.leakageRate),
        status: leakReport.status,
        observedAt: leakReport.observedAt,
        displayOrder: String(leakReport.displayOrder ?? ''),
        isActive: !leakReport.isActive,
      })

      setLeakFormState('success')
      setLeakFormMessage(response.message || 'Leak signal updated successfully.')
      await refreshLeakReports({ silent: true })
    } catch (error) {
      setLeakFormState('error')
      setLeakFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update the leak signal.',
      )
    }
  }

  const leakFocusItems = leakData.leakReports.slice(0, 3)
  const visibleRequests =
    deferredFocusFilter === 'All focus areas'
      ? dashboard.recentRequests
      : dashboard.recentRequests.filter(
          (request) => request.focusArea === deferredFocusFilter,
        )
  const adminLaunchRequests =
    deferredFocusFilter === 'All focus areas'
      ? dashboard.requests || []
      : (dashboard.requests || []).filter(
          (request) => request.focusArea === deferredFocusFilter,
        )
  const directMessageContacts = directMessageData.contacts || []
  const activeDirectParticipant =
    directMessageData.activeParticipant ||
    directMessageContacts.find(
      (participant) => String(participant.id) === String(selectedDirectParticipantId),
    ) ||
    null
  const activeDirectMessages = directMessageData.messages || []
  const systemDirectMessages = directMessageData.systemMessages || []

  const homeMetrics = [
    {
      value: String(teamData.summary.totalMembers).padStart(2, '0'),
      label: 'Team members on the About Us page',
    },
    {
      value: String(dashboard.summary.totalRequests).padStart(2, '0'),
      label: 'Launch requests captured',
    },
    {
      value:
        dashboard.summary.latestRequestAt === null
          ? 'Quiet'
          : formatRelativeTime(dashboard.summary.latestRequestAt),
      label: 'Latest platform activity',
    },
  ]

  const aboutMetrics = [
    {
      value: String(teamData.summary.totalMembers).padStart(2, '0'),
      label: 'Visible team members',
    },
    {
      value: String(teamData.summary.supervisorCount).padStart(2, '0'),
      label: 'Supervisor roles in the roster',
    },
    {
      value: teamState === 'ready' ? 'Live' : 'Syncing',
      label: 'About page data status',
    },
  ]

  const featuredProduct = productData.products[0] || null
  const productMediaItems = productData.products.filter(
    (product) => product.imageUrl || product.videoUrl,
  )
  const existingManagedProduct =
    productData.products.find(
      (product) =>
        productForm.id
          ? String(product.id) === String(productForm.id)
          : product.name.trim().toLowerCase() === productForm.name.trim().toLowerCase(),
    ) || null
  const editingManagedUser =
    userDirectory.find((user) => String(user.id) === String(managedUserForm.id)) || null
  const editingAnnouncement =
    announcementData.announcements.find(
      (item) => String(item.id) === String(announcementForm.id),
    ) || null
  const editingSensor =
    sensorData.sensors.find((item) => String(item.id) === String(sensorForm.id)) || null
  const editingLeakReport =
    leakData.leakReports.find((item) => String(item.id) === String(leakForm.id)) || null
  const liveAnnouncements = announcementData.announcements.filter(
    (item) => item.isActive,
  )
  const advertItems = liveAnnouncements.filter((item) => item.kind === 'advert')
  const bulletinItems = liveAnnouncements.filter(
    (item) => item.kind === 'announcement',
  )
  const criticalLeakItems = leakData.leakReports.filter(
    (item) => item.isActive && item.status === 'critical',
  )

  const productMetrics = [
    {
      value: String(productData.summary.totalProducts).padStart(2, '0'),
      label: 'Products published',
    },
    {
      value: featuredProduct?.imageUrl || featuredProduct?.videoUrl ? 'Ready' : 'Awaiting upload',
      label: 'Lead product media status',
    },
    {
      value: String(teamData.summary.totalMembers).padStart(2, '0'),
      label: 'Team members supporting the platform',
    },
  ]

  const workspaceMetrics = [
    {
      value: currentUser ? formatStatusLabel(currentUser.role) : 'Guest',
      label: 'Current role in the workspace',
    },
    {
      value: String(leakData.summary.totalSignals).padStart(2, '0'),
      label: 'Leak signals synced',
    },
    {
      value: formatStatusLabel(leakData.summary.currentStatus),
      label: 'Current leak status',
    },
  ]
  const joinedAtLabel = currentUser?.dateJoined
    ? formatDateValue(currentUser.dateJoined)
    : 'Unknown'

  const selectedSensor =
    sensorData.sensors.find(
      (sensor) => String(sensor.id) === String(leakForm.sensorId),
    ) || null
  const activeSensors = sensorData.sensors.filter((sensor) => sensor.isActive)
  const latestLeakReport = leakData.leakReports[0] || null
  const leakStartedAt = leakData.summary.firstActiveObservedAt
  const latestLeakTimestamp =
    leakData.summary.latestObservedAt || latestLeakReport?.observedAt || null
  const publicLeakFacts = [
    {
      label: 'Location',
      value: latestLeakReport?.location || 'Awaiting telemetry',
    },
    {
      label: 'Last update',
      value: latestLeakTimestamp ? formatTimestamp(latestLeakTimestamp) : 'No telemetry yet',
    },
    {
      label: 'Leakage',
      value:
        leakData.summary.activeLeaks > 0 && latestLeakReport
          ? latestLeakReport.leakageRate
          : 'No leakage',
    },
  ]
  const leakOverviewMetrics = [
    {
      value: String(leakData.summary.totalSignals).padStart(2, '0'),
      label: 'Leak records',
      note: 'Live leak records are loaded from active records, not hardcoded in the page.',
    },
    {
      value: String(leakData.summary.activeLeaks).padStart(2, '0'),
      label: 'Number of leaks',
      note:
        leakData.summary.criticalLeaks > 0
          ? `${String(leakData.summary.criticalLeaks).padStart(2, '0')} critical leak alerts need attention.`
          : 'No critical leak alerts are active right now.',
    },
    {
      value: formatStatusLabel(leakData.summary.currentStatus),
      label: 'Leak status',
      note:
        leakData.summary.latestObservedAt === null
          ? 'The workspace will update this as soon as telemetry arrives.'
          : `Latest telemetry ${formatRelativeTime(leakData.summary.latestObservedAt)}.`,
    },
    {
      value: leakStartedAt ? formatClock(leakStartedAt) : 'No active leak',
      label: 'Leak started',
      note: leakStartedAt
        ? formatTimestamp(leakStartedAt)
        : 'The start time appears here when an active leak is published.',
    },
  ]

  const sessionBadge = {
    loading: 'Checking',
    refreshing: 'Refreshing',
    ready: 'Ready',
    error: 'Offline',
  }[sessionState]

  const dashboardBadge = {
    loading: 'Syncing',
    refreshing: 'Refreshing',
    ready: 'Live',
    error: 'Offline',
  }[dashboardState]

  const teamBadge = {
    loading: 'Loading',
    refreshing: 'Refreshing',
    ready: 'Live',
    error: 'Error',
  }[teamState]

  const productBadge = {
    loading: 'Loading',
    refreshing: 'Refreshing',
    ready: 'Live',
    error: 'Error',
  }[productState]

  const announcementBadge = {
    loading: 'Loading',
    refreshing: 'Refreshing',
    ready: 'Live',
    error: 'Error',
  }[announcementState]

  const sensorBadge = {
    loading: 'Loading',
    refreshing: 'Refreshing',
    ready: 'Live',
    error: 'Error',
  }[sensorState]

  const leakBadge = {
    loading: 'Loading',
    refreshing: 'Refreshing',
    ready: 'Live',
    error: 'Error',
  }[leakState]

  const siteContentFormBadge = {
    idle: siteEditorDirty ? 'Draft' : 'Ready',
    submitting: 'Saving',
    success: 'Saved',
    error: 'Error',
  }[siteContentFormState]

  const inboxBadge = {
    idle: 'Idle',
    loading: 'Loading',
    refreshing: 'Refreshing',
    ready: 'Live',
    error: 'Error',
  }[contactInboxState]
  const directMessageBadge = {
    idle: 'Idle',
    loading: 'Loading',
    refreshing: 'Refreshing',
    ready: 'Live',
    error: 'Error',
  }[directMessageState]
  const passwordChangeBadge = {
    idle: 'Ready',
    submitting: 'Updating',
    success: 'Updated',
    error: 'Review',
  }[passwordChangeState]
  const accountOverviewMetrics = [
    {
      value: currentUser ? formatStatusLabel(currentUser.role) : 'Guest',
      label: 'Access level',
    },
    {
      value: sessionBadge,
      label: 'Session health',
    },
    {
      value: isAdmin
        ? String(contactInbox.summary.unreadMessages).padStart(2, '0')
        : String(leakData.summary.activeLeaks).padStart(2, '0'),
      label: isAdmin ? 'Unread inbox messages' : 'Visible leak alerts',
    },
  ]
  const siteMediaEntries = [
    {
      key: 'loginBackgroundVideo',
      clearKey: 'clearLoginBackgroundVideo',
      label: 'Login and signup background video',
      accept: browserSupportedVideoAccept,
      currentUrl: siteContent.media?.loginBackgroundVideoUrl || '',
      type: 'video',
    },
    {
      key: 'loginBackgroundPrimary',
      clearKey: 'clearLoginBackgroundPrimary',
      label: 'Login and signup primary image',
      accept: 'image/*',
      currentUrl: siteContent.media?.loginBackgroundPrimaryUrl || '',
      type: 'image',
    },
    {
      key: 'loginBackgroundSecondary',
      clearKey: 'clearLoginBackgroundSecondary',
      label: 'Login and signup secondary image',
      accept: 'image/*',
      currentUrl: siteContent.media?.loginBackgroundSecondaryUrl || '',
      type: 'image',
    },
    {
      key: 'workspaceBackgroundVideo',
      clearKey: 'clearWorkspaceBackgroundVideo',
      label: 'Workspace and settings background video',
      accept: browserSupportedVideoAccept,
      currentUrl: siteContent.media?.workspaceBackgroundVideoUrl || '',
      type: 'video',
    },
    {
      key: 'workspaceBackgroundPrimary',
      clearKey: 'clearWorkspaceBackgroundPrimary',
      label: 'Workspace and settings primary image',
      accept: 'image/*',
      currentUrl: siteContent.media?.workspaceBackgroundPrimaryUrl || '',
      type: 'image',
    },
    {
      key: 'workspaceBackgroundSecondary',
      clearKey: 'clearWorkspaceBackgroundSecondary',
      label: 'Workspace and settings secondary image',
      accept: 'image/*',
      currentUrl: siteContent.media?.workspaceBackgroundSecondaryUrl || '',
      type: 'image',
    },
  ]

  const rawBrand = siteContent.brand || defaultSiteContent.brand
  const rawHomePage = siteContent.pages?.home || defaultSiteContent.pages.home
  const rawAboutPage = siteContent.pages?.about || defaultSiteContent.pages.about
  const rawProductsPage =
    siteContent.pages?.products || defaultSiteContent.pages.products
  const rawWorkspacePage =
    siteContent.pages?.workspace || defaultSiteContent.pages.workspace

  const brand = {
    ...rawBrand,
    tagline: refreshLegacyText(
      rawBrand.tagline,
      defaultSiteContent.brand.tagline,
      'Leak intelligence for pipes, taps, and water networks',
    ),
  }
  const homePage = {
    ...rawHomePage,
    eyebrow: refreshLegacyText(
      rawHomePage.eyebrow,
      defaultSiteContent.pages.home.eyebrow,
      'Pipe and tap monitoring',
    ),
    title: refreshLegacyText(
      rawHomePage.title,
      defaultSiteContent.pages.home.title,
      'Detect pipe and tap leakages early, respond faster, and protect every water line.',
    ),
    description: refreshLegacyText(
      rawHomePage.description,
      defaultSiteContent.pages.home.description,
      'Aqual Sentinel turns leak signals, field visuals, response priorities, and public communication into one live command surface for modern water operations.',
    ),
  }
  const aboutPage = {
    ...rawAboutPage,
    eyebrow: refreshLegacyText(
      rawAboutPage.eyebrow,
      defaultSiteContent.pages.about.eyebrow,
      'Response team',
    ),
    title: refreshLegacyText(
      rawAboutPage.title,
      defaultSiteContent.pages.about.title,
      'Meet the engineers, operators, and responders behind the leak intelligence network.',
    ),
    description: refreshLegacyText(
      rawAboutPage.description,
      defaultSiteContent.pages.about.description,
      'Meet the team coordinating monitoring, field verification, public communication, and response support across the water network.',
    ),
  }
  const productsPage = {
    ...rawProductsPage,
    eyebrow: refreshLegacyText(
      rawProductsPage.eyebrow,
      defaultSiteContent.pages.products.eyebrow,
      'Monitoring platform',
    ),
    description: refreshLegacyText(
      rawProductsPage.description,
      defaultSiteContent.pages.products.description,
      'Aqual Sentinel combines live telemetry, leak verification, response coordination, and polished public communication in one monitoring platform for water operations teams.',
    ),
  }
  const workspacePage = {
    ...rawWorkspacePage,
    eyebrow: refreshLegacyText(
      rawWorkspacePage.eyebrow,
      defaultSiteContent.pages.workspace.eyebrow,
      'Leak detection workspace',
    ),
    descriptionAdmin: refreshLegacyText(
      rawWorkspacePage.descriptionAdmin,
      defaultSiteContent.pages.workspace.descriptionAdmin,
      'You are signed in as an admin. Monitor leak telemetry, publish updates, register systems, and coordinate response activity from one workspace.',
    ),
    descriptionUser: refreshLegacyText(
      rawWorkspacePage.descriptionUser,
      defaultSiteContent.pages.workspace.descriptionUser,
      'You are signed in as a user. Monitor live leak telemetry, review public updates, and follow the current operating picture from one workspace.',
    ),
  }

  const homeSections =
    siteContent.sections?.home?.length
      ? siteContent.sections.home
      : defaultSiteContent.sections.home
  const aboutSections =
    siteContent.sections?.about?.length
      ? siteContent.sections.about
      : defaultSiteContent.sections.about
  const productSections =
    siteContent.sections?.products?.length
      ? siteContent.sections.products
      : defaultSiteContent.sections.products
  const workspaceSections =
    siteContent.sections?.workspace?.length
      ? siteContent.sections.workspace
      : defaultSiteContent.sections.workspace

  const previewTeamMembers = teamData.teamMembers.slice(0, 3)
  const photoReadyCount = teamData.teamMembers.filter((member) => member.photoUrl).length
  const mediaBackedProductCount = productMediaItems.length
  const curatedVisuals = [
    {
      id: 'stock-tile-scene',
      imageUrl: stockMedia.tiledWallLeakImage,
      videoUrl: '',
      title: 'Tiled wall surface leak',
      caption: 'Surface leak',
    },
    {
      id: 'stock-pipe-scene',
      imageUrl: stockMedia.pipeLeakImage,
      videoUrl: '',
      title: 'Pipe leak in the field',
      caption: 'Pipeline leak',
    },
    {
      id: 'stock-drain-scene',
      imageUrl: stockMedia.brickDrainLeakImage,
      videoUrl: '',
      title: 'Drainpipe leaking down a wall',
      caption: 'Infrastructure leak',
    },
    {
      id: 'stock-tap-scene',
      imageUrl: stockMedia.leakingTapImage,
      videoUrl: '',
      title: 'Dripping brass tap close-up',
      caption: 'Tap leak',
    },
    {
      id: 'stock-valve-scene',
      imageUrl: stockMedia.yellowValveImage,
      videoUrl: '',
      title: 'Aging water valve close-up',
      caption: 'Valve asset',
    },
  ]
  const floatingVisuals = [
    ...advertItems
      .filter((item) => item.imageUrl || item.videoUrl)
      .slice(0, 3)
      .map((item) => ({
        id: `advert-${item.id}`,
        imageUrl: item.imageUrl,
        videoUrl: item.videoUrl,
        title: item.title,
        caption: formatStatusLabel(item.kind),
      })),
    ...productMediaItems
      .slice(0, 2)
      .map((product) => ({
        id: `product-${product.id}`,
        imageUrl: product.imageUrl,
        videoUrl: product.videoUrl,
        title: product.name,
        caption: 'Product',
      })),
    ...teamData.teamMembers
      .filter((member) => member.photoUrl)
      .slice(0, 3)
      .map((member) => ({
        id: `team-${member.id}`,
        imageUrl: member.photoUrl,
        title: member.fullName,
        caption: member.title,
      })),
    ...curatedVisuals,
  ].slice(0, 6)
  const streamVisuals = floatingVisuals.length
    ? [...floatingVisuals, ...floatingVisuals]
    : []
  const latestPublicNotice = liveAnnouncements[0] || null
  const featuredMember =
    teamData.teamMembers.find((member) => member.photoUrl) ||
    teamData.teamMembers[0] ||
    null
  const latestContactMessage = isAdmin ? contactInbox.messages[0] || null : null
  const newsroomItems = [
    ...liveAnnouncements.map((item) => ({
      id: `announcement-${item.id}`,
      sectionLabel: item.kind === 'advert' ? 'Campaign spotlight' : 'Public notice',
      headline: item.title,
      summary:
        item.message ||
        'Administrators can publish homepage notices from the workspace.',
      imageUrl: item.imageUrl,
      videoUrl: item.videoUrl,
      timestamp: item.createdAt,
      meta:
        item.ctaLabel ||
        (item.kind === 'advert' ? 'Homepage campaign' : 'Live on the public site'),
      pillLabel: formatStatusLabel(item.kind),
      pillTone: item.kind,
    })),
    ...productData.products.map((product) => ({
      id: `product-${product.id}`,
      sectionLabel: 'Product desk',
      headline: product.name,
      summary:
        product.summary ||
        product.description ||
        'The product catalog is being published live.',
      imageUrl: product.imageUrl,
      videoUrl: product.videoUrl,
      timestamp: product.createdAt,
      meta: product.videoUrl
        ? 'Video-backed product card'
        : product.imageUrl
          ? 'Image-backed product card'
          : 'Catalog update',
      pillLabel: 'Product',
      pillTone: 'neutral',
    })),
    ...teamData.teamMembers.map((member) => ({
      id: `team-${member.id}`,
      sectionLabel: 'People desk',
      headline: member.fullName,
      summary:
        member.bio ||
        `${member.fullName} is currently visible on the About page as ${member.title}.`,
      imageUrl: member.photoUrl,
      videoUrl: '',
      timestamp: member.createdAt,
      meta: member.title,
      pillLabel: 'Team',
      pillTone: 'neutral',
    })),
    ...(canViewLeakStatus
      ? leakData.leakReports
          .filter((report) => report.isActive)
          .map((report) => ({
            id: `leak-${report.id}`,
            sectionLabel: 'Operations desk',
            headline: report.location,
            summary: `${report.leakageRate} recorded with ${formatStatusLabel(report.status).toLowerCase()} status.`,
            imageUrl: '',
            videoUrl: '',
            timestamp: report.observedAt || report.createdAt,
            meta: 'Live field signal',
            pillLabel: formatStatusLabel(report.status),
            pillTone: report.status,
          }))
      : []),
    {
      id: 'curated-pipe-burst',
      sectionLabel: 'Field scene',
      headline: 'Real pipe failure scenes now anchor the public story',
      summary:
        'Your selected leak photographs now replace the older stock imagery so the platform mission reads as more real and site-specific.',
      imageUrl: stockMedia.brickDrainLeakImage,
      videoUrl: stockMedia.pipeBurstVideo,
      timestamp: clock,
      meta: 'Curated background visual',
      pillLabel: 'Leak scene',
      pillTone: 'critical',
    },
    {
      id: 'curated-tap-monitoring',
      sectionLabel: 'Tap leakage',
      headline: 'Tap leakage visuals now support the conservation message',
      summary:
        'Close-up faucet and valve imagery now replace the earlier placeholders across the landing experience.',
      imageUrl: stockMedia.leakingTapImage,
      videoUrl: stockMedia.tapDripVideo,
      timestamp: clock,
      meta: 'Curated motion visual',
      pillLabel: 'Monitoring',
      pillTone: 'live',
    },
  ].sort((left, right) => getTimeValue(right.timestamp) - getTimeValue(left.timestamp))
  const newsroomSpotlightItems = newsroomItems.filter(
    (item) => item.imageUrl || item.videoUrl,
  )
  const rotatingSpotlightItems = newsroomSpotlightItems.length
    ? newsroomSpotlightItems
    : newsroomItems
  const leadStory =
    rotatingSpotlightItems.length > 0
      ? rotatingSpotlightItems[activeVisualIndex % rotatingSpotlightItems.length]
      : null
  const newsroomQueue = newsroomItems.length
    ? Array.from({ length: newsroomItems.length }).map(
        (_, index) => newsroomItems[(activeVisualIndex + index) % newsroomItems.length],
      )
    : []
  const supportingNewsroomItems = newsroomQueue
    .filter((item) => item.id !== leadStory?.id)
    .slice(0, 4)

  const homeVisualTitle = floatingVisuals.length
    ? `${String(floatingVisuals.length).padStart(2, '0')} live visuals are driving the landing page.`
    : 'The landing page is ready for its first live visual.'
  const homeVisualDescription = floatingVisuals.length
    ? `${pluralize(mediaBackedProductCount, 'product entry')}, ${pluralize(photoReadyCount, 'team portrait')}, and ${pluralize(liveAnnouncements.length, 'public notice')} are feeding the homepage directly from live content.`
    : 'Product media, team portraits, and public notices uploaded from the workspace will appear here automatically.'
  const homeSpotlightItem =
    leadStory ||
    (featuredProduct
      ? {
          imageUrl: featuredProduct.imageUrl,
          videoUrl: featuredProduct.videoUrl,
          headline: featuredProduct.name,
          timestamp: featuredProduct.createdAt,
          pillLabel: 'Product',
          pillTone: 'neutral',
        }
      : null) ||
    (featuredMember
      ? {
          imageUrl: featuredMember.photoUrl,
          videoUrl: '',
          headline: featuredMember.fullName,
          timestamp: featuredMember.createdAt,
          pillLabel: 'Team',
          pillTone: 'neutral',
        }
      : {
          imageUrl: stockMedia.tiledWallLeakImage,
          videoUrl: stockMedia.pipeBurstVideo,
          headline: 'Leak detection command view',
          timestamp: clock,
          pillLabel: 'Curated visual',
          pillTone: 'critical',
        })
  const homeJourneySteps = [
    {
      step: '01',
      title: 'Detect pressure drops and abnormal flow early',
      description: activeSensors.length
        ? `${pluralize(activeSensors.length, 'monitoring system')} are ready to surface leak activity across the network.`
        : 'Register monitoring systems to start streaming pipe and tap health into the live interface.',
    },
    {
      step: '02',
      title: 'Verify the exact location and latest leak rate',
      description: latestLeakReport
        ? `${latestLeakReport.location} is the latest published signal with ${latestLeakReport.leakageRate} recorded.`
        : 'As soon as telemetry is published, the interface highlights the location, timing, and severity automatically.',
    },
    {
      step: '03',
      title: 'Coordinate response teams and public updates',
      description: liveAnnouncements.length
        ? `${pluralize(liveAnnouncements.length, 'public update')} and ${pluralize(teamData.summary.totalMembers, 'team member')} are already supporting the outward response story.`
        : 'Use the same workspace to guide field response, publish notices, and keep the public informed.',
    },
  ]
  const homeSpotlightBadges = [
    {
      label: homeSpotlightItem?.pillLabel || 'Live visual',
      tone: homeSpotlightItem?.pillTone || 'live',
    },
    {
      label: homeSpotlightItem?.sectionLabel || 'Monitoring scene',
      tone: 'neutral',
    },
  ]
  const homeSpotlightStats = [
    {
      label: 'Systems',
      value: String(activeSensors.length).padStart(2, '0'),
    },
    {
      label: 'Active leaks',
      value: String(leakData.summary.activeLeaks).padStart(2, '0'),
    },
    {
      label: 'Public updates',
      value: String(liveAnnouncements.length).padStart(2, '0'),
    },
  ]
  const homeCommandHeadline = latestLeakReport
    ? `${latestLeakReport.location} is now visible as a live leak-response zone.`
    : 'See leak activity emerge before it becomes a service outage.'
  const homeCommandDescription = latestLeakReport
    ? `Telemetry from ${latestLeakReport.sensorName} is the latest verified signal. The homepage now layers motion media, live status, and response context around that operating picture.`
    : 'The redesigned landing page uses motion-backed visuals and a darker command-center style to make the mission clear at first glance: detect hidden losses, verify leak zones, and guide response teams fast.'
  const homeCommandStats = [
    {
      label: 'Monitoring systems',
      value: String(activeSensors.length).padStart(2, '0'),
      note: activeSensors.length
        ? 'registered across the network'
        : 'ready for first field connection',
    },
    {
      label: 'Active leak zones',
      value: String(leakData.summary.activeLeaks).padStart(2, '0'),
      note: latestLeakReport ? latestLeakReport.location : 'awaiting verified telemetry',
    },
    {
      label: 'Published updates',
      value: String(liveAnnouncements.length).padStart(2, '0'),
      note: liveAnnouncements.length
        ? 'now informing visitors in real time'
        : 'prepared for the first public notice',
    },
    {
      label: 'Visual scenes',
      value: String(floatingVisuals.length).padStart(2, '0'),
      note: 'powering this live homepage experience',
    },
  ]
  const homeSceneCards = [
    {
      id: 'scene-pipe-burst',
      eyebrow: 'Burst pipe scene',
      title: 'Pressure loss revealed in motion',
      description: latestLeakReport
        ? `${latestLeakReport.leakageRate} is the latest recorded leak rate and now sits inside a more visual monitoring story.`
        : 'Looping field footage now shows the urgency behind early pipe-leak detection before anyone reads the dashboard.',
      imageUrl: stockMedia.pipeLeakImage,
      videoUrl: stockMedia.pipeBurstVideo,
    },
    {
      id: 'scene-tap-drip',
      eyebrow: 'Tap leakage scene',
      title: 'Small leaks, visible water loss',
      description:
        'Close-up tap visuals reinforce the conservation side of the platform and show why persistent drips still need fast action.',
      imageUrl: stockMedia.leakingTapImage,
      videoUrl: stockMedia.tapDripVideo,
    },
    {
      id: 'scene-command-desk',
      eyebrow: homeSpotlightItem?.sectionLabel || 'Response desk',
      title: homeSpotlightItem?.headline || 'One command view for detection and response',
      description:
        homeSpotlightItem?.summary ||
        'Published media, leak telemetry, and response communication now share one coordinated landing experience.',
      imageUrl: homeSpotlightItem?.imageUrl || stockMedia.brickDrainLeakImage,
      videoUrl: homeSpotlightItem?.videoUrl || stockMedia.faucetCloseupVideo,
    },
  ]
  const homeMissionTitle = latestLeakReport
    ? `${latestLeakReport.location} is the latest verified leak zone.`
    : 'Follow the leak signal from detection to response.'
  const homeMissionDescription = latestLeakReport
    ? `The platform is already tracking ${latestLeakReport.sensorName} and showing the latest leak rate, timeline, and response status in one place.`
    : 'Use one interface to detect leakages in pipes and taps, verify field conditions, brief responders, and publish outward updates with confidence.'

  const homeSignalCardDefaults = [
    {
      key: 'launch_requests',
      eyebrow: 'Public launch',
      value: String(dashboard.summary.totalRequests).padStart(2, '0'),
      title: `${pluralize(dashboard.summary.totalRequests, 'launch request')} captured`,
      description: dashboard.summary.latestRequestAt
        ? `Latest demand signal arrived ${formatRelativeTime(dashboard.summary.latestRequestAt)}.`
        : 'The public launch form is live and waiting for the first request.',
      tone: 'sea',
    },
    {
      key: 'media_sync',
      eyebrow: 'Media sync',
      value: String(floatingVisuals.length).padStart(2, '0'),
      title: `${pluralize(floatingVisuals.length, 'homepage asset')} available`,
      description: floatingVisuals.length
        ? 'Announcements, products, and team profiles are already supplying visual content to the landing page.'
        : 'Upload an advert, product image, or team photo to activate the media wall.',
      tone: 'foam',
    },
    {
      key: 'field_telemetry',
      eyebrow: 'Field telemetry',
      value: String(leakData.summary.activeLeaks).padStart(2, '0'),
      title: leakData.summary.activeLeaks
        ? `${pluralize(leakData.summary.activeLeaks, 'active leak alert')} in the system`
        : 'No active leak alerts right now',
      description: latestLeakReport
        ? `${latestLeakReport.location} is the latest published field signal.`
        : 'Once telemetry is published, the public site starts reflecting the latest field status.',
      tone: 'sun',
    },
  ]

  const homeSignalCards = resolveSectionCards(
    homeSections,
    'home_signals',
    'all',
    homeSignalCardDefaults,
  )
  const guestHomeSignalCards = canViewLeakStatus
    ? homeSignalCards
    : homeSignalCards.map((card) =>
        card.key === 'field_telemetry'
          ? {
              ...card,
              value: 'Private',
              title: 'Sign in to view leak status',
              description:
                'Live location, time, and leakage updates are available in the authenticated workspace.',
            }
          : card,
      )

  const guestAccessCardDefaults = [
    {
      key: 'public_pages',
      eyebrow: 'Public pages',
      value: String(productData.summary.totalProducts).padStart(2, '0'),
      title: `${pluralize(productData.summary.totalProducts, 'product')} visible on the website`,
      description: `${pluralize(teamData.summary.totalMembers, 'team profile')} and the live About page are already connected to live content.`,
      tone: 'sea',
    },
    {
      key: 'operations',
      eyebrow: 'Operations',
      value: String(leakData.summary.totalSignals).padStart(2, '0'),
      title: `${pluralize(leakData.summary.totalSignals, 'telemetry signal')} stored`,
      description: activeSensors.length
        ? `${pluralize(activeSensors.length, 'registered system')} can already feed the public leak board.`
        : 'Register systems from the workspace to connect field data to the site.',
      tone: 'sand',
    },
    {
      key: 'publishing',
      eyebrow: 'Publishing',
      value: String(liveAnnouncements.length).padStart(2, '0'),
      title: `${pluralize(liveAnnouncements.length, 'live notice')} on the website`,
      description: latestPublicNotice
        ? `Latest publication: ${latestPublicNotice.title}.`
        : 'Announcements and adverts published from the workspace appear here immediately.',
      tone: 'foam',
    },
  ]

  const guestAccessCards = resolveSectionCards(
    homeSections,
    'guest_access',
    'guest',
    guestAccessCardDefaults,
  )
  const publicGuestAccessCards = guestAccessCards.map((card) =>
    card.key === 'operations'
      ? {
          ...card,
          value: 'Private',
          title: 'Leak telemetry is visible after sign in',
          description:
            'Guests can browse the site, but live leakage status is restricted to authenticated users.',
        }
      : card,
  )

  const aboutSignalSection = resolveSection(aboutSections, 'about_signals', 'all')
  const aboutSignalCardDefaults = [
    {
      key: 'roster',
      eyebrow: 'Roster',
      value: String(teamData.summary.totalMembers).padStart(2, '0'),
      title: `${pluralize(teamData.summary.totalMembers, 'team member')} published`,
      description: featuredMember
        ? `${featuredMember.fullName} is part of the current live roster as ${featuredMember.title}.`
        : 'The About page updates as soon as team records are saved.',
      tone: 'sea',
    },
    {
      key: 'portraits',
      eyebrow: 'Portraits',
      value: String(photoReadyCount).padStart(2, '0'),
      title: `${pluralize(photoReadyCount, 'profile photo')} ready for the public page`,
      description: photoReadyCount
        ? 'Uploaded portraits replace initials automatically across the live site.'
        : 'Upload portraits from the workspace to replace fallback initials on the team cards.',
      tone: 'foam',
    },
    {
      key: 'contact_intake',
      eyebrow: 'Contact intake',
      value: isAdmin
        ? String(contactInbox.summary.totalMessages).padStart(2, '0')
        : 'Live',
      title: isAdmin
        ? `${pluralize(contactInbox.summary.totalMessages, 'message')} stored in the inbox`
        : 'Contact submissions are stored',
      description: latestContactMessage
        ? `Latest message: "${latestContactMessage.subject}" from ${latestContactMessage.fullName}.`
        : 'Every public message is stored for review in the workspace inbox.',
      tone: 'sun',
    },
  ]
  const aboutSignalCards = resolveSectionCards(
    aboutSections,
    'about_signals',
    'all',
    aboutSignalCardDefaults,
  )
  const aboutJourneySteps = [
    {
      step: '01',
      title: 'Show the response crew clearly',
      description: teamData.summary.totalMembers
        ? `${pluralize(teamData.summary.totalMembers, 'team member')} are currently visible on the public roster.`
        : 'Publish the first roster entry to introduce the monitoring and response team.',
    },
    {
      step: '02',
      title: 'Lead with real portraits instead of placeholders',
      description: photoReadyCount
        ? `${pluralize(photoReadyCount, 'portrait')} already strengthen the team presence across the site.`
        : 'Upload profile photos so the About page feels human, trustworthy, and field-ready.',
    },
    {
      step: '03',
      title: 'Capture questions from the field and the public',
      description:
        isAdmin && contactInbox.summary.totalMessages
          ? `${pluralize(contactInbox.summary.totalMessages, 'message')} have already been stored for review in the workspace inbox.`
          : 'Public contact messages flow directly into the workspace inbox for follow-up.',
    },
  ]
  const aboutSpotlightItem = featuredMember
    ? {
        imageUrl: featuredMember.photoUrl,
        videoUrl: '',
        headline: featuredMember.fullName,
        timestamp: featuredMember.createdAt,
        pillLabel: featuredMember.title,
        pillTone: 'neutral',
      }
    : {
        imageUrl: stockMedia.yellowValveImage,
        videoUrl: stockMedia.tapDripVideo,
        headline: 'Human response starts with clear field visibility',
        timestamp: clock,
        pillLabel: 'Curated visual',
        pillTone: 'live',
      }
  const aboutSpotlightStats = [
    {
      label: 'Roster',
      value: String(teamData.summary.totalMembers).padStart(2, '0'),
    },
    {
      label: 'Portraits',
      value: String(photoReadyCount).padStart(2, '0'),
    },
    {
      label: 'Inbox',
      value: isAdmin
        ? String(contactInbox.summary.totalMessages).padStart(2, '0')
        : 'Live',
    },
  ]

  const aboutWorkflowSection = resolveSection(aboutSections, 'about_workflow', 'all')
  const aboutWorkflowItemDefaults = [
    {
      key: 'team_records',
      title: `${pluralize(teamData.summary.totalMembers, 'team record')} currently render on the public About page from live records.`,
      description: '',
    },
    {
      key: 'portrait_replacement',
      title: photoReadyCount
        ? `${pluralize(photoReadyCount, 'profile photo')} ${photoReadyCount === 1 ? 'is' : 'are'} already serving on the live site.`
        : 'The roster is live even before portraits are uploaded, and photos replace initials automatically once added.',
      description: '',
    },
    {
      key: 'shared_backend',
      title: latestPublicNotice
        ? `The same live content also powers public notices like "${latestPublicNotice.title}" and the rest of the website.`
        : 'The same live content also powers products, public notices, and the live workspace.',
      description: '',
    },
  ]
  const aboutWorkflowItems = resolveSectionCards(
    aboutSections,
    'about_workflow',
    'all',
    aboutWorkflowItemDefaults,
  )

  const productSignalSection = resolveSection(productSections, 'product_signals', 'all')
  const productSignalCardDefaults = [
    {
      key: 'catalog',
      eyebrow: 'Catalog',
      value: String(productData.summary.totalProducts).padStart(2, '0'),
      title: `${pluralize(productData.summary.totalProducts, 'product entry')} published live`,
      description: featuredProduct
        ? `${featuredProduct.name} currently leads the catalog${featuredProduct.videoUrl ? ' with video media.' : featuredProduct.imageUrl ? ' with image media.' : '.'}`
        : 'Publish the first product entry from the workspace to populate this page.',
      tone: 'sea',
    },
    {
      key: 'public_reach',
      eyebrow: 'Public reach',
      value: String(liveAnnouncements.length).padStart(2, '0'),
      title: `${pluralize(liveAnnouncements.length, 'announcement')} reinforcing the platform story`,
      description: latestPublicNotice
        ? `Latest public notice: ${latestPublicNotice.title}.`
        : 'Use announcements and adverts to keep the product story current without touching the page code.',
      tone: 'foam',
    },
    {
      key: 'operations_link',
      eyebrow: 'Operations link',
      value: String(activeSensors.length).padStart(2, '0'),
      title: `${pluralize(activeSensors.length, 'registered system')} connected to operations`,
      description: latestLeakReport
        ? `Latest leak signal is at ${latestLeakReport.location}.`
        : 'Once field systems start publishing, the platform story can be anchored in live operations data.',
      tone: 'sun',
    },
  ]
  const productSignalCards = resolveSectionCards(
    productSections,
    'product_signals',
    'all',
    productSignalCardDefaults,
  )
  const publicProductSignalCards = canViewLeakStatus
    ? productSignalCards
    : productSignalCards.map((card) =>
        card.key === 'operations_link'
          ? {
              ...card,
              value: 'Private',
              title: 'Sign in to view live leak status',
              description:
                'Operational leakage details are available inside the authenticated workspace.',
            }
          : card,
      )
  const productExperienceSteps = [
    {
      step: '01',
      title: 'Lead with rich visuals and demo-ready media',
      description: mediaBackedProductCount
        ? `${pluralize(mediaBackedProductCount, 'product entry')} already carries image or video media on the live site.`
        : 'Upload product images or short videos so the monitoring platform feels tangible at first glance.',
    },
    {
      step: '02',
      title: 'Tie every product view back to real telemetry',
      description: latestLeakReport
        ? `The latest field signal is coming from ${latestLeakReport.location}, making the story feel operational instead of abstract.`
        : 'As field systems publish alerts, the product experience starts to feel anchored in live operations.',
    },
    {
      step: '03',
      title: 'Keep the platform narrative current',
      description: latestPublicNotice
        ? `${latestPublicNotice.title} is already reinforcing the platform story on the public site.`
        : 'Use notices and campaigns to keep the leak-detection story fresh without redesigning the page.',
    },
  ]
  const productSpotlightItem = featuredProduct
    ? {
        imageUrl: featuredProduct.imageUrl,
        videoUrl: featuredProduct.videoUrl,
        headline: featuredProduct.name,
        timestamp: featuredProduct.createdAt,
        pillLabel: featuredProduct.videoUrl ? 'Video media' : 'Product media',
        pillTone: featuredProduct.videoUrl ? 'live' : 'neutral',
      }
    : {
        imageUrl: stockMedia.brickDrainLeakImage,
        videoUrl: stockMedia.pipeBurstVideo,
        headline: 'A platform built for leak visibility and response speed',
        timestamp: clock,
        pillLabel: 'Curated visual',
        pillTone: 'critical',
      }
  const productSpotlightStats = [
    {
      label: 'Catalog',
      value: String(productData.summary.totalProducts).padStart(2, '0'),
    },
    {
      label: 'Media ready',
      value: String(mediaBackedProductCount).padStart(2, '0'),
    },
    {
      label: 'Systems',
      value: String(activeSensors.length).padStart(2, '0'),
    },
  ]

  const productJourneySection = resolveSection(productSections, 'product_journey', 'all')
  const productJourneyItemDefaults = [
    {
      key: 'media_ready',
      title: `${pluralize(mediaBackedProductCount, 'product entry')} ${mediaBackedProductCount === 1 ? 'already has' : 'already have'} image or video media available to the site.`,
      description: '',
    },
    {
      key: 'team_support',
      title: `${pluralize(teamData.summary.totalMembers, 'team member')} ${teamData.summary.totalMembers === 1 ? 'is' : 'are'} currently supporting the public platform narrative.`,
      description: '',
    },
    {
      key: 'launch_requests',
      title: dashboard.summary.totalRequests
        ? `${pluralize(dashboard.summary.totalRequests, 'launch request')} ${dashboard.summary.totalRequests === 1 ? 'has' : 'have'} already been captured through the live site.`
        : 'Launch requests submitted from the public site will appear in the live dashboard immediately.',
      description: '',
    },
    {
      key: 'outward_update',
      title: latestPublicNotice
        ? `Latest outward-facing update: ${latestPublicNotice.title}.`
        : 'When admins publish notices, they appear here alongside the catalog.',
      description: '',
    },
  ]
  const productJourneyItems = resolveSectionCards(
    productSections,
    'product_journey',
    'all',
    productJourneyItemDefaults,
  )

  const latestRequest = dashboard.recentRequests[0] || null
  const leadingFocusArea =
    dashboard.summary.focusBreakdown
      ?.slice()
      .sort((left, right) => right.count - left.count)[0] || null
  const teamWithoutPhotosCount = teamData.teamMembers.filter(
    (member) => !member.photoUrl,
  ).length
  const productsWithoutMediaCount = productData.products.filter(
    (product) => !product.imageUrl && !product.videoUrl,
  ).length
  const visitorDayPart = getVisitorDayPart(clock)
  const workspaceGreeting = currentUser
    ? `Good ${visitorDayPart}, ${currentUser.fullName.split(' ')[0]}.`
    : ''
  const workspaceNarrative = isAdmin
    ? `${workspacePage.descriptionAdmin} ${contactInbox.summary.unreadMessages ? `${pluralize(contactInbox.summary.unreadMessages, 'unread message')} ${contactInbox.summary.unreadMessages === 1 ? 'is' : 'are'} waiting in the inbox.` : 'The inbox is currently clear.'}`
    : `${workspacePage.descriptionUser} ${latestLeakReport ? `Latest field signal: ${latestLeakReport.sensorName} at ${latestLeakReport.location}.` : 'The field telemetry board is waiting for the next published signal.'}`
  const workspaceSpotlightItem = latestPublicNotice
    ? {
        imageUrl: latestPublicNotice.imageUrl,
        videoUrl: latestPublicNotice.videoUrl,
        headline: latestPublicNotice.title,
        timestamp: latestPublicNotice.createdAt,
        pillLabel: formatStatusLabel(latestPublicNotice.kind),
        pillTone: latestPublicNotice.kind,
      }
    : {
        imageUrl: stockMedia.tiledWallLeakImage,
        videoUrl: stockMedia.faucetCloseupVideo,
        headline: 'The workspace stays aligned around live leak evidence',
        timestamp: clock,
        pillLabel: 'Curated visual',
        pillTone: 'live',
      }
  const workspaceCommandSteps = [
    {
      step: '01',
      title: 'Watch the latest leak signal',
      description: latestLeakReport
        ? `${latestLeakReport.sensorName} at ${latestLeakReport.location} is the newest alert on the board.`
        : 'The workspace is ready to surface the next verified leak signal.',
    },
    {
      step: '02',
      title: 'Track demand and public-facing updates',
      description: latestRequest
        ? `Latest interest came from ${latestRequest.organization}, and outward updates stay in sync with the same data.`
        : 'Demand, announcements, and telemetry are designed to stay in sync without page reloads.',
    },
    {
      step: '03',
      title: 'Coordinate teams, systems, and publishing',
      description: isAdmin
        ? 'Admins can manage system records, leak telemetry, notices, products, and team presence from the same workspace.'
        : 'Signed-in users can follow the operating picture while admins keep publishing and response activity moving.',
    },
  ]
  const workspaceSpotlightStats = [
    {
      label: 'Active leaks',
      value: String(leakData.summary.activeLeaks).padStart(2, '0'),
    },
    {
      label: isAdmin ? 'Unread inbox' : 'Inquiry line',
      value: isAdmin
        ? String(contactInbox.summary.unreadMessages).padStart(2, '0')
        : '01',
    },
    {
      label: 'Requests',
      value: String(dashboard.summary.totalRequests).padStart(2, '0'),
    },
  ]

  const adminVisitorCardDefaults = [
    {
      key: 'inbox',
      eyebrow: 'Inbox',
      value: String(contactInbox.summary.unreadMessages).padStart(2, '0'),
      title: contactInbox.summary.unreadMessages
        ? `${pluralize(contactInbox.summary.unreadMessages, 'unread message')} waiting for review`
        : 'Inbox is clear right now',
      description: latestContactMessage
        ? `Latest message is "${latestContactMessage.subject}" from ${latestContactMessage.fullName}.`
        : 'New visitor questions from the public site will appear here automatically.',
      tone: 'sun',
    },
    {
      key: 'publishing_gaps',
      eyebrow: 'Publishing gaps',
      value: String(teamWithoutPhotosCount + productsWithoutMediaCount).padStart(2, '0'),
      title: `${pluralize(teamWithoutPhotosCount, 'team profile')} without portraits and ${pluralize(productsWithoutMediaCount, 'product')} without media`,
      description:
        teamWithoutPhotosCount || productsWithoutMediaCount
          ? 'The workspace is highlighting the next content gaps to close for public visitors.'
          : 'Team profiles and product entries currently have the media they need for the public site.',
      tone: 'foam',
    },
    {
      key: 'operations',
      eyebrow: 'Operations',
      value: String(leakData.summary.activeLeaks).padStart(2, '0'),
      title: leakData.summary.activeLeaks
        ? `${pluralize(leakData.summary.activeLeaks, 'active leak alert')} on the board`
        : 'No active leak alerts at the moment',
      description: latestLeakReport
        ? `${latestLeakReport.sensorName} is the latest signal coming from ${latestLeakReport.location}.`
        : 'When telemetry is published, this workspace updates without requiring a reload.',
      tone: 'sea',
    },
    {
      key: 'demand',
      eyebrow: 'Demand',
      value: String(dashboard.summary.totalRequests).padStart(2, '0'),
      title: leadingFocusArea?.count
        ? `${leadingFocusArea.focusArea} is the strongest current demand signal`
        : 'Demand trends will appear as launch requests arrive',
      description: latestRequest
        ? `Most recent request came from ${latestRequest.organization} ${formatRelativeTime(latestRequest.createdAt)}.`
        : 'The public launch form feeds straight into this dashboard.',
      tone: 'sand',
    },
  ]

  const userVisitorCardDefaults = [
    {
      key: 'field_view',
      eyebrow: 'Field view',
      value: String(leakData.summary.activeLeaks).padStart(2, '0'),
      title: leakData.summary.activeLeaks
        ? `${pluralize(leakData.summary.activeLeaks, 'active leak alert')} visible in your workspace`
        : 'No active leak alerts are visible right now',
      description: latestLeakReport
        ? `${latestLeakReport.sensorName} at ${latestLeakReport.location} is the latest published field signal.`
        : 'As soon as telemetry is published, this panel updates automatically for signed-in users.',
      tone: 'sea',
    },
    {
      key: 'public_site',
      eyebrow: 'Public site',
      value: String(liveAnnouncements.length).padStart(2, '0'),
      title: `${pluralize(liveAnnouncements.length, 'public update')} currently live`,
      description: latestPublicNotice
        ? `Visitors are currently seeing ${latestPublicNotice.title}.`
        : 'Announcements and adverts from administrators appear here as they are published.',
      tone: 'foam',
    },
    {
      key: 'support',
      eyebrow: 'Inquiries',
      value: 'Ready',
      title: 'Send questions straight to the admin inbox',
      description:
        'Use the inquiry form in this workspace whenever you need support, clarification, or a platform update.',
      tone: 'sand',
    },
  ]

  const workspaceVisitorCards = resolveSectionCards(
    workspaceSections,
    'visitor_cards',
    isAdmin ? 'admin' : 'user',
    isAdmin ? adminVisitorCardDefaults : userVisitorCardDefaults,
  )
  const settingsGreeting = currentUser
    ? `${currentUser.fullName.split(' ')[0]}, keep your account secure and ready.`
    : 'Manage your account'
  const settingsNarrative = isAdmin
    ? `Update your password here, confirm your role, and move back into inbox, content, and operations work without losing the current session. Joined ${joinedAtLabel}.`
    : `Update your password here, confirm your account details, and return to the live workspace with the same session intact. Joined ${joinedAtLabel}.`
  const settingsCommandSteps = [
    {
      step: '01',
      title: 'Confirm who is signed in',
      description: currentUser
        ? `You are signed in as @${currentUser.username} with ${formatStatusLabel(currentUser.role)} access.`
        : 'Your current session details appear here as soon as you sign in.',
    },
    {
      step: '02',
      title: 'Rotate your password safely',
      description:
        'Enter your current password, choose a new one with at least 8 characters, and confirm it before saving.',
    },
    {
      step: '03',
      title: 'Return to work without losing your session',
      description: isAdmin
        ? 'Password changes keep this admin session alive so you can move straight back into inbox and publishing work.'
        : 'Password changes keep this session active so you can return directly to telemetry and support workflows.',
    },
  ]
  const settingsSpotlightItem = latestPublicNotice
    ? {
        imageUrl: latestPublicNotice.imageUrl,
        videoUrl: latestPublicNotice.videoUrl,
        headline: latestPublicNotice.title,
        timestamp: latestPublicNotice.createdAt,
        pillLabel: 'Live system',
        pillTone: 'live',
      }
    : {
        imageUrl: stockMedia.yellowValveImage,
        videoUrl: stockMedia.faucetCloseupVideo,
        headline: 'Secure access keeps the leak workspace reliable',
        timestamp: clock,
        pillLabel: 'Secure session',
        pillTone: 'neutral',
      }
  const settingsSpotlightStats = [
    {
      label: 'Role',
      value: currentUser ? formatStatusLabel(currentUser.role) : 'Guest',
    },
    {
      label: 'Session',
      value: sessionBadge,
    },
    {
      label: isAdmin ? 'Inbox' : 'Alerts',
      value: isAdmin
        ? String(contactInbox.summary.unreadMessages).padStart(2, '0')
        : String(leakData.summary.activeLeaks).padStart(2, '0'),
    },
  ]
  const settingsSecurityCards = [
    {
      key: 'identity',
      eyebrow: 'Identity',
      value: currentUser ? `@${currentUser.username}` : 'Account',
      title: 'Your session identity is active right now',
      description: currentUser
        ? `Signed in as ${currentUser.fullName} with ${formatStatusLabel(currentUser.role)} access since ${joinedAtLabel}.`
        : 'Sign in to review your account details.',
      tone: 'sea',
    },
    {
      key: 'password',
      eyebrow: 'Password',
      value: passwordChangeState === 'success' ? 'Updated' : 'Ready',
      title: 'Change credentials from one place',
      description:
        'The settings form updates your password and keeps the current session authenticated so work is not interrupted.',
      tone: 'foam',
    },
    {
      key: isAdmin ? 'admin_scope' : 'support_flow',
      eyebrow: isAdmin ? 'Admin scope' : 'Support flow',
      value: isAdmin
        ? `${String(userDirectory.length).padStart(2, '0')} users`
        : `${String(leakData.summary.activeLeaks).padStart(2, '0')} alerts`,
      title: isAdmin
        ? 'Admin tools remain one step away'
        : 'Support and telemetry remain one step away',
      description: isAdmin
        ? 'After updating your password, jump straight back into account management, publishing, systems, and inbox review.'
        : 'After updating your password, return to live alerts or send an inquiry to the administrator without starting over.',
      tone: 'sand',
    },
  ]
  const homeDeskGroupDefaults = [
    {
      id: 'operations',
      sourceType: 'leak_reports',
      label: 'Operations',
      eyebrow: 'Field desk',
      title: 'Leak telemetry and system activity',
      description: latestLeakReport
        ? `${latestLeakReport.location} is the latest field update.`
        : 'Published leak reports start filling this desk as soon as telemetry is saved.',
      state: leakState,
      badge: leakBadge,
      items: canViewLeakStatus
        ? leakData.leakReports.map((report) => ({
            id: `desk-leak-${report.id}`,
            sectionLabel: formatStatusLabel(report.status),
            headline: report.location,
            summary: `${report.leakageRate} recorded ${formatRelativeTime(report.observedAt || report.createdAt)}.`,
            imageUrl: '',
            videoUrl: '',
            timestamp: report.observedAt || report.createdAt,
            meta: 'Leak telemetry',
            pillLabel: formatStatusLabel(report.status),
            pillTone: report.status,
          }))
        : [],
    },
    {
      id: 'notices',
      sourceType: 'announcements',
      label: 'Notices',
      eyebrow: 'Public desk',
      title: 'Announcements and visitor-facing notices',
      description: latestPublicNotice
        ? `${latestPublicNotice.title} is currently live for visitors on the public site.`
        : 'Announcements and adverts published from the workspace appear here automatically.',
      state: announcementState,
      badge: announcementBadge,
      items: liveAnnouncements.map((item) => ({
        id: `desk-announcement-${item.id}`,
        sectionLabel: formatStatusLabel(item.kind),
        headline: item.title,
        summary: item.message || 'Live notice published from the workspace.',
        imageUrl: item.imageUrl,
        videoUrl: item.videoUrl,
        timestamp: item.createdAt,
        meta: item.ctaLabel || 'Homepage notice',
        pillLabel: formatStatusLabel(item.kind),
        pillTone: item.kind,
      })),
    },
    {
      id: 'products',
      sourceType: 'products',
      label: 'Products',
      eyebrow: 'Catalog desk',
      title: 'Published product media and product summaries',
      description: featuredProduct
        ? `${featuredProduct.name} is currently leading the live product catalog.`
        : 'Products appear here as soon as they are published from the workspace.',
      state: productState,
      badge: productBadge,
      items: productData.products.map((product) => ({
        id: `desk-product-${product.id}`,
        sectionLabel: 'Product',
        headline: product.name,
        summary:
          product.summary ||
          product.description ||
          'The product catalog is pulling from published content.',
        imageUrl: product.imageUrl,
        videoUrl: product.videoUrl,
        timestamp: product.createdAt,
        meta: product.videoUrl ? 'Video product asset' : 'Catalog entry',
        pillLabel: 'Product',
        pillTone: 'neutral',
      })),
    },
    {
      id: 'team',
      sourceType: 'team_members',
      label: 'Team',
      eyebrow: 'People desk',
      title: 'About roster and visible team updates',
      description: featuredMember
        ? `${featuredMember.fullName} is currently featured in the live team roster.`
        : 'Team records published live appear here automatically.',
      state: teamState,
      badge: teamBadge,
      items: teamData.teamMembers.map((member) => ({
        id: `desk-team-${member.id}`,
        sectionLabel: member.title,
        headline: member.fullName,
        summary:
          member.bio ||
          `${member.fullName} is now visible on the About page.`,
        imageUrl: member.photoUrl,
        videoUrl: '',
        timestamp: member.createdAt,
        meta: 'About roster',
        pillLabel: 'Team',
        pillTone: 'neutral',
      })),
    },
  ].filter((desk) => desk.items.length)
  const homeDeskGroups = resolveFeedSections(homeSections, homeDeskGroupDefaults)
  const activeDesk =
    homeDeskGroups.length > 0
      ? homeDeskGroups[activeDeskIndex % homeDeskGroups.length]
      : null
  const activeDeskLead = activeDesk?.items[0] || null
  const activeDeskQueue = activeDesk?.items.slice(1, 5) || []

  useEffect(() => {
    if (productMediaItems.length <= 1) {
      setActiveProductRailIndex(0)
      return
    }

    setActiveProductRailIndex((current) => current % productMediaItems.length)

    const intervalId = window.setInterval(() => {
      setActiveProductRailIndex((current) => (current + 1) % productMediaItems.length)
    }, 3200)

    return () => window.clearInterval(intervalId)
  }, [productMediaItems.length])

  useEffect(() => {
    if (teamData.teamMembers.length <= 1) {
      setActiveTeamRailIndex(0)
      return
    }

    setActiveTeamRailIndex((current) => current % teamData.teamMembers.length)

    const intervalId = window.setInterval(() => {
      setActiveTeamRailIndex((current) => (current + 1) % teamData.teamMembers.length)
    }, 3600)

    return () => window.clearInterval(intervalId)
  }, [teamData.teamMembers.length])

  useEffect(() => {
    if (homeDeskGroups.length <= 1) {
      setActiveDeskIndex(0)
      return
    }

    setActiveDeskIndex((current) => current % homeDeskGroups.length)

    const intervalId = window.setInterval(() => {
      setActiveDeskIndex((current) => (current + 1) % homeDeskGroups.length)
    }, 6200)

    return () => window.clearInterval(intervalId)
  }, [homeDeskGroups.length])

  useEffect(() => {
    if (rotatingSpotlightItems.length <= 1) {
      setActiveVisualIndex(0)
      return
    }

    const intervalId = window.setInterval(() => {
      setActiveVisualIndex((current) => (current + 1) % rotatingSpotlightItems.length)
    }, 3400)

    return () => window.clearInterval(intervalId)
  }, [rotatingSpotlightItems.length])

  const isAuthRoute = route === '/login' || route === '/signup'
  const resolvedAuthMode = route === '/signup' ? 'signup' : 'login'
  const pageView = currentUser
    ? route === '/settings'
      ? 'settings'
      : 'workspace'
    : route === '/about'
      ? 'about'
      : route === '/products'
        ? 'products'
        : route === '/settings'
          ? 'settings'
          : isAuthRoute
            ? 'auth'
            : 'home'
  const topbarStatusLabel = currentUser
    ? route === '/settings'
      ? 'Account settings'
      : `${formatStatusLabel(currentUser.role)} session`
    : route === '/products'
      ? 'Platform showcase'
      : route === '/about'
        ? 'Response team'
        : route === '/signup'
          ? 'Create access'
          : route === '/login'
            ? 'Secure sign in'
            : 'Public experience'

  const authFormContent =
    resolvedAuthMode === 'login' ? (
      <form className="stack-form" onSubmit={handleLoginSubmit}>
        <div className="form-heading">
          <h2>Login</h2>
        </div>

        <label>
          Username
          <input
            name="username"
            value={loginForm.username}
            onChange={handleLoginChange}
            placeholder="Enter your username"
            required
          />
        </label>

        <PasswordField
          label="Password"
          name="password"
          value={loginForm.password}
          onChange={handleLoginChange}
          placeholder="Enter your password"
          visible={passwordVisibility.login}
          onToggle={() => togglePasswordVisibility('login')}
          required
        />

        <label>
          Sign-in role
          <select
            name="role"
            value={loginForm.role}
            onChange={handleLoginChange}
            required
          >
            <option value="" disabled>
              Select role
            </option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={authState === 'submitting' || !loginForm.role}
        >
          {authState === 'submitting' ? 'Signing in...' : 'Login'}
        </button>
      </form>
    ) : (
      <form className="stack-form" onSubmit={handleSignupSubmit}>
        <div className="form-heading">
          <h2>Sign up</h2>
        </div>

        <label>
          Full name
          <input
            name="fullName"
            value={signupForm.fullName}
            onChange={handleSignupChange}
            placeholder="Jane Nalubega"
            required
          />
        </label>

        <label>
          Username
          <input
            name="username"
            value={signupForm.username}
            onChange={handleSignupChange}
            placeholder="janeops"
            required
          />
        </label>

        <label>
          Email
          <input
            name="email"
            type="email"
            value={signupForm.email}
            onChange={handleSignupChange}
            placeholder="jane@example.com"
            required
          />
        </label>

        <PasswordField
          label="Password"
          name="password"
          value={signupForm.password}
          onChange={handleSignupChange}
          placeholder="Use a strong password"
          visible={passwordVisibility.signup}
          onToggle={() => togglePasswordVisibility('signup')}
          required
        />

        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          value={signupForm.confirmPassword}
          onChange={handleSignupChange}
          placeholder="Repeat the password"
          visible={passwordVisibility.signupConfirm}
          onToggle={() => togglePasswordVisibility('signupConfirm')}
          required
        />

        <label>
          Account role
          <select
            name="role"
            value={signupForm.role}
            onChange={handleSignupChange}
            required
          >
            <option value="" disabled>
              Select role
            </option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={authState === 'submitting' || !signupForm.role}
        >
          {authState === 'submitting' ? 'Creating...' : 'Create account'}
        </button>
      </form>
    )

  return (
    <div
      className={`page-shell${isAuthRoute ? ' is-auth-shell' : ''}`}
      data-view={pageView}
    >
      <AmbientMediaBackdrop
        route={route}
        currentUser={currentUser}
        siteMedia={siteContent.media || defaultSiteContent.media}
      />
      <div className="mesh mesh-one" />
      <div className="mesh mesh-two" />
      <div className="grain" />
      <div className="tide tide-top" />
      <div className="tide tide-bottom" />

      <header className="topbar" id="top">
        <div className="brand">
          <div className="brand-mark">AS</div>
          <div className="brand-text">
            <strong>{brand.name}</strong>
            <span>{brand.tagline}</span>
          </div>
          <span className="brand-status">{topbarStatusLabel}</span>
        </div>

        <div className="nav-cluster">
          <div className="nav-links">
            <RouteButton route={route} target="/" navigate={navigate}>
              {currentUser ? 'Workspace' : 'Home'}
            </RouteButton>
            <RouteButton route={route} target="/products" navigate={navigate}>
              Products
            </RouteButton>
            <RouteButton route={route} target="/about" navigate={navigate}>
              About Us
            </RouteButton>
            {currentUser ? (
              <RouteButton route={route} target="/settings" navigate={navigate}>
                Settings
              </RouteButton>
            ) : null}
          </div>

          {currentUser ? (
            <>
              <div className="profile-chip">
                <span>{currentUser.username}</span>
                <strong>{currentUser.role}</strong>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <div className="topbar-actions">
              <button
                type="button"
                className={`secondary-button topbar-auth-button${route === '/login' ? ' is-current' : ''}`}
                onClick={() => navigate('/login')}
              >
                Login
              </button>
              <button
                type="button"
                className={`secondary-button topbar-auth-button${route === '/signup' ? ' is-current' : ''}`}
                onClick={() => navigate('/signup')}
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </header>

      {route === '/about' ? (
        <main className="page-layout">
          <section className="hero-card">
            <p className="eyebrow">{aboutPage.eyebrow}</p>
            <h1>{aboutPage.title}</h1>
            <p className="hero-text">{aboutPage.description}</p>

            <div className="page-hero-band">
              <div className="journey-step-grid">
                {aboutJourneySteps.map((item) => (
                  <JourneyStepCard
                    key={item.step}
                    step={item.step}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </div>

              <SpotlightPanel
                item={aboutSpotlightItem}
                eyebrow="Team pulse"
                title={
                  featuredMember
                    ? `${featuredMember.fullName} is shaping the public response presence.`
                    : 'The roster updates directly from the live team directory.'
                }
                description={
                  featuredMember?.bio ||
                  'Team profiles, portraits, and contact activity all stay connected to live records so the About page feels current and trustworthy.'
                }
                badges={[
                  {
                    label: featuredMember?.title || 'Team story',
                    tone: 'neutral',
                  },
                  {
                    label: teamBadge,
                    tone: teamState === 'ready' ? 'live' : 'neutral',
                  },
                ]}
                stats={aboutSpotlightStats}
                theme="foam"
                compact
              />
            </div>

            <div className="metric-grid">
              {aboutMetrics.map((metric) => (
                <article key={metric.label} className="metric-card">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>

            <div className="system-strip">
              <div>
                <span className="strip-label">Team sync</span>
                <strong>{teamMessage}</strong>
              </div>
              <div>
                <span className="strip-label">Site copy</span>
                <strong>{siteMessage}</strong>
              </div>
              <div>
                <span className="strip-label">Kampala time</span>
                <strong>{formatClock(clock)}</strong>
              </div>
            </div>
          </section>

          <TeamPulseRail
            members={teamData.teamMembers}
            activeIndex={activeTeamRailIndex}
            eyebrow="Team gallery"
            title="Published team profiles"
            description={
              teamData.teamMembers.length
                ? `${pluralize(teamData.teamMembers.length, 'team profile')} ${teamData.teamMembers.length === 1 ? 'is' : 'are'} featured here.`
                : 'Add team members from the workspace to populate this gallery.'
            }
            state={teamState}
            badge={teamBadge}
            emptyMessage="No team members have been published yet. Add profiles from the workspace to populate this gallery."
          />

          <section className="panel-grid">
            <article className="panel-card panel-span">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Team directory</p>
                  <h2>Meet the {brand.name} team</h2>
                </div>
                <StatusBadge state={teamState} label={teamBadge} />
              </div>

              {teamData.teamMembers.length ? (
                <div className="team-grid">
                  {teamData.teamMembers.map((member) => (
                    <TeamCard key={member.id} member={member} brandName={brand.name} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  The team directory is empty right now.
                </div>
              )}
            </article>

            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Admin inquiries</p>
                  <h2>Send an inquiry to the admin team</h2>
                </div>
              </div>

              <form className="stack-form" onSubmit={handleContactSubmit}>
                <div className="dual-grid">
                  <label>
                    Full name
                    <input
                      name="fullName"
                      value={contactForm.fullName}
                      onChange={handleContactFormChange}
                      placeholder="Your name"
                      required
                    />
                  </label>

                  <label>
                    Email
                    <input
                      name="email"
                      type="email"
                      value={contactForm.email}
                      onChange={handleContactFormChange}
                      placeholder="you@example.com"
                      required
                    />
                  </label>
                </div>

                <label>
                  Subject
                  <input
                    name="subject"
                    value={contactForm.subject}
                    onChange={handleContactFormChange}
                    placeholder="How can we help?"
                    required
                  />
                </label>

                <label>
                  Inquiry
                  <textarea
                    name="message"
                    value={contactForm.message}
                    onChange={handleContactFormChange}
                    placeholder="Write your inquiry here"
                    rows="5"
                    required
                  />
                </label>

                <button type="submit" disabled={contactState === 'submitting'}>
                  {contactState === 'submitting' ? 'Sending inquiry...' : 'Send inquiry'}
                </button>
              </form>

              <p className={`form-message is-${contactState}`}>{contactMessage}</p>
            </article>

            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">
                    {aboutSignalSection?.eyebrow || 'Live structure'}
                  </p>
                  <h2>
                    {aboutSignalSection?.title || 'How the About page stays dynamic'}
                  </h2>
                </div>
              </div>

              <div className="signal-story-grid compact-grid">
                {aboutSignalCards.map((item) => (
                  <SignalStoryCard
                    key={item.key || item.eyebrow}
                    eyebrow={item.eyebrow}
                    value={item.value}
                    title={item.title}
                    description={item.description}
                    tone={item.tone}
                  />
                ))}
              </div>

              <ul className="checklist">
                {aboutWorkflowItems.map((item) => (
                  <li key={item.key || item.title}>
                    {item.title}
                    {item.description ? ` ${item.description}` : ''}
                  </li>
                ))}
              </ul>

              <div className="footer-note">
                <span>Current launch API: {launchRequestEndpoint}</span>
                <span>Storage: {launchRequestStore}</span>
              </div>

              <div className="action-cluster">
                {isAdmin ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openWorkspacePanel('contact-inbox-panel')}
                  >
                    Open inbox
                  </button>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate('/')}
                >
                  {currentUser ? 'Back to workspace' : 'Back to home'}
                </button>
              </div>
            </article>
          </section>
        </main>
      ) : route === '/products' ? (
        <main className="page-layout">
          <section className="hero-card">
            <p className="eyebrow">{productsPage.eyebrow}</p>
            <h1>{featuredProduct?.name || 'Aqua Sentinel system'}</h1>
            <p className="hero-text">{featuredProduct?.summary || productsPage.description}</p>

            <div className="page-hero-band">
              <div className="journey-step-grid">
                {productExperienceSteps.map((item) => (
                  <JourneyStepCard
                    key={item.step}
                    step={item.step}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </div>

              <SpotlightPanel
                item={productSpotlightItem}
                eyebrow="Platform spotlight"
                title={featuredProduct?.name || 'Aqua Sentinel monitoring platform'}
                description={
                  featuredProduct?.description ||
                  featuredProduct?.summary ||
                  'The product view now behaves like a polished monitoring showcase, using live media and current content instead of static placeholder copy.'
                }
                badges={[
                  {
                    label: featuredProduct?.videoUrl ? 'Video ready' : 'Image ready',
                    tone: featuredProduct?.videoUrl ? 'live' : 'neutral',
                  },
                  {
                    label: productBadge,
                    tone: productState === 'ready' ? 'live' : 'neutral',
                  },
                ]}
                stats={productSpotlightStats}
                theme="sun"
                compact
              />
            </div>

            <div className="metric-grid">
              {productMetrics.map((metric) => (
                <article key={metric.label} className="metric-card">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>

            <div className="system-strip">
              <div>
                <span className="strip-label">Product sync</span>
                <strong>{productMessage}</strong>
              </div>
              <div>
                <span className="strip-label">Site copy</span>
                <strong>{siteMessage}</strong>
              </div>
              <div>
                <span className="strip-label">Kampala time</span>
                <strong>{formatClock(clock)}</strong>
              </div>
            </div>
          </section>

          <ProductPulseRail
            products={productData.products}
            activeIndex={activeProductRailIndex}
            eyebrow="Platform visuals"
            title="Published platform visuals"
            description={
              productMediaItems.length
                ? `${pluralize(productMediaItems.length, 'platform visual')} ${productMediaItems.length === 1 ? 'is' : 'are'} featured here.`
                : 'Upload product images or videos from the workspace to populate this visual rail.'
            }
            state={productState}
            badge={productBadge}
            emptyMessage="No product media has been uploaded yet. Add a product image or video from the workspace to populate this visual rail."
          />

          <section className="panel-grid">
            <article className="panel-card panel-span">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Published products</p>
                  <h2>Live product catalog</h2>
                </div>
                <StatusBadge state={productState} label={productBadge} />
              </div>

              {productData.products.length ? (
                <div className="product-grid">
                  {productData.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  No products have been published yet.
                </div>
              )}
            </article>

            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">
                    {productSignalSection?.eyebrow || 'Platform network'}
                  </p>
                  <h2>
                    {productSignalSection?.title || 'How the catalog connects to live operations'}
                  </h2>
                </div>
              </div>

              <div className="signal-story-grid compact-grid">
                {publicProductSignalCards.map((item) => (
                  <SignalStoryCard
                    key={item.key || item.eyebrow}
                    eyebrow={item.eyebrow}
                    value={item.value}
                    title={item.title}
                    description={item.description}
                    tone={item.tone}
                  />
                ))}
              </div>
            </article>

            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">
                    {productJourneySection?.eyebrow || 'Publishing loop'}
                  </p>
                  <h2>
                    {productJourneySection?.title || 'What changes when new data arrives'}
                  </h2>
                </div>
              </div>

              <ul className="checklist">
                {productJourneyItems.map((item) => (
                  <li key={item.key || item.title}>
                    {item.title}
                    {item.description ? ` ${item.description}` : ''}
                  </li>
                ))}
              </ul>

              <div className="action-cluster">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate('/about')}
                >
                  Meet the team
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate('/')}
                >
                  {currentUser ? 'Open control workspace' : 'Back to home'}
                </button>
              </div>
            </article>
          </section>
        </main>
      ) : route === '/settings' ? (
        currentUser ? (
          <main className="page-layout settings-shell">
            <section className="hero-card settings-hero-card">
              <p className="eyebrow">Account settings</p>
              <h1>{settingsGreeting}</h1>
              <p className="hero-text">{settingsNarrative}</p>

              <div className="page-hero-band">
                <div className="journey-step-grid">
                  {settingsCommandSteps.map((item) => (
                    <JourneyStepCard
                      key={item.step}
                      step={item.step}
                      title={item.title}
                      description={item.description}
                    />
                  ))}
                </div>

                <SpotlightPanel
                  item={settingsSpotlightItem}
                  eyebrow="Security posture"
                  title="Protect access without breaking momentum"
                  description={
                    isAdmin
                      ? 'Admin access can stay productive and secure at the same time. Rotate the password here, then move straight back into publishing, response, and inbox work.'
                      : 'Keep this account secure, then return directly to the live monitoring workspace with the same active session.'
                  }
                  badges={[
                    {
                      label: passwordChangeBadge,
                      tone:
                        passwordChangeState === 'success'
                          ? 'live'
                          : passwordChangeState === 'error'
                            ? 'critical'
                            : 'neutral',
                    },
                    {
                      label: sessionBadge,
                      tone: sessionState === 'ready' ? 'live' : 'neutral',
                    },
                  ]}
                  stats={settingsSpotlightStats}
                  theme="foam"
                  compact
                />
              </div>

              <div className="metric-grid">
                {accountOverviewMetrics.map((metric) => (
                  <article key={metric.label} className="metric-card">
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </article>
                ))}
              </div>

              <div className="system-strip">
                <div>
                  <span className="strip-label">Account</span>
                  <strong>@{currentUser.username}</strong>
                </div>
                <div>
                  <span className="strip-label">Joined</span>
                  <strong>{joinedAtLabel}</strong>
                </div>
                <div>
                  <span className="strip-label">Kampala time</span>
                  <strong>{formatClock(clock)}</strong>
                </div>
              </div>
            </section>

            <section className="settings-grid">
              <article className="panel-card settings-form-card" id="password-settings-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Password</p>
                    <h2>Change your password</h2>
                  </div>
                  <StatusBadge
                    state={
                      passwordChangeState === 'submitting'
                        ? 'refreshing'
                        : passwordChangeState === 'success'
                          ? 'ready'
                          : passwordChangeState === 'error'
                            ? 'error'
                            : 'idle'
                    }
                    label={passwordChangeBadge}
                  />
                </div>

                <p className="muted-line">
                  Use your current password to confirm the change. The session stays active after the update.
                </p>

                <form className="stack-form" onSubmit={handlePasswordChangeSubmit}>
                  <PasswordField
                    label="Current password"
                    name="currentPassword"
                    value={passwordChangeForm.currentPassword}
                    onChange={handlePasswordChangeInput}
                    placeholder="Enter your current password"
                    visible={passwordVisibility.settingsCurrent}
                    onToggle={() => togglePasswordVisibility('settingsCurrent')}
                    required
                  />

                  <PasswordField
                    label="New password"
                    name="newPassword"
                    value={passwordChangeForm.newPassword}
                    onChange={handlePasswordChangeInput}
                    placeholder="Choose a stronger password"
                    visible={passwordVisibility.settingsNext}
                    onToggle={() => togglePasswordVisibility('settingsNext')}
                    required
                  />

                  <PasswordField
                    label="Confirm new password"
                    name="confirmPassword"
                    value={passwordChangeForm.confirmPassword}
                    onChange={handlePasswordChangeInput}
                    placeholder="Repeat the new password"
                    visible={passwordVisibility.settingsConfirm}
                    onToggle={() => togglePasswordVisibility('settingsConfirm')}
                    required
                  />

                  <div className="inline-note">
                    <span className="strip-label">Password guidance</span>
                    <strong>Use at least 8 characters and avoid reusing the current password.</strong>
                    <p>
                      Stronger passwords help protect workspace access, publishing rights, and the live monitoring picture.
                    </p>
                  </div>

                  <button type="submit" disabled={passwordChangeState === 'submitting'}>
                    {passwordChangeState === 'submitting'
                      ? 'Updating password...'
                      : 'Save new password'}
                  </button>
                </form>

                <p className={`form-message is-${passwordChangeState}`}>
                  {passwordChangeMessage}
                </p>
              </article>

              <article className="panel-card settings-summary-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Account overview</p>
                    <h2>Session and access details</h2>
                  </div>
                  <StatusBadge state={sessionState} label={sessionBadge} />
                </div>

                <div className="account-grid">
                  <div className="account-card">
                    <span className="strip-label">Full name</span>
                    <strong>{currentUser.fullName}</strong>
                  </div>
                  <div className="account-card">
                    <span className="strip-label">Username</span>
                    <strong>@{currentUser.username}</strong>
                  </div>
                  <div className="account-card">
                    <span className="strip-label">Email</span>
                    <strong>{currentUser.email}</strong>
                  </div>
                  <div className="account-card">
                    <span className="strip-label">Role</span>
                    <strong>{formatStatusLabel(currentUser.role)}</strong>
                  </div>
                </div>

                <div className="inline-note">
                  <span className="strip-label">Session note</span>
                  <strong>{sessionMessage}</strong>
                  <p>
                    Password updates use the same authenticated session, so you can continue working immediately after saving.
                  </p>
                </div>

                <div className="quick-link-grid">
                  <article className="quick-link-card">
                    <span className="strip-label">Workspace</span>
                    <strong>Return to live operations</strong>
                    <p>Go back to the main command surface with telemetry, demand, and notices.</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => navigate('/')}
                    >
                      Open workspace
                    </button>
                  </article>

                  <article className="quick-link-card">
                    <span className="strip-label">{isAdmin ? 'Admin tools' : 'Support'}</span>
                    <strong>
                      {isAdmin ? 'Jump straight into inbox and content work' : 'Jump straight into help and monitoring'}
                    </strong>
                    <p>
                      {isAdmin
                        ? 'Review inquiries, update content, and keep the public site synchronized.'
                        : 'Open the support form or go back to the live leak view without searching around.'}
                    </p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        openWorkspacePanel(isAdmin ? 'contact-inbox-panel' : 'inquiry-panel')
                      }
                    >
                      {isAdmin ? 'Open inbox' : 'Open support'}
                    </button>
                  </article>

                  <article className="quick-link-card">
                    <span className="strip-label">Public pages</span>
                    <strong>Preview the polished public experience</strong>
                    <p>Check the current product and team pages after updating your account security.</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => navigate('/products')}
                    >
                      View products
                    </button>
                  </article>

                  <article className="quick-link-card">
                    <span className="strip-label">Session control</span>
                    <strong>End the current session when needed</strong>
                    <p>Use sign out here if this device should no longer keep workspace access.</p>
                    <button
                      type="button"
                      className="secondary-button danger-button"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </article>
                </div>
              </article>
            </section>

            <section className="panel-card settings-signal-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Security guide</p>
                  <h2>What this settings area covers</h2>
                </div>
              </div>

              <div className="signal-story-grid">
                {settingsSecurityCards.map((item) => (
                  <SignalStoryCard
                    key={item.key}
                    eyebrow={item.eyebrow}
                    value={item.value}
                    title={item.title}
                    description={item.description}
                    tone={item.tone}
                  />
                ))}
              </div>

              <ul className="checklist security-tip-list">
                <li>Use a password that is unique to this account and not shared across other services.</li>
                <li>Rotate access after onboarding changes, device changes, or any time credentials might have been exposed.</li>
                <li>{isAdmin ? 'Admin accounts should review inbox and publishing access after updating credentials.' : 'Return to the workspace after updating credentials to confirm your monitoring and support workflow still looks right.'}</li>
              </ul>
            </section>
          </main>
        ) : (
          <main className="page-layout auth-only-layout">
            <section className="auth-card auth-only-card">
              <div className="form-heading">
                <h2>Sign in to open settings</h2>
              </div>
              <p className="muted-line">
                Settings are available after authentication so password changes stay tied to the active account.
              </p>
              <div className="action-cluster">
                <button
                  type="button"
                  className="secondary-button wide-button"
                  onClick={() => navigate('/login')}
                >
                  Open login
                </button>
                <button
                  type="button"
                  className="secondary-button wide-button"
                  onClick={() => navigate('/signup')}
                >
                  Create account
                </button>
              </div>
            </section>
          </main>
        )
      ) : currentUser ? (
        <main className="page-layout">
          <section className="hero-card">
            <p className="eyebrow">{workspacePage.eyebrow}</p>
            <h1>{workspaceGreeting}</h1>
            <p className="hero-text">{workspaceNarrative}</p>

            <div className="page-hero-band">
              <div className="journey-step-grid">
                {workspaceCommandSteps.map((item) => (
                  <JourneyStepCard
                    key={item.step}
                    step={item.step}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </div>

              <SpotlightPanel
                item={workspaceSpotlightItem}
                eyebrow="Operations spotlight"
                title={
                  latestLeakReport
                    ? `${latestLeakReport.location} is the latest monitored leak zone.`
                    : 'The workspace is ready for the next field alert.'
                }
                description={
                  latestLeakReport
                    ? `${latestLeakReport.leakageRate} is currently recorded from ${latestLeakReport.sensorName}, and the rest of the workspace stays synchronized around that field picture.`
                    : 'Telemetry, notices, requests, and team workflows are all designed to move together from one professional operations surface.'
                }
                badges={[
                  {
                    label: formatStatusLabel(leakData.summary.currentStatus),
                    tone: leakData.summary.currentStatus || 'neutral',
                  },
                  {
                    label: sessionBadge,
                    tone: sessionState === 'ready' ? 'live' : 'neutral',
                  },
                ]}
                stats={workspaceSpotlightStats}
                theme="sea"
                compact
              />
            </div>

            <div className="metric-grid">
              {workspaceMetrics.map((metric) => (
                <article key={metric.label} className="metric-card">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>

            <div className="system-strip">
              <div>
                <span className="strip-label">Session</span>
                <strong>{sessionMessage}</strong>
              </div>
              <div>
                <span className="strip-label">Launch sync</span>
                <strong>{dashboardMessage}</strong>
              </div>
              <div>
                <span className="strip-label">Site copy</span>
                <strong>{siteMessage}</strong>
              </div>
            </div>
          </section>

          <section className="panel-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Visitor-aware view</p>
                <h2>
                  {isAdmin
                    ? 'Admin priorities update automatically for your session'
                    : 'Your workspace adjusts as live information changes'}
                </h2>
              </div>
              <StatusBadge state={sessionState} label={sessionBadge} />
            </div>

            <div className="signal-story-grid">
              {workspaceVisitorCards.map((item) => (
                <SignalStoryCard
                  key={item.key || item.eyebrow}
                  eyebrow={item.eyebrow}
                  value={item.value}
                  title={item.title}
                  description={item.description}
                  tone={item.tone}
                />
              ))}
            </div>
          </section>

          <section className="panel-grid" id="inquiry-panel">
            {!isAdmin ? (
              <article className="panel-card panel-span">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Admin inquiry</p>
                    <h2>Send an inquiry to the administrator</h2>
                  </div>
                </div>

                <div className="inline-note">
                  <span className="strip-label">Inquiry route</span>
                  <strong>Your inquiry goes straight to the admin inbox for review.</strong>
                  <p>
                    Use this form for support, access requests, clarifications, or any
                    platform question that needs administrator follow-up.
                  </p>
                </div>

                <form className="stack-form" onSubmit={handleContactSubmit}>
                  <div className="dual-grid">
                    <label>
                      Full name
                      <input
                        name="fullName"
                        value={contactForm.fullName}
                        onChange={handleContactFormChange}
                        placeholder="Your name"
                        required
                      />
                    </label>

                    <label>
                      Email
                      <input
                        name="email"
                        type="email"
                        value={contactForm.email}
                        onChange={handleContactFormChange}
                        placeholder="you@example.com"
                        required
                      />
                    </label>
                  </div>

                  <label>
                    Subject
                    <input
                      name="subject"
                      value={contactForm.subject}
                      onChange={handleContactFormChange}
                      placeholder="What do you need help with?"
                      required
                    />
                  </label>

                  <label>
                    Inquiry
                    <textarea
                      name="message"
                      value={contactForm.message}
                      onChange={handleContactFormChange}
                      placeholder="Write your inquiry here"
                      rows="5"
                      required
                    />
                  </label>

                  <button type="submit" disabled={contactState === 'submitting'}>
                    {contactState === 'submitting' ? 'Sending inquiry...' : 'Send inquiry'}
                  </button>
                </form>

                <p className={`form-message is-${contactState}`}>{contactMessage}</p>
              </article>
            ) : (
              <article className="panel-card panel-span">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Inquiry inbox</p>
                    <h2>Review questions coming from the website and workspace</h2>
                  </div>
                  <StatusBadge state={contactInboxState} label={inboxBadge} />
                </div>

                <div className="inline-note">
                  <span className="strip-label">Inbox summary</span>
                  <strong>
                    {contactInbox.summary.totalMessages} total inquiries / {contactInbox.summary.unreadMessages} unread
                  </strong>
                </div>

                <p className="muted-line">
                  Inquiries from visitors and signed-in users arrive here for administrator follow-up.
                </p>

                <div className="action-cluster">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openWorkspacePanel('contact-inbox-panel')}
                  >
                    Open full inbox
                  </button>
                </div>
              </article>
            )}
          </section>

          <section className="panel-grid">
            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Request overview</p>
                  <h2>Live request and leak snapshot</h2>
                </div>
                <StatusBadge state={dashboardState} label={dashboardBadge} />
              </div>

              {leakFocusItems.length ? (
                <div className="leak-grid">
                  {leakFocusItems.map((leak) => (
                    <LeakCard key={leak.id} leakReport={leak} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">No live leak telemetry yet.</div>
              )}

              <div className="inline-note">
                <span className="strip-label">Leak intelligence</span>
                <strong>
                  {leakData.summary.activeLeaks
                    ? `${String(leakData.summary.activeLeaks).padStart(2, '0')} active leak alert(s)`
                    : 'Waiting for live leak telemetry'}
                </strong>
              </div>
            </article>

            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Request intake</p>
                  <h2>Submit an operations request</h2>
                </div>
              </div>

              <form className="stack-form" onSubmit={handleLaunchSubmit}>
                <div className="dual-grid">
                  <label>
                    Full name
                    <input
                      name="fullName"
                      value={launchForm.fullName}
                      onChange={handleLaunchChange}
                      placeholder="Jane Nalubega"
                      required
                    />
                  </label>

                  <label>
                    Organization
                    <input
                      name="organization"
                      value={launchForm.organization}
                      onChange={handleLaunchChange}
                      placeholder="Kampala Water Operations"
                      required
                    />
                  </label>
                </div>

                <div className="dual-grid">
                  <label>
                    Email
                    <input
                      name="email"
                      type="email"
                      value={launchForm.email}
                      onChange={handleLaunchChange}
                      placeholder="ops@example.com"
                      required
                    />
                  </label>

                  <label>
                    Focus area
                    <select
                      name="focusArea"
                      value={launchForm.focusArea}
                      onChange={handleLaunchChange}
                    >
                      {focusAreaOptions.map((focusArea) => (
                        <option key={focusArea} value={focusArea}>
                          {focusArea}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button type="submit" disabled={launchState === 'submitting'}>
                  {launchState === 'submitting'
                    ? 'Saving request...'
                    : 'Submit request'}
                </button>
              </form>

              <p className={`form-message is-${launchState}`}>{launchMessage}</p>
            </article>
          </section>

          <section className="panel-grid">
            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Recent activity</p>
                  <h2>{isAdmin ? 'Launch requests in the system' : 'Latest launch requests'}</h2>
                </div>

                <label className="compact-field">
                  Focus filter
                  <select
                    value={focusFilter}
                    onChange={(event) => setFocusFilter(event.target.value)}
                  >
                    <option value="All focus areas">All focus areas</option>
                    {focusAreaOptions.map((focusArea) => (
                      <option key={focusArea} value={focusArea}>
                        {focusArea}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {(isAdmin ? adminLaunchRequests : visibleRequests).length ? (
                <ul className="list-stack">
                  {(isAdmin ? adminLaunchRequests : visibleRequests).map((request) => (
                    <li key={request.id} className="list-card">
                      <div className="list-top">
                        <div>
                          <strong>{request.organization}</strong>
                          <p>{request.requester}</p>
                        </div>
                        <span className="pill">{request.focusArea}</span>
                      </div>
                      <div className="meta-row">
                        <span>{formatTimestamp(request.createdAt)}</span>
                        <span>{formatRelativeTime(request.createdAt)}</span>
                      </div>
                      {isAdmin ? (
                        <div className="action-cluster">
                          <button
                            type="button"
                            className="secondary-button danger-button"
                            onClick={() => handleLaunchRequestDelete(request)}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  No launch requests yet for this filter.
                </div>
              )}
            </article>

            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Account center</p>
                  <h2>Current session</h2>
                </div>
                <StatusBadge state={sessionState} label={sessionBadge} />
              </div>

              <div className="account-grid">
                <div className="account-card">
                  <span className="strip-label">Full name</span>
                  <strong>{currentUser.fullName}</strong>
                </div>
                <div className="account-card">
                  <span className="strip-label">Username</span>
                  <strong>{currentUser.username}</strong>
                </div>
                <div className="account-card">
                  <span className="strip-label">Email</span>
                  <strong>{currentUser.email}</strong>
                </div>
                <div className="account-card">
                  <span className="strip-label">Role</span>
                  <strong>{currentUser.role}</strong>
                </div>
              </div>

              <div className="footer-note">
                <span>API endpoint: {launchRequestEndpoint}</span>
                <span>Storage: {launchRequestStore}</span>
              </div>

              <div className="action-cluster">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate('/settings')}
                >
                  Open settings
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => openWorkspacePanel('inquiry-panel')}
                >
                  {isAdmin ? 'Open inquiries' : 'Open support form'}
                </button>
              </div>

              {isAdmin ? (
                <div className="inline-note">
                  <span className="strip-label">Frontend admin</span>
                  <strong>The full daily admin workflow now runs directly in this workspace.</strong>
                  <div className="dual-grid">
                    <button
                      type="button"
                      className="secondary-button wide-button"
                      onClick={() => openWorkspacePanel('site-content-panel')}
                    >
                      Open content studio
                    </button>
                    <button
                      type="button"
                      className="secondary-button wide-button"
                      onClick={() => openWorkspacePanel('inquiry-panel')}
                    >
                      Open inquiries
                    </button>
                  </div>
                  <div className="dual-grid">
                    <button
                      type="button"
                      className="secondary-button wide-button"
                      onClick={() => openWorkspacePanel('sensor-registry-panel')}
                    >
                      Open systems
                    </button>
                    <button
                      type="button"
                      className="secondary-button wide-button"
                      onClick={() => openWorkspacePanel('contact-inbox-panel')}
                    >
                      Open inbox
                    </button>
                  </div>
                  <div className="dual-grid">
                    <button
                      type="button"
                      className="secondary-button wide-button"
                      onClick={() => openWorkspacePanel('announcement-panel')}
                    >
                      Open announcements
                    </button>
                    <button
                      type="button"
                      className="secondary-button wide-button"
                      onClick={() => openWorkspacePanel('product-management-panel')}
                    >
                      Open products
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          </section>

          <section className="panel-grid">
            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Leak monitoring</p>
                  <h2>Live leakage status board</h2>
                </div>
                <StatusBadge state={leakState} label={leakBadge} />
              </div>

              <p className="muted-line">{leakMessage}</p>

              <div className="leak-overview-grid">
                {leakOverviewMetrics.map((metric) => (
                  <article key={metric.label} className="metric-card leak-overview-card">
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                    <p className="muted-line">{metric.note}</p>
                  </article>
                ))}
              </div>

              {leakData.leakReports.length ? (
                <div className="leak-grid">
                  {leakData.leakReports.map((leakReport) => (
                    <LeakCard key={leakReport.id} leakReport={leakReport} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">No leak telemetry available yet.</div>
              )}
            </article>

            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Public communications</p>
                  <h2>Live notices and awareness campaigns</h2>
                </div>
                <StatusBadge state={announcementState} label={announcementBadge} />
              </div>

              <p className="muted-line">{announcementMessage}</p>

              {liveAnnouncements.length ? (
                <div className="announcement-stack">
                  {liveAnnouncements.slice(0, 4).map((item) => (
                    <AnnouncementCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">No announcements published yet.</div>
              )}
            </article>
          </section>

          {isAdmin ? (
            <section className="panel-grid">
              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Admin console</p>
                    <h2>
                      {editingManagedUser ? 'Update account access' : 'Create managed account'}
                    </h2>
                  </div>
                </div>

                <form className="stack-form" onSubmit={handleManagedUserSubmit}>
                  <div className="dual-grid">
                    <label>
                      Full name
                      <input
                        name="fullName"
                        value={managedUserForm.fullName}
                        onChange={handleManagedUserChange}
                        placeholder="Operator One"
                        required
                      />
                    </label>

                    <label>
                      Username
                      <input
                        name="username"
                        value={managedUserForm.username}
                        onChange={handleManagedUserChange}
                        placeholder="operator1"
                        required
                      />
                    </label>
                  </div>

                  <div className="dual-grid">
                    <label>
                      Email
                      <input
                        name="email"
                        type="email"
                        value={managedUserForm.email}
                        onChange={handleManagedUserChange}
                        placeholder="operator@example.com"
                        required
                      />
                    </label>

                    <label>
                      Account role
                      <select
                        name="role"
                        value={managedUserForm.role}
                        onChange={handleManagedUserChange}
                      >
                        {managedAccountRoleOptions.map((role) => (
                          <option key={role} value={role}>
                            {formatStatusLabel(role)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="dual-grid">
                    <PasswordField
                      label="Password"
                      name="password"
                      value={managedUserForm.password}
                      onChange={handleManagedUserChange}
                      placeholder={
                        editingManagedUser
                          ? 'Leave blank to keep the current password'
                          : 'Enter a strong password'
                      }
                      visible={passwordVisibility.managed}
                      onToggle={() => togglePasswordVisibility('managed')}
                      required={!editingManagedUser}
                    />

                    <div className="inline-note">
                      <span className={`pill is-${managedUserForm.role}`}>
                        {formatStatusLabel(managedUserForm.role)}
                      </span>
                      <p>
                        {managedUserForm.role === 'admin'
                          ? 'Admins can publish content, manage telemetry, and control other accounts from the workspace.'
                          : 'Users can sign in, review live workspace information, and send inquiries to administrators.'}
                      </p>
                    </div>
                  </div>

                  <p className="muted-line">
                    Managed accounts accept practical passwords with a minimum of 8 characters. Editing an existing account leaves its password unchanged unless you enter a new one.
                  </p>

                  <div className="action-cluster">
                    <button type="submit" disabled={managedUserState === 'submitting'}>
                      {managedUserState === 'submitting'
                        ? editingManagedUser
                          ? 'Saving account...'
                          : 'Creating account...'
                        : editingManagedUser
                          ? 'Save account'
                          : 'Create account'}
                    </button>
                    {editingManagedUser ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setManagedUserForm(initialManagedUserForm)
                          setPasswordVisibility((current) => ({
                            ...current,
                            managed: false,
                          }))
                          setManagedUserState('idle')
                          setManagedUserMessage(
                            'Create or update user and admin accounts here. Use at least 8 characters for any password you set.',
                          )
                        }}
                      >
                        Clear editor
                      </button>
                    ) : null}
                  </div>
                </form>

                <p className={`form-message is-${managedUserState}`}>
                  {managedUserMessage}
                </p>
              </article>

              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Directory</p>
                    <h2>Accounts in the system</h2>
                  </div>
                  <StatusBadge state={userDirectoryState} label={userDirectoryState === 'ready' ? 'Live' : userDirectoryState === 'idle' ? 'Idle' : userDirectoryState === 'error' ? 'Error' : 'Loading'} />
                </div>

                <p className="muted-line">{userDirectoryMessage}</p>

                {userDirectory.length ? (
                  <ul className="list-stack">
                    {userDirectory.map((user) => (
                      <li key={user.id} className="list-card">
                        <div className="list-top">
                          <div>
                            <strong>{user.fullName}</strong>
                            <p>@{user.username}</p>
                          </div>
                          <span className={`pill is-${user.role}`}>{user.role}</span>
                        </div>
                        <div className="meta-row">
                          <span>{user.email}</span>
                          <span>Joined {formatTimestamp(user.dateJoined)}</span>
                        </div>
                        <div className="meta-row">
                          <span>{user.isActive ? 'Active account' : 'Inactive account'}</span>
                          <span>
                            {currentUser && user.id === currentUser.id
                              ? 'Current session'
                              : 'Managed account'}
                          </span>
                        </div>
                        {user.role === 'user' ? (
                          <p className="muted-line">
                            This account can send inquiries to administrators from the workspace.
                          </p>
                        ) : null}
                        <div className="action-cluster">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => loadManagedUserIntoForm(user)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="secondary-button danger-button"
                            onClick={() => handleDeleteManagedUser(user)}
                            disabled={currentUser && user.id === currentUser.id}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">No accounts loaded yet.</div>
                )}
              </article>
            </section>
          ) : null}

          {isAdmin ? (
            <section className="panel-grid" id="site-content-panel">
              <article className="panel-card panel-span">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Content studio</p>
                    <h2>Edit live website copy</h2>
                  </div>
                  <StatusBadge
                    state={
                      siteContentFormState === 'submitting'
                        ? 'refreshing'
                        : siteContentFormState === 'success'
                          ? 'ready'
                          : siteContentFormState === 'error'
                            ? 'error'
                            : 'idle'
                    }
                    label={siteContentFormBadge}
                  />
                </div>

                <p className="muted-line">{siteContentFormMessage}</p>

                <form className="stack-form" onSubmit={handleSiteContentSubmit}>
                  <div className="dual-grid">
                    <label>
                      Brand name
                      <input
                        name="brandName"
                        value={siteContentForm.brandName}
                        onChange={handleSiteContentFieldChange}
                        placeholder="Aqual Sentinel"
                        required
                      />
                    </label>

                    <label>
                      Brand tagline
                      <input
                        name="brandTagline"
                        value={siteContentForm.brandTagline}
                        onChange={handleSiteContentFieldChange}
                        placeholder="Water operations, team presence, and admin workflow"
                        required
                      />
                    </label>
                  </div>

                  <div className="dual-grid">
                    <label>
                      Home eyebrow
                      <input
                        name="homeEyebrow"
                        value={siteContentForm.homeEyebrow}
                        onChange={handleSiteContentFieldChange}
                        required
                      />
                    </label>

                    <label>
                      Home title
                      <input
                        name="homeTitle"
                        value={siteContentForm.homeTitle}
                        onChange={handleSiteContentFieldChange}
                        required
                      />
                    </label>
                  </div>

                  <label>
                    Home description
                    <textarea
                      name="homeDescription"
                      value={siteContentForm.homeDescription}
                      onChange={handleSiteContentFieldChange}
                      rows="4"
                    />
                  </label>

                  <div className="dual-grid">
                    <label>
                      About eyebrow
                      <input
                        name="aboutEyebrow"
                        value={siteContentForm.aboutEyebrow}
                        onChange={handleSiteContentFieldChange}
                        required
                      />
                    </label>

                    <label>
                      About title
                      <input
                        name="aboutTitle"
                        value={siteContentForm.aboutTitle}
                        onChange={handleSiteContentFieldChange}
                        required
                      />
                    </label>
                  </div>

                  <label>
                    About description
                    <textarea
                      name="aboutDescription"
                      value={siteContentForm.aboutDescription}
                      onChange={handleSiteContentFieldChange}
                      rows="4"
                    />
                  </label>

                  <div className="dual-grid">
                    <label>
                      Products eyebrow
                      <input
                        name="productsEyebrow"
                        value={siteContentForm.productsEyebrow}
                        onChange={handleSiteContentFieldChange}
                        required
                      />
                    </label>

                    <label>
                      Workspace eyebrow
                      <input
                        name="workspaceEyebrow"
                        value={siteContentForm.workspaceEyebrow}
                        onChange={handleSiteContentFieldChange}
                        required
                      />
                    </label>
                  </div>

                  <label>
                    Products description
                    <textarea
                      name="productsDescription"
                      value={siteContentForm.productsDescription}
                      onChange={handleSiteContentFieldChange}
                      rows="4"
                    />
                  </label>

                  <div className="dual-grid">
                    <label>
                      Admin workspace description
                      <textarea
                        name="workspaceDescriptionAdmin"
                        value={siteContentForm.workspaceDescriptionAdmin}
                        onChange={handleSiteContentFieldChange}
                        rows="4"
                      />
                    </label>

                    <label>
                      User workspace description
                      <textarea
                        name="workspaceDescriptionUser"
                        value={siteContentForm.workspaceDescriptionUser}
                        onChange={handleSiteContentFieldChange}
                        rows="4"
                      />
                    </label>
                  </div>

                  <div className="dual-grid">
                    <label>
                      Admin note title
                      <input
                        name="adminNoteTitle"
                        value={siteContentForm.adminNoteTitle}
                        onChange={handleSiteContentFieldChange}
                        required
                      />
                    </label>

                    <label>
                      Admin note description
                      <textarea
                        name="adminNoteDescription"
                        value={siteContentForm.adminNoteDescription}
                        onChange={handleSiteContentFieldChange}
                        rows="4"
                      />
                    </label>
                  </div>

                  <div className="section-head compact-section-head">
                    <div>
                      <p className="eyebrow">Background media</p>
                      <h2>Manage login, signup, workspace, and settings visuals</h2>
                    </div>
                  </div>

                  <p className="muted-line">
                    Login uploads are reused on the signup screen, and workspace uploads are reused on the settings screen.
                  </p>

                  <div className="site-media-grid">
                    {siteMediaEntries.map((item) => (
                      <article key={item.key} className="inline-note media-editor-card">
                        <span className="strip-label">{item.label}</span>
                        <strong>
                          {siteMediaForm[`${item.key}Name`] ||
                            (item.currentUrl ? 'Current asset available' : 'No asset uploaded yet')}
                        </strong>

                        <label>
                          Upload replacement
                          <input
                            name={item.key}
                            type="file"
                            accept={item.accept}
                            onChange={handleSiteMediaChange}
                          />
                        </label>

                        {item.type === 'video' ? (
                          <p className="muted-line">
                            Use MP4, WebM, or Ogg. MP4 is the safest choice for browser playback.
                          </p>
                        ) : null}

                        <label className="checkbox-row">
                          <input
                            name={item.clearKey}
                            type="checkbox"
                            checked={siteMediaForm[item.clearKey]}
                            onChange={handleSiteMediaChange}
                          />
                          Remove current asset on save
                        </label>

                        {item.currentUrl && !siteMediaForm[item.clearKey] ? (
                          item.type === 'video' ? (
                            <video
                              className="site-media-preview"
                              src={item.currentUrl}
                              controls
                              muted
                              loop
                              playsInline
                            />
                          ) : (
                            <img
                              className="site-media-preview"
                              src={item.currentUrl}
                              alt={item.label}
                            />
                          )
                        ) : (
                          <p className="muted-line">
                            {siteMediaForm[item.clearKey]
                              ? 'This asset will be removed when you save.'
                              : 'Upload a new file here if you want to replace the current visual.'}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>

                  <div className="section-head compact-section-head">
                    <div>
                      <p className="eyebrow">Site highlights</p>
                      <h2>Manage highlight records from the workspace</h2>
                    </div>
                  </div>

                  <div className="highlight-editor-grid">
                    {sitePageOptions.map((page) => (
                      <article key={page} className="panel-card nested-panel-card">
                        <div className="section-head compact-section-head">
                          <div>
                            <p className="eyebrow">{sectionEditorLabelByPage[page]}</p>
                            <h2>
                              {pluralize(siteHighlightsForm[page]?.length || 0, 'highlight')}
                            </h2>
                          </div>
                        </div>

                        {siteHighlightsForm[page]?.length ? (
                          <div className="editor-stack">
                            {siteHighlightsForm[page].map((highlight, index) => (
                              <article key={highlight.id} className="list-card editor-list-card">
                                <div className="dual-grid">
                                  <label>
                                    Title
                                    <input
                                      value={highlight.title}
                                      onChange={(event) =>
                                        handleSiteHighlightFieldChange(
                                          page,
                                          index,
                                          'title',
                                          event.target.value,
                                        )
                                      }
                                      placeholder={`${sectionEditorLabelByPage[page]} highlight title`}
                                      required
                                    />
                                  </label>

                                  <label>
                                    Display order
                                    <input
                                      type="number"
                                      min="0"
                                      value={highlight.displayOrder}
                                      onChange={(event) =>
                                        handleSiteHighlightFieldChange(
                                          page,
                                          index,
                                          'displayOrder',
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Leave blank for the next slot"
                                    />
                                  </label>
                                </div>

                                <label>
                                  Description
                                  <textarea
                                    value={highlight.description}
                                    onChange={(event) =>
                                      handleSiteHighlightFieldChange(
                                        page,
                                        index,
                                        'description',
                                        event.target.value,
                                      )
                                    }
                                    rows="3"
                                    placeholder="Optional highlight description"
                                  />
                                </label>

                                <div className="action-cluster">
                                  <button
                                    type="button"
                                    className="secondary-button danger-button"
                                    onClick={() => removeSiteHighlight(page, index)}
                                  >
                                    Remove highlight
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-state">
                            No highlights are configured for this page yet.
                          </div>
                        )}

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => addSiteHighlight(page)}
                        >
                          Add highlight
                        </button>
                      </article>
                    ))}
                  </div>

                  <label>
                    Page sections and cards JSON
                    <textarea
                      value={siteSectionsDraft}
                      onChange={handleSiteSectionsDraftChange}
                      rows="14"
                      spellCheck="false"
                    />
                  </label>

                  <p className="muted-line">
                    This editor controls the same page-section and page-section-card records that were previously only practical to manage in Django admin.
                  </p>

                  <div className="action-cluster">
                    <button
                      type="submit"
                      disabled={siteContentFormState === 'submitting'}
                    >
                      {siteContentFormState === 'submitting'
                        ? 'Saving content...'
                        : 'Save live site content'}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={resetSiteContentEditor}
                    >
                      Reset to live content
                    </button>
                    <button
                      type="button"
                      className="secondary-button danger-button"
                      onClick={handleDeleteSiteContent}
                      disabled={siteContentFormState === 'submitting'}
                    >
                      Delete site content
                    </button>
                  </div>
                </form>
              </article>
            </section>
          ) : null}

          {isAdmin ? (
            <section className="panel-grid">
              <article className="panel-card" id="announcement-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Announcements</p>
                    <h2>
                      {editingAnnouncement
                        ? 'Update an announcement or advert'
                        : 'Publish an announcement or advert'}
                    </h2>
                  </div>
                  <StatusBadge state={announcementState} label={announcementBadge} />
                </div>

                <form className="stack-form" onSubmit={handleAnnouncementSubmit}>
                  <div className="dual-grid">
                    <label>
                      Type
                      <select
                        name="kind"
                        value={announcementForm.kind}
                        onChange={handleAnnouncementChange}
                      >
                        {announcementKindOptions.map((kind) => (
                          <option key={kind} value={kind}>
                            {formatStatusLabel(kind)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Display order
                      <input
                        name="displayOrder"
                        type="number"
                        min="0"
                        value={announcementForm.displayOrder}
                        onChange={handleAnnouncementChange}
                        placeholder="Leave blank for next slot"
                      />
                    </label>
                  </div>

                  <label>
                    Title
                    <input
                      name="title"
                      value={announcementForm.title}
                      onChange={handleAnnouncementChange}
                      placeholder="Planned service notice"
                      required
                    />
                  </label>

                  <label>
                    Message
                    <textarea
                      name="message"
                      value={announcementForm.message}
                      onChange={handleAnnouncementChange}
                      placeholder="Write the notice or advert copy."
                      rows="4"
                      required
                    />
                  </label>

                  <div className="dual-grid">
                    <label>
                      Moving image
                      <input
                        name="image"
                        type="file"
                        accept="image/*"
                        onChange={handleAnnouncementChange}
                        required={
                          !announcementForm.video &&
                          !editingAnnouncement?.imageUrl &&
                          !editingAnnouncement?.videoUrl
                        }
                      />
                    </label>

                    <div className="inline-note">
                      <span className="strip-label">Selected image</span>
                      <strong>
                        {announcementForm.imageName || 'Browse for an advert image'}
                      </strong>
                    </div>
                  </div>

                  <div className="dual-grid">
                    <label>
                      Moving video
                      <input
                        name="video"
                        type="file"
                        accept={browserSupportedVideoAccept}
                        onChange={handleAnnouncementChange}
                        required={
                          !announcementForm.image &&
                          !editingAnnouncement?.imageUrl &&
                          !editingAnnouncement?.videoUrl
                        }
                      />
                    </label>

                    <div className="inline-note">
                      <span className="strip-label">Selected video</span>
                      <strong>
                        {announcementForm.videoName || 'Browse for an advert video'}
                      </strong>
                      <p>Use MP4, WebM, or Ogg for reliable browser playback.</p>
                    </div>
                  </div>

                  <div className="dual-grid">
                    <label>
                      CTA label
                      <input
                        name="ctaLabel"
                        value={announcementForm.ctaLabel}
                        onChange={handleAnnouncementChange}
                        placeholder="Read more"
                      />
                    </label>

                    <label>
                      CTA link
                      <input
                        name="ctaLink"
                        type="url"
                        value={announcementForm.ctaLink}
                        onChange={handleAnnouncementChange}
                        placeholder="https://example.com/update"
                      />
                    </label>
                  </div>

                  <div className="inline-note">
                    <span className="strip-label">Editor mode</span>
                    <strong>
                      {editingAnnouncement
                        ? `Editing ${editingAnnouncement.title}`
                        : 'Creating a new notice'}
                    </strong>
                  </div>

                  <div className="action-cluster">
                    <button type="submit" disabled={announcementFormState === 'submitting'}>
                      {announcementFormState === 'submitting'
                        ? editingAnnouncement
                          ? 'Updating...'
                          : 'Publishing...'
                        : editingAnnouncement
                          ? 'Update notice'
                          : 'Publish to website'}
                    </button>
                    {editingAnnouncement ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setAnnouncementForm(initialAnnouncementForm)}
                      >
                        Clear editor
                      </button>
                    ) : null}
                  </div>
                </form>

                <p className={`form-message is-${announcementFormState}`}>
                  {announcementFormMessage}
                </p>

                {announcementData.announcements.length ? (
                  <ul className="list-stack compact-stack">
                    {announcementData.announcements.slice(0, 6).map((item) => (
                      <li key={item.id} className="list-card">
                        <div className="list-top">
                          <div>
                            <strong>{item.title}</strong>
                            <p>{formatStatusLabel(item.kind)}</p>
                          </div>
                          <span className={`pill${item.isActive ? ' is-live' : ' is-neutral'}`}>
                            {item.isActive ? 'Live' : 'Paused'}
                          </span>
                        </div>
                        <p className="message-body">{item.message}</p>
                        <div className="meta-row">
                          <span>Display order {item.displayOrder}</span>
                          <span>{formatRelativeTime(item.createdAt)}</span>
                        </div>
                        <div className="action-cluster">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => loadAnnouncementIntoForm(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => toggleAnnouncementActive(item)}
                          >
                            {item.isActive ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button danger-button"
                            onClick={() => handleDeleteAnnouncement(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>

              <article className="panel-card" id="sensor-registry-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">System registry</p>
                    <h2>
                      {editingSensor ? 'Update monitoring system' : 'Register monitoring systems'}
                    </h2>
                  </div>
                  <StatusBadge state={sensorState} label={sensorBadge} />
                </div>

                <p className="muted-line">{sensorMessage}</p>

                <form className="stack-form" onSubmit={handleSensorSubmit}>
                  <div className="dual-grid">
                    <label>
                      System code
                      <input
                        name="sensorCode"
                        value={sensorForm.sensorCode}
                        onChange={handleSensorChange}
                        placeholder="AQS-001"
                        required
                      />
                    </label>

                    <label>
                      System name
                      <input
                        name="displayName"
                        value={sensorForm.displayName}
                        onChange={handleSensorChange}
                        placeholder="North Flow Monitoring System"
                        required
                      />
                    </label>
                  </div>

                  <label>
                    Location
                    <input
                      name="location"
                      value={sensorForm.location}
                      onChange={handleSensorChange}
                      placeholder="Main tank inlet"
                      required
                    />
                  </label>

                  <label>
                    Description
                    <textarea
                      name="description"
                      value={sensorForm.description}
                      onChange={handleSensorChange}
                      placeholder="Optional notes about this system."
                      rows="3"
                    />
                  </label>

                  <div className="inline-note">
                    <span className="strip-label">Editor mode</span>
                    <strong>
                      {editingSensor
                        ? `Editing ${editingSensor.displayName}`
                        : 'Creating a new system record'}
                    </strong>
                  </div>

                  <div className="action-cluster">
                    <button type="submit" disabled={sensorFormState === 'submitting'}>
                      {sensorFormState === 'submitting'
                        ? editingSensor
                          ? 'Updating system...'
                          : 'Registering system...'
                        : editingSensor
                          ? 'Update system'
                          : 'Register system'}
                    </button>
                    {editingSensor ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setSensorForm(initialSensorForm)}
                      >
                        Clear editor
                      </button>
                    ) : null}
                  </div>
                </form>

                <p className={`form-message is-${sensorFormState}`}>
                  {sensorFormMessage}
                </p>

                {sensorData.sensors.length ? (
                  <ul className="list-stack compact-stack">
                    {sensorData.sensors.slice(0, 8).map((sensor) => (
                      <li key={sensor.id} className="list-card">
                        <div className="list-top">
                          <div>
                            <strong>{sensor.displayName}</strong>
                            <p>{sensor.sensorCode}</p>
                          </div>
                          <span className={`pill is-${sensor.isActive ? 'live' : 'neutral'}`}>
                            {sensor.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span>{sensor.location}</span>
                          <span>{sensor.description || 'Registered system'}</span>
                        </div>
                        <div className="meta-row">
                          <span>
                            {sensor.activeLeakCount
                              ? `${sensor.activeLeakCount} active leak`
                              : 'No active leaks'}
                          </span>
                          <span>
                            {sensor.latestSignal
                              ? formatRelativeTime(sensor.latestSignal.observedAt)
                              : 'No telemetry yet'}
                          </span>
                        </div>
                        <div className="action-cluster">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => loadSensorIntoForm(sensor)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => toggleSensorActive(sensor)}
                          >
                            {sensor.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button danger-button"
                            onClick={() => handleDeleteSensor(sensor)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">
                    No systems registered yet. Add the first one here to start wiring telemetry.
                  </div>
                )}
              </article>

              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">IoT feed</p>
                    <h2>
                      {editingLeakReport ? 'Update leak telemetry' : 'Publish leak telemetry'}
                    </h2>
                  </div>
                  <StatusBadge state={leakState} label={leakBadge} />
                </div>

                <form className="stack-form" onSubmit={handleLeakSubmit}>
                  <label>
                    Registered system
                    <select
                      name="sensorId"
                      value={leakForm.sensorId}
                      onChange={handleLeakChange}
                      required
                    >
                      <option value="" disabled>
                        Select system
                      </option>
                      {activeSensors.map((sensor) => (
                        <option key={sensor.id} value={sensor.id}>
                          {sensor.displayName} ({sensor.sensorCode})
                        </option>
                      ))}
                    </select>
                  </label>

                    <div className="inline-note">
                      <span className="strip-label">Linked location</span>
                      <strong>
                        {selectedSensor
                          ? selectedSensor.location
                          : 'Select a registered system to load the location automatically.'}
                      </strong>
                    </div>

                  <div className="dual-grid">
                    <label>
                      Leakage rate
                      <input
                        name="leakageRate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={leakForm.leakageRate}
                        onChange={handleLeakChange}
                        placeholder="38.50"
                        required
                      />
                    </label>

                    <label>
                      Status
                      <select
                        name="status"
                        value={leakForm.status}
                        onChange={handleLeakChange}
                      >
                        {leakStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="dual-grid">
                    <label>
                      Observed time
                      <input
                        name="observedAt"
                        type="datetime-local"
                        value={leakForm.observedAt}
                        onChange={handleLeakChange}
                      />
                    </label>

                    <label>
                      Display order
                      <input
                        name="displayOrder"
                        type="number"
                        min="0"
                        value={leakForm.displayOrder}
                        onChange={handleLeakChange}
                        placeholder="Leave blank for next slot"
                      />
                    </label>
                  </div>

                  <div className="inline-note">
                    <span className="strip-label">Editor mode</span>
                    <strong>
                      {editingLeakReport
                        ? `Editing ${editingLeakReport.sensorName}`
                        : 'Creating a new leak signal'}
                    </strong>
                  </div>

                  <div className="action-cluster">
                    <button
                      type="submit"
                      disabled={leakFormState === 'submitting' || !activeSensors.length}
                    >
                      {leakFormState === 'submitting'
                        ? editingLeakReport
                          ? 'Updating signal...'
                          : 'Publishing signal...'
                        : editingLeakReport
                          ? 'Update leak signal'
                          : 'Publish leak signal'}
                    </button>
                    {editingLeakReport ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setLeakForm(initialLeakForm)}
                      >
                        Clear editor
                      </button>
                    ) : null}
                  </div>
                </form>

                <p className={`form-message is-${leakFormState}`}>
                  {leakFormMessage}
                </p>

                {leakData.leakReports.length ? (
                  <ul className="list-stack compact-stack">
                    {leakData.leakReports.slice(0, 6).map((report) => (
                      <li key={report.id} className="list-card">
                        <div className="list-top">
                          <div>
                            <strong>{report.sensorName}</strong>
                            <p>{report.location}</p>
                          </div>
                          <span className={`pill is-${report.status}`}>
                            {formatStatusLabel(report.status)}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span>{report.leakageRate}</span>
                          <span>{formatTimestamp(report.observedAt)}</span>
                        </div>
                        <div className="meta-row">
                          <span>{report.isActive ? 'Active signal' : 'Archived signal'}</span>
                          <span>Display order {report.displayOrder}</span>
                        </div>
                        <div className="action-cluster">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => loadLeakIntoForm(report)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => toggleLeakActive(report)}
                          >
                            {report.isActive ? 'Archive' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button danger-button"
                            onClick={() => handleDeleteLeakReport(report)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            </section>
          ) : null}

          {isAdmin ? (
            <section className="panel-grid">
              <article className="panel-card" id="product-management-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Product management</p>
                    <h2>
                      {productForm.id ? 'Update a product' : 'Publish or update a product'}
                    </h2>
                  </div>
                  <StatusBadge state={productState} label={productBadge} />
                </div>

                <form className="stack-form" onSubmit={handleProductSubmit}>
                  <div className="dual-grid">
                    <label>
                      Product name
                      <input
                        name="name"
                        value={productForm.name}
                        onChange={handleProductChange}
                        placeholder="Aqua Sentinel system"
                        required
                      />
                    </label>

                    <label>
                      Display order
                      <input
                        name="displayOrder"
                        type="number"
                        min="0"
                        value={productForm.displayOrder}
                        onChange={handleProductChange}
                        placeholder="Leave blank for next slot"
                      />
                    </label>
                  </div>

                  <label>
                    Summary
                    <input
                      name="summary"
                      value={productForm.summary}
                      onChange={handleProductChange}
                      placeholder="Short product summary"
                    />
                  </label>

                  <div className="dual-grid">
                    <label>
                      Product image
                      <input
                        name="image"
                        type="file"
                        accept="image/*"
                        onChange={handleProductChange}
                        required={
                          !productForm.video &&
                          !existingManagedProduct?.imageUrl &&
                          !existingManagedProduct?.videoUrl
                        }
                      />
                    </label>

                    <div className="inline-note">
                      <span className="strip-label">Image upload</span>
                      <strong>
                        {productForm.imageName || 'Browse for an image file'}
                      </strong>
                    </div>
                  </div>

                  <div className="dual-grid">
                    <label>
                      Product video
                      <input
                        name="video"
                        type="file"
                        accept={browserSupportedVideoAccept}
                        onChange={handleProductChange}
                        required={
                          !productForm.image &&
                          !existingManagedProduct?.imageUrl &&
                          !existingManagedProduct?.videoUrl
                        }
                      />
                    </label>

                    <div className="inline-note">
                      <span className="strip-label">Video upload</span>
                      <strong>
                        {productForm.videoName || 'Browse for a video file'}
                      </strong>
                      <p>Use MP4, WebM, or Ogg for reliable browser playback.</p>
                    </div>
                  </div>

                  <label>
                    Description
                    <textarea
                      name="description"
                      value={productForm.description}
                      onChange={handleProductChange}
                      placeholder="Describe the product and what it does."
                      rows="5"
                    />
                  </label>

                  <div className="inline-note">
                    <span className="strip-label">Editor mode</span>
                    <strong>
                      {productForm.id
                        ? `Editing ${productForm.name}`
                        : 'Creating or matching a product by name'}
                    </strong>
                  </div>

                  <div className="action-cluster">
                    <button type="submit" disabled={productFormState === 'submitting'}>
                      {productFormState === 'submitting'
                        ? 'Saving product...'
                        : productForm.id
                          ? 'Update product'
                          : 'Save product'}
                    </button>
                    {productForm.id ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setProductForm(initialProductForm)}
                      >
                        Clear editor
                      </button>
                    ) : null}
                  </div>
                </form>

                <p className={`form-message is-${productFormState}`}>
                  {productFormMessage}
                </p>
              </article>

              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Published products</p>
                    <h2>Current product page entries</h2>
                  </div>
                  <StatusBadge state={productState} label={productBadge} />
                </div>

                <p className="muted-line">{productMessage}</p>

                {productData.products.length ? (
                  <div className="product-grid">
                    {productData.products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No products published yet.</div>
                )}

                {productData.products.length ? (
                  <ul className="list-stack compact-stack">
                    {productData.products.map((product) => (
                      <li key={`product-editor-${product.id}`} className="list-card">
                        <div className="list-top">
                          <div>
                            <strong>{product.name}</strong>
                            <p>{product.summary || 'No summary yet.'}</p>
                          </div>
                          <span className="pill is-neutral">
                            Order {product.displayOrder}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span>
                            {product.videoUrl
                              ? 'Video ready'
                              : product.imageUrl
                                ? 'Image ready'
                                : 'Needs media'}
                          </span>
                          <span>{formatRelativeTime(product.createdAt)}</span>
                        </div>
                        <div className="action-cluster">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => loadProductIntoForm(product)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="secondary-button danger-button"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <button
                  type="button"
                  className="secondary-button wide-button"
                  onClick={() => navigate('/products')}
                >
                  Open product page
                </button>
              </article>
            </section>
          ) : null}

          {isAdmin ? (
            <section className="panel-grid">
              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Team management</p>
                    <h2>Add a team member</h2>
                  </div>
                  <StatusBadge state={teamState} label={teamBadge} />
                </div>

                <form className="stack-form" onSubmit={handleTeamMemberSubmit}>
                  <div className="dual-grid">
                    <label>
                      Full name
                      <input
                        name="fullName"
                        value={teamMemberForm.fullName}
                        onChange={handleTeamMemberChange}
                        placeholder="Team member name"
                        required
                      />
                    </label>

                    <label>
                      Role title
                      <input
                        name="title"
                        value={teamMemberForm.title}
                        onChange={handleTeamMemberChange}
                        placeholder="Team Member"
                        required
                      />
                    </label>
                  </div>

                  <div className="dual-grid">
                    <label>
                      Profile photo
                      <input
                        name="photo"
                        type="file"
                        accept="image/*"
                        onChange={handleTeamMemberChange}
                        required
                      />
                    </label>

                    <label>
                      Display order
                      <input
                        name="displayOrder"
                        type="number"
                        min="0"
                        value={teamMemberForm.displayOrder}
                        onChange={handleTeamMemberChange}
                        placeholder="Leave blank for next slot"
                      />
                    </label>
                  </div>

                  <label>
                    Bio
                    <textarea
                      name="bio"
                      value={teamMemberForm.bio}
                      onChange={handleTeamMemberChange}
                      placeholder="Short team profile"
                      rows="4"
                    />
                  </label>

                  <p className="muted-line">
                    {teamMemberForm.photoName
                      ? `Selected file: ${teamMemberForm.photoName}`
                      : 'Browse and upload a real profile photo from your device.'}
                  </p>

                  <button type="submit" disabled={teamMemberState === 'submitting'}>
                    {teamMemberState === 'submitting'
                      ? 'Adding member...'
                      : 'Add team member'}
                  </button>
                </form>

                <p className={`form-message is-${teamMemberState}`}>
                  {teamMemberMessage}
                </p>

                <div className="mini-team-grid">
                  {teamData.teamMembers.slice(0, 4).map((member) => (
                    <TeamCard key={member.id} member={member} brandName={brand.name} />
                  ))}
                </div>
              </article>

              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Profile photos</p>
                    <h2>Update existing team member photos</h2>
                  </div>
                  <StatusBadge state={teamState} label={teamBadge} />
                </div>

                <form className="stack-form" onSubmit={handleTeamPhotoUpdateSubmit}>
                  <label>
                    Team member
                    <select
                      name="memberId"
                      value={teamPhotoUpdateForm.memberId}
                      onChange={handleTeamPhotoUpdateChange}
                      required
                    >
                      <option value="" disabled>
                        Select team member
                      </option>
                      {teamData.teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.fullName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="dual-grid">
                    <label>
                      Full name
                      <input
                        name="fullName"
                        value={teamPhotoUpdateForm.fullName}
                        onChange={handleTeamPhotoUpdateChange}
                        placeholder="Team member name"
                        required
                      />
                    </label>

                    <label>
                      Role title
                      <input
                        name="title"
                        value={teamPhotoUpdateForm.title}
                        onChange={handleTeamPhotoUpdateChange}
                        placeholder="Team Member"
                        required
                      />
                    </label>
                  </div>

                  <div className="dual-grid">
                    <label>
                      New profile photo
                      <input
                        name="photo"
                        type="file"
                        accept="image/*"
                        onChange={handleTeamPhotoUpdateChange}
                      />
                    </label>

                    <label>
                      Display order
                      <input
                        name="displayOrder"
                        type="number"
                        min="0"
                        value={teamPhotoUpdateForm.displayOrder}
                        onChange={handleTeamPhotoUpdateChange}
                        placeholder="Leave blank for next slot"
                      />
                    </label>
                  </div>

                  <label>
                    Bio
                    <textarea
                      name="bio"
                      value={teamPhotoUpdateForm.bio}
                      onChange={handleTeamPhotoUpdateChange}
                      placeholder="Short team profile"
                      rows="4"
                    />
                  </label>

                  <p className="muted-line">
                    {teamPhotoUpdateForm.photoName
                      ? `Selected file: ${teamPhotoUpdateForm.photoName}`
                      : 'Choose a new image file if you want to replace the current portrait, or edit the text fields and save without uploading a new photo.'}
                  </p>

                  <button type="submit" disabled={teamPhotoUpdateState === 'submitting'}>
                    {teamPhotoUpdateState === 'submitting'
                      ? 'Updating team member...'
                      : 'Update team member'}
                  </button>
                </form>

                <p className={`form-message is-${teamPhotoUpdateState}`}>
                  {teamPhotoUpdateMessage}
                </p>

                <ul className="list-stack compact-stack">
                  {teamData.teamMembers.map((member) => (
                    <li key={member.id} className="list-card">
                      <div className="list-top">
                        <div>
                          <strong>{member.fullName}</strong>
                          <p>{member.title}</p>
                        </div>
                        <span className={`pill${member.photoUrl ? ' is-live' : ' is-neutral'}`}>
                          {member.photoUrl ? 'Photo ready' : 'Needs photo'}
                        </span>
                      </div>
                      <div className="meta-row">
                        <span>Display order {member.displayOrder}</span>
                        <span>{formatRelativeTime(member.createdAt)}</span>
                      </div>
                      <div className="action-cluster">
                        <button
                          type="button"
                          className="secondary-button danger-button"
                          onClick={() => handleDeleteTeamMember(member)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="panel-card" id="contact-inbox-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Inquiry inbox</p>
                    <h2>Inquiries from the website and workspace</h2>
                  </div>
                  <StatusBadge state={contactInboxState} label={inboxBadge} />
                </div>

                <div className="inline-note">
                  <span className="strip-label">Inbox summary</span>
                  <strong>
                    {contactInbox.summary.totalMessages} total inquiries / {contactInbox.summary.unreadMessages} unread
                  </strong>
                </div>

                <p className="muted-line">{contactInboxMessage}</p>

                {contactInbox.messages.length ? (
                  <ul className="list-stack">
                    {contactInbox.messages.map((messageItem) => (
                      <li key={messageItem.id} className="list-card">
                        <div className="list-top">
                          <div>
                            <strong>{messageItem.subject}</strong>
                            <p>{messageItem.fullName}</p>
                          </div>
                          <span className={`pill${messageItem.isRead ? '' : ' is-unread'}`}>
                            {messageItem.isRead ? 'Read' : 'Unread'}
                          </span>
                        </div>
                        {messageItem.senderUsername ? (
                          <div className="meta-row">
                            <span>
                              Account: @{messageItem.senderUsername}
                            </span>
                            <span>{messageItem.senderRole || 'user'}</span>
                          </div>
                        ) : null}
                        <p className="message-body">{messageItem.message}</p>
                        <div className="meta-row">
                          <span>{messageItem.email}</span>
                          <span>{formatTimestamp(messageItem.createdAt)}</span>
                        </div>
                        <div className="action-cluster">
                          {messageItem.senderId ? (
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => openDirectConversation(messageItem.senderId)}
                            >
                              Reply in messages
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleContactMessageReadToggle(messageItem)}
                          >
                            Mark as {messageItem.isRead ? 'unread' : 'read'}
                          </button>
                          <button
                            type="button"
                            className="secondary-button danger-button"
                            onClick={() => handleDeleteContactMessage(messageItem)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">No inquiries yet.</div>
                )}
              </article>
            </section>
          ) : null}

          {isAdmin ? (
            <section className="panel-grid" id="direct-messages-panel">
              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Direct messages</p>
                    <h2>Reply to signed-in users from the workspace</h2>
                  </div>
                  <StatusBadge state={directMessageState} label={directMessageBadge} />
                </div>

                <p className="muted-line">{directMessageMessage}</p>

                {directMessageContacts.length ? (
                  <ul className="list-stack compact-stack">
                    {directMessageContacts.map((contact) => (
                      <li key={contact.id} className="list-card">
                        <div className="list-top">
                          <div>
                            <strong>{contact.fullName}</strong>
                            <p>@{contact.username}</p>
                          </div>
                          <span className={`pill is-${contact.role}`}>
                            {contact.unreadMessages
                              ? `${contact.unreadMessages} unread`
                              : formatStatusLabel(contact.role)}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span>{contact.email}</span>
                          <span>
                            {contact.latestMessageAt
                              ? formatRelativeTime(contact.latestMessageAt)
                              : 'No conversation yet'}
                          </span>
                        </div>
                        <p className="message-body">
                          {contact.latestMessage || 'Start the conversation from the reply panel.'}
                        </p>
                        <div className="action-cluster">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              setSelectedDirectParticipantId(String(contact.id))
                              refreshDirectMessages({ participantId: String(contact.id) })
                            }}
                          >
                            Open conversation
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">
                    Signed-in users will appear here once a conversation is available.
                  </div>
                )}
              </article>

              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Reply panel</p>
                    <h2>
                      {activeDirectParticipant
                        ? `Conversation with ${activeDirectParticipant.fullName}`
                        : 'Select a user to reply'}
                    </h2>
                  </div>
                </div>

                <p className="muted-line">
                  {activeDirectParticipant
                    ? `Replying as @${currentUser.username} to @${activeDirectParticipant.username}.`
                    : 'Choose a signed-in user from the list to load the conversation here.'}
                </p>

                {activeDirectMessages.length ? (
                  <div className="chat-thread">
                    {activeDirectMessages.map((messageItem) => (
                      <article
                        key={messageItem.id}
                        className={`chat-message${messageItem.direction === 'outgoing' ? ' is-outgoing' : ''}`}
                      >
                        <div className="list-top">
                          <div>
                            <strong>{messageItem.senderDisplayName}</strong>
                            <p>@{messageItem.senderUsername}</p>
                          </div>
                          <span className={`pill is-${messageItem.senderRole}`}>
                            {messageItem.isRead ? 'Read' : 'Unread'}
                          </span>
                        </div>
                        <p className="message-body">{messageItem.body}</p>
                        <div className="meta-row">
                          <span>{formatTimestamp(messageItem.createdAt)}</span>
                          <span>{messageItem.direction}</span>
                        </div>
                        <div className="action-cluster">
                          <button
                            type="button"
                            className="secondary-button danger-button"
                            onClick={() => handleDirectMessageDelete(messageItem)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    No conversation messages yet for this user.
                  </div>
                )}

                <form className="stack-form" onSubmit={handleDirectMessageSubmit}>
                  <label>
                    Reply
                    <textarea
                      name="body"
                      value={directMessageForm.body}
                      onChange={handleDirectMessageChange}
                      placeholder="Write your reply here"
                      rows="4"
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={
                      directMessageState === 'refreshing' || !activeDirectParticipant
                    }
                  >
                    {directMessageState === 'refreshing' ? 'Sending...' : 'Send reply'}
                  </button>
                </form>
              </article>

              <article className="panel-card panel-span">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">System-wide feed</p>
                    <h2>Latest direct messages across the workspace</h2>
                  </div>
                </div>

                <p className="muted-line">
                  This mirrors the broader direct-message visibility you had in Django admin.
                </p>

                {systemDirectMessages.length ? (
                  <ul className="list-stack">
                    {systemDirectMessages.slice(0, 12).map((messageItem) => (
                      <li key={`system-${messageItem.id}`} className="list-card">
                        <div className="list-top">
                          <div>
                            <strong>
                              @{messageItem.senderUsername} to @{messageItem.recipientUsername}
                            </strong>
                            <p>{messageItem.senderRole} to {messageItem.recipientRole}</p>
                          </div>
                          <span className={`pill${messageItem.isRead ? '' : ' is-unread'}`}>
                            {messageItem.isRead ? 'Read' : 'Unread'}
                          </span>
                        </div>
                        <p className="message-body">{messageItem.body}</p>
                        <div className="meta-row">
                          <span>{formatTimestamp(messageItem.createdAt)}</span>
                          <span>{formatRelativeTime(messageItem.createdAt)}</span>
                        </div>
                        <div className="action-cluster">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              openDirectConversation(
                                messageItem.senderRole === 'admin'
                                  ? messageItem.recipientId
                                  : messageItem.senderId,
                              )
                            }
                          >
                            Open conversation
                          </button>
                          <button
                            type="button"
                            className="secondary-button danger-button"
                            onClick={() => handleDirectMessageDelete(messageItem)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">No direct messages have been sent yet.</div>
                )}
              </article>
            </section>
          ) : null}
        </main>
      ) : isAuthRoute ? (
        <main className="page-layout auth-only-layout">
          <section className="auth-card auth-only-card">
            {authFormContent}
            {authMessage ? <p className={`form-message is-${authState}`}>{authMessage}</p> : null}
          </section>
        </main>
      ) : (
        <main className="page-layout welcome-layout">
          <section className="hero-card welcome-hero-card">
            <div className="welcome-hero-grid">
              <div className="welcome-hero-copy">
                <p className="eyebrow">{homePage.eyebrow}</p>
                <h1>{homePage.title}</h1>
                <p className="hero-text">{homePage.description}</p>

                <div className="welcome-action-row">
                  <button
                    type="button"
                    className="secondary-button welcome-primary-button"
                    onClick={() => navigate('/signup')}
                  >
                    Get started
                  </button>
                  <button
                    type="button"
                    className="secondary-button ghost-button"
                    onClick={() => navigate('/login')}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className="secondary-button ghost-button"
                    onClick={() => navigate('/products')}
                  >
                    Explore platform
                  </button>
                </div>

                <div className="welcome-proof-grid">
                  {homeCommandStats.slice(0, 3).map((item) => (
                    <article key={`welcome-${item.label}`} className="welcome-proof-card">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
              </div>

              <article className="hero-command-stage welcome-media-stage">
                <MediaAsset
                  imageUrl={homeSpotlightItem?.imageUrl || stockMedia.pipeLeakImage}
                  videoUrl={homeSpotlightItem?.videoUrl || stockMedia.pipeBurstVideo}
                  alt={homeSpotlightItem?.headline || 'Leak detection command view'}
                  className="hero-command-media"
                  fallback={
                    <div className="hero-command-fallback">
                      <span>Live command view</span>
                      <strong>{homeCommandHeadline}</strong>
                    </div>
                  }
                />
                <div className="hero-command-scan" aria-hidden="true" />
                <div className="hero-command-grid" aria-hidden="true" />

                <div className="hero-command-overlay">
                  <div className="hero-command-topline">
                    <span className="hero-command-kicker">Welcome to Aqual Sentinel</span>
                    <span className="hero-command-time">{formatClock(clock)}</span>
                  </div>

                  <div className="spotlight-badge-row">
                    {homeSpotlightBadges.map((badge) => (
                      <span
                        key={`hero-${badge.label}-${badge.tone}`}
                        className={`pill is-${badge.tone}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>

                  <h2>{homeCommandHeadline}</h2>
                  <p>{homeCommandDescription}</p>

                  <div className="hero-command-meta-grid">
                    {homeCommandStats.slice(0, 3).map((item) => (
                      <article key={item.label} className="hero-command-meta-card">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </section>
        </main>
      )}
    </div>
  )
}

export default App
