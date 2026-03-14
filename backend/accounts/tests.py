import json
from datetime import datetime
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse

from .models import (
    Announcement,
    ContactMessage,
    DirectMessage,
    LeakReport,
    LaunchRequest,
    PageSection,
    PageSectionCard,
    Product,
    Sensor,
    SiteContent,
    SiteHighlight,
    TeamMember,
)

User = get_user_model()
TEST_STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}


class LaunchRequestApiTests(TestCase):
    def test_create_launch_request(self):
        response = self.client.post(
            reverse('launch-requests-api'),
            data=json.dumps({
                'fullName': 'Jane Nalubega',
                'organization': 'Kampala Water Operations',
                'email': 'ops@example.com',
                'focusArea': 'Leak monitoring',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(LaunchRequest.objects.count(), 1)
        created_request = LaunchRequest.objects.first()
        assert created_request is not None
        self.assertEqual(created_request.email, 'ops@example.com')
        self.assertEqual(response.json()['request']['requester'], 'Jane N.')

    def test_returns_launch_dashboard(self):
        LaunchRequest.objects.create(
            full_name='Jane Nalubega',
            organization='Kampala Water Operations',
            email='ops@example.com',
            focus_area=LaunchRequest.FocusArea.LEAK_MONITORING,
        )
        LaunchRequest.objects.create(
            full_name='Daniel Kato',
            organization='Mbarara Utility Lab',
            email='dispatch@example.com',
            focus_area=LaunchRequest.FocusArea.INCIDENT_DISPATCH,
        )

        response = self.client.get(reverse('launch-requests-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['summary']['totalRequests'], 2)
        self.assertEqual(payload['summary']['organizationCount'], 2)
        self.assertEqual(len(payload['summary']['focusBreakdown']), 4)
        self.assertEqual(payload['recentRequests'][0]['requester'], 'Daniel K.')
        self.assertNotIn('email', payload['recentRequests'][0])

    def test_rejects_invalid_email(self):
        response = self.client.post(
            reverse('launch-requests-api'),
            data=json.dumps({
                'fullName': 'Jane Nalubega',
                'organization': 'Kampala Water Operations',
                'email': 'not-an-email',
                'focusArea': 'Leak monitoring',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.json()['errors'])


class AuthenticationApiTests(TestCase):
    def test_seeded_uadmin_exists(self):
        admin_user = User.objects.get(username='uadmin')

        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)
        self.assertFalse(admin_user.has_usable_password())

    def test_signup_creates_regular_user_and_logs_them_in(self):
        response = self.client.post(
            reverse('signup-api'),
            data=json.dumps({
                'username': 'janeops',
                'fullName': 'Jane Nalubega',
                'email': 'jane@example.com',
                'password': 'SecurePass123!',
                'confirmPassword': 'SecurePass123!',
                'role': 'user',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.filter(username='janeops').count(), 1)
        self.assertFalse(User.objects.get(username='janeops').is_staff)
        session_response = self.client.get(reverse('auth-session-api'))
        self.assertEqual(session_response.json()['user']['username'], 'janeops')

    def test_login_returns_user_payload(self):
        User.objects.create_user(
            username='fieldlead',
            email='field@example.com',
            password='SecurePass123!',
            first_name='Field',
            last_name='Lead',
        )

        response = self.client.post(
            reverse('login-api'),
            data=json.dumps({
                'username': 'fieldlead',
                'password': 'SecurePass123!',
                'role': 'user',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['user']['fullName'], 'Field Lead')

    def test_account_availability_endpoint_reports_duplicates(self):
        User.objects.create_user(
            username='existinguser',
            email='existing@example.com',
            password='SecurePass123!',
        )

        response = self.client.get(
            reverse('account-availability-api'),
            {'username': 'existinguser', 'email': 'existing@example.com'},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertFalse(payload['username']['available'])
        self.assertFalse(payload['email']['available'])

    def test_login_rejects_wrong_selected_role(self):
        User.objects.create_user(
            username='fieldops',
            email='fieldops@example.com',
            password='SecurePass123!',
        )

        response = self.client.post(
            reverse('login-api'),
            data=json.dumps({
                'username': 'fieldops',
                'password': 'SecurePass123!',
                'role': 'admin',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()['detail'],
            'This account signs in as user. Select the user role to continue.',
        )

    def test_public_signup_can_create_admin_account_and_logs_them_in(self):
        response = self.client.post(
            reverse('signup-api'),
            data=json.dumps({
                'username': 'publicadmin',
                'fullName': 'Public Admin',
                'email': 'publicadmin@example.com',
                'password': 'SecurePass123!',
                'confirmPassword': 'SecurePass123!',
                'role': 'admin',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        admin_user = User.objects.get(username='publicadmin')
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)
        session_response = self.client.get(reverse('auth-session-api'))
        self.assertEqual(session_response.json()['user']['role'], 'admin')

    def test_logout_get_redirects_and_clears_session(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.get(f"{reverse('logout-api')}?next=/", follow=False)

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], '/')
        session_response = self.client.get(reverse('auth-session-api'))
        self.assertIsNone(session_response.json()['user'])

    def test_admin_can_create_admin_account(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        admin_response = self.client.post(
            reverse('users-api'),
            data=json.dumps({
                'username': 'admin2',
                'fullName': 'Admin Two',
                'email': 'admin2@example.com',
                'password': 'SecurePass123!',
            }),
            content_type='application/json',
        )

        self.assertEqual(admin_response.status_code, 201)
        self.assertTrue(User.objects.get(username='admin2').is_staff)
        self.assertTrue(User.objects.get(username='admin2').is_superuser)

    def test_admin_can_create_admin_with_password_similar_to_username(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('users-api'),
            data=json.dumps({
                'username': 'adminops',
                'fullName': 'Admin Ops',
                'email': 'adminops@example.com',
                'password': 'adminops123',
                'role': 'admin',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.get(username='adminops').is_staff)

    def test_admin_created_account_password_still_needs_basic_strength(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('users-api'),
            data=json.dumps({
                'username': 'shortpass',
                'fullName': 'Short Pass',
                'email': 'shortpass@example.com',
                'password': '1234567',
                'role': 'admin',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.json()['errors'])

    def test_admin_cannot_create_regular_user_from_admin_endpoint(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('users-api'),
            data=json.dumps({
                'username': 'operator1',
                'fullName': 'Operator One',
                'email': 'operator1@example.com',
                'password': 'SecurePass123!',
                'role': 'user',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('role', response.json()['errors'])
        self.assertFalse(User.objects.filter(username='operator1').exists())

    def test_non_admin_cannot_create_users(self):
        regular_user = User.objects.create_user(
            username='operator2',
            email='operator2@example.com',
            password='SecurePass123!',
        )
        self.client.force_login(regular_user)

        response = self.client.post(
            reverse('users-api'),
            data=json.dumps({
                'username': 'blocked',
                'fullName': 'Blocked User',
                'email': 'blocked@example.com',
                'password': 'SecurePass123!',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 403)

    def test_signup_still_needs_basic_strength(self):
        response = self.client.post(
            reverse('signup-api'),
            data=json.dumps({
                'username': 'weakuser',
                'fullName': 'Weak User',
                'email': 'weakuser@example.com',
                'password': '12345678',
                'confirmPassword': '12345678',
                'role': 'user',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.json()['errors'])


class AboutApiTests(TestCase):
    def test_public_team_members_endpoint_returns_seeded_team(self):
        response = self.client.get(reverse('team-members-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(payload['summary']['totalMembers'], 6)
        self.assertTrue(
            any(
                member['fullName'] == 'Byamugisha Octavious'
                for member in payload['teamMembers']
            )
        )
        self.assertTrue(
            any(
                member['fullName'] == 'Mr. Ambrose Izaara'
                for member in payload['teamMembers']
            )
        )

    def test_admin_can_add_team_member(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        uploaded_photo = SimpleUploadedFile(
            'member.jpg',
            b'fake-image-content',
            content_type='image/jpeg',
        )

        response = self.client.post(
            reverse('team-members-api'),
            data={
                'fullName': 'New Member',
                'title': 'Team Member',
                'bio': 'Handles field operations.',
                'photo': uploaded_photo,
                'displayOrder': 10,
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(TeamMember.objects.filter(full_name='New Member').exists())
        self.assertIn('/media/team_members/', response.json()['teamMember']['photoUrl'])

    def test_admin_can_update_existing_team_member_photo(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        member = TeamMember.objects.create(
            full_name='Existing Member',
            role_title='Engineer',
            bio='Old bio.',
            display_order=12,
        )
        uploaded_photo = SimpleUploadedFile(
            'updated-member.jpg',
            b'new-image-content',
            content_type='image/jpeg',
        )

        response = self.client.post(
            reverse('team-member-detail-api', args=[member.pk]),
            data={
                'fullName': 'Existing Member',
                'title': 'Engineer',
                'bio': 'Updated bio.',
                'displayOrder': 12,
                'photo': uploaded_photo,
            },
        )

        self.assertEqual(response.status_code, 200)
        member.refresh_from_db()
        self.assertTrue(bool(member.photo_url))
        self.assertEqual(member.bio, 'Updated bio.')
        self.assertIn('/media/team_members/', response.json()['teamMember']['photoUrl'])

    def test_admin_cannot_add_team_member_without_photo(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('team-members-api'),
            data={
                'fullName': 'No Photo',
                'title': 'Team Member',
                'bio': 'Missing photo.',
                'displayOrder': 11,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('photo', response.json()['errors'])

    def test_admin_cannot_update_team_member_without_photo(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        member = TeamMember.objects.create(
            full_name='Existing Member',
            role_title='Engineer',
            bio='Old bio.',
            display_order=12,
        )

        response = self.client.post(
            reverse('team-member-detail-api', args=[member.pk]),
            data={
                'fullName': 'Existing Member',
                'title': 'Engineer',
                'bio': 'Updated bio.',
                'displayOrder': 12,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('photo', response.json()['errors'])

    def test_public_can_send_contact_message(self):
        response = self.client.post(
            reverse('contact-messages-api'),
            data=json.dumps({
                'fullName': 'Jane Visitor',
                'email': 'visitor@example.com',
                'subject': 'Need more details',
                'message': 'Please share more information about the project.',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ContactMessage.objects.count(), 1)
        created_message = ContactMessage.objects.first()
        assert created_message is not None
        self.assertEqual(created_message.subject, 'Need more details')

    def test_admin_can_view_contact_messages(self):
        ContactMessage.objects.create(
            full_name='Jane Visitor',
            email='visitor@example.com',
            subject='Need more details',
            message='Please share more information about the project.',
        )
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.get(reverse('contact-messages-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['summary']['totalMessages'], 1)
        self.assertEqual(payload['messages'][0]['email'], 'visitor@example.com')

    def test_admin_can_view_contact_message_from_signed_in_user(self):
        regular_user = User.objects.create_user(
            username='fielduser',
            first_name='Field',
            last_name='Operator',
            email='field@example.com',
            password='SecurePass123!',
        )
        self.client.force_login(regular_user)

        create_response = self.client.post(
            reverse('contact-messages-api'),
            data=json.dumps({
                'fullName': 'Field Operator',
                'email': 'field@example.com',
                'subject': 'Sensor issue',
                'message': 'Please review the latest sensor alert.',
            }),
            content_type='application/json',
        )

        self.assertEqual(create_response.status_code, 201)
        created_message = ContactMessage.objects.get(subject='Sensor issue')
        self.assertEqual(created_message.sender, regular_user)

        self.client.logout()
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.get(reverse('contact-messages-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['messages'][0]['senderUsername'], 'fielduser')
        self.assertEqual(payload['messages'][0]['senderRole'], 'user')

    def test_non_admin_cannot_view_contact_messages(self):
        regular_user = User.objects.create_user(
            username='viewer',
            email='viewer@example.com',
            password='SecurePass123!',
        )
        self.client.force_login(regular_user)

        response = self.client.get(reverse('contact-messages-api'))

        self.assertEqual(response.status_code, 403)


class DirectMessageApiTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.get(username='uadmin')
        self.regular_user = User.objects.create_user(
            username='fielduser',
            first_name='Field',
            last_name='Operator',
            email='field@example.com',
            password='SecurePass123!',
        )
        self.other_user = User.objects.create_user(
            username='anotheruser',
            email='another@example.com',
            password='SecurePass123!',
        )

    def test_admin_can_send_direct_message_to_user(self):
        self.client.force_login(self.admin_user)

        response = self.client.post(
            reverse('direct-messages-api'),
            data=json.dumps({
                'recipientId': self.regular_user.id,
                'body': 'Hello from admin.',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(DirectMessage.objects.count(), 1)
        direct_message = DirectMessage.objects.first()
        assert direct_message is not None
        self.assertEqual(direct_message.sender, self.admin_user)
        self.assertEqual(direct_message.recipient, self.regular_user)

    def test_user_can_view_and_reply_to_admin_direct_message(self):
        DirectMessage.objects.create(
            sender=self.admin_user,
            recipient=self.regular_user,
            body='Please share your latest update.',
        )

        self.client.force_login(self.regular_user)

        get_response = self.client.get(
            reverse('direct-messages-api'),
            {'participantId': self.admin_user.id},
        )

        self.assertEqual(get_response.status_code, 200)
        payload = get_response.json()
        self.assertEqual(payload['summary']['totalContacts'], 1)
        self.assertEqual(payload['contacts'][0]['latestMessage'], 'Please share your latest update.')
        self.assertEqual(payload['contacts'][0]['username'], 'uadmin')
        self.assertEqual(payload['messages'][0]['senderUsername'], 'uadmin')

        post_response = self.client.post(
            reverse('direct-messages-api'),
            data=json.dumps({
                'recipientId': self.admin_user.id,
                'body': 'I have reviewed the alert and I am on it.',
            }),
            content_type='application/json',
        )

        self.assertEqual(post_response.status_code, 201)
        self.assertEqual(DirectMessage.objects.count(), 2)

    def test_regular_user_reply_defaults_to_system_admin_when_recipient_is_invalid(self):
        self.client.force_login(self.regular_user)

        response = self.client.post(
            reverse('direct-messages-api'),
            data=json.dumps({
                'recipientId': self.other_user.id,
                'body': 'Please route this reply to the system admin.',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        direct_message = DirectMessage.objects.latest('id')
        self.assertEqual(direct_message.sender, self.regular_user)
        self.assertEqual(direct_message.recipient, self.admin_user)


@override_settings(STORAGES=TEST_STORAGES)
class DirectMessageAdminTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.get(username='uadmin')
        self.regular_user = User.objects.create_user(
            username='fielduser',
            email='field@example.com',
            password='SecurePass123!',
        )
        self.client.force_login(self.admin_user)

    def test_contact_message_admin_shows_reply_link_for_signed_in_sender(self):
        contact_message = ContactMessage.objects.create(
            sender=self.regular_user,
            full_name='Field User',
            email='field@example.com',
            subject='Need help',
            message='Please help me with the system.',
        )

        response = self.client.get(
            reverse('admin:accounts_contactmessage_change', args=[contact_message.pk]),
        )

        self.assertEqual(response.status_code, 200)
        expected_link = (
            f"{reverse('admin:accounts_directmessage_add')}?recipient="
            f"{self.regular_user.id}&contact_message={contact_message.id}"
        )
        self.assertContains(
            response,
            (
                f'<a href="{expected_link}">'
                f'Reply to @{self.regular_user.username} in direct messages</a>'
            ),
            html=True,
        )

    def test_admin_can_create_reply_from_direct_message_admin(self):
        response = self.client.post(
            reverse('admin:accounts_directmessage_add'),
            data={
                'recipient': self.regular_user.id,
                'body': 'Hello from Django admin.',
                '_save': 'Save',
            },
        )

        self.assertEqual(response.status_code, 302)
        direct_message = DirectMessage.objects.get(body='Hello from Django admin.')
        self.assertEqual(direct_message.sender, self.admin_user)
        self.assertEqual(direct_message.recipient, self.regular_user)


class ProductApiTests(TestCase):
    def test_public_products_endpoint_returns_seeded_product(self):
        response = self.client.get(reverse('products-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['summary']['totalProducts'], 1)
        self.assertEqual(payload['products'][0]['name'], 'Aqua Sentinel system')

    def test_admin_can_save_product_with_uploaded_image(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        uploaded_image = SimpleUploadedFile(
            'product.jpg',
            b'fake-product-image',
            content_type='image/jpeg',
        )

        response = self.client.post(
            reverse('products-api'),
            data={
                'name': 'Aqua Sentinel system',
                'summary': 'Updated product summary.',
                'description': 'Updated product description.',
                'image': uploaded_image,
                'displayOrder': 1,
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Product.objects.count(), 1)
        self.assertIn('/media/products/', response.json()['product']['imageUrl'])
        self.assertEqual(Product.objects.get(name='Aqua Sentinel system').summary, 'Updated product summary.')

    def test_admin_can_save_product_with_uploaded_video(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        uploaded_video = SimpleUploadedFile(
            'product.mp4',
            b'fake-product-video',
            content_type='video/mp4',
        )

        response = self.client.post(
            reverse('products-api'),
            data={
                'name': 'Aqua Sentinel system',
                'summary': 'Video summary.',
                'description': 'Video product description.',
                'video': uploaded_video,
                'displayOrder': 1,
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn('/media/products/videos/', response.json()['product']['videoUrl'])

    def test_admin_cannot_create_product_without_media(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('products-api'),
            data=json.dumps({
                'name': 'New Product Without Media',
                'summary': 'No media.',
                'description': 'Should fail.',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('image', response.json()['errors'])

    def test_non_admin_cannot_save_product(self):
        regular_user = User.objects.create_user(
            username='productviewer',
            email='productviewer@example.com',
            password='SecurePass123!',
        )
        self.client.force_login(regular_user)

        response = self.client.post(
            reverse('products-api'),
            data=json.dumps({
                'name': 'Blocked product',
                'summary': 'Should fail.',
                'description': 'Should fail.',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 403)


class OperationsFeedApiTests(TestCase):
    def test_public_announcements_endpoint_starts_empty_without_seeded_items(self):
        response = self.client.get(reverse('announcements-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['summary']['advertCount'], 0)
        self.assertEqual(payload['summary']['totalItems'], 0)
        self.assertEqual(payload['announcements'], [])

    def test_admin_can_create_announcement_with_uploaded_image(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        uploaded_image = SimpleUploadedFile(
            'advert.jpg',
            b'fake-advert-image',
            content_type='image/jpeg',
        )

        response = self.client.post(
            reverse('announcements-api'),
            data={
                'kind': 'advert',
                'title': 'Service restoration notice',
                'message': 'Field teams are restoring service.',
                'image': uploaded_image,
                'ctaLabel': 'Read update',
                'ctaLink': 'https://example.com/notice',
                'displayOrder': 10,
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            Announcement.objects.filter(title='Service restoration notice').exists()
        )
        self.assertIn('/media/announcements/', response.json()['announcement']['imageUrl'])

    def test_admin_can_create_announcement_with_uploaded_video(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        uploaded_video = SimpleUploadedFile(
            'advert.mp4',
            b'fake-advert-video',
            content_type='video/mp4',
        )

        response = self.client.post(
            reverse('announcements-api'),
            data={
                'kind': 'advert',
                'title': 'Video advert',
                'message': 'Watch the product in action.',
                'video': uploaded_video,
                'ctaLabel': 'Watch now',
                'ctaLink': 'https://example.com/video',
                'displayOrder': 9,
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn('/media/announcements/videos/', response.json()['announcement']['videoUrl'])

    def test_admin_cannot_create_announcement_without_media(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('announcements-api'),
            data=json.dumps({
                'kind': 'announcement',
                'title': 'No media',
                'message': 'This should fail.',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('image', response.json()['errors'])

    def test_admin_can_register_sensor(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('sensors-api'),
            data=json.dumps({
                'sensorCode': 'AQS-001',
                'displayName': 'Tank One Sensor',
                'location': 'Main tank inlet',
                'description': 'Primary field sensor.',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        sensor = Sensor.objects.get(sensor_code='AQS-001')
        self.assertEqual(sensor.display_name, 'Tank One Sensor')
        self.assertEqual(response.json()['sensor']['location'], 'Main tank inlet')

    def test_public_sensors_endpoint_returns_registered_sensors(self):
        Sensor.objects.create(
            sensor_code='AQS-002',
            display_name='Distribution Sensor',
            location='Central trunk line',
            description='Distribution telemetry node.',
        )

        response = self.client.get(reverse('sensors-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['summary']['totalSensors'], 1)
        self.assertEqual(payload['sensors'][0]['sensorCode'], 'AQS-002')

    def test_public_sensors_endpoint_returns_latest_sensor_telemetry(self):
        sensor = Sensor.objects.create(
            sensor_code='AQS-009',
            display_name='Eastern Trunk Sensor',
            location='Mukono transfer line',
            description='Primary eastbound telemetry node.',
        )
        LeakReport.objects.create(
            sensor=sensor,
            leakage_rate='12.50',
            status=LeakReport.Status.STABLE,
            observed_at=datetime.fromisoformat('2026-03-10T09:15:00+03:00'),
            is_active=True,
        )
        LeakReport.objects.create(
            sensor=sensor,
            leakage_rate='18.75',
            status=LeakReport.Status.CRITICAL,
            observed_at=datetime.fromisoformat('2026-03-11T06:45:00+03:00'),
            is_active=True,
        )

        response = self.client.get(reverse('sensors-api'))
        payload = response.json()
        sensor_payload = payload['sensors'][0]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(sensor_payload['sensorCode'], 'AQS-009')
        self.assertEqual(sensor_payload['activeLeakCount'], 2)
        self.assertEqual(sensor_payload['latestSignal']['leakageRate'], '18.75 L/min')
        self.assertEqual(sensor_payload['latestSignal']['status'], 'critical')
        self.assertEqual(sensor_payload['latestSignal']['location'], 'Mukono transfer line')

    def test_public_leak_reports_endpoint_starts_empty_until_sensor_data_arrives(self):
        response = self.client.get(reverse('leak-reports-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['summary']['totalSignals'], 0)
        self.assertIsNone(payload['summary']['currentStatus'])
        self.assertIsNone(payload['summary']['firstActiveObservedAt'])
        self.assertEqual(payload['leakReports'], [])

    def test_public_leak_reports_endpoint_hides_leak_status_from_guests(self):
        sensor = Sensor.objects.create(
            sensor_code='AQS-010',
            display_name='Protected Telemetry Sensor',
            location='Nansana trunk line',
        )
        LeakReport.objects.create(
            sensor=sensor,
            leakage_rate='22.10',
            status=LeakReport.Status.CRITICAL,
        )

        response = self.client.get(reverse('leak-reports-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['summary']['totalSignals'], 0)
        self.assertEqual(payload['summary']['activeLeaks'], 0)
        self.assertEqual(payload['leakReports'], [])

    def test_admin_can_create_leak_report_from_registered_sensor(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        sensor = Sensor.objects.create(
            sensor_code='AQS-003',
            display_name='West Loop D9',
            location='Busega primary trunk',
        )

        response = self.client.post(
            reverse('leak-reports-api'),
            data=json.dumps({
                'sensorId': sensor.pk,
                'leakageRate': '28.40',
                'status': 'investigating',
                'observedAt': '2026-03-11T09:45:00+03:00',
                'displayOrder': 8,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            LeakReport.objects.filter(sensor=sensor).exists()
        )
        self.assertEqual(response.json()['leakReport']['location'], 'Busega primary trunk')
        self.assertEqual(response.json()['leakReport']['sensorCode'], 'AQS-003')

    def test_iot_sensor_code_creates_leak_report_with_sensor_location(self):
        sensor = Sensor.objects.create(
            sensor_code='AQS-004',
            display_name='North Flow Sensor',
            location='Kisaasi supply branch',
        )

        response = self.client.post(
            reverse('iot-leak-reports-api'),
            data=json.dumps({
                'sensorCode': sensor.sensor_code,
                'leakageRate': '17.25',
                'status': 'critical',
                'observedAt': '2026-03-11T10:15:00+03:00',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(LeakReport.objects.filter(sensor=sensor).exists())
        payload = response.json()['leakReport']
        self.assertEqual(payload['sensorName'], 'North Flow Sensor')
        self.assertEqual(payload['location'], 'Kisaasi supply branch')


class SiteContentApiTests(TestCase):
    def test_public_site_content_endpoint_returns_seeded_copy(self):
        response = self.client.get(reverse('site-content-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['brand']['name'], 'Aqual Sentinel')
        self.assertEqual(payload['pages']['about']['eyebrow'], 'About Us')
        self.assertTrue(SiteHighlight.objects.filter(page='home').exists())
        self.assertTrue(payload['highlights']['home'])
        self.assertTrue(
            any(
                highlight['title'] == 'Product content is dynamic'
                for highlight in payload['highlights']['products']
            )
        )
        self.assertTrue(PageSection.objects.filter(page='home', slot='home_signals').exists())
        self.assertTrue(payload['sections']['home'])
        home_signals = next(
            section
            for section in payload['sections']['home']
            if section['slot'] == 'home_signals'
        )
        self.assertEqual(home_signals['audience'], 'all')
        self.assertTrue(
            any(card['key'] == 'launch_requests' for card in home_signals['cards'])
        )
        self.assertTrue(
            any(
                section['slot'] == 'visitor_cards' and section['audience'] == 'admin'
                for section in payload['sections']['workspace']
            )
        )
        self.assertTrue(
            any(section['slot'] == 'about_signals' for section in payload['sections']['about'])
        )
        self.assertTrue(
            any(
                card['key'] == 'roster'
                for section in payload['sections']['about']
                if section['slot'] == 'about_signals'
                for card in section['cards']
            )
        )
        self.assertTrue(
            any(
                section['slot'] == 'product_signals'
                for section in payload['sections']['products']
            )
        )
        self.assertTrue(
            any(
                card['key'] == 'media_ready'
                for section in payload['sections']['products']
                if section['slot'] == 'product_journey'
                for card in section['cards']
            )
        )
        self.assertTrue(
            any(section['kind'] == 'feed' for section in payload['sections']['home'])
        )
        self.assertTrue(
            all(
                not (
                    section['sourceType'] == 'leak_reports' and section['items']
                )
                for section in payload['sections']['home']
            )
        )

    def test_site_content_endpoint_omits_inactive_section_cards(self):
        section = PageSection.objects.create(
            page=PageSection.Page.HOME,
            slot='test_cards',
            audience=PageSection.Audience.ALL,
            title='Test cards',
            is_active=True,
        )
        PageSectionCard.objects.create(
            section=section,
            card_key='visible_card',
            title='Visible card',
            is_active=True,
        )
        PageSectionCard.objects.create(
            section=section,
            card_key='hidden_card',
            title='Hidden card',
            is_active=False,
        )

        response = self.client.get(reverse('site-content-api'))
        payload = response.json()
        section_payload = next(
            item for item in payload['sections']['home'] if item['slot'] == 'test_cards'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(section_payload['cards']), 1)
        self.assertEqual(section_payload['cards'][0]['key'], 'visible_card')

    def test_site_content_endpoint_returns_feed_items_for_feed_sections(self):
        Product.objects.create(
            name='Dynamic Feed Product',
            summary='Feed-ready product summary.',
            display_order=0,
        )

        response = self.client.get(reverse('site-content-api'))
        payload = response.json()
        products_feed = next(
            item
            for item in payload['sections']['home']
            if item['slot'] == 'home_desk_products'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(products_feed['kind'], 'feed')
        self.assertEqual(products_feed['sourceType'], 'products')
        self.assertTrue(products_feed['items'])
        self.assertEqual(products_feed['items'][0]['pillLabel'], 'Product')

    def test_admin_can_update_site_content(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('site-content-api'),
            data=json.dumps({
                'brand_name': 'Aqua Sentinel System',
                'home_title': 'Fully dynamic website copy.',
                'products_description': 'Managed from Django now.',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        site_content = SiteContent.objects.get(pk=1)
        self.assertEqual(site_content.brand_name, 'Aqua Sentinel System')
        self.assertEqual(site_content.home_title, 'Fully dynamic website copy.')
        self.assertEqual(site_content.products_description, 'Managed from Django now.')
        self.assertEqual(response.json()['siteContent']['brand']['name'], 'Aqua Sentinel System')

    def test_non_admin_cannot_update_site_content(self):
        regular_user = User.objects.create_user(
            username='siteviewer',
            email='siteviewer@example.com',
            password='SecurePass123!',
        )
        self.client.force_login(regular_user)

        response = self.client.post(
            reverse('site-content-api'),
            data=json.dumps({
                'home_title': 'Blocked update.',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 403)


class BootstrapAdminCommandTests(TestCase):
    @patch(
        'accounts.management.commands.bootstrap_admin.getpass.getpass',
        side_effect=['SecurePass123!', 'SecurePass123!'],
    )
    def test_bootstrap_admin_command_creates_superuser(self, mocked_getpass):
        call_command(
            'bootstrap_admin',
            username='managedsuper',
            email='managedsuper@example.com',
            full_name='Managed Super',
        )

        user = User.objects.get(username='managedsuper')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password('SecurePass123!'))
        self.assertEqual(user.email, 'managedsuper@example.com')
        self.assertEqual(user.get_full_name(), 'Managed Super')
        self.assertEqual(mocked_getpass.call_count, 2)
