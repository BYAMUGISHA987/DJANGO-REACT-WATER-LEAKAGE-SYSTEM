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
        self.assertEqual(len(payload['requests']), 2)

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

    def test_admin_can_delete_launch_request(self):
        launch_request = LaunchRequest.objects.create(
            full_name='Jane Nalubega',
            organization='Kampala Water Operations',
            email='ops@example.com',
            focus_area=LaunchRequest.FocusArea.LEAK_MONITORING,
        )
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.delete(
            reverse('launch-requests-api'),
            data=json.dumps({'id': launch_request.id}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(LaunchRequest.objects.filter(pk=launch_request.pk).exists())


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

    def test_admin_can_create_regular_user_from_admin_endpoint(self):
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

        self.assertEqual(response.status_code, 201)
        managed_user = User.objects.get(username='operator1')
        self.assertFalse(managed_user.is_staff)
        self.assertFalse(managed_user.is_superuser)

    def test_admin_can_update_existing_user_from_admin_endpoint(self):
        admin_user = User.objects.get(username='uadmin')
        managed_user = User.objects.create_user(
            username='operator3',
            email='operator3@example.com',
            password='SecurePass123!',
            first_name='Operator',
            last_name='Three',
        )
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('user-detail-api', args=[managed_user.pk]),
            data=json.dumps({
                'username': 'updatedoperator',
                'fullName': 'Updated Operator',
                'email': 'updatedoperator@example.com',
                'role': 'admin',
                'password': 'UpdatedPass123!',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        managed_user.refresh_from_db()
        self.assertEqual(managed_user.username, 'updatedoperator')
        self.assertEqual(managed_user.email, 'updatedoperator@example.com')
        self.assertTrue(managed_user.is_staff)
        self.assertTrue(managed_user.is_superuser)
        self.assertTrue(managed_user.check_password('UpdatedPass123!'))

    def test_admin_can_delete_another_user_but_not_self(self):
        admin_user = User.objects.get(username='uadmin')
        managed_user = User.objects.create_user(
            username='operator4',
            email='operator4@example.com',
            password='SecurePass123!',
        )
        self.client.force_login(admin_user)

        delete_response = self.client.delete(
            reverse('user-detail-api', args=[managed_user.pk]),
            content_type='application/json',
        )

        self.assertEqual(delete_response.status_code, 200)
        self.assertFalse(User.objects.filter(pk=managed_user.pk).exists())

        self_delete_response = self.client.delete(
            reverse('user-detail-api', args=[admin_user.pk]),
            content_type='application/json',
        )

        self.assertEqual(self_delete_response.status_code, 400)
        self.assertTrue(User.objects.filter(pk=admin_user.pk).exists())

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

    def test_authenticated_user_can_change_password_and_stay_signed_in(self):
        regular_user = User.objects.create_user(
            username='passworduser',
            email='passworduser@example.com',
            password='SecurePass123!',
            first_name='Password',
            last_name='User',
        )
        self.client.force_login(regular_user)

        response = self.client.post(
            reverse('password-change-api'),
            data=json.dumps({
                'currentPassword': 'SecurePass123!',
                'newPassword': 'SaferPass456!',
                'confirmPassword': 'SaferPass456!',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        regular_user.refresh_from_db()
        self.assertTrue(regular_user.check_password('SaferPass456!'))
        self.assertFalse(regular_user.check_password('SecurePass123!'))
        self.assertEqual(response.json()['message'], 'Password changed successfully.')

        session_response = self.client.get(reverse('auth-session-api'))
        self.assertEqual(session_response.status_code, 200)
        self.assertEqual(session_response.json()['user']['username'], 'passworduser')

        self.client.post(reverse('logout-api'))

        old_login_response = self.client.post(
            reverse('login-api'),
            data=json.dumps({
                'username': 'passworduser',
                'password': 'SecurePass123!',
                'role': 'user',
            }),
            content_type='application/json',
        )
        self.assertEqual(old_login_response.status_code, 400)

        new_login_response = self.client.post(
            reverse('login-api'),
            data=json.dumps({
                'username': 'passworduser',
                'password': 'SaferPass456!',
                'role': 'user',
            }),
            content_type='application/json',
        )
        self.assertEqual(new_login_response.status_code, 200)

    def test_password_change_rejects_incorrect_current_password(self):
        regular_user = User.objects.create_user(
            username='wrongcurrent',
            email='wrongcurrent@example.com',
            password='SecurePass123!',
        )
        self.client.force_login(regular_user)

        response = self.client.post(
            reverse('password-change-api'),
            data=json.dumps({
                'currentPassword': 'WrongPass123!',
                'newPassword': 'SaferPass456!',
                'confirmPassword': 'SaferPass456!',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('currentPassword', response.json()['errors'])

    def test_password_change_requires_authenticated_user(self):
        response = self.client.post(
            reverse('password-change-api'),
            data=json.dumps({
                'currentPassword': 'SecurePass123!',
                'newPassword': 'SaferPass456!',
                'confirmPassword': 'SaferPass456!',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 401)


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

    def test_admin_can_update_team_member_without_reuploading_photo(self):
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

        self.assertEqual(response.status_code, 200)
        member.refresh_from_db()
        self.assertEqual(member.bio, 'Updated bio.')

    def test_admin_can_delete_team_member(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        member = TeamMember.objects.create(
            full_name='Delete Me',
            role_title='Engineer',
            bio='Temporary record.',
            display_order=12,
        )

        response = self.client.delete(reverse('team-member-detail-api', args=[member.pk]))

        self.assertEqual(response.status_code, 200)
        self.assertFalse(TeamMember.objects.filter(pk=member.pk).exists())

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

    def test_admin_can_mark_contact_message_as_read(self):
        contact_message = ContactMessage.objects.create(
            full_name='Jane Visitor',
            email='visitor@example.com',
            subject='Need more details',
            message='Please share more information about the project.',
            is_read=False,
        )
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('contact-messages-api'),
            data=json.dumps({
                'messageId': contact_message.id,
                'isRead': True,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        contact_message.refresh_from_db()
        self.assertTrue(contact_message.is_read)
        self.assertTrue(response.json()['contactMessage']['isRead'])

    def test_admin_can_delete_contact_message(self):
        contact_message = ContactMessage.objects.create(
            full_name='Jane Visitor',
            email='visitor@example.com',
            subject='Remove me',
            message='Temporary inbox item.',
        )
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.delete(
            reverse('contact-messages-api'),
            data=json.dumps({'id': contact_message.id}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(ContactMessage.objects.filter(pk=contact_message.pk).exists())


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

    def test_admin_can_view_system_wide_direct_message_feed(self):
        secondary_admin = User.objects.create_superuser(
            username='opsadmin',
            email='opsadmin@example.com',
            password='SecurePass123!',
        )
        DirectMessage.objects.create(
            sender=self.regular_user,
            recipient=self.admin_user,
            body='Need help with the latest field alert.',
        )
        DirectMessage.objects.create(
            sender=self.other_user,
            recipient=secondary_admin,
            body='Please review my pressure reading.',
        )
        DirectMessage.objects.create(
            sender=secondary_admin,
            recipient=self.other_user,
            body='I am reviewing the pressure issue now.',
        )

        self.client.force_login(self.admin_user)

        response = self.client.get(reverse('direct-messages-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload['summary']['totalMessages'], 3)
        self.assertEqual(len(payload['systemMessages']), 3)
        self.assertEqual(
            payload['systemMessages'][0]['body'],
            'I am reviewing the pressure issue now.',
        )
        self.assertEqual(
            payload['systemMessages'][1]['recipientUsername'],
            'opsadmin',
        )
        self.assertEqual(
            payload['systemMessages'][2]['senderUsername'],
            'fielduser',
        )

    def test_admin_can_delete_direct_message(self):
        direct_message = DirectMessage.objects.create(
            sender=self.regular_user,
            recipient=self.admin_user,
            body='Delete this direct message.',
        )

        self.client.force_login(self.admin_user)

        response = self.client.delete(
            reverse('direct-messages-api'),
            data=json.dumps({'id': direct_message.id}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(DirectMessage.objects.filter(pk=direct_message.pk).exists())


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


@override_settings(STORAGES=TEST_STORAGES)
class AdminDeleteLinksTests(TestCase):
    def setUp(self):
        self.admin_user = User.objects.get(username='uadmin')
        self.client.force_login(self.admin_user)

    def test_product_admin_changelist_shows_delete_link(self):
        product = Product.objects.first()
        assert product is not None

        response = self.client.get(reverse('admin:accounts_product_changelist'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            f'href="{reverse("admin:accounts_product_delete", args=[product.pk])}"',
        )

    def test_site_content_admin_stays_non_deletable(self):
        SiteContent.objects.get_or_create(pk=1)

        response = self.client.get(reverse('admin:accounts_sitecontent_changelist'))

        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, 'class="deletelink"')

    def test_admin_add_form_links_to_existing_records_for_deletion(self):
        response = self.client.get(reverse('admin:accounts_announcement_add'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(
            response,
            reverse('admin:accounts_announcement_changelist'),
        )
        self.assertContains(response, 'Delete existing announcements')


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

        self.assertEqual(response.status_code, 200)
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

        self.assertEqual(response.status_code, 200)
        self.assertIn('/media/products/videos/', response.json()['product']['videoUrl'])

    def test_admin_cannot_save_product_with_unsupported_video_format(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        uploaded_video = SimpleUploadedFile(
            'product.mov',
            b'fake-product-video',
            content_type='video/quicktime',
        )

        response = self.client.post(
            reverse('products-api'),
            data={
                'name': 'Unsupported Product Video',
                'summary': 'Video summary.',
                'description': 'Video product description.',
                'video': uploaded_video,
                'displayOrder': 1,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('video', response.json()['errors'])

    def test_admin_can_update_existing_product_by_id_without_reuploading_media(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        initial_product_count = Product.objects.count()
        product = Product.objects.create(
            name='Field Device Suite',
            summary='Existing summary.',
            description='Existing description.',
            image=SimpleUploadedFile(
                'existing-product.jpg',
                b'existing-product-image',
                content_type='image/jpeg',
            ),
            display_order=1,
        )
        original_image_name = product.image.name

        response = self.client.post(
            reverse('products-api'),
            data={
                'id': product.id,
                'name': 'Field Device Platform',
                'summary': 'Updated summary.',
                'description': 'Updated description.',
                'displayOrder': 4,
            },
        )

        self.assertEqual(response.status_code, 200)
        product.refresh_from_db()
        self.assertEqual(product.name, 'Field Device Platform')
        self.assertEqual(product.summary, 'Updated summary.')
        self.assertEqual(product.description, 'Updated description.')
        self.assertEqual(product.display_order, 4)
        self.assertEqual(product.image.name, original_image_name)
        self.assertEqual(Product.objects.count(), initial_product_count + 1)

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

    def test_admin_can_delete_product(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        product = Product.objects.create(
            name='Delete Product',
            summary='Temporary summary.',
            description='Temporary description.',
            image=SimpleUploadedFile(
                'delete-product.jpg',
                b'delete-product-image',
                content_type='image/jpeg',
            ),
            display_order=7,
        )

        response = self.client.delete(
            reverse('products-api'),
            data=json.dumps({'id': product.id}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Product.objects.filter(pk=product.pk).exists())


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

    def test_admin_cannot_create_announcement_with_unsupported_video_format(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        uploaded_video = SimpleUploadedFile(
            'advert.mov',
            b'fake-advert-video',
            content_type='video/quicktime',
        )

        response = self.client.post(
            reverse('announcements-api'),
            data={
                'kind': 'advert',
                'title': 'Unsupported video advert',
                'message': 'Watch the product in action.',
                'video': uploaded_video,
                'ctaLabel': 'Watch now',
                'ctaLink': 'https://example.com/video',
                'displayOrder': 9,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('video', response.json()['errors'])

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

    def test_admin_can_update_existing_announcement(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        announcement = Announcement.objects.create(
            kind='announcement',
            title='Original notice',
            message='Original message.',
            image=SimpleUploadedFile(
                'original.jpg',
                b'original-image',
                content_type='image/jpeg',
            ),
            display_order=3,
            is_active=True,
        )

        response = self.client.post(
            reverse('announcements-api'),
            data=json.dumps({
                'id': announcement.id,
                'kind': 'advert',
                'title': 'Updated notice',
                'message': 'Updated message.',
                'ctaLabel': 'Read update',
                'ctaLink': 'https://example.com/updated',
                'displayOrder': 5,
                'isActive': False,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        announcement.refresh_from_db()
        self.assertEqual(announcement.kind, 'advert')
        self.assertEqual(announcement.title, 'Updated notice')
        self.assertFalse(announcement.is_active)
        self.assertEqual(response.json()['announcement']['displayOrder'], 5)

    def test_admin_can_delete_announcement(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        announcement = Announcement.objects.create(
            kind='announcement',
            title='Delete announcement',
            message='Temporary message.',
            image=SimpleUploadedFile(
                'delete-announcement.jpg',
                b'delete-announcement-image',
                content_type='image/jpeg',
            ),
            display_order=3,
        )

        response = self.client.delete(
            reverse('announcements-api'),
            data=json.dumps({'id': announcement.id}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Announcement.objects.filter(pk=announcement.pk).exists())

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

    def test_admin_can_update_registered_sensor(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        sensor = Sensor.objects.create(
            sensor_code='AQS-011',
            display_name='Tank One Sensor',
            location='Main tank inlet',
            description='Primary field sensor.',
            is_active=True,
        )

        response = self.client.post(
            reverse('sensors-api'),
            data=json.dumps({
                'id': sensor.id,
                'sensorCode': 'AQS-011',
                'displayName': 'Updated Tank Sensor',
                'location': 'North tank outlet',
                'description': 'Updated notes.',
                'isActive': False,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        sensor.refresh_from_db()
        self.assertEqual(sensor.display_name, 'Updated Tank Sensor')
        self.assertEqual(sensor.location, 'North tank outlet')
        self.assertFalse(sensor.is_active)

    def test_admin_can_delete_registered_sensor_without_linked_leaks(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        sensor = Sensor.objects.create(
            sensor_code='AQS-099',
            display_name='Delete Sensor',
            location='Temporary line',
            description='Temporary sensor.',
        )

        response = self.client.delete(
            reverse('sensors-api'),
            data=json.dumps({'id': sensor.id}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Sensor.objects.filter(pk=sensor.pk).exists())

    def test_admin_cannot_delete_sensor_with_linked_leaks(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        sensor = Sensor.objects.create(
            sensor_code='AQS-098',
            display_name='Protected Sensor',
            location='Protected line',
        )
        LeakReport.objects.create(
            sensor=sensor,
            leakage_rate='18.00',
            status=LeakReport.Status.CRITICAL,
        )

        response = self.client.delete(
            reverse('sensors-api'),
            data=json.dumps({'id': sensor.id}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertTrue(Sensor.objects.filter(pk=sensor.pk).exists())

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

    def test_admin_can_update_leak_report(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        sensor = Sensor.objects.create(
            sensor_code='AQS-012',
            display_name='West Loop D10',
            location='Busega backup line',
        )
        leak_report = LeakReport.objects.create(
            sensor=sensor,
            leakage_rate='18.25',
            status=LeakReport.Status.INVESTIGATING,
            observed_at='2026-03-11T09:45:00+03:00',
            display_order=2,
            is_active=True,
        )

        response = self.client.post(
            reverse('leak-reports-api'),
            data=json.dumps({
                'id': leak_report.id,
                'sensorId': sensor.pk,
                'leakageRate': '12.10',
                'status': 'resolved',
                'observedAt': '2026-03-12T09:45:00+03:00',
                'displayOrder': 4,
                'isActive': False,
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        leak_report.refresh_from_db()
        self.assertEqual(str(leak_report.leakage_rate), '12.10')
        self.assertEqual(leak_report.status, LeakReport.Status.RESOLVED)
        self.assertFalse(leak_report.is_active)

    def test_admin_can_delete_leak_report(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        sensor = Sensor.objects.create(
            sensor_code='AQS-013',
            display_name='Delete Leak Sensor',
            location='Delete Leak Location',
        )
        leak_report = LeakReport.objects.create(
            sensor=sensor,
            leakage_rate='13.25',
            status=LeakReport.Status.INVESTIGATING,
            display_order=2,
        )

        response = self.client.delete(
            reverse('leak-reports-api'),
            data=json.dumps({'id': leak_report.id}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(LeakReport.objects.filter(pk=leak_report.pk).exists())

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

    def test_iot_esp32_payload_accepts_leak_detected_location_and_time(self):
        sensor = Sensor.objects.create(
            sensor_code='AQS-014',
            display_name='Zone 5 Telemetry Node',
            location='Registered sensor location',
        )

        response = self.client.post(
            reverse('iot-leak-reports-api'),
            data=json.dumps({
                'sensorCode': sensor.sensor_code,
                'leakDetected': True,
                'location': 'Valve chamber sector B',
                'time': '2026-03-25T10:15:00+03:00',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        leak_report = LeakReport.objects.get(sensor=sensor)
        self.assertEqual(leak_report.status, LeakReport.Status.CRITICAL)
        self.assertTrue(leak_report.is_active)
        self.assertEqual(leak_report.location, 'Valve chamber sector B')
        self.assertEqual(
            leak_report.observed_at,
            datetime.fromisoformat('2026-03-25T10:15:00+03:00').astimezone(
                leak_report.observed_at.tzinfo
            ),
        )
        payload = response.json()['leakReport']
        self.assertEqual(payload['location'], 'Valve chamber sector B')
        self.assertEqual(payload['status'], 'critical')

    def test_iot_esp32_payload_maps_no_leakage_to_resolved_signal(self):
        sensor = Sensor.objects.create(
            sensor_code='AQS-015',
            display_name='Zone 6 Telemetry Node',
            location='Registered sensor location',
        )

        response = self.client.post(
            reverse('iot-leak-reports-api'),
            data=json.dumps({
                'sensorCode': sensor.sensor_code,
                'leakDetected': 'no leakage',
                'location': 'Valve chamber sector C',
                'time': '2026-03-25T10:20:00+03:00',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        leak_report = LeakReport.objects.get(sensor=sensor)
        self.assertEqual(leak_report.status, LeakReport.Status.RESOLVED)
        self.assertFalse(leak_report.is_active)
        self.assertEqual(str(leak_report.leakage_rate), '0.00')
        payload = response.json()['leakReport']
        self.assertEqual(payload['status'], 'resolved')
        self.assertFalse(payload['isActive'])

    def test_iot_esp32_payload_rejects_conflicting_status_and_leak_detected(self):
        sensor = Sensor.objects.create(
            sensor_code='AQS-016',
            display_name='Zone 7 Telemetry Node',
            location='Registered sensor location',
        )

        response = self.client.post(
            reverse('iot-leak-reports-api'),
            data=json.dumps({
                'sensorCode': sensor.sensor_code,
                'leakDetected': False,
                'status': 'critical',
                'time': '2026-03-25T10:25:00+03:00',
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('status', response.json()['errors'])


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

    @override_settings(STORAGES=TEST_STORAGES)
    def test_site_content_endpoint_includes_background_media_urls(self):
        site_content = SiteContent.objects.get(pk=1)
        site_content.login_background_video = SimpleUploadedFile(
            'login-background.mp4',
            b'video-bytes',
            content_type='video/mp4',
        )
        site_content.login_background_primary = SimpleUploadedFile(
            'login-primary.jpg',
            b'primary-image-bytes',
            content_type='image/jpeg',
        )
        site_content.login_background_secondary = SimpleUploadedFile(
            'login-secondary.jpg',
            b'secondary-image-bytes',
            content_type='image/jpeg',
        )
        site_content.workspace_background_video = SimpleUploadedFile(
            'workspace-background.mp4',
            b'workspace-video-bytes',
            content_type='video/mp4',
        )
        site_content.workspace_background_primary = SimpleUploadedFile(
            'workspace-primary.jpg',
            b'workspace-primary-image-bytes',
            content_type='image/jpeg',
        )
        site_content.workspace_background_secondary = SimpleUploadedFile(
            'workspace-secondary.jpg',
            b'workspace-secondary-image-bytes',
            content_type='image/jpeg',
        )
        site_content.save()

        response = self.client.get(reverse('site-content-api'))
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertIn('site_content/login/', payload['media']['loginBackgroundVideoUrl'])
        self.assertIn('login-background', payload['media']['loginBackgroundVideoUrl'])
        self.assertIn('site_content/login/', payload['media']['loginBackgroundPrimaryUrl'])
        self.assertIn('login-primary', payload['media']['loginBackgroundPrimaryUrl'])
        self.assertIn('site_content/login/', payload['media']['loginBackgroundSecondaryUrl'])
        self.assertIn('login-secondary', payload['media']['loginBackgroundSecondaryUrl'])
        self.assertIn(
            'site_content/workspace/',
            payload['media']['workspaceBackgroundVideoUrl'],
        )
        self.assertIn(
            'workspace-background',
            payload['media']['workspaceBackgroundVideoUrl'],
        )
        self.assertIn(
            'site_content/workspace/',
            payload['media']['workspaceBackgroundPrimaryUrl'],
        )
        self.assertIn(
            'workspace-primary',
            payload['media']['workspaceBackgroundPrimaryUrl'],
        )
        self.assertIn(
            'site_content/workspace/',
            payload['media']['workspaceBackgroundSecondaryUrl'],
        )
        self.assertIn(
            'workspace-secondary',
            payload['media']['workspaceBackgroundSecondaryUrl'],
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

    @override_settings(STORAGES=TEST_STORAGES)
    def test_admin_can_update_site_content_media_with_multipart_payload(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('site-content-api'),
            data={
                'brand_name': 'Aqual Sentinel',
                'highlights': json.dumps({
                    'home': [
                        {
                            'title': 'Updated highlight',
                            'description': 'Saved from multipart form data.',
                            'displayOrder': 1,
                        }
                    ]
                }),
                'loginBackgroundVideo': SimpleUploadedFile(
                    'login-background.mp4',
                    b'video-bytes',
                    content_type='video/mp4',
                ),
                'workspaceBackgroundPrimary': SimpleUploadedFile(
                    'workspace-primary.jpg',
                    b'image-bytes',
                    content_type='image/jpeg',
                ),
            },
        )

        self.assertEqual(response.status_code, 200)
        site_content = SiteContent.objects.get(pk=1)
        self.assertTrue(bool(site_content.login_background_video))
        self.assertTrue(bool(site_content.workspace_background_primary))
        self.assertTrue(
            SiteHighlight.objects.filter(page='home', title='Updated highlight').exists()
        )

    def test_admin_cannot_upload_unsupported_site_background_video_format(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('site-content-api'),
            data={
                'brand_name': 'Aqual Sentinel',
                'loginBackgroundVideo': SimpleUploadedFile(
                    'login-background.mov',
                    b'video-bytes',
                    content_type='video/quicktime',
                ),
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('loginBackgroundVideo', response.json()['errors'])

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

    @override_settings(STORAGES=TEST_STORAGES)
    def test_admin_can_reset_site_content(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)
        site_content = SiteContent.objects.get(pk=1)
        site_content.brand_name = 'Custom Brand'
        site_content.login_background_video = SimpleUploadedFile(
            'login-background.mp4',
            b'video-bytes',
            content_type='video/mp4',
        )
        site_content.save()
        SiteHighlight.objects.create(
            page='home',
            title='Temporary highlight',
            display_order=99,
        )
        PageSection.objects.create(
            page=PageSection.Page.HOME,
            slot='temporary_section',
            audience=PageSection.Audience.ALL,
            title='Temporary section',
            is_active=True,
        )

        response = self.client.delete(reverse('site-content-api'))

        self.assertEqual(response.status_code, 200)
        payload = response.json()['siteContent']
        self.assertEqual(payload['brand']['name'], 'Aqual Sentinel')
        self.assertFalse(payload['media']['loginBackgroundVideoUrl'])
        self.assertFalse(SiteHighlight.objects.filter(title='Temporary highlight').exists())
        self.assertFalse(PageSection.objects.filter(slot='temporary_section').exists())
        self.assertFalse(payload['highlights']['home'])
        self.assertFalse(payload['sections']['home'])

    def test_admin_can_replace_highlights_and_sections_from_frontend_payload(self):
        admin_user = User.objects.get(username='uadmin')
        self.client.force_login(admin_user)

        response = self.client.post(
            reverse('site-content-api'),
            data=json.dumps({
                'highlights': {
                    'home': [
                        {
                            'title': 'New home highlight',
                            'description': 'Updated from the frontend workspace.',
                            'displayOrder': 1,
                        }
                    ]
                },
                'sections': {
                    'home': [
                        {
                            'slot': 'frontend_home_cards',
                            'audience': 'all',
                            'kind': 'cards',
                            'sourceType': '',
                            'tabLabel': 'Frontend cards',
                            'eyebrow': 'Frontend studio',
                            'title': 'Managed from the workspace',
                            'description': 'This section was saved from the frontend admin.',
                            'ctaLabel': 'Review',
                            'ctaLink': 'https://example.com/frontend',
                            'itemLimit': 3,
                            'displayOrder': 1,
                            'isActive': True,
                            'cards': [
                                {
                                    'key': 'frontend_card',
                                    'eyebrow': 'Live',
                                    'title': 'Frontend-owned content',
                                    'description': 'Saved without Django admin.',
                                    'tone': 'sea',
                                    'displayOrder': 1,
                                    'isActive': True,
                                }
                            ],
                        }
                    ]
                },
            }),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            SiteHighlight.objects.filter(page='home').count(),
            1,
        )
        self.assertTrue(
            SiteHighlight.objects.filter(
                page='home',
                title='New home highlight',
            ).exists()
        )
        self.assertEqual(PageSection.objects.filter(page='home').count(), 1)
        self.assertTrue(
            PageSection.objects.filter(page='home', slot='frontend_home_cards').exists()
        )
        self.assertTrue(
            PageSectionCard.objects.filter(card_key='frontend_card').exists()
        )
        payload = response.json()['siteContent']
        self.assertEqual(payload['highlights']['home'][0]['title'], 'New home highlight')
        self.assertEqual(payload['sections']['home'][0]['slot'], 'frontend_home_cards')


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
