# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Руководство для Claude Code при работе с проектом Leadcore Map.

## О проекте

React-компонент интерактивной карты представителей компании по регионам РФ для 1С-Битрикс. Использует **SVG + GeoJSON** для отображения границ регионов. Без зависимости от Yandex Maps API.

## Технологический стек

- **React 18+** — основной фреймворк
- **TypeScript** — типизация
- **SVG** — отрисовка карты
- **react-zoom-pan-pinch** — zoom и drag
- **GeoJSON** — данные границ регионов
- **Tailwind CSS** — стилизация UI

## Ключевые файлы проекта

- `src/App.tsx` — корневой компонент, загрузка GeoJSON и данных представителей
- `src/components/RussiaMap.tsx` — SVG-карта, проекция координат, zoom/drag
- `src/components/ContactPanel.tsx` — боковая панель с представителями выбранного региона
- `src/components/ListView.tsx` — табличный список с поиском по имени, региону, округу
- `src/components/RepresentativeCard.tsx` — карточка одного представителя
- `src/components/StatsSection.tsx` — статистика по представителям
- `src/components/ViewToggle.tsx` — переключатель карта/список
- `src/constants.ts` — RUSSIA_REGIONS (87 регионов), FEDERAL_DISTRICTS (8 округов)
- `src/regionMapping.ts` — маппинг названий из GeoJSON → ID регионов (RU-XXX)
- `src/utils.ts` — `isRepresentativeInRegion()` и другие утилиты
- `src/types.ts` — TypeScript-типы
- `public/russia-regions.geojson` — геометрия границ 87 регионов

## Критические правила разработки

### 1. GeoJSON → SVG координаты

**КРИТИЧЕСКИ ВАЖНО:** GeoJSON координаты `[lon, lat]` преобразуются в SVG через проекцию Меркатора в `RussiaMap.tsx`. Функции `projectPoint()`, `geoJsonToSvgPath()`, `multiPolygonToSvgPath()` — трогать осторожно.

### 2. Федеральные округа - логика сопоставления

Представители могут быть назначены на:
- Конкретный регион: `regionId: 'RU-MOW'`
- Федеральный округ: `regionId: 'ЦФО'`
- Несколько округов: `regionId: ['ЦФО', 'СЗФО']`

```typescript
// ✅ Правильная проверка (из utils.ts)
function isRepresentativeInRegion(rep: Representative, regionId: string): boolean {
  const regionIds = Array.isArray(rep.regionId) ? rep.regionId : [rep.regionId];

  // 1. Прямое совпадение
  if (regionIds.some(id => normalizeRegionId(id) === normalizeRegionId(regionId))) {
    return true;
  }

  // 2. Проверка федерального округа
  const region = RUSSIA_REGIONS.find(r => normalizeRegionId(r.id) === normalizeRegionId(regionId));
  if (!region) return false;

  // region.info содержит код округа (например, 'ЦФО')
  return regionIds.includes(region.info);
}

// Примеры:
// Rep с regionId: 'ЦФО' -> виден во ВСЕХ регионах ЦФО
// Rep с regionId: ['ЦФО', 'СЗФО'] -> виден во всех регионах обоих округов
// Rep с regionId: 'RU-MOW' -> виден только в Москве
```

### 6. Новые регионы РФ

Четыре новых региона (ДНР, ЛНР, Запорожская, Херсонская области) **уже включены в GeoJSON** (`public/russia-regions.geojson`) с реальными полигонами границ. Маппинг в `src/regionMapping.ts`:

```typescript
'RU-DPR': 'Донецкая Народная Республика'
'RU-LPR': 'Луганская Народная Республика'
'RU-ZPR': 'Запорожская область'
'RU-KHE': 'Херсонская область'
```

Все 4 региона относятся к ЮФО (Южный федеральный округ).

## Структура данных

### Регионы (constants.tsx)

