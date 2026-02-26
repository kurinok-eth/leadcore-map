# Аудит безопасности и качества кода — Leadcore Map v2

**Дата:** 2026-02-26
**Ветка:** feature/ui-improvements
**Аудитор:** Claude Opus 4.6
**Дата исправлений:** 2026-02-26 — Все 15 проблем исправлены ✅

---

## Сводка

| Критичность | Количество |
|-------------|------------|
| Критический | 1 |
| Высокий     | 3 |
| Средний     | 5 |
| Низкий      | 6 |
| **Итого**   | **15** |

---

## КРИТИЧЕСКИЕ УЯЗВИМОСТИ

### 1. [КРИТИЧЕСКИЙ] Уязвимая зависимость rollup — Path Traversal (Arbitrary File Write)

- **Файл:** `package.json` (зависимость через vite)
- **CVE:** [GHSA-mw96-cpmx-2vgc](https://github.com/advisories/GHSA-mw96-cpmx-2vgc)
- **Описание:** rollup 4.0.0–4.58.0 содержит уязвимость Path Traversal, позволяющую произвольную запись файлов. Vite 6.4.1 использует уязвимую версию rollup.
- **Воздействие:** Злоумышленник, контролирующий входные файлы для сборки, может записать произвольные файлы на файловую систему.
- **Исправление:**
```bash
npm audit fix
```
Если не помогает:
```bash
npm install vite@latest
```
Убедиться, что rollup обновлен до >= 4.58.1.

---

## ВЫСОКИЙ УРОВЕНЬ

### 2. [ВЫСОКИЙ] Отсутствие санитизации данных из инфоблока перед выводом в `<script>`

- **Файл:** `bitrix-component-example/component-ready.php:89-96`, `bitrix-component-example/component.php:94-100`
- **Описание:** Данные из инфоблока Битрикс (`NAME`, `PHONE`, `EMAIL`, `POSITION`, `ADDRESS`, `WORKING_HOURS`, `ACTIVITY`) передаются в массив `$arResult['REPRESENTATIVES']` без санитизации. Затем в `template.php:16-19` они выводятся через `json_encode()` в контексте `<script>`.
- **Риск:** Stored XSS. Если администратор Битрикс или API вставит в поле NAME значение вроде `</script><script>alert(1)</script>`, то `json_encode()` с флагом `JSON_HEX_TAG` экранирует `<` и `>` в `\u003C` и `\u003E`, что **смягчает** основной вектор. Однако:
  - Флаг `JSON_HEX_TAG` защищает от прямого закрытия тега `</script>`, но не от всех контекстов
  - Если данные позднее используются в DOM через `innerHTML` (сейчас нет, но рискованно при рефакторинге)
- **Исправление (component-ready.php и component.php):**
```php
// Санитизация ПЕРЕД добавлением в массив
$representative = [
    'id' => (int)$arElement['ID'],
    'name' => htmlspecialchars($arElement['NAME'] ?? '', ENT_QUOTES, 'UTF-8'),
    'position' => htmlspecialchars($position ?: 'Представитель', ENT_QUOTES, 'UTF-8'),
    'phone' => htmlspecialchars($phone ?: '', ENT_QUOTES, 'UTF-8'),
    'email' => filter_var($email ?: '', FILTER_SANITIZE_EMAIL),
    'regionId' => $regionIdProcessed,
];

// Для activity — экранировать каждое значение
if (!empty($activity)) {
    $representative['activity'] = array_map(function($v) {
        return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
    }, $activity);
}
if (!empty($workingHours)) {
    $representative['workingHours'] = htmlspecialchars($workingHours, ENT_QUOTES, 'UTF-8');
}
if (!empty($address)) {
    $representative['address'] = htmlspecialchars($address, ENT_QUOTES, 'UTF-8');
}
```

### 3. [ВЫСОКИЙ] Нет рантайм-валидации `window.bitrixMapData`

- **Файл:** `src/App.tsx:67-83`
- **Описание:** Данные из `window.bitrixMapData` (глобальная переменная) используются без проверки структуры. Любой скрипт на странице может перезаписать эту переменную. TypeScript-типы не дают защиты в рантайме.
- **Риск:** Если другой скрипт на странице Битрикс (рекламный, аналитический, или XSS-инъекция) подменит `window.bitrixMapData`, приложение обработает подменённые данные. Это может привести к:
  - Отображению фишинговых контактов (подмена телефонов/email)
  - XSS через `mailto:` или `tel:` ссылки с вредоносными данными
- **Исправление (src/App.tsx):**
```typescript
// Валидатор структуры Representative
function validateRepresentative(raw: unknown): Representative | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== 'number' || !Number.isFinite(obj.id)) return null;
  if (typeof obj.name !== 'string' || obj.name.length === 0) return null;
  if (typeof obj.position !== 'string') return null;
  if (typeof obj.phone !== 'string') return null;
  if (typeof obj.email !== 'string') return null;

  // Валидация regionId
  const regionId = obj.regionId;
  if (typeof regionId !== 'string' && !Array.isArray(regionId)) return null;
  if (Array.isArray(regionId) && !regionId.every(v => typeof v === 'string')) return null;

  return {
    id: obj.id,
    name: String(obj.name).slice(0, 200),
    position: String(obj.position).slice(0, 200),
    phone: String(obj.phone).slice(0, 50),
    email: String(obj.email).slice(0, 100),
    regionId: regionId as string | string[],
    activity: Array.isArray(obj.activity)
      ? (obj.activity as string[]).filter(a => typeof a === 'string').map(a => a.slice(0, 100))
      : undefined,
    workingHours: typeof obj.workingHours === 'string'
      ? obj.workingHours.slice(0, 200)
      : undefined,
  } as Representative;
}

// Применение в loadData():
if (window.bitrixMapData && Array.isArray(window.bitrixMapData)) {
  const validated = window.bitrixMapData
    .map(validateRepresentative)
    .filter((r): r is Representative => r !== null);
  // ... дедупликация validated вместо window.bitrixMapData
}
```

### 4. [ВЫСОКИЙ] mailto: без энкодинга позволяет header injection

- **Файл:** `src/components/RepresentativeCard.tsx:59-64`
- **Описание:** Email-адрес из данных представителя используется в `mailto:` ссылке без URL-кодирования:
  ```tsx
  href={`mailto:${rep.email}`}
  ```
  Если `rep.email` содержит специальные символы (например, `victim@test.com?subject=Hacked&body=Phishing`), это приведёт к инъекции заголовков email.
- **Исправление:**
```tsx
href={`mailto:${encodeURIComponent(rep.email)}`}
```
Или с предварительной валидацией:
```tsx
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

{rep.email && isValidEmail(rep.email) && (
  <a href={`mailto:${encodeURIComponent(rep.email)}`} ...>
    {rep.email}
  </a>
)}
```

---

## СРЕДНИЙ УРОВЕНЬ

### 5. [СРЕДНИЙ] Клиентский isAdmin — ложное чувство безопасности

- **Файл:** `bitrix-component-example/template.php:22-24`, `src/types.ts:59-66`
- **Описание:** Флаг `isAdmin` передаётся на клиент через JavaScript:
  ```php
  isAdmin: <?= (isset($USER) && $USER->IsAdmin()) ? 'true' : 'false' ?>
  ```
  Любой пользователь может изменить `window.bitrixMapConfig.isAdmin = true` через DevTools. Сейчас этот флаг не используется в React-коде, но он создаёт предпосылку для будущих ошибок.
- **Исправление:** Удалить `isAdmin` из клиентского кода. Если нужна админ-функциональность — проверять на сервере. Или добавить комментарий:
```php
// ВНИМАНИЕ: isAdmin — ТОЛЬКО для UI-подсказок, НЕ для авторизации!
// Все админ-действия должны проверяться на сервере.
window.bitrixMapConfig = {
    isAdmin: <?= (isset($USER) && $USER->IsAdmin()) ? 'true' : 'false' ?>
};
```

### 6. [СРЕДНИЙ] Отсутствие валидации regionId против известного списка

- **Файл:** `src/App.tsx:29-35`
- **Описание:** Функция `parseRegionIds()` парсит строку, но не проверяет, что полученные ID существуют в `RUSSIA_REGIONS` или `FEDERAL_DISTRICTS`. Невалидные ID молча проходят и создают "призрачных" представителей, которые не отображаются ни в одном регионе.
- **Исправление:**
```typescript
import { RUSSIA_REGIONS, FEDERAL_DISTRICTS } from './constants';

const VALID_IDS = new Set([
  ...RUSSIA_REGIONS.map(r => r.id),
  ...FEDERAL_DISTRICTS.map(d => d.id),
]);

function parseRegionIds(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value)
    ? value.flatMap(v => v.split(/[;,\n]/).map(s => s.trim())).filter(Boolean)
    : value.split(/[;,\n]/).map(s => s.trim()).filter(Boolean);

  const invalid = raw.filter(id => !VALID_IDS.has(id) && !VALID_IDS.has(id.replace(/^RF-/, 'RU-')));
  if (invalid.length > 0) {
    console.warn('Неизвестные regionId:', invalid);
  }

  return raw;
}
```

### 7. [СРЕДНИЙ] Debug-шаблон с чувствительной информацией

- **Файл:** `bitrix-component-example/template-debug.php`
- **Описание:** Debug-шаблон выводит количество представителей, данные в `console.log`, отладочные HTML-блоки. Если случайно развёрнут на продакшене, раскрывает внутреннюю структуру приложения и данные.
- **Исправление:**
  - Удалить файл из репозитория после завершения отладки
  - Или добавить проверку окружения:
```php
<?php if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die(); ?>
<?php
// ТОЛЬКО для отладки! Не использовать на продакшене!
if (!isset($USER) || !$USER->IsAdmin()) {
    // Показываем обычный шаблон вместо debug
    include __DIR__ . '/template.php';
    return;
}
?>
<!-- Debug content далее... -->
```

### 8. [СРЕДНИЙ] Все зависимости в `dependencies` вместо `devDependencies`

- **Файл:** `package.json:14-28`
- **Описание:** Все пакеты включая `typescript`, `vite`, `@types/*`, `terser`, `postcss`, `autoprefixer` находятся в `dependencies`. Это означает:
  - При установке на сервере ставятся ненужные dev-зависимости
  - Увеличенная поверхность атаки (больше пакетов = больше потенциальных уязвимостей)
- **Исправление:**
```json
{
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-zoom-pan-pinch": "^3.7.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.18",
    "@types/react": "^19.2.10",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^4.7.0",
    "autoprefixer": "^10.4.23",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.18",
    "terser": "^5.46.0",
    "typescript": "^5.9.3",
    "vite": "^6.4.1"
  }
}
```

### 9. [СРЕДНИЙ] Нет Content Security Policy (CSP)

- **Файл:** `bitrix-component-example/template.php`
- **Описание:** Шаблон не устанавливает CSP заголовки. Inline-скрипт с `window.bitrixMapData` выполняется без ограничений. Без CSP любой XSS-вектор на странице Битрикс получит полный доступ к DOM.
- **Исправление:** Добавить CSP через мета-тег или HTTP-заголовок на уровне Битрикс:
```php
<!-- В header.php сайта или через .htaccess -->
<!-- Минимальный CSP для совместимости с inline-скриптами: -->
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;">
```
**Примечание:** Идеальный вариант — использовать nonce для inline-скриптов, но это требует серверной поддержки.

---

## НИЗКИЙ УРОВЕНЬ

### 10. [НИЗКИЙ] Нет null-проверки при обращении к свойствам Битрикс

- **Файл:** `bitrix-component-example/component-ready.php:49-54`
- **Описание:** Обращение к ключам массива `$arElement` без проверки существования:
  ```php
  $regionId = $arElement['PROPERTY_REGION_ID_VALUE'];
  $phone = $arElement['PROPERTY_PHONE_VALUE'];
  ```
  В PHP 8+ это выдаст `Undefined array key` warning.
- **Исправление:**
```php
$regionId = $arElement['PROPERTY_REGION_ID_VALUE'] ?? null;
$phone = $arElement['PROPERTY_PHONE_VALUE'] ?? '';
$email = $arElement['PROPERTY_EMAIL_VALUE'] ?? '';
$position = $arElement['PROPERTY_POSITION_VALUE'] ?? '';
$address = $arElement['PROPERTY_ADDRESS_VALUE'] ?? '';
$workingHours = $arElement['PROPERTY_WORKING_HOURS_VALUE'] ?? '';
```

### 11. [НИЗКИЙ] GeoJSON fetch без таймаута

- **Файл:** `src/App.tsx:59-63`
- **Описание:** `fetch()` GeoJSON-файла (~3.5MB) не имеет таймаута. При медленном соединении пользователь может бесконечно ждать загрузки.
- **Исправление:**
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000); // 15 сек

