import React from 'react';
import type { Representative } from '../types';
import { getInitials, findRegionById } from '../utils';
import { FEDERAL_DISTRICTS } from '../constants';

interface RepresentativeCardProps {
  representative: Representative;
  showRegion?: boolean;
}

// Получить название региона/округа по ID
function getRegionName(regionId: string | null | undefined): string {
  if (!regionId) return '';

  // Проверяем, это федеральный округ?
  const district = FEDERAL_DISTRICTS.find(d => d.id === regionId);
  if (district) return district.name;

  // Иначе ищем регион
  const region = findRegionById(regionId);
  return region ? region.name : regionId;
}

const RepresentativeCard: React.FC<RepresentativeCardProps> = ({ representative: rep, showRegion = false }) => {
  // Получаем названия регионов (фильтруем null/undefined)
  const regionIds = (Array.isArray(rep.regionId) ? rep.regionId : [rep.regionId]).filter(Boolean);
  const regionNames = regionIds.map(getRegionName).filter(Boolean);

  return (
    <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Аватар и имя */}
      <div className="flex items-start gap-3 mb-3 md:mb-4">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-[#111217] text-white flex items-center justify-center font-bold text-xs md:text-sm flex-shrink-0">
          {getInitials(rep.name)}
        </div>
        <div className="font-semibold text-slate-900 text-sm leading-tight break-words min-w-0">
          {rep.name}
        </div>
      </div>

      {/* Регион (только если showRegion=true) */}
      {showRegion && regionNames.length > 0 && (
        <div className="text-[11px] md:text-xs text-slate-500 mb-2 md:mb-3">
          {regionNames.join(', ')}
        </div>
      )}

      {/* Контакты */}
      <div className="space-y-1.5 md:space-y-2 text-sm">
        {rep.phone && (
          <a
            href={`tel:${rep.phone.replace(/[^\d+]/g, '')}`}
            className="block text-slate-600 hover:text-slate-900 active:text-slate-900 transition-colors break-all"
          >
            {rep.phone}
          </a>
        )}
        {rep.email && (
          <a
            href={`mailto:${rep.email}`}
            className="block text-slate-500 hover:text-slate-900 active:text-slate-900 transition-colors break-all text-xs md:text-sm"
          >
            {rep.email}
          </a>
        )}
      </div>

      {/* Направления (теги) */}
      {rep.activity && rep.activity.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 md:mt-3">
          {rep.activity.map((act, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px]"
            >
              {act}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default RepresentativeCard;
