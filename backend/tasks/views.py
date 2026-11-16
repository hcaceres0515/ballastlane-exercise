from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.select_related("assignee", "created_by")
        params = self.request.query_params

        if status_param := params.get("status"):
            qs = qs.filter(status=status_param)
        if assignee := params.get("assignee"):
            qs = qs.filter(assignee_id=assignee)
        if due_before := params.get("due_before"):
            qs = qs.filter(due_date__lte=due_before)
        if due_after := params.get("due_after"):
            qs = qs.filter(due_date__gte=due_after)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(created_by=user if user.is_authenticated else None)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        task.status = Task.Status.DONE
        task.completed_at = timezone.now()
        task.save(update_fields=["status", "completed_at", "updated_at"])
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        task = self.get_object()
        assignee_id = request.data.get("assignee")
        if not assignee_id:
            return Response(
                {"assignee": "This field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        task.assignee_id = assignee_id
        task.save(update_fields=["assignee", "updated_at"])
        return Response(self.get_serializer(task).data)
