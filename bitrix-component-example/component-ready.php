<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

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

// ID инфоблока с представителями
$iblockId = 57;

// Получение элементов из инфоблока
$arSelect = [
    'ID',
    'NAME',                    // ФИО представителя
    'PROPERTY_REGION_ID',      // ID региона
    'PROPERTY_PHONE',          // Телефон
    'PROPERTY_EMAIL',          // E-mail
    'PROPERTY_POSITION',       // Должность
    'PROPERTY_ADDRESS',        // Адрес (опционально)
    'PROPERTY_ACTIVITY',       // Направление деятельности (множественное)
    'PROPERTY_WORKING_HOURS',  // График работы (опционально)
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
    // Получаем значения свойств
    $regionId = $arElement['PROPERTY_REGION_ID_VALUE'];
    $phone = $arElement['PROPERTY_PHONE_VALUE'];
    $email = $arElement['PROPERTY_EMAIL_VALUE'];
    $position = $arElement['PROPERTY_POSITION_VALUE'];
    $address = $arElement['PROPERTY_ADDRESS_VALUE'];
    $workingHours = $arElement['PROPERTY_WORKING_HOURS_VALUE'];

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
            } elseif (!empty($arActivity['VALUE'])) {
                // Fallback на VALUE, если VALUE_ENUM не задан (для свойств типа "строка")
                $activity[] = $arActivity['VALUE'];
            }
        }
    }

    // Обработка regionId (может быть несколько округов через запятую)
    $regionIdProcessed = $regionId;
    if (!empty($regionId) && strpos($regionId, ',') !== false) {
        // Разделяем по запятой и убираем пробелы
        $regionIdProcessed = array_map('trim', explode(',', $regionId));
    }

    // Формируем данные представителя
    $representative = [
        'id' => (int)$arElement['ID'],
        'name' => $arElement['NAME'],
        'position' => $position ?: 'Представитель',
        'phone' => $phone ?: '',
        'email' => $email ?: '',
        'regionId' => $regionIdProcessed,
    ];

    // Добавляем опциональные поля только если они заполнены
    if (!empty($activity)) {
        $representative['activity'] = $activity;
    }
    if (!empty($workingHours)) {
        $representative['workingHours'] = $workingHours;
    }
    if (!empty($address)) {
        $representative['address'] = $address;
    }

    $arResult['REPRESENTATIVES'][] = $representative;
}

// Подключение шаблона
$this->IncludeComponentTemplate();
