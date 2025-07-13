import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PatientSelectionPage from './PatientSelectionPage';
import useAppStore, { Patient, AppStoreState } from '../store/appStore';
import { vi } from 'vitest';

// Mock the store
const mockAddPatient = vi.fn();
const mockUpdatePatient = vi.fn();
const mockSelectPatient = vi.fn();
const mockDeletePatient = vi.fn();

let mockPatientsState: Patient[] = [];
let mockSelectedPatientIdState: string | null = null;

vi.mock('@/store/appStore', async (importOriginal) => {
    const original = await importOriginal() as any;
    return {
        ...original,
        __esModule: true,
        default: vi.fn((selector: (state: AppStoreState) => any) => {
            const stateSlice = selector.toString();
            if (stateSlice.includes('state.patients')) return mockPatientsState;
            if (stateSlice.includes('state.selectedPatientId')) return mockSelectedPatientIdState;
            if (stateSlice.includes('state.addPatient')) return mockAddPatient;
            if (stateSlice.includes('state.updatePatient')) return mockUpdatePatient;
            if (stateSlice.includes('state.selectPatient')) return mockSelectPatient;
            if (stateSlice.includes('state.deletePatient')) return mockDeletePatient;

            // Fallback for any other state access
            const actualStore = original.default.getState();
            return selector(actualStore);
        }),
    };
});

// Mock window.confirm
global.window.confirm = vi.fn(() => true); // Default to true (user confirms deletion)

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();


