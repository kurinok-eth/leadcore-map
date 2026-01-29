<?php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

/**
 * Шаблон компонента карты представителей
 * Путь: /local/components/custom/russia.map/templates/.default/template.php
 */
?>

<!-- Подключение стилей компонента -->
<link rel="stylesheet" href="/local/components/custom/russia.map/templates/.default/style.css">

<!-- Передача данных из PHP в JavaScript -->
<script>
    // Данные представителей для React-приложения
    window.bitrixMapData = <?= json_encode(
        isset($arResult['REPRESENTATIVES']) ? $arResult['REPRESENTATIVES'] : [],
        JSON_UNESCAPED_UNICODE | JSON_HEX_QUOT | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS
    ) ?>;

    // Дополнительная конфигурация (если нужна)
    window.bitrixMapConfig = {
        isAdmin: <?= (isset($USER) && $USER->IsAdmin()) ? 'true' : 'false' ?>
    };
</script>

<!-- Контейнер для React-приложения -->
<div id="russia-map-root"></div>

<!-- Подключение React-бандла -->
<script src="/local/components/custom/russia.map/templates/.default/script.js"></script>
