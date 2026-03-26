import json
from pathlib import Path

from django.contrib.auth import (
    authenticate,
    get_user_model,
    login,
    logout,
    update_session_auth_hash,
)
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.db.models import Count, Q
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie

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

RECENT_REQUEST_LIMIT = 6
SITE_CONTENT_FIELDS = (
    'brand_name',
    'brand_tagline',
    'home_eyebrow',
    'home_title',
    'home_description',
    'about_eyebrow',
    'about_title',
    'about_description',
    'products_eyebrow',
    'products_description',
    'workspace_eyebrow',
    'workspace_description_admin',
    'workspace_description_user',
    'admin_note_title',
    'admin_note_description',
)
User = get_user_model()
LEAK_STATUS_PRIORITY = {
    LeakReport.Status.CRITICAL: 4,
    LeakReport.Status.INVESTIGATING: 3,
    LeakReport.Status.STABLE: 2,
    LeakReport.Status.RESOLVED: 1,
}
SUPPORTED_BROWSER_VIDEO_EXTENSIONS = {
    '.mp4',
    '.webm',
    '.ogg',
    '.ogv',
}
SUPPORTED_BROWSER_VIDEO_CONTENT_TYPES = {
    'video/mp4',
    'video/webm',
    'video/ogg',
    'application/ogg',
}


def _json_error(detail, status):
    return JsonResponse({'detail': detail}, status=status)


def _parse_json_payload(request):
    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return None, _json_error('Invalid JSON payload.', 400)

    if not isinstance(payload, dict):
        return None, _json_error('JSON payload must be an object.', 400)

    return payload, None


def _parse_embedded_json_field(payload, field_name):
    value = payload.get(field_name)

    if value in (None, ''):
        return None, None

    if isinstance(value, (dict, list)):
        return value, None

    if not isinstance(value, str):
        return None, {field_name: ['This field must be valid JSON.']}

    try:
        return json.loads(value), None
    except json.JSONDecodeError:
        return None, {field_name: ['This field must be valid JSON.']}


def _delete_uploaded_file(file_field):
    if file_field:
        file_field.delete(save=False)


def _validate_browser_video_upload(uploaded_file, *, field_name='video', label='Video'):
    if uploaded_file is None:
        return None

    suffix = Path(uploaded_file.name or '').suffix.lower()
    content_type = (getattr(uploaded_file, 'content_type', '') or '').lower()
    error_message = (
        f'{label} must be MP4, WebM, or Ogg so browsers can play it reliably.'
    )

    if suffix not in SUPPORTED_BROWSER_VIDEO_EXTENSIONS:
        return {field_name: [error_message]}

    if content_type and content_type not in SUPPORTED_BROWSER_VIDEO_CONTENT_TYPES:
        return {field_name: [error_message]}

    return None


def _build_file_url(file_field, request=None):
    if not file_field:
        return ''

    file_url = file_field.url
    if request is not None:
        return request.build_absolute_uri(file_url)

    return file_url


def _split_full_name(full_name):
    parts = [part for part in full_name.split() if part]

    if not parts:
        return '', ''

    if len(parts) == 1:
        return parts[0], ''

    return parts[0], ' '.join(parts[1:])


def _serialize_user(user):
    is_admin = bool(user.is_staff or user.is_superuser)

    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'fullName': user.get_full_name() or user.username,
        'isAdmin': is_admin,
        'isActive': user.is_active,
        'role': 'admin' if is_admin else 'user',
        'dateJoined': user.date_joined.isoformat(),
    }


def _normalized_role(value):
    return (value or '').strip().lower()


def _user_role(user):
    return 'admin' if user.is_staff or user.is_superuser else 'user'


def _mask_requester(full_name):
    parts = [part for part in full_name.split() if part]

    if not parts:
        return 'Anonymous'

    if len(parts) == 1:
        return parts[0]

    return f'{parts[0]} {parts[-1][0]}.'


def _serialize_request(launch_request):
    return {
        'id': launch_request.id,
        'requester': _mask_requester(launch_request.full_name),
        'organization': launch_request.organization,
        'focusArea': launch_request.focus_area,
        'createdAt': launch_request.created_at.isoformat(),
    }


def _serialize_team_member(team_member, request=None):
    photo_url = ''
    if team_member.photo_url:
        photo_url = team_member.photo_url.url
        if request is not None:
            photo_url = request.build_absolute_uri(photo_url)

    return {
        'id': team_member.id,
        'fullName': team_member.full_name,
        'title': team_member.role_title,
        'bio': team_member.bio,
        'photoUrl': photo_url,
        'displayOrder': team_member.display_order,
        'createdAt': team_member.created_at.isoformat(),
    }


def _serialize_product(product, request=None):
    image_url = ''
    if product.image:
        image_url = product.image.url
        if request is not None:
            image_url = request.build_absolute_uri(image_url)

    video_url = ''
    if product.video:
        video_url = product.video.url
        if request is not None:
            video_url = request.build_absolute_uri(video_url)

    return {
        'id': product.id,
        'name': product.name,
        'summary': product.summary,
        'description': product.description,
        'imageUrl': image_url,
        'videoUrl': video_url,
        'displayOrder': product.display_order,
        'createdAt': product.created_at.isoformat(),
    }


def _serialize_announcement(announcement, request=None):
    image_url = ''
    if announcement.image:
        image_url = announcement.image.url
        if request is not None:
            image_url = request.build_absolute_uri(image_url)

    video_url = ''
    if announcement.video:
        video_url = announcement.video.url
        if request is not None:
            video_url = request.build_absolute_uri(video_url)

    return {
        'id': announcement.id,
        'kind': announcement.kind,
        'title': announcement.title,
        'message': announcement.message,
        'imageUrl': image_url,
        'videoUrl': video_url,
        'ctaLabel': announcement.cta_label,
        'ctaLink': announcement.cta_link,
        'displayOrder': announcement.display_order,
        'isActive': announcement.is_active,
        'createdAt': announcement.created_at.isoformat(),
    }


def _serialize_leak_report(leak_report):
    sensor = leak_report.sensor

    return {
        'id': leak_report.id,
        'sensorId': sensor.id if sensor is not None else None,
        'sensorCode': sensor.sensor_code if sensor is not None else '',
        'sensorName': (
            sensor.display_name if sensor is not None else leak_report.sensor_name
        ),
        'location': leak_report.location or (
            sensor.location if sensor is not None else ''
        ),
        'leakageRate': f'{leak_report.leakage_rate} L/min',
        'status': leak_report.status,
        'observedAt': leak_report.observed_at.isoformat(),
        'displayOrder': leak_report.display_order,
        'isActive': leak_report.is_active,
        'createdAt': leak_report.created_at.isoformat(),
    }


def _serialize_sensor(sensor, latest_signal=None, active_leak_count=0):
    latest_signal_payload = None
    if latest_signal is not None:
        latest_signal_payload = {
            'leakageRate': f'{latest_signal.leakage_rate} L/min',
            'status': latest_signal.status,
            'observedAt': latest_signal.observed_at.isoformat(),
            'isActive': latest_signal.is_active,
            'location': latest_signal.location or sensor.location,
        }

    return {
        'id': sensor.id,
        'sensorCode': sensor.sensor_code,
        'displayName': sensor.display_name,
        'location': sensor.location,
        'description': sensor.description,
        'activeLeakCount': active_leak_count,
        'latestSignal': latest_signal_payload,
        'isActive': sensor.is_active,
        'createdAt': sensor.created_at.isoformat(),
    }


def _serialize_contact_message(contact_message):
    sender = contact_message.sender
    sender_is_admin = bool(
        sender and (sender.is_staff or sender.is_superuser)
    )

    return {
        'id': contact_message.id,
        'senderId': sender.id if sender else None,
        'fullName': contact_message.full_name,
        'email': contact_message.email,
        'subject': contact_message.subject,
        'message': contact_message.message,
        'isRead': contact_message.is_read,
        'senderUsername': sender.username if sender else '',
        'senderDisplayName': sender.get_full_name() if sender else '',
        'senderRole': 'admin' if sender_is_admin else 'user' if sender else '',
        'createdAt': contact_message.created_at.isoformat(),
    }


def _eligible_direct_message_users(user):
    if user.is_staff or user.is_superuser:
        return User.objects.exclude(pk=user.pk).filter(
            is_active=True,
            is_staff=False,
            is_superuser=False,
        )

    return User.objects.exclude(pk=user.pk).filter(
        is_active=True,
    ).filter(Q(is_staff=True) | Q(is_superuser=True))


def _default_direct_message_recipient(user, eligible_users):
    if user.is_staff or user.is_superuser:
        return None

    if not eligible_users:
        return None

    prioritized_users = sorted(
        eligible_users,
        key=lambda eligible_user: (
            not eligible_user.is_superuser,
            not eligible_user.is_staff,
            eligible_user.date_joined,
            eligible_user.id,
        ),
    )
    return prioritized_users[0]


def _serialize_direct_message(message, current_user):
    sender = message.sender
    recipient = message.recipient

    return {
        'id': message.id,
        'body': message.body,
        'isRead': message.is_read,
        'createdAt': message.created_at.isoformat(),
        'senderId': sender.id,
        'senderUsername': sender.username,
        'senderDisplayName': sender.get_full_name() or sender.username,
        'senderRole': 'admin' if sender.is_staff or sender.is_superuser else 'user',
        'recipientId': recipient.id,
        'recipientUsername': recipient.username,
        'recipientDisplayName': recipient.get_full_name() or recipient.username,
        'recipientRole': 'admin' if recipient.is_staff or recipient.is_superuser else 'user',
        'direction': 'outgoing' if sender.pk == current_user.pk else 'incoming',
    }


