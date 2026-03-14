import getpass
import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError


def split_full_name(full_name):
    parts = [part for part in full_name.split() if part]

    if not parts:
        return '', ''

    if len(parts) == 1:
        return parts[0], ''

    return parts[0], ' '.join(parts[1:])


class Command(BaseCommand):
    help = 'Create or update a superuser without storing a password in the codebase.'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='uadmin')
        parser.add_argument('--email', default='uadmin@aqual.local')
        parser.add_argument('--full-name', default='Utility Admin')
        parser.add_argument(
            '--password-env',
            default='',
            help='Optional environment variable name to read the password from.',
        )
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Do not prompt. Read the password from --password-env instead.',
        )

    def _resolve_password(self, options):
        password_env = (options.get('password_env') or '').strip()

        if password_env:
            password = os.getenv(password_env, '')
            if password:
                return password

            if options['no_input']:
                raise CommandError(
                    f'Environment variable {password_env} is not set or is empty.',
                )

        if options['no_input']:
            raise CommandError('--no-input requires a valid --password-env value.')

        password = getpass.getpass('Password: ')
        password_confirm = getpass.getpass('Password (again): ')

        if password != password_confirm:
            raise CommandError('Passwords do not match.')

        if not password:
            raise CommandError('Password cannot be blank.')

        return password

    def handle(self, *args, **options):
        user_model = get_user_model()
        username = options['username'].strip()
        email = options['email'].strip().lower()
        full_name = options['full_name'].strip() or username

        if not username:
            raise CommandError('Username cannot be blank.')

        if not email:
            raise CommandError('Email cannot be blank.')

        first_name, last_name = split_full_name(full_name)
        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={'email': email},
        )

        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True

        password = self._resolve_password(options)

        try:
            validate_password(password, user)
        except ValidationError as error:
            raise CommandError(' '.join(error.messages)) from error

        user.set_password(password)
        user.save()

        action = 'Created' if created else 'Updated'
        self.stdout.write(
            self.style.SUCCESS(
                f'{action} superuser "{user.username}" with Django admin access.',
            )
        )
