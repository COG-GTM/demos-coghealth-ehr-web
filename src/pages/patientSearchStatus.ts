export function patientListStatusMessage(count: number, loading: boolean, loadFailed = false): string {
  if (loading) return 'Loading patients...';
  if (loadFailed) {
    return count === 0 ? 'Failed to load patients' : `Refresh failed - showing ${count} previous record(s)`;
  }
  if (count === 0) return 'No patients found';
  return `${count} record(s) found`;
}
