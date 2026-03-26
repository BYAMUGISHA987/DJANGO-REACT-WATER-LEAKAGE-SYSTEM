from django.db import migrations, models


TEXT_REPLACEMENTS = (
    ('system administrators, sensors,', 'system administrators, systems,'),
    ('register sensors,', 'register systems,'),
    ('Leak telemetry and sensor movement', 'Leak telemetry and system activity'),
)


def rewrite_text(value):
    updated_value = value
    for old, new in TEXT_REPLACEMENTS:
        updated_value = updated_value.replace(old, new)
    return updated_value


def refresh_system_terminology(apps, schema_editor):
    SiteContent = apps.get_model('accounts', 'SiteContent')
    SiteHighlight = apps.get_model('accounts', 'SiteHighlight')
    PageSection = apps.get_model('accounts', 'PageSection')
    PageSectionCard = apps.get_model('accounts', 'PageSectionCard')

    for content in SiteContent.objects.all():
        changed = False
        for field_name in (
            'home_title',
            'home_description',
            'about_title',
            'about_description',
            'products_description',
            'workspace_description_admin',
            'workspace_description_user',
            'admin_note_description',
        ):
            original_value = getattr(content, field_name)
            updated_value = rewrite_text(original_value)
            if updated_value != original_value:
                setattr(content, field_name, updated_value)
                changed = True
        if changed:
            content.save()

    for highlight in SiteHighlight.objects.all():
        changed = False
        for field_name in ('title', 'description'):
            original_value = getattr(highlight, field_name)
            updated_value = rewrite_text(original_value)
            if updated_value != original_value:
                setattr(highlight, field_name, updated_value)
                changed = True
        if changed:
            highlight.save()

    for section in PageSection.objects.all():
        changed = False
        for field_name in ('title', 'description'):
            original_value = getattr(section, field_name)
            updated_value = rewrite_text(original_value)
            if updated_value != original_value:
                setattr(section, field_name, updated_value)
                changed = True
        if changed:
            section.save()

    for card in PageSectionCard.objects.all():
        changed = False
        for field_name in ('title', 'description'):
            original_value = getattr(card, field_name)
            updated_value = rewrite_text(original_value)
            if updated_value != original_value:
                setattr(card, field_name, updated_value)
                changed = True
        if changed:
            card.save()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_directmessage'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sitecontent',
            name='workspace_description_admin',
            field=models.TextField(
                default='You are signed in as an admin. The launch dashboard is live, and you can manage system administrators, systems, team members, products, and contact messages from this workspace.',
            ),
        ),
        migrations.AlterField(
            model_name='sitecontent',
            name='admin_note_description',
            field=models.TextField(
                default='The seeded admin account exists in the system, but the sign-in page does not display any password. Admins can create other system administrators, register systems, publish products, add team members, and review contact messages after sign-in.',
            ),
        ),
        migrations.RunPython(
            refresh_system_terminology,
            migrations.RunPython.noop,
        ),
    ]
