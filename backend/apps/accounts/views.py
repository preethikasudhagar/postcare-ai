from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import UserSerializer, RegisterSerializer

class RegisterView(APIView):
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
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password')
        try:
            user_obj = User.objects.get(email__iexact=email)
            user = authenticate(username=user_obj.email, password=password) or authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            })
        return Response({'message': 'Invalid email or password credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        name = (request.data.get('name') or 'Demo Patient').strip()
        role = request.data.get('role', 'patient')

        if not email:
            email = 'patient@postcare.demo'

        user = User.objects.filter(email__iexact=email).first()
        if not user:
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
                first_name=first_name,
                last_name=last_name,
                role=role
            )
            if role == 'patient':
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

class LogoutView(APIView):
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
