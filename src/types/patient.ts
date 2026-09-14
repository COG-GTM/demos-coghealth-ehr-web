export interface Address {
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface PatientIdentifier {
  id?: number;
  identifierType: IdentifierType;
  identifierValue: string;
  issuingAuthority?: string;
  effectiveDate?: string;
  expirationDate?: string;
  active?: boolean;
}

export interface EmergencyContact {
  id?: number;
  firstName: string;
  lastName: string;
  relationship?: string;
  phoneHome?: string;
  phoneMobile?: string;
  phoneWork?: string;
  email?: string;
  address?: Address;
  priority?: number;
  active?: boolean;
}

export interface Patient {
  id?: number;
  mrn?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  email?: string;
  phoneHome?: string;
  phoneMobile?: string;
  phoneWork?: string;
  address?: Address;
  mailingAddress?: Address;
  preferredLanguage?: string;
  ethnicity?: string;
  race?: string;
  religion?: string;
  allergies?: string;
  identifiers?: PatientIdentifier[];
  emergencyContacts?: EmergencyContact[];
  active?: boolean;
  deceased?: boolean;
  deceasedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';

export type MaritalStatus = 
  | 'SINGLE' 
  | 'MARRIED' 
  | 'DIVORCED' 
  | 'WIDOWED' 
  | 'SEPARATED' 
  | 'DOMESTIC_PARTNER' 
  | 'UNKNOWN';

export type IdentifierType = 
  | 'MRN'
  | 'SSN'
  | 'DRIVERS_LICENSE'
  | 'PASSPORT'
  | 'INSURANCE_MEMBER_ID'
  | 'INSURANCE_GROUP_ID'
  | 'MEDICARE_ID'
  | 'MEDICAID_ID'
  | 'MILITARY_ID'
  | 'OTHER';

export interface PatientSearchResult {
  content: Patient[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
