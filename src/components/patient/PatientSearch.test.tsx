import { render, screen, fireEvent, act } from '@testing-library/react';
import PatientSearch from './PatientSearch';

describe('PatientSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders search input and button', () => {
    render(<PatientSearch onSelectPatient={jest.fn()} />);
    expect(screen.getByPlaceholderText(/Search by name, MRN/)).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('shows search results when matching patients found', () => {
    render(<PatientSearch onSelectPatient={jest.fn()} />);

    const input = screen.getByPlaceholderText(/Search by name, MRN/);
    fireEvent.change(input, { target: { value: 'Smith' } });
    fireEvent.click(screen.getByText('Search'));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText('Smith, John')).toBeInTheDocument();
  });

  it('filters by MRN', () => {
    render(<PatientSearch onSelectPatient={jest.fn()} />);

    const input = screen.getByPlaceholderText(/Search by name, MRN/);
    fireEvent.change(input, { target: { value: 'MRN001235' } });
    fireEvent.click(screen.getByText('Search'));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText('Johnson, Sarah')).toBeInTheDocument();
    expect(screen.queryByText('Smith, John')).not.toBeInTheDocument();
  });

  it('shows no results message when no patients match', () => {
    render(<PatientSearch onSelectPatient={jest.fn()} />);

    const input = screen.getByPlaceholderText(/Search by name, MRN/);
    fireEvent.change(input, { target: { value: 'NonExistent' } });
    fireEvent.click(screen.getByText('Search'));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText(/No patients found matching "NonExistent"/)).toBeInTheDocument();
  });

  it('calls onSelectPatient when a patient result is clicked', () => {
    const onSelect = jest.fn();
    render(<PatientSearch onSelectPatient={onSelect} />);

    const input = screen.getByPlaceholderText(/Search by name, MRN/);
    fireEvent.change(input, { target: { value: 'Smith' } });
    fireEvent.click(screen.getByText('Search'));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByText('Smith, John'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 1,
      firstName: 'John',
      lastName: 'Smith',
    }));
  });

  it('triggers search on Enter key press', () => {
    render(<PatientSearch onSelectPatient={jest.fn()} />);

    const input = screen.getByPlaceholderText(/Search by name, MRN/);
    fireEvent.change(input, { target: { value: 'Williams' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText('Williams, Michael')).toBeInTheDocument();
  });

  it('shows patient gender in results', () => {
    render(<PatientSearch onSelectPatient={jest.fn()} />);

    const input = screen.getByPlaceholderText(/Search by name, MRN/);
    fireEvent.change(input, { target: { value: 'Smith' } });
    fireEvent.click(screen.getByText('Search'));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText('MALE')).toBeInTheDocument();
  });

  it('searches case-insensitively', () => {
    render(<PatientSearch onSelectPatient={jest.fn()} />);

    const input = screen.getByPlaceholderText(/Search by name, MRN/);
    fireEvent.change(input, { target: { value: 'smith' } });
    fireEvent.click(screen.getByText('Search'));

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText('Smith, John')).toBeInTheDocument();
  });
});
