import { useState } from 'react';
import { Search, User, Calendar } from 'lucide-react';
import { Input, Button, Card } from '../ui';
import type { Patient } from '../../types';
import { demoPatients } from '../../data/demoPatients';

interface PatientSearchProps {
  onSelectPatient: (patient: Patient) => void;
}

export default function PatientSearch({ onSelectPatient }: PatientSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      const filtered = demoPatients.filter(
        (p) =>
          p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.mrn?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setResults(filtered);
      setIsSearching(false);
    }, 300);
  };

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

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient Search</h2>
        <div className="flex space-x-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name, MRN, or date of birth..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} loading={isSearching}>
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>
      </Card>

      {results.length > 0 && (
        <Card padding="none">
          <div className="divide-y divide-gray-200">
            {results.map((patient) => (
              <button
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#e0e8f0] text-left text-[11px]"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 flex items-center justify-center border border-gray-400">
                    <User className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {patient.lastName}, {patient.firstName}
                    </div>
                    <div className="text-sm text-gray-500">
                      MRN: {patient.mrn}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-[10px] text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(patient.dateOfBirth).toLocaleDateString()} ({calculateAge(patient.dateOfBirth)} yo)
                  </div>
                  <div>{patient.gender}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {searchTerm && results.length === 0 && !isSearching && (
        <Card>
          <div className="text-center py-8 text-gray-500">
            No patients found matching "{searchTerm}"
          </div>
        </Card>
      )}
    </div>
  );
}
