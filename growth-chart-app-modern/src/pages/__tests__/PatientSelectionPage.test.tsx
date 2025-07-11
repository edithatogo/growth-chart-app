import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom'; // For components with <Link>
import PatientSelectionPage from '../PatientSelectionPage';
import useAppStore from '../../store/appStore'; // Import the store to be mocked

// Mock the Zustand store
jest.mock('../../store/appStore');

// Define mock implementations for store actions and state
const mockAddPatientAction = jest.fn();
const mockUpdatePatientAction = jest.fn();
const mockDeletePatientAction = jest.fn();
const mockSelectPatient = jest.fn();
let mockPatientsState: any[] = [];
let mockSelectedPatientIdState: string | null = null;

const mockStore = {
  patients: mockPatientsState,
  selectedPatientId: mockSelectedPatientIdState,
  addPatient: mockAddPatientAction,
  updatePatient: mockUpdatePatientAction,
  deletePatient: mockDeletePatientAction,
  selectPatient: mockSelectPatient,
  // getPatientById and other selectors can be mocked if directly used by component,
  // but usually testing focuses on actions and visible state changes.
};

describe('PatientSelectionPage - Add Patient Form', () => {
  beforeEach(() => {
    // Reset mocks and mock store state before each test
    mockAddPatientAction.mockClear();
    mockUpdatePatientAction.mockClear();
    mockDeletePatientAction.mockClear();
    mockSelectPatient.mockClear();
    mockPatientsState = [];
    mockSelectedPatientIdState = null;

    // Update the return value of the mock for each test
    (useAppStore as jest.Mock).mockReturnValue({
      patients: mockPatientsState,
      selectedPatientId: mockSelectedPatientIdState,
      addPatient: mockAddPatientAction,
      updatePatient: mockUpdatePatientAction,
      deletePatient: mockDeletePatientAction,
      selectPatient: mockSelectPatient,
    });

    // Mock window.confirm for delete tests later, can be overridden in specific tests
    global.confirm = jest.fn(() => true);
  });

  test('renders the add patient form correctly', () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /Add New Patient/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Condition \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sex/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Patient/i })).toBeInTheDocument();
  });

  test('allows typing into form fields', async () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );
    const nameInput = screen.getByLabelText(/Full Name/i) as HTMLInputElement;
    const dobInput = screen.getByLabelText(/Date of Birth/i) as HTMLInputElement;
    const conditionInput = screen.getByLabelText(/Condition \(Optional\)/i) as HTMLInputElement;
    const sexSelect = screen.getByLabelText(/Sex/i) as HTMLSelectElement;

    await userEvent.type(nameInput, 'Test User');
    expect(nameInput.value).toBe('Test User');

    fireEvent.change(dobInput, { target: { value: '2023-01-01' } });
    expect(dobInput.value).toBe('2023-01-01');

    await userEvent.type(conditionInput, 'Test Condition');
    expect(conditionInput.value).toBe('Test Condition');

    await userEvent.selectOptions(sexSelect, 'Female');
    expect(sexSelect.value).toBe('Female');
  });

  test('successfully adds a new patient', async () => {
    // Mock addPatientAction to return the patient data for message verification
    mockAddPatientAction.mockImplementation((patient) => ({...patient, id: 'new-id-123'}));

    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/Full Name/i), 'New Patient Jane');
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '2023-05-10' } });
    await userEvent.selectOptions(screen.getByLabelText(/Sex/i), 'Female');
    await userEvent.type(screen.getByLabelText(/Condition \(Optional\)/i), 'Healthy');

    await userEvent.click(screen.getByRole('button', { name: /Add Patient/i }));

    expect(mockAddPatientAction).toHaveBeenCalledWith({
      name: 'New Patient Jane',
      dob: '2023-05-10',
      sex: 'Female',
      condition: 'Healthy',
    });

    // Check for success message (it appears and disappears)
    await waitFor(() => {
        expect(screen.getByText(/Patient "New Patient Jane" added successfully!/i)).toBeInTheDocument();
    });
    await waitFor(() => {
        expect(screen.queryByText(/Patient "New Patient Jane" added successfully!/i)).not.toBeInTheDocument();
    }, {timeout: 3500}); // Wait a bit longer than the message timeout
  });

  test('shows error if name is missing', async () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '2023-05-10' } });
    await userEvent.click(screen.getByRole('button', { name: /Add Patient/i }));
    expect(mockAddPatientAction).not.toHaveBeenCalled();
    expect(screen.getByText('Patient name is required.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toHaveClass('border-red-500');
  });

  test('shows error if name is too long (over 100 chars)', async () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );
    const longName = 'a'.repeat(101);
    await userEvent.type(screen.getByLabelText(/Full Name/i), longName);
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '2023-05-10' } });
    await userEvent.click(screen.getByRole('button', { name: /Add Patient/i }));
    expect(mockAddPatientAction).not.toHaveBeenCalled();
    expect(screen.getByText('Patient name cannot exceed 100 characters.')).toBeInTheDocument();
  });

  test('shows error if DOB is missing', async () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );
    await userEvent.type(screen.getByLabelText(/Full Name/i), 'Test Dob Missing');
    await userEvent.click(screen.getByRole('button', { name: /Add Patient/i }));
    expect(mockAddPatientAction).not.toHaveBeenCalled();
    expect(screen.getByText('Date of Birth is required.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/i)).toHaveClass('border-red-500');
  });

  test('shows error if DOB is in the future', async () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const futureDateString = tomorrow.toISOString().split('T')[0];

    await userEvent.type(screen.getByLabelText(/Full Name/i), 'Future Baby');
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: futureDateString } });
    await userEvent.click(screen.getByRole('button', { name: /Add Patient/i }));
    expect(mockAddPatientAction).not.toHaveBeenCalled();
    expect(screen.getByText('Date of Birth cannot be in the future.')).toBeInTheDocument();
  });

  test('shows error if condition is too long (over 100 chars)', async () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );
    const longCondition = 'c'.repeat(101);
    await userEvent.type(screen.getByLabelText(/Full Name/i), 'Test Condition Length');
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '2023-05-10' } });
    await userEvent.type(screen.getByLabelText(/Condition \(Optional\)/i), longCondition);
    await userEvent.click(screen.getByRole('button', { name: /Add Patient/i }));
    expect(mockAddPatientAction).not.toHaveBeenCalled();
    expect(screen.getByText('Condition cannot exceed 100 characters.')).toBeInTheDocument();
  });

});

