from django.conf import settings
from django.contrib import admin
from django.conf.urls.static import static
from django.urls import include, path, re_path
from django.views.static import serve

from .views import frontend_app

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # This deployment serves uploads directly from Django in production.
    media_prefix = settings.MEDIA_URL.lstrip('/')
    urlpatterns += [
        re_path(
            rf'^{media_prefix}(?P<path>.*)$',
            serve,
            {'document_root': settings.MEDIA_ROOT},
        ),
    ]

urlpatterns += [
    re_path(r'^(?!api/|admin/|static/|media/).*$' , frontend_app, name='frontend-app'),
]
