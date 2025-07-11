import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { calculateBMI, calculateAgeInMonths } from '../utils/calculations'; // Import age calculator
import { convertToMetricForCalc } from '../utils/units';
import FHIR from 'fhirclient';
import { Client, fhirclient } from 'fhirclient/lib/client';

// --- Interfaces ---
export interface Patient {
  id: string; name: string; dob: string;
  sex: 'Male' | 'Female' | 'Other' | 'Unknown';
  condition?: string;
}
export type NewGrowthRecordData = Omit<GrowthRecord, 'id'>;
export interface GrowthRecord {
  id: string; patientId: string; date: string; ageMonths: number;
  measurementType: 'Weight' | 'Height' | 'Length' | 'HeadCircumference' | 'BMI' | 'Other';
  otherMeasurementName?: string;
  value: number; unit: 'kg' | 'lbs' | 'cm' | 'in' | 'kg/m²' | string;
  notes?: string; interventionType?: string; interventionDetails?: string;
}
export interface AppSettings {
  defaultChartType: 'WeightForAge' | 'HeightForAge' | 'HCForAge' | 'BMIForAge';
  units: 'Metric' | 'Imperial';
  darkMode: boolean; language: 'English' | 'Spanish';
  notifications: { appointmentReminders: boolean; newDataAlerts: boolean; };
}
export interface FHIRContext {
  client?: Client;
  patientId?: string;
  serverUrl?: string;
  error?: string | null;
  isRetrieved?: boolean;
  isAuthorized?: boolean;
}
export interface AppStateValues {
  patients: Patient[]; growthRecords: GrowthRecord[]; settings: AppSettings;
  selectedPatientId: string | null; fhirContext: FHIRContext;
}
export interface AppStateActions {
  addPatient: (patientData: Omit<Patient, 'id'>) => Patient;
  selectPatient: (patientId: string | null) => void;
  addGrowthRecord: (recordData: NewGrowthRecordData) => GrowthRecord;
  _addOrUpdateBMIRecordInternal: (patientId: string, ageMonths: number, date: string, bmiValue: number) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  getPatientById: (patientId: string) => Patient | undefined;
  getRecordsForPatient: (patientId: string) => GrowthRecord[];
  updatePatient: (updatedPatient: Patient) => void;
  deletePatient: (patientId: string) => void;
  updateGrowthRecord: (updatedRecord: GrowthRecord) => void;
  deleteGrowthRecord: (recordId: string) => void;
  initializeFHIRClient: () => Promise<Client | null>;
  setFHIRContext: (context: Partial<FHIRContext>) => void;
  clearFHIRContext: () => void;
  fetchFHIRPatientData: () => Promise<void>;
  fetchFHIRGrowthData: () => Promise<void>;
}
export type AppStoreState = AppStateValues & AppStateActions;

// --- Initial State ---
export const initialAppState: AppStateValues = {
  patients: [], growthRecords: [],
  settings: {
    defaultChartType: 'WeightForAge', units: 'Metric', darkMode: false, language: 'English',
    notifications: { appointmentReminders: true, newDataAlerts: false },
  },
  selectedPatientId: null,
  fhirContext: { client: undefined, patientId: undefined, serverUrl: undefined, error: null, isRetrieved: false, isAuthorized: false }
};

