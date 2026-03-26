from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0016_refresh_system_terminology'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sitecontent',
            name='about_description',
            field=models.TextField(
                default='Aqual Sentinel now includes a real About Us page with a team roster, contact form, and admin-managed updates. Team members are managed from the workspace, and incoming messages are kept for review in the workspace inbox.',
            ),
        ),
        migrations.AlterField(
            model_name='sitecontent',
            name='about_title',
            field=models.CharField(
                default='The team page now runs from live content.',
                max_length=220,
            ),
        ),
        migrations.AlterField(
            model_name='sitecontent',
            name='workspace_description_user',
            field=models.TextField(
                default='You are signed in as a user. The launch dashboard is live, and you can view the current operating picture and public site information.',
            ),
        ),
    ]
