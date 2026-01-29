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

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('map');
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
          setRepresentatives(window.bitrixMapData);
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
    <div className="min-h-screen bg-[#F5F7FA] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
              <LocationIcon />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Представительства</h1>
          </div>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>

        {/* Основной контент */}
        {viewMode === 'map' ? (
          <div className="flex gap-6" style={{ height: '600px' }}>
            {/* Карта */}
            <div className="flex-1 h-full">
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
            <div className="w-80 flex-shrink-0 h-full">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 h-full overflow-hidden flex flex-col">
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
