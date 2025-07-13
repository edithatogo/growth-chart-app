import React, { useState, useEffect } from 'react';
import useAppStore, { GrowthRecord, NewGrowthRecordData, useCurrentPatient, useCurrentPatientRecords } from '../store/appStore';
import { PlusCircleIcon, XCircleIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { convertWeightForDisplay, convertHeightForDisplay, WeightUnit, HeightUnit } from '../utils/units';

const TableViewPage: React.FC = () => {
  const currentPatient = useCurrentPatient();
  const recordsToDisplayRaw = useCurrentPatientRecords();
  const addGrowthRecordAction = useAppStore((state) => state.addGrowthRecord);
  const updateGrowthRecordAction = useAppStore((state) => state.updateGrowthRecord);
  const deleteGrowthRecordAction = useAppStore((state) => state.deleteGrowthRecord);
  const displayUnitSystem = useAppStore((state) => state.settings.units);

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAgeMonths, setFormAgeMonths] = useState<number | ''>('');
  const [formType, setFormType] = useState<GrowthRecord['measurementType']>('Weight');
  const [formValue, setFormValue] = useState<number | ''>('');
  const [formUnit, setFormUnit] = useState<GrowthRecord['unit']>('kg');
  const [formOtherMeasurementName, setFormOtherMeasurementName] = useState('');
  const [formInterventionType, setFormInterventionType] = useState('');
  const [formInterventionDetails, setFormInterventionDetails] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formMessage, setFormMessage] = useState<{type: 'success' | 'error', text: string, field?: string} | null>(null);

  const isEditingForm = editingRecordId !== null;

  const resetFormFields = (isSubmitSuccess = false) => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormAgeMonths('');
    if (!isSubmitSuccess || !isEditingForm) { // Don't reset type if successfully added, let user add another of same type
        setFormType('Weight');
    }
    // Unit will be reset by useEffect based on type and displayUnitSystem if not editing
    setFormValue('');
    setFormOtherMeasurementName('');
    setFormInterventionType('');
    setFormInterventionDetails('');
    setFormNotes('');
    if (!isSubmitSuccess) setFormMessage(null);
  };

  const handleUnitChangeBasedOnType = (type: GrowthRecord['measurementType'], system: 'Metric' | 'Imperial') => {
    switch (type) {
      case 'Weight': setFormUnit(system === 'Metric' ? 'kg' : 'lbs'); break;
      case 'Height': case 'Length': case 'HeadCircumference': setFormUnit(system === 'Metric' ? 'cm' : 'in'); break;
      case 'BMI': setFormUnit('kg/m²'); break;
      case 'Other': if (!isEditingForm) setFormUnit(''); break; // Clear for new 'Other', keep if editing 'Other'
      default: setFormUnit(system === 'Metric' ? 'kg' : 'lbs');
    }
  };

  useEffect(() => {
    if (showForm && !isEditingForm) {
        handleUnitChangeBasedOnType(formType, displayUnitSystem);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formType, displayUnitSystem, showForm, isEditingForm]);

  const handleMeasurementTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as GrowthRecord['measurementType'];
    setFormType(type);
    // If editing, let the unit be, user can change it. If adding, set default.
    // If type is 'Other', clear unit to prompt manual entry unless already editing an 'Other' record.
    if (!isEditingForm || type === 'Other') {
        handleUnitChangeBasedOnType(type, displayUnitSystem);
    } else if (isEditingForm && formType === 'Other' && type !== 'Other') { // Switched from Other to standard while editing
        handleUnitChangeBasedOnType(type, displayUnitSystem);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    if (!currentPatient) { setFormMessage({type: 'error', text: 'No patient selected.'}); return; }
    if (!formDate.trim()) { setFormMessage({type: 'error', text: 'Measurement Date is required.', field: 'formDate'}); return; }
    if (formAgeMonths === '') { setFormMessage({type: 'error', text: 'Age at Measurement is required.', field: 'formAgeMonths'}); return; }
    if (formValue === '') { setFormMessage({type: 'error', text: 'Value is required.', field: 'formValue'}); return; }

    const measurementDate = new Date(formDate);
    const today = new Date(); today.setHours(0,0,0,0);
    if (isNaN(measurementDate.getTime())) { setFormMessage({type: 'error', text: 'Invalid Measurement Date format.', field: 'formDate'}); return; }
    if (measurementDate > today) { setFormMessage({type: 'error', text: 'Measurement Date cannot be in the future.', field: 'formDate'}); return; }

    const ageNum = Number(formAgeMonths);
    if (isNaN(ageNum) || ageNum < 0) { setFormMessage({type: 'error', text: 'Age must be a non-negative number.', field: 'formAgeMonths'}); return; }

    const valueNum = Number(formValue);
    if (isNaN(valueNum)) { setFormMessage({type: 'error', text: 'Value must be a number.', field: 'formValue'}); return; }
    if (['Weight', 'Height', 'Length', 'HeadCircumference'].includes(formType) && valueNum <=0 && formType !== 'Other') { // Allow 0 or negative for 'Other'
        setFormMessage({type: 'error', text: 'Value must be positive for this measurement type.', field: 'formValue'}); return;
    }

    if (formType === 'Other') {
        if (!formOtherMeasurementName.trim()) { setFormMessage({type: 'error', text: 'Measurement Name is required for "Other" type.', field: 'formOtherMeasurementName'}); return; }
        if (formOtherMeasurementName.trim().length > 50) { setFormMessage({type: 'error', text: 'Measurement Name max 50 chars.', field: 'formOtherMeasurementName'}); return; }
        if (!formUnit.trim()) { setFormMessage({type: 'error', text: 'Unit is required for "Other" type.', field: 'formUnit'}); return; }
        if (formUnit.trim().length > 20) { setFormMessage({type: 'error', text: 'Unit max 20 chars for "Other" type.', field: 'formUnit'}); return; }
    }
    if (formInterventionType.trim().length > 50) { setFormMessage({type: 'error', text: 'Intervention Type max 50 chars.', field: 'formInterventionType'}); return; }
    if (formInterventionDetails.trim().length > 200) { setFormMessage({type: 'error', text: 'Intervention Details max 200 chars.', field: 'formInterventionDetails'}); return; }
    if (formNotes.trim().length > 500) { setFormMessage({type: 'error', text: 'Notes max 500 chars.', field: 'formNotes'}); return; }

    const recordPayload: Omit<GrowthRecord, 'id'> & { id?: string} = {
      patientId: currentPatient.id, date: formDate, ageMonths: ageNum,
      measurementType: formType, value: valueNum, unit: formUnit.trim(),
      otherMeasurementName: formType === 'Other' ? formOtherMeasurementName.trim() : undefined,
      interventionType: formInterventionType.trim() || undefined,
      interventionDetails: formInterventionDetails.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };

    try {
        if (isEditingForm && editingRecordId) {
            updateGrowthRecordAction({ ...recordPayload, id: editingRecordId } as GrowthRecord);
            setFormMessage({type: 'success', text: 'Record updated successfully!'});
            setShowForm(false);
            setEditingRecordId(null);
        } else {
            addGrowthRecordAction(recordPayload as NewGrowthRecordData);
            setFormMessage({type: 'success', text: 'Record added successfully!'});
        }
        resetFormFields(true); // Pass true to indicate successful submission
        setTimeout(() => setFormMessage(null), 3000);
    } catch (error) {
        console.error("Error submitting growth record form:", error);
        setFormMessage({type: 'error', text: 'An unexpected error occurred.'});
    }
  };

  const handleEditRecord = (record: GrowthRecord) => {
    // Safeguard: Prevent editing FHIR records even if button somehow gets enabled/clicked
    const originalRecord = recordsToDisplayRaw.find(r => r.id === record.id);
    if (originalRecord?.isFHIRRecord) {
      console.warn("Attempted to edit a FHIR record. This action is disabled.");
      setFormMessage({type: 'error', text: 'FHIR records cannot be edited directly in this application.'});
      setTimeout(() => setFormMessage(null), 3000);
      // Ensure form is not shown for editing a FHIR record
      if (editingRecordId === record.id) {
        setShowForm(false);
        setEditingRecordId(null);
        resetFormFields();
      }
      return;
    }

    setEditingRecordId(record.id);
    setFormDate(record.date.split('T')[0]);
    setFormAgeMonths(record.ageMonths);
    setFormType(record.measurementType);
    setFormValue(record.value);
    setFormUnit(record.unit);
    setFormOtherMeasurementName(record.otherMeasurementName || '');
    setFormInterventionType(record.interventionType || '');
    setFormInterventionDetails(record.interventionDetails || '');
    setFormNotes(record.notes || '');
    setShowForm(true);
    setFormMessage(null);
    document.getElementById('recordFormHeading')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleForm = () => {
    if (isEditingForm) {
        setEditingRecordId(null); // Exiting edit mode
    }
    setShowForm(prev => !prev);
    resetFormFields(); // Reset fields when toggling, ensure default unit for add mode
    if (!showForm && !isEditingForm) { // If was hidden and not editing (i.e., opening for "add new")
        handleUnitChangeBasedOnType('Weight', displayUnitSystem); // Set default unit for 'Weight' type
    }
  };

  const handleDeleteRecord = (recordId: string, recordType: string, recordDate: string) => {
    if (window.confirm(`Are you sure you want to delete the ${recordType} record from ${recordDate}? This action cannot be undone.`)) {
      deleteGrowthRecordAction(recordId);
      if(editingRecordId === recordId) { // If deleting the record currently being edited
        setEditingRecordId(null);
        setShowForm(false);
        resetFormFields();
      }
    }
  };

  const inputFieldClass = "mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:text-gray-200 disabled:opacity-70 dark:disabled:opacity-50";
  const selectFieldClass = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 dark:text-gray-200 disabled:opacity-70 dark:disabled:opacity-50";
  const labelClass = "block text-sm font-medium text-gray-600 dark:text-gray-300";

  if (!currentPatient) { /* ... no patient selected message ... */
    return (
      <div className="p-4 text-center text-gray-800 dark:text-gray-200">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Growth Data Table</h2>
        <p className="text-gray-500 dark:text-gray-400">Please select a patient from the "Patient Selection" page to view and add growth records.</p>
      </div>
    );
  }

  const recordsForDisplayTable = recordsToDisplayRaw.map(record => {
    let displayValue = record.value;
    let displayUnit = record.unit;

    if (record.measurementType === 'Weight') {
        const converted = convertWeightForDisplay(record.value, record.unit as WeightUnit, displayUnitSystem);
        displayValue = converted.value; displayUnit = converted.unit as GrowthRecord['unit'];
    } else if (['Height', 'Length', 'HeadCircumference'].includes(record.measurementType)) {
        const converted = convertHeightForDisplay(record.value, record.unit as HeightUnit, displayUnitSystem);
        displayValue = converted.value; displayUnit = converted.unit as GrowthRecord['unit'];
    }
    return { ...record, value: displayValue, unit: displayUnit };
  });

  return (
    <div className="p-4 text-gray-800 dark:text-gray-200">
      <h2 className="text-2xl font-semibold mb-1 text-gray-900 dark:text-white">Growth Data for: <span className="text-blue-600 dark:text-blue-400">{currentPatient.name}</span></h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">DOB: {currentPatient.dob} | Sex: {currentPatient.sex} | Displaying Units: <span className="font-semibold">{displayUnitSystem}</span></p>

      <div className="mb-6">
        <button
            onClick={handleToggleForm}
            className="inline-flex items-center bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:shadow-outline transition-colors"
        >
            {showForm && isEditingForm ? <><XCircleIcon className="h-5 w-5 mr-2"/> Cancel Editing</> :
             showForm && !isEditingForm ? <><XCircleIcon className="h-5 w-5 mr-2"/> Cancel Adding</> :
             <><PlusCircleIcon className="h-5 w-5 mr-2"/> Add New Growth Entry</>}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-700/50 shadow rounded-lg">
          <h3 id="recordFormHeading" className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-100">
            {isEditingForm ? 'Edit Growth Record' : 'Add New Growth Record'}
          </h3>
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label htmlFor="formDate" className={labelClass}>Date of Measurement</label>
                  <input type="date" id="formDate" value={formDate} onChange={(e) => setFormDate(e.target.value)} required
                         className={`${inputFieldClass} [color-scheme:light] dark:[color-scheme:dark] ${formMessage?.field === 'formDate' ? 'border-red-500 dark:border-red-400' : ''}`} />
                  {formMessage?.field === 'formDate' && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formMessage.text}</p>}
                </div>
                <div>
                  <label htmlFor="formAgeMonths" className={labelClass}>Age at Measurement (Months)</label>
                  <input type="number" id="formAgeMonths" value={formAgeMonths} onChange={(e) => setFormAgeMonths(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g., 6" required
                         className={`${inputFieldClass} ${formMessage?.field === 'formAgeMonths' ? 'border-red-500 dark:border-red-400' : ''}`} min="0" step="0.1"/>
                  {formMessage?.field === 'formAgeMonths' && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formMessage.text}</p>}
                </div>
                <div>
                  <label htmlFor="formType" className={labelClass}>Measurement Type</label>
                  <select id="formType" value={formType} onChange={handleMeasurementTypeChange} required className={selectFieldClass}>
                    <option value="Weight">Weight</option> <option value="Height">Height (standing)</option>
                    <option value="Length">Length (lying)</option> <option value="HeadCircumference">Head Circumference</option>
                    <option value="BMI" disabled>BMI (auto-calculated)</option>
                    <option value="Other">Other Measurement</option>
                  </select>
                </div>

                {formType === 'Other' && (
                  <div>
                    <label htmlFor="formOtherMeasurementName" className={labelClass}>Measurement Name</label>
                    <input type="text" id="formOtherMeasurementName" value={formOtherMeasurementName} onChange={(e) => setFormOtherMeasurementName(e.target.value)} required={formType === 'Other'}
                           className={`${inputFieldClass} ${formMessage?.field === 'formOtherMeasurementName' ? 'border-red-500 dark:border-red-400' : ''}`} placeholder="e.g., Arm Span"/>
                    {formMessage?.field === 'formOtherMeasurementName' && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formMessage.text}</p>}
                  </div>
                )}

                <div>
                  <label htmlFor="formValue" className={labelClass}>Value</label>
                  <input type="number" step="any" id="formValue" value={formValue} onChange={(e) => setFormValue(e.target.value === '' ? '' : Number(e.target.value))} required
                         className={`${inputFieldClass} ${formMessage?.field === 'formValue' ? 'border-red-500 dark:border-red-400' : ''}`} placeholder="e.g., 10.2"/>
                   {formMessage?.field === 'formValue' && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formMessage.text}</p>}
                </div>

                <div className={formType === 'Other' ? "md:col-span-2" : ""}>
                  <label htmlFor="formUnit" className={labelClass}>Unit</label>
                  {formType === 'Other' ? (
                    <input type="text" id="formUnit" value={formUnit} onChange={(e) => setFormUnit(e.target.value)} required
                           className={`${inputFieldClass} ${formMessage?.field === 'formUnit' ? 'border-red-500 dark:border-red-400' : ''}`} placeholder="e.g., cm, ratio, score"/>
                  ) : (
                    <select id="formUnit" value={formUnit} onChange={(e) => setFormUnit(e.target.value as GrowthRecord['unit'])} required className={selectFieldClass} disabled={formType === 'BMI'}>
                      {formType === 'Weight' && <> <option value="kg">kg</option> <option value="lbs">lbs</option> </>}
                      {(formType === 'Height' || formType === 'Length' || formType === 'HeadCircumference') && <> <option value="cm">cm</option> <option value="in">in</option> </>}
                      {formType === 'BMI' && <option value="kg/m²">kg/m²</option>}
                    </select>
                  )}
                  {formMessage?.field === 'formUnit' && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formMessage.text}</p>}
                </div>

                <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-600 pt-5 mt-1">
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-200 mb-2">Intervention (Optional)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        <div>
                            <label htmlFor="formInterventionType" className={labelClass}>Intervention Type</label>
                            <input type="text" id="formInterventionType" value={formInterventionType} onChange={(e) => setFormInterventionType(e.target.value)}
                                   className={`${inputFieldClass} ${formMessage?.field === 'formInterventionType' ? 'border-red-500 dark:border-red-400' : ''}`} placeholder="e.g., Growth Hormone"/>
                            {formMessage?.field === 'formInterventionType' && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formMessage.text}</p>}
                        </div>
                        <div>
                            <label htmlFor="formInterventionDetails" className={labelClass}>Intervention Details</label>
                            <input type="text" id="formInterventionDetails" value={formInterventionDetails} onChange={(e) => setFormInterventionDetails(e.target.value)}
                                   className={`${inputFieldClass} ${formMessage?.field === 'formInterventionDetails' ? 'border-red-500 dark:border-red-400' : ''}`} placeholder="e.g., Dosage, Specifics"/>
                            {formMessage?.field === 'formInterventionDetails' && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formMessage.text}</p>}
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="formNotes" className={labelClass}>General Notes (Optional)</label>
                  <textarea id="formNotes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2}
                            className={`${inputFieldClass} ${formMessage?.field === 'formNotes' ? 'border-red-500 dark:border-red-400' : ''}`} placeholder="Any relevant general notes..."></textarea>
                  {formMessage?.field === 'formNotes' && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{formMessage.text}</p>}
                </div>
            </div>
            <div className="pt-3 flex justify-end items-center space-x-3">
                {formMessage && formMessage.type === 'success' && (
                    <p className="text-sm text-green-600 dark:text-green-400 animate-pulse">{formMessage.text}</p>
                )}
                {formMessage && formMessage.type === 'error' && !formMessage.field && ( // General error not tied to a field
                    <p className="text-sm text-red-600 dark:text-red-400">{formMessage.text}</p>
                )}
                <button type="button" onClick={handleToggleForm} className="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors">
                    {isEditingForm ? 'Cancel Edit' : 'Cancel'}
                </button>
                <button type="submit" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors">
                    {isEditingForm ? 'Update Record' : 'Save Record'}
                </button>
            </div>
          </form>
        </div>
      )}

      {recordsForDisplayTable.length > 0 ? (
        <div className="overflow-x-auto bg-white dark:bg-gray-700/50 shadow rounded-lg">
          <table className="min-w-full leading-normal">
            <thead className="bg-gray-50 dark:bg-gray-600">
              <tr className="border-b-2 border-gray-200 dark:border-gray-500 text-left text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wider">
                <th className="px-5 py-3">Date</th> <th className="px-5 py-3">Age (Months)</th>
                <th className="px-5 py-3">Type</th> <th className="px-5 py-3">Value</th>
                <th className="px-5 py-3">Unit</th>
                {/* Optionally show intervention cols, or just in notes/details on edit */}
                <th className="px-5 py-3">Notes</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {recordsForDisplayTable.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.ageMonths - a.ageMonths)
                .map((record) => {
                  const originalRecord = recordsToDisplayRaw.find(r => r.id === record.id);
                  const isFHIR = originalRecord?.isFHIRRecord;
                  return (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-600/70">
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{record.date}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{record.ageMonths}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                    {record.measurementType === 'Other' ? record.otherMeasurementName : record.measurementType}
                    {record.interventionType && <div className="text-xs text-purple-500 dark:text-purple-400 truncate" title={`${record.interventionType}: ${record.interventionDetails || ''}`}>Intervention</div>}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{record.value}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">{record.unit}</td>
                  <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap max-w-xs truncate" title={record.notes}>{record.notes || 'N/A'}</td>
                  <td className="px-5 py-4 text-sm whitespace-nowrap">
                    {isFHIR && (
                      <span className="mr-2 px-1.5 py-0.5 text-xs font-semibold text-cyan-700 bg-cyan-100 dark:text-cyan-200 dark:bg-cyan-700/50 rounded-full inline-block align-middle" title="This record was sourced from FHIR">
                        FHIR
                      </span>
                    )}
                    <button
                        className={`text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3 text-xs inline-flex items-center ${isFHIR ? 'opacity-50 cursor-not-allowed dark:opacity-60' : ''}`}
                        onClick={() => handleEditRecord(originalRecord!)}
                        aria-label={isFHIR ? "FHIR records cannot be edited" : `Edit record from ${record.date} for ${record.measurementType}`}
                        disabled={isFHIR}
                        title={isFHIR ? "FHIR records cannot be edited directly in this application." : `Edit record`}
                    >
                        <PencilSquareIcon className="h-4 w-4 mr-1" /> Edit
                    </button>
                    <button
                        className={`text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 text-xs inline-flex items-center ${isFHIR ? 'opacity-50 cursor-not-allowed dark:opacity-60' : ''}`}
                        onClick={() => handleDeleteRecord(record.id, record.measurementType === 'Other' ? record.otherMeasurementName || 'Other' : record.measurementType, record.date)}
                        aria-label={isFHIR ? "FHIR records cannot be deleted" : `Delete record from ${record.date} for ${record.measurementType}`}
                        disabled={isFHIR}
                        title={isFHIR ? "FHIR records cannot be deleted directly in this application." : `Delete record`}
                    >
                        <TrashIcon className="h-4 w-4 mr-1" /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No growth records</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding a new growth record for {currentPatient.name}.</p>
        </div>
      )}
    </div>
  );
};

export default TableViewPage;
