import React, { useState, useMemo } from 'react';
import type { Representative } from '../types';
import { RUSSIA_REGIONS, FEDERAL_DISTRICTS } from '../constants';
import { CITY_TO_REGION } from '../cityMapping';
import RepresentativeCard from './RepresentativeCard';

interface ListViewProps {
  representatives: Representative[];
}

const ListView: React.FC<ListViewProps> = ({ representatives }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return representatives;

    const query = searchQuery.trim().toLowerCase();

    // Предвычисляем совпадения по городам (зависит только от query)
    const matchedCityRegionIds = Object.entries(CITY_TO_REGION)
      .filter(([cityName]) => cityName.includes(query))
      .map(([, regionId]) => regionId);

    return representatives.filter(rep => {
      // Поиск по имени, email, телефону
      if (rep.name?.toLowerCase().includes(query) ||
          rep.email?.toLowerCase().includes(query) ||
          rep.phone?.includes(query)) {
        return true;
      }

      const regionIds = (Array.isArray(rep.regionId) ? rep.regionId : [rep.regionId]).filter(Boolean);

      // Поиск по названиям регионов (прямое назначение)
      if (regionIds.some(id => {
        const region = RUSSIA_REGIONS.find(r => r.id === id);
        return region && region.name.toLowerCase().includes(query);
      })) {
        return true;
      }

      // Поиск по федеральным округам (название и аббревиатура)
      if (regionIds.some(id => {
        // id может быть кодом округа напрямую (например, 'ЦФО')
        const district = FEDERAL_DISTRICTS.find(d => d.id === id);
        if (district) {
          // Поиск по полному названию или аббревиатуре
          if (district.name.toLowerCase().includes(query) ||
              district.id.toLowerCase().includes(query)) {
            return true;
          }
          // Если представитель назначен на округ — ищем по всем регионам этого округа
          const regionsInDistrict = RUSSIA_REGIONS.filter(r => r.info === district.id);
          if (regionsInDistrict.some(r => r.name.toLowerCase().includes(query))) {
            return true;
          }
        }

        // или id — регион, ищем его округ
        const region = RUSSIA_REGIONS.find(r => r.id === id);
        if (region) {
          const parentDistrict = FEDERAL_DISTRICTS.find(d => d.id === region.info);
          if (parentDistrict) {
            // Поиск по полному названию или аббревиатуре округа
            if (parentDistrict.name.toLowerCase().includes(query) ||
                parentDistrict.id.toLowerCase().includes(query)) {
              return true;
            }
          }
        }
        return false;
      })) {
        return true;
      }

      // Поиск по направлениям деятельности
      if (rep.activity?.some(act => act.toLowerCase().includes(query))) {
        return true;
      }

      // Поиск по названиям городов
      if (matchedCityRegionIds.length > 0) {
        if (regionIds.some(id => {
          // Прямое совпадение: регион представителя совпадает с регионом города
          if (matchedCityRegionIds.includes(id)) return true;

          // Представитель назначен на округ, который содержит регион города
          const district = FEDERAL_DISTRICTS.find(d => d.id === id);
          if (district) {
            return matchedCityRegionIds.some(cityRegionId => {
              const cityRegion = RUSSIA_REGIONS.find(r => r.id === cityRegionId);
              return cityRegion && cityRegion.info === district.id;
            });
          }

          return false;
        })) {
          return true;
        }
      }

      return false;
    });
  }, [representatives, searchQuery]);

  return (
    <div>
      {/* Поле поиска */}
      <input
        type="text"
        placeholder="Поиск по имени, городу, региону, округу..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="w-full px-4 md:px-6 py-3 md:py-4 border border-slate-200 rounded-xl md:rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all"
      />

      {/* Сетка карточек */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-6">
          {filtered.map(rep => (
            <RepresentativeCard key={rep.id} representative={rep} showRegion />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 md:py-12 text-slate-400 text-sm mt-4 md:mt-6">
          {searchQuery ? 'Ничего не найдено' : 'Нет представителей'}
        </div>
      )}
    </div>
  );
};

export default ListView;
