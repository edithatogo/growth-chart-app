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

  it('should add a patient with a condition', () => {
    const patientData = { name: 'Patient With Condition', dob: '2023-04-01', sex: 'Unknown', condition: 'Test Condition' };
    const newPatient = testStore.getState().addPatient(patientData);
    expect(newPatient.condition).toBe('Test Condition');
    const fetchedPatient = testStore.getState().getPatientById(newPatient.id);
    expect(fetchedPatient?.condition).toBe('Test Condition');
  });

  it('should add a growth record with intervention details', () => {
    const patient = testStore.getState().addPatient({ name: 'Intervention Patient', dob: '2023-05-01', sex: 'Male' });
    const recordData: NewGrowthRecordData = {
      patientId: patient.id, date: '2023-05-15', ageMonths: 0.5,
      measurementType: 'Weight', value: 3.5, unit: 'kg',
      interventionType: 'Dietary Change', interventionDetails: 'Started new formula'
    };
    const newRecord = testStore.getState().addGrowthRecord(recordData);
    expect(newRecord.interventionType).toBe('Dietary Change');
    expect(newRecord.interventionDetails).toBe('Started new formula');
    const fetchedRecord = testStore.getState().growthRecords.find(r => r.id === newRecord.id);
    expect(fetchedRecord?.interventionType).toBe('Dietary Change');
  });

  it('should add a growth record with "Other" measurement type and not trigger BMI', () => {
    const patient = testStore.getState().addPatient({ name: 'Other Measurement Patient', dob: '2023-06-01', sex: 'Female' });
    const recordData: NewGrowthRecordData = {
      patientId: patient.id, date: '2023-06-15', ageMonths: 0.5,
      measurementType: 'Other', otherMeasurementName: 'Arm Span', value: 30, unit: 'cm'
    };
    testStore.getState().addGrowthRecord(recordData);

    // Add a weight record to see if BMI is (not) triggered
    testStore.getState().addGrowthRecord({
        patientId: patient.id, date: '2023-06-15', ageMonths: 0.5,
        measurementType: 'Weight', value: 3.0, unit: 'kg'
    });

    const records = testStore.getState().getRecordsForPatient(patient.id);
    const otherRecord = records.find(r => r.measurementType === 'Other');
    expect(otherRecord).toBeDefined();
    expect(otherRecord?.otherMeasurementName).toBe('Arm Span');

    const bmiRecord = records.find(r => r.measurementType === 'BMI');
    expect(bmiRecord).toBeUndefined(); // BMI should not be auto-calculated with 'Other' type present
  });

  // Tests for Update and Delete actions
  it('should update an existing patient', () => {
    const patient = testStore.getState().addPatient({ name: 'Original Name', dob: '2022-01-01', sex: 'Male', condition: 'Initial Condition' });
    const updatedData: Patient = { ...patient, name: 'Updated Name', condition: 'Updated Condition' };

    testStore.getState().updatePatient(updatedData);

    const fetchedPatient = testStore.getState().getPatientById(patient.id);
    expect(fetchedPatient?.name).toBe('Updated Name');
    expect(fetchedPatient?.condition).toBe('Updated Condition');
    expect(fetchedPatient?.dob).toBe('2022-01-01'); // Unchanged field
  });

  it('should delete a patient and their associated records', () => {
    const patient = testStore.getState().addPatient({ name: 'To Be Deleted', dob: '2022-01-01', sex: 'Female' });
    testStore.getState().addGrowthRecord({ patientId: patient.id, date: '2022-02-01', ageMonths: 1, measurementType: 'Weight', value: 5, unit: 'kg' });
    testStore.getState().addGrowthRecord({ patientId: 'other-patient', date: '2022-02-01', ageMonths: 1, measurementType: 'Weight', value: 6, unit: 'kg' });

    testStore.getState().selectPatient(patient.id); // Select the patient to test selection clearing
    expect(testStore.getState().selectedPatientId).toBe(patient.id);

    testStore.getState().deletePatient(patient.id);

    expect(testStore.getState().getPatientById(patient.id)).toBeUndefined();
    expect(testStore.getState().getRecordsForPatient(patient.id).length).toBe(0);
    expect(testStore.getState().growthRecords.length).toBe(1); // Only other patient's record should remain
    expect(testStore.getState().selectedPatientId).toBeNull(); // Selection should be cleared
  });

  it('should update an existing growth record', () => {
    const patient = testStore.getState().addPatient({ name: 'Patient For Record Update', dob: '2022-01-01', sex: 'Male' });
    const record = testStore.getState().addGrowthRecord({
        patientId: patient.id, date: '2022-02-01', ageMonths: 1,
        measurementType: 'Weight', value: 5, unit: 'kg', notes: 'Initial note'
    });

    const updatedRecordData: GrowthRecord = { ...record, value: 5.2, notes: 'Updated note' };
    testStore.getState().updateGrowthRecord(updatedRecordData);

    const fetchedRecord = testStore.getState().growthRecords.find(r => r.id === record.id);
    expect(fetchedRecord?.value).toBe(5.2);
    expect(fetchedRecord?.notes).toBe('Updated note');
    expect(fetchedRecord?.unit).toBe('kg'); // Unchanged field
  });

  it('should delete a growth record and its associated BMI record', () => {
    const patient = testStore.getState().addPatient({ name: 'Patient For BMI Deletion Test', dob: '2022-01-01', sex: 'Male' });
    // Add H & W to trigger BMI
    testStore.getState().addGrowthRecord({ patientId: patient.id, date: '2022-02-01', ageMonths: 1, measurementType: 'Weight', value: 5, unit: 'kg' });
    const heightRecord = testStore.getState().addGrowthRecord({ patientId: patient.id, date: '2022-02-01', ageMonths: 1, measurementType: 'Height', value: 55, unit: 'cm' });

    let records = testStore.getState().getRecordsForPatient(patient.id);
    expect(records.find(r => r.measurementType === 'BMI' && r.ageMonths === 1)).toBeDefined();

    // Delete the height record
    testStore.getState().deleteGrowthRecord(heightRecord.id);

    records = testStore.getState().getRecordsForPatient(patient.id);
    expect(records.find(r => r.id === heightRecord.id)).toBeUndefined(); // Height record gone
    expect(records.find(r => r.measurementType === 'BMI' && r.ageMonths === 1)).toBeUndefined(); // BMI record also gone
    expect(records.find(r => r.measurementType === 'Weight' && r.ageMonths === 1)).toBeDefined(); // Weight record should still be there
  });

  it('should delete a non-H/W/L growth record without affecting other BMI records', () => {
    const patient = testStore.getState().addPatient({ name: 'Patient For HC Deletion Test', dob: '2022-01-01', sex: 'Male' });
    // Add H & W to trigger BMI
    testStore.getState().addGrowthRecord({ patientId: patient.id, date: '2022-02-01', ageMonths: 1, measurementType: 'Weight', value: 5, unit: 'kg' });
    testStore.getState().addGrowthRecord({ patientId: patient.id, date: '2022-02-01', ageMonths: 1, measurementType: 'Height', value: 55, unit: 'cm' });
    const hcRecord = testStore.getState().addGrowthRecord({ patientId: patient.id, date: '2022-02-01', ageMonths: 1, measurementType: 'HeadCircumference', value: 35, unit: 'cm' });

    let records = testStore.getState().getRecordsForPatient(patient.id);
    const initialBmiRecord = records.find(r => r.measurementType === 'BMI' && r.ageMonths === 1);
    expect(initialBmiRecord).toBeDefined();

    // Delete the HC record
    testStore.getState().deleteGrowthRecord(hcRecord.id);

    records = testStore.getState().getRecordsForPatient(patient.id);
    expect(records.find(r => r.id === hcRecord.id)).toBeUndefined(); // HC record gone
    // BMI record should still be there as HC deletion doesn't affect it
    expect(records.find(r => r.id === initialBmiRecord?.id)).toEqual(initialBmiRecord);
  });


  describe('Automatic BMI Record Generation', () => {
    let patientId: string;

    beforeEach(() => {
      // Create a patient for these tests
      const patient = testStore.getState().addPatient({ name: 'BMI Test Patient', dob: '2022-01-01', sex: 'Female' });
      patientId = patient.id;
    });

    it('should not create BMI record if only weight is present', () => {
      testStore.getState().addGrowthRecord({ patientId, date: '2023-01-01', ageMonths: 12, measurementType: 'Weight', value: 10, unit: 'kg' });
      const records = testStore.getState().getRecordsForPatient(patientId);
      const bmiRecord = records.find(r => r.measurementType === 'BMI');
      expect(bmiRecord).toBeUndefined();
    });

    it('should not create BMI record if only height is present', () => {
      testStore.getState().addGrowthRecord({ patientId, date: '2023-01-01', ageMonths: 12, measurementType: 'Height', value: 75, unit: 'cm' });
      const records = testStore.getState().getRecordsForPatient(patientId);
      const bmiRecord = records.find(r => r.measurementType === 'BMI');
      expect(bmiRecord).toBeUndefined();
    });

    it('should create a BMI record when both weight and height (or length) are added for the same age', () => {
      // Add Weight first
      testStore.getState().addGrowthRecord({ patientId, date: '2023-01-01', ageMonths: 12, measurementType: 'Weight', value: 10, unit: 'kg' });
      // Add Height for same age
      testStore.getState().addGrowthRecord({ patientId, date: '2023-01-01', ageMonths: 12, measurementType: 'Height', value: 75, unit: 'cm' });

      const records = testStore.getState().getRecordsForPatient(patientId);
      const bmiRecord = records.find(r => r.measurementType === 'BMI' && r.ageMonths === 12);
      expect(bmiRecord).toBeDefined();
      expect(bmiRecord?.value).toBe(17.8); // 10 / (0.75*0.75) = 17.77... -> 17.8
      expect(bmiRecord?.unit).toBe('kg/m²');
      expect(bmiRecord?.date).toBe('2023-01-01'); // Should use date of the triggering record
    });

    it('should create a BMI record if Height/Length is added first, then Weight', () => {
      testStore.getState().addGrowthRecord({ patientId, date: '2023-02-01', ageMonths: 13, measurementType: 'Length', value: 78, unit: 'cm' });
      testStore.getState().addGrowthRecord({ patientId, date: '2023-02-01', ageMonths: 13, measurementType: 'Weight', value: 10.5, unit: 'kg' });

      const records = testStore.getState().getRecordsForPatient(patientId);
      const bmiRecord = records.find(r => r.measurementType === 'BMI' && r.ageMonths === 13);
      expect(bmiRecord).toBeDefined();
      // BMI = 10.5 / (0.78*0.78) = 10.5 / 0.6084 = 17.258... -> 17.3
      expect(bmiRecord?.value).toBe(17.3);
    });

    it('should update an existing BMI record if a corresponding weight or height is updated (by adding a new one at same age)', () => {
      // Initial H, W, and auto-BMI
      testStore.getState().addGrowthRecord({ patientId, date: '2023-03-01', ageMonths: 14, measurementType: 'Weight', value: 11, unit: 'kg' });
      testStore.getState().addGrowthRecord({ patientId, date: '2023-03-01', ageMonths: 14, measurementType: 'Height', value: 80, unit: 'cm' }); // BMI = 11 / (0.8*0.8) = 17.1875 -> 17.2

      let records = testStore.getState().getRecordsForPatient(patientId);
      let bmiRecord = records.find(r => r.measurementType === 'BMI' && r.ageMonths === 14);
      expect(bmiRecord).toBeDefined();
      expect(bmiRecord?.value).toBe(17.2);

      // Add a new weight record for the same age (simulating an update)
      testStore.getState().addGrowthRecord({ patientId, date: '2023-03-05', ageMonths: 14, measurementType: 'Weight', value: 11.5, unit: 'kg' }); // New date, but same ageMonths

      records = testStore.getState().getRecordsForPatient(patientId);
      bmiRecord = records.find(r => r.measurementType === 'BMI' && r.ageMonths === 14);
      expect(bmiRecord).toBeDefined();
      // New BMI = 11.5 / (0.8*0.8) = 11.5 / 0.64 = 17.96875 -> 18.0
      expect(bmiRecord?.value).toBe(18.0);
      expect(bmiRecord?.date).toBe('2023-03-05'); // Date should update to the latest triggering record's date

      // Ensure only one BMI record for that age
      const bmiRecordsForAge = records.filter(r => r.measurementType === 'BMI' && r.ageMonths === 14);
      expect(bmiRecordsForAge.length).toBe(1);
    });

    it('should not create BMI if counterpart record has different ageMonths', () => {
      testStore.getState().addGrowthRecord({ patientId, date: '2023-01-01', ageMonths: 12, measurementType: 'Weight', value: 10, unit: 'kg' });
      testStore.getState().addGrowthRecord({ patientId, date: '2023-02-01', ageMonths: 13, measurementType: 'Height', value: 78, unit: 'cm' });
      const records = testStore.getState().getRecordsForPatient(patientId);
      const bmiRecord = records.find(r => r.measurementType === 'BMI');
      expect(bmiRecord).toBeUndefined();
    });
  });
});
