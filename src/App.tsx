import React, { useState, useEffect } from 'react';
import type { ViewMode, Representative, GeoJSON } from './types';
import { getMockRepresentatives } from './utils';
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
        // Загрузка GeoJSON
        const geoJsonResponse = await fetch('/local/components/custom/russia.map/templates/.default/russia-regions.geojson');
        if (!geoJsonResponse.ok) {
          throw new Error('Не удалось загрузить геометрию регионов');
        }
        const geoJson = await geoJsonResponse.json();
        setGeoJsonData(geoJson);

        // Загрузка представителей из Битрикс или mock
        if (window.bitrixMapData && Array.isArray(window.bitrixMapData)) {
          // Дедупликация: Битрикс может отдавать одного представителя несколькими записями
          // с разными regionId. Объединяем их в одну запись с массивом regionId.
          const merged = new Map<number, Representative>();
          for (const rep of window.bitrixMapData) {
            const existing = merged.get(rep.id);
            if (existing) {
              const existingIds = Array.isArray(existing.regionId) ? existing.regionId : [existing.regionId];
              const newIds = Array.isArray(rep.regionId) ? rep.regionId : [rep.regionId];
              const allIds = [...new Set([...existingIds, ...newIds].filter(Boolean))];
              existing.regionId = allIds.length === 1 ? allIds[0] : allIds;
            } else {
              merged.set(rep.id, { ...rep });
            }
          }
          setRepresentatives(Array.from(merged.values()));
        } else {
          // Используем mock данные для разработки
          setRepresentatives(getMockRepresentatives());
        }
      } catch (err) {
        console.error('Error loading data:', err);
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
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
              <LocationIcon />
            </div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900">Наши представители</h1>
          </div>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>

        <p className="text-xs text-slate-500 mb-4 md:mb-6">
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
