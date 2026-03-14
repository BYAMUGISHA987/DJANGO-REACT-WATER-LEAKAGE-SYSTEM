from datetime import datetime, timezone

from django.db import migrations, models


def seed_operations_content(apps, schema_editor):
    Announcement = apps.get_model('accounts', 'Announcement')
    LeakReport = apps.get_model('accounts', 'LeakReport')
    SiteContent = apps.get_model('accounts', 'SiteContent')

    SiteContent.objects.update_or_create(
        pk=1,
        defaults={
            'home_title': 'IoT leak intelligence, public adverts, and admin publishing now run together.',
            'home_description': (
                'The public website now shows moving adverts, live leak telemetry, '
                'team content, and contact workflows. Admins publish everything from '
                'the workspace while visitors see the latest operational picture.'
            ),
            'workspace_description_admin': (
                'You are signed in as an admin. Publish adverts, update leak '
                'telemetry, manage accounts, review contact messages, and control '
                'what appears on the public website from this workspace.'
            ),
            'workspace_description_user': (
                'You are signed in as a user. Review the live leak board, public '
                'notices, and current operating picture published from Django.'
            ),
        },
    )

    seeded_announcements = [
        {
            'kind': 'advert',
            'title': 'Aqua Sentinel live monitoring rollout',
            'message': 'Deploy leak visibility, incident alerts, and field coordination from one dashboard built for utility teams.',
            'cta_label': 'Explore the platform',
            'cta_link': 'https://example.com/aqua-sentinel',
            'display_order': 1,
            'is_active': True,
        },
        {
            'kind': 'advert',
            'title': 'Smart field response for water networks',
            'message': 'Keep telemetry, team updates, and public communication moving together during active leakage events.',
            'cta_label': 'View product page',
            'cta_link': 'https://example.com/aqua-sentinel/product',
            'display_order': 2,
            'is_active': True,
        },
        {
            'kind': 'announcement',
            'title': 'Monitoring center now online',
            'message': 'The Aqua Sentinel monitoring center is now publishing live leak intelligence, public notices, and admin-managed team updates.',
            'display_order': 3,
            'is_active': True,
        },
        {
            'kind': 'announcement',
            'title': 'Utility response teams connected',
            'message': 'Operations leads can now review contact messages, update leak status, and publish notices from the web workspace.',
            'display_order': 4,
            'is_active': True,
        },
    ]

    for announcement_defaults in seeded_announcements:
        Announcement.objects.update_or_create(
            title=announcement_defaults['title'],
            defaults=announcement_defaults,
        )

    seeded_leak_reports = [
        {
            'sensor_name': 'North Trunk Sensor A1',
            'location': 'Makerere Hill reservoir line',
            'leakage_rate': '38.50',
            'status': 'critical',
            'observed_at': datetime(2026, 3, 11, 0, 30, tzinfo=timezone.utc),
            'display_order': 1,
            'is_active': True,
        },
        {
            'sensor_name': 'Pressure Node B4',
            'location': 'Ntinda distribution corridor',
            'leakage_rate': '16.20',
            'status': 'investigating',
            'observed_at': datetime(2026, 3, 10, 22, 45, tzinfo=timezone.utc),
            'display_order': 2,
            'is_active': True,
        },
        {
            'sensor_name': 'Southern Feed C2',
            'location': 'Kansanga booster outlet',
            'leakage_rate': '0.00',
            'status': 'resolved',
            'observed_at': datetime(2026, 3, 10, 20, 15, tzinfo=timezone.utc),
            'display_order': 3,
            'is_active': True,
        },
    ]

    for leak_defaults in seeded_leak_reports:
        LeakReport.objects.update_or_create(
            sensor_name=leak_defaults['sensor_name'],
            location=leak_defaults['location'],
            defaults=leak_defaults,
        )


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0006_sitecontent_sitehighlight'),
    ]

    operations = [
        migrations.CreateModel(
            name='Announcement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kind', models.CharField(choices=[('announcement', 'Announcement'), ('advert', 'Advert')], default='announcement', max_length=24)),
                ('title', models.CharField(max_length=180)),
                ('message', models.TextField()),
                ('image', models.FileField(blank=True, upload_to='announcements/')),
                ('cta_label', models.CharField(blank=True, max_length=60)),
                ('cta_link', models.URLField(blank=True)),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['display_order', '-created_at', 'title'],
            },
        ),
        migrations.CreateModel(
            name='LeakReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sensor_name', models.CharField(max_length=120)),
                ('location', models.CharField(max_length=180)),
                ('leakage_rate', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('status', models.CharField(choices=[('critical', 'Critical'), ('investigating', 'Investigating'), ('stable', 'Stable'), ('resolved', 'Resolved')], default='investigating', max_length=24)),
                ('observed_at', models.DateTimeField()),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['display_order', '-observed_at', 'sensor_name'],
            },
        ),
        migrations.RunPython(seed_operations_content, migrations.RunPython.noop),
    ]
