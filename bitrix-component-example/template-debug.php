<?php
/**
 * ОТЛАДОЧНАЯ ВЕРСИЯ template.php
 * Используйте для диагностики проблем
 */
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();
?>

<!-- ОТЛАДКА: Начало template.php -->
<div style="background: #ffffcc; padding: 10px; margin: 10px 0; border: 2px solid #ffaa00;">
    <strong>DEBUG: Template.php загружен!</strong><br>
    Представителей в $arResult: <?= isset($arResult['REPRESENTATIVES']) ? count($arResult['REPRESENTATIVES']) : 'НЕТ ДАННЫХ' ?>
</div>

<!-- Подключение стилей компонента -->
<link rel="stylesheet" href="/local/components/custom/russia.map/templates/.default/style.css">

<!-- Передача данных из PHP в JavaScript -->
<script>
    console.log('DEBUG: Скрипт template.php начал выполняться');

    // Данные представителей для React-приложения
    window.bitrixMapData = <?= json_encode(
        isset($arResult['REPRESENTATIVES']) ? $arResult['REPRESENTATIVES'] : [],
        JSON_UNESCAPED_UNICODE | JSON_HEX_QUOT | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS
    ) ?>;

    console.log('DEBUG: window.bitrixMapData =', window.bitrixMapData);
    console.log('DEBUG: Количество представителей:', window.bitrixMapData.length);

    // Дополнительная конфигурация (если нужна)
    window.bitrixMapConfig = {
        isAdmin: <?= (isset($USER) && $USER->IsAdmin()) ? 'true' : 'false' ?>
    };
</script>

<!-- Контейнер для React-приложения -->
<div style="background: #ccffcc; padding: 20px; margin: 10px 0; border: 2px solid #00aa00;">
    <strong>DEBUG: Контейнер создан</strong>
    <div id="russia-map-root" style="min-height: 400px; background: white; border: 1px dashed #999;"></div>
</div>

<script>
    console.log('DEBUG: Проверка наличия контейнера...');
    const container = document.getElementById('russia-map-root');
    if (container) {
        console.log('✅ DEBUG: Контейнер russia-map-root найден!', container);
    } else {
        console.error('❌ DEBUG: Контейнер russia-map-root НЕ найден!');
    }
</script>

<!-- Подключение React-бандла -->
<script src="/local/components/custom/russia.map/templates/.default/script.js"></script>

<script>
    console.log('DEBUG: Скрипт React подключен');
</script>
