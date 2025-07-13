import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TableViewPage from '../TableViewPage';
import useAppStore, { GrowthRecord, Patient, AppStoreState, NewGrowthRecordData } from '../../store/appStore'; // Import necessary types

// Mock the Zustand store
jest.mock('../../store/appStore');

// Define mock implementations
const mockAddGrowthRecordAction = jest.fn();
const mockUpdateGrowthRecordAction = jest.fn();
const mockDeleteGrowthRecordAction = jest.fn();

// Define samplePatient at the top level for all describe blocks
const samplePatient: Patient = { id: 'patient-1', name: 'Test Patient', dob: '2023-01-01', sex: 'Male' };

let mockCurrentPatientState: Patient | null = null;
let mockPatientRecordsState: GrowthRecord[] = [];
let mockSettingsState = { units: 'Metric' as 'Metric' | 'Imperial', darkMode: false };


// Helper to setup mock store implementation for tests
const setupMockStore = (currentPatient: Patient | null, records: GrowthRecord[], settings?: Partial<typeof mockSettingsState>) => {
  mockCurrentPatientState = currentPatient;
  mockPatientRecordsState = records;
  mockSettingsState = { ...{ units: 'Metric', darkMode: false }, ...settings };


  (useAppStore as jest.Mock).mockImplementation((selector: (state: AppStoreState) => any) => {
    const state: AppStoreState = {
      patients: currentPatient ? [currentPatient] : [],
      selectedPatientId: currentPatient?.id || null,
      growthRecords: records, // All records, filtering happens in useCurrentPatientRecords
      settings: mockSettingsState as any, // Cast for simplicity if settings type is complex
      fhirContext: { client: undefined, patientId: undefined, serverUrl: undefined, error: null, isRetrieved: false, isAuthorized: false },

      addPatient: jest.fn(), updatePatient: jest.fn(), deletePatient: jest.fn(), selectPatient: jest.fn(),

      addGrowthRecord: mockAddGrowthRecordAction,
      updateGrowthRecord: mockUpdateGrowthRecordAction,
      deleteGrowthRecord: mockDeleteGrowthRecordAction,

      _addOrUpdateBMIRecordInternal: jest.fn(),
      getPatientById: (id: string) => (currentPatient && currentPatient.id === id ? currentPatient : undefined),
      getRecordsForPatient: (id: string) => (currentPatient && currentPatient.id === id ? mockPatientRecordsState : []),
      updateSettings: jest.fn(),
      initializeFHIRClient: jest.fn().mockResolvedValue(null),
      setFHIRContext: jest.fn(),
      clearFHIRContext: jest.fn(),
      fetchFHIRPatientData: jest.fn().mockResolvedValue(undefined),
      fetchFHIRGrowthData: jest.fn().mockResolvedValue(undefined),
    };
    return selector(state);
  });
};


describe('TableViewPage - Add Growth Record Form', () => {
  beforeEach(() => {
    mockAddGrowthRecordAction.mockClear().mockImplementation((record) => ({...record, id: `new-${Math.random()}`}));
    setupMockStore(samplePatient, []);
    global.confirm = jest.fn(() => true);
  });

  const openForm = async () => {
    const addButton = screen.getByRole('button', { name: /Add New Growth Entry/i });
    await userEvent.click(addButton);
  };

  test('renders form when "Add New Growth Entry" is clicked if patient is selected', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    expect(screen.queryByRole('heading', { name: /Add New Growth Record/i })).not.toBeInTheDocument(); // Form initially hidden
    await openForm();
    expect(screen.getByRole('heading', { name: /Add New Growth Record/i })).toBeInTheDocument();
  });

  test('shows message if no patient is selected', () => {
    setupMockStore(null, []); // No patient selected
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    expect(screen.getByText(/Please select a patient/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /Add New Growth Entry/i})).not.toBeInTheDocument();
  });


  test('successfully adds a standard growth record (Weight)', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await openForm();

    fireEvent.change(screen.getByLabelText(/Date of Measurement/i), { target: { value: '2023-06-15' } });
    await userEvent.type(screen.getByLabelText(/Age at Measurement \(Months\)/i), '6');
    await userEvent.selectOptions(screen.getByLabelText(/Measurement Type/i), 'Weight');
    await userEvent.clear(screen.getByLabelText(/Value/i));
    await userEvent.type(screen.getByLabelText(/Value/i), '7.5');
    await userEvent.selectOptions(screen.getByLabelText(/^Unit$/i), 'kg');
    await userEvent.type(screen.getByLabelText(/Intervention Type/i), 'Vitamin D');
    await userEvent.type(screen.getByLabelText(/Intervention Details/i), '1000 IU daily');
    await userEvent.type(screen.getByLabelText(/General Notes \(Optional\)/i), 'Regular checkup');

    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(mockAddGrowthRecordAction).toHaveBeenCalledWith({
      patientId: samplePatient.id, date: '2023-06-15', ageMonths: 6,
      measurementType: 'Weight', value: 7.5, unit: 'kg',
      otherMeasurementName: undefined, interventionType: 'Vitamin D',
      interventionDetails: '1000 IU daily', notes: 'Regular checkup',
    });
    await waitFor(() => expect(screen.getByText('Record added successfully!')).toBeInTheDocument());
  });

  test('successfully adds an "Other" growth record', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await openForm();
    fireEvent.change(screen.getByLabelText(/Date of Measurement/i), { target: { value: '2023-07-01' } });
    await userEvent.type(screen.getByLabelText(/Age at Measurement \(Months\)/i), '7');
    await userEvent.selectOptions(screen.getByLabelText(/Measurement Type/i), 'Other');
    await userEvent.type(screen.getByLabelText(/Measurement Name/i), 'Arm Span');
    await userEvent.clear(screen.getByLabelText(/Value/i)); await userEvent.type(screen.getByLabelText(/Value/i), '60');
    await userEvent.clear(screen.getByLabelText(/^Unit$/i)); await userEvent.type(screen.getByLabelText(/^Unit$/i), 'cm');
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(mockAddGrowthRecordAction).toHaveBeenCalledWith({
      patientId: samplePatient.id, date: '2023-07-01', ageMonths: 7,
      measurementType: 'Other', otherMeasurementName: 'Arm Span',
      value: 60, unit: 'cm',
      interventionType: undefined, interventionDetails: undefined, notes: undefined,
    });
    await waitFor(() => expect(screen.getByText('Record added successfully!')).toBeInTheDocument());
  });

  test('shows error if Age is missing', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await openForm();
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
    expect(screen.getByText('Age at Measurement is required.')).toBeInTheDocument();
  });
});