def _serialize_system_direct_message(message):
    sender = message.sender
    recipient = message.recipient

    return {
        'id': message.id,
        'body': message.body,
        'isRead': message.is_read,
        'createdAt': message.created_at.isoformat(),
        'senderId': sender.id,
        'senderUsername': sender.username,
        'senderDisplayName': sender.get_full_name() or sender.username,
        'senderRole': 'admin' if sender.is_staff or sender.is_superuser else 'user',
        'recipientId': recipient.id,
        'recipientUsername': recipient.username,
        'recipientDisplayName': recipient.get_full_name() or recipient.username,
        'recipientRole': 'admin'
        if recipient.is_staff or recipient.is_superuser
        else 'user',
    }


def _serialize_direct_message_contact(user, summary):
    is_admin = bool(user.is_staff or user.is_superuser)

    return {
        'id': user.id,
        'username': user.username,
        'fullName': user.get_full_name() or user.username,
        'email': user.email,
        'role': 'admin' if is_admin else 'user',
        'unreadMessages': summary['unread_messages'],
        'latestMessage': summary['latest_message'],
        'latestMessageAt': summary['latest_message_at'],
        'hasConversation': summary['latest_message_at'] is not None,
    }


def _serialize_site_content(site_content, request=None):
    return {
        'brand': {
            'name': site_content.brand_name,
            'tagline': site_content.brand_tagline,
        },
        'pages': {
            'home': {
                'eyebrow': site_content.home_eyebrow,
                'title': site_content.home_title,
                'description': site_content.home_description,
            },
            'about': {
                'eyebrow': site_content.about_eyebrow,
                'title': site_content.about_title,
                'description': site_content.about_description,
            },
            'products': {
                'eyebrow': site_content.products_eyebrow,
                'description': site_content.products_description,
            },
            'workspace': {
                'eyebrow': site_content.workspace_eyebrow,
                'descriptionAdmin': site_content.workspace_description_admin,
                'descriptionUser': site_content.workspace_description_user,
            },
        },
        'adminNote': {
            'title': site_content.admin_note_title,
            'description': site_content.admin_note_description,
        },
        'media': {
            'loginBackgroundVideoUrl': _build_file_url(
                site_content.login_background_video,
                request,
            ),
            'loginBackgroundPrimaryUrl': _build_file_url(
                site_content.login_background_primary,
                request,
            ),
            'loginBackgroundSecondaryUrl': _build_file_url(
                site_content.login_background_secondary,
                request,
            ),
            'workspaceBackgroundVideoUrl': _build_file_url(
                site_content.workspace_background_video,
                request,
            ),
            'workspaceBackgroundPrimaryUrl': _build_file_url(
                site_content.workspace_background_primary,
                request,
            ),
            'workspaceBackgroundSecondaryUrl': _build_file_url(
                site_content.workspace_background_secondary,
                request,
            ),
        },
        'updatedAt': site_content.updated_at.isoformat(),
    }


def _serialize_site_highlight(site_highlight):
    return {
        'id': site_highlight.id,
        'page': site_highlight.page,
        'title': site_highlight.title,
        'description': site_highlight.description,
        'displayOrder': site_highlight.display_order,
        'createdAt': site_highlight.created_at.isoformat(),
    }


def _serialize_page_section_card(page_section_card):
    return {
        'id': page_section_card.id,
        'key': page_section_card.card_key,
        'eyebrow': page_section_card.eyebrow,
        'title': page_section_card.title,
        'description': page_section_card.description,
        'tone': page_section_card.tone,
        'displayOrder': page_section_card.display_order,
        'isActive': page_section_card.is_active,
        'createdAt': page_section_card.created_at.isoformat(),
    }


def _serialize_page_section(page_section):
    return {
        'id': page_section.id,
        'page': page_section.page,
        'slot': page_section.slot,
        'audience': page_section.audience,
        'kind': page_section.section_kind,
        'sourceType': page_section.source_type,
        'tabLabel': page_section.tab_label,
        'eyebrow': page_section.eyebrow,
        'title': page_section.title,
        'description': page_section.description,
        'ctaLabel': page_section.cta_label,
        'ctaLink': page_section.cta_link,
        'itemLimit': page_section.item_limit,
        'displayOrder': page_section.display_order,
        'isActive': page_section.is_active,
        'createdAt': page_section.created_at.isoformat(),
        'cards': [
            _serialize_page_section_card(page_section_card)
            for page_section_card in page_section.cards.all()
            if page_section_card.is_active
        ],
        'items': [],
    }


def _build_focus_breakdown():
    counts = {
        focus_area: 0
        for focus_area, _ in LaunchRequest.FocusArea.choices
    }

    for row in (
        LaunchRequest.objects.values('focus_area')
        .annotate(count=Count('id'))
        .order_by()
    ):
        counts[row['focus_area']] = row['count']

    return [
        {
            'focusArea': focus_area,
            'count': counts[focus_area],
        }
        for focus_area, _ in LaunchRequest.FocusArea.choices
    ]


def _launch_dashboard():
    latest_request = LaunchRequest.objects.first()

    return {
        'summary': {
            'totalRequests': LaunchRequest.objects.count(),
            'organizationCount': (
                LaunchRequest.objects.values('organization').distinct().count()
            ),
            'latestRequestAt': (
                latest_request.created_at.isoformat() if latest_request else None
            ),
            'focusBreakdown': _build_focus_breakdown(),
        },
        'recentRequests': [
            _serialize_request(launch_request)
            for launch_request in LaunchRequest.objects.all()[:RECENT_REQUEST_LIMIT]
        ],
    }


def _team_snapshot(request=None):
    team_members = list(TeamMember.objects.all())

    return {
        'summary': {
            'totalMembers': len(team_members),
            'supervisorCount': sum(
                1
                for team_member in team_members
                if team_member.role_title.lower() == 'supervisor'
            ),
        },
        'teamMembers': [
            _serialize_team_member(team_member, request)
            for team_member in team_members
        ],
    }


def _announcements_snapshot(request=None):
    announcements = list(Announcement.objects.all())

    return {
        'summary': {
            'totalItems': len(announcements),
            'activeItems': sum(1 for announcement in announcements if announcement.is_active),
            'advertCount': sum(
                1
                for announcement in announcements
                if announcement.kind == Announcement.Kind.ADVERT and announcement.is_active
            ),
            'announcementCount': sum(
                1
                for announcement in announcements
                if announcement.kind == Announcement.Kind.ANNOUNCEMENT and announcement.is_active
            ),
        },
        'announcements': [
            _serialize_announcement(announcement, request)
            for announcement in announcements
        ],
    }


def _product_snapshot(request=None):
    products = list(Product.objects.all())

    return {
        'summary': {
            'totalProducts': len(products),
        },
        'products': [
            _serialize_product(product, request)
            for product in products
        ],
    }


def _sensor_snapshot():
    sensors = list(Sensor.objects.all())
    leak_reports = list(
        LeakReport.objects.select_related('sensor')
        .filter(sensor__isnull=False)
        .order_by('sensor_id', '-observed_at', '-created_at')
    )
    latest_signal_by_sensor = {}
    active_leak_counts = {}

    for leak_report in leak_reports:
        sensor_id = leak_report.sensor_id
        if sensor_id is None:
            continue

        if sensor_id not in latest_signal_by_sensor:
            latest_signal_by_sensor[sensor_id] = leak_report

        if (
            leak_report.is_active
            and leak_report.status != LeakReport.Status.RESOLVED
        ):
            active_leak_counts[sensor_id] = active_leak_counts.get(sensor_id, 0) + 1

    return {
        'summary': {
            'totalSensors': len(sensors),
            'activeSensors': sum(1 for sensor in sensors if sensor.is_active),
        },
        'sensors': [
            _serialize_sensor(
                sensor,
                latest_signal=latest_signal_by_sensor.get(sensor.id),
                active_leak_count=active_leak_counts.get(sensor.id, 0),
            )
            for sensor in sensors
        ],
    }


def _leak_reports_snapshot():
    leak_reports = list(LeakReport.objects.select_related('sensor').all())
    active_leak_reports = [
        leak_report
        for leak_report in leak_reports
        if leak_report.is_active and leak_report.status != LeakReport.Status.RESOLVED
    ]
    latest_report = max(
        leak_reports,
        key=lambda leak_report: leak_report.observed_at,
        default=None,
    )

    latest_signal = (
        latest_report.observed_at if latest_report is not None else None
    )
    first_active_signal = min(
        (leak_report.observed_at for leak_report in active_leak_reports),
        default=None,
    )
    current_status = None

    if active_leak_reports:
        current_status = max(
            active_leak_reports,
            key=lambda leak_report: (
                LEAK_STATUS_PRIORITY.get(leak_report.status, 0),
                leak_report.observed_at,
            ),
        ).status
    elif latest_report is not None:
        current_status = latest_report.status

    return {
        'summary': {
            'totalSignals': len(leak_reports),
            'activeLeaks': len(active_leak_reports),
            'criticalLeaks': sum(
                1
                for leak_report in active_leak_reports
                if leak_report.status == LeakReport.Status.CRITICAL
            ),
            'currentStatus': current_status,
            'firstActiveObservedAt': (
                first_active_signal.isoformat()
                if first_active_signal is not None
                else None
            ),
            'latestObservedAt': (
                latest_signal.isoformat() if latest_signal is not None else None
            ),
        },
        'leakReports': [
            _serialize_leak_report(leak_report)
            for leak_report in leak_reports
        ],
    }


def _restricted_leak_reports_snapshot():
    return {
        'summary': {
            'totalSignals': 0,
            'activeLeaks': 0,
            'criticalLeaks': 0,
            'currentStatus': None,
            'firstActiveObservedAt': None,
            'latestObservedAt': None,
        },
        'leakReports': [],
    }


