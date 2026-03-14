from django.db import migrations, models


TEAM_MEMBERS = [
    ('Byamugisha Octavious', 'Team Member', 1, 'Core Aqual Sentinel team member.'),
    ('Asiimwe Shanon', 'Team Member', 2, 'Core Aqual Sentinel team member.'),
    ('Ankunda Reavin', 'Team Member', 3, 'Core Aqual Sentinel team member.'),
    ('Patience', 'Team Member', 4, 'Core Aqual Sentinel team member.'),
    ('Bwambale Fedwin', 'Team Member', 5, 'Core Aqual Sentinel team member.'),
    ('Mr. Ambrose Izaara', 'Supervisor', 6, 'Project supervisor supporting the team.'),
]


def seed_team_members(apps, schema_editor):
    team_member_model = apps.get_model('accounts', 'TeamMember')

    for full_name, role_title, display_order, bio in TEAM_MEMBERS:
        team_member_model.objects.update_or_create(
            full_name=full_name,
            defaults={
                'role_title': role_title,
                'display_order': display_order,
                'bio': bio,
                'photo_url': '',
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0002_seed_uadmin'),
    ]

    operations = [
        migrations.CreateModel(
            name='ContactMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('full_name', models.CharField(max_length=120)),
                ('email', models.EmailField(max_length=254)),
                ('subject', models.CharField(max_length=160)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='TeamMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('full_name', models.CharField(max_length=120)),
                ('role_title', models.CharField(default='Team Member', max_length=120)),
                ('bio', models.TextField(blank=True)),
                ('photo_url', models.URLField(blank=True)),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['display_order', 'full_name'],
            },
        ),
        migrations.RunPython(seed_team_members, migrations.RunPython.noop),
    ]
