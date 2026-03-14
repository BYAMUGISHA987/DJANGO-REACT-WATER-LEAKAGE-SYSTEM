from urllib.parse import urlencode

from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html

from .models import (
    Announcement,
    ContactMessage,
    DirectMessage,
    LeakReport,
    LaunchRequest,
    PageSection,
    PageSectionCard,
    Product,
    Sensor,
    SiteContent,
    SiteHighlight,
    TeamMember,
)


@admin.register(LaunchRequest)
class LaunchRequestAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'organization', 'email', 'focus_area', 'created_at')
    search_fields = ('full_name', 'organization', 'email')
    list_filter = ('focus_area', 'created_at')


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('display_order', 'full_name', 'role_title', 'photo_url', 'created_at')
    list_display_links = ('full_name',)
    list_editable = ('display_order',)
    search_fields = ('full_name', 'role_title', 'bio')
    ordering = ('display_order', 'full_name')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('display_order', 'name', 'summary', 'image', 'video', 'created_at')
    list_display_links = ('name',)
    list_editable = ('display_order',)
    search_fields = ('name', 'summary', 'description')
    ordering = ('display_order', 'name')


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = (
        'display_order',
        'kind',
        'title',
        'is_active',
        'image',
        'video',
        'created_at',
    )
    list_display_links = ('title',)
    list_editable = ('display_order', 'is_active')
    list_filter = ('kind', 'is_active', 'created_at')
    search_fields = ('title', 'message', 'cta_label', 'cta_link')
    ordering = ('display_order', '-created_at', 'title')


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    list_display = (
        'sensor_code',
        'display_name',
        'location',
        'is_active',
        'created_at',
    )
    list_display_links = ('sensor_code',)
    list_filter = ('is_active', 'created_at')
    search_fields = ('sensor_code', 'display_name', 'location', 'description')
    ordering = ('display_name', 'sensor_code')


@admin.register(LeakReport)
class LeakReportAdmin(admin.ModelAdmin):
    list_display = (
        'display_order',
        'resolved_sensor_name',
        'resolved_location',
        'leakage_rate',
        'status',
        'is_active',
        'observed_at',
    )
    list_display_links = ('resolved_sensor_name',)
    list_editable = ('display_order', 'status', 'is_active')
    list_filter = ('status', 'is_active', 'observed_at')
    search_fields = (
        'sensor__sensor_code',
        'sensor__display_name',
        'sensor__location',
        'sensor_name',
        'location',
    )
    ordering = ('display_order', '-observed_at', 'sensor_name')
    fields = (
        'sensor',
        'resolved_sensor_name',
        'resolved_location',
        'leakage_rate',
        'status',
        'observed_at',
        'display_order',
        'is_active',
    )
    readonly_fields = ('resolved_sensor_name', 'resolved_location')

    @admin.display(description='Sensor')
    def resolved_sensor_name(self, obj):
        if obj.sensor_id:
            return obj.sensor.display_name
        return obj.sensor_name or 'Awaiting sensor link'

    @admin.display(description='Location')
    def resolved_location(self, obj):
        if obj.sensor_id:
            return obj.sensor.location
        return obj.location or 'Awaiting sensor location'


@admin.register(SiteContent)
class SiteContentAdmin(admin.ModelAdmin):
    list_display = ('brand_name', 'brand_tagline', 'updated_at')

    def has_add_permission(self, request):
        return not SiteContent.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SiteHighlight)
class SiteHighlightAdmin(admin.ModelAdmin):
    list_display = ('page', 'display_order', 'title', 'created_at')
    list_display_links = ('title',)
    list_editable = ('display_order',)
    list_filter = ('page',)
    search_fields = ('title', 'description')
    ordering = ('page', 'display_order', 'title')


@admin.register(PageSection)
class PageSectionAdmin(admin.ModelAdmin):
    list_display = (
        'page',
        'slot',
        'audience',
        'section_kind',
        'source_type',
        'display_order',
        'is_active',
    )
    list_display_links = ('slot',)
    list_editable = ('display_order', 'is_active')
    list_filter = ('page', 'audience', 'section_kind', 'source_type', 'is_active')
    search_fields = ('slot', 'tab_label', 'eyebrow', 'title', 'description')
    ordering = ('page', 'display_order', 'slot')


@admin.register(PageSectionCard)
class PageSectionCardAdmin(admin.ModelAdmin):
    list_display = (
        'section',
        'card_key',
        'display_order',
        'tone',
        'is_active',
        'created_at',
    )
    list_display_links = ('card_key',)
    list_editable = ('display_order', 'tone', 'is_active')
    list_filter = ('section__page', 'section__audience', 'tone', 'is_active')
    search_fields = (
        'section__slot',
        'card_key',
        'eyebrow',
        'title',
        'description',
    )
    ordering = ('section__page', 'section__display_order', 'display_order', 'card_key')


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = (
        'full_name',
        'sender',
        'email',
        'subject',
        'is_read',
        'created_at',
        'reply_link',
    )
    list_filter = ('is_read', 'created_at')
    search_fields = (
        'full_name',
        'sender__username',
        'sender__first_name',
        'sender__last_name',
        'email',
        'subject',
        'message',
    )
    readonly_fields = ('created_at', 'reply_link')

    def get_fields(self, request, obj=None):
        return (
            'sender',
            'full_name',
            'email',
            'subject',
            'message',
            'is_read',
            'created_at',
            'reply_link',
        )

    @admin.display(description='Reply')
    def reply_link(self, obj):
        if not obj.sender_id:
            return 'Reply available after the sender signs in.'

        query = urlencode({'recipient': obj.sender_id, 'contact_message': obj.id})
        return format_html(
            '<a href="{}?{}">Reply to @{} in direct messages</a>',
            reverse('admin:accounts_directmessage_add'),
            query,
            obj.sender.username,
        )


@admin.register(DirectMessage)
class DirectMessageAdmin(admin.ModelAdmin):
    list_display = (
        'sender',
        'recipient',
        'short_body',
        'is_read',
        'created_at',
        'reply_link',
    )
    list_filter = ('is_read', 'created_at')
    search_fields = (
        'sender__username',
        'sender__first_name',
        'sender__last_name',
        'recipient__username',
        'recipient__first_name',
        'recipient__last_name',
        'body',
    )
    readonly_fields = ('created_at', 'reply_link')

    def get_fields(self, request, obj=None):
        if obj is None:
            return ('recipient', 'body')

        return (
            'sender',
            'recipient',
            'body',
            'is_read',
            'created_at',
            'reply_link',
        )

    def get_readonly_fields(self, request, obj=None):
        if obj is None:
            return ()

        return ('sender', 'recipient', 'body', 'is_read', 'created_at', 'reply_link')

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        recipient = request.GET.get('recipient')
        if recipient:
            initial['recipient'] = recipient
        return initial

    def save_model(self, request, obj, form, change):
        if not change:
            obj.sender = request.user
        super().save_model(request, obj, form, change)

    @admin.display(description='Message')
    def short_body(self, obj):
        return obj.body[:80]

    @admin.display(description='Reply')
    def reply_link(self, obj):
        recipient = obj.recipient
        if obj.recipient.is_staff or obj.recipient.is_superuser:
            recipient = obj.sender

        query = urlencode({'recipient': recipient.id, 'reply_to': obj.id})
        return format_html(
            '<a href="{}?{}">Reply to @{} </a>',
            reverse('admin:accounts_directmessage_add'),
            query,
            recipient.username,
        )
