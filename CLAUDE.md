# CLAUDE.md — Скинемся Backend

## Обзор проекта

Бэкенд для Telegram Mini App "Скинемся" — сервис для разделения расходов между участниками группы.

**Стек:** NestJS · TypeScript · PostgreSQL · Prisma · JWT (Telegram auth)

---

## Архитектура проекта

```
src/
├── app.module.ts
├── main.ts
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── strategies/
│       └── jwt.strategy.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
│       └── update-user.dto.ts
│
├── groups/
│   ├── groups.module.ts
│   ├── groups.controller.ts
│   ├── groups.service.ts
│   └── dto/
│       ├── create-group.dto.ts
│       └── update-group.dto.ts
│
├── expenses/
│   ├── expenses.module.ts
│   ├── expenses.controller.ts
│   ├── expenses.service.ts
│   └── dto/
│       └── create-expense.dto.ts
│
├── settlements/
│   ├── settlements.module.ts
│   ├── settlements.controller.ts
│   ├── settlements.service.ts
│   └── dto/
│       └── create-settlement.dto.ts
│
└── common/
    ├── decorators/
    │   └── current-user.decorator.ts
    ├── pipes/
    │   └── validation.pipe.ts
    └── utils/
        └── debt.util.ts          ← алгоритм минимизации переводов
```

---

## Команды

```bash
# Установка
npm install

# Разработка
npm run start:dev

# Сборка
npm run build
npm run start:prod

# Prisma
npx prisma migrate dev --name <name>   # создать миграцию
npx prisma migrate deploy              # применить миграции (prod)
npx prisma generate                    # обновить клиент
npx prisma studio                      # GUI для БД

# Тесты
npm run test          # unit
npm run test:e2e      # e2e
npm run test:cov      # coverage
```

---

## Переменные окружения

Файл `.env` в корне проекта:

```env
# База данных
DATABASE_URL="postgresql://user:password@localhost:5432/skinemes"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Telegram
TELEGRAM_BOT_TOKEN="your-bot-token"

# App
PORT=3000
NODE_ENV=development
```

---

## API Routes

### Auth
```
POST /auth/telegram      — авторизация через Telegram WebApp initData
```

### Users
```
GET  /users/me           — текущий пользователь
PATCH /users/me          — обновить профиль (имя, телефон)
```

### Groups
```
GET    /groups           — список групп текущего пользователя
POST   /groups           — создать группу
GET    /groups/:id       — группа с участниками и тратами
PATCH  /groups/:id       — обновить группу
DELETE /groups/:id       — архивировать группу
POST   /groups/:id/join  — вступить по ссылке-инвайту
GET    /groups/:id/balances  — рассчитанные долги (debt simplification)
```

### Expenses
```
GET    /groups/:id/expenses         — список трат группы
POST   /groups/:id/expenses         — добавить трату
PATCH  /groups/:id/expenses/:eid    — обновить трату
DELETE /groups/:id/expenses/:eid    — удалить трату
```

### Settlements
```
GET    /groups/:id/settlements      — список переводов
POST   /groups/:id/settlements      — создать перевод (PENDING)
PATCH  /groups/:id/settlements/:sid/confirm  — подтвердить получение
```

---

## Модели БД (Prisma)

Схема: `prisma/schema.prisma`

| Модель | Описание |
|---|---|
| `User` | Пользователь, авторизованный через Telegram |
| `Group` | Группа расходов |
| `GroupMember` | Связь User ↔ Group |
| `Expense` | Трата в группе |
| `ExpenseSplit` | Доля участника в трате |
| `Settlement` | Перевод между участниками |

**Важно:** `ExpenseSplit.userId` — не FK на `User`. Это намеренно: если пользователь покидает группу, история его долей сохраняется.

**Важно:** `Expense.amount` и `ExpenseSplit.amount` — тип `Decimal(12,2)`, не `Float`. Никогда не используй `Float` для денег.

---

## Авторизация

Используется Telegram WebApp `initData`. Флоу:

1. Фронт получает `window.Telegram.WebApp.initData`
2. Отправляет на `POST /auth/telegram` в заголовке `Authorization: TgWebApp <initData>`
3. Бэк валидирует подпись через `TELEGRAM_BOT_TOKEN` (HMAC-SHA256)
4. Возвращает JWT токен
5. Все последующие запросы идут с `Authorization: Bearer <jwt>`

Валидация `initData` — строго по [официальной документации Telegram](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).

---

## Ключевые правила кода

### Общие
- Все эндпоинты защищены `JwtAuthGuard` кроме `POST /auth/telegram`
- Текущий пользователь доступен через декоратор `@CurrentUser()`
- Валидация входных данных через `class-validator` + `ValidationPipe` (глобально)
- Трансформация через `class-transformer` (глобально, `whitelist: true`)

### Проверки доступа
- Пользователь может взаимодействовать только со своими группами
- Только владелец (`Group.ownerId`) может удалять группу и управлять участниками
- Любой участник может добавлять траты и подтверждать переводы

### Числа и деньги
- Все суммы хранятся в `Decimal`, возвращаются как `string` в JSON (Prisma behaviour)
- На фронте парсить через `parseFloat()` или `Number()`
- Никогда не округлять суммы при разделении — хранить точные дроби

### Debt Simplification
Алгоритм минимизации переводов живёт в `src/common/utils/debt.util.ts`.
Вызывается в `GET /groups/:id/balances` — не хранится в БД, вычисляется на лету.

### Ошибки
- `NotFoundException` — ресурс не найден
- `ForbiddenException` — нет доступа
- `BadRequestException` — невалидные данные
- Не используй голые `throw new Error()`

---

## Зависимости

```json
{
  "dependencies": {
    "@nestjs/common": "^10",
    "@nestjs/core": "^10",
    "@nestjs/jwt": "^10",
    "@nestjs/passport": "^10",
    "@nestjs/platform-fastify": "^10",
    "@prisma/client": "^5",
    "class-transformer": "^0.5",
    "class-validator": "^0.14",
    "passport": "^0.7",
    "passport-jwt": "^4"
  },
  "devDependencies": {
    "@nestjs/cli": "^10",
    "@nestjs/testing": "^10",
    "prisma": "^5",
    "typescript": "^5"
  }
}
```

**Платформа:** Fastify (не Express) — быстрее, лучше подходит для высоконагруженных API.

---

## Что НЕ делать

- Не использовать `any` в TypeScript
- Не делать бизнес-логику в контроллерах — только в сервисах
- Не возвращать пароли, токены или внутренние поля (`telegramId`, `createdAt`) без необходимости — использовать DTO для ответов
- Не делать N+1 запросы — использовать `include` в Prisma
- Не хранить `initData` от Telegram дольше 24 часов (ограничение Telegram)
