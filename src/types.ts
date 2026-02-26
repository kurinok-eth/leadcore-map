// Типы для карты представителей РФ

export interface Region {
  id: string;      // 'RU-MOW'
  name: string;    // 'Москва'
  info: string;    // 'ЦФО' - код федерального округа
}

export interface FederalDistrict {
  id: string;    // 'ЦФО'
  name: string;  // 'Центральный федеральный округ'
}

// Направления работы сотрудников
export type ActivityType = 'Лабораторное' | 'Эфферентные методы' | 'Служба крови' | 'Госпитальное';

export interface Representative {
  id: number;
  name: string;
  position: string;
  phone: string;
  email: string;
  regionId: string | string[]; // Может быть массивом!
  activity?: ActivityType[];   // Направления работы
  workingHours?: string;
  photo?: string;
}

// GeoJSON типы
export interface GeoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    name: string;
    [key: string]: unknown;
  };
  geometry: GeoJSONGeometry;
}

export interface GeoJSON {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// Тема приложения
export interface AppTheme {
  background: string;
  accent: string;
}

// Режим отображения
export type ViewMode = 'map' | 'list';

// Глобальные переменные из Битрикс
declare global {
  interface Window {
    bitrixMapData?: Representative[];
    bitrixMapConfig?: {
      /** ТОЛЬКО для UI-подсказок, НЕ для авторизации! Легко подделать через DevTools. */
      isAdmin: boolean;
      /** CSRF-токен Битрикс для серверных действий */
      sessid?: string;
    };
  }
}
