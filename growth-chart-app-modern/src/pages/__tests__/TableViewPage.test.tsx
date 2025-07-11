import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TableViewPage from '../TableViewPage';
import useAppStore, { GrowthRecord, Patient } from '../../store/appStore';

// Mock the Zustand store
jest.mock('../../store/appStore');

// Define mock implementations
const mockAddGrowthRecordAction = jest.fn();
const mockUpdateGrowthRecordAction = jest.fn();
const mockDeleteGrowthRecordAction = jest.fn();

let mockCurrentPatientState: Patient | null = null;
let mockPatientRecordsState: GrowthRecord[] = [];
let mockSettingsState = { units: 'Metric', darkMode: false }; // Default settings

const mockUseCurrentPatient = jest.fn();
const mockUseCurrentPatientRecords = jest.fn();


describe('TableViewPage - Add Growth Record Form', () => {
  const samplePatient: Patient = { id: 'patient-1', name: 'Test Patient', dob: '2023-01-01', sex: 'Male' };

  beforeEach(() => {
    mockAddGrowthRecordAction.mockClear();
    mockUpdateGrowthRecordAction.mockClear();
    mockDeleteGrowthRecordAction.mockClear();

    mockCurrentPatientState = samplePatient;
    mockPatientRecordsState = [];
    mockSettingsState = { units: 'Metric', darkMode: false };

    (useAppStore as jest.Mock).mockImplementation((selector) => {
        // This more closely mimics how the component uses the store selectors
        if (selector.toString().includes('state.addGrowthRecord')) return mockAddGrowthRecordAction;
        if (selector.toString().includes('state.updateGrowthRecord')) return mockUpdateGrowthRecordAction;
        if (selector.toString().includes('state.deleteGrowthRecord')) return mockDeleteGrowthRecordAction;
        if (selector.toString().includes('state.settings')) return mockSettingsState;
        // For useCurrentPatient and useCurrentPatientRecords, we need to mock their specific hook return values
        // This direct selector mocking is simpler if the component structure allows direct useAppStore(selector)
        // However, our component uses custom hooks useCurrentPatient and useCurrentPatientRecords.
        // So, we need to mock those hooks specifically, or mock the base selectors they use.
        // Let's mock the base selectors they use:
        if (selector.toString().includes('state.selectedPatientId')) return mockCurrentPatientState?.id || null;
        if (selector.toString().includes('state.patients')) return mockCurrentPatientState ? [mockCurrentPatientState] : [];
        if (selector.toString().includes('state.growthRecords')) return mockPatientRecordsState;
        if (selector.toString().includes('state.getPatientById')) return (id: string) => mockCurrentPatientState && mockCurrentPatientState.id === id ? mockCurrentPatientState : undefined;
        if (selector.toString().includes('state.getRecordsForPatient')) return (id: string) => mockCurrentPatientState && mockCurrentPatientState.id === id ? mockPatientRecordsState : [];

        return jest.fn(); // Default mock for other selectors
    });

    // Mock the custom hooks if direct selector mocking above is not enough
    // For this test suite, we'll rely on the above selectors being correctly called by the custom hooks.
    // A more robust way would be:
    // jest.mock('../../store/appStore', () => ({
    //   ...jest.requireActual('../../store/appStore'), // Import and retain original exports
    //   useCurrentPatient: mockUseCurrentPatient,
    //   useCurrentPatientRecords: mockUseCurrentPatientRecords,
    //   default: useAppStore // if useAppStore itself is also used directly
    // }));
    // mockUseCurrentPatient.mockReturnValue(mockCurrentPatientState);
    // mockUseCurrentPatientRecords.mockReturnValue(mockPatientRecordsState);


    global.confirm = jest.fn(() => true);
  });

  const openForm = async () => {
    const addButton = screen.getByRole('button', { name: /Add New Growth Entry/i });
    await userEvent.click(addButton);
  };

  test('renders form when "Add New Growth Entry" is clicked', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await openForm();
    expect(screen.getByRole('heading', { name: /Add New Growth Record/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Measurement/i)).toBeInTheDocument();
  });

  test('successfully adds a standard growth record (Weight)', async () => {
    mockAddGrowthRecordAction.mockImplementation((record) => ({...record, id: 'new-rec-id'}));
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await openForm();

    fireEvent.change(screen.getByLabelText(/Date of Measurement/i), { target: { value: '2023-06-15' } });
    await userEvent.type(screen.getByLabelText(/Age at Measurement \(Months\)/i), '6');
    await userEvent.selectOptions(screen.getByLabelText(/Measurement Type/i), 'Weight');
    await userEvent.clear(screen.getByLabelText(/Value/i)); // userEvent.type sometimes appends
    await userEvent.type(screen.getByLabelText(/Value/i), '7.5');
    await userEvent.selectOptions(screen.getByLabelText(/^Unit$/i), 'kg'); // Use regex for "Unit" to avoid conflict if other labels exist
    await userEvent.type(screen.getByLabelText(/Intervention Type/i), 'Vitamin D');
    await userEvent.type(screen.getByLabelText(/Intervention Details/i), '1000 IU daily');
    await userEvent.type(screen.getByLabelText(/General Notes \(Optional\)/i), 'Regular checkup');

    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(mockAddGrowthRecordAction).toHaveBeenCalledWith({
      patientId: samplePatient.id,
      date: '2023-06-15',
      ageMonths: 6,
      measurementType: 'Weight',
      value: 7.5,
      unit: 'kg',
      otherMeasurementName: undefined,
      interventionType: 'Vitamin D',
      interventionDetails: '1000 IU daily',
      notes: 'Regular checkup',
    });
    await waitFor(() => expect(screen.getByText('Record added successfully!')).toBeInTheDocument());
  });

  test('successfully adds an "Other" growth record', async () => {
    mockAddGrowthRecordAction.mockImplementation((record) => ({...record, id: 'new-other-rec-id'}));
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await openForm();

    fireEvent.change(screen.getByLabelText(/Date of Measurement/i), { target: { value: '2023-07-01' } });
    await userEvent.type(screen.getByLabelText(/Age at Measurement \(Months\)/i), '7');
    await userEvent.selectOptions(screen.getByLabelText(/Measurement Type/i), 'Other');

    // 'Other' specific fields
    await userEvent.type(screen.getByLabelText(/Measurement Name/i), 'Arm Span');
    await userEvent.clear(screen.getByLabelText(/Value/i));
    await userEvent.type(screen.getByLabelText(/Value/i), '60');
    await userEvent.clear(screen.getByLabelText(/^Unit$/i)); // Clear if it was select before
    await userEvent.type(screen.getByLabelText(/^Unit$/i), 'cm');


    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect(mockAddGrowthRecordAction).toHaveBeenCalledWith({
      patientId: samplePatient.id,
      date: '2023-07-01',
      ageMonths: 7,
      measurementType: 'Other',
      otherMeasurementName: 'Arm Span',
      value: 60,
      unit: 'cm',
      interventionType: undefined,
      interventionDetails: undefined,
      notes: undefined,
    });
    await waitFor(() => expect(screen.getByText('Record added successfully!')).toBeInTheDocument());
  });

  test('shows error if Age is missing', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await openForm();
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
    expect(mockAddGrowthRecordAction).not.toHaveBeenCalled();
    expect(screen.getByText('Age at Measurement is required.')).toBeInTheDocument();
  });

  test('shows error if Value is missing', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await openForm();
    await userEvent.type(screen.getByLabelText(/Age at Measurement \(Months\)/i), '6');
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
    expect(mockAddGrowthRecordAction).not.toHaveBeenCalled();
    expect(screen.getByText('Value is required.')).toBeInTheDocument();
  });

  test('shows error if "Other" Measurement Name is missing when type is "Other"', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await openForm();
    await userEvent.selectOptions(screen.getByLabelText(/Measurement Type/i), 'Other');
    await userEvent.type(screen.getByLabelText(/Age at Measurement \(Months\)/i), '6');
    await userEvent.type(screen.getByLabelText(/Value/i), '30');
    await userEvent.type(screen.getByLabelText(/^Unit$/i), 'cm');
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
    expect(mockAddGrowthRecordAction).not.toHaveBeenCalled();
    expect(screen.getByText('Measurement Name is required for "Other" type.')).toBeInTheDocument();
  });

});