def _serialize_feed_item_from_announcement(announcement, request=None):
    image_url = ''
    if announcement.image:
        image_url = announcement.image.url
        if request is not None:
            image_url = request.build_absolute_uri(image_url)

    video_url = ''
    if announcement.video:
        video_url = announcement.video.url
        if request is not None:
            video_url = request.build_absolute_uri(video_url)

    return {
        'id': f'announcement-{announcement.id}',
        'sectionLabel': (
            'Campaign spotlight'
            if announcement.kind == Announcement.Kind.ADVERT
            else 'Public notice'
        ),
        'headline': announcement.title,
        'summary': (
            announcement.message
            or 'Administrators can publish homepage notices from the workspace.'
        ),
        'imageUrl': image_url,
        'videoUrl': video_url,
        'timestamp': announcement.created_at.isoformat(),
        'meta': (
            announcement.cta_label
            or (
                'Homepage campaign'
                if announcement.kind == Announcement.Kind.ADVERT
                else 'Live on the public site'
            )
        ),
        'pillLabel': announcement.get_kind_display(),
        'pillTone': announcement.kind,
    }


def _serialize_feed_item_from_product(product, request=None):
    image_url = ''
    if product.image:
        image_url = product.image.url
        if request is not None:
            image_url = request.build_absolute_uri(image_url)

    video_url = ''
    if product.video:
        video_url = product.video.url
        if request is not None:
            video_url = request.build_absolute_uri(video_url)

    return {
        'id': f'product-{product.id}',
        'sectionLabel': 'Product desk',
        'headline': product.name,
        'summary': (
            product.summary
            or product.description
            or 'The product catalog is being published live.'
        ),
        'imageUrl': image_url,
        'videoUrl': video_url,
        'timestamp': product.created_at.isoformat(),
        'meta': (
            'Video-backed product card'
            if product.video
            else 'Image-backed product card'
            if product.image
            else 'Catalog update'
        ),
        'pillLabel': 'Product',
        'pillTone': 'neutral',
    }


def _serialize_feed_item_from_team_member(team_member, request=None):
    photo_url = ''
    if team_member.photo_url:
        photo_url = team_member.photo_url.url
        if request is not None:
            photo_url = request.build_absolute_uri(photo_url)

    return {
        'id': f'team-{team_member.id}',
        'sectionLabel': 'People desk',
        'headline': team_member.full_name,
        'summary': (
            team_member.bio
            or (
                f'{team_member.full_name} is currently visible on the About '
                f'page as {team_member.role_title}.'
            )
        ),
        'imageUrl': photo_url,
        'videoUrl': '',
        'timestamp': team_member.created_at.isoformat(),
        'meta': team_member.role_title,
        'pillLabel': 'Team',
        'pillTone': 'neutral',
    }


def _serialize_feed_item_from_leak_report(leak_report):
    sensor = leak_report.sensor
    sensor_name = sensor.display_name if sensor is not None else leak_report.sensor_name
    location = sensor.location if sensor is not None else leak_report.location

    return {
        'id': f'leak-{leak_report.id}',
        'sectionLabel': 'Operations desk',
        'headline': f'{sensor_name} at {location}',
        'summary': (
            f'{leak_report.leakage_rate} L/min recorded with '
            f'{leak_report.get_status_display().lower()} status.'
        ),
        'imageUrl': '',
        'videoUrl': '',
        'timestamp': leak_report.observed_at.isoformat(),
        'meta': 'Live field signal',
        'pillLabel': leak_report.get_status_display(),
        'pillTone': leak_report.status,
    }


def _feed_items_for_section(page_section, request=None):
    limit = max(page_section.item_limit, 1)

    if page_section.source_type == PageSection.SourceType.LEAK_REPORTS:
        if request is None or not request.user.is_authenticated:
            return []
        return [
            _serialize_feed_item_from_leak_report(leak_report)
            for leak_report in LeakReport.objects.select_related('sensor').all()[:limit]
        ]

    if page_section.source_type == PageSection.SourceType.ANNOUNCEMENTS:
        return [
            _serialize_feed_item_from_announcement(announcement, request)
            for announcement in Announcement.objects.filter(is_active=True)[:limit]
        ]

    if page_section.source_type == PageSection.SourceType.PRODUCTS:
        return [
            _serialize_feed_item_from_product(product, request)
            for product in Product.objects.all()[:limit]
        ]

    if page_section.source_type == PageSection.SourceType.TEAM_MEMBERS:
        return [
            _serialize_feed_item_from_team_member(team_member, request)
            for team_member in TeamMember.objects.all()[:limit]
        ]

    return []


def _site_content_record():
    site_content, _ = SiteContent.objects.get_or_create(pk=1)
    return site_content


def _site_snapshot(request=None):
    site_content = _site_content_record()
    highlights = {
        page: []
        for page, _ in SiteHighlight.Page.choices
    }
    sections = {
        page: []
        for page, _ in PageSection.Page.choices
    }

    for site_highlight in SiteHighlight.objects.all():
        highlights[site_highlight.page].append(
            _serialize_site_highlight(site_highlight)
        )

    for page_section in (
        PageSection.objects.filter(is_active=True)
        .prefetch_related('cards')
        .all()
    ):
        serialized_section = _serialize_page_section(page_section)

        if page_section.section_kind == PageSection.Kind.FEED:
            serialized_section['items'] = _feed_items_for_section(page_section, request)

        sections[page_section.page].append(serialized_section)

    return {
        **_serialize_site_content(site_content, request),
        'highlights': highlights,
        'sections': sections,
    }


def _validate_managed_account_password(password):
    errors = []

    if len(password) < 8:
        errors.append('Password must be at least 8 characters long.')

    if password.isdigit():
        errors.append('Password cannot be entirely numeric.')

    return errors


def _create_user_from_payload(payload, role='user', strict_password_validation=True):
    normalized_role = (role or '').strip().lower()
    username = payload.get('username', '').strip()
    email = payload.get('email', '').strip().lower()
    full_name = payload.get('fullName', '').strip()
    password = payload.get('password', '')
    confirm_password = payload.get('confirmPassword', password)
    errors = {}

    if not username:
        errors['username'] = ['This field is required.']
    elif User.objects.filter(username__iexact=username).exists():
        errors['username'] = ['A user with that username already exists.']

    if not email:
        errors['email'] = ['This field is required.']
    elif User.objects.filter(email__iexact=email).exists():
        errors['email'] = ['A user with that email already exists.']

    if not full_name:
        errors['fullName'] = ['This field is required.']

    if not password:
        errors['password'] = ['This field is required.']
    elif password != confirm_password:
        errors['confirmPassword'] = ['Passwords do not match.']

    if not normalized_role:
        errors['role'] = ['Select either user or admin.']
    elif normalized_role not in {'user', 'admin'}:
        errors['role'] = ['Role must be either user or admin.']

    first_name, last_name = _split_full_name(full_name)
    user = User(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )

    if password:
        if strict_password_validation:
            try:
                validate_password(password, user)
            except ValidationError as error:
                errors['password'] = error.messages
        else:
            managed_password_errors = _validate_managed_account_password(password)
            if managed_password_errors:
                errors['password'] = managed_password_errors

    if errors:
        return None, JsonResponse({'errors': errors}, status=400)

    user.set_password(password)
    user.is_staff = normalized_role == 'admin'
    user.is_superuser = normalized_role == 'admin'
    user.save()

    return user, None


def _update_user_from_payload(user, payload, *, acting_user=None):
    username = payload.get('username', user.username).strip()
    email = payload.get('email', user.email).strip().lower()
    full_name = payload.get('fullName', user.get_full_name() or user.username).strip()
    normalized_role = _normalized_role(payload.get('role') or _user_role(user))
    password = payload.get('password')
    errors = {}

    if not username:
        errors['username'] = ['This field is required.']
    elif User.objects.filter(username__iexact=username).exclude(pk=user.pk).exists():
        errors['username'] = ['A user with that username already exists.']

    if not email:
        errors['email'] = ['This field is required.']
    elif User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
        errors['email'] = ['A user with that email already exists.']

    if not full_name:
        errors['fullName'] = ['This field is required.']

    if not normalized_role:
        errors['role'] = ['Select either user or admin.']
    elif normalized_role not in {'user', 'admin'}:
        errors['role'] = ['Role must be either user or admin.']
    elif (
        acting_user is not None
        and user.pk == acting_user.pk
        and normalized_role != 'admin'
    ):
        errors['role'] = ['You cannot remove your own admin access from the workspace.']

    if password not in (None, ''):
        managed_password_errors = _validate_managed_account_password(password)
        if managed_password_errors:
            errors['password'] = managed_password_errors

    if errors:
        return None, JsonResponse({'errors': errors}, status=400)

    first_name, last_name = _split_full_name(full_name)
    user.username = username
    user.email = email
    user.first_name = first_name
    user.last_name = last_name
    user.is_staff = normalized_role == 'admin'
    user.is_superuser = normalized_role == 'admin'

    if password not in (None, ''):
        user.set_password(password)

    user.save()

    return user, None


def _parse_display_order(value):
    if value in (None, ''):
        return TeamMember.objects.count() + 1, None

    try:
        display_order = int(value)
    except (TypeError, ValueError):
        return None, 'Display order must be a whole number.'

    if display_order < 0:
        return None, 'Display order cannot be negative.'

    return display_order, None


def _parse_non_negative_integer(
    value,
    default,
    *,
    label='Display order',
    minimum=0,
):
    if value in (None, ''):
        return default, None

    try:
        parsed_value = int(value)
    except (TypeError, ValueError):
        return None, f'{label} must be a whole number.'

    if parsed_value < minimum:
        if minimum == 0:
            return None, f'{label} cannot be negative.'
        return None, f'{label} must be at least {minimum}.'

    return parsed_value, None


def _parse_optional_boolean(value, default=None):
    if value in (None, ''):
        return default, None

    if isinstance(value, bool):
        return value, None

    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {'true', '1', 'yes', 'on'}:
            return True, None
        if normalized in {'false', '0', 'no', 'off'}:
            return False, None

    return None, 'Value must be true or false.'


