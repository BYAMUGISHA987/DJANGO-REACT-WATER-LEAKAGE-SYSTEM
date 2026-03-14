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
  fetchContactMessages,
  fetchTeamMembers,
  updateTeamMember,
} from './services/about'
import {
  checkAccountAvailability,
  createManagedUser,
  fetchSession,
  fetchUsers,
  loginAccount,
  signupAccount,
} from './services/auth'
import {
  createLaunchRequest,
  fetchLaunchDashboard,
  launchRequestEndpoint,
  launchRequestStore,
} from './services/launchRequests'
import {
  createAnnouncement,
  createLeakReport,
  createSensor,
  fetchAnnouncements,
  fetchLeakReports,
  fetchSensors,
} from './services/operations'
import { fetchDirectMessages, sendDirectMessage } from './services/messages'
import { fetchProducts, saveProduct } from './services/products'
import { fetchSiteContent } from './services/siteContent'

const focusAreaOptions = [
  'Leak monitoring',
  'Tank level visibility',
  'Incident dispatch',
  'Asset maintenance',
]

const announcementKindOptions = ['announcement', 'advert']
const leakStatusOptions = ['critical', 'investigating', 'stable', 'resolved']
const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const defaultAccessHighlights = [
  {
    title: 'Login and signup',
    description:
      'Visitors can create regular user accounts from the website and sign back in with the same interface.',
  },
  {
    title: 'Product page',
    description:
      'A public products page now pulls the Aqua Sentinel system details from live content instead of fixed page text.',
  },
  {
    title: 'About Us page',
    description:
      'The About Us page now pulls the team roster from live content instead of fixed page copy.',
  },
  {
    title: 'Admin-managed content',
    description:
      'Admins can register sensors, create other system administrators, add new team members with uploaded profile photos, and read contact messages from the workspace.',
  },
]

const defaultAboutHighlights = [
  {
    title: 'Core team seeded',
    description:
      'The initial roster includes Byamugisha Octavious, Asiimwe Shanon, Ankunda Reavin, Patience, Bwambale Fedwin, and supervisor Mr. Ambrose Izaara.',
  },
  {
    title: 'More members from admin',
    description:
      'Additional team members can be added later by an admin without editing the page code.',
  },
  {
    title: 'Messages are stored',
    description:
      'Every contact form submission is stored and appears in the workspace inbox for review.',
  },
]

const defaultProductHighlights = [
  {
    title: 'Product content is dynamic',
    description:
      'The Aqua Sentinel system page now reads its name, summary, description, and image from live content.',
  },
  {
    title: 'Admin-managed uploads',
    description:
      'Admins can browse for a product image from the workspace and publish it without editing the code.',
  },
  {
    title: 'Built for operations teams',
    description:
      'The product page connects the platform story to live team visibility, launch intake, and administration workflows.',
  },
]

