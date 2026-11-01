from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.exceptions import PermissionDenied


class IsDischargePlanAuthorized(BasePermission):
    """
    Strict clinical authorization rules for Discharge Plans:
    - Admin / Staff: Authorized for full access to all plans.
    - Doctor: Authorized ONLY for discharge plans where:
        1. The doctor authored / is assigned to the plan (plan.doctor == doctor), OR
        2. The plan's patient has this doctor as their primary_doctor.
        Attempts to access discharge plans of other doctors' patients return HTTP 403 Forbidden.
    - Patient: Authorized ONLY to view their own discharge plan (plan.patient.user == request.user).
        Attempts to access another patient's plan return HTTP 403 Forbidden.
    - Caregiver: Authorized ONLY to view the discharge plan of their linked patient.
        Attempts to access an unlinked patient's plan return HTTP 403 Forbidden.
    - Nurse: Authorized to view plans for patients assigned to them or in their department.
    """
    message = "Access Denied: You are not authorized to view or modify this discharge plan."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        # Only doctors, nurses, and admins can create new discharge plans
        if request.method == 'POST':
            return bool(
                request.user.role in ['doctor', 'nurse', 'admin']
                or request.user.is_staff
                or request.user.is_superuser
            )
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        # 1. Administrator / Staff: Full access
        if user.is_staff or user.is_superuser or user.role == 'admin':
            return True

        # 2. Doctor: Must be assigned to this patient or plan
        if user.role == 'doctor':
            doctor_profile = getattr(user, 'doctor_profile', None)
            if not doctor_profile:
                return False

            is_assigned = (
                obj.doctor_id == doctor_profile.id
                or (obj.patient and obj.patient.primary_doctor_id == doctor_profile.id)
            )
            if not is_assigned:
                return False

            # Doctors can view and edit their own assigned patient plans
            return True

        # 3. Patient: Can view only their own discharge plan (safe methods only)
        if user.role == 'patient':
            if request.method not in SAFE_METHODS:
                return False
            patient_profile = getattr(user, 'patient_profile', None)
            if not patient_profile:
                return False
            return obj.patient_id == patient_profile.id

        # 4. Caregiver: Can view only their linked patient's discharge plan
        if user.role == 'caregiver':
            if request.method not in SAFE_METHODS:
                return False
            caregiver_profile = getattr(user, 'caregiver_profile', None)
            if not caregiver_profile or not caregiver_profile.patient_id:
                return False
            return obj.patient_id == caregiver_profile.patient_id

        # 5. Nurse: Can view plans for assigned patients or department
        if user.role == 'nurse':
            nurse_profile = getattr(user, 'nurse_profile', None)
            if not nurse_profile:
                return False
            if not obj.patient:
                return False
            is_nurse_assigned = (
                obj.patient.assigned_nurses.filter(id=nurse_profile.id).exists()
                or (
                    nurse_profile.department_id
                    and obj.patient.primary_doctor
                    and obj.patient.primary_doctor.department_id == nurse_profile.department_id
                )
            )
            return is_nurse_assigned

        return False