def _parse_iot_leak_detected(value):
    if value in (None, ''):
        return None, None

    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {
            'leakage',
            'leak',
            'leak detected',
            'detected',
            'alarm',
        }:
            return True, None
        if normalized in {
            'no leakage',
            'no leak',
            'clear',
            'not detected',
            'safe',
        }:
            return False, None

    return _parse_optional_boolean(value)


def _parse_iot_location(value):
    if value in (None, ''):
        return None, None

    if not isinstance(value, str):
        return None, 'Location must be plain text.'

    location = value.strip()
    return location or None, None


def _parse_product_display_order(value, existing_product=None):
    if value in (None, ''):
        if existing_product is not None:
            return existing_product.display_order, None
        return Product.objects.count() + 1, None

    try:
        display_order = int(value)
    except (TypeError, ValueError):
        return None, 'Display order must be a whole number.'

    if display_order < 0:
        return None, 'Display order cannot be negative.'

    return display_order, None


def _parse_announcement_display_order(value, existing_announcement=None):
    if value in (None, ''):
        if existing_announcement is not None:
            return existing_announcement.display_order, None
        return Announcement.objects.count() + 1, None

    try:
        display_order = int(value)
    except (TypeError, ValueError):
        return None, 'Display order must be a whole number.'

    if display_order < 0:
        return None, 'Display order cannot be negative.'

    return display_order, None


def _normalized_sensor_code(value):
    return (value or '').strip().upper()


def _parse_sensor_reference(payload):
    sensor_id = payload.get('sensorId')
    sensor_code = _normalized_sensor_code(payload.get('sensorCode'))

    if sensor_id not in (None, ''):
        try:
            return Sensor.objects.get(pk=int(sensor_id)), None
        except (TypeError, ValueError):
            return None, 'System selection is invalid.'
        except Sensor.DoesNotExist:
            return None, 'Select a registered system before publishing telemetry.'

    if sensor_code:
        try:
            return Sensor.objects.get(sensor_code__iexact=sensor_code), None
        except Sensor.DoesNotExist:
            return None, 'This system is not registered yet. Add it in the workspace first.'

    return None, 'Select or provide a registered system.'


def _parse_leak_report_display_order(value, existing_leak_report=None):
    if value in (None, ''):
        if existing_leak_report is not None:
            return existing_leak_report.display_order, None
        return LeakReport.objects.count() + 1, None

    try:
        display_order = int(value)
    except (TypeError, ValueError):
        return None, 'Display order must be a whole number.'

    if display_order < 0:
        return None, 'Display order cannot be negative.'

    return display_order, None


def _parse_observed_at(value):
    if value in (None, ''):
        return timezone.now(), None

    observed_at = parse_datetime(value)
    if observed_at is None:
        return None, 'Observed time must be a valid date and time.'

    if timezone.is_naive(observed_at):
        observed_at = timezone.make_aware(observed_at, timezone.get_current_timezone())

    return observed_at, None


def _prepare_site_highlights(highlights_payload):
    if not isinstance(highlights_payload, dict):
        return None, {
            'highlights': ['Highlights payload must be an object keyed by page.'],
        }

    valid_pages = {page for page, _ in SiteHighlight.Page.choices}
    prepared_highlights = {}
    errors = {}

    for page, items in highlights_payload.items():
        if page not in valid_pages:
            errors.setdefault('highlights', []).append(
                f'Unsupported highlight page "{page}".',
            )
            continue

        if not isinstance(items, list):
            errors[f'highlights.{page}'] = ['Expected a list of highlights.']
            continue

        prepared_page_items = []
        for index, item in enumerate(items):
            if not isinstance(item, dict):
                errors[f'highlights.{page}.{index}'] = [
                    'Each highlight must be an object.',
                ]
                continue

            title = str(item.get('title') or '').strip()
            if not title:
                errors[f'highlights.{page}.{index}.title'] = ['This field is required.']
                continue

            display_order, display_order_error = _parse_non_negative_integer(
                item.get('displayOrder'),
                index + 1,
            )
            if display_order_error:
                errors[f'highlights.{page}.{index}.displayOrder'] = [
                    display_order_error,
                ]
                continue

            prepared_page_items.append(
                {
                    'title': title,
                    'description': str(item.get('description') or '').strip(),
                    'display_order': display_order,
                }
            )

        prepared_highlights[page] = prepared_page_items

    if errors:
        return None, errors

    return prepared_highlights, None


def _apply_site_highlights(prepared_highlights):
    for page, items in prepared_highlights.items():
        SiteHighlight.objects.filter(page=page).delete()
        for item in items:
            SiteHighlight.objects.create(page=page, **item)


def _prepare_site_sections(sections_payload):
    if not isinstance(sections_payload, dict):
        return None, {
            'sections': ['Sections payload must be an object keyed by page.'],
        }

    valid_pages = {page for page, _ in PageSection.Page.choices}
    prepared_sections = {}
    errors = {}

    for page, items in sections_payload.items():
        if page not in valid_pages:
            errors.setdefault('sections', []).append(
                f'Unsupported section page "{page}".',
            )
            continue

        if not isinstance(items, list):
            errors[f'sections.{page}'] = ['Expected a list of sections.']
            continue

        prepared_page_sections = []
        for index, item in enumerate(items):
            if not isinstance(item, dict):
                errors[f'sections.{page}.{index}'] = [
                    'Each section must be an object.',
                ]
                continue

            slot = str(item.get('slot') or '').strip()
            if not slot:
                errors[f'sections.{page}.{index}.slot'] = ['This field is required.']
                continue

            display_order, display_order_error = _parse_non_negative_integer(
                item.get('displayOrder'),
                index + 1,
            )
            if display_order_error:
                errors[f'sections.{page}.{index}.displayOrder'] = [
                    display_order_error,
                ]
                continue

            item_limit, item_limit_error = _parse_non_negative_integer(
                item.get('itemLimit'),
                5,
                label='Item limit',
                minimum=1,
            )
            if item_limit_error:
                errors[f'sections.{page}.{index}.itemLimit'] = [item_limit_error]
                continue

            is_active, is_active_error = _parse_optional_boolean(
                item.get('isActive'),
                True,
            )
            if is_active_error:
                errors[f'sections.{page}.{index}.isActive'] = [is_active_error]
                continue

            cards_payload = item.get('cards') or []
            if not isinstance(cards_payload, list):
                errors[f'sections.{page}.{index}.cards'] = ['Expected a list of cards.']
                continue

            prepared_cards = []
            for card_index, card_item in enumerate(cards_payload):
                if not isinstance(card_item, dict):
                    errors[f'sections.{page}.{index}.cards.{card_index}'] = [
                        'Each card must be an object.',
                    ]
                    continue

                card_key = str(card_item.get('key') or card_item.get('cardKey') or '').strip()
                if not card_key:
                    errors[
                        f'sections.{page}.{index}.cards.{card_index}.key'
                    ] = ['This field is required.']
                    continue

                card_display_order, card_display_order_error = _parse_non_negative_integer(
                    card_item.get('displayOrder'),
                    card_index + 1,
                )
                if card_display_order_error:
                    errors[
                        f'sections.{page}.{index}.cards.{card_index}.displayOrder'
                    ] = [card_display_order_error]
                    continue

                card_is_active, card_is_active_error = _parse_optional_boolean(
                    card_item.get('isActive'),
                    True,
                )
                if card_is_active_error:
                    errors[
                        f'sections.{page}.{index}.cards.{card_index}.isActive'
                    ] = [card_is_active_error]
                    continue

                prepared_cards.append(
                    {
                        'card_key': card_key,
                        'eyebrow': str(card_item.get('eyebrow') or '').strip(),
                        'title': str(card_item.get('title') or '').strip(),
                        'description': str(card_item.get('description') or '').strip(),
                        'tone': str(card_item.get('tone') or '').strip(),
                        'display_order': card_display_order,
                        'is_active': card_is_active,
                    }
                )

            prepared_page_sections.append(
                {
                    'slot': slot,
                    'audience': str(
                        item.get('audience') or PageSection.Audience.ALL
                    ).strip(),
                    'section_kind': str(
                        item.get('kind') or PageSection.Kind.CARDS
                    ).strip(),
                    'source_type': str(item.get('sourceType') or '').strip(),
                    'tab_label': str(item.get('tabLabel') or '').strip(),
                    'eyebrow': str(item.get('eyebrow') or '').strip(),
                    'title': str(item.get('title') or '').strip(),
                    'description': str(item.get('description') or '').strip(),
                    'cta_label': str(item.get('ctaLabel') or '').strip(),
                    'cta_link': str(item.get('ctaLink') or '').strip(),
                    'item_limit': item_limit,
                    'display_order': display_order,
                    'is_active': is_active,
                    'cards': prepared_cards,
                }
            )

        prepared_sections[page] = prepared_page_sections

    if errors:
        return None, errors

    return prepared_sections, None


def _apply_site_sections(prepared_sections):
    for page, sections in prepared_sections.items():
        PageSection.objects.filter(page=page).delete()
        for section_data in sections:
            cards = section_data.pop('cards')
            page_section = PageSection(page=page, **section_data)
            page_section.full_clean()
            page_section.save()

            for card_data in cards:
                page_section_card = PageSectionCard(section=page_section, **card_data)
                page_section_card.full_clean()
                page_section_card.save()


def _reset_site_content():
    site_content = _site_content_record()
    files_to_delete = [
        site_content.login_background_video,
        site_content.login_background_primary,
        site_content.login_background_secondary,
        site_content.workspace_background_video,
        site_content.workspace_background_primary,
        site_content.workspace_background_secondary,
    ]

    with transaction.atomic():
        SiteHighlight.objects.all().delete()
        PageSection.objects.all().delete()
        site_content.delete()

    for file_field in files_to_delete:
        _delete_uploaded_file(file_field)


