from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='LaunchRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('full_name', models.CharField(max_length=120)),
                ('organization', models.CharField(max_length=160)),
                ('email', models.EmailField(max_length=254)),
                (
                    'focus_area',
                    models.CharField(
                        choices=[
                            ('Leak monitoring', 'Leak monitoring'),
                            ('Tank level visibility', 'Tank level visibility'),
                            ('Incident dispatch', 'Incident dispatch'),
                            ('Asset maintenance', 'Asset maintenance'),
                        ],
                        default='Leak monitoring',
                        max_length=40,
                    ),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
