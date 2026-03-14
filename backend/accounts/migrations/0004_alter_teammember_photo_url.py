from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0003_teammember_contactmessage'),
    ]

    operations = [
        migrations.AlterField(
            model_name='teammember',
            name='photo_url',
            field=models.FileField(blank=True, upload_to='team_members/'),
        ),
    ]
