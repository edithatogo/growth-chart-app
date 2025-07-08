import { create, StoreApi } from 'zustand';
import { storeCreator, AppStoreState, Patient, GrowthRecord, AppSettings, NewGrowthRecordData } from '../appStore';

// Type for the test store instance
type TestStore = StoreApi<AppStoreState>;

describe('Zustand App Store (Actions Logic)', () => {
  let testStore: TestStore;

  beforeEach(() => {
    // Create a fresh store instance for each test using the exported creator.
    // The storeCreator already initializes with initialAppState and defines actions.
    testStore = create<AppStoreState>(storeCreator);
  });

  it('should add a new patient', () => {
    const initialPatientCount = testStore.getState().patients.length;
    expect(initialPatientCount).toBe(0); // From initialAppState via storeCreator

    const patientData: Omit<Patient, 'id'> = { name: 'Test Patient', dob: '2023-01-01', sex: 'Male' };
    const newPatient = testStore.getState().addPatient(patientData);

    expect(newPatient.id).toBeDefined();
    expect(newPatient.name).toBe('Test Patient');
    expect(testStore.getState().patients.length).toBe(1); // Should be 1 now
    expect(testStore.getState().patients).toContainEqual(newPatient);
  });

  it('should select a patient', () => {
    const patient = testStore.getState().addPatient({ name: 'Selectable Patient', dob: '2023-02-01', sex: 'Female' });

    expect(testStore.getState().selectedPatientId).toBeNull();
    testStore.getState().selectPatient(patient.id);
    expect(testStore.getState().selectedPatientId).toBe(patient.id);
    testStore.getState().selectPatient(null);
    expect(testStore.getState().selectedPatientId).toBeNull();
  });

  it('should add a growth record for a patient', () => {
    const patient = testStore.getState().addPatient({ name: 'Patient With Records', dob: '2023-03-01', sex: 'Other' });
    const recordData: NewGrowthRecordData = {
      patientId: patient.id,
      date: '2023-03-15',
      ageMonths: 0.5,
      measurementType: 'Weight',
      value: 3.5,
      unit: 'kg',
    };
    const newRecord = testStore.getState().addGrowthRecord(recordData);

    expect(newRecord.id).toBeDefined();
    expect(newRecord.patientId).toBe(patient.id);
    expect(testStore.getState().growthRecords.length).toBe(1);
    expect(testStore.getState().growthRecords).toContainEqual(newRecord);
  });

  it('should throw error if adding growth record without patientId', () => {
    // @ts-expect-error testing invalid input for patientId
    const recordDataNoPatientId: Omit<GrowthRecord, 'id' | 'patientId'> & {patientId?: string} = {
      date: '2023-03-15', ageMonths: 0.5, measurementType: 'Weight', value: 3.5, unit: 'kg',
    };
    expect(() => testStore.getState().addGrowthRecord(recordDataNoPatientId as any)).toThrow("patientId is required to add a growth record.");
  });


  it('should update settings', () => {
    const initialSettings = testStore.getState().settings;
    const newSettingsPartial: Partial<AppSettings> = { darkMode: true, language: 'Spanish' };

    testStore.getState().updateSettings(newSettingsPartial);

    const updatedSettings = testStore.getState().settings;
    expect(updatedSettings.darkMode).toBe(true);
    expect(updatedSettings.language).toBe('Spanish');
    expect(updatedSettings.units).toBe(initialSettings.units);
  });

  it('should get patient by ID', () => {
    const patient1 = testStore.getState().addPatient({ name: 'Patient One', dob: '2023-01-01', sex: 'Male' });
    const patient2 = testStore.getState().addPatient({ name: 'Patient Two', dob: '2023-02-01', sex: 'Female' });

    expect(testStore.getState().getPatientById(patient1.id)).toEqual(patient1);
    expect(testStore.getState().getPatientById(patient2.id)).toEqual(patient2);
    expect(testStore.getState().getPatientById('non-existent-id')).toBeUndefined();
  });

  it('should get records for a patient', () => {
    const patient1 = testStore.getState().addPatient({ name: 'Patient Alpha', dob: '2023-01-01', sex: 'Male' });
    const patient2 = testStore.getState().addPatient({ name: 'Patient Beta', dob: '2023-02-01', sex: 'Female' });

    testStore.getState().addGrowthRecord({ patientId: patient1.id, date: '2023-01-15', ageMonths: 0.5, measurementType: 'Weight', value: 3.0, unit: 'kg' });
    testStore.getState().addGrowthRecord({ patientId: patient1.id, date: '2023-02-15', ageMonths: 1.5, measurementType: 'Height', value: 55, unit: 'cm' });
    testStore.getState().addGrowthRecord({ patientId: patient2.id, date: '2023-02-20', ageMonths: 0.2, measurementType: 'Weight', value: 3.2, unit: 'kg' });

    const recordsP1 = testStore.getState().getRecordsForPatient(patient1.id);
    expect(recordsP1.length).toBe(2);
    expect(recordsP1.every(r => r.patientId === patient1.id)).toBe(true);

    const recordsP2 = testStore.getState().getRecordsForPatient(patient2.id);
    expect(recordsP2.length).toBe(1);
    expect(recordsP2[0].patientId).toBe(patient2.id);

    expect(testStore.getState().getRecordsForPatient('non-existent-id')).toEqual([]);
  });
});
