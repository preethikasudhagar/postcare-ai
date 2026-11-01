from rest_framework.permissions import BasePermission


def is_approved_doctor(user):
    """Verify that a doctor user is authenticated, active, and approved by hospital administration."""
    if not (user and user.is_authenticated and user.is_active and user.role == 'doctor'):
        return False
    doctor_profile = getattr(user, 'doctor_profile', None)
    if doctor_profile is None:
        return True  # fallback if profile not yet loaded or created
    return doctor_profile.approval_status == 'approved'


class IsDoctor(BasePermission):
    """Allow access only to approved doctors."""

    def has_permission(self, request, view):
        return is_approved_doctor(request.user)


class IsPatient(BasePermission):
    """Allow access only to users with the 'patient' role."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active and request.user.role == 'patient')


class IsNurse(BasePermission):
    """Allow access only to users with the 'nurse' role."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active and request.user.role == 'nurse')


class IsAdmin(BasePermission):
    """Allow access only to users with the 'admin' role, staff, or superusers."""

    def has_permission(self, request, view):
        return bool(
            request.user 
            and request.user.is_authenticated 
            and request.user.is_active
            and (request.user.role == 'admin' or request.user.is_staff or request.user.is_superuser)
        )


class IsCaregiver(BasePermission):
    """Allow access only to users with the 'caregiver' role."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active and request.user.role == 'caregiver')


class IsDoctorOrNurse(BasePermission):
    """Allow access only to approved doctors or nurses."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False
        if request.user.role == 'nurse':
            return True
        if request.user.role == 'doctor':
            return is_approved_doctor(request.user)
        return False


class IsDoctorOrAdmin(BasePermission):
    """Allow access only to approved doctors or admins."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False
        if request.user.role == 'admin' or request.user.is_staff or request.user.is_superuser:
            return True
        if request.user.role == 'doctor':
            return is_approved_doctor(request.user)
        return False


class IsDoctorNurseOrAdmin(BasePermission):
    """Allow access to approved doctors, nurses, or admins."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_active):
            return False
        if request.user.role == 'admin' or request.user.is_staff or request.user.is_superuser:
            return True
        if request.user.role == 'nurse':
            return True
        if request.user.role == 'doctor':
            return is_approved_doctor(request.user)
        return False