describe('PatientSelectionPage Component', () => {
    beforeEach(() => {
        mockAddPatient.mockClear();
        mockUpdatePatient.mockClear();
        mockSelectPatient.mockClear();
        mockDeletePatient.mockClear();
        vi.clearAllMocks(); // Clears window.confirm mocks too

        mockPatientsState = [];
        mockSelectedPatientIdState = null;

        // Reset window.confirm to default true for each test, can be overridden
        global.window.confirm = vi.fn(() => true);
        window.HTMLElement.prototype.scrollIntoView = vi.fn();

    });

    test('renders "No patients" message when there are no patients', () => {
        render(<PatientSelectionPage />);
        expect(screen.getByText('No patients')).toBeInTheDocument();
        expect(screen.getByText('Get started by adding a new patient.')).toBeInTheDocument();
    });

    test('renders patient list when patients exist', () => {
        mockPatientsState = [{ id: '1', name: 'John Doe', dob: '2000-01-01', sex: 'Male' }];
        render(<PatientSelectionPage />);
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('DOB: 2000-01-01 | Sex: Male')).toBeInTheDocument();
    });

    // --- Form Tests ---
    describe('Add/Edit Patient Form', () => {
        test('allows adding a new patient', async () => {
            mockAddPatient.mockImplementation((patientData) => ({ ...patientData, id: 'new-id' }));
            render(<PatientSelectionPage />);

            fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Jane Doe' } });
            fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '2001-02-02' } });
            fireEvent.change(screen.getByLabelText('Sex'), { target: { value: 'Female' } });
            fireEvent.change(screen.getByLabelText('Condition (Optional)'), { target: { value: 'Healthy' } });

            fireEvent.click(screen.getByRole('button', { name: 'Add Patient' }));

            await waitFor(() => {
                expect(mockAddPatient).toHaveBeenCalledWith({
                    name: 'Jane Doe', dob: '2001-02-02', sex: 'Female', condition: 'Healthy'
                });
            });
            expect(await screen.findByText('Patient "Jane Doe" added successfully!')).toBeInTheDocument();
        });

        test('shows validation error for missing name', async () => {
            render(<PatientSelectionPage />);
            fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '2001-02-02' } });
            fireEvent.click(screen.getByRole('button', { name: 'Add Patient' }));
            expect(await screen.findByText('Patient name is required.')).toBeInTheDocument();
            expect(mockAddPatient).not.toHaveBeenCalled();
        });

        test('shows validation error for future DOB', async () => {
            render(<PatientSelectionPage />);
            fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Future Kid' } });
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);
            fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: futureDate.toISOString().split('T')[0] } });
            fireEvent.click(screen.getByRole('button', { name: 'Add Patient' }));
            expect(await screen.findByText('Date of Birth cannot be in the future.')).toBeInTheDocument();
            expect(mockAddPatient).not.toHaveBeenCalled();
        });

        test('allows editing an existing patient', async () => {
            mockPatientsState = [{ id: '1', name: 'John Doe', dob: '2000-01-01', sex: 'Male', condition: 'Initial Condition' }];
            render(<PatientSelectionPage />);

            // Click edit button for John Doe
            fireEvent.click(screen.getByLabelText('Edit patient John Doe'));

            await waitFor(() => {
                expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
            });
            expect(screen.getByDisplayValue('Initial Condition')).toBeInTheDocument();

            fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Johnathan Doe Updated' } });
            fireEvent.change(screen.getByLabelText('Condition (Optional)'), { target: { value: 'Updated Condition' } });
            fireEvent.click(screen.getByRole('button', { name: 'Update Patient' }));

            await waitFor(() => {
                expect(mockUpdatePatient).toHaveBeenCalledWith({
                    id: '1', name: 'Johnathan Doe Updated', dob: '2000-01-01', sex: 'Male', condition: 'Updated Condition'
                });
            });
            expect(await screen.findByText('Patient updated successfully!')).toBeInTheDocument();
        });

        test('cancel edit resets the form', async () => {
            mockPatientsState = [{ id: '1', name: 'John Doe', dob: '2000-01-01', sex: 'Male' }];
            render(<PatientSelectionPage />);
            fireEvent.click(screen.getByLabelText('Edit patient John Doe'));

            await waitFor(() => { // Wait for form to populate
                expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByRole('button', { name: 'Cancel Edit'}));

            // Form should be reset, add patient button should be visible
            expect(screen.getByRole('button', { name: 'Add Patient'})).toBeInTheDocument();
            expect(screen.getByLabelText('Full Name')).toHaveValue('');
        });
    });

    // --- Patient List Interaction Tests ---
    describe('Patient List Interactions', () => {
        test('selecting a patient calls selectPatient action', () => {
            mockPatientsState = [{ id: '1', name: 'John Doe', dob: '2000-01-01', sex: 'Male' }];
            render(<PatientSelectionPage />);
            fireEvent.click(screen.getByText('John Doe'));
            expect(mockSelectPatient).toHaveBeenCalledWith('1');
        });

        test('deleting a patient calls deletePatientAction after confirmation', async () => {
            mockPatientsState = [{ id: '1', name: 'John Doe', dob: '2000-01-01', sex: 'Male' }];
            render(<PatientSelectionPage />);

            fireEvent.click(screen.getByLabelText('Delete patient John Doe'));

            expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete patient "John Doe" and all their associated records? This action cannot be undone.');
            expect(mockDeletePatient).toHaveBeenCalledWith('1');
        });

        test('does not delete patient if confirmation is cancelled', () => {
            (window.confirm as vi.Mock).mockImplementationOnce(() => false);
            mockPatientsState = [{ id: '1', name: 'John Doe', dob: '2000-01-01', sex: 'Male' }];
            render(<PatientSelectionPage />);

            fireEvent.click(screen.getByLabelText('Delete patient John Doe'));

            expect(window.confirm).toHaveBeenCalled();
            expect(mockDeletePatient).not.toHaveBeenCalled();
        });
    });

    // --- FHIR Badge Tests ---
    describe('FHIR Badge Display', () => {
        test('displays FHIR badge for FHIR patient', () => {
            mockPatientsState = [{ id: '1', name: 'FHIR User', dob: '2002-03-03', sex: 'Other', isFHIRPatient: true }];
            render(<PatientSelectionPage />);
            const patientNameElement = screen.getByText('FHIR User');
            // The badge is a sibling span to the name text node, within the same h3
            const fhirBadge = patientNameElement.querySelector('.ml-2.text-xs.font-semibold.text-cyan-700');
            // More robust check:
            const h3 = patientNameElement.closest('h3');
            expect(h3).toHaveTextContent('FHIR User');
            expect(h3?.querySelector('span')?.textContent).toBe('FHIR');
        });

        test('does not display FHIR badge for non-FHIR patient', () => {
            mockPatientsState = [{ id: '2', name: 'Manual User', dob: '2003-04-04', sex: 'Unknown', isFHIRPatient: false }];
            render(<PatientSelectionPage />);
            const patientNameElement = screen.getByText('Manual User');
            const h3 = patientNameElement.closest('h3');
            expect(h3).toHaveTextContent('Manual User');
            expect(h3?.querySelector('span.text-cyan-700')).toBeNull();
        });
         test('does not display FHIR badge if isFHIRPatient is undefined', () => {
            mockPatientsState = [{ id: '3', name: 'Legacy User', dob: '1999-01-01', sex: 'Male' }]; // isFHIRPatient is undefined
            render(<PatientSelectionPage />);
            const patientNameElement = screen.getByText('Legacy User');
            const h3 = patientNameElement.closest('h3');
            expect(h3).toHaveTextContent('Legacy User');
            expect(h3?.querySelector('span.text-cyan-700')).toBeNull();
        });
    });
});
