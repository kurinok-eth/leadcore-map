<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true)
    die();

/**
 * Компонент карты представителей
 * Путь: /local/components/custom/russia.map/component.php
 */

use Bitrix\Main\Loader;

// Загрузка модуля инфоблоков
if (!Loader::includeModule('iblock')) {
    ShowError('Модуль "Информационные блоки" не установлен');
    return;
}

// ID инфоблока с представителями (ЗАМЕНИТЕ на ваш ID!)
$iblockId = 0; // TODO: укажите ID вашего инфоблока

if ($iblockId === 0) {
    ShowError('Не указан ID инфоблока. Отредактируйте component.php');
    return;
}

// Получение элементов из инфоблока
$arSelect = [
    'ID',
    'NAME', // ФИО представителя
    'PROPERTY_REGION_ID', // ID региона
    'PROPERTY_PHONE', // Телефон
    'PROPERTY_EMAIL', // E-mail
    'PROPERTY_POSITION', // Должность
    'PROPERTY_ADDRESS', // Адрес (опционально)
    'PROPERTY_ACTIVITY', // Направление деятельности (множественное)
    'PROPERTY_WORKING_HOURS', // График работы (опционально)
];

$arFilter = [
    'IBLOCK_ID' => $iblockId,
    'ACTIVE' => 'Y',
];

$arOrder = [
    'SORT' => 'ASC',
    'NAME' => 'ASC',
];

$rsElements = CIBlockElement::GetList($arOrder, $arFilter, false, false, $arSelect);

$arResult['REPRESENTATIVES'] = [];

while ($arElement = $rsElements->Fetch()) {
    // Получаем значения свойств (null-coalescing для PHP 8+ совместимости)
    $regionId = $arElement['PROPERTY_REGION_ID_VALUE'] ?? null;
    $phone = $arElement['PROPERTY_PHONE_VALUE'] ?? '';
    $email = $arElement['PROPERTY_EMAIL_VALUE'] ?? '';
    $position = $arElement['PROPERTY_POSITION_VALUE'] ?? '';
    $address = $arElement['PROPERTY_ADDRESS_VALUE'] ?? '';
    $workingHours = $arElement['PROPERTY_WORKING_HOURS_VALUE'] ?? '';

    // Получаем направления деятельности (может быть массивом)
    $activity = [];
    if (!empty($arElement['PROPERTY_ACTIVITY_VALUE'])) {
        // Если свойство "Список", получаем выбранные значения
        $rsActivity = CIBlockElement::GetProperty(
            $iblockId,
            $arElement['ID'],
        [],
        ['CODE' => 'ACTIVITY']
        );
        while ($arActivity = $rsActivity->Fetch()) {
            // Используем VALUE_ENUM для получения текстового значения, а не ID
            if (!empty($arActivity['VALUE_ENUM'])) {
                $activity[] = $arActivity['VALUE_ENUM'];
            }
            elseif (!empty($arActivity['VALUE'])) {
                // Fallback на VALUE, если VALUE_ENUM не задан (для свойств типа "строка")
                $activity[] = $arActivity['VALUE'];
            }
        }
    }

    // Обработка regionId: Битрикс для свойства-списка (множественный выбор) может вернуть
    // массив или строку с разделителями ; или ,
    if (is_array($regionId)) {
        $regionIds = array_values(array_filter(array_map('trim', $regionId)));
    }
    elseif (!empty($regionId)) {
        $regionIds = array_values(array_filter(array_map('trim', preg_split('/[;,\n]/', $regionId))));
    }
    else {
        $regionIds = [];
    }
    $regionIdProcessed = count($regionIds) === 1 ? $regionIds[0] : $regionIds;

    // Формируем данные представителя с санитизацией (защита от Stored XSS)
    $representative = [
        'id' => (int)$arElement['ID'],
        'name' => htmlspecialchars($arElement['NAME'] ?? '', ENT_QUOTES, 'UTF-8'),
        'position' => htmlspecialchars($position ?: 'Представитель', ENT_QUOTES, 'UTF-8'),
        'phone' => htmlspecialchars($phone ?: '', ENT_QUOTES, 'UTF-8'),
        'email' => filter_var($email ?: '', FILTER_SANITIZE_EMAIL),
        'regionId' => $regionIdProcessed,
    ];

    // Добавляем опциональные поля только если они заполнены (с санитизацией)
    if (!empty($activity)) {
        $representative['activity'] = array_map(function ($v) {
            return htmlspecialchars($v, ENT_QUOTES, 'UTF-8');
        }, $activity);
    }
    if (!empty($workingHours)) {
        $representative['workingHours'] = htmlspecialchars($workingHours, ENT_QUOTES, 'UTF-8');
    }
    if (!empty($address)) {
        $representative['address'] = htmlspecialchars($address, ENT_QUOTES, 'UTF-8');
    }

    $arResult['REPRESENTATIVES'][] = $representative;
}

// Подключение шаблона
$this->IncludeComponentTemplate();
