import type { Patient } from '../../types';
import { AlertTriangle, Phone, Mail, Calendar, User, ShieldAlert } from 'lucide-react';

interface PatientBannerProps {
  patient: Patient;
  allergies?: { allergen: string; severity: string }[];
  onClose?: () => void;
}

export default function PatientBanner({ patient, allergies = [] }: PatientBannerProps) {
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const hasSevereAllergy = allergies.some(a => a.severity === 'Severe');

  return (
    <div className="border-b border-gray-500 ehr-banner">
      <div className="px-2 py-1.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 flex items-center justify-center border border-white/30">
            <User className="w-6 h-6 text-white" />
          </div>
          
          <div className="text-white">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold">
                {patient.lastName}, {patient.firstName}
                {patient.middleName && ` ${patient.middleName.charAt(0)}.`}
              </span>
              {patient.deceased && (
                <span className="px-1.5 py-0.5 bg-gray-600 text-white text-[10px] font-bold border border-gray-500">DECEASED</span>
              )}
              {!patient.active && !patient.deceased && (
                <span className="px-1.5 py-0.5 bg-gray-500 text-white text-[10px] font-bold border border-gray-400">INACTIVE</span>
              )}
            </div>
            
            <div className="flex items-center space-x-3 text-[11px] text-white/80">
              <span className="font-mono font-semibold">{patient.mrn}</span>
              <span>|</span>
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-0.5" />
                {formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)}y {patient.gender === 'MALE' ? 'M' : 'F'})
              </span>
              {patient.phoneMobile && (
                <>
                  <span>|</span>
                  <span className="flex items-center">
                    <Phone className="w-3 h-3 mr-0.5" />
                    {patient.phoneMobile}
                  </span>
                </>
              )}
              {patient.email && (
                <>
                  <span>|</span>
                  <span className="flex items-center">
                    <Mail className="w-3 h-3 mr-0.5" />
                    {patient.email}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {allergies.length > 0 && (
            <div className={`flex items-center px-2 py-1 text-[10px] font-bold border border-gray-500 ${hasSevereAllergy ? 'bg-gray-300 text-gray-800' : 'bg-gray-200 text-gray-700'}`}>
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              ALLERGIES: {allergies.map(a => a.allergen).join(', ')}
            </div>
          )}
          <button className="p-1.5 text-white/80 hover:text-white hover:bg-white/10" title="View Allergies">
            <AlertTriangle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
