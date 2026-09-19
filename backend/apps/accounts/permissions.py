from rest_framework.permissions import BasePermission


class IsDoctor(BasePermission):
    """Allow access only to users with the 'doctor' role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'doctor'


class IsPatient(BasePermission):
    """Allow access only to users with the 'patient' role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'patient'


class IsNurse(BasePermission):
    """Allow access only to users with the 'nurse' role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'nurse'


class IsAdmin(BasePermission):
    """Allow access only to users with the 'admin' role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsCaregiver(BasePermission):
    """Allow access only to users with the 'caregiver' role."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'caregiver'


class IsDoctorOrNurse(BasePermission):
    """Allow access only to doctors or nurses."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['doctor', 'nurse']


class IsDoctorOrAdmin(BasePermission):
    """Allow access only to doctors or admins."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['doctor', 'admin']


class IsDoctorNurseOrAdmin(BasePermission):
    """Allow access to doctors, nurses, or admins."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['doctor', 'nurse', 'admin']