// Placeholders for Edit and Delete Record tests
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
    // Setup with the patient and the record to edit
    mockCurrentPatientState = samplePatient;
    mockPatientRecordsState = [mockRecordToEdit, mockOtherRecordToEdit];

    (useAppStore as jest.Mock).mockImplementation((selector) => {
        if (selector.toString().includes('state.addGrowthRecord')) return mockAddGrowthRecordAction;
        if (selector.toString().includes('state.updateGrowthRecord')) return mockUpdateGrowthRecordAction;
        if (selector.toString().includes('state.deleteGrowthRecord')) return mockDeleteGrowthRecordAction;
        if (selector.toString().includes('state.settings')) return mockSettingsState;
        if (selector.toString().includes('state.selectedPatientId')) return mockCurrentPatientState?.id || null;
        if (selector.toString().includes('state.patients')) return mockCurrentPatientState ? [mockCurrentPatientState] : [];
        if (selector.toString().includes('state.growthRecords')) return mockPatientRecordsState; // Provide records
        if (selector.toString().includes('state.getPatientById')) return (id: string) => mockCurrentPatientState && mockCurrentPatientState.id === id ? mockCurrentPatientState : undefined;
        if (selector.toString().includes('state.getRecordsForPatient')) return (id: string) => mockCurrentPatientState && mockCurrentPatientState.id === id ? mockPatientRecordsState : [];
        return jest.fn();
    });
  });

  const clickEditButtonForRow = async (record: GrowthRecord) => {
    // Find the row (tr) then the button within it. This is more robust if table order changes.
    // For simplicity, assuming a unique way to find the edit button.
    // A better way would be to add data-testid to rows or buttons.
    // Here, we rely on aria-label which includes date and type.
    const editButton = screen.getByRole('button', { name: `Edit record from ${record.date} for ${record.measurementType === 'Other' ? record.otherMeasurementName : record.measurementType}`});
    await userEvent.click(editButton);
  };

  test('populates form for editing a standard record', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await clickEditButtonForRow(mockRecordToEdit);

    expect(screen.getByRole('heading', { name: /Edit Growth Record/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Measurement/i)).toHaveValue(mockRecordToEdit.date);
    expect(screen.getByLabelText(/Age at Measurement \(Months\)/i)).toHaveValue(mockRecordToEdit.ageMonths);
    expect(screen.getByLabelText(/Measurement Type/i)).toHaveValue(mockRecordToEdit.measurementType);
    expect(screen.getByLabelText(/Value/i)).toHaveValue(mockRecordToEdit.value);
    expect(screen.getByLabelText(/^Unit$/i)).toHaveValue(mockRecordToEdit.unit);
    expect(screen.getByLabelText(/General Notes \(Optional\)/i)).toHaveValue(mockRecordToEdit.notes);
    expect(screen.getByRole('button', { name: /Update Record/i })).toBeInTheDocument();
  });

  test('populates form for editing an "Other" record', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await clickEditButtonForRow(mockOtherRecordToEdit);

    expect(screen.getByLabelText(/Measurement Type/i)).toHaveValue('Other');
    expect(screen.getByLabelText(/Measurement Name/i)).toHaveValue(mockOtherRecordToEdit.otherMeasurementName);
    expect(screen.getByLabelText(/^Unit$/i)).toHaveValue(mockOtherRecordToEdit.unit); // Text input for "Other" unit
    expect(screen.getByLabelText(/Intervention Type/i)).toHaveValue(mockOtherRecordToEdit.interventionType);
    expect(screen.getByLabelText(/Intervention Details/i)).toHaveValue(mockOtherRecordToEdit.interventionDetails);
  });


  test('successfully updates a record', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await clickEditButtonForRow(mockRecordToEdit);

    const valueInput = screen.getByLabelText(/Value/i);
    await userEvent.clear(valueInput);
    await userEvent.type(valueInput, '62.5'); // Changed value
    const notesInput = screen.getByLabelText(/General Notes \(Optional\)/i);
    await userEvent.clear(notesInput);
    await userEvent.type(notesInput, 'Updated note for test');

    await userEvent.click(screen.getByRole('button', { name: /Update Record/i }));

    expect(mockUpdateGrowthRecordAction).toHaveBeenCalledWith({
      ...mockRecordToEdit, // Original record data
      value: 62.5,         // Updated value
      notes: 'Updated note for test', // Updated notes
    });
    await waitFor(() => expect(screen.getByText('Record updated successfully!')).toBeInTheDocument());
    // Form should hide after successful edit
    expect(screen.queryByRole('heading', { name: /Edit Growth Record/i })).not.toBeInTheDocument();
  });

  test('shows validation error on update if value is invalid', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await clickEditButtonForRow(mockRecordToEdit);

    const valueInput = screen.getByLabelText(/Value/i);
    await userEvent.clear(valueInput); // Make value empty

    await userEvent.click(screen.getByRole('button', { name: /Update Record/i }));

    expect(mockUpdateGrowthRecordAction).not.toHaveBeenCalled();
    expect(screen.getByText('Value is required.')).toBeInTheDocument();
    expect(valueInput).toHaveClass('border-red-500');
  });

  test('cancel edit button resets and hides form', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);
    await clickEditButtonForRow(mockRecordToEdit);

    expect(screen.getByRole('heading', { name: /Edit Growth Record/i })).toBeInTheDocument();
    const cancelButton = screen.getByRole('button', { name: /Cancel Edit/i }); // Button text changes
    await userEvent.click(cancelButton);

    expect(screen.queryByRole('heading', { name: /Edit Growth Record/i })).not.toBeInTheDocument();
    // Check if a field has been reset (e.g. date, though it defaults to today so might not be empty)
    // A better check is if the "Add New Growth Entry" button is back
    expect(screen.getByRole('button', { name: /Add New Growth Entry/i})).toBeInTheDocument();
  });
});

