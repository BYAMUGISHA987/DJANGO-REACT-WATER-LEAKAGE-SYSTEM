from django.contrib.auth.hashers import make_password
from django.db import migrations


def seed_uadmin(apps, schema_editor):
    user_model = apps.get_model('auth', 'User')

    user, created = user_model.objects.get_or_create(
        username='uadmin',
        defaults={
            'email': 'uadmin@aqual.local',
            'first_name': 'Utility',
            'last_name': 'Admin',
            'is_active': True,
            'is_staff': True,
            'is_superuser': True,
            'password': make_password(None),
        },
    )

    if not created:
        changed = False

        if user.email != 'uadmin@aqual.local':
            user.email = 'uadmin@aqual.local'
            changed = True

        if user.first_name != 'Utility':
            user.first_name = 'Utility'
            changed = True

        if user.last_name != 'Admin':
            user.last_name = 'Admin'
            changed = True

        if not user.is_active:
            user.is_active = True
            changed = True

        if not user.is_staff:
            user.is_staff = True
            changed = True

        if not user.is_superuser:
            user.is_superuser = True
            changed = True

        if changed:
            user.save(
                update_fields=[
                    'email',
                    'first_name',
                    'last_name',
                    'is_active',
                    'is_staff',
                    'is_superuser',
                ]
            )


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0001_initial'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.RunPython(seed_uadmin, migrations.RunPython.noop),
    ]