// Placeholder for Edit and Delete tests to be added in subsequent steps
describe('PatientSelectionPage - Edit Patient Form', () => {
  const mockPatientToEdit: Patient = { id: 'edit-me-123', name: 'Original Name', dob: '2022-10-10', sex: 'Male', condition: 'Initial Condition' };

  beforeEach(() => {
    // Ensure the patient to edit exists in the mock store state for these tests
    mockPatientsState = [mockPatientToEdit];
    mockSelectedPatientIdState = mockPatientToEdit.id; // Assume patient is selected to show edit button clearly

    (useAppStore as jest.Mock).mockReturnValue({ // Re-apply mock with updated state
      patients: mockPatientsState,
      selectedPatientId: mockSelectedPatientIdState,
      addPatient: mockAddPatientAction,
      updatePatient: mockUpdatePatientAction,
      deletePatient: mockDeletePatientAction,
      selectPatient: mockSelectPatient,
    });
  });

  test('populates form when edit button is clicked', async () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );

    // Find the edit button for the specific patient
    // The patient card itself will be complex to query directly without more specific test IDs.
    // We assume the list renders and the edit button is identifiable.
    // For simplicity, we'll assume the edit button is associated with the patient name.
    const editButton = screen.getByRole('button', { name: `Edit patient ${mockPatientToEdit.name}` });
    await userEvent.click(editButton);

    expect(screen.getByLabelText(/Full Name/i)).toHaveValue(mockPatientToEdit.name);
    expect(screen.getByLabelText(/Date of Birth/i)).toHaveValue(mockPatientToEdit.dob);
    expect(screen.getByLabelText(/Sex/i)).toHaveValue(mockPatientToEdit.sex);
    expect(screen.getByLabelText(/Condition \(Optional\)/i)).toHaveValue(mockPatientToEdit.condition);
    expect(screen.getByRole('button', { name: /Update Patient/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel Edit/i })).toBeInTheDocument();
  });

  test('successfully updates a patient', async () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );

    const editButton = screen.getByRole('button', { name: `Edit patient ${mockPatientToEdit.name}` });
    await userEvent.click(editButton);

    const nameInput = screen.getByLabelText(/Full Name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Patient Name');

    const conditionInput = screen.getByLabelText(/Condition \(Optional\)/i);
    await userEvent.clear(conditionInput);
    await userEvent.type(conditionInput, 'New Condition');

    await userEvent.click(screen.getByRole('button', { name: /Update Patient/i }));

    expect(mockUpdatePatientAction).toHaveBeenCalledWith({
      id: mockPatientToEdit.id,
      name: 'Updated Patient Name',
      dob: mockPatientToEdit.dob, // DOB wasn't changed in this test
      sex: mockPatientToEdit.sex,   // Sex wasn't changed
      condition: 'New Condition',
    });

    await waitFor(() => {
      expect(screen.getByText('Patient updated successfully!')).toBeInTheDocument();
    });
    // Form should reset to "Add New Patient" mode
    expect(screen.getByRole('heading', { name: /Add New Patient/i })).toBeInTheDocument();
  });

  test('shows validation errors on update', async () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );

    const editButton = screen.getByRole('button', { name: `Edit patient ${mockPatientToEdit.name}` });
    await userEvent.click(editButton);

    const nameInput = screen.getByLabelText(/Full Name/i);
    await userEvent.clear(nameInput); // Make name empty
    await userEvent.click(screen.getByRole('button', { name: /Update Patient/i }));

    expect(mockUpdatePatientAction).not.toHaveBeenCalled();
    expect(screen.getByText('Patient name is required.')).toBeInTheDocument();
    expect(nameInput).toHaveClass('border-red-500');
  });

  test('cancels edit mode correctly', async () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );

    const editButton = screen.getByRole('button', { name: `Edit patient ${mockPatientToEdit.name}` });
    await userEvent.click(editButton);

    // Verify form is in edit mode
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue(mockPatientToEdit.name);
    expect(screen.getByRole('button', { name: /Update Patient/i })).toBeInTheDocument();

    const cancelEditButton = screen.getByRole('button', { name: /Cancel Edit/i });
    await userEvent.click(cancelEditButton);

    // Verify form is back in add mode and fields are cleared/reset
    expect(screen.getByRole('heading', { name: /Add New Patient/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /Add Patient/i })).toBeInTheDocument();
  });
});

