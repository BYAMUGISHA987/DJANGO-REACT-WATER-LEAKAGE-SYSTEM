from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import redirect


def frontend_app(request):
    index_file = settings.BASE_DIR / 'frontend_dist' / 'index.html'

    if index_file.exists():
        return HttpResponse(
            index_file.read_text(encoding='utf-8'),
            content_type='text/html',
        )

    if settings.DEBUG:
        return redirect('http://127.0.0.1:5173/')

    return HttpResponse(
        'Frontend build not found. Run the frontend build before deploying.',
        status=503,
    )