```typescript
export const RUSSIA_REGIONS: Region[] = [
  { id: 'RU-MOW', name: 'Москва', info: 'ЦФО', path: '' },
  { id: 'RU-SPE', name: 'Санкт-Петербург', info: 'СЗФО', path: '' },
  // ... всего 85+ регионов
  { id: 'RU-DPR', name: 'Донецкая Народная Республика', info: 'ЮФО', path: '' },
  { id: 'RU-LPR', name: 'Луганская Народная Республика', info: 'ЮФО', path: '' },
  { id: 'RU-ZPR', name: 'Запорожская область', info: 'ЮФО', path: '' },
  { id: 'RU-KHE', name: 'Херсонская область', info: 'ЮФО', path: '' },
];

export const FEDERAL_DISTRICTS: FederalDistrict[] = [
  { id: 'ЦФО', name: 'Центральный федеральный округ' },
  { id: 'СЗФО', name: 'Северо-Западный федеральный округ' },
  { id: 'ЮФО', name: 'Южный федеральный округ' },
  { id: 'СКФО', name: 'Северо-Кавказский федеральный округ' },
  { id: 'ПФО', name: 'Приволжский федеральный округ' },
  { id: 'УФО', name: 'Уральский федеральный округ' },
  { id: 'СФО', name: 'Сибирский федеральный округ' },
  { id: 'ДФО', name: 'Дальневосточный федеральный округ' },
];
```

### Представители (из Битрикс)

```typescript
interface Representative {
  id: number;
  name: string;
  position: string;
  phone: string;
  email: string;
  regionId: string | string[]; // МОЖЕТ БЫТЬ МАССИВОМ!
  activity?: string[];
  workingHours?: string;
  photo?: string;
}

// Данные приходят через window.bitrixMapData
declare global {
  interface Window {
    bitrixMapData: Representative[];
    bitrixMapConfig: {
      isAdmin: boolean;
    };
  }
}
```

## Визуальный стиль (НЕ МЕНЯТЬ!)

```typescript
// Цвета состояний
const COLORS = {
  normal: {
    fill: '#ffffff',
    stroke: '#DEE2E3'
  },
  hover: {
    fill: '#111217',
    stroke: '#111217'
  },
  selected: {
    fill: '#111217',
    stroke: '#111217'
  }
};

// Стили SVG path
const REGION_STYLE = {
  strokeWidth: 0.5,
  cursor: 'pointer',
  transition: 'fill 0.2s, stroke 0.2s'
};
```

## Тестирование

Перед коммитом проверить:

1. **Загрузка карты**
   - Карта загружается без ошибок в консоли
   - Все регионы отображаются корректно

2. **Регионы**
   - Все регионы отображаются
   - Новые регионы (ДНР, ЛНР, Запорожская, Херсонская) видны

3. **Интерактивность**
   - Hover подсвечивает регион
   - Тултип следует за курсором
   - Клик вызывает `onRegionClick`

4. **Федеральные округа**
   - Представитель с `regionId: 'ЦФО'` виден во ВСЕХ регионах ЦФО
   - Массив округов работает: `regionId: ['ЦФО', 'СЗФО']`

5. **Zoom/Drag**
   - Zoom колесиком работает плавно
   - Перетаскивание карты работает
   - Pinch-zoom на мобильных

6. **Выбранный регион**
   - При клике регион остается подсвеченным
   - При клике на другой регион - переключается

## Git commit правила

```bash
# Формат коммитов
<type>: <subject>

<body>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

# Types:
# feat: новая функциональность
# fix: исправление бага
# refactor: рефакторинг без изменения поведения
# chore: сборка, зависимости, конфигурация
# docs: документация
```

## Команды разработки

```bash
npm install          # Установка зависимостей
npm run dev          # Dev-сервер на localhost:5173
npm run build        # Сборка в dist/ (script.js, style.css)
npx tsc --noEmit     # Проверка типов без компиляции
```

## Интеграция с 1С-Битрикс

### Структура компонента на сервере

```
/local/components/custom/russia.map/
├── .description.php      # Регистрация компонента в Битрикс
├── component.php         # Логика загрузки данных из инфоблока
└── templates/
    └── .default/
        ├── template.php          # HTML-фрагмент (без DOCTYPE/html/body!)
        ├── script.js             # Собранный React-бандл
        ├── style.css             # Стили
        └── russia-regions.geojson # Геометрия регионов
```

