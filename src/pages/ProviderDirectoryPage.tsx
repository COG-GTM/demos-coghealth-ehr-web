import { useState } from 'react';
import { Search, Stethoscope, Mail, Phone, Building2, AlertCircle } from 'lucide-react';
import { providerService } from '../services/providerService';
import type { Provider } from '../types';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';

export default function ProviderDirectoryPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await providerService.search(query);
      setResults(data);
      setSearched(true);
    } catch (e) {
      setError('Unable to load provider directory. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  return (
    <div className="h-full overflow-auto bg-white p-3 text-[11px] text-gray-800">
      <div className="flex items-center space-x-2 mb-3">
        <Stethoscope className="w-4 h-4 text-blue-800" />
        <h1 className="font-semibold text-[13px]">Provider Directory</h1>
      </div>
      <p className="text-gray-500 mb-2">
        Search the care team directory by provider last name.
      </p>

      <form onSubmit={onSubmit} className="flex items-center space-x-2 mb-3">
        <div className="flex items-center border border-gray-400 bg-white px-2 py-1 w-72">
          <Search className="w-3 h-3 text-gray-500 mr-1" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Provider last name..."
            className="flex-1 text-[11px] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="ehr-toolbar-button border border-gray-400 bg-[#ece9d8] px-3 py-1 hover:bg-gray-200"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="flex items-center space-x-1 text-red-700 mb-2">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}

      {searched && !error && (
        <div className="text-gray-500 mb-1">{results.length} provider(s) found</div>
      )}

      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-[#ece9d8] text-left">
            <th className="border border-gray-300 px-2 py-1">Name</th>
            <th className="border border-gray-300 px-2 py-1">Credentials</th>
            <th className="border border-gray-300 px-2 py-1">Specialty</th>
            <th className="border border-gray-300 px-2 py-1">Department</th>
            <th className="border border-gray-300 px-2 py-1">Contact</th>
          </tr>
        </thead>
        <tbody>
          {results.map((p) => (
            <tr key={p.id} className="hover:bg-blue-50">
              <td className="border border-gray-300 px-2 py-1 font-semibold">
                {p.lastName}, {p.firstName}
              </td>
              <td className="border border-gray-300 px-2 py-1">{p.credentials || '-'}</td>
              <td className="border border-gray-300 px-2 py-1">{p.specialty || '-'}</td>
              <td className="border border-gray-300 px-2 py-1">
                <span className="inline-flex items-center">
                  <Building2 className="w-3 h-3 mr-1 text-gray-400" />
                  {p.department || '-'}
                </span>
              </td>
              <td className="border border-gray-300 px-2 py-1">
                <div className="flex flex-col">
                  {p.email && (
                    <span className="inline-flex items-center text-gray-600">
                      <Mail className="w-3 h-3 mr-1 text-gray-400" />
                      {p.email}
                    </span>
                  )}
                  {p.phoneOffice && (
                    <span className="inline-flex items-center text-gray-600">
                      <Phone className="w-3 h-3 mr-1 text-gray-400" />
                      {p.phoneOffice}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {searched && results.length === 0 && !error && (
            <tr>
              <td colSpan={5} className="border border-gray-300 px-2 py-3 text-center text-gray-500">
                No providers match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <LoadingOverlay isLoading={loading} />
    </div>
  );
}
