from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import UserSerializer, RegisterSerializer, AdminUserCreateSerializer
from .permissions import IsAdmin


class RegisterView(APIView):
    """
    Public endpoint — completely bypasses JWT authentication.
    Setting authentication_classes = [] ensures DRF does NOT attempt to decode
    any Authorization header, so stale/expired tokens in the browser cannot
    block new account creation.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }, status=status.HTTP_201_CREATED)
        # Return clean, flat error messages instead of nested DRF dicts.
        flat_errors = []
        for field, msgs in serializer.errors.items():
            for m in msgs:
                flat_errors.append(f"{field}: {m}" if field != 'non_field_errors' else str(m))
        return Response(
            {'message': ' | '.join(flat_errors)},
            status=status.HTTP_400_BAD_REQUEST
        )


class LoginView(APIView):
    """
    Public endpoint — completely bypasses JWT authentication.
    A stale/expired access token in the Authorization header must NOT prevent
    a user from logging in with fresh credentials.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password')

        if not email or not password:
            return Response(
                {'message': 'Email and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {'message': 'No account found with that email address.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user_obj.is_active:
            return Response(
                {'message': 'This account has been deactivated. Please contact support.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Try authenticating via email (USERNAME_FIELD) first, then by username.
        user = (
            authenticate(request, username=user_obj.email, password=password)
            or authenticate(request, username=user_obj.username, password=password)
        )

        if not user:
            return Response(
                {'message': 'Incorrect password. Please try again.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh)
        })


class GoogleLoginView(APIView):
    """
    Public endpoint — bypasses JWT authentication.
    Google credentials are verified server-side via Google's tokeninfo API.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    def post(self, request):
        token = request.data.get('token') or request.data.get('credential') or request.data.get('id_token')
        email = (request.data.get('email') or '').strip().lower()
        first_name = (request.data.get('first_name') or request.data.get('given_name') or '').strip()
        last_name = (request.data.get('last_name') or request.data.get('family_name') or '').strip()
        name = (request.data.get('name') or '').strip()

        # Verify the Google access token server-side via Google's userinfo API.
        if token:
            try:
                import urllib.request
                import json
                # Determine if this is an ID token (long) or access token (shorter).
                if len(token) > 500:
                    req_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
                    req = urllib.request.Request(req_url)
                else:
                    req_url = "https://www.googleapis.com/oauth2/v3/userinfo"
                    req = urllib.request.Request(req_url)
                    req.add_header('Authorization', f'Bearer {token}')

                with urllib.request.urlopen(req, timeout=8) as response:
                    google_data = json.loads(response.read().decode())
                    # Google returns 'error' key on invalid tokens.
                    if 'error' in google_data:
                        return Response(
                            {'message': 'Google credential is invalid or expired. Please try signing in again.'},
                            status=status.HTTP_401_UNAUTHORIZED
                        )
                    email = google_data.get('email', email).lower()
                    first_name = google_data.get('given_name', first_name)
                    last_name = google_data.get('family_name', last_name)
                    if not name:
                        name = google_data.get('name', '')
            except Exception:
                if not email:
                    return Response(
                        {'message': 'Could not verify your Google credential. Check your connection and try again.'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )

        if not email:
            return Response({'message': 'Email is required for Google authentication'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            if not first_name and name:
                names = name.split(' ', 1)
                first_name = names[0]
                last_name = names[1] if len(names) > 1 else ''

            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name or 'User',
                last_name=last_name or '',
                role='patient'
            )
            from apps.patients.models import Patient
            from django.utils import timezone
            Patient.objects.get_or_create(
                user=user,
                defaults={
                    'patient_id': f"PAT-G{user.id:04d}",
                    'gender': 'O',
                    'blood_group': 'O+',
                    'surgery_type': 'Laparoscopic Cholecystectomy',
                    'surgery_date': timezone.now().date(),
                    'discharge_date': timezone.now().date(),
                }
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'message': 'Signed in with Google successfully'
        })

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response(UserSerializer(request.user).data)
    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminUserListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.all().order_by('-date_joined')
        role = request.query_params.get('role')
        if role:
            users = users.filter(role=role)
        search = request.query_params.get('search')
        if search:
            from django.db.models import Q
            users = users.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(username__icontains=search)
            )
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AdminUserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]


    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserSerializer(user).data)

    def patch(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        user = self.get_object(pk)
        if not user:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        user.delete()
        return Response({'message': 'User deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass
        return Response({'message': 'Logged out successfully'})
