from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0008_sensor_admin_cleanup'),
    ]

    operations = [
        migrations.AddField(
            model_name='announcement',
            name='video',
            field=models.FileField(blank=True, upload_to='announcements/videos/'),
        ),
        migrations.AddField(
            model_name='product',
            name='video',
            field=models.FileField(blank=True, upload_to='products/videos/'),
        ),
    ]
