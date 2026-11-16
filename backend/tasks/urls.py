from django.urls import path
from rest_framework.routers import DefaultRouter

from .user_views import UserCreateView, UserListView
from .views import TaskViewSet

router = DefaultRouter()
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/register/", UserCreateView.as_view(), name="user-register"),
] + router.urls
