# Code_refactoring_pr3

# Practical Work №3 — Microservices Architecture

## Описание
В рамках практической работы было выполнено рефакторинг монолитного приложения
в микросервисную архитектуру с использованием Docker, Redis и API Gateway.

Проект был развёрнут на удалённом сервере.
Это сделано исключительно для удобства разработки и тестирования.

Все компоненты системы (API Gateway, микросервисы, базы данных и Redis)
развёрнуты **внутри Docker Compose** и полностью изолированы друг от друга.

Архитектурно данное развёртывание эквивалентно локальному запуску проекта:
каждый запуск `docker compose up` создаёт собственное изолированное окружение.
Внешний доступ открыт только к API Gateway, базы данных и внутренние сервисы
недоступны извне.

## Архитектура
- API Gateway — единая точка входа
- Users Service — управление пользователями
- Orders Service — управление заказами
- Reviews Service — отзывы к заказам
- Redis — кэширование
- PostgreSQL — отдельная БД для каждого сервиса

## Схема взаимодействия
Client → API Gateway → Microservices → PostgreSQL / Redis

## Запуск проекта
```bash
docker compose up -d --build
```
## Проверка состояния сервисов
```bash
curl http://localhost:8000/status
curl http://localhost:8000/health
```
## Примеры запросов

Users
```bash
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ivan"}'
```
<img width="841" height="444" alt="image" src="https://github.com/user-attachments/assets/4a4627eb-a173-497d-badd-482d2aa72bc7" />
<img width="849" height="664" alt="image" src="https://github.com/user-attachments/assets/cc4c0ccf-aced-4cf9-8384-136e4de925ff" />


Orders
```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"productId":42,"sum":1000}'
```
<img width="844" height="536" alt="image" src="https://github.com/user-attachments/assets/fda544f1-d162-425b-afa4-7f3e8b418cab" />
<img width="857" height="629" alt="image" src="https://github.com/user-attachments/assets/4111c27f-2575-4b42-98df-2fb7b29d470b" />



Reviews
```bash
curl -X POST http://localhost:8000/reviews \
  -H "Content-Type: application/json" \
  -d '{"orderId":1,"rating":5,"comment":"OK"}'
```
<img width="856" height="559" alt="image" src="https://github.com/user-attachments/assets/1ae1a8a1-8639-42b7-94ae-ba3ab7e93265" />
<img width="847" height="657" alt="image" src="https://github.com/user-attachments/assets/de687f80-096d-4ea7-ba34-9e53cb823646" />




## Кэширование
В проекте используется Redis для кэширования:
	•	списков сущностей
	•	запросов по ID
	•	агрегированных данных

Кэш автоматически инвалидируется при изменении данных.

## Структура баз данных

### Users Service — users_db

Таблица: users

| Поле | Тип | Описание |
|---|---|---|
| id | integer (PK) | Идентификатор пользователя |
| name | text | Имя пользователя |
| data | jsonb | Дополнительные данные |
| createdAt | timestamp | Дата создания |
| updatedAt | timestamp | Дата обновления |

### Orders Service — orders_db

Таблица: orders

| Поле | Тип | Описание |
|---|---|---|
| id | integer (PK) | Идентификатор заказа |
| userId | integer | ID пользователя |
| data | jsonb | productId, sum и др. данные |
| createdAt | timestamp | Дата создания |
| updatedAt | timestamp | Дата обновления |

### Reviews Service — reviews_db

Таблица: reviews

| Поле | Тип | Описание |
|---|---|---|
| id | integer (PK) | Идентификатор отзыва |
| orderId | integer (UNIQUE) | ID заказа |
| productId | integer | ID товара |
| rating | integer | Оценка (1–5) |
| comment | text | Комментарий |
| createdAt | timestamp | Дата создания |
| updatedAt | timestamp | Дата обновления |