def _require_admin_user(request):
    if not request.user.is_authenticated:
        return _json_error('Authentication required.', 401)

    if not (request.user.is_staff or request.user.is_superuser):
        return _json_error('Admin access required.', 403)

    return None


def _require_authenticated_user(request):
    if not request.user.is_authenticated:
        return _json_error('Authentication required.', 401)

    return None


@ensure_csrf_cookie
def auth_session_api(request):
    if request.method != 'GET':
        return _json_error('Method not allowed.', 405)

    return JsonResponse(
        {
            'csrfToken': get_token(request),
            'user': (
                _serialize_user(request.user)
                if request.user.is_authenticated
                else None
            ),
        }
    )


def login_api(request):
    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    payload, error_response = _parse_json_payload(request)
    if error_response:
        return error_response

    username = payload.get('username', '').strip()
    password = payload.get('password', '')
    requested_role = _normalized_role(payload.get('role'))

    if not requested_role:
        return JsonResponse(
            {'errors': {'role': ['Select either user or admin.']}},
            status=400,
        )

    if requested_role not in {'user', 'admin'}:
        return JsonResponse(
            {'errors': {'role': ['Role must be either user or admin.']}},
            status=400,
        )

    user = authenticate(request, username=username, password=password)

    if user is None:
        return _json_error('Invalid username or password.', 400)

    actual_role = _user_role(user)
    if requested_role != actual_role:
        return _json_error(
            f'This account signs in as {actual_role}. Select the {actual_role} role to continue.',
            400,
        )

    login(request, user)

    return JsonResponse(
        {
            'message': 'Login successful.',
            'user': _serialize_user(user),
        }
    )


def signup_api(request):
    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    payload, error_response = _parse_json_payload(request)
    if error_response:
        return error_response

    requested_role = _normalized_role(payload.get('role'))
    if not requested_role:
        return JsonResponse(
            {'errors': {'role': ['Select either user or admin.']}},
            status=400,
        )

    user, create_error = _create_user_from_payload(
        payload,
        role=requested_role,
        strict_password_validation=False,
    )
    if create_error:
        return create_error

    login(request, user)

    return JsonResponse(
        {
            'message': 'Account created successfully.',
            'user': _serialize_user(user),
        },
        status=201,
    )


def logout_api(request):
    if request.method == 'GET':
        logout(request)
        return HttpResponseRedirect(request.GET.get('next') or '/')

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    logout(request)

    return JsonResponse({'message': 'Logged out successfully.'})


def account_availability_api(request):
    if request.method != 'GET':
        return _json_error('Method not allowed.', 405)

    username = request.GET.get('username', '').strip()
    email = request.GET.get('email', '').strip().lower()

    username_taken = (
        User.objects.filter(username__iexact=username).exists() if username else False
    )
    email_taken = (
        User.objects.filter(email__iexact=email).exists() if email else False
    )

    return JsonResponse(
        {
            'username': {
                'available': not username_taken,
                'message': (
                    'Username is available.'
                    if username and not username_taken
                    else 'A user with that username already exists.'
                    if username_taken
                    else ''
                ),
            },
            'email': {
                'available': not email_taken,
                'message': (
                    'Email is available.'
                    if email and not email_taken
                    else 'A user with that email already exists.'
                    if email_taken
                    else ''
                ),
            },
        }
    )


def users_api(request):
    admin_error = _require_admin_user(request)
    if admin_error:
        return admin_error

    if request.method == 'GET':
        users = [
            _serialize_user(user)
            for user in User.objects.order_by('-date_joined')
        ]
        return JsonResponse({'users': users})

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    payload, error_response = _parse_json_payload(request)
    if error_response:
        return error_response

    user, create_error = _create_user_from_payload(
        payload,
        role=_normalized_role(payload.get('role')) or 'admin',
        strict_password_validation=False,
    )
    if create_error:
        return create_error

    return JsonResponse(
        {
            'message': 'Account created successfully.',
            'user': _serialize_user(user),
        },
        status=201,
    )


def user_detail_api(request, user_id):
    admin_error = _require_admin_user(request)
    if admin_error:
        return admin_error

    try:
        managed_user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return _json_error('Account not found.', 404)

    if request.method == 'DELETE':
        if managed_user.pk == request.user.pk:
            return _json_error(
                'You cannot delete your own active admin account from the workspace.',
                400,
            )

        managed_user.delete()
        return JsonResponse({'message': 'Account deleted successfully.'})

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    payload, error_response = _parse_json_payload(request)
    if error_response:
        return error_response

    updated_user, update_error = _update_user_from_payload(
        managed_user,
        payload,
        acting_user=request.user,
    )
    if update_error:
        return update_error

    if updated_user.pk == request.user.pk and payload.get('password') not in (None, ''):
        update_session_auth_hash(request, updated_user)

    return JsonResponse(
        {
            'message': 'Account updated successfully.',
            'user': _serialize_user(updated_user),
        }
    )


def password_change_api(request):
    authenticated_error = _require_authenticated_user(request)
    if authenticated_error:
        return authenticated_error

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    payload, error_response = _parse_json_payload(request)
    if error_response:
        return error_response

    current_password = payload.get('currentPassword', '')
    new_password = payload.get('newPassword', '')
    confirm_password = payload.get('confirmPassword', '')
    errors = {}

    if not current_password:
        errors['currentPassword'] = ['This field is required.']
    elif not request.user.check_password(current_password):
        errors['currentPassword'] = ['Current password is incorrect.']

    if not new_password:
        errors['newPassword'] = ['This field is required.']
    elif current_password and current_password == new_password:
        errors['newPassword'] = [
            'Choose a password that is different from your current password.',
        ]
    else:
        try:
            validate_password(new_password, request.user)
        except ValidationError as error:
            errors['newPassword'] = error.messages

    if not confirm_password:
        errors['confirmPassword'] = ['This field is required.']
    elif new_password != confirm_password:
        errors['confirmPassword'] = ['Passwords do not match.']

    if errors:
        return JsonResponse({'errors': errors}, status=400)

    request.user.set_password(new_password)
    request.user.save(update_fields=['password'])
    update_session_auth_hash(request, request.user)

    return JsonResponse(
        {
            'message': 'Password changed successfully.',
            'user': _serialize_user(request.user),
        }
    )


def sensors_api(request):
    if request.method == 'GET':
        return JsonResponse(_sensor_snapshot())

    admin_error = _require_admin_user(request)
    if admin_error:
        return admin_error

    if request.method == 'DELETE':
        payload, error_response = _parse_json_payload(request)
        if error_response:
            return error_response

        sensor_id = payload.get('id')
        try:
            sensor = Sensor.objects.get(pk=int(sensor_id))
        except (TypeError, ValueError):
            return JsonResponse({'errors': {'id': ['System is invalid.']}}, status=400)
        except Sensor.DoesNotExist:
            return _json_error('System not found.', 404)

        try:
            sensor.delete()
        except ProtectedError:
            return _json_error(
                'Delete linked leak signals first, or deactivate the system instead.',
                400,
            )

        return JsonResponse({'message': 'System deleted successfully.'})

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    payload, error_response = _parse_json_payload(request)
    if error_response:
        return error_response

    sensor_id = payload.get('id')
    existing_sensor = None
    if sensor_id not in (None, ''):
        try:
            existing_sensor = Sensor.objects.get(pk=int(sensor_id))
        except (TypeError, ValueError):
            return JsonResponse({'errors': {'id': ['System is invalid.']}}, status=400)
        except Sensor.DoesNotExist:
            return _json_error('System not found.', 404)

    sensor_code = _normalized_sensor_code(payload.get('sensorCode'))
    display_name = payload.get('displayName', '').strip()
    location = payload.get('location', '').strip()
    description = payload.get('description', '').strip()
    is_active, is_active_error = _parse_optional_boolean(
        payload.get('isActive'),
        existing_sensor.is_active if existing_sensor is not None else True,
    )
    errors = {}

    if not sensor_code:
        errors['sensorCode'] = ['This field is required.']
    elif Sensor.objects.filter(sensor_code__iexact=sensor_code).exclude(
        pk=existing_sensor.pk if existing_sensor is not None else None
    ).exists():
        errors['sensorCode'] = ['A system with that code already exists.']

    if not display_name:
        errors['displayName'] = ['This field is required.']

    if not location:
        errors['location'] = ['This field is required.']

    if is_active_error:
        errors['isActive'] = [is_active_error]

    if errors:
        return JsonResponse({'errors': errors}, status=400)

    sensor = existing_sensor or Sensor()
    sensor.sensor_code = sensor_code
    sensor.display_name = display_name
    sensor.location = location
    sensor.description = description
    sensor.is_active = bool(is_active)

    try:
        sensor.full_clean()
    except ValidationError as error:
        return JsonResponse({'errors': error.message_dict}, status=400)

    sensor.save()

    return JsonResponse(
        {
            'message': (
                'System updated successfully.'
                if existing_sensor is not None
                else 'System registered successfully.'
            ),
            'sensor': _serialize_sensor(sensor),
        },
        status=200 if existing_sensor is not None else 201,
    )


