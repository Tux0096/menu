# Фуджи Официант (Flutter)

Мобильное приложение официанта: работает с текущим бэкендом меню (`menu-api`).

- **Вход по PIN** — выбор ресторана один раз, дальше PIN 4–6 цифр (задаётся в админке → «Сотрудники»).
- **Схема зала** — все столы плитками: свободен / гости / ждут официанта / в работе / готово / счёт; фильтры «Все · Занятые · Ждут · Мои»; открытие свободного стола.
- **Стол** — гости и их блюда, количество, курс подачи, пересадка на другого гостя, автосохранение, «В работу» (заказ уходит в iiko, кухня и бар отдельно), статусы кухни, «Вынес».
- **Меню плитками** — категории → блюда с фото, поиск, выбор гостя, стоп-лист.
- **Уведомления** — лента + push (Firebase Cloud Messaging): «блюдо готово», новый заказ, вызов, счёт.

## Сборка

Codemagic, файл `codemagic.yaml` в корне репозитория:

- `android` — APK и AAB при пуше в `main` (если менялся `waiter-app/`);
- `ios` — IPA в TestFlight по тегу.

Адрес сервера — `--dart-define=API_BASE=...` (по умолчанию `https://menu.franchise-fuji.ru`).

Локально:

```bash
flutter pub get
flutter run --dart-define=API_BASE=http://10.0.2.2:3101   # эмулятор Android и локальный бэкенд
```

## Push

1. Firebase-проект → приложения Android (`ru.franchisefuji.fuji_waiter`) и iOS (`ru.franchisefuji.fujiWaiter`).
2. `google-services.json` и `GoogleService-Info.plist` — в Codemagic, группа переменных `firebase`
   (`GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICE_INFO_PLIST`). В репозиторий не коммитятся.
3. Ключ сервисного аккаунта Firebase (JSON) — секрет GitHub `FCM_SERVICE_ACCOUNT`, деплой кладёт его в `.env` сервера.
4. iOS: APNs-ключ (.p8) загрузить в Firebase → Project settings → Cloud Messaging.

Без Firebase приложение работает: схема зала и уведомления обновляются опросом сервера каждые 5 секунд,
при новом событии телефон вибрирует.
