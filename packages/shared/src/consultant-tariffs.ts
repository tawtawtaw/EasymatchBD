export const ConsultantServiceType = {
  PROFILE_ASSESSMENT: 'profile_assessment',
  COMPATIBILITY_GUIDANCE: 'compatibility_guidance',
  FAMILY_MEDIATION: 'family_mediation',
  MEETING_COORDINATION: 'meeting_coordination',
  MARRIAGE_PLANNING: 'marriage_planning',
} as const;

export type ConsultantServiceType =
  (typeof ConsultantServiceType)[keyof typeof ConsultantServiceType];

export const CONSULTANT_SERVICE_TYPES: ConsultantServiceType[] = [
  ConsultantServiceType.PROFILE_ASSESSMENT,
  ConsultantServiceType.COMPATIBILITY_GUIDANCE,
  ConsultantServiceType.FAMILY_MEDIATION,
  ConsultantServiceType.MEETING_COORDINATION,
  ConsultantServiceType.MARRIAGE_PLANNING,
];

export type ConsultantTariff = {
  id: string;
  serviceType: ConsultantServiceType;
  labelEn: string;
  labelBn: string | null;
  priceBdt: string;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  descriptionEn: string | null;
  descriptionBn: string | null;
  updatedAt: string;
};

export { MIN_CONSULTANT_PRIVACY_LEVEL } from './privacy-levels';
