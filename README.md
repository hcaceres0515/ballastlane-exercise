# Task Manager — Ballast Lane Exercise

Task management system: **Django + DRF** backend, **PostgreSQL**, **Celery + RabbitMQ**, **React + Vite** frontend. Fully dockerized.

## Features

- **Task CRUD** — create, read, update, delete tasks (`title`, `description`, `status`, `due_date`, `assignee`)
- **Assign & complete** — assign tasks to users; mark completed (`completed_at` timestamp)
- **Filtering** — by `status`, `assignee`, `due_before`, `due_after`
- **Pagination** — page-number pagination (page size 2 for demo/testing)
- **JWT auth** — all endpoints require a token except user registration
- **Rate limiting** — anon 30/min, authenticated 120/min, registration 5/min
- **Users** — public registration; authenticated user list (powers the assignee dropdown)
- **Tests** — pytest + coverage (99%), throttling-aware fixtures

## Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Backend  | Django 4.2, DRF, djangorestframework-simplejwt    |
| Frontend | React 18, Vite, React Router, axios               |
| Database | PostgreSQL 16                                     |
| Worker   | Celery 5 + RabbitMQ 3                             |
| Infra    | Docker Compose                                    |

## Structure

```
backend/
  config/         settings, urls, wsgi, celery app
  tasks/          models, serializers, views, user_views, tests
frontend/
  src/api.js      axios client + JWT interceptors
  src/components/ TaskForm, TaskList, Filters, UserForm, LoginForm
  src/pages/      Home.jsx
docker-compose.yml
.env              shared env vars (dev defaults)
```

## Services

| Service   | Port  | Notes                        |
|-----------|-------|------------------------------|
| backend   | 8000  | Django dev server            |
| frontend  | 5173  | Vite dev server, `/api` proxy |
| db        | 5432  | Postgres 16                  |
| rabbitmq  | 5672  | AMQP; management UI on 15672 |
| celery    | —     | worker, broker = rabbitmq    |

## Install & run

```bash
cp .env.example .env
docker compose up --build
```

First time only:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser   # optional, for /admin
```

- Frontend: http://localhost:5173
- API health check: http://localhost:8000/health/
- Django admin: http://localhost:8000/admin/
- RabbitMQ UI: http://localhost:15672 (guest/guest)

## API

All endpoints require `Authorization: Bearer <access>` unless noted.

| Method | Endpoint                    | Description                              |
|--------|-----------------------------|------------------------------------------|
| POST   | `/api/token/`               | Obtain `{access, refresh}` (login)       |
| POST   | `/api/token/refresh/`       | Refresh access token                     |
| POST   | `/api/users/register/`      | Register user — **public**, 5 req/min    |
| GET    | `/api/users/`               | List users                               |
| GET    | `/api/tasks/`               | List tasks (paginated, filterable)       |
| POST   | `/api/tasks/`               | Create task (`created_by` = caller)      |
| GET    | `/api/tasks/{id}/`          | Retrieve task                            |
| PATCH  | `/api/tasks/{id}/`          | Update task                              |
| DELETE | `/api/tasks/{id}/`          | Delete task                              |
| POST   | `/api/tasks/{id}/complete/` | Mark done + stamp `completed_at`         |
| POST   | `/api/tasks/{id}/assign/`   | Assign — body `{"assignee": <user_id>}`  |

### Filters (on `GET /api/tasks/`)

```
?status=todo|in_progress|done
?assignee=<user_id>
?due_before=YYYY-MM-DD
?due_after=YYYY-MM-DD
?page=<n>
```

### Quick test with curl

```bash
# 1. Register
curl -X POST http://localhost:8000/api/users/register/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"demopass123"}'

# 2. Get token
curl -X POST http://localhost:8000/api/token/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"demopass123"}'

# 3. Create a task
curl -X POST http://localhost:8000/api/tasks/ \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -d '{"title":"My task","due_date":"2026-12-31"}'
```

The React frontend (http://localhost:5173) exposes the same flow: register → log in → manage tasks.

## Tests

```bash
# run suite
docker compose exec backend pytest -q

# with coverage (enforces >=80%)
docker compose exec backend coverage run -m pytest -q
docker compose exec backend coverage report --fail-under=80
```

Current: **22 tests, ~99% coverage** on `tasks/` and `config/`.

## Notes / decisions

- `created_by` is set automatically from the JWT user; `assignee` is optional and uses `SET_NULL` on user delete.
- Throttling uses Django's locmem cache in dev; point `CACHES` at Redis for multi-worker limits.
- Vite proxies `/api` → `backend:8000` inside the compose network (no CORS issues); `CORS_ALLOWED_ORIGINS` still whitelists `localhost:5173` for direct calls.
- `PAGE_SIZE=2` is intentionally small to make pagination easy to see; raise it in `config/settings.py`.
