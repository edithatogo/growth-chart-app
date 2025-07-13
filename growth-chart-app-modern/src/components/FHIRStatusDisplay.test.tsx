import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FHIRStatusDisplay from './FHIRStatusDisplay';
import useAppStore, { FHIRStatus, AppStateValues, AppStoreState } from '../store/appStore'; // Import AppStateValues for initial state
import { vi } from 'vitest';

// Mock the store
const mockSetFHIRContext = vi.fn();
let mockFHIRContextState: AppStateValues['fhirContext'];

vi.mock('../store/appStore', async (importOriginal) => {
    const original = await importOriginal() as any; // Import original module
    return {
        ...original, // Spread original exports
        __esModule: true, // This is important for ViT to correctly mock modules
        default: vi.fn((selector: (state: AppStoreState) => any) => { // Mock the default export (useAppStore hook)
            if (selector.toString().includes('state.fhirContext')) {
                return mockFHIRContextState;
            }
            if (selector.toString().includes('state.setFHIRContext')) {
                return mockSetFHIRContext;
            }
            // Fallback for other selectors if any, though not expected for this component
            const actualStore = original.default.getState();
            return selector(actualStore);
        }),
    };
});


describe('FHIRStatusDisplay Component', () => {
  beforeEach(() => {
    // Reset mocks and state before each test
    mockSetFHIRContext.mockClear();
    mockFHIRContextState = { // Default initial state for fhirContext
        client: undefined,
        patientId: undefined,
        serverUrl: undefined,
        status: 'idle',
        error: null,
        isRetrieved: false,
        isAuthorized: false,
    };
  });

  const loadingStates: FHIRStatus[] = ['initializing', 'authorizing', 'fetch_patient', 'fetch_growth_data'];
  loadingStates.forEach(status => {
    test(`renders correctly for status: ${status}`, () => {
      mockFHIRContextState.status = status;
      const { container } = render(<FHIRStatusDisplay />);
      expect(screen.getByText(new RegExp(status.replace('_', ' ') + '...', 'i'))).toBeInTheDocument();
      // Check for spinner (presence of svg with animate-spin)
      expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
    });
  });

  test('renders correctly for status: no_context', () => {
    mockFHIRContextState.status = 'no_context';
    render(<FHIRStatusDisplay />);
    expect(screen.getByText(/Not launched via SMART on FHIR or no patient context found/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss context message')).toBeInTheDocument();
  });

  test('renders correctly for status: error with a message', () => {
    mockFHIRContextState.status = 'error';
    mockFHIRContextState.error = 'Test error message';
    render(<FHIRStatusDisplay />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss error message')).toBeInTheDocument();
  });

  test('renders correctly for status: error with no message (default)', () => {
    mockFHIRContextState.status = 'error';
    mockFHIRContextState.error = null; // or undefined
    render(<FHIRStatusDisplay />);
    expect(screen.getByText(/An unknown FHIR error occurred/i)).toBeInTheDocument();
  });

  test('renders null for status: idle', () => {
    mockFHIRContextState.status = 'idle';
    const { container } = render(<FHIRStatusDisplay />);
    expect(container.firstChild).toBeNull();
  });

  test('renders null for status: ready', () => {
    mockFHIRContextState.status = 'ready';
    const { container } = render(<FHIRStatusDisplay />);
    expect(container.firstChild).toBeNull();
  });

  test('dismiss button for "no_context" calls setFHIRContext correctly', () => {
    mockFHIRContextState.status = 'no_context';
    render(<FHIRStatusDisplay />);
    fireEvent.click(screen.getByLabelText('Dismiss context message'));
    expect(mockSetFHIRContext).toHaveBeenCalledWith({ status: 'idle' });
  });

  test('dismiss button for "error" calls setFHIRContext correctly', () => {
    mockFHIRContextState.status = 'error';
    mockFHIRContextState.error = 'Some error';
    render(<FHIRStatusDisplay />);
    fireEvent.click(screen.getByLabelText('Dismiss error message'));
    expect(mockSetFHIRContext).toHaveBeenCalledWith({ error: null, status: 'idle' });
  });
});