describe('TableViewPage - Edit Growth Record Form', () => {
  const mockRecordToEdit: GrowthRecord = {
    id: 'rec-to-edit-1', patientId: samplePatient.id, date: '2023-03-10', ageMonths: 3,
    measurementType: 'Height', value: 60, unit: 'cm', notes: 'Original note'
  };
   const mockOtherRecordToEdit: GrowthRecord = {
    id: 'rec-to-edit-2', patientId: samplePatient.id, date: '2023-04-10', ageMonths: 4,
    measurementType: 'Other', otherMeasurementName: 'Arm Span Original', value: 55, unit: 'cm',
    interventionType: 'Physio', interventionDetails: 'Weekly'
  };

  beforeEach(() => {
    mockUpdateGrowthRecordAction.mockClear();
    setupMockStore(samplePatient, [mockRecordToEdit, mockOtherRecordToEdit]);
  });

  const clickEditButtonForRow = async (record: GrowthRecord) => {
    const recordTypeForAria = record.measurementType === 'Other' ? record.otherMeasurementName : record.measurementType;
    const editButton = screen.getByRole('button', { name: `Edit record from ${record.date} for ${recordTypeForAria}`});
    await userEvent.click(editButton);
  };

  test('populates form for editing a standard record', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await clickEditButtonForRow(mockRecordToEdit);
    expect(screen.getByRole('heading', { name: /Edit Growth Record/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Measurement/i)).toHaveValue(mockRecordToEdit.date);
    expect(screen.getByLabelText(/Value/i)).toHaveValue(mockRecordToEdit.value);
  });

  test('successfully updates a record', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await clickEditButtonForRow(mockRecordToEdit);
    const valueInput = screen.getByLabelText(/Value/i);
    await userEvent.clear(valueInput); await userEvent.type(valueInput, '62.5');
    await userEvent.click(screen.getByRole('button', { name: /Update Record/i }));
    expect(mockUpdateGrowthRecordAction).toHaveBeenCalledWith(expect.objectContaining({ id: mockRecordToEdit.id, value: 62.5 }));
    await waitFor(() => expect(screen.getByText('Record updated successfully!')).toBeInTheDocument());
  });
});

describe('TableViewPage - Delete Growth Record', () => {
  const mockRecordToDelete: GrowthRecord = {
    id: 'rec-to-delete-1', patientId: samplePatient.id, date: '2023-03-15', ageMonths: 3.5,
    measurementType: 'Weight', value: 6, unit: 'kg', notes: 'To be deleted'
  };
  beforeEach(() => {
    mockDeleteGrowthRecordAction.mockClear();
    setupMockStore(samplePatient, [mockRecordToDelete]);
    global.confirm = jest.fn(() => true);
  });

  test('calls deleteGrowthRecord action when delete is confirmed', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    const deleteButton = screen.getByRole('button', { name: `Delete record from ${mockRecordToDelete.date} for ${mockRecordToDelete.measurementType}` });
    await userEvent.click(deleteButton);
    expect(global.confirm).toHaveBeenCalled();
    expect(mockDeleteGrowthRecordAction).toHaveBeenCalledWith(mockRecordToDelete.id);
  });
});