def site_content_api(request):
    if request.method == 'GET':
        return JsonResponse(_site_snapshot(request))

    admin_error = _require_admin_user(request)
    if admin_error:
        return admin_error

    if request.method == 'DELETE':
        _reset_site_content()
        return JsonResponse(
            {
                'message': 'Site content reset successfully.',
                'siteContent': _site_snapshot(request),
            }
        )

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    if (request.content_type or '').startswith('multipart/form-data'):
        payload = request.POST
    else:
        payload, error_response = _parse_json_payload(request)
        if error_response:
            return error_response

    site_content = _site_content_record()
    highlights_payload, highlight_parse_errors = _parse_embedded_json_field(
        payload,
        'highlights',
    )
    sections_payload, section_parse_errors = _parse_embedded_json_field(
        payload,
        'sections',
    )

    prepared_highlights = None
    prepared_sections = None
    files_to_delete = []
    errors = {}

    if highlight_parse_errors:
        errors.update(highlight_parse_errors)

    if section_parse_errors:
        errors.update(section_parse_errors)

    if highlights_payload is not None:
        prepared_highlights, highlight_errors = _prepare_site_highlights(
            highlights_payload,
        )
        if highlight_errors:
            errors.update(highlight_errors)

    if sections_payload is not None:
        prepared_sections, section_errors = _prepare_site_sections(
            sections_payload,
        )
        if section_errors:
            errors.update(section_errors)

    for field in SITE_CONTENT_FIELDS:
        if field not in payload:
            continue

        value = payload.get(field, '')
        if isinstance(value, str):
            setattr(site_content, field, value.strip())
        else:
            setattr(site_content, field, value)

    media_field_specs = (
        ('loginBackgroundVideo', 'login_background_video', 'clearLoginBackgroundVideo'),
        ('loginBackgroundPrimary', 'login_background_primary', 'clearLoginBackgroundPrimary'),
        ('loginBackgroundSecondary', 'login_background_secondary', 'clearLoginBackgroundSecondary'),
        (
            'workspaceBackgroundVideo',
            'workspace_background_video',
            'clearWorkspaceBackgroundVideo',
        ),
        (
            'workspaceBackgroundPrimary',
            'workspace_background_primary',
            'clearWorkspaceBackgroundPrimary',
        ),
        (
            'workspaceBackgroundSecondary',
            'workspace_background_secondary',
            'clearWorkspaceBackgroundSecondary',
        ),
    )

    for upload_field, model_field, clear_field in media_field_specs:
        uploaded_file = request.FILES.get(upload_field)
        clear_requested, clear_error = _parse_optional_boolean(
            payload.get(clear_field),
            False,
        )

        if clear_error:
            errors[clear_field] = [clear_error]
            continue

        if uploaded_file is not None and upload_field in {
            'loginBackgroundVideo',
            'workspaceBackgroundVideo',
        }:
            video_error = _validate_browser_video_upload(
                uploaded_file,
                field_name=upload_field,
                label='Background video',
            )
            if video_error:
                errors.update(video_error)
                continue

        if not clear_requested and uploaded_file is None:
            continue

        existing_file = getattr(site_content, model_field)
        if existing_file:
            files_to_delete.append(existing_file)

        if uploaded_file is not None:
            setattr(site_content, model_field, uploaded_file)
        else:
            setattr(site_content, model_field, None)

    if errors:
        return JsonResponse({'errors': errors}, status=400)

    try:
        site_content.full_clean()
    except ValidationError as error:
        return JsonResponse({'errors': error.message_dict}, status=400)

    try:
        with transaction.atomic():
            site_content.save()
            if prepared_highlights is not None:
                _apply_site_highlights(prepared_highlights)
            if prepared_sections is not None:
                _apply_site_sections(prepared_sections)
        for old_file in files_to_delete:
            _delete_uploaded_file(old_file)
    except ValidationError as error:
        return JsonResponse(
            {'errors': {'sections': error.messages or ['Invalid site section payload.']}},
            status=400,
        )

    return JsonResponse(
        {
            'message': 'Site content saved successfully.',
            'siteContent': _site_snapshot(request),
        }
    )


def announcements_api(request):
    if request.method == 'GET':
        return JsonResponse(_announcements_snapshot(request))

    admin_error = _require_admin_user(request)
    if admin_error:
        return admin_error

    if request.method == 'DELETE':
        payload, error_response = _parse_json_payload(request)
        if error_response:
            return error_response

        announcement_id = payload.get('id')
        try:
            announcement = Announcement.objects.get(pk=int(announcement_id))
        except (TypeError, ValueError):
            return JsonResponse(
                {'errors': {'id': ['Announcement is invalid.']}},
                status=400,
            )
        except Announcement.DoesNotExist:
            return _json_error('Announcement not found.', 404)

        _delete_uploaded_file(announcement.image)
        _delete_uploaded_file(announcement.video)
        announcement.delete()

        return JsonResponse({'message': 'Announcement deleted successfully.'})

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    if (request.content_type or '').startswith('multipart/form-data'):
        payload = request.POST
        uploaded_image = request.FILES.get('image')
        uploaded_video = request.FILES.get('video')
    else:
        payload, error_response = _parse_json_payload(request)
        if error_response:
            return error_response
        uploaded_image = None
        uploaded_video = None

    announcement_id = payload.get('id')
    existing_announcement = None
    if announcement_id not in (None, ''):
        try:
            existing_announcement = Announcement.objects.get(pk=int(announcement_id))
        except (TypeError, ValueError):
            return JsonResponse(
                {'errors': {'id': ['Announcement is invalid.']}},
                status=400,
            )
        except Announcement.DoesNotExist:
            return _json_error('Announcement not found.', 404)

    display_order, display_order_error = _parse_announcement_display_order(
        payload.get('displayOrder'),
        existing_announcement,
    )
    if display_order_error:
        return JsonResponse(
            {'errors': {'displayOrder': [display_order_error]}},
            status=400,
        )

    is_active, is_active_error = _parse_optional_boolean(
        payload.get('isActive'),
        existing_announcement.is_active if existing_announcement is not None else True,
    )
    if is_active_error:
        return JsonResponse({'errors': {'isActive': [is_active_error]}}, status=400)

    announcement = existing_announcement or Announcement()
    announcement.kind = payload.get('kind', Announcement.Kind.ANNOUNCEMENT)
    announcement.title = payload.get('title', '').strip()
    announcement.message = payload.get('message', '').strip()
    announcement.cta_label = payload.get('ctaLabel', '').strip()
    announcement.cta_link = payload.get('ctaLink', '').strip()
    announcement.display_order = display_order
    announcement.is_active = bool(is_active)

    if (
        uploaded_image is None
        and uploaded_video is None
        and not announcement.image
        and not announcement.video
    ):
        return JsonResponse(
            {'errors': {'image': ['Upload an image or video before publishing.']}},
            status=400,
        )

    video_error = _validate_browser_video_upload(
        uploaded_video,
        field_name='video',
        label='Announcement video',
    )
    if video_error:
        return JsonResponse({'errors': video_error}, status=400)

    if uploaded_image is not None:
        announcement.image = uploaded_image
    if uploaded_video is not None:
        announcement.video = uploaded_video

    try:
        announcement.full_clean()
    except ValidationError as error:
        return JsonResponse({'errors': error.message_dict}, status=400)

    announcement.save()

    return JsonResponse(
        {
            'message': (
                'Announcement updated successfully.'
                if existing_announcement is not None
                else 'Announcement saved successfully.'
            ),
            'announcement': _serialize_announcement(announcement, request),
        },
        status=200 if existing_announcement is not None else 201,
    )


def leak_reports_api(request):
    if request.method == 'GET':
        if not request.user.is_authenticated:
            return JsonResponse(_restricted_leak_reports_snapshot())
        return JsonResponse(_leak_reports_snapshot())

    admin_error = _require_admin_user(request)
    if admin_error:
        return admin_error

    if request.method == 'DELETE':
        payload, error_response = _parse_json_payload(request)
        if error_response:
            return error_response

        leak_report_id = payload.get('id')
        try:
            leak_report = LeakReport.objects.get(pk=int(leak_report_id))
        except (TypeError, ValueError):
            return JsonResponse(
                {'errors': {'id': ['Leak signal is invalid.']}},
                status=400,
            )
        except LeakReport.DoesNotExist:
            return _json_error('Leak signal not found.', 404)

        leak_report.delete()
        return JsonResponse({'message': 'Leak signal deleted successfully.'})

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    payload, error_response = _parse_json_payload(request)
    if error_response:
        return error_response

    leak_report_id = payload.get('id')
    existing_leak_report = None
    if leak_report_id not in (None, ''):
        try:
            existing_leak_report = LeakReport.objects.get(pk=int(leak_report_id))
        except (TypeError, ValueError):
            return JsonResponse(
                {'errors': {'id': ['Leak signal is invalid.']}},
                status=400,
            )
        except LeakReport.DoesNotExist:
            return _json_error('Leak signal not found.', 404)

    sensor, sensor_error = _parse_sensor_reference(payload)
    if sensor_error:
        return JsonResponse({'errors': {'sensorId': [sensor_error]}}, status=400)

    display_order, display_order_error = _parse_leak_report_display_order(
        payload.get('displayOrder'),
        existing_leak_report,
    )
    if display_order_error:
        return JsonResponse(
            {'errors': {'displayOrder': [display_order_error]}},
            status=400,
        )

    observed_at, observed_at_error = _parse_observed_at(payload.get('observedAt'))
    if observed_at_error:
        return JsonResponse(
            {'errors': {'observedAt': [observed_at_error]}},
            status=400,
        )

    is_active, is_active_error = _parse_optional_boolean(
        payload.get('isActive'),
        existing_leak_report.is_active if existing_leak_report is not None else True,
    )
    if is_active_error:
        return JsonResponse({'errors': {'isActive': [is_active_error]}}, status=400)

    leak_report = existing_leak_report or LeakReport()
    leak_report.sensor = sensor
    leak_report.leakage_rate = payload.get('leakageRate', 0) or 0
    leak_report.status = payload.get('status', LeakReport.Status.INVESTIGATING)
    leak_report.observed_at = observed_at
    leak_report.display_order = display_order
    leak_report.is_active = bool(is_active)

    try:
        leak_report.full_clean()
    except ValidationError as error:
        return JsonResponse({'errors': error.message_dict}, status=400)

    leak_report.save()

    return JsonResponse(
        {
            'message': (
                'Leak signal updated successfully.'
                if existing_leak_report is not None
                else 'Leak signal saved successfully.'
            ),
            'leakReport': _serialize_leak_report(leak_report),
        },
        status=200 if existing_leak_report is not None else 201,
    )


