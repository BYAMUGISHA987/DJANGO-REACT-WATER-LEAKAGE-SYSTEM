from django.db import migrations, models


def seed_site_content(apps, schema_editor):
    SiteContent = apps.get_model('accounts', 'SiteContent')
    SiteHighlight = apps.get_model('accounts', 'SiteHighlight')

    SiteContent.objects.update_or_create(
        pk=1,
        defaults={
            'brand_name': 'Aqual Sentinel',
            'brand_tagline': 'Water operations, team presence, and admin workflow',
            'home_eyebrow': 'Dynamic operations platform',
            'home_title': 'Login, products, About Us, and admin publishing now live together.',
            'home_description': (
                'The public experience now includes a real product page, a live About '
                'Us roster, and a contact form. The private workspace keeps auth, '
                'launch requests, and administration in one place.'
            ),
            'about_eyebrow': 'About Us',
            'about_title': 'The team page now runs from live Django content.',
            'about_description': (
                'Aqual Sentinel now includes a real About Us page with a team roster, '
                'contact form, and admin-managed updates. Team members are stored in '
                'Django, and incoming messages are kept for review in the '
                'administration panel.'
            ),
            'products_eyebrow': 'Product page',
            'products_description': (
                'Aqua Sentinel system gives water operations teams a single place for '
                'monitoring, response coordination, and admin-controlled publishing.'
            ),
            'workspace_eyebrow': 'Authenticated workspace',
            'workspace_description_admin': (
                'You are signed in as an admin. The launch dashboard is live, the '
                'About Us page is powered by Django, and you can manage users, team '
                'members, products, and contact messages from this workspace.'
            ),
            'workspace_description_user': (
                'You are signed in as a user. The launch dashboard is live, the About '
                'Us page is powered by Django, and you can view the current operating '
                'picture and public site information.'
            ),
            'admin_note_title': 'Admin note',
            'admin_note_description': (
                'The seeded admin account exists in Django, but the frontend does not '
                'display any password. Admins can create more users, publish products, '
                'add team members, and review contact messages after sign-in.'
            ),
        },
    )

    seeded_highlights = [
        (
            'home',
            1,
            'Login and signup',
            'Visitors can create regular user accounts from the website and sign back in with the same interface.',
        ),
        (
            'home',
            2,
            'Product page',
            'A public products page now pulls the Aqua Sentinel system details from Django instead of fixed frontend text.',
        ),
        (
            'home',
            3,
            'About Us page',
            'The About Us page now pulls the team roster from Django instead of fixed frontend copy.',
        ),
        (
            'home',
            4,
            'Admin-managed content',
            'Admins can create users, add new team members with uploaded profile photos, and read contact messages from the workspace.',
        ),
        (
            'about',
            1,
            'Core team seeded',
            'The initial roster includes Byamugisha Octavious, Asiimwe Shanon, Ankunda Reavin, Patience, Bwambale Fedwin, and supervisor Mr. Ambrose Izaara.',
        ),
        (
            'about',
            2,
            'More members from admin',
            'Additional team members can be added later by an admin without editing the frontend code.',
        ),
        (
            'about',
            3,
            'Messages are stored',
            'Every contact form submission is persisted in Django and appears in both the workspace inbox and Django admin.',
        ),
        (
            'products',
            1,
            'Product content is dynamic',
            'The Aqua Sentinel system page now reads its name, summary, description, and image directly from Django.',
        ),
        (
            'products',
            2,
            'Admin-managed uploads',
            'Admins can browse for a product image from the workspace and publish it without editing the code.',
        ),
        (
            'products',
            3,
            'Built for operations teams',
            'The product page connects the platform story to live team visibility, launch intake, and administration workflows.',
        ),
        (
            'workspace',
            1,
            'Session-based authentication is handled by Django.',
            '',
        ),
        (
            'workspace',
            2,
            'The launch dashboard keeps refreshing from the backend every 30 seconds.',
            '',
        ),
        (
            'workspace',
            3,
            'The product page now reads uploaded images and product copy from Django.',
            '',
        ),
        (
            'workspace',
            4,
            'The About Us roster and contact inbox are both backed by Django models.',
            '',
        ),
    ]

    for page, display_order, title, description in seeded_highlights:
        SiteHighlight.objects.update_or_create(
            page=page,
            title=title,
            defaults={
                'description': description,
                'display_order': display_order,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0005_product'),
    ]

    operations = [
        migrations.CreateModel(
            name='SiteContent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('brand_name', models.CharField(default='Aqual Sentinel', max_length=120)),
                ('brand_tagline', models.CharField(default='Water operations, team presence, and admin workflow', max_length=220)),
                ('home_eyebrow', models.CharField(default='Dynamic operations platform', max_length=80)),
                ('home_title', models.CharField(default='Login, products, About Us, and admin publishing now live together.', max_length=220)),
                ('home_description', models.TextField(default='The public experience now includes a real product page, a live About Us roster, and a contact form. The private workspace keeps auth, launch requests, and administration in one place.')),
                ('about_eyebrow', models.CharField(default='About Us', max_length=80)),
                ('about_title', models.CharField(default='The team page now runs from live Django content.', max_length=220)),
                ('about_description', models.TextField(default='Aqual Sentinel now includes a real About Us page with a team roster, contact form, and admin-managed updates. Team members are stored in Django, and incoming messages are kept for review in the administration panel.')),
                ('products_eyebrow', models.CharField(default='Product page', max_length=80)),
                ('products_description', models.TextField(default='Aqua Sentinel system gives water operations teams a single place for monitoring, response coordination, and admin-controlled publishing.')),
                ('workspace_eyebrow', models.CharField(default='Authenticated workspace', max_length=80)),
                ('workspace_description_admin', models.TextField(default='You are signed in as an admin. The launch dashboard is live, the About Us page is powered by Django, and you can manage users, team members, products, and contact messages from this workspace.')),
                ('workspace_description_user', models.TextField(default='You are signed in as a user. The launch dashboard is live, the About Us page is powered by Django, and you can view the current operating picture and public site information.')),
                ('admin_note_title', models.CharField(default='Admin note', max_length=120)),
                ('admin_note_description', models.TextField(default='The seeded admin account exists in Django, but the frontend does not display any password. Admins can create more users, publish products, add team members, and review contact messages after sign-in.')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Site content',
                'verbose_name_plural': 'Site content',
            },
        ),
        migrations.CreateModel(
            name='SiteHighlight',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('page', models.CharField(choices=[('home', 'Home'), ('about', 'About'), ('products', 'Products'), ('workspace', 'Workspace')], max_length=24)),
                ('title', models.CharField(max_length=160)),
                ('description', models.TextField(blank=True)),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['page', 'display_order', 'title'],
            },
        ),
        migrations.RunPython(seed_site_content, migrations.RunPython.noop),
    ]