describe('TableViewPage - Delete Growth Record', () => {
  const mockRecordToDelete: GrowthRecord = {
    id: 'rec-to-delete-1', patientId: samplePatient.id, date: '2023-03-15', ageMonths: 3.5,
    measurementType: 'Weight', value: 6, unit: 'kg', notes: 'To be deleted'
  };

  beforeEach(() => {
    mockCurrentPatientState = samplePatient;
    mockPatientRecordsState = [mockRecordToDelete]; // Ensure record exists

    (useAppStore as jest.Mock).mockImplementation((selector) => {
        if (selector.toString().includes('state.addGrowthRecord')) return mockAddGrowthRecordAction;
        if (selector.toString().includes('state.updateGrowthRecord')) return mockUpdateGrowthRecordAction;
        if (selector.toString().includes('state.deleteGrowthRecord')) return mockDeleteGrowthRecordAction;
        if (selector.toString().includes('state.settings')) return mockSettingsState;
        if (selector.toString().includes('state.selectedPatientId')) return mockCurrentPatientState?.id || null;
        if (selector.toString().includes('state.patients')) return mockCurrentPatientState ? [mockCurrentPatientState] : [];
        if (selector.toString().includes('state.growthRecords')) return mockPatientRecordsState;
        if (selector.toString().includes('state.getPatientById')) return (id: string) => mockCurrentPatientState && mockCurrentPatientState.id === id ? mockCurrentPatientState : undefined;
        if (selector.toString().includes('state.getRecordsForPatient')) return (id: string) => mockCurrentPatientState && mockCurrentPatientState.id === id ? mockPatientRecordsState : [];
        return jest.fn();
    });
    global.confirm = jest.fn(() => true); // Default to confirm
  });

  test('calls deleteGrowthRecord action when delete is confirmed', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);

    const deleteButton = screen.getByRole('button', { name: `Delete record from ${mockRecordToDelete.date} for ${mockRecordToDelete.measurementType}` });
    await userEvent.click(deleteButton);

    expect(global.confirm).toHaveBeenCalledWith(
      `Are you sure you want to delete the ${mockRecordToDelete.measurementType} record from ${mockRecordToDelete.date}? This action cannot be undone.`
    );
    expect(mockDeleteGrowthRecordAction).toHaveBeenCalledWith(mockRecordToDelete.id);
  });

  test('does not call deleteGrowthRecord action when delete is cancelled', async () => {
    (global.confirm as jest.Mock).mockReturnValueOnce(false); // Simulate user clicking "Cancel"
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);

    const deleteButton = screen.getByRole('button', { name: `Delete record from ${mockRecordToDelete.date} for ${mockRecordToDelete.measurementType}` });
    await userEvent.click(deleteButton);

    expect(global.confirm).toHaveBeenCalled();
    expect(mockDeleteGrowthRecordAction).not.toHaveBeenCalled();
  });

  test('resets edit form if the deleted record was being edited', async () => {
    render(<MemoryRouter><TableViewPage /></MemoryRouter>);

    // Start editing the record
    const editButton = screen.getByRole('button', { name: `Edit record from ${mockRecordToDelete.date} for ${mockRecordToDelete.measurementType}`});
    await userEvent.click(editButton);
    expect(screen.getByRole('heading', {name: /Edit Growth Record/i})).toBeInTheDocument();

    // Now delete it
    const deleteButton = screen.getByRole('button', { name: `Delete record from ${mockRecordToDelete.date} for ${mockRecordToDelete.measurementType}` });
    await userEvent.click(deleteButton); // Confirms by default

    expect(mockDeleteGrowthRecordAction).toHaveBeenCalledWith(mockRecordToDelete.id);
    // Form should be hidden (or reset to "Add" mode if it stays open)
    expect(screen.queryByRole('heading', {name: /Edit Growth Record/i})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: /Add New Growth Entry/i})).toBeInTheDocument();
  });
});
