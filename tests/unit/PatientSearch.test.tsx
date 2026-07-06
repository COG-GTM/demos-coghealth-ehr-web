import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientSearch from '../../src/components/patient/PatientSearch';

describe('PatientSearch', () => {
  it('filters the built-in patients by name and returns matches', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<PatientSearch onSelectPatient={onSelect} />);

    await user.type(
      screen.getByPlaceholderText(/Search by name, MRN/),
      'smith'
    );
    await user.click(screen.getByRole('button', { name: /Search/ }));

    expect(await screen.findByText('Smith, John')).toBeInTheDocument();
    expect(screen.queryByText('Johnson, Sarah')).not.toBeInTheDocument();
  });

  it('invokes onSelectPatient when a result is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<PatientSearch onSelectPatient={onSelect} />);

    await user.type(
      screen.getByPlaceholderText(/Search by name, MRN/),
      'MRN001235'
    );
    await user.click(screen.getByRole('button', { name: /Search/ }));

    const result = await screen.findByText('Johnson, Sarah');
    await user.click(result);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ mrn: 'MRN001235', lastName: 'Johnson' })
    );
  });

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup();
    render(<PatientSearch onSelectPatient={jest.fn()} />);

    await user.type(
      screen.getByPlaceholderText(/Search by name, MRN/),
      'zzzznomatch'
    );
    await user.click(screen.getByRole('button', { name: /Search/ }));

    expect(
      await screen.findByText(/No patients found matching/)
    ).toBeInTheDocument();
  });
});
