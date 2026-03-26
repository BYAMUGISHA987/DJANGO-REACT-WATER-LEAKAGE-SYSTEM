from django.conf import settings
from django.http import HttpResponse


class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        allowed_origin = self._allowed_origin(request)

        if request.method == 'OPTIONS' and allowed_origin:
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        if not allowed_origin:
            return response

        response['Access-Control-Allow-Origin'] = allowed_origin
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Headers'] = request.headers.get(
            'Access-Control-Request-Headers',
            'Content-Type, X-CSRFToken',
        )
        response['Access-Control-Allow-Methods'] = request.headers.get(
            'Access-Control-Request-Method',
            'GET, POST, DELETE, OPTIONS',
        )

        vary_value = response.get('Vary')
        if vary_value:
            if 'Origin' not in vary_value:
                response['Vary'] = f'{vary_value}, Origin'
        else:
            response['Vary'] = 'Origin'

        return response

    def _allowed_origin(self, request):
        origin = request.headers.get('Origin')
        if not origin:
            return ''

        return (
            origin
            if origin in getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
            else ''
        )
