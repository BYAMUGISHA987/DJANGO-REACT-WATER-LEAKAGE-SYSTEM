from django.conf import settings
from django.db import models
from django.utils import timezone


class LaunchRequest(models.Model):
    class FocusArea(models.TextChoices):
        LEAK_MONITORING = 'Leak monitoring', 'Leak monitoring'
        TANK_LEVEL_VISIBILITY = 'Tank level visibility', 'Tank level visibility'
        INCIDENT_DISPATCH = 'Incident dispatch', 'Incident dispatch'
        ASSET_MAINTENANCE = 'Asset maintenance', 'Asset maintenance'

    full_name = models.CharField(max_length=120)
    organization = models.CharField(max_length=160)
    email = models.EmailField()
    focus_area = models.CharField(
        max_length=40,
        choices=FocusArea.choices,
        default=FocusArea.LEAK_MONITORING,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.full_name} - {self.organization}'


class TeamMember(models.Model):
    full_name = models.CharField(max_length=120)
    role_title = models.CharField(max_length=120, default='Team Member')
    bio = models.TextField(blank=True)
    photo_url = models.FileField(upload_to='team_members/', blank=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', 'full_name']

    def __str__(self):
        return self.full_name


class Product(models.Model):
    name = models.CharField(max_length=160, unique=True)
    summary = models.CharField(max_length=220, blank=True)
    description = models.TextField(blank=True)
    image = models.FileField(upload_to='products/', blank=True)
    video = models.FileField(upload_to='products/videos/', blank=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', 'name']

    def __str__(self):
        return self.name


class SiteContent(models.Model):
    brand_name = models.CharField(max_length=120, default='Aqual Sentinel')
    brand_tagline = models.CharField(
        max_length=220,
        default='Water operations, team presence, and admin workflow',
    )
    home_eyebrow = models.CharField(max_length=80, default='Dynamic operations platform')
    home_title = models.CharField(
        max_length=220,
        default='Login, products, About Us, and admin publishing now live together.',
    )
    home_description = models.TextField(
        default=(
            'The public experience now includes a real product page, a live About '
            'Us roster, and a contact form. The private workspace keeps auth, '
            'launch requests, and administration in one place.'
        )
    )
    about_eyebrow = models.CharField(max_length=80, default='About Us')
    about_title = models.CharField(
        max_length=220,
        default='The team page now runs from live content.',
    )
    about_description = models.TextField(
        default=(
            'Aqual Sentinel now includes a real About Us page with a team roster, '
            'contact form, and admin-managed updates. Team members are managed from '
            'the workspace, and incoming messages are kept for review in the '
            'workspace inbox.'
        )
    )
    products_eyebrow = models.CharField(max_length=80, default='Product page')
    products_description = models.TextField(
        default=(
            'Aqua Sentinel system gives water operations teams a single place for '
            'monitoring, response coordination, and admin-controlled publishing.'
        )
    )
    workspace_eyebrow = models.CharField(
        max_length=80,
        default='Authenticated workspace',
    )
    workspace_description_admin = models.TextField(
        default=(
            'You are signed in as an admin. The launch dashboard is live, and '
            'you can manage system administrators, systems, team members, products, and contact '
            'messages from this workspace.'
        )
    )
    workspace_description_user = models.TextField(
        default=(
            'You are signed in as a user. The launch dashboard is live, and '
            'you can view the current operating '
            'picture and public site information.'
        )
    )
    admin_note_title = models.CharField(max_length=120, default='Admin note')
    admin_note_description = models.TextField(
        default=(
            'The seeded admin account exists in the system, but the sign-in page does not '
            'display any password. Admins can create other system '
            'administrators, register systems, publish products, add team '
            'members, and review contact messages after sign-in.'
        )
    )
    login_background_primary = models.FileField(
        upload_to='site_content/login/',
        blank=True,
    )
    login_background_secondary = models.FileField(
        upload_to='site_content/login/',
        blank=True,
    )
    login_background_video = models.FileField(
        upload_to='site_content/login/',
        blank=True,
    )
    workspace_background_primary = models.FileField(
        upload_to='site_content/workspace/',
        blank=True,
    )
    workspace_background_secondary = models.FileField(
        upload_to='site_content/workspace/',
        blank=True,
    )
    workspace_background_video = models.FileField(
        upload_to='site_content/workspace/',
        blank=True,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Site content'
        verbose_name_plural = 'Site content'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return 'Site content'


class SiteHighlight(models.Model):
    class Page(models.TextChoices):
        HOME = 'home', 'Home'
        ABOUT = 'about', 'About'
        PRODUCTS = 'products', 'Products'
        WORKSPACE = 'workspace', 'Workspace'

    page = models.CharField(max_length=24, choices=Page.choices)
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['page', 'display_order', 'title']

    def __str__(self):
        return f'{self.get_page_display()}: {self.title}'


class PageSection(models.Model):
    class Page(models.TextChoices):
        HOME = 'home', 'Home'
        ABOUT = 'about', 'About'
        PRODUCTS = 'products', 'Products'
        WORKSPACE = 'workspace', 'Workspace'

    class Audience(models.TextChoices):
        ALL = 'all', 'All visitors'
        GUEST = 'guest', 'Guests'
        USER = 'user', 'Signed-in users'
        ADMIN = 'admin', 'Admins'

    class Kind(models.TextChoices):
        CARDS = 'cards', 'Cards'
        FEED = 'feed', 'Feed'

    class SourceType(models.TextChoices):
        NONE = '', 'None'
        LEAK_REPORTS = 'leak_reports', 'Leak reports'
        ANNOUNCEMENTS = 'announcements', 'Announcements'
        PRODUCTS = 'products', 'Products'
        TEAM_MEMBERS = 'team_members', 'Team members'

    page = models.CharField(max_length=24, choices=Page.choices)
    slot = models.SlugField(max_length=64)
    audience = models.CharField(
        max_length=24,
        choices=Audience.choices,
        default=Audience.ALL,
    )
    section_kind = models.CharField(
        max_length=24,
        choices=Kind.choices,
        default=Kind.CARDS,
    )
    source_type = models.CharField(
        max_length=40,
        choices=SourceType.choices,
        blank=True,
    )
    tab_label = models.CharField(max_length=80, blank=True)
    eyebrow = models.CharField(max_length=80, blank=True)
    title = models.CharField(max_length=220, blank=True)
    description = models.TextField(blank=True)
    cta_label = models.CharField(max_length=80, blank=True)
    cta_link = models.URLField(blank=True)
    item_limit = models.PositiveIntegerField(default=5)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['page', 'display_order', 'slot']
        constraints = [
            models.UniqueConstraint(
                fields=['page', 'slot', 'audience'],
                name='unique_page_section_slot_audience',
            ),
        ]

    def __str__(self):
        return f'{self.get_page_display()} / {self.slot} / {self.audience}'


class PageSectionCard(models.Model):
    class Tone(models.TextChoices):
        SEA = 'sea', 'Sea'
        FOAM = 'foam', 'Foam'
        SUN = 'sun', 'Sun'
        SAND = 'sand', 'Sand'
        NEUTRAL = 'neutral', 'Neutral'

    section = models.ForeignKey(
        PageSection,
        on_delete=models.CASCADE,
        related_name='cards',
    )
    card_key = models.SlugField(max_length=80)
    eyebrow = models.CharField(max_length=80, blank=True)
    title = models.CharField(max_length=220, blank=True)
    description = models.TextField(blank=True)
    tone = models.CharField(max_length=24, choices=Tone.choices, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['section', 'display_order', 'card_key']
        constraints = [
            models.UniqueConstraint(
                fields=['section', 'card_key'],
                name='unique_page_section_card_key',
            ),
        ]

    def __str__(self):
        return f'{self.section.slot}: {self.card_key}'


class Sensor(models.Model):
    sensor_code = models.CharField(max_length=64, unique=True)
    display_name = models.CharField(max_length=120)
    location = models.CharField(max_length=180)
    description = models.CharField(max_length=220, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_name', 'sensor_code']

    def save(self, *args, **kwargs):
        self.sensor_code = self.sensor_code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.display_name} ({self.sensor_code})'


class Announcement(models.Model):
    class Kind(models.TextChoices):
        ANNOUNCEMENT = 'announcement', 'Announcement'
        ADVERT = 'advert', 'Advert'

    kind = models.CharField(
        max_length=24,
        choices=Kind.choices,
        default=Kind.ANNOUNCEMENT,
    )
    title = models.CharField(max_length=180)
    message = models.TextField()
    image = models.FileField(upload_to='announcements/', blank=True)
    video = models.FileField(upload_to='announcements/videos/', blank=True)
    cta_label = models.CharField(max_length=60, blank=True)
    cta_link = models.URLField(blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', '-created_at', 'title']

    def __str__(self):
        return f'{self.get_kind_display()}: {self.title}'


class LeakReport(models.Model):
    class Status(models.TextChoices):
        CRITICAL = 'critical', 'Critical'
        INVESTIGATING = 'investigating', 'Investigating'
        STABLE = 'stable', 'Stable'
        RESOLVED = 'resolved', 'Resolved'

    sensor = models.ForeignKey(
        Sensor,
        on_delete=models.PROTECT,
        related_name='leak_reports',
        null=True,
        blank=True,
    )
    sensor_name = models.CharField(max_length=120, blank=True)
    location = models.CharField(max_length=180, blank=True)
    leakage_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.INVESTIGATING,
    )
    observed_at = models.DateTimeField(default=timezone.now)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', '-observed_at', 'sensor_name']

    def save(self, *args, **kwargs):
        if self.sensor_id:
            if not self.sensor_name:
                self.sensor_name = self.sensor.display_name
            if not self.location:
                self.location = self.sensor.location
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.sensor_name or "System signal"} - {self.location or "Unknown location"}'


class ContactMessage(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='contact_messages',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    full_name = models.CharField(max_length=120)
    email = models.EmailField()
    subject = models.CharField(max_length=160)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.full_name} - {self.subject}'


class DirectMessage(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='sent_direct_messages',
        on_delete=models.CASCADE,
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='received_direct_messages',
        on_delete=models.CASCADE,
    )
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']

    def __str__(self):
        return f'{self.sender} -> {self.recipient}'