@csrf_exempt
def iot_leak_reports_api(request):
    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    payload, error_response = _parse_json_payload(request)
    if error_response:
        return error_response

    sensor, sensor_error = _parse_sensor_reference(payload)
    if sensor_error:
        return JsonResponse({'errors': {'sensorCode': [sensor_error]}}, status=400)

    leak_detected, leak_detected_error = _parse_iot_leak_detected(
        payload.get('leakDetected')
    )
    if leak_detected_error:
        return JsonResponse(
            {'errors': {'leakDetected': [leak_detected_error]}},
            status=400,
        )

    display_order, display_order_error = _parse_leak_report_display_order(
        payload.get('displayOrder'),
    )
    if display_order_error:
        return JsonResponse(
            {'errors': {'displayOrder': [display_order_error]}},
            status=400,
        )

    observed_at_value = payload.get('observedAt')
    if observed_at_value in (None, ''):
        observed_at_value = payload.get('time')

    observed_at, observed_at_error = _parse_observed_at(observed_at_value)
    if observed_at_error:
        return JsonResponse(
            {'errors': {'observedAt': [observed_at_error]}},
            status=400,
        )

    location, location_error = _parse_iot_location(payload.get('location'))
    if location_error:
        return JsonResponse(
            {'errors': {'location': [location_error]}},
            status=400,
        )

    status = payload.get('status')
    if isinstance(status, str):
        status = status.strip().lower()
    if status in (None, ''):
        if leak_detected is True:
            status = LeakReport.Status.CRITICAL
        elif leak_detected is False:
            status = LeakReport.Status.RESOLVED
        else:
            status = LeakReport.Status.INVESTIGATING
    elif leak_detected is False and status != LeakReport.Status.RESOLVED:
        return JsonResponse(
            {
                'errors': {
                    'status': [
                        'Status must be resolved when leakDetected indicates no leakage.'
                    ]
                }
            },
            status=400,
        )
    elif leak_detected is True and status == LeakReport.Status.RESOLVED:
        return JsonResponse(
            {
                'errors': {
                    'status': [
                        'Status cannot be resolved when leakDetected indicates leakage.'
                    ]
                }
            },
            status=400,
        )

    is_active, is_active_error = _parse_optional_boolean(
        payload.get('isActive'),
        status != LeakReport.Status.RESOLVED,
    )
    if is_active_error:
        return JsonResponse({'errors': {'isActive': [is_active_error]}}, status=400)
    if status == LeakReport.Status.RESOLVED and is_active:
        return JsonResponse(
            {
                'errors': {
                    'isActive': [
                        'Resolved telemetry cannot remain active.'
                    ]
                }
            },
            status=400,
        )

    leak_report = LeakReport(
        sensor=sensor,
        location=location or '',
        leakage_rate=payload.get('leakageRate', 0) or 0,
        status=status,
        observed_at=observed_at,
        display_order=display_order,
        is_active=bool(is_active),
    )

    try:
        leak_report.full_clean()
    except ValidationError as error:
        return JsonResponse({'errors': error.message_dict}, status=400)

    leak_report.save()

    return JsonResponse(
        {
            'message': 'IoT leak signal received successfully.',
            'leakReport': _serialize_leak_report(leak_report),
        },
        status=201,
    )


def team_members_api(request):
    if request.method == 'GET':
        return JsonResponse(_team_snapshot(request))

    admin_error = _require_admin_user(request)
    if admin_error:
        return admin_error

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    if (request.content_type or '').startswith('multipart/form-data'):
        payload = request.POST
        uploaded_photo = request.FILES.get('photo')
    else:
        payload, error_response = _parse_json_payload(request)
        if error_response:
            return error_response
        uploaded_photo = None

    display_order, display_order_error = _parse_display_order(
        payload.get('displayOrder'),
    )
    if display_order_error:
        return JsonResponse(
            {'errors': {'displayOrder': [display_order_error]}},
            status=400,
        )

    team_member = TeamMember(
        full_name=payload.get('fullName', '').strip(),
        role_title=payload.get('title', '').strip() or 'Team Member',
        bio=payload.get('bio', '').strip(),
        display_order=display_order,
    )

    if uploaded_photo is None:
        return JsonResponse(
            {'errors': {'photo': ['Upload a profile photo before adding the team member.']}},
            status=400,
        )

    if uploaded_photo is not None:
        team_member.photo_url = uploaded_photo

    try:
        team_member.full_clean()
    except ValidationError as error:
        return JsonResponse({'errors': error.message_dict}, status=400)

    team_member.save()

    return JsonResponse(
        {
            'message': 'Team member added successfully.',
            'teamMember': _serialize_team_member(team_member, request),
        },
        status=201,
    )


def team_member_detail_api(request, member_id):
    admin_error = _require_admin_user(request)
    if admin_error:
        return admin_error

    try:
        team_member = TeamMember.objects.get(pk=member_id)
    except TeamMember.DoesNotExist:
        return _json_error('Team member not found.', 404)

    if request.method == 'DELETE':
        _delete_uploaded_file(team_member.photo_url)
        team_member.delete()
        return JsonResponse({'message': 'Team member deleted successfully.'})

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    if not (request.content_type or '').startswith('multipart/form-data'):
        return JsonResponse(
            {'errors': {'photo': ['Submit the updated team member data as multipart form data.']}},
            status=400,
        )

    payload = request.POST
    uploaded_photo = request.FILES.get('photo')

    display_order, display_order_error = _parse_display_order(
        payload.get('displayOrder'),
    )
    if display_order_error:
        return JsonResponse(
            {'errors': {'displayOrder': [display_order_error]}},
            status=400,
        )

    full_name = payload.get('fullName', team_member.full_name).strip()
    role_title = payload.get('title', team_member.role_title).strip() or 'Team Member'
    bio = payload.get('bio', team_member.bio).strip()

    team_member.full_name = full_name
    team_member.role_title = role_title
    team_member.bio = bio
    team_member.display_order = display_order
    if uploaded_photo is not None:
        team_member.photo_url = uploaded_photo

    try:
        team_member.full_clean()
    except ValidationError as error:
        return JsonResponse({'errors': error.message_dict}, status=400)

    team_member.save()

    return JsonResponse(
        {
            'message': 'Team member updated successfully.',
            'teamMember': _serialize_team_member(team_member, request),
        }
    )


def products_api(request):
    if request.method == 'GET':
        return JsonResponse(_product_snapshot(request))

    admin_error = _require_admin_user(request)
    if admin_error:
        return admin_error

    if request.method == 'DELETE':
        payload, error_response = _parse_json_payload(request)
        if error_response:
            return error_response

        product_id = payload.get('id')
        try:
            product = Product.objects.get(pk=int(product_id))
        except (TypeError, ValueError):
            return JsonResponse({'errors': {'id': ['Product is invalid.']}}, status=400)
        except Product.DoesNotExist:
            return _json_error('Product not found.', 404)

        _delete_uploaded_file(product.image)
        _delete_uploaded_file(product.video)
        product.delete()

        return JsonResponse({'message': 'Product deleted successfully.'})

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    if (request.content_type or '').startswith('multipart/form-data'):
        payload = request.POST
        uploaded_image = request.FILES.get('image')
        uploaded_video = request.FILES.get('video')
    else:
        payload, error_response = _parse_json_payload(request)
        if error_response:
            return error_response
        uploaded_image = None
        uploaded_video = None

    product_id = payload.get('id')
    existing_product = None
    if product_id not in (None, ''):
        try:
            existing_product = Product.objects.get(pk=int(product_id))
        except (TypeError, ValueError):
            return JsonResponse({'errors': {'id': ['Product is invalid.']}}, status=400)
        except Product.DoesNotExist:
            return _json_error('Product not found.', 404)

    product_name = payload.get('name', '').strip()
    if existing_product is None:
        existing_product = Product.objects.filter(name__iexact=product_name).first()

    display_order, display_order_error = _parse_product_display_order(
        payload.get('displayOrder'),
        existing_product,
    )
    if display_order_error:
        return JsonResponse(
            {'errors': {'displayOrder': [display_order_error]}},
            status=400,
        )

    product = existing_product or Product(name=product_name)
    product.name = product_name
    product.summary = payload.get('summary', '').strip()
    product.description = payload.get('description', '').strip()
    product.display_order = display_order

    if (
        uploaded_image is None
        and uploaded_video is None
        and not product.image
        and not product.video
    ):
        return JsonResponse(
            {'errors': {'image': ['Upload a product image or video before saving.']}},
            status=400,
        )

    video_error = _validate_browser_video_upload(
        uploaded_video,
        field_name='video',
        label='Product video',
    )
    if video_error:
        return JsonResponse({'errors': video_error}, status=400)

    if uploaded_image is not None:
        product.image = uploaded_image
    if uploaded_video is not None:
        product.video = uploaded_video

    try:
        product.full_clean()
    except ValidationError as error:
        return JsonResponse({'errors': error.message_dict}, status=400)

    product.save()

    return JsonResponse(
        {
            'message': (
                'Product updated successfully.'
                if existing_product is not None
                else 'Product saved successfully.'
            ),
            'product': _serialize_product(product, request),
        },
        status=200 if existing_product is not None else 201,
    )


