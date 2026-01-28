# Leadcore Map — Интерактивная карта представителей РФ

React-компонент интерактивной карты представителей компании по регионам РФ для 1С-Битрикс. Использует SVG + GeoJSON для отображения границ регионов без зависимости от внешних API.

## Технологический стек

- React 18+ / TypeScript
- SVG + GeoJSON (87 регионов)
- react-zoom-pan-pinch (zoom/drag)
- Tailwind CSS
- Vite (сборка в один бандл)

## Разработка

```bash
npm install
npm run dev        # localhost:5173
npm run build      # сборка в dist/
npx tsc --noEmit   # проверка типов
```

## Развёртывание на 1С-Битрикс

### 1. Сборка

```bash
npm install
npm run build
```

После сборки в папке `dist/`:
- `script.js` — основной бандл (~245KB)
- `style.css` — стили
- `russia-regions.geojson` — данные границ регионов

### 2. Файлы на сервере

Копируете всё из `dist/` в директорию компонента:

```
/local/components/custom/russia.map/templates/.default/
├── script.js
├── style.css
└── russia-regions.geojson
```

### 3. template.php

```php
<?php
if (!defined("B_PAGE_STARTED")) define("B_PAGE_STARTED", true);
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="<?= DOCUMENT_ROOT . "/local/components/custom/russia.map/templates/.default/style.css" ?>">
</head>
<body>
    <!-- Данные представителей из Битрикс -->
    <script>
        window.bitrixMapData = <?= json_encode($arResult['REPRESENTATIVES'], JSON_UNESCAPED_UNICODE) ?>;
    </script>

    <!-- Контейнер компонента -->
    <div id="russia-map-root"></div>

    <!-- Скрипт карты -->
    <script src="<?= DOCUMENT_ROOT . "/local/components/custom/russia.map/templates/.default/script.js" ?>"></script>
</body>
</html>
```

### 4. component.php

```php
<?php
if (!defined("B_PAGE_STARTED")) define("B_PAGE_STARTED", true);

// Получение представителей из инфоблока или другого источника
$arRepresentatives = [];

// Например, из инфоблока IBLOCK_ID = 5:
$arFilter = ["IBLOCK_ID" => 5, "ACTIVE" => "Y"];
$res = CIBlockElement::GetList(null, $arFilter, false, false, [
    "ID", "NAME",
    "PROPERTY_PHONE_VALUE",
    "PROPERTY_EMAIL_VALUE",
    "PROPERTY_REGION_ID_VALUE",
    "PROPERTY_ACTIVITY_VALUE"
]);

while ($arItem = $res->Fetch()) {
    $arRepresentatives[] = [
        "id"        => intval($arItem["ID"]),
        "name"      => $arItem["NAME"],
        "position"  => $arItem["PROPERTY_POSITION_VALUE"] ?? "",
        "phone"     => $arItem["PROPERTY_PHONE_VALUE"] ?? "",
        "email"     => $arItem["PROPERTY_EMAIL_VALUE"] ?? "",
        "regionId"  => $arItem["PROPERTY_REGION_ID_VALUE"] ?? "",
        "activity"  => explode(",", $arItem["PROPERTY_ACTIVITY_VALUE"] ?? ""),
    ];
}

$arResult = ["REPRESENTATIVES" => $arRepresentatives];

include_once($_SERVER["DOCUMENT_ROOT"] . "/local/components/custom/russia.map/templates/.default/template.php");
```

### 5. Формат данных представителей

Компонент ожидает `window.bitrixMapData`:

```json
[
  {
    "id": 1,
    "name": "Иванов Иван Иванович",
    "position": "Региональный менеджер",
    "phone": "+7 (495) 123-45-67",
    "email": "ivanov@leadcore.ru",
    "regionId": ["ЦФО", "СЗФО"],
    "activity": ["Лабораторное", "Госпитальное"]
  }
]
```

Значения `regionId`:
- Конкретный регион: `"RU-MOW"` (Москва)
- Федеральный округ: `"ЦФО"` — представитель виден во всех регионах округа
- Несколько округов: `["ЦФО", "СЗФО"]`

### 6. Путь к GeoJSON

Компонент загружает GeoJSON по пути `/russia-regions.geojson` относительно корня сайта. Если файл лежит не в корне, измените путь в `src/App.tsx` перед сборкой:

```typescript
// src/App.tsx, строка 44
const geoJsonResponse = await fetch('/local/components/custom/russia.map/templates/.default/russia-regions.geojson');
```

После изменения пути — пересоберите: `npm run build`.
