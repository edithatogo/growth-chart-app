import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PatientSelectionPage from '../PatientSelectionPage';
import useAppStore, { Patient, AppStoreState } from '../../store/appStore';

// Mock the Zustand store
jest.mock('../../store/appStore');

const mockAddPatientAction = jest.fn();
const mockUpdatePatientAction = jest.fn();
const mockDeletePatientAction = jest.fn();
const mockSelectPatient = jest.fn();
let mockPatientsState: Patient[] = [];
let mockSelectedPatientIdState: string | null = null;

// Helper to setup mock store implementation for tests
const setupMockStore = (patients: Patient[], selectedId: string | null) => {
  mockPatientsState = patients;
  mockSelectedPatientIdState = selectedId;

  (useAppStore as jest.Mock).mockImplementation((selector: (state: AppStoreState) => any) => {
    // Construct the full state object that the selector would operate on
    const state: AppStoreState = {
      patients: mockPatientsState,
      selectedPatientId: mockSelectedPatientIdState,
      addPatient: mockAddPatientAction,
      updatePatient: mockUpdatePatientAction,
      deletePatient: mockDeletePatientAction,
      selectPatient: mockSelectPatient,
      // Provide defaults for other parts of the store state if necessary
      growthRecords: [],
      settings: { units: 'Metric', darkMode: false, defaultChartType: 'WeightForAge', language: 'English', notifications: {appointmentReminders: false, newDataAlerts: false}},
      fhirContext: { client: undefined, patientId: undefined, serverUrl: undefined, error: null, isRetrieved: false, isAuthorized: false },
      _addOrUpdateBMIRecordInternal: jest.fn(),
      getPatientById: (id: string) => mockPatientsState.find(p => p.id === id),
      getRecordsForPatient: (id: string) => [], // Assuming no records for these patient-centric tests
      initializeFHIRClient: jest.fn().mockResolvedValue(null),
      setFHIRContext: jest.fn(),
      clearFHIRContext: jest.fn(),
      fetchFHIRPatientData: jest.fn().mockResolvedValue(undefined),
      fetchFHIRGrowthData: jest.fn().mockResolvedValue(undefined),
    };
    return selector(state);
  });
};


describe('PatientSelectionPage - Add Patient Form', () => {
  beforeEach(() => {
    mockAddPatientAction.mockClear().mockImplementation((patient) => ({...patient, id: `new-${Math.random()}`}));
    mockUpdatePatientAction.mockClear();
    mockDeletePatientAction.mockClear();
    mockSelectPatient.mockClear();
    setupMockStore([], null); // Default to no patients, no selection
    global.confirm = jest.fn(() => true);
  });

  test('renders the add patient form correctly', () => {
    render(<MemoryRouter><PatientSelectionPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Add New Patient/i })).toBeInTheDocument();
  });

  test('allows typing into form fields', async () => {
    render(<MemoryRouter><PatientSelectionPage /></MemoryRouter>);
    const nameInput = screen.getByLabelText(/Full Name/i) as HTMLInputElement;
    await userEvent.type(nameInput, 'Test User'); expect(nameInput.value).toBe('Test User');
  });

  test('successfully adds a new patient', async () => {
    render(<MemoryRouter><PatientSelectionPage /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/Full Name/i), 'New Patient Jane');
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '2023-05-10' } });
    await userEvent.click(screen.getByRole('button', { name: /Add Patient/i }));
    expect(mockAddPatientAction).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Patient Jane' }));
    await waitFor(() => expect(screen.getByText(/Patient "New Patient Jane" added successfully!/i)).toBeInTheDocument());
  });

  test('shows error if name is missing', async () => {
    render(<MemoryRouter><PatientSelectionPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /Add Patient/i }));
    expect(screen.getByText('Patient name is required.')).toBeInTheDocument();
  });
});


describe('PatientSelectionPage - Edit Patient Form', () => {
  const mockPatientToEdit: Patient = { id: 'edit-me-123', name: 'Original Name', dob: '2022-10-10', sex: 'Male', condition: 'Initial Condition' };
  beforeEach(() => {
    mockAddPatientAction.mockClear(); mockUpdatePatientAction.mockClear(); mockDeletePatientAction.mockClear(); mockSelectPatient.mockClear();
    setupMockStore([mockPatientToEdit], mockPatientToEdit.id);
  });

  test('populates form when edit button is clicked', async () => {
    render(<MemoryRouter><PatientSelectionPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: `Edit patient ${mockPatientToEdit.name}` }));
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue(mockPatientToEdit.name);
    expect(screen.getByRole('button', { name: /Update Patient/i })).toBeInTheDocument();
  });

  test('successfully updates a patient', async () => {
    render(<MemoryRouter><PatientSelectionPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: `Edit patient ${mockPatientToEdit.name}` }));
    const nameInput = screen.getByLabelText(/Full Name/i);
    await userEvent.clear(nameInput); await userEvent.type(nameInput, 'Updated Name');
    await userEvent.click(screen.getByRole('button', { name: /Update Patient/i }));
    expect(mockUpdatePatientAction).toHaveBeenCalledWith(expect.objectContaining({ id: mockPatientToEdit.id, name: 'Updated Name' }));
    await waitFor(() => expect(screen.getByText('Patient updated successfully!')).toBeInTheDocument());
  });
});

describe('PatientSelectionPage - Delete Patient', () => {
  const mockPatientToDelete: Patient = { id: 'delete-me-456', name: 'Patient To Delete', dob: '2021-01-01', sex: 'Other' };
  beforeEach(() => {
    mockAddPatientAction.mockClear(); mockUpdatePatientAction.mockClear(); mockDeletePatientAction.mockClear(); mockSelectPatient.mockClear();
    setupMockStore([mockPatientToDelete], null);
    global.confirm = jest.fn(() => true);
  });

  test('calls deletePatient action when delete is confirmed', async () => {
    render(<MemoryRouter><PatientSelectionPage /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: `Delete patient ${mockPatientToDelete.name}` }));
    expect(global.confirm).toHaveBeenCalled();
    expect(mockDeletePatientAction).toHaveBeenCalledWith(mockPatientToDelete.id);
  });
});