### Символьные коды свойств инфоблока (КРИТИЧЕСКИ ВАЖНО!)

React-приложение ожидает данные в формате:
```typescript
{ id, name, position, phone, email, regionId, activity?, workingHours? }
```

Для корректной работы в инфоблоке должны быть свойства с **точными** символьными кодами:

| Свойство | Символьный код | Обязательное |
|----------|----------------|--------------|
| ID Региона | `REGION_ID` | ✅ |
| Телефон | `PHONE` | ✅ |
| E-mail | `EMAIL` | ✅ |
| Должность | `POSITION` | ✅ |
| Адрес | `ADDRESS` | ❌ |
| Направление деятельности | `ACTIVITY` | ❌ |
| График работы | `WORKING_HOURS` | ❌ |

**⚠️ ВАЖНО:** Коды должны быть **ЗАГЛАВНЫМИ** с **ПОДЧЕРКИВАНИЯМИ**. Иначе `component.php` не получит данные!

**Примеры файлов:** см. папку `bitrix-component-example/`
- `component.php` — преобразование данных из Битрикс в JSON
- `template.php` — передача данных в React через `window.bitrixMapData`
- `.description.php` — регистрация компонента

### template.php — критически важно

```php
<?php if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die(); ?>
<link rel="stylesheet" href="/local/components/custom/russia.map/templates/.default/style.css">
<script>
    window.bitrixMapData = <?= json_encode($arResult['REPRESENTATIVES'], JSON_UNESCAPED_UNICODE) ?>;
</script>
<div id="russia-map-root"></div>
<script src="/local/components/custom/russia.map/templates/.default/script.js"></script>
```

**Ошибки, которых надо избегать:**
- НЕ использовать `DOCUMENT_ROOT` без `$_SERVER` — это не сработает
- НЕ оборачивать в `<!DOCTYPE>`, `<html>`, `<body>` — template включается внутрь страницы
- Использовать абсолютные пути от корня сайта (`/local/...`)

**НЕ НУЖЕН API ключ Yandex Maps!**

## Известные проблемы и решения

### Проблема: Регионы отображаются в неправильном месте
**Причина:** Неправильная проекция координат
**Решение:** Проверить функцию `projectPoint()` и viewBox SVG

### Проблема: Представитель не виден в регионе
**Причина:** Не учитывается федеральный округ
**Решение:** Использовать `isRepresentativeInRegion()` из utils.ts

### Проблема: Новые регионы не отображаются
**Причина:** Нет маппинга в `regionMapping.ts`
**Решение:** Добавить соответствие названия из GeoJSON → ID региона

### Проблема: Zoom работает рывками
**Причина:** Настройки react-zoom-pan-pinch
**Решение:** Настроить `wheel.step` и `panning.velocityDisabled`

### Проблема: template.php не выводит HTML
**Причина:** Использование `DOCUMENT_ROOT` как константы вместо `$_SERVER["DOCUMENT_ROOT"]`, или оборачивание в полную HTML-страницу
**Решение:** Использовать абсолютные пути `/local/...` от корня сайта, не добавлять DOCTYPE/html/body

### Проблема: Компонент не появляется в списке Битрикс
**Причина:** Отсутствует `.description.php` в корне папки компонента
**Решение:** Создать `/local/components/custom/russia.map/.description.php` с NAME и DESCRIPTION

### Проблема: Данные не отображаются на карте (представители не загружаются)
**Причина:** Неправильные символьные коды свойств инфоблока или неправильная структура JSON
**Решение:**
1. Проверить в консоли браузера (F12): `console.log(window.bitrixMapData)`
2. Убедиться, что символьные коды свойств — `REGION_ID`, `PHONE`, `EMAIL`, `POSITION` (заглавные!)
3. Проверить `component.php` — правильно ли он преобразует данные
4. См. подробно: `INTEGRATION_GUIDE.md` и `BITRIX_ADMIN_GUIDE.md`
