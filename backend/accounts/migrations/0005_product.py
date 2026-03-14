from django.db import migrations, models


def seed_product(apps, schema_editor):
    product_model = apps.get_model('accounts', 'Product')

    product_model.objects.update_or_create(
        name='Aqua Sentinel system',
        defaults={
            'summary': 'Smart monitoring for leak detection, water operations visibility, and coordinated response.',
            'description': (
                'Aqua Sentinel system is the core product experience for utility teams. '
                'It brings launch capture, team visibility, contact handling, and live '
                'operational monitoring into one web platform.'
            ),
            'display_order': 1,
        },
    )


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0004_alter_teammember_photo_url'),
    ]

    operations = [
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=160, unique=True)),
                ('summary', models.CharField(blank=True, max_length=220)),
                ('description', models.TextField(blank=True)),
                ('image', models.FileField(blank=True, upload_to='products/')),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['display_order', 'name'],
            },
        ),
        migrations.RunPython(seed_product, migrations.RunPython.noop),
    ]
