# Настройка Google Sheets для синхронизации данных

## Обзор

Google Sheets используется как промежуточное хранилище данных между Django админкой и базой данных. Парсер записывает данные в Google Sheets, а затем синхронизация переносит их в PostgreSQL.

## Шаг 1: Создание Google Cloud проекта

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Запомните название проекта

## Шаг 2: Включение Google Sheets API

1. В Google Cloud Console перейдите в **APIs & Services** → **Library**
2. Найдите **Google Sheets API**
3. Нажмите **Enable** (Включить)

## Шаг 3: Создание Service Account

1. Перейдите в **APIs & Services** → **Credentials**
2. Нажмите **Create Credentials** → **Service Account**
3. Заполните:
   - **Service account name**: `smashers-backend` (или любое другое имя)
   - **Service account ID**: автоматически сгенерируется
   - **Description**: `Service account for Smashers backend sync`
4. Нажмите **Create and Continue**
5. Пропустите шаг "Grant this service account access to project" (нажмите **Continue**)
6. Нажмите **Done**

## Шаг 4: Создание ключа для Service Account

1. В списке Service Accounts найдите созданный аккаунт
2. Нажмите на него
3. Перейдите на вкладку **Keys**
4. Нажмите **Add Key** → **Create new key**
5. Выберите формат **JSON**
6. Нажмите **Create**
7. JSON файл автоматически скачается - **сохраните его в безопасном месте!**

## Шаг 5: Извлечение данных из JSON

Откройте скачанный JSON файл. Он выглядит примерно так:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "smashers-backend@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

Вам нужны два значения:
- `client_email` - это `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` - это `GOOGLE_PRIVATE_KEY` (важно сохранить `\n` символы!)

## Шаг 6: Создание Google Sheet

1. Перейдите на [Google Sheets](https://sheets.google.com/)
2. Создайте новую таблицу
3. Назовите её, например: "Smashers Data Sync"
4. Скопируйте **ID таблицы** из URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
                                          ^^^^^^^^^^^^
                                          Это и есть ID
   ```

## Шаг 7: Предоставление доступа Service Account

1. В Google Sheet нажмите кнопку **Share** (Поделиться)
2. Вставьте **email Service Account** (из JSON файла, поле `client_email`)
   - Формат: `smashers-backend@your-project-id.iam.gserviceaccount.com`
3. Дайте права **Editor** (Редактор)
4. **Снимите галочку** "Notify people" (Не уведомлять)
5. Нажмите **Share**

## Шаг 8: Настройка .env файла

Откройте файл `smashers-backend/.env` и заполните:

```env
# Google Sheets API
GOOGLE_SHEET_ID=ваш_id_таблицы_из_url
GOOGLE_SERVICE_ACCOUNT_EMAIL=smashers-backend@your-project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Важно для GOOGLE_PRIVATE_KEY:**
- Должен быть в кавычках
- Должны сохраниться символы `\n` (не заменять на реальные переносы строк!)
- Пример правильного формата:
  ```
  GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
  ```

## Шаг 9: Проверка подключения

После настройки можно проверить подключение:

```bash
# Если сервер запущен, можно проверить через API
GET /api/health/detailed
```

Или запустить тест синхронизации (если есть такой эндпоинт).

## Структура Google Sheet

Парсер автоматически создаст следующие листы (tabs):
- **Categories** - категории тренировок
- **Memberships** - абонементы
- **Sessions** - тренировки
- **Locations** - локации

Каждый лист будет иметь заголовки и данные, которые парсятся из Django админки.

## Устранение проблем

### Ошибка "The caller does not have permission"
- Убедитесь, что Service Account email добавлен в доступ к таблице
- Проверьте, что права установлены как "Editor"

### Ошибка "Invalid credentials"
- Проверьте, что `GOOGLE_PRIVATE_KEY` содержит `\n` символы (не реальные переносы)
- Убедитесь, что ключ в кавычках
- Проверьте, что `GOOGLE_SERVICE_ACCOUNT_EMAIL` правильный

### Ошибка "Spreadsheet not found"
- Проверьте, что `GOOGLE_SHEET_ID` правильный (из URL таблицы)
- Убедитесь, что таблица существует и доступна

## Безопасность

⚠️ **Важно:**
- Никогда не коммитьте JSON файл с ключами в Git
- Файл `.env` уже в `.gitignore`, но проверьте это
- Храните JSON файл в безопасном месте
- Если ключ скомпрометирован, удалите его и создайте новый

## Альтернатива: без Google Sheets

Если Google Sheets не нужен, можно оставить эти переменные пустыми:
```env
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

В этом случае парсер будет работать, но синхронизация с Google Sheets будет пропущена. Данные будут парситься напрямую из Django и сохраняться в базу данных (если настроена).