describe('PatientSelectionPage - Delete Patient', () => {
  const mockPatientToDelete: Patient = { id: 'delete-me-456', name: 'Patient To Delete', dob: '2021-01-01', sex: 'Other' };

  beforeEach(() => {
    mockPatientsState = [mockPatientToDelete]; // Ensure patient exists
    mockSelectedPatientIdState = null; // Not strictly necessary for delete button to appear

    (useAppStore as jest.Mock).mockReturnValue({
      patients: mockPatientsState,
      selectedPatientId: mockSelectedPatientIdState,
      addPatient: mockAddPatientAction,
      updatePatient: mockUpdatePatientAction,
      deletePatient: mockDeletePatientAction,
      selectPatient: mockSelectPatient,
    });
    // Reset global.confirm mock for each test
    global.confirm = jest.fn(() => true);
  });

  test('calls deletePatient action when delete is confirmed', async () => {
    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );

    const deleteButton = screen.getByRole('button', { name: `Delete patient ${mockPatientToDelete.name}` });
    await userEvent.click(deleteButton);

    expect(global.confirm).toHaveBeenCalledWith(
      `Are you sure you want to delete patient "${mockPatientToDelete.name}" and all their associated records? This action cannot be undone.`
    );
    expect(mockDeletePatientAction).toHaveBeenCalledWith(mockPatientToDelete.id);
  });

  test('does not call deletePatient action when delete is cancelled', async () => {
    (global.confirm as jest.Mock).mockReturnValueOnce(false); // Simulate user clicking "Cancel"

    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );

    const deleteButton = screen.getByRole('button', { name: `Delete patient ${mockPatientToDelete.name}` });
    await userEvent.click(deleteButton);

    expect(global.confirm).toHaveBeenCalledWith(
      `Are you sure you want to delete patient "${mockPatientToDelete.name}" and all their associated records? This action cannot be undone.`
    );
    expect(mockDeletePatientAction).not.toHaveBeenCalled();
  });

  test('resets form if the patient being edited is deleted', async () => {
    // Setup: Patient is being edited
    (useAppStore as jest.Mock).mockReturnValue({
      patients: [mockPatientToDelete],
      selectedPatientId: null, // Selection doesn't matter, but form state does
      addPatient: mockAddPatientAction,
      updatePatient: mockUpdatePatientAction,
      deletePatient: mockDeletePatientAction,
      selectPatient: mockSelectPatient,
    });

    render(
      <MemoryRouter>
        <PatientSelectionPage />
      </MemoryRouter>
    );

    // Start editing the patient
    const editButton = screen.getByRole('button', { name: `Edit patient ${mockPatientToDelete.name}` });
    await userEvent.click(editButton);
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue(mockPatientToDelete.name); // Form is in edit mode

    // Now, delete this same patient (simulating another action or delayed delete)
    const deleteButton = screen.getByRole('button', { name: `Delete patient ${mockPatientToDelete.name}` });
    await userEvent.click(deleteButton); // Confirms by default due to beforeEach mock

    expect(mockDeletePatientAction).toHaveBeenCalledWith(mockPatientToDelete.id);
    // Check if form has reset
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue('');
    expect(screen.getByRole('heading', {name: /Add New Patient/i})).toBeInTheDocument();
  });
});
