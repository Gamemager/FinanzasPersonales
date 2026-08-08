export interface CountryCode {
  code: string; // indicativo, ej. "+57"
  name: string;
  iso: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+57', name: 'Colombia', iso: 'CO' },
  { code: '+52', name: 'México', iso: 'MX' },
  { code: '+54', name: 'Argentina', iso: 'AR' },
  { code: '+56', name: 'Chile', iso: 'CL' },
  { code: '+51', name: 'Perú', iso: 'PE' },
  { code: '+593', name: 'Ecuador', iso: 'EC' },
  { code: '+58', name: 'Venezuela', iso: 'VE' },
  { code: '+591', name: 'Bolivia', iso: 'BO' },
  { code: '+595', name: 'Paraguay', iso: 'PY' },
  { code: '+598', name: 'Uruguay', iso: 'UY' },
  { code: '+507', name: 'Panamá', iso: 'PA' },
  { code: '+506', name: 'Costa Rica', iso: 'CR' },
  { code: '+502', name: 'Guatemala', iso: 'GT' },
  { code: '+1', name: 'República Dominicana', iso: 'DO' },
  { code: '+1', name: 'Estados Unidos', iso: 'US' },
  { code: '+34', name: 'España', iso: 'ES' },
];