def contact_messages_api(request):
    if request.method == 'GET':
        admin_error = _require_admin_user(request)
        if admin_error:
            return admin_error

        messages = list(ContactMessage.objects.all())
        return JsonResponse(
            {
                'summary': {
                    'totalMessages': len(messages),
                    'unreadMessages': sum(
                        1 for contact_message in messages if not contact_message.is_read
                    ),
                },
                'messages': [
                    _serialize_contact_message(contact_message)
                    for contact_message in messages
                ],
            }
        )

    if request.method == 'DELETE':
        admin_error = _require_admin_user(request)
        if admin_error:
            return admin_error

        payload, error_response = _parse_json_payload(request)
        if error_response:
            return error_response

        message_id = payload.get('id')
        try:
            contact_message = ContactMessage.objects.get(pk=int(message_id))
        except (TypeError, ValueError):
            return JsonResponse({'errors': {'id': ['Message is invalid.']}}, status=400)
        except ContactMessage.DoesNotExist:
            return _json_error('Contact message not found.', 404)

        contact_message.delete()
        return JsonResponse({'message': 'Contact message deleted successfully.'})

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    payload, error_response = _parse_json_payload(request)
    if error_response:
        return error_response

    if request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser):
        message_id = payload.get('messageId')
        if message_id not in (None, ''):
            try:
                contact_message = ContactMessage.objects.get(pk=int(message_id))
            except (TypeError, ValueError):
                return JsonResponse(
                    {'errors': {'messageId': ['Message is invalid.']}},
                    status=400,
                )
            except ContactMessage.DoesNotExist:
                return _json_error('Contact message not found.', 404)

            is_read, is_read_error = _parse_optional_boolean(payload.get('isRead'))
            if is_read_error:
                return JsonResponse({'errors': {'isRead': [is_read_error]}}, status=400)
            if is_read is None:
                return JsonResponse(
                    {'errors': {'isRead': ['Select whether the message is read.']}},
                    status=400,
                )

            contact_message.is_read = is_read
            contact_message.save(update_fields=['is_read'])

            return JsonResponse(
                {
                    'message': 'Contact message updated successfully.',
                    'contactMessage': _serialize_contact_message(contact_message),
                }
            )

    contact_message = ContactMessage(
        sender=request.user if request.user.is_authenticated else None,
        full_name=payload.get('fullName', '').strip(),
        email=payload.get('email', '').strip().lower(),
        subject=payload.get('subject', '').strip(),
        message=payload.get('message', '').strip(),
    )

    if request.user.is_authenticated:
        if not contact_message.full_name:
            contact_message.full_name = (
                request.user.get_full_name() or request.user.username
            )
        if not contact_message.email:
            contact_message.email = request.user.email

    try:
        contact_message.full_clean()
    except ValidationError as error:
        return JsonResponse({'errors': error.message_dict}, status=400)

    contact_message.save()

    return JsonResponse(
        {
            'message': 'Message sent successfully.',
            'contactMessage': _serialize_contact_message(contact_message),
        },
        status=201,
    )


def direct_messages_api(request):
    auth_error = _require_authenticated_user(request)
    if auth_error:
        return auth_error

    eligible_users = list(_eligible_direct_message_users(request.user))
    eligible_users_by_id = {user.id: user for user in eligible_users}
    default_recipient = _default_direct_message_recipient(
        request.user,
        eligible_users,
    )

    direct_messages = list(
        DirectMessage.objects.filter(
            Q(sender=request.user, recipient_id__in=eligible_users_by_id)
            | Q(recipient=request.user, sender_id__in=eligible_users_by_id)
        ).select_related('sender', 'recipient')
    )
    system_messages = []
    total_messages = len(direct_messages)

    if request.user.is_staff or request.user.is_superuser:
        system_messages = [
            _serialize_system_direct_message(direct_message)
            for direct_message in DirectMessage.objects.select_related(
                'sender',
                'recipient',
            ).order_by('-created_at', '-id')
        ]
        total_messages = len(system_messages)

    contact_summaries = {
        user.id: {
            'unread_messages': 0,
            'latest_message': '',
            'latest_message_at': None,
        }
        for user in eligible_users
    }

    for direct_message in direct_messages:
        other_user = (
            direct_message.recipient
            if direct_message.sender_id == request.user.id
            else direct_message.sender
        )
        summary = contact_summaries.get(other_user.id)
        if summary is None:
            continue

        if (
            direct_message.recipient_id == request.user.id
            and not direct_message.is_read
        ):
            summary['unread_messages'] += 1

        if (
            summary['latest_message_at'] is None
            or direct_message.created_at.isoformat() > summary['latest_message_at']
        ):
            summary['latest_message'] = direct_message.body
            summary['latest_message_at'] = direct_message.created_at.isoformat()

    contacts = [
        _serialize_direct_message_contact(user, contact_summaries[user.id])
        for user in eligible_users
    ]
    contacts.sort(
        key=lambda item: (
            item['latestMessageAt'] is None,
            -(get_time := int(timezone.datetime.fromisoformat(item['latestMessageAt'].replace('Z', '+00:00')).timestamp())) if item['latestMessageAt'] else 0,
            item['fullName'].lower(),
        )
    )

    participant_id = request.GET.get('participantId', '').strip()
    active_participant = None
    if participant_id:
        try:
            active_participant = eligible_users_by_id[int(participant_id)]
        except (TypeError, ValueError, KeyError):
            if default_recipient is not None:
                active_participant = default_recipient
            else:
                return _json_error('Conversation participant not found.', 404)
    elif contacts:
        active_participant = eligible_users_by_id.get(contacts[0]['id'])

    thread_messages = []
    if active_participant is not None:
        unread_ids = []
        for direct_message in direct_messages:
            if {
                direct_message.sender_id,
                direct_message.recipient_id,
            } == {request.user.id, active_participant.id}:
                thread_messages.append(
                    _serialize_direct_message(direct_message, request.user)
                )
                if (
                    direct_message.recipient_id == request.user.id
                    and not direct_message.is_read
                ):
                    unread_ids.append(direct_message.id)

        if unread_ids:
            DirectMessage.objects.filter(pk__in=unread_ids).update(is_read=True)
            unread_id_set = set(unread_ids)
            for message in thread_messages:
                if message['id'] in unread_id_set:
                    message['isRead'] = True
            for contact in contacts:
                if contact['id'] == active_participant.id:
                    contact['unreadMessages'] = 0
                    break

    if request.method == 'GET':
        return JsonResponse(
            {
                'summary': {
                    'totalContacts': len(contacts),
                    'unreadMessages': sum(
                        contact['unreadMessages'] for contact in contacts
                    ),
                    'totalMessages': total_messages,
                },
                'contacts': contacts,
                'activeParticipant': (
                    _serialize_user(active_participant)
                    if active_participant is not None
                    else None
                ),
                'messages': thread_messages,
                'systemMessages': system_messages,
            }
        )

    if request.method == 'DELETE':
        admin_error = _require_admin_user(request)
        if admin_error:
            return admin_error

        payload, error_response = _parse_json_payload(request)
        if error_response:
            return error_response

        message_id = payload.get('id')
        try:
            direct_message = DirectMessage.objects.get(pk=int(message_id))
        except (TypeError, ValueError):
            return JsonResponse({'errors': {'id': ['Message is invalid.']}}, status=400)
        except DirectMessage.DoesNotExist:
            return _json_error('Direct message not found.', 404)

        direct_message.delete()
        return JsonResponse({'message': 'Direct message deleted successfully.'})

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    payload, error_response = _parse_json_payload(request)
    if error_response:
        return error_response

    errors = {}

    recipient_id = payload.get('recipientId')
    if recipient_id:
        try:
            recipient_id = int(recipient_id)
        except (TypeError, ValueError):
            errors['recipientId'] = ['Recipient is invalid.']
    else:
        recipient_id = None

    body = payload.get('body', '').strip()
    if not body:
        errors['body'] = ['Enter a message before sending.']

    recipient = (
        eligible_users_by_id.get(recipient_id)
        if recipient_id is not None and not errors.get('recipientId')
        else None
    )
    if recipient is None and not errors.get('recipientId'):
        if default_recipient is not None:
            recipient = default_recipient
        else:
            errors['recipientId'] = ['Recipient is not available for direct messaging.']

    if errors:
        return JsonResponse({'errors': errors}, status=400)

    direct_message = DirectMessage.objects.create(
        sender=request.user,
        recipient=recipient,
        body=body,
    )

    return JsonResponse(
        {
            'message': 'Message sent successfully.',
            'directMessage': _serialize_direct_message(direct_message, request.user),
        },
        status=201,
    )


@csrf_exempt
def launch_requests_api(request):
    if request.method == 'OPTIONS':
        return HttpResponse(status=204)

    if request.method == 'GET':
        return JsonResponse(
            {
                **_launch_dashboard(),
                'requests': [
                    _serialize_request(launch_request)
                    for launch_request in LaunchRequest.objects.all()
                ],
            }
        )

    if request.method == 'DELETE':
        admin_error = _require_admin_user(request)
        if admin_error:
            return admin_error

        payload, error_response = _parse_json_payload(request)
        if error_response:
            return error_response

        request_id = payload.get('id')
        try:
            launch_request = LaunchRequest.objects.get(pk=int(request_id))
        except (TypeError, ValueError):
            return JsonResponse({'errors': {'id': ['Request is invalid.']}}, status=400)
        except LaunchRequest.DoesNotExist:
            return _json_error('Launch request not found.', 404)

        launch_request.delete()
        return JsonResponse({'message': 'Launch request deleted successfully.'})

    if request.method != 'POST':
        return _json_error('Method not allowed.', 405)

    payload, error_response = _parse_json_payload(request)
    if error_response:
        return error_response

    launch_request = LaunchRequest(
        full_name=payload.get('fullName', '').strip(),
        organization=payload.get('organization', '').strip(),
        email=payload.get('email', '').strip().lower(),
        focus_area=payload.get(
            'focusArea',
            LaunchRequest.FocusArea.LEAK_MONITORING,
        ),
    )

    try:
        launch_request.full_clean()
    except ValidationError as error:
        return JsonResponse({'errors': error.message_dict}, status=400)

    launch_request.save()

    return JsonResponse(
        {
            'id': launch_request.id,
            'message': 'Launch request saved.',
            'request': _serialize_request(launch_request),
        },
        status=201,
    )