try {
  const geoJsonResponse = await fetch(
    '/local/components/custom/russia.map/templates/.default/russia-regions.geojson',
    { signal: controller.signal }
  );
  clearTimeout(timeout);
  // ...
} catch (err) {
  clearTimeout(timeout);
  if (err instanceof DOMException && err.name === 'AbortError') {
    throw new Error('Таймаут загрузки геометрии регионов');
  }
  throw err;
}
```

### 12. [НИЗКИЙ] Ошибка в error-сообщении пишется в консоль без маскировки

- **Файл:** `src/App.tsx:89`
- **Описание:** `console.error('Error loading data:', err)` выводит полный объект ошибки в консоль, что может раскрыть внутренние пути и структуру серверных ответов.
- **Исправление:**
```typescript
console.error('Error loading data:', err instanceof Error ? err.message : 'Unknown error');
```

### 13. [НИЗКИЙ] `.gitignore` не исключает `.claude/` и `.vscode/`

- **Файл:** `.gitignore`
- **Описание:** Папки `.claude/` и `.vscode/` (с `mcp.json`, `settings.local.json`) не в `.gitignore`, но присутствуют как untracked. Могут случайно попасть в коммит.
- **Исправление:** Добавить в `.gitignore`:
```
.claude/
.vscode/
```

### 14. [НИЗКИЙ] Hardcoded iblockId

- **Файл:** `bitrix-component-example/component-ready.php:18`
- **Описание:** ID инфоблока `$iblockId = 57` захардкожен. При переносе на другой сервер потребуется ручное изменение.
- **Исправление:** Использовать параметры компонента:
```php
$iblockId = (int)($arParams['IBLOCK_ID'] ?? 0);
if ($iblockId <= 0) {
    ShowError('Не указан ID инфоблока в настройках компонента');
    return;
}
```

### 15. [НИЗКИЙ] Отсутствие CSRF-токенов при потенциальных действиях

- **Файл:** Общий — архитектура
- **Описание:** Сейчас приложение read-only (только отображение данных). Однако `isAdmin` флаг предполагает будущие admin-действия. При их добавлении необходимо будет использовать CSRF-токены Битрикс (`bitrix:sessid`).
- **Исправление:** При добавлении любых action-запросов (POST/PUT/DELETE) использовать:
```php
// В шаблоне
window.bitrixMapConfig = {
    sessid: '<?= bitrix_sessid() ?>'
};