// --- Store Creator ---
export const storeCreator: StateCreator<AppStoreState> = (set, get) => ({
  ...initialAppState,

  addPatient: (patientData) => {
    const newPatient = { ...patientData, id: uuidv4() };
    set((state) => ({ patients: [...state.patients, newPatient] }));
    return newPatient;
  },
  selectPatient: (patientId) => set({ selectedPatientId: patientId }),
  _addOrUpdateBMIRecordInternal: (patientId, ageMonths, date, bmiValue) => {
    set((state) => {
      const existingBMIRecordIndex = state.growthRecords.findIndex(
        (r) => r.patientId === patientId && r.ageMonths === ageMonths && r.measurementType === 'BMI'
      );
      let newGrowthRecords = [...state.growthRecords];
      if (existingBMIRecordIndex > -1) {
        const updatedRecord = {
          ...newGrowthRecords[existingBMIRecordIndex],
          value: bmiValue, date: date, unit: 'kg/m²' as 'kg/m²',
        };
        newGrowthRecords[existingBMIRecordIndex] = updatedRecord;
      } else {
        const bmiRecord: GrowthRecord = {
          id: uuidv4(), patientId, ageMonths, date,
          measurementType: 'BMI', value: bmiValue, unit: 'kg/m²',
        };
        newGrowthRecords.push(bmiRecord);
      }
      return { growthRecords: newGrowthRecords };
    });
  },
  addGrowthRecord: (recordData) => {
    if (!recordData.patientId) {
        console.error("Attempted to add growth record without patientId", recordData);
        throw new Error("patientId is required to add a growth record.");
    }
    const newRecord = { ...recordData, id: uuidv4() };
    set((state) => ({ growthRecords: [...state.growthRecords, newRecord] }));

    if (newRecord.measurementType === 'Weight' || newRecord.measurementType === 'Height' || newRecord.measurementType === 'Length') {
      const { growthRecords, _addOrUpdateBMIRecordInternal } = get();
      const patientId = newRecord.patientId;
      const ageMonths = newRecord.ageMonths;
      let recordDate = newRecord.date;
      let weightRecordForBMI: GrowthRecord | undefined;
      let heightRecordForBMI: GrowthRecord | undefined;

      if (newRecord.measurementType === 'Weight') {
        weightRecordForBMI = newRecord;
        heightRecordForBMI = growthRecords.find( (r) => r.patientId === patientId && r.ageMonths === ageMonths && (r.measurementType === 'Height' || r.measurementType === 'Length') && r.id !== newRecord.id );
        if (!heightRecordForBMI) heightRecordForBMI = growthRecords.find( (r) => r.patientId === patientId && r.ageMonths === ageMonths && (r.measurementType === 'Height' || r.measurementType === 'Length'));
      } else {
        heightRecordForBMI = newRecord;
        weightRecordForBMI = growthRecords.find( (r) => r.patientId === patientId && r.ageMonths === ageMonths && r.measurementType === 'Weight' && r.id !== newRecord.id );
        if (!weightRecordForBMI) weightRecordForBMI = growthRecords.find( (r) => r.patientId === patientId && r.ageMonths === ageMonths && r.measurementType === 'Weight');
      }

      if (weightRecordForBMI && heightRecordForBMI) {
          if (new Date(weightRecordForBMI.date) > new Date(heightRecordForBMI.date)) recordDate = weightRecordForBMI.date; else recordDate = heightRecordForBMI.date;
          if(newRecord.id === weightRecordForBMI.id || newRecord.id === heightRecordForBMI.id) recordDate = newRecord.date;

        const weightInKg = convertToMetricForCalc(weightRecordForBMI.value, weightRecordForBMI.unit as GrowthRecord['unit']);
        const heightInCm = convertToMetricForCalc(heightRecordForBMI.value, heightRecordForBMI.unit as GrowthRecord['unit']);
        if (!isNaN(weightInKg) && !isNaN(heightInCm) && heightInCm > 0) {
            const bmi = calculateBMI(weightInKg, heightInCm);
            if (!isNaN(bmi)) _addOrUpdateBMIRecordInternal(patientId, ageMonths, recordDate, bmi);
        }
      }
    }
    return newRecord;
  },
  updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  getPatientById: (patientId) => get().patients.find(p => p.id === patientId),
  getRecordsForPatient: (patientId) => get().growthRecords.filter(r => r.patientId === patientId),
  updatePatient: (updatedPatient) => set((state) => ({ patients: state.patients.map((p) => p.id === updatedPatient.id ? { ...p, ...updatedPatient } : p) })),
  deletePatient: (patientId) => set((state) => {
      const remainingGrowthRecords = state.growthRecords.filter( (r) => r.patientId !== patientId );
      const newSelectedPatientId = state.selectedPatientId === patientId ? null : state.selectedPatientId;
      return {
        patients: state.patients.filter((p) => p.id !== patientId),
        growthRecords: remainingGrowthRecords,
        selectedPatientId: newSelectedPatientId,
      };
  }),
  updateGrowthRecord: (updatedRecord) => set((state) => ({ growthRecords: state.growthRecords.map((r) => r.id === updatedRecord.id ? { ...r, ...updatedRecord } : r) })),
  deleteGrowthRecord: (recordId) => set((state) => {
      const recordToDelete = state.growthRecords.find(r => r.id === recordId);
      let newGrowthRecords = state.growthRecords.filter((r) => r.id !== recordId);
      if (recordToDelete && (recordToDelete.measurementType === 'Height' || recordToDelete.measurementType === 'Length' || recordToDelete.measurementType === 'Weight')) {
          newGrowthRecords = newGrowthRecords.filter(r =>
              !(r.patientId === recordToDelete.patientId && r.ageMonths === recordToDelete.ageMonths && r.measurementType === 'BMI')
          );
      }
      return { growthRecords: newGrowthRecords };
  }),

  setFHIRContext: (context) =>
    set((state) => ({ fhirContext: { ...state.fhirContext, ...context } })),

  clearFHIRContext: () =>
    set({ fhirContext: { ...initialAppState.fhirContext, isRetrieved: true, isAuthorized: false } }),

  initializeFHIRClient: async () => {
    const currentFhirContext = get().fhirContext;
    if (currentFhirContext.client || currentFhirContext.isRetrieved) {
        get().setFHIRContext({ isRetrieved: true });
        return currentFhirContext.client || null;
    }
    let clientInstance: Client | null = null;
    try {
        const storedContextString = sessionStorage.getItem('fhirContext');
        if (storedContextString) {
            const storedContext = JSON.parse(storedContextString);
            if (storedContext.serverUrl && storedContext.tokenResponse) {
                clientInstance = FHIR.client({ serverUrl: storedContext.serverUrl, tokenResponse: storedContext.tokenResponse });
                if (storedContext.patientId) clientInstance.patient.id = storedContext.patientId;
                get().setFHIRContext({
                    client: clientInstance, patientId: clientInstance.patient.id,
                    serverUrl: clientInstance.serverUrl, error: null, isRetrieved: true, isAuthorized: true,
                });
            } else { throw new Error("Stored FHIR context is incomplete."); }
        } else {
             get().setFHIRContext({ isRetrieved: true, error: null, isAuthorized: false });
        }
    } catch (error: any) {
        console.error("Error initializing FHIR client from session storage:", error);
        get().setFHIRContext({ error: error.message || "Failed to initialize FHIR client.", isRetrieved: true, isAuthorized: false });
    }
    return clientInstance;
  },

  fetchFHIRPatientData: async () => {
    const { client } = get().fhirContext;
    const currentFhirPatientId = get().fhirContext.patientId;
    if (!client || !client.patient?.id || !currentFhirPatientId) {
      const errorMsg = "FHIR client not ready or patient ID missing for fetching patient data.";
      console.warn(errorMsg); get().setFHIRContext({ error: errorMsg }); return;
    }
    try {
      const fhirPatient: fhirclient.FHIR.Patient = await client.patient.read();
      console.log("Fetched FHIR Patient:", fhirPatient);
      let name = "Unknown FHIR Patient";
      if (fhirPatient.name && fhirPatient.name.length > 0) {
          const primaryName = fhirPatient.name.find(n => n.use === 'official') || fhirPatient.name[0];
          name = `${primaryName.given?.join(" ") || ""} ${primaryName.family || ""}`.trim();
      }
      const appPatient: Patient = {
        id: `FHIR-${fhirPatient.id}`, name: name, dob: fhirPatient.birthDate || "Unknown",
        sex: (fhirPatient.gender === "male" ? "Male" : fhirPatient.gender === "female" ? "Female" : fhirPatient.gender === "other" ? "Other" : "Unknown"),
      };
      let existingPatient = get().patients.find(p => p.id === appPatient.id);
      if (existingPatient) {
        get().updatePatient(appPatient);
      } else {
        existingPatient = get().addPatient(appPatient);
      }
      get().selectPatient(existingPatient.id);
      get().setFHIRContext({ error: null });

      // Now that patient is processed, fetch their growth data
      await get().fetchFHIRGrowthData();

    } catch (error: any) {
      console.error("Error fetching FHIR Patient data:", error);
      get().setFHIRContext({ error: error.message || "Failed to fetch FHIR patient data." });
    }
  },

  fetchFHIRGrowthData: async () => {
    const { client, patientId: fhirPatientId } = get().fhirContext;
    const fhirAppPatient = get().patients.find(p => p.id === `FHIR-${fhirPatientId}`);

    if (!client || !fhirPatientId || !fhirAppPatient || !fhirAppPatient.dob || fhirAppPatient.dob === "Unknown") {
      const errorMsg = "FHIR client/patient ID not ready, or patient DOB unknown for fetching/processing growth data.";
      console.warn(errorMsg);
      get().setFHIRContext({ error: errorMsg });
      return;
    }

    const loincToMeasurementType: Record<string, GrowthRecord['measurementType']> = {
      '29463-7': 'Weight', '8302-2': 'Height', '8306-3': 'Length',
      '8287-5': 'HeadCircumference', '39156-5': 'BMI',
    };
    const growthLoincCodes = Object.keys(loincToMeasurementType).join(',');

    try {
      const bundle = await client.request(`Observation?patient=${fhirPatientId}&code=${growthLoincCodes}&_sort=date&_count=100`);
      let fetchedGrowthRecords: GrowthRecord[] = [];
      if (bundle && bundle.entry && Array.isArray(bundle.entry)) {
        const observations = bundle.entry.map((entry: any) => entry.resource as fhirclient.FHIR.Observation);
        observations.forEach(obs => {
          if (obs.valueQuantity && obs.effectiveDateTime) {
            const loincCode = obs.code?.coding?.[0]?.code;
            const measurementType = loincCode ? loincToMeasurementType[loincCode] : undefined;
            if (measurementType) {
              let unit = obs.valueQuantity.unit || obs.valueQuantity.code || '';
              if (unit === 'kg' || unit.toLowerCase() === 'kilograms') unit = 'kg';
              else if (unit === '[lb_av]' || unit.toLowerCase() === 'pounds') unit = 'lbs';
              else if (unit === 'cm' || unit.toLowerCase() === 'centimeters') unit = 'cm';
              else if (unit === '[in_i]' || unit.toLowerCase() === 'inches') unit = 'in';
              else if (unit === 'kg/m2') unit = 'kg/m²';
              const ageMonths = calculateAgeInMonths(fhirAppPatient.dob, obs.effectiveDateTime);
              if (!isNaN(obs.valueQuantity.value!) && !isNaN(ageMonths)) {
                fetchedGrowthRecords.push({
                  id: `FHIR-${obs.id}`, patientId: fhirAppPatient.id,
                  date: obs.effectiveDateTime.split('T')[0], ageMonths: ageMonths,
                  measurementType: measurementType, value: obs.valueQuantity.value!,
                  unit: unit as GrowthRecord['unit'],
                });
              }
            }
          }
        });
      }
      set((state) => {
        const otherPatientRecords = state.growthRecords.filter(r => r.patientId !== fhirAppPatient.id);
        const newTotalRecords = [...otherPatientRecords, ...fetchedGrowthRecords];
        const patientRecordsPostFetch = newTotalRecords.filter(r => r.patientId === fhirAppPatient.id);
        const uniqueAgeMonths = [...new Set(patientRecordsPostFetch.filter(r => r.measurementType === 'Weight' || r.measurementType === 'Height' || r.measurementType === 'Length').map(r => r.ageMonths))];
        let recordsIncludingNewBMIs = [...newTotalRecords];
        uniqueAgeMonths.forEach(age => {
            const weightRecord = patientRecordsPostFetch.find(r => r.ageMonths === age && r.measurementType === 'Weight');
            const heightRecord = patientRecordsPostFetch.find(r => r.ageMonths === age && (r.measurementType === 'Height' || r.measurementType === 'Length'));
            if (weightRecord && heightRecord) {
                const weightInKg = convertToMetricForCalc(weightRecord.value, weightRecord.unit as GrowthRecord['unit']);
                const heightInCm = convertToMetricForCalc(heightRecord.value, heightRecord.unit as GrowthRecord['unit']);
                const recordDate = new Date(weightRecord.date) > new Date(heightRecord.date) ? weightRecord.date : heightRecord.date;
                if (!isNaN(weightInKg) && !isNaN(heightInCm) && heightInCm > 0) {
                    const bmi = calculateBMI(weightInKg, heightInCm);
                    if (!isNaN(bmi)) {
                        const existingBMIRecordIndex = recordsIncludingNewBMIs.findIndex((r) => r.patientId === fhirAppPatient.id && r.ageMonths === age && r.measurementType === 'BMI');
                        if (existingBMIRecordIndex > -1) {
                            recordsIncludingNewBMIs[existingBMIRecordIndex] = { ...recordsIncludingNewBMIs[existingBMIRecordIndex], value: bmi, date: recordDate,};
                        } else {
                            recordsIncludingNewBMIs.push({
                                id: uuidv4(), patientId: fhirAppPatient.id, ageMonths: age, date: recordDate,
                                measurementType: 'BMI', value: bmi, unit: 'kg/m²',
                            });
                        }}}}});
        return { growthRecords: recordsIncludingNewBMIs, fhirContext: { ...get().fhirContext, error: null } };
      });
    } catch (error: any) {
      console.error("Error fetching/mapping FHIR growth data:", error);
      get().setFHIRContext({ error: error.message || "Failed to fetch/map FHIR growth data." });
    }
  }
});

// --- Main Store Hook ---
export const useAppStore = create<AppStoreState>()(
  persist(
    storeCreator,
    {
      name: 'growth-chart-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ...state,
        fhirContext: {
            patientId: state.fhirContext.patientId,
            serverUrl: state.fhirContext.serverUrl,
            error: state.fhirContext.error,
            isRetrieved: state.fhirContext.isRetrieved,
            isAuthorized: state.fhirContext.isAuthorized,
        }
      })
    }
  )
);

// --- Helper Hooks ---
export const useCurrentPatient = (): Patient | null => {
  const selectedPatientId = useAppStore((state) => state.selectedPatientId);
  const getPatientById = useAppStore((state) => state.getPatientById);
  if (!selectedPatientId) return null;
  return getPatientById(selectedPatientId) || null;
};
export const useCurrentPatientRecords = (): GrowthRecord[] => {
  const selectedPatientId = useAppStore((state) => state.selectedPatientId);
  const getRecordsForPatient = useAppStore((state) => state.getRecordsForPatient);
  if (!selectedPatientId) return [];
  return getRecordsForPatient(selectedPatientId);
};

export default useAppStore;
