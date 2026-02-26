import React, { useState, useEffect } from 'react';
import type { ViewMode, Representative, GeoJSON } from './types';
import { getMockRepresentatives } from './utils';
import { RUSSIA_REGIONS, FEDERAL_DISTRICTS } from './constants';
import {
  RussiaMap,
  ViewToggle,
  ContactPanel,
  ListView,
  StatsSection,
} from './components';

// Иконка для заголовка
const LocationIcon: React.FC = () => (
  <svg
    className="w-8 h-8 text-slate-700"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

// Множество валидных regionId для проверки (исправление #6)
const VALID_IDS = new Set([
  ...RUSSIA_REGIONS.map(r => r.id),
  ...FEDERAL_DISTRICTS.map(d => d.id),
]);

// Парсинг regionId из Битрикс: может быть строкой "ЦФО;RU-AMU" или массивом
function parseRegionIds(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value)
    ? value.flatMap(v => v.split(/[;,\n]/).map(s => s.trim())).filter(Boolean)
    : value.split(/[;,\n]/).map(s => s.trim()).filter(Boolean);

  // Предупреждение о неизвестных regionId (исправление #6)
  const invalid = raw.filter(id => !VALID_IDS.has(id));
  if (invalid.length > 0) {
    console.warn('Неизвестные regionId:', invalid);
  }

  return raw;
}

// Рантайм-валидатор структуры Representative (исправление #3)
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

// Определяем начальный режим просмотра на основе ширины экрана
const getInitialViewMode = (): ViewMode => {
  if (typeof window === 'undefined') return 'map';
  return window.innerWidth < 768 ? 'list' : 'map';
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<GeoJSON | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Загрузка GeoJSON с таймаутом 15с (исправление #11)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        let geoJsonResponse: Response;
        try {
          geoJsonResponse = await fetch(
            '/local/components/custom/russia.map/templates/.default/russia-regions.geojson',
            { signal: controller.signal }
          );
          clearTimeout(timeout);
        } catch (fetchErr) {
          clearTimeout(timeout);
          if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
            throw new Error('Таймаут загрузки геометрии регионов');
          }
          throw fetchErr;
        }

        if (!geoJsonResponse.ok) {
          throw new Error('Не удалось загрузить геометрию регионов');
        }
        const geoJson = await geoJsonResponse.json();
        setGeoJsonData(geoJson);

        // Загрузка представителей из Битрикс или mock
        if (window.bitrixMapData && Array.isArray(window.bitrixMapData)) {
          // Рантайм-валидация входных данных (исправление #3)
          const validated = window.bitrixMapData
            .map(validateRepresentative)
            .filter((r): r is Representative => r !== null);

          if (validated.length !== window.bitrixMapData.length) {
            console.warn(
              `Отфильтровано ${window.bitrixMapData.length - validated.length} невалидных записей представителей`
            );
          }

          // Дедупликация: Битрикс может отдавать одного представителя несколькими записями
          // с разными regionId. Объединяем их в одну запись с массивом regionId.
          const merged = new Map<number, Representative>();
          for (const rep of validated) {
            const existing = merged.get(rep.id);
            if (existing) {
              const existingIds = parseRegionIds(existing.regionId);
              const newIds = parseRegionIds(rep.regionId);
              const allIds = [...new Set([...existingIds, ...newIds])];
              existing.regionId = allIds.length === 1 ? allIds[0] : allIds;
            } else {
              const parsedIds = parseRegionIds(rep.regionId);
              merged.set(rep.id, { ...rep, regionId: parsedIds.length === 1 ? parsedIds[0] : parsedIds });
            }
          }
          setRepresentatives(Array.from(merged.values()));
        } else {
          // Используем mock данные для разработки
          setRepresentatives(getMockRepresentatives());
        }
      } catch (err) {
        // Маскировка внутренних ошибок (исправление #12)
        console.error('Error loading data:', err instanceof Error ? err.message : 'Unknown error');
        setError(
          err instanceof Error
            ? err.message
            : 'Не удалось загрузить карту'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Обработчик клика по региону
  const handleRegionClick = (regionId: string) => {
    setSelectedRegionId(prev => (prev === regionId ? null : regionId));
  };

  return (
    <div className="w-full bg-[#F5F7FA] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
              <LocationIcon />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Наши представители</h1>
          </div>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>

        <p className="text-sm text-slate-500 mb-4 md:mb-6">
          При выборе представителя, пожалуйста, ориентируйтесь на регион установки или поставки медицинского изделия
        </p>

        {/* Основной контент */}
        {viewMode === 'map' ? (
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-[600px]">
            {/* Карта */}
            <div className="flex-1 min-h-[300px] md:h-full">
              <RussiaMap
                representatives={representatives}
                onRegionClick={handleRegionClick}
                selectedRegionId={selectedRegionId}
                geoJsonData={geoJsonData}
                isLoading={isLoading}
                error={error}
              />
            </div>

            {/* Боковая панель */}
            <div className="w-full md:w-80 flex-shrink-0 md:h-full">
              <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border border-slate-100 h-full overflow-hidden flex flex-col min-h-[200px]">
                <ContactPanel
                  selectedRegionId={selectedRegionId}
                  representatives={representatives}
                />
              </div>
            </div>
          </div>
        ) : (
          <ListView representatives={representatives} />
        )}

        {/* Статистика */}
        <StatsSection representatives={representatives} />
      </div>
    </div>
  );
};

export default App;
