<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

/**
 * Описание компонента для админки Битрикс
 * Путь: /local/components/custom/russia.map/.description.php
 */

$arComponentDescription = [
    'NAME' => 'Карта представителей России',
    'DESCRIPTION' => 'Интерактивная карта представителей компании по регионам РФ с SVG-визуализацией',
    'ICON' => '/images/icon.gif',
    'PATH' => [
        'ID' => 'custom',
        'NAME' => 'Пользовательские компоненты',
        'CHILD' => [
            'ID' => 'maps',
            'NAME' => 'Карты',
        ],
    ],
];