// В React — передавать sessid в заголовках
fetch('/api/endpoint', {
    method: 'POST',
    headers: { 'X-Bitrix-Csrf-Token': window.bitrixMapConfig.sessid }
});
```

---

## ЧТО СДЕЛАНО ПРАВИЛЬНО

| Практика | Статус |
|----------|--------|
| Защита от прямого доступа к PHP (`B_PROLOG_INCLUDED`) | ✅ |
| Фильтр `ACTIVE => 'Y'` в запросе инфоблока | ✅ |
| IIFE-формат бандла (изоляция глобальных переменных) | ✅ |
| Нет `eval()`, `Function()`, `dangerouslySetInnerHTML` | ✅ |
| Нет `innerHTML`, `document.write` в React-коде | ✅ |
| React автоматически экранирует вывод через JSX | ✅ |
| JSON_HEX_TAG + JSON_HEX_QUOT + JSON_HEX_AMP + JSON_HEX_APOS | ✅ |
| Нет API-ключей, паролей, токенов в коде | ✅ |
| `.env` в `.gitignore` | ✅ |
| `dist/` в `.gitignore` | ✅ |
| Нет прямых SQL-запросов (используется API Битрикс) | ✅ |
| SVG path data генерируется только из числовых координат | ✅ |
| Поиск использует `.includes()`, не regex (нет ReDoS) | ✅ |
| Нет prototype pollution (нет `Object.assign` на внешних данных) | ✅ |
| React StrictMode включен | ✅ |

---

## ПЛАН ИСПРАВЛЕНИЯ

### Фаза 1 — Критические и высокие ✅ ВЫПОЛНЕНО

| # | Задача | Файл(ы) | Критичность | Статус |
|---|--------|---------|-------------|--------|
| 1 | `npm audit fix` — обновить rollup | package.json, package-lock.json | Критический | ✅ Готово |
| 2 | Добавить `htmlspecialchars()` / `filter_var()` для всех полей в component.php | component-ready.php, component.php | Высокий | ✅ Готово |
| 3 | Добавить рантайм-валидацию `window.bitrixMapData` | src/App.tsx | Высокий | ✅ Готово |
| 4 | Добавить `encodeURIComponent()` для `mailto:` ссылки | src/components/RepresentativeCard.tsx | Высокий | ✅ Готово |

### Фаза 2 — Средние ✅ ВЫПОЛНЕНО

| # | Задача | Файл(ы) | Критичность | Статус |
|---|--------|---------|-------------|--------|
| 5 | Добавить комментарий/удалить `isAdmin` с клиента | template.php, types.ts | Средний | ✅ Готово |
| 6 | Добавить валидацию regionId против RUSSIA_REGIONS | src/App.tsx | Средний | ✅ Готово |
| 7 | Удалить или защитить template-debug.php | template-debug.php | Средний | ✅ Готово |
| 8 | Перенести dev-зависимости в `devDependencies` | package.json | Средний | ✅ Готово |
| 9 | Добавить CSP мета-тег или заголовок | template.php | Средний | ✅ Готово |

### Фаза 3 — Низкие ✅ ВЫПОЛНЕНО

| # | Задача | Файл(ы) | Критичность | Статус |
|---|--------|---------|-------------|--------|
| 10 | Использовать null-coalescing (`??`) для свойств Битрикс | component-ready.php, component.php | Низкий | ✅ Готово |
| 11 | Добавить таймаут для fetch GeoJSON | src/App.tsx | Низкий | ✅ Готово |
| 12 | Маскировать ошибки в console.error | src/App.tsx | Низкий | ✅ Готово |
| 13 | Добавить `.claude/` и `.vscode/` в `.gitignore` | .gitignore | Низкий | ✅ Готово |
| 14 | Вынести iblockId в параметры компонента | component-ready.php | Низкий | ✅ Готово |
| 15 | Подготовить CSRF-инфраструктуру для будущих действий | template.php, types.ts | Низкий | ✅ Готово |

### Дополнительные рекомендации

1. **Настроить автоматический `npm audit`** в CI/CD pipeline
2. **Добавить `npm audit --audit-level=high`** как pre-build step
3. **Рассмотреть Subresource Integrity (SRI)** для подключаемых скриптов
4. **Добавить rate-limiting** при будущих API-эндпоинтах
5. **Документировать модель угроз** — кто имеет доступ к инфоблоку, какие данные считать доверенными

---

## Общая оценка безопасности

**Уровень риска: ~~СРЕДНИЙ~~ → НИЗКИЙ ✅**

Все 15 выявленных проблем исправлены 2026-02-26. Основные улучшения:

1. ✅ Уязвимая зависимость rollup обновлена (`npm audit` — 0 уязвимостей)
2. ✅ Серверная санитизация данных через `htmlspecialchars()` / `filter_var()`
3. ✅ Рантайм-валидация `window.bitrixMapData` на клиенте
4. ✅ Защита от email header injection через `encodeURIComponent()`
5. ✅ CSP заголовок, CSRF-инфраструктура, защита debug-шаблона
6. ✅ Корректное разделение dependencies/devDependencies
7. ✅ Null-coalescing для PHP 8+ совместимости, таймаут fetch, маскировка ошибок

При текущем состоянии кодовой базы уровень риска — **НИЗКИЙ**.
