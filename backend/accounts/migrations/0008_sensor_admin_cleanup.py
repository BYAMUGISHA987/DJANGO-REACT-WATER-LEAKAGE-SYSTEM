from django.db import migrations, models
from django.db.models import Q
from django.db.models.deletion import PROTECT
from django.utils.text import slugify


SEEDED_ANNOUNCEMENT_TITLES = [
    'Aqua Sentinel live monitoring rollout',
    'Smart field response for water networks',
    'Monitoring center now online',
    'Utility response teams connected',
]

SEEDED_LEAK_REPORTS = [
    ('North Trunk Sensor A1', 'Makerere Hill reservoir line'),
    ('Pressure Node B4', 'Ntinda distribution corridor'),
    ('Southern Feed C2', 'Kansanga booster outlet'),
]


def _build_unique_sensor_code(Sensor, display_name):
    base_code = slugify(display_name).upper()[:40] or 'SENSOR'
    candidate = base_code
    suffix = 2

    while Sensor.objects.filter(sensor_code__iexact=candidate).exists():
        candidate = f'{base_code}-{suffix}'
        suffix += 1

    return candidate


def migrate_leak_reports_to_sensors(apps, schema_editor):
    Announcement = apps.get_model('accounts', 'Announcement')
    LeakReport = apps.get_model('accounts', 'LeakReport')
    Sensor = apps.get_model('accounts', 'Sensor')
    SiteContent = apps.get_model('accounts', 'SiteContent')

    Announcement.objects.filter(title__in=SEEDED_ANNOUNCEMENT_TITLES).delete()

    seeded_query = Q()
    for sensor_name, location in SEEDED_LEAK_REPORTS:
        seeded_query |= Q(sensor_name=sensor_name, location=location)

    LeakReport.objects.filter(seeded_query).delete()

    for leak_report in LeakReport.objects.filter(sensor__isnull=True):
        sensor_name = (leak_report.sensor_name or '').strip()
        location = (leak_report.location or '').strip()

        if not sensor_name or not location:
            continue

        sensor = Sensor.objects.filter(
            display_name=sensor_name,
            location=location,
        ).first()

        if sensor is None:
            sensor = Sensor.objects.create(
                sensor_code=_build_unique_sensor_code(Sensor, sensor_name),
                display_name=sensor_name,
                location=location,
                description='Imported from an existing leak report.',
                is_active=True,
            )

        leak_report.sensor = sensor
        leak_report.save(update_fields=['sensor'])

    site_content = SiteContent.objects.filter(pk=1).first()
    if site_content is not None:
        if 'manage users' in site_content.workspace_description_admin.lower():
            site_content.workspace_description_admin = (
                'You are signed in as an admin. The launch dashboard is live, '
                'the About Us page is powered by Django, and you can manage '
                'system administrators, sensors, team members, products, and '
                'contact messages from this workspace.'
            )

        if 'create more users' in site_content.admin_note_description.lower():
            site_content.admin_note_description = (
                'The seeded admin account exists in Django, but the frontend '
                'does not display any password. Admins can create other system '
                'administrators, register sensors, publish products, add team '
                'members, and review contact messages after sign-in.'
            )

        site_content.save(
            update_fields=[
                'workspace_description_admin',
                'admin_note_description',
            ]
        )


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0007_announcement_leakreport'),
    ]

    operations = [
        migrations.CreateModel(
            name='Sensor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sensor_code', models.CharField(max_length=64, unique=True)),
                ('display_name', models.CharField(max_length=120)),
                ('location', models.CharField(max_length=180)),
                ('description', models.CharField(blank=True, max_length=220)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['display_name', 'sensor_code'],
            },
        ),
        migrations.AddField(
            model_name='leakreport',
            name='sensor',
            field=models.ForeignKey(blank=True, null=True, on_delete=PROTECT, related_name='leak_reports', to='accounts.sensor'),
        ),
        migrations.AlterField(
            model_name='leakreport',
            name='location',
            field=models.CharField(blank=True, max_length=180),
        ),
        migrations.AlterField(
            model_name='leakreport',
            name='sensor_name',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.RunPython(migrate_leak_reports_to_sensors, migrations.RunPython.noop),
    ]
