import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import Task

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_throttle_cache(db):
    from django.core.cache import cache
    cache.clear()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="alice", password="pass12345")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="bob", password="pass12345")


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def auth_client(client, user):
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def task(db, user):
    return Task.objects.create(title="Sample", created_by=user)


@pytest.mark.django_db
class TestAuthentication:
    def test_anonymous_gets_401(self, client, task):
        assert client.get("/api/tasks/").status_code == 401
        assert client.post("/api/tasks/", {"title": "x"}).status_code == 401
        assert client.get(f"/api/tasks/{task.id}/").status_code == 401
        assert client.get("/api/users/").status_code == 401

    def test_obtain_token(self, client, user):
        res = client.post(
            "/api/token/",
            {"username": "alice", "password": "pass12345"},
            format="json",
        )
        assert res.status_code == 200
        assert "access" in res.data
        assert "refresh" in res.data

    def test_token_grants_access(self, client, user, task):
        res = client.post(
            "/api/token/",
            {"username": "alice", "password": "pass12345"},
            format="json",
        )
        token = res.data["access"]
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        assert client.get("/api/tasks/").status_code == 200

    def test_refresh_token(self, client, user):
        res = client.post(
            "/api/token/",
            {"username": "alice", "password": "pass12345"},
            format="json",
        )
        res2 = client.post(
            "/api/token/refresh/", {"refresh": res.data["refresh"]}, format="json"
        )
        assert res2.status_code == 200
        assert "access" in res2.data

    def test_bad_credentials_rejected(self, client, user):
        res = client.post(
            "/api/token/",
            {"username": "alice", "password": "wrong"},
            format="json",
        )
        assert res.status_code == 401


@pytest.mark.django_db
class TestTaskCRUD:
    def test_create_task_authenticated(self, auth_client, user):
        res = auth_client.post(
            "/api/tasks/", {"title": "New", "status": "todo"}, format="json"
        )
        assert res.status_code == 201
        assert res.data["created_by"] == user.id

    def test_create_task_requires_title(self, auth_client):
        res = auth_client.post("/api/tasks/", {"title": ""}, format="json")
        assert res.status_code == 400

    def test_list_tasks(self, auth_client, task):
        res = auth_client.get("/api/tasks/")
        assert res.status_code == 200
        assert res.data["count"] == 1
        assert res.data["results"][0]["title"] == "Sample"

    def test_retrieve_task(self, auth_client, task):
        res = auth_client.get(f"/api/tasks/{task.id}/")
        assert res.status_code == 200
        assert res.data["id"] == task.id

    def test_update_task(self, auth_client, task):
        res = auth_client.patch(
            f"/api/tasks/{task.id}/", {"title": "Updated"}, format="json"
        )
        assert res.status_code == 200
        task.refresh_from_db()
        assert task.title == "Updated"

    def test_delete_task(self, auth_client, task):
        res = auth_client.delete(f"/api/tasks/{task.id}/")
        assert res.status_code == 204
        assert not Task.objects.filter(id=task.id).exists()

    def test_retrieve_missing_task(self, auth_client):
        assert auth_client.get("/api/tasks/999/").status_code == 404


@pytest.mark.django_db
class TestTaskActions:
    def test_complete_marks_done(self, auth_client, task):
        res = auth_client.post(f"/api/tasks/{task.id}/complete/")
        assert res.status_code == 200
        task.refresh_from_db()
        assert task.status == Task.Status.DONE
        assert task.completed_at is not None

    def test_assign_task(self, auth_client, task, other_user):
        res = auth_client.post(
            f"/api/tasks/{task.id}/assign/",
            {"assignee": other_user.id},
            format="json",
        )
        assert res.status_code == 200
        task.refresh_from_db()
        assert task.assignee_id == other_user.id

    def test_assign_requires_assignee(self, auth_client, task):
        res = auth_client.post(f"/api/tasks/{task.id}/assign/", {}, format="json")
        assert res.status_code == 400


@pytest.mark.django_db
class TestTaskFilters:
    def test_filter_by_status(self, auth_client, user):
        Task.objects.create(title="T1", status="todo", created_by=user)
        Task.objects.create(title="T2", status="done", created_by=user)
        res = auth_client.get("/api/tasks/?status=done")
        assert res.data["count"] == 1
        assert res.data["results"][0]["title"] == "T2"

    def test_filter_by_due_date_range(self, auth_client, user):
        Task.objects.create(title="Early", due_date="2026-01-01", created_by=user)
        Task.objects.create(title="Late", due_date="2026-12-31", created_by=user)
        res = auth_client.get("/api/tasks/?due_before=2026-06-01")
        assert res.data["count"] == 1
        assert res.data["results"][0]["title"] == "Early"
        res = auth_client.get("/api/tasks/?due_after=2026-06-01")
        assert res.data["results"][0]["title"] == "Late"

    def test_filter_by_assignee(self, auth_client, user, other_user):
        Task.objects.create(title="A", assignee=user, created_by=user)
        Task.objects.create(title="B", assignee=other_user, created_by=user)
        res = auth_client.get(f"/api/tasks/?assignee={other_user.id}")
        assert res.data["count"] == 1
        assert res.data["results"][0]["title"] == "B"

    def test_pagination_page_size_two(self, auth_client, user):
        for i in range(5):
            Task.objects.create(title=f"T{i}", created_by=user)
        res = auth_client.get("/api/tasks/")
        assert res.data["count"] == 5
        assert len(res.data["results"]) == 2
        res2 = auth_client.get("/api/tasks/?page=3")
        assert len(res2.data["results"]) == 1


@pytest.mark.django_db
class TestUsers:
    def test_register_user(self, client):
        res = client.post(
            "/api/users/register/",
            {"username": "newbie", "email": "n@x.com", "password": "secret123"},
            format="json",
        )
        assert res.status_code == 201
        u = User.objects.get(username="newbie")
        assert u.check_password("secret123")
        assert "password" not in res.data

    def test_register_rejects_short_password(self, client):
        res = client.post(
            "/api/users/register/",
            {"username": "x", "password": "short"},
            format="json",
        )
        assert res.status_code == 400

    def test_list_users(self, auth_client, user):
        res = auth_client.get("/api/users/")
        assert res.status_code == 200
        assert any(u["username"] == "alice" for u in res.data["results"])
