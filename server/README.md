# REST API — Node.js + Prisma + PostgreSQL

## Требования
- Node.js >= 22 (используется `--env-file` и `--watch` без доп. зависимостей)
- PostgreSQL установлен локально

## Первый запуск

### 1. Установить зависимости
```bash
npm install
```

### 2. Настроить БД
Убедись, что PostgreSQL запущен. Создай БД:
```bash
psql -U postgres -c "CREATE DATABASE myapp_dev;"
```

Если нужен другой юзер/пароль — измени `DATABASE_URL` в `.env.development`.

### 3. Применить миграции и сгенерировать клиент
```bash
npm run db:migrate      # создаст миграцию и применит её
npm run db:generate     # генерирует Prisma Client (делается автоматически при migrate)
```

### 4. Запустить dev-сервер
```bash
npm run dev
```
Сервер стартует с hot-reload (`--watch`) без nodemon.

---

## Скрипты

| Команда | Описание |
|---|---|
| `npm run dev` | Dev-сервер с watch |
| `npm start` | Prod-запуск |
| `npm run db:migrate` | Создать и применить миграцию (dev) |
| `npm run db:migrate:prod` | Применить миграции в prod (без интерактива) |
| `npm run db:studio` | Открыть Prisma Studio |
| `npm run db:seed` | Заполнить БД тестовыми данными |
| `npm run lint` | Проверить код |
| `npm run lint:fix` | Автофикс |
| `npm run format` | Форматировать через Prettier |

---

## Структура проекта

```
src/
├── index.js          # точка входа, graceful shutdown
├── app.js            # express app, middlewares, routes
├── routes/           # роутеры Express
├── controllers/      # обработчики запросов
├── services/         # бизнес-логика
├── middlewares/      # кастомные middlewares
└── utils/
    └── prisma.js     # Prisma Client синглтон
prisma/
├── schema.prisma     # схема БД
└── seed.js           # сидер (добавь сам)
```

---

## Окружения
- `.env.development` — локальная разработка (в git не попадает)
- `.env.production` — прод (в git не попадает)
- `.env.example` — шаблон для команды (коммитить можно)

---

## Checklist перед деплоем
- [ ] `DATABASE_URL` в `.env.production` указывает на prod БД
- [ ] `npm run db:migrate:prod` выполнен на сервере
- [ ] `NODE_ENV=production` установлен
- [ ] Логи ошибок не раскрывают `stack` (уже закрыто в `errorHandler`)
