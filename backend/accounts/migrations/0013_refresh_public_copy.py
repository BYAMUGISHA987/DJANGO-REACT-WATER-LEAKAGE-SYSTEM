from django.db import migrations


TEXT_REPLACEMENTS = (
    (
        'The team page now runs from live Django content.',
        'The team page now runs from live content.',
    ),
    (
        'Aqual Sentinel now includes a real About Us page with a team roster, contact form, and admin-managed updates. Team members are stored in Django, and incoming messages are kept for review in the administration panel.',
        'Aqual Sentinel now includes a real About Us page with a team roster, contact form, and admin-managed updates. Team members are managed from the workspace, and incoming messages are kept for review in the administration panel.',
    ),
    (
        'You are signed in as an admin. The launch dashboard is live, the About Us page is powered by Django, and you can manage system administrators, sensors, products, team members, and contact messages from this workspace.',
        'You are signed in as an admin. The launch dashboard is live, and you can manage system administrators, sensors, products, team members, and contact messages from this workspace.',
    ),
    (
        'You are signed in as a user. The launch dashboard is live, the About Us page is powered by Django, and you can view the current operating picture and public site information.',
        'You are signed in as a user. The launch dashboard is live, and you can view the current operating picture and public site information.',
    ),
    (
        'You are signed in as a user. Review the live leak board, public notices, and current operating picture published from Django.',
        'You are signed in as a user. Review the live leak board, public notices, and current operating picture published live.',
    ),
    (
        'The seeded admin account exists in Django, but the frontend does not display any password. Admins can create other system administrators, register sensors, publish products, add team members, and review contact messages after sign-in.',
        'The seeded admin account exists in the system, but the sign-in page does not display any password. Admins can create other system administrators, register sensors, publish products, add team members, and review contact messages after sign-in.',
    ),
    (
        'A public products page now pulls the Aqua Sentinel system details from Django instead of fixed frontend text.',
        'A public products page now pulls the Aqua Sentinel system details from live content instead of fixed page text.',
    ),
    (
        'The About Us page now pulls the team roster from Django instead of fixed frontend copy.',
        'The About Us page now pulls the team roster from live content instead of fixed page copy.',
    ),
    (
        'Every contact form submission is persisted in Django and appears in both the workspace inbox and Django admin.',
        'Every contact form submission is stored and appears in the workspace inbox for review.',
    ),
    (
        'The Aqua Sentinel system page now reads its name, summary, description, and image directly from Django.',
        'The Aqua Sentinel system page now reads its name, summary, description, and image from live content.',
    ),
    (
        'Session-based authentication is handled by Django.',
        'Session-based authentication is active for the workspace.',
    ),
    (
        'The product page now reads uploaded images and product copy from Django.',
        'The product page reads uploaded images and product copy from the workspace.',
    ),
    (
        'The About Us roster and contact inbox are both backed by Django models.',
        'The About Us roster and contact inbox stay connected to live records.',
    ),
    (
        'The product catalog is being published from Django.',
        'The product catalog is being published live.',
    ),
)


def rewrite_text(value):
    updated_value = value
    for old, new in TEXT_REPLACEMENTS:
        updated_value = updated_value.replace(old, new)
    return updated_value


def refresh_public_copy(apps, schema_editor):
    SiteContent = apps.get_model('accounts', 'SiteContent')
    SiteHighlight = apps.get_model('accounts', 'SiteHighlight')
    PageSection = apps.get_model('accounts', 'PageSection')
    PageSectionCard = apps.get_model('accounts', 'PageSectionCard')

    for content in SiteContent.objects.all():
        changed = False
        for field_name in (
            'about_title',
            'about_description',
            'workspace_description_admin',
            'workspace_description_user',
            'admin_note_description',
            'products_description',
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
        ('accounts', '0012_seed_additional_dynamic_sections'),
    ]

    operations = [
        migrations.RunPython(refresh_public_copy, migrations.RunPython.noop),
    ]
