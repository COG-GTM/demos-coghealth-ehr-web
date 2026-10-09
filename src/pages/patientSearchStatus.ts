export function patientListStatusMessage(count: number, loading: boolean): string {
  if (loading) return 'Loading patients...';
  if (count === 0) return 'No patients found';
  return `${count} record(s) found`;
}
