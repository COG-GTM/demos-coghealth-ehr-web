export interface Provider {
  id: number;
  npi: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  credentials?: string;
  providerType?: string;
  specialty?: string;
  subspecialty?: string;
  department?: string;
  email?: string;
  phoneOffice?: string;
  phoneMobile?: string;
  active: boolean;
  acceptingPatients?: boolean;
}