const defaultWorkspaceHighlights = [
  { title: 'Session-based authentication is active for the workspace.', description: '' },
  {
    title: 'The launch dashboard refreshes automatically every 30 seconds.',
    description: '',
  },
  {
    title: 'The product page reads uploaded images and product copy from the workspace.',
    description: '',
  },
  {
    title: 'The About Us roster and contact inbox stay connected to live records.',
    description: '',
  },
  {
    title: 'Leak locations are resolved from the registered IoT sensor, not typed into the page.',
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
    tagline: 'Water operations, team presence, and admin workflow',
  },
  pages: {
    home: {
      eyebrow: 'Dynamic operations platform',
      title: 'Login, products, About Us, and admin publishing now live together.',
      description:
        'The public experience now includes a real product page, a live About Us roster, and a contact form. The private workspace keeps auth, launch requests, and administration in one place.',
    },
    about: {
      eyebrow: 'About Us',
      title: 'The team page now runs from live content.',
      description:
        'Aqual Sentinel now includes a real About Us page with a team roster, contact form, and admin-managed updates. Team members are managed from the workspace, and incoming messages are kept for review in the administration panel.',
    },
    products: {
      eyebrow: 'Product page',
      description:
        'Aqua Sentinel system gives water operations teams a single place for monitoring, response coordination, and admin-controlled publishing.',
    },
    workspace: {
      eyebrow: 'Authenticated workspace',
      descriptionAdmin:
        'You are signed in as an admin. The launch dashboard is live, and you can manage system administrators, sensors, products, team members, and contact messages from this workspace.',
      descriptionUser:
        'You are signed in as a user. The launch dashboard is live, and you can view the current operating picture and public site information.',
    },
  },
  adminNote: {
    title: 'Admin note',
    description:
      'The seeded admin account exists in the system, but the sign-in page does not display any password. Admins can create other system administrators, register sensors, publish products, add team members, and review contact messages after sign-in.',
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
  },
  contacts: [],
  activeParticipant: null,
  messages: [],
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

const initialPasswordVisibility = {
  login: false,
  signup: false,
  signupConfirm: false,
  managed: false,
}

const initialLaunchForm = {
  fullName: '',
  organization: '',
  email: '',
  focusArea: focusAreaOptions[0],
}

const initialManagedUserForm = {
  fullName: '',
  username: '',
  email: '',
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
}

const initialSensorForm = {
  sensorCode: '',
  displayName: '',
  location: '',
  description: '',
}

const initialLeakForm = {
  sensorId: '',
  leakageRate: '',
  status: 'investigating',
  observedAt: '',
  displayOrder: '',
}

function normalizeRoute(pathname) {
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

function App() {
  const [route, setRoute] = useState(() => normalizeRoute(window.location.pathname))
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
    'Loading the registered IoT sensors...',
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
  const [currentUser, setCurrentUser] = useState(null)
  const [sessionState, setSessionState] = useState('loading')
  const [sessionMessage, setSessionMessage] = useState(
    'Checking whether you already have an active session...',
  )
  const [authMode, setAuthMode] = useState('login')
  const [authState, setAuthState] = useState('idle')
  const [authMessage, setAuthMessage] = useState(
    'Use your account to enter the workspace.',
  )
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [signupForm, setSignupForm] = useState(initialSignupForm)
  const [passwordVisibility, setPasswordVisibility] = useState(
    initialPasswordVisibility,
  )
  const [launchForm, setLaunchForm] = useState(initialLaunchForm)
  const [launchState, setLaunchState] = useState('idle')
  const [launchMessage, setLaunchMessage] = useState(
    'Launch requests are stored and reflected back into the dashboard.',
  )
  const [managedUserForm, setManagedUserForm] = useState(initialManagedUserForm)
  const [managedUserState, setManagedUserState] = useState('idle')
  const [managedUserMessage, setManagedUserMessage] = useState(
    'Create another system administrator here. Use at least 8 characters for the password.',
  )
  const [teamMemberForm, setTeamMemberForm] = useState(initialTeamMemberForm)
  const [teamMemberState, setTeamMemberState] = useState('idle')
  const [teamMemberMessage, setTeamMemberMessage] = useState(
    'Add more team members here and they will appear on the About Us page.',
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
    'Send a message and it will appear in the administration panel.',
  )
  const [productForm, setProductForm] = useState(initialProductForm)
  const [productFormState, setProductFormState] = useState('idle')
  const [productFormMessage, setProductFormMessage] = useState(
    'Admins can browse and upload product images or videos from this workspace.',
  )
  const [announcementForm, setAnnouncementForm] = useState(initialAnnouncementForm)
  const [announcementFormState, setAnnouncementFormState] = useState('idle')
  const [announcementFormMessage, setAnnouncementFormMessage] = useState(
    'Publish announcements and adverts here. Uploaded images and videos appear on the public website.',
  )
  const [sensorForm, setSensorForm] = useState(initialSensorForm)
  const [sensorFormState, setSensorFormState] = useState('idle')
  const [sensorFormMessage, setSensorFormMessage] = useState(
    'Register each IoT sensor once so leak locations come from the sensor record automatically.',
  )
  const [leakForm, setLeakForm] = useState(initialLeakForm)
  const [leakFormState, setLeakFormState] = useState('idle')
  const [leakFormMessage, setLeakFormMessage] = useState(
    'Publish the latest IoT leak signal by selecting a registered sensor. The location is pulled automatically.',
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
  const [directMessageStatusMessage, setDirectMessageStatusMessage] = useState(
    'Sign in to send and receive direct messages.',
  )
  const [activeConversationId, setActiveConversationId] = useState('')
  const [directMessageForm, setDirectMessageForm] = useState(initialDirectMessageForm)
  const [directMessageFormState, setDirectMessageFormState] = useState('idle')
  const [directMessageFormMessage, setDirectMessageFormMessage] = useState(
    'Choose a conversation to start chatting.',
  )
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
      setSensorMessage('Refreshing the registered IoT sensors...')
    }

    try {
      const payload = await fetchSensors()

      startTransition(() => {
        setSensorData(payload)
        setSensorState('ready')
        setSensorMessage('Registered sensors synced successfully.')
      })
    } catch (error) {
      setSensorState('error')
      setSensorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load the registered IoT sensors.',
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
          highlights: {
            ...defaultSiteContent.highlights,
            ...(payload.highlights || {}),
          },
          sections: {
            ...defaultSiteContent.sections,
            ...(payload.sections || {}),
          },
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

  const refreshDirectMessageInbox = useEffectEvent(
    async ({ silent = false, participantId } = {}) => {
      if (!currentUser) {
        startTransition(() => {
          setDirectMessageData(emptyDirectMessageData)
          setDirectMessageState('idle')
          setDirectMessageStatusMessage(
            'Sign in to send and receive direct messages.',
          )
          setActiveConversationId('')
        })
        return
      }

      if (!silent) {
        setDirectMessageState((current) =>
          current === 'ready' ? 'refreshing' : 'loading',
        )
        setDirectMessageStatusMessage('Loading direct conversations...')
      }

      try {
        const payload = await fetchDirectMessages(participantId || activeConversationId)

        startTransition(() => {
          setDirectMessageData(payload)
          setDirectMessageState('ready')
          setDirectMessageStatusMessage('Direct conversations synced successfully.')

          if (payload.activeParticipant?.id) {
            const nextConversationId = String(payload.activeParticipant.id)
            if (nextConversationId !== activeConversationId) {
              setActiveConversationId(nextConversationId)
            }
          } else if (activeConversationId) {
            setActiveConversationId('')
          }
        })
      } catch (error) {
        setDirectMessageState('error')
        setDirectMessageStatusMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load direct conversations.',
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

    if (isAdmin) {
      requests.push(refreshUsers({ silent }), refreshContactInbox({ silent }))
    }

    if (currentUser) {
      requests.push(
        refreshDirectMessageInbox({
          silent,
          participantId: activeConversationId,
        }),
      )
    }

    await Promise.allSettled(requests)
  })

  useEffect(() => {
    const normalizedRoute = normalizeRoute(window.location.pathname)
    if (normalizedRoute !== window.location.pathname) {
      window.history.replaceState({}, '', normalizedRoute)
    }
    setRoute(normalizedRoute)

    const handlePopState = () => {
      setRoute(normalizeRoute(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
    if (!currentUser) {
      startTransition(() => {
        setDirectMessageData(emptyDirectMessageData)
        setDirectMessageState('idle')
        setDirectMessageStatusMessage('Sign in to send and receive direct messages.')
        setDirectMessageForm(initialDirectMessageForm)
        setDirectMessageFormState('idle')
        setDirectMessageFormMessage('Choose a conversation to start chatting.')
        setActiveConversationId('')
      })
      return
    }

    refreshDirectMessageInbox({ participantId: activeConversationId })
  }, [currentUser, activeConversationId])

  useEffect(() => {
    setActiveConversationId('')
    setDirectMessageForm(initialDirectMessageForm)
    setDirectMessageFormState('idle')
  }, [currentUser?.id])

  useEffect(() => {
    if (!currentUser) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      refreshDirectMessageInbox({
        silent: true,
        participantId: activeConversationId,
      })
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [currentUser, activeConversationId])

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

  function getAdminUrl(path = '/admin/') {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    if (configuredApiBaseUrl) {
      return `${configuredApiBaseUrl.replace(/\/api$/, '')}${normalizedPath}`
    }

    if (window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:8000${normalizedPath}`
    }

    return `${window.location.origin}${normalizedPath}`
  }

  function openAdminPanel(path = '/admin/') {
    const targetUrl = getAdminUrl(path)
    const popup = window.open(targetUrl, '_blank', 'noopener,noreferrer')

    if (!popup) {
      window.location.assign(targetUrl)
    }
  }

  function openDirectConversation(participantId) {
    const nextConversationId = String(participantId || '')
    if (!nextConversationId) {
      return
    }

    setActiveConversationId(nextConversationId)
    setDirectMessageFormState('idle')
    setDirectMessageFormMessage('Conversation ready.')

    window.requestAnimationFrame(() => {
      document.getElementById('direct-messages-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  function navigate(nextRoute) {
    const normalizedRoute = normalizeRoute(nextRoute)
    if (window.location.pathname !== normalizedRoute) {
      window.history.pushState({}, '', normalizedRoute)
    }

    setRoute(normalizedRoute)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLoginChange = updateFormState(setLoginForm)
  const handleSignupChange = updateFormState(setSignupForm)
  const handleLaunchChange = updateFormState(setLaunchForm)
  const handleManagedUserChange = updateFormState(setManagedUserForm)
  const handleSensorChange = updateFormState(setSensorForm)
  const togglePasswordVisibility = useEffectEvent((key) => {
    setPasswordVisibility((current) => ({
      ...current,
      [key]: !current[key],
    }))
  })
  const handleContactFormChange = updateFormState(setContactForm)
  const handleDirectMessageFormChange = updateFormState(setDirectMessageForm)
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

  function handleLogout() {
    setSessionState('refreshing')
    setSessionMessage('Signing out...')
    window.location.assign('/api/auth/logout/?next=/')
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

    const normalizedUsername = managedUserForm.username.trim().toLowerCase()
    const normalizedEmail = managedUserForm.email.trim().toLowerCase()
    const usernameTaken = userDirectory.some(
      (user) => user.username.trim().toLowerCase() === normalizedUsername,
    )
    const emailTaken = userDirectory.some(
      (user) => user.email.trim().toLowerCase() === normalizedEmail,
    )

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

    const managedPasswordError = validateManagedPassword(managedUserForm.password)
    if (managedPasswordError) {
      setManagedUserState('error')
      setManagedUserMessage(managedPasswordError)
      return
    }

    setManagedUserState('submitting')
    setManagedUserMessage('Checking account details...')

    try {
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

      setManagedUserMessage('Creating the account...')
      const response = await createManagedUser({
        ...managedUserForm,
        role: 'admin',
      })

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
        setManagedUserMessage(`System administrator created for ${response.user.username}.`)
      })

      try {
        await refreshUsers({ silent: true })
      } catch {
        startTransition(() => {
          setManagedUserMessage(
            `System administrator created for ${response.user.username}. The directory did not refresh automatically, but the account was saved.`,
          )
        })
      }
    } catch (error) {
      setManagedUserState('error')
      setManagedUserMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create the account.',
      )
    }
  }

  async function handleSensorSubmit(event) {
    event.preventDefault()

    setSensorFormState('submitting')
    setSensorFormMessage('Registering the sensor...')

    try {
      const response = await createSensor(sensorForm)

      startTransition(() => {
        setSensorForm(initialSensorForm)
        setSensorFormState('success')
        setSensorFormMessage(
          `${response.sensor.displayName} is now available for IoT leak telemetry.`,
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
          : 'Unable to register the sensor.',
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

    if (!teamPhotoUpdateForm.photo) {
      setTeamPhotoUpdateState('error')
      setTeamPhotoUpdateMessage('Browse for a real profile photo before saving the update.')
      return
    }

    setTeamPhotoUpdateState('submitting')
    setTeamPhotoUpdateMessage('Uploading the profile photo...')

    try {
      const response = await updateTeamMember(
        teamPhotoUpdateForm.memberId,
        teamPhotoUpdateForm,
      )

      startTransition(() => {
        setTeamPhotoUpdateForm(initialTeamPhotoUpdateForm)
        setTeamPhotoUpdateState('success')
        setTeamPhotoUpdateMessage(
          `${response.teamMember.fullName} now has an updated profile photo on the website.`,
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

  async function handleContactSubmit(event) {
    event.preventDefault()

    setContactState('submitting')
    setContactMessage('Sending your message...')

    try {
      const response = await createContactMessage(contactForm)

      startTransition(() => {
        setContactForm(createContactForm(currentUser))
        setContactState('success')
        setContactMessage(response.message || 'Message sent successfully.')
      })

      if (isAdmin) {
        await refreshContactInbox({ silent: true })
      }
    } catch (error) {
      setContactState('error')
      setContactMessage(
        error instanceof Error
          ? error.message
          : 'Unable to send the message.',
      )
    }
  }

  async function handleDirectMessageSubmit(event) {
    event.preventDefault()

    if (!activeConversationId) {
      setDirectMessageFormState('error')
      setDirectMessageFormMessage('Choose a conversation before sending a message.')
      return
    }

    setDirectMessageFormState('submitting')
    setDirectMessageFormMessage('Sending message...')

    try {
      const response = await sendDirectMessage(
        activeConversationId,
        directMessageForm.body,
      )

      startTransition(() => {
        setDirectMessageForm(initialDirectMessageForm)
        setDirectMessageFormState('success')
        setDirectMessageFormMessage(
          response.message || 'Message sent successfully.',
        )
      })

      await refreshDirectMessageInbox({
        silent: true,
        participantId: activeConversationId,
      })
    } catch (error) {
      setDirectMessageFormState('error')
      setDirectMessageFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to send the message.',
      )
    }
  }

  async function handleProductSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const existingProduct = productData.products.find(
      (product) => product.name.trim().toLowerCase() === productForm.name.trim().toLowerCase(),
    )

    if (
      !productForm.image &&
      !productForm.video &&
      !existingProduct?.imageUrl &&
      !existingProduct?.videoUrl
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
          `${response.product.name} was saved to the product page.`,
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

  async function handleAnnouncementSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget

    if (!announcementForm.image && !announcementForm.video) {
      setAnnouncementFormState('error')
      setAnnouncementFormMessage('Upload a real image or video before publishing to the website.')
      return
    }

    setAnnouncementFormState('submitting')
    setAnnouncementFormMessage('Publishing the announcement...')

    try {
      const response = await createAnnouncement(announcementForm)

      startTransition(() => {
        setAnnouncementForm(initialAnnouncementForm)
        setAnnouncementFormState('success')
        setAnnouncementFormMessage(
          `${response.announcement.title} is now live on the website.`,
        )
      })
      formElement.reset()

      await refreshAnnouncements({ silent: true })
    } catch (error) {
      setAnnouncementFormState('error')
      setAnnouncementFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to publish the announcement.',
      )
    }
  }

  async function handleLeakSubmit(event) {
    event.preventDefault()

    if (!leakForm.sensorId) {
      setLeakFormState('error')
      setLeakFormMessage('Select a registered sensor before publishing telemetry.')
      return
    }

    setLeakFormState('submitting')
    setLeakFormMessage('Publishing the leak signal...')

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
          `${response.leakReport.sensorName} is now visible in the IoT leak feed at ${response.leakReport.location}.`,
        )
      })

      await refreshLeakReports({ silent: true })
    } catch (error) {
      setLeakFormState('error')
      setLeakFormMessage(
        error instanceof Error
          ? error.message
          : 'Unable to publish the leak signal.',
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
      (product) => product.name.trim().toLowerCase() === productForm.name.trim().toLowerCase(),
    ) || null
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

  const siteBadge = {
    loading: 'Loading',
    refreshing: 'Refreshing',
    ready: 'Live',
    error: 'Error',
  }[siteState]

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

  const brand = siteContent.brand || defaultSiteContent.brand
  const homePage = siteContent.pages?.home || defaultSiteContent.pages.home
  const aboutPage = siteContent.pages?.about || defaultSiteContent.pages.about
  const productsPage =
    siteContent.pages?.products || defaultSiteContent.pages.products
  const workspacePage =
    siteContent.pages?.workspace || defaultSiteContent.pages.workspace

  const homeHighlights =
    siteContent.highlights?.home?.length
      ? siteContent.highlights.home
      : defaultSiteContent.highlights.home
  const aboutPageHighlights =
    siteContent.highlights?.about?.length
      ? siteContent.highlights.about
      : defaultSiteContent.highlights.about
  const productPageHighlights =
    siteContent.highlights?.products?.length
      ? siteContent.highlights.products
      : defaultSiteContent.highlights.products
  const workspacePageHighlights =
    siteContent.highlights?.workspace?.length
      ? siteContent.highlights.workspace
      : defaultSiteContent.highlights.workspace
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
  const activeConversation =
    directMessageData.activeParticipant ||
    directMessageData.contacts.find(
      (contact) => String(contact.id) === String(activeConversationId),
    ) ||
    null
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
        ? `${pluralize(activeSensors.length, 'registered sensor')} can already feed the public leak board.`
        : 'Register sensors from the workspace to connect field data to the site.',
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

  const guestSyncItems = [
    {
      label: 'Products',
      state: productBadge,
      message: productMessage,
    },
    {
      label: 'Team',
      state: teamBadge,
      message: teamMessage,
    },
    {
      label: 'Notices',
      state: announcementBadge,
      message: announcementMessage,
    },
  ]

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
      title: `${pluralize(activeSensors.length, 'registered sensor')} connected to operations`,
      description: latestLeakReport
        ? `Latest leak signal is at ${latestLeakReport.location}.`
        : 'Once field sensors start publishing, the platform story can be anchored in live operations data.',
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
  const guestBriefTitle = latestPublicNotice
    ? `${latestPublicNotice.title} is now shaping the public visitor experience.`
    : `Good ${visitorDayPart}. The public site is live and updating from published content.`
  const guestBriefDescription = latestRequest
    ? `Latest launch interest came from ${latestRequest.organization}. As new requests, notices, products, and team updates arrive, this view adjusts automatically for each visitor state.`
    : 'Guests see live public content, signed-in users see the workspace, and admins see publishing and inbox controls. The same data refreshes automatically without a full page reload.'

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
      key: 'demand',
      eyebrow: 'Demand',
      value: String(dashboard.summary.totalRequests).padStart(2, '0'),
      title: `${pluralize(dashboard.summary.totalRequests, 'launch request')} captured across the platform`,
      description: latestRequest
        ? `Latest request came from ${latestRequest.organization}.`
        : 'The public launch form is active and will feed this view automatically.',
      tone: 'sand',
    },
  ]

  const workspaceVisitorCards = resolveSectionCards(
    workspaceSections,
    'visitor_cards',
    isAdmin ? 'admin' : 'user',
    isAdmin ? adminVisitorCardDefaults : userVisitorCardDefaults,
  )
  const homeDeskGroupDefaults = [
    {
      id: 'operations',
      sourceType: 'leak_reports',
      label: 'Operations',
      eyebrow: 'Field desk',
      title: 'Leak telemetry and sensor movement',
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

  return (
    <div className="page-shell">
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
            <>
              <StatusBadge state={sessionState} label={sessionBadge} />
              <StatusBadge state={siteState} label={siteBadge} />
            </>
          )}
        </div>
      </header>

      {route === '/about' ? (
        <main className="page-layout">
          <section className="hero-card">
            <p className="eyebrow">{aboutPage.eyebrow}</p>
            <h1>{aboutPage.title}</h1>
            <p className="hero-text">{aboutPage.description}</p>

            <div className="metric-grid">
              {aboutMetrics.map((metric) => (
                <article key={metric.label} className="metric-card">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>

            <div className="highlight-grid">
              {aboutPageHighlights.map((item) => (
                <article key={item.title} className="panel-card highlight-card">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
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
                  <p className="eyebrow">Contact us</p>
                  <h2>Send a message to the team</h2>
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
                  Message
                  <textarea
                    name="message"
                    value={contactForm.message}
                    onChange={handleContactFormChange}
                    placeholder="Write your message here"
                    rows="5"
                    required
                  />
                </label>

                <button type="submit" disabled={contactState === 'submitting'}>
                  {contactState === 'submitting' ? 'Sending...' : 'Send message'}
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
                    onClick={() => openAdminPanel('/admin/accounts/contactmessage/')}
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

            <div className="metric-grid">
              {productMetrics.map((metric) => (
                <article key={metric.label} className="metric-card">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>

            <div className="highlight-grid">
              {productPageHighlights.map((item) => (
                <article key={item.title} className="panel-card highlight-card">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
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
            eyebrow="Product gallery"
            title="Published product visuals"
            description={
              productMediaItems.length
                ? `${pluralize(productMediaItems.length, 'product visual')} ${productMediaItems.length === 1 ? 'is' : 'are'} featured here.`
                : 'Upload product images or videos from the workspace to populate this gallery.'
            }
            state={productState}
            badge={productBadge}
            emptyMessage="No product media has been uploaded yet. Add a product image or video from the workspace to populate this gallery."
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
                  Open About Us
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate('/')}
                >
                  {currentUser ? 'Open workspace' : 'Back to home'}
                </button>
              </div>
            </article>
          </section>
        </main>
      ) : currentUser ? (
        <main className="page-layout">
          <section className="hero-card">
            <p className="eyebrow">{workspacePage.eyebrow}</p>
            <h1>{workspaceGreeting}</h1>
            <p className="hero-text">{workspaceNarrative}</p>

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

          <section className="panel-grid" id="direct-messages-panel">
            <article className="panel-card panel-span">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Direct messages</p>
                  <h2>
                    {isAdmin
                      ? 'Chat with a specific user'
                      : 'Chat with a system administrator'}
                  </h2>
                </div>
                <StatusBadge state={directMessageState} label={directMessageBadge} />
              </div>

              <div className="inline-note">
                <span className="strip-label">Chat summary</span>
                <strong>
                  {directMessageData.summary.totalContacts} contacts /{' '}
                  {directMessageData.summary.unreadMessages} unread
                </strong>
              </div>

              <div className="dual-grid">
                <label>
                  Conversation
                  <select
                    value={activeConversationId}
                    onChange={(event) => openDirectConversation(event.target.value)}
                    disabled={!directMessageData.contacts.length}
                  >
                    <option value="" disabled>
                      {directMessageData.contacts.length
                        ? 'Select conversation'
                        : 'No conversations available'}
                    </option>
                    {directMessageData.contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.fullName} (@{contact.username})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="inline-note role-selection-note">
                  <span className="strip-label">
                    {isAdmin ? 'Selected user' : 'Selected admin'}
                  </span>
                  <strong>
                    {activeConversation
                      ? `${activeConversation.fullName || activeConversation.username}`
                      : 'No conversation selected yet.'}
                  </strong>
                  <p>
                    {activeConversation?.email ||
                      'Choose a conversation to send a direct message.'}
                  </p>
                </div>
              </div>

              <p className="muted-line">{directMessageStatusMessage}</p>

              {directMessageData.contacts.length ? (
                directMessageData.messages.length ? (
                  <div className="chat-thread">
                    {directMessageData.messages.map((messageItem) => (
                      <article
                        key={messageItem.id}
                        className={`chat-message${messageItem.direction === 'outgoing' ? ' is-outgoing' : ''}`}
                      >
                        <div className="list-top">
                          <div>
                            <strong>
                              {messageItem.direction === 'outgoing'
                                ? 'You'
                                : messageItem.senderDisplayName}
                            </strong>
                            <p>@{messageItem.senderUsername}</p>
                          </div>
                          <span
                            className={`pill${messageItem.direction === 'incoming' && !messageItem.isRead ? ' is-unread' : ''}`}
                          >
                            {messageItem.direction === 'outgoing'
                              ? 'Sent'
                              : messageItem.isRead
                                ? 'Read'
                                : 'New'}
                          </span>
                        </div>
                        <p className="message-body">{messageItem.body}</p>
                        <div className="meta-row">
                          <span>{formatTimestamp(messageItem.createdAt)}</span>
                          <span>{formatRelativeTime(messageItem.createdAt)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    No messages yet in this conversation. Send one below to start chatting.
                  </div>
                )
              ) : (
                <div className="empty-state">
                  {isAdmin
                    ? 'No eligible user accounts are available for direct chat yet.'
                    : 'No system administrator is available for direct chat yet.'}
                </div>
              )}

              <form className="stack-form" onSubmit={handleDirectMessageSubmit}>
                <label>
                  Message
                  <textarea
                    name="body"
                    value={directMessageForm.body}
                    onChange={handleDirectMessageFormChange}
                    placeholder={
                      activeConversation
                        ? `Write a message to ${activeConversation.fullName || activeConversation.username}`
                        : 'Select a conversation before writing your message.'
                    }
                    rows="4"
                    required
                    disabled={!activeConversation}
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    !activeConversation || directMessageFormState === 'submitting'
                  }
                >
                  {directMessageFormState === 'submitting'
                    ? 'Sending...'
                    : 'Send direct message'}
                </button>
              </form>

              <p className={`form-message is-${directMessageFormState}`}>
                {directMessageFormMessage}
              </p>
            </article>

            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Conversation list</p>
                  <h2>
                    {isAdmin ? 'Users available for chat' : 'Administrators available for chat'}
                  </h2>
                </div>
              </div>

              {directMessageData.contacts.length ? (
                <ul className="list-stack">
                  {directMessageData.contacts.map((contact) => (
                    <li key={contact.id} className="list-card">
                      <div className="list-top">
                        <div>
                          <strong>{contact.fullName}</strong>
                          <p>@{contact.username}</p>
                        </div>
                        <span className={`pill is-${contact.role}`}>
                          {contact.role}
                        </span>
                      </div>
                      <p className="message-body">
                        {contact.latestMessage || 'No messages yet in this conversation.'}
                      </p>
                      <div className="meta-row">
                        <span>
                          {contact.unreadMessages
                            ? `${contact.unreadMessages} unread`
                            : 'No unread messages'}
                        </span>
                        <span>
                          {contact.latestMessageAt
                            ? formatRelativeTime(contact.latestMessageAt)
                            : 'No activity yet'}
                        </span>
                      </div>
                      <div className="action-cluster">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => openDirectConversation(contact.id)}
                        >
                          {String(contact.id) === String(activeConversationId)
                            ? 'Conversation open'
                            : 'Open chat'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  No direct-message contacts available yet.
                </div>
              )}
            </article>
          </section>

          <section className="panel-grid">
            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Demand intelligence</p>
                  <h2>Live launch breakdown</h2>
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
                  <p className="eyebrow">Launch intake</p>
                  <h2>Save a launch request</h2>
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
                    : 'Save launch request'}
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
                  <h2>Latest launch requests</h2>
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

              {visibleRequests.length ? (
                <ul className="list-stack">
                  {visibleRequests.map((request) => (
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

              <ul className="checklist">
                {workspacePageHighlights.map((item) => (
                  <li key={item.title}>
                    {item.title}
                    {item.description ? ` ${item.description}` : ''}
                  </li>
                ))}
              </ul>

              <div className="footer-note">
                <span>API endpoint: {launchRequestEndpoint}</span>
                <span>Storage: {launchRequestStore}</span>
              </div>

              {isAdmin ? (
                <div className="inline-note">
                  <span className="strip-label">Admin panel</span>
                  <strong>The workspace and admin panel are connected to the same data.</strong>
                  <div className="dual-grid">
                    <button
                      type="button"
                      className="secondary-button wide-button"
                      onClick={() => openAdminPanel('/admin/')}
                    >
                      Open admin panel
                    </button>
                    <button
                      type="button"
                      className="secondary-button wide-button"
                      onClick={() => openAdminPanel('/admin/auth/user/')}
                    >
                      Open accounts
                    </button>
                  </div>
                  <div className="dual-grid">
                    <button
                      type="button"
                      className="secondary-button wide-button"
                      onClick={() => openAdminPanel('/admin/accounts/sensor/')}
                    >
                      Open sensors
                    </button>
                    <button
                      type="button"
                      className="secondary-button wide-button"
                      onClick={() => openAdminPanel('/admin/accounts/contactmessage/')}
                    >
                      Open contact messages
                    </button>
                  </div>
                  <div className="dual-grid">
                    <button
                      type="button"
                      className="secondary-button wide-button"
                      onClick={() => openAdminPanel('/admin/accounts/directmessage/')}
                    >
                      Open direct messages
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
                  <p className="eyebrow">IoT monitoring</p>
                  <h2>Leakage status board</h2>
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
                  <p className="eyebrow">Notice board</p>
                  <h2>Announcements and adverts on the website</h2>
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
                    <h2>Create system administrator</h2>
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

                    <PasswordField
                      label="Password"
                      name="password"
                      value={managedUserForm.password}
                      onChange={handleManagedUserChange}
                      placeholder="Enter a strong password"
                      visible={passwordVisibility.managed}
                      onToggle={() => togglePasswordVisibility('managed')}
                      required
                    />
                  </div>

                  <div className="inline-note">
                    <span className="pill is-admin">Admin</span>
                    <p>
                      Every account created here becomes a system administrator with
                      admin workspace access and administrator permissions.
                    </p>
                  </div>

                  <p className="muted-line">
                    Managed administrator accounts accept practical passwords with a minimum of 8 characters.
                  </p>

                  <button type="submit" disabled={managedUserState === 'submitting'}>
                    {managedUserState === 'submitting'
                      ? 'Creating administrator...'
                      : 'Create administrator'}
                  </button>
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
                        {user.role === 'user' ? (
                          <div className="action-cluster">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => openDirectConversation(user.id)}
                            >
                              Message user
                            </button>
                          </div>
                        ) : null}
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
            <section className="panel-grid">
              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Announcements</p>
                    <h2>Publish an announcement or advert</h2>
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
                        required={!announcementForm.video}
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
                        accept="video/*"
                        onChange={handleAnnouncementChange}
                        required={!announcementForm.image}
                      />
                    </label>

                    <div className="inline-note">
                      <span className="strip-label">Selected video</span>
                      <strong>
                        {announcementForm.videoName || 'Browse for an advert video'}
                      </strong>
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

                  <button type="submit" disabled={announcementFormState === 'submitting'}>
                    {announcementFormState === 'submitting'
                      ? 'Publishing...'
                      : 'Publish to website'}
                  </button>
                </form>

                <p className={`form-message is-${announcementFormState}`}>
                  {announcementFormMessage}
                </p>
              </article>

              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Sensor registry</p>
                    <h2>Register IoT sensors</h2>
                  </div>
                  <StatusBadge state={sensorState} label={sensorBadge} />
                </div>

                <p className="muted-line">{sensorMessage}</p>

                <form className="stack-form" onSubmit={handleSensorSubmit}>
                  <div className="dual-grid">
                    <label>
                      Sensor code
                      <input
                        name="sensorCode"
                        value={sensorForm.sensorCode}
                        onChange={handleSensorChange}
                        placeholder="AQS-001"
                        required
                      />
                    </label>

                    <label>
                      Sensor name
                      <input
                        name="displayName"
                        value={sensorForm.displayName}
                        onChange={handleSensorChange}
                        placeholder="North Flow Sensor"
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
                      placeholder="Optional notes about this sensor."
                      rows="3"
                    />
                  </label>

                  <button type="submit" disabled={sensorFormState === 'submitting'}>
                    {sensorFormState === 'submitting'
                      ? 'Registering sensor...'
                      : 'Register sensor'}
                  </button>
                </form>

                <p className={`form-message is-${sensorFormState}`}>
                  {sensorFormMessage}
                </p>

                {sensorData.sensors.length ? (
                  <ul className="list-stack compact-stack">
                    {sensorData.sensors.slice(0, 4).map((sensor) => (
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
                          <span>{sensor.description || 'Registered sensor'}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">
                    No sensors registered yet. Add one here or in the admin panel first.
                  </div>
                )}
              </article>

              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">IoT feed</p>
                    <h2>Publish leak telemetry</h2>
                  </div>
                  <StatusBadge state={leakState} label={leakBadge} />
                </div>

                <form className="stack-form" onSubmit={handleLeakSubmit}>
                  <label>
                    Registered sensor
                    <select
                      name="sensorId"
                      value={leakForm.sensorId}
                      onChange={handleLeakChange}
                      required
                    >
                      <option value="" disabled>
                        Select sensor
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
                        : 'Select a registered sensor to load the location automatically.'}
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

                  <button
                    type="submit"
                    disabled={leakFormState === 'submitting' || !activeSensors.length}
                  >
                    {leakFormState === 'submitting'
                      ? 'Publishing signal...'
                      : 'Publish leak signal'}
                  </button>
                </form>

                <p className={`form-message is-${leakFormState}`}>
                  {leakFormMessage}
                </p>
              </article>
            </section>
          ) : null}

          {isAdmin ? (
            <section className="panel-grid">
              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Product management</p>
                    <h2>Publish or update a product</h2>
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
                        accept="video/*"
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

                  <button type="submit" disabled={productFormState === 'submitting'}>
                    {productFormState === 'submitting'
                      ? 'Saving product...'
                      : 'Save product'}
                  </button>
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
                        required
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
                      : 'Choose a real image file for the selected team member.'}
                  </p>

                  <button type="submit" disabled={teamPhotoUpdateState === 'submitting'}>
                    {teamPhotoUpdateState === 'submitting'
                      ? 'Updating photo...'
                      : 'Update team member photo'}
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
                    </li>
                  ))}
                </ul>
              </article>

              <article className="panel-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Contact inbox</p>
                    <h2>Messages from the About Us page</h2>
                  </div>
                  <StatusBadge state={contactInboxState} label={inboxBadge} />
                </div>

                <div className="inline-note">
                  <span className="strip-label">Inbox summary</span>
                  <strong>
                    {contactInbox.summary.totalMessages} total / {contactInbox.summary.unreadMessages} unread
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
                        {messageItem.senderId ? (
                          <div className="action-cluster">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => openDirectConversation(messageItem.senderId)}
                            >
                              Reply in chat
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">No contact messages yet.</div>
                )}
              </article>
            </section>
          ) : null}
        </main>
      ) : (
        <main className="page-layout home-layout">
          <section className="hero-card">
            <p className="eyebrow">{homePage.eyebrow}</p>
            <h1>{homePage.title}</h1>
            <p className="hero-text">{homePage.description}</p>

            <div className="water-stage">
              <article className="water-intro-card">
                <span className="water-chip">Water intelligence</span>
                <h2>{homeVisualTitle}</h2>
                <p>{homeVisualDescription}</p>

                <div className="water-intro-stats">
                  <div>
                    <span className="strip-label">Live media</span>
                    <strong>{String(floatingVisuals.length).padStart(2, '0')}</strong>
                  </div>
                  <div>
                    <span className="strip-label">Critical leaks</span>
                    <strong>{String(criticalLeakItems.length).padStart(2, '0')}</strong>
                  </div>
                  <div>
                    <span className="strip-label">Public notices</span>
                    <strong>{String(bulletinItems.length).padStart(2, '0')}</strong>
                  </div>
                </div>
              </article>

              <div className="water-gallery-shell">
                {floatingVisuals.length ? (
                  <div className="water-gallery">
                    {floatingVisuals.map((item, index) => (
                      <article
                        key={item.id}
                        className={`water-bubble bubble-${(index % 6) + 1}`}
                        style={{ '--delay': `${index * 0.9}s` }}
                      >
                        <MediaAsset
                          imageUrl={item.imageUrl}
                          videoUrl={item.videoUrl}
                          alt={item.title}
                          className="bubble-media"
                          fallback={<div className="announcement-image-fallback">{item.title}</div>}
                        />
                        <div className="water-bubble-copy">
                          <span>{item.caption}</span>
                          <strong>{item.title}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    Upload adverts, product media, or team photos to start the live media wall.
                  </div>
                )}
              </div>
            </div>

            {leadStory ? (
              <section className="newsroom-shell">
                <div className="section-head newsroom-head">
                  <div>
                    <p className="eyebrow">Live homepage desks</p>
                    <h2>Rotating headlines from your published content</h2>
                  </div>
                  <div className="newsroom-head-note">
                    <strong>{formatClock(clock)}</strong>
                    <span>{pluralize(newsroomItems.length, 'story')} in rotation</span>
                  </div>
                </div>

                <div className="newsroom-grid">
                  <NewsroomLeadCard item={leadStory} />

                  <div className="newsroom-brief-stack">
                    {supportingNewsroomItems.map((item, index) => (
                      <NewsroomBriefCard
                        key={item.id}
                        item={item}
                        isActive={index === 0}
                      />
                    ))}
                  </div>
                </div>

                {activeDesk && activeDeskLead ? (
                  <div className="desk-shell">
                    <div className="section-head">
                      <div>
                        <p className="eyebrow">{activeDesk.eyebrow}</p>
                        <h2>{activeDesk.title}</h2>
                      </div>
                      <StatusBadge state={activeDesk.state} label={activeDesk.badge} />
                    </div>

                    <div className="desk-tab-row">
                      {homeDeskGroups.map((desk, index) => (
                        <button
                          key={desk.id}
                          type="button"
                          className={`secondary-button desk-tab${index === activeDeskIndex % homeDeskGroups.length ? ' is-active' : ''}`}
                          onClick={() => setActiveDeskIndex(index)}
                        >
                          <span>{desk.label}</span>
                          <strong>{String(desk.items.length).padStart(2, '0')}</strong>
                        </button>
                      ))}
                    </div>

                    <article className="desk-board">
                      <div className="desk-board-copy">
                        <p>{activeDesk.description}</p>

                        <div className="desk-board-lead">
                          <div className="desk-board-lead-meta">
                            <span>{activeDeskLead.sectionLabel}</span>
                            <span>{formatTimestamp(activeDeskLead.timestamp)}</span>
                          </div>
                          <h3>{activeDeskLead.headline}</h3>
                          <p>{activeDeskLead.summary}</p>
                          <div className="desk-board-lead-footer">
                            <span className={`pill is-${activeDeskLead.pillTone}`}>
                              {activeDeskLead.pillLabel}
                            </span>
                            <span>{activeDeskLead.meta}</span>
                          </div>
                        </div>

                        {activeDeskQueue.length ? (
                          <div className="desk-feed-list">
                            {activeDeskQueue.map((item) => (
                              <DeskFeedRow key={item.id} item={item} />
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="desk-board-media-shell">
                        <MediaAsset
                          imageUrl={activeDeskLead.imageUrl}
                          videoUrl={activeDeskLead.videoUrl}
                          alt={activeDeskLead.headline}
                          className="desk-board-media"
                          fallback={
                            <div className="newsroom-media-fallback">
                              <span>{activeDesk.label}</span>
                              <strong>{activeDeskLead.headline}</strong>
                            </div>
                          }
                        />
                      </div>
                    </article>
                  </div>
                ) : null}
              </section>
            ) : null}

            {streamVisuals.length ? (
              <div className="stream-strip" aria-hidden="true">
                <div className="stream-track">
                  {streamVisuals.map((item, index) => (
                    <article key={`${item.id}-${index}`} className="stream-card">
                      <MediaAsset
                        imageUrl={item.imageUrl}
                        videoUrl={item.videoUrl}
                        alt=""
                        className="stream-media"
                        fallback={<div className="announcement-image-fallback">{item.title}</div>}
                      />
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <ProductPulseRail
              products={productData.products}
              activeIndex={activeProductRailIndex}
              eyebrow="Product gallery"
              title="Published product visuals"
              description={
                productMediaItems.length
                  ? `${pluralize(productMediaItems.length, 'product visual')} ${productMediaItems.length === 1 ? 'is' : 'are'} featured on the homepage.`
                  : 'Upload product images from the workspace to populate this gallery on the homepage.'
              }
              state={productState}
              badge={productBadge}
              emptyMessage="No product media has been published yet. Add product images from the workspace to populate this gallery."
            />

            <div className="hero-showcase">
              <AnnouncementPulseRail
                items={advertItems}
                activeIndex={activeAdvertIndex}
                eyebrow="Public adverts"
                title="Published campaigns"
                description={
                  advertItems.length
                    ? `${pluralize(advertItems.length, 'campaign')} ${advertItems.length === 1 ? 'is' : 'are'} featured here.`
                    : 'Publish adverts from the workspace to populate this gallery.'
                }
                state={announcementState}
                badge={announcementBadge}
                emptyMessage="No advert has been published yet. Admins can add one from the workspace."
                singularLabel="campaign"
                pluralLabel="campaigns"
                leadPillLabel="Campaign"
              />

              {canViewLeakStatus ? (
                <article className="signal-panel">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">IoT leak board</p>
                      <h2>Location, time, and leakage</h2>
                    </div>
                    <StatusBadge state={leakState} label={leakBadge} />
                  </div>

                  <div className="signal-summary">
                    <div className="inline-note">
                      <span className="strip-label">Critical alerts</span>
                      <strong>{criticalLeakItems.length}</strong>
                    </div>
                    <div className="inline-note">
                      <span className="strip-label">Latest update</span>
                      <strong>
                        {leakData.summary.latestObservedAt
                          ? formatRelativeTime(leakData.summary.latestObservedAt)
                          : 'Awaiting signal'}
                      </strong>
                    </div>
                  </div>

                  <div className="leak-fact-grid">
                    {publicLeakFacts.map((fact) => (
                      <article key={fact.label} className="leak-fact-card">
                        <span className="strip-label">{fact.label}</span>
                        <strong>{fact.value}</strong>
                      </article>
                    ))}
                  </div>

                  {leakData.leakReports.length ? (
                    <div className="leak-grid">
                      {leakData.leakReports.slice(0, 2).map((leakReport) => (
                        <LeakCard
                          key={leakReport.id}
                          leakReport={leakReport}
                          publicView
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      No IoT leak signals published yet.
                    </div>
                  )}
                </article>
              ) : (
                <TelemetryAccessPanel />
              )}
            </div>

            <div className="signal-story-grid">
              {guestHomeSignalCards.map((item) => (
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

            <div className="metric-grid">
              {homeMetrics.map((metric) => (
                <article key={metric.label} className="metric-card">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>

            <div className="highlight-grid">
              {homeHighlights.map((item) => (
                <article key={item.title} className="panel-card highlight-card">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>

            <div className="public-live-grid">
              <AnnouncementPulseRail
                items={bulletinItems}
                activeIndex={activeBulletinIndex}
                eyebrow="Announcements"
                title="Public notices from admins"
                description={
                  bulletinItems.length
                    ? `${pluralize(bulletinItems.length, 'public notice')} ${bulletinItems.length === 1 ? 'is' : 'are'} featured here.`
                    : 'Publish notices from the workspace to populate this gallery.'
                }
                state={announcementState}
                badge={announcementBadge}
                emptyMessage="No public notices have been published yet."
                singularLabel="public notice"
                pluralLabel="public notices"
                leadPillLabel="Notice"
              />

              {canViewLeakStatus ? (
                <article className="panel-card">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">Leak telemetry</p>
                      <h2>Leakage, status, time, and location</h2>
                    </div>
                    <StatusBadge state={leakState} label={leakBadge} />
                  </div>

                  <div className="leak-fact-grid">
                    {publicLeakFacts.map((fact) => (
                      <article key={fact.label} className="leak-fact-card">
                        <span className="strip-label">{fact.label}</span>
                        <strong>{fact.value}</strong>
                      </article>
                    ))}
                  </div>

                  {leakData.leakReports.length ? (
                    <div className="leak-grid">
                      {leakData.leakReports.slice(0, 3).map((leakReport) => (
                        <LeakCard
                          key={leakReport.id}
                          leakReport={leakReport}
                          publicView
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      No leak telemetry has been published yet.
                    </div>
                  )}
                </article>
              ) : (
                <TelemetryAccessPanel
                  eyebrow="Leak telemetry"
                  title="Leak status is available after sign in"
                  description="Guests can browse public content, but live leakage details are visible only to logged-in users."
                />
              )}
            </div>

            <div className="preview-strip">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Team preview</p>
                  <h2>Current About Us roster</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate('/about')}
                >
                  Open About Us
                </button>
              </div>

              {previewTeamMembers.length ? (
                <div className="mini-team-grid">
                  {previewTeamMembers.map((member) => (
                    <TeamCard key={member.id} member={member} brandName={brand.name} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">The team preview is still loading.</div>
              )}
            </div>

            <div className="system-strip">
              <div>
                <span className="strip-label">Announcements</span>
                <strong>{announcementMessage}</strong>
              </div>
              <div>
                <span className="strip-label">Leak feed</span>
                <strong>{leakMessage}</strong>
              </div>
              <div>
                <span className="strip-label">Team sync</span>
                <strong>{teamMessage}</strong>
              </div>
            </div>
          </section>

          <aside className="auth-card auth-sidebar">
            <div className="auth-brief">
              <span className="water-chip">Platform access</span>
              <h2>{guestBriefTitle}</h2>
              <p>{guestBriefDescription}</p>
            </div>

            <div className="signal-story-grid compact-grid">
              {publicGuestAccessCards.map((item) => (
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

            <div className="mode-switch">
              <button
                type="button"
                className={`mode-button${authMode === 'login' ? ' is-active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={`mode-button${authMode === 'signup' ? ' is-active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign up
              </button>
            </div>

            {authMode === 'login' ? (
              <form className="stack-form" onSubmit={handleLoginSubmit}>
                <div className="form-heading">
                  <h2>Login</h2>
                  <p>Use your username, password, and role to enter the workspace.</p>
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

                <p className="muted-line">
                  Select <strong>User</strong> for regular accounts and <strong>Admin</strong> for
                  accounts created with admin access.
                </p>

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
                  <p>Select a role before creating the account.</p>
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

                <p className="muted-line">
                  Select <strong>User</strong> for a regular account or <strong>Admin</strong> to
                  create an account with admin access and administrator permissions. Use at least 8
                  characters and avoid numeric-only passwords.
                </p>

                <button
                  type="submit"
                  disabled={authState === 'submitting' || !signupForm.role}
                >
                  {authState === 'submitting' ? 'Creating...' : 'Create account'}
                </button>
              </form>
            )}

            <p className={`form-message is-${authState}`}>{authMessage}</p>

            <div className="sync-feed">
              {guestSyncItems.map((item) => (
                <article key={item.label} className="sync-row">
                  <div className="list-top">
                    <strong>{item.label}</strong>
                    <span className="pill is-neutral">{item.state}</span>
                  </div>
                  <p>{item.message}</p>
                </article>
              ))}
            </div>
          </aside>
        </main>
      )}
    </div>
  )
}

export default App
