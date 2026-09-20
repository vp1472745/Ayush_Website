import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  Save,
  Truck,
  Layers,
  ChevronDown,
  Upload,
  Download,
  FileSpreadsheet,
  CheckSquare,
  Square,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCompany } from '../context/CompanyContext';
import { useLock } from '../context/LockContext';
import { useToast } from '../context/ToastContext';
import { downloadExcel, downloadCSV } from '../utils/exportUtils';
import {
  ProtectedAction,
  Input,
  Select,
  CustomDropdown,
  Modal,
  ConfirmationModal,
  SampleTemplateDropdown,
} from '../components/common';

export const SettingsHub = () => {
  const { companies, updateCompany, toggleCompanyStatus, addCompany, deleteCompany } = useCompany();
  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();

  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);

  // Selected company ID for the configuration editor
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  // Working riders list for the selected company
  const [currentRiders, setCurrentRiders] = useState([]);
  // Selected rider row indices for bulk operations
  const [selectedRiderIndices, setSelectedRiderIndices] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Modals state
  const [isViewCompaniesModalOpen, setIsViewCompaniesModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [selectedModalCompany, setSelectedModalCompany] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    status: 'Active',
    sheetType: 'shadowfax',
    riders: [],
  });
  const [addCompanyFormData, setAddCompanyFormData] = useState({
    name: '',
    code: '',
    status: 'Active',
    sheetType: 'xpressbees',
  });
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  // Default selection when companies load
  useEffect(() => {
    if (companies.length > 0) {
      if (!selectedCompanyId || !companies.some((c) => (c.id || c._id) === selectedCompanyId)) {
        const firstActive = companies.find((c) => c.status === 'Active') || companies[0];
        setSelectedCompanyId(firstActive.id || firstActive._id);
      }
    }
  }, [companies, selectedCompanyId]);

  // Current selected company object
  const activeCompany = useMemo(() => {
    return companies.find((c) => (c.id || c._id) === selectedCompanyId) || companies[0] || null;
  }, [companies, selectedCompanyId]);

  // Determine current format type
  const companyFormat = useMemo(() => {
    if (!activeCompany) return 'shadowfax';
    const sType = (activeCompany.sheetType || '').toLowerCase();
    const cName = (activeCompany.name || '').toLowerCase();
    if (sType === 'valmo' || cName.includes('valmo')) return 'valmo';
    if (sType === 'xpressbees' || cName.includes('xpress')) return 'xpressbees';
    return 'shadowfax';
  }, [activeCompany]);

  // Company Options for CustomDropdown
  const companyDropdownOptions = useMemo(() => {
    return companies.map((c) => ({
      value: c.id || c._id,
      label: c.name,
      badge: c.sheetType?.toUpperCase() || 'SHADOWFAX',
      icon: Building2,
    }));
  }, [companies]);

  // Sync current riders whenever the selected company changes or companies data updates
  useEffect(() => {
    setSelectedRiderIndices([]);
    if (activeCompany) {
      if (Array.isArray(activeCompany.riders) && activeCompany.riders.length > 0) {
        setCurrentRiders(
          activeCompany.riders.map((r) => ({
            riderId: r.riderId || '',
            riderName: r.riderName || '',
            riderCombined:
              r.riderCombined ||
              (r.riderId && r.riderName ? `${r.riderId}-${r.riderName}` : r.riderId || r.riderName || ''),
            rate: r.rate !== undefined ? r.rate : (r.rateCard !== undefined ? r.rateCard : 0),
            primary: r.primary !== undefined ? r.primary : 0,
            clubbed: r.clubbed !== undefined ? r.clubbed : 0,
          }))
        );
      } else {
        // Initial empty row
        setCurrentRiders([
          {
            riderId: '',
            riderName: '',
            riderCombined: '',
            rate: 0,
            primary: 0,
            clubbed: 0,
          },
        ]);
      }
    }
  }, [activeCompany]);

  // Add Rider Row Helper
  const handleAddRiderRow = () => {
    setCurrentRiders((prev) => [
      ...prev,
      {
        riderId: '',
        riderName: '',
        riderCombined: '',
        rate: 0,
        primary: 0,
        clubbed: 0,
      },
    ]);
  };

  // Remove Single Rider Row Helper
  const handleRemoveRiderRow = (index) => {
    setCurrentRiders((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.length === 0
        ? [
            {
              riderId: '',
              riderName: '',
              riderCombined: '',
              rate: 0,
              primary: 0,
              clubbed: 0,
            },
          ]
        : updated;
    });
    setSelectedRiderIndices((prev) =>
      prev
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i))
    );
  };

  // Toggle Row Selection
  const handleToggleSelectRow = (index) => {
    setSelectedRiderIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  // Toggle Select All
  const handleToggleSelectAll = () => {
    if (selectedRiderIndices.length === currentRiders.length) {
      setSelectedRiderIndices([]);
    } else {
      setSelectedRiderIndices(currentRiders.map((_, idx) => idx));
    }
  };

  // Delete Selected / Bulk Delete
  const handleDeleteSelectedRiders = () => {
    if (selectedRiderIndices.length === 0) return;
    const count = selectedRiderIndices.length;
    const remaining = currentRiders.filter((_, idx) => !selectedRiderIndices.includes(idx));

    if (remaining.length === 0) {
      setCurrentRiders([
        {
          riderId: '',
          riderName: '',
          riderCombined: '',
          rate: 0,
          primary: 0,
          clubbed: 0,
        },
      ]);
    } else {
      setCurrentRiders(remaining);
    }
    setSelectedRiderIndices([]);
    toast.success(`Removed ${count} selected rider ${count === 1 ? 'box' : 'boxes'}.`);
  };

  // Universal Parser for Rider ID & Name (supports "ID - Name", "Name - ID", "ID / Name", "ID only", "Name only")
  const parseRiderIdentifier = (str) => {
    if (!str) return { riderId: '', riderName: '' };
    let raw = String(str).trim();
    raw = raw.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
    if (!raw) return { riderId: '', riderName: '' };

    // 1. Digits first, then separator, then name: "123456 - Vineet", "123456/Vineet", "123456 Vineet"
    let match = raw.match(/^(\d+)[\s\-_/:|]+(.+)$/);
    if (match) {
      return { riderId: match[1].trim(), riderName: match[2].replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim() };
    }

    // 2. Name first, then separator, then digits: "Vineet Pancheshwar - 123456", "Shubham - 789"
    match = raw.match(/^(.+?)[\s\-_/:|]+(\d+)$/);
    if (match) {
      return { riderId: match[2].trim(), riderName: match[1].replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim() };
    }

    // 3. Only digits (e.g. "123456" or "-123456")
    if (/^\d+$/.test(raw)) {
      return { riderId: raw, riderName: '' };
    }

    // 4. Only name (e.g. "Shubham" or "Shubham -")
    return { riderId: '', riderName: raw };
  };

  // Update Rider Field
  const handleRiderChange = (index, field, value) => {
    setCurrentRiders((prev) =>
      prev.map((r, idx) => {
        if (idx !== index) return r;
        const updated = { ...r, [field]: value };

        // Sync riderCombined if riderId or riderName changes
        if (field === 'riderId' || field === 'riderName') {
          const idVal = field === 'riderId' ? String(value || '').trim() : (r.riderId || '').trim();
          const nameVal = field === 'riderName' ? String(value || '').trim() : (r.riderName || '').trim();
          if (idVal && nameVal) {
            updated.riderCombined = `${nameVal} - ${idVal}`;
          } else {
            updated.riderCombined = nameVal || idVal || '';
          }
        }

        // If updating riderCombined directly (Valmo / Xpressbees), parse into riderId and riderName
        if (field === 'riderCombined') {
          const rawVal = String(value || '');
          const { riderId, riderName } = parseRiderIdentifier(rawVal);
          updated.riderCombined = rawVal;
          updated.riderId = riderId;
          updated.riderName = riderName;
        }
        return updated;
      })
    );
  };

  // Download Sample Template for Company (Clean column headers ONLY, 0 dummy data rows)
  const handleDownloadSampleTemplate = (format = 'xlsx', targetCompany = null) => {
    const comp = targetCompany || activeCompany;
    const compName = (comp?.name || 'Company').trim().replace(/\s+/g, '_');
    const cName = (comp?.name || '').toLowerCase();
    let headers = [];

    if (cName.includes('valmo') || cName.includes('xpress')) {
      headers = ['Rider Name/Rider ID', 'Rate'];
    } else {
      // Shadowfax
      headers = ['Rider Name', 'Rider ID', 'Rate', 'Primary', 'Clubbed'];
    }

    const filename = `Sample_Riders_Template_${compName}`;
    if (format === 'xlsx') {
      downloadExcel(headers, [], filename);
    } else {
      downloadCSV(headers, [], filename);
    }
    toast.success(`Downloaded clean sample template for ${comp?.name || 'Company'} (${format.toUpperCase()})!`);
  };

  // Export Currently Configured Riders (Excel .xlsx & CSV .csv)
  const handleExportRiders = (format = 'xlsx') => {
    setIsExportMenuOpen(false);
    if (!currentRiders || currentRiders.length === 0) {
      toast.error('No rider records to export.');
      return;
    }

    const compName = (activeCompany?.name || 'Company').trim().replace(/\s+/g, '_');
    const isValOrXp = companyFormat === 'valmo' || companyFormat === 'xpressbees';

    const headers = isValOrXp
      ? ['Rider Name/Rider ID', 'Rate']
      : ['Rider Name', 'Rider ID', 'Rate', 'Primary', 'Clubbed'];

    const dataRows = currentRiders.map((r) => {
      if (isValOrXp) {
        const combined = r.riderCombined || (r.riderId && r.riderName ? `${r.riderId}-${r.riderName}` : r.riderId || r.riderName || '');
        return [combined, Number(r.rate) || 0];
      }
      return [
        r.riderName || '',
        r.riderId || '',
        Number(r.rate) || 0,
        Number(r.primary) || 0,
        Number(r.clubbed) || 0,
      ];
    });

    const filename = `Riders_List_${compName}`;
    if (format === 'xlsx') {
      downloadExcel(headers, dataRows, filename);
      toast.success(`Exported ${currentRiders.length} riders for ${activeCompany?.name || 'Company'} to Excel (.xlsx)!`);
    } else {
      downloadCSV(headers, dataRows, filename);
      toast.success(`Exported ${currentRiders.length} riders for ${activeCompany?.name || 'Company'} to CSV (.csv)!`);
    }
  };

  // Upload Excel / CSV File to Populate Riders
  const handleFileUpload = (e) => {
    if (!canEdit) {
      notifyLocked('upload rider file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawJson || rawJson.length < 2) {
          toast.error('The uploaded file contains no data rows.');
          return;
        }

        const headerRow = (rawJson[0] || []).map((h) => String(h).toLowerCase().trim());
        const findColIdx = (possibleNames) => {
          return headerRow.findIndex((h) => possibleNames.some((n) => h.includes(n)));
        };

        const riderCombinedIdx = findColIdx(['rider name/rider id', 'rider name / rider id', 'rider name/id', 'rider combined', 'rider/id', 'rider id/name']);
        const riderNameIdx = findColIdx(['rider name', 'rider_name', 'name']);
        const riderIdIdx = findColIdx(['rider id', 'rider_id', 'id', 'emp id', 'code']);
        const rateIdx = findColIdx(['rate', 'rate card', 'ratecard']);
        const primaryIdx = findColIdx(['primary']);
        const clubbedIdx = findColIdx(['clubbed']);

        const parsedRiders = [];

        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.every((c) => String(c).trim() === '')) continue;

          let rCombined = '';
          if (riderCombinedIdx >= 0 && row[riderCombinedIdx]) {
            rCombined = String(row[riderCombinedIdx]).trim();
          } else if (riderNameIdx >= 0 && row[riderNameIdx]) {
            rCombined = String(row[riderNameIdx]).trim();
          } else if (row[0]) {
            rCombined = String(row[0]).trim();
          }

          let rId = riderIdIdx >= 0 && riderIdIdx !== riderNameIdx && riderIdIdx !== riderCombinedIdx ? String(row[riderIdIdx] || '').trim() : '';
          let rName = riderNameIdx >= 0 && riderNameIdx !== riderCombinedIdx ? String(row[riderNameIdx] || '').trim() : '';

          const parsed = parseRiderIdentifier(rCombined || (rName && rId ? `${rName} - ${rId}` : rName || rId));
          if (!rId && parsed.riderId) rId = parsed.riderId;
          if (!rName && parsed.riderName) rName = parsed.riderName;
          if (!rCombined) {
            rCombined = rName && rId ? `${rName} - ${rId}` : (rName || rId || '');
          }

          const rate = rateIdx >= 0 ? Number(row[rateIdx]) || 0 : 0;
          const primary = primaryIdx >= 0 ? Number(row[primaryIdx]) || 0 : 0;
          const clubbed = clubbedIdx >= 0 ? Number(row[clubbedIdx]) || 0 : 0;

          if (rName || rId || rCombined) {
            parsedRiders.push({
              riderId: rId,
              riderName: rName,
              riderCombined: rCombined,
              rate,
              primary,
              clubbed,
            });
          }
        }

        if (parsedRiders.length > 0) {
          setCurrentRiders(parsedRiders);
          setSelectedRiderIndices([]);
          toast.success(`Successfully loaded ${parsedRiders.length} riders from file! Click "Save Rider Settings" to apply.`);
        } else {
          toast.error('No valid rider rows found in the uploaded file.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse Excel/CSV file. Please ensure format is correct.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // Save Rider Configuration to Backend
  const handleSaveRiders = async () => {
    if (!canEdit) {
      notifyLocked('save rider settings');
      return;
    }
    if (!activeCompany) return;

    try {
      setIsSaving(true);
      // Clean empty rows & ensure both ID and Name are properly extracted
      const cleanRiders = currentRiders
        .filter((r) => r.riderId?.trim() || r.riderName?.trim() || r.riderCombined?.trim())
        .map((r) => {
          const parsed = parseRiderIdentifier(r.riderCombined || (r.riderName && r.riderId ? `${r.riderName} - ${r.riderId}` : r.riderName || r.riderId || ''));
          const finalId = r.riderId?.trim() || parsed.riderId || '';
          const finalName = r.riderName?.trim() || parsed.riderName || '';
          const finalCombined = r.riderCombined?.trim() || (finalName && finalId ? `${finalName} - ${finalId}` : finalName || finalId || '');

          return {
            riderId: finalId,
            riderName: finalName,
            riderCombined: finalCombined,
            rate: Number(r.rate) || 0,
            rateCard: Number(r.rate) || 0,
            primary: Number(r.primary) || 0,
            clubbed: Number(r.clubbed) || 0,
          };
        });

      const success = await updateCompany(activeCompany.id || activeCompany._id, {
        riders: cleanRiders,
      });

      if (success) {
        toast.success(`Riders list for ${activeCompany.name} updated successfully! (${cleanRiders.length} riders)`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save rider configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Modal helpers for viewing / editing company details
  const filteredModalCompanies = useMemo(() => {
    if (!companySearchQuery.trim()) return companies;
    const q = companySearchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.status?.toLowerCase().includes(q)
    );
  }, [companies, companySearchQuery]);

  const handleOpenEditModal = (company) => {
    if (!canEdit) {
      notifyLocked('edit company');
      return;
    }
    setSelectedModalCompany(company);
    setEditFormData({
      name: company.name || '',
      status: company.status || 'Active',
      sheetType: company.sheetType || 'shadowfax',
      riders: Array.isArray(company.riders) && company.riders.length > 0
        ? company.riders.map((r) => ({ ...r }))
        : [{ riderId: '', riderName: '', riderCombined: '', rate: 0, primary: 0, clubbed: 0 }],
    });
    setIsEditModalOpen(true);
  };

  const handleEditModalSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      notifyLocked('save company changes');
      return;
    }
    if (!selectedModalCompany) return;

    const cleanRiders = (editFormData.riders || [])
      .filter((r) => r.riderId?.trim() || r.riderName?.trim() || r.riderCombined?.trim())
      .map((r) => {
        const parsed = parseRiderIdentifier(r.riderCombined || (r.riderName && r.riderId ? `${r.riderName} - ${r.riderId}` : r.riderName || r.riderId || ''));
        const finalId = r.riderId?.trim() || parsed.riderId || '';
        const finalName = r.riderName?.trim() || parsed.riderName || '';
        const finalCombined = r.riderCombined?.trim() || (finalName && finalId ? `${finalName} - ${finalId}` : finalName || finalId || '');

        return {
          riderId: finalId,
          riderName: finalName,
          riderCombined: finalCombined,
          rate: Number(r.rate) || 0,
          rateCard: Number(r.rate) || 0,
          primary: Number(r.primary) || 0,
          clubbed: Number(r.clubbed) || 0,
        };
      });

    const success = await updateCompany(selectedModalCompany.id || selectedModalCompany._id, {
      name: editFormData.name.trim(),
      status: editFormData.status || 'Active',
      sheetType: editFormData.sheetType || 'shadowfax',
      riders: cleanRiders,
    });

    if (success) {
      setIsEditModalOpen(false);
      setSelectedModalCompany(null);
    }
  };

  const handleCreateCompanySubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      notifyLocked('create company');
      return;
    }
    if (!addCompanyFormData.name.trim()) {
      toast.error('Company name is required');
      return;
    }

    const payload = {
      name: addCompanyFormData.name.trim(),
      code: addCompanyFormData.code.trim() || undefined,
      sheetType: addCompanyFormData.sheetType || 'xpressbees',
      status: addCompanyFormData.status || 'Active',
      riders: [],
    };

    const success = await addCompany(payload);
    if (success) {
      setIsAddCompanyModalOpen(false);
      setAddCompanyFormData({
        name: '',
        code: '',
        sheetType: 'xpressbees',
        status: 'Active',
      });
    }
  };

  const isAllSelected = currentRiders.length > 0 && selectedRiderIndices.length === currentRiders.length;
  const isSomeSelected = selectedRiderIndices.length > 0 && selectedRiderIndices.length < currentRiders.length;

  return (
    <div className="space-y-3 w-full flex flex-col">
      {/* Hidden File Input for Rider Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white p-3 rounded-xl border border-gray-200/80 shadow-xs">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-4.5 h-4.5 text-[#E53935]" />
            <span>Company & Rider Settings</span>
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Configure rider details, rate cards, and parameters per logistics company
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <ProtectedAction actionName="create company">
            <button
              type="button"
              onClick={() => setIsAddCompanyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 bg-[#E53935] text-white hover:bg-[#D32F2F] shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Company</span>
            </button>
          </ProtectedAction>

          <button
            type="button"
            onClick={() => setIsViewCompaniesModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] hover:bg-[#E0E7FF] shadow-2xs cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#4F46E5]" />
            <span>View Registered Companies</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-200/70 text-indigo-900">
              {companies.length}
            </span>
          </button>
        </div>
      </div>

      {/* COMPANY SELECTOR & RIDER CONFIGURATION CARD */}
      <div className="bg-white border border-gray-200/80 shadow-xs rounded-xl p-4 sm:p-5 space-y-4">
        {/* Company Dropdown Selection & Info Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-gray-50/80 p-3.5 rounded-xl border border-gray-200">
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1.5">
              Select Logistics Company
            </label>
            <CustomDropdown
              value={selectedCompanyId}
              onChange={(val) => setSelectedCompanyId(val)}
              options={companyDropdownOptions}
              searchable={true}
              fullWidth={true}
              icon={Building2}
              placeholder="Select Logistics Company"
            />
          </div>

          {activeCompany && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-1 sm:pt-0">
              <div className="text-right sm:text-right">
                <div className="flex items-center gap-2 sm:justify-end">
                  <span className="text-xs font-bold text-gray-900">{activeCompany.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      activeCompany.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {activeCompany.status}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                  {companyFormat === 'shadowfax' && 'Shadowfax Format (Primary + Clubbed + Rate)'}
                  {companyFormat === 'xpressbees' && 'XpressBees Format (Delivered + Pickup + Rate)'}
                  {companyFormat === 'valmo' && 'Valmo Format (Combined Rider Name/ID + Rate)'}
                </div>
              </div>

              <ProtectedAction actionName="toggle company status">
                <button
                  type="button"
                  onClick={() => toggleCompanyStatus(activeCompany.id || activeCompany._id)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                  {activeCompany.status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
              </ProtectedAction>
            </div>
          )}
        </div>

        {/* DYNAMIC RIDERS LIST BOX */}
        <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200/90 space-y-3.5">
          {/* Section Header with Action Buttons: Add Rider Box, Download Sample, Upload File, Delete Selected */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-gray-900">
                  Riders List for {activeCompany?.name || 'Selected Company'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800">
                  {currentRiders.length} {currentRiders.length === 1 ? 'Rider' : 'Riders'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {companyFormat === 'shadowfax' &&
                  'Configure Rider Name, Rider ID, Rate, Primary, and Clubbed values'}
                {companyFormat === 'xpressbees' &&
                  'Configure Rider Name, Rider ID, and Rate values'}
                {companyFormat === 'valmo' &&
                  'Configure combined Rider Name/Rider ID (e.g. 1018329-Sachin Sahu) and Rate values'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
              {/* Delete Selected Button (Visible when any rows are selected) */}
              {selectedRiderIndices.length > 0 && (
                <ProtectedAction actionName="delete selected riders">
                  <button
                    type="button"
                    onClick={handleDeleteSelectedRiders}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs animate-in fade-in"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Selected ({selectedRiderIndices.length})</span>
                  </button>
                </ProtectedAction>
              )}

              {/* Download Sample File Dropdown */}
              <SampleTemplateDropdown
                currentCompany={activeCompany}
                companies={companies}
                onDownload={handleDownloadSampleTemplate}
                label="Sample File"
              />

              {/* Upload File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Excel or CSV file to import riders"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-700" />
                <span>Upload File</span>
              </button>

              {/* Export Dropdown Button */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  title="Export riders list to Excel or CSV"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#D1FAE5] transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Export</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#059669]" />
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                    <button
                      type="button"
                      onClick={() => handleExportRiders('xlsx')}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Export to Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportRiders('csv')}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Export to CSV (.csv)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Add Rider Box Button */}
              <button
                type="button"
                onClick={handleAddRiderRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                <span>Add Rider Box</span>
              </button>
            </div>
          </div>

          {/* SELECT ALL TOOLBAR */}
          {currentRiders.length > 0 && (
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-200/80 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-[#E53935] focus:ring-red-400 cursor-pointer accent-[#E53935]"
                />
                <span>Select All Riders ({currentRiders.length})</span>
              </label>

              {selectedRiderIndices.length > 0 && (
                <span className="text-[11px] font-semibold text-[#E53935]">
                  {selectedRiderIndices.length} of {currentRiders.length} selected
                </span>
              )}
            </div>
          )}

          {/* DYNAMIC RIDER INPUT ROWS */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {currentRiders.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400 bg-white rounded-lg border border-dashed border-gray-200">
                No riders configured yet. Click "+ Add Rider Box" or "Upload File" to add riders for this company.
              </div>
            ) : (
              currentRiders.map((r, idx) => (
                <div
                  key={idx}
                  className={`flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-lg border transition-all ${
                    selectedRiderIndices.includes(idx)
                      ? 'bg-red-50/40 border-red-200 shadow-xs'
                      : 'bg-white border-gray-200 shadow-2xs hover:border-gray-300'
                  }`}
                >
                  {/* Row Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedRiderIndices.includes(idx)}
                    onChange={() => handleToggleSelectRow(idx)}
                    className="w-4 h-4 rounded text-[#E53935] focus:ring-red-400 cursor-pointer accent-[#E53935] shrink-0 ml-0.5"
                  />

                  <span className="text-[11px] font-mono font-bold text-gray-400 w-6 text-center shrink-0">
                    #{idx + 1}
                  </span>

                  {/* SHADOWFAX FORMAT: Rider Name, Rider ID, Rate, Primary, Clubbed */}
                  {companyFormat === 'shadowfax' && (
                    <>
                      <input
                        type="text"
                        placeholder="Rider Name (e.g. Sachin Sahu)"
                        value={r.riderName}
                        onChange={(e) => handleRiderChange(idx, 'riderName', e.target.value)}
                        className="flex-1 min-w-[130px] px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:border-[#E53935] focus:ring-1 focus:ring-red-100 outline-none font-medium text-gray-900 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Rider ID (e.g. 1018329)"
                        value={r.riderId}
                        onChange={(e) => handleRiderChange(idx, 'riderId', e.target.value)}
                        className="w-28 sm:w-32 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:border-[#E53935] focus:ring-1 focus:ring-red-100 outline-none font-medium text-gray-900 bg-white"
                      />
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-[10px] font-bold text-gray-400">Rate:</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={r.rate}
                          onChange={(e) => handleRiderChange(idx, 'rate', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:border-[#E53935] focus:ring-1 focus:ring-red-100 outline-none font-medium text-gray-900 text-right bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-[10px] font-bold text-gray-400">Primary:</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={r.primary}
                          onChange={(e) => handleRiderChange(idx, 'primary', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:border-[#E53935] focus:ring-1 focus:ring-red-100 outline-none font-medium text-gray-900 text-right bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-[10px] font-bold text-gray-400">Clubbed:</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={r.clubbed}
                          onChange={(e) => handleRiderChange(idx, 'clubbed', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:border-[#E53935] focus:ring-1 focus:ring-red-100 outline-none font-medium text-gray-900 text-right bg-white"
                        />
                      </div>
                    </>
                  )}

                  {/* XPRESSBEES & VALMO FORMAT: Single Rider Name/Rider ID combined field + Rate */}
                  {(companyFormat === 'xpressbees' || companyFormat === 'valmo') && (
                    <>
                      <input
                        type="text"
                        placeholder="Rider Name/Rider ID (e.g. 1018329-Sachin Sahu)"
                        value={
                          r.riderCombined ||
                          (r.riderId && r.riderName ? `${r.riderId}-${r.riderName}` : r.riderId || r.riderName || '')
                        }
                        onChange={(e) => handleRiderChange(idx, 'riderCombined', e.target.value)}
                        className="flex-1 min-w-[200px] px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:border-[#E53935] focus:ring-1 focus:ring-red-100 outline-none font-medium text-gray-900 bg-white"
                      />
                      <div className="flex items-center gap-1 w-28">
                        <span className="text-[10px] font-bold text-gray-400">Rate:</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={r.rate}
                          onChange={(e) => handleRiderChange(idx, 'rate', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:border-[#E53935] focus:ring-1 focus:ring-red-100 outline-none font-medium text-gray-900 text-right bg-white"
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveRiderRow(idx)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded cursor-pointer transition-colors shrink-0"
                    title="Remove Rider Box"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* BOTTOM SAVE BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-semibold text-gray-800">{currentRiders.length}</span> rider boxes configured for{' '}
            <span className="font-bold text-gray-900">{activeCompany?.name}</span>
          </div>

          <ProtectedAction actionName="save rider settings">
            <button
              type="button"
              onClick={handleSaveRiders}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 bg-[#E53935] text-white hover:bg-[#D32F2F] shadow-sm hover:shadow cursor-pointer disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Rider Settings'}</span>
            </button>
          </ProtectedAction>
        </div>
      </div>

      {/* VIEW ALL REGISTERED COMPANIES MODAL */}
      <Modal
        isOpen={isViewCompaniesModalOpen}
        onClose={() => setIsViewCompaniesModalOpen(false)}
        title="Fleet Company Registry"
        subtitle={`Total registered logistics partners: ${companies.length}`}
        showConfirm={false}
        cancelLabel="Close"
      >
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search companies by name or code..."
                value={companySearchQuery}
                onChange={(e) => setCompanySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50/60 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 font-medium text-gray-900"
              />
            </div>
            <ProtectedAction actionName="create company">
              <button
                type="button"
                onClick={() => {
                  setIsViewCompaniesModalOpen(false);
                  setIsAddCompanyModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-[#E53935] text-white hover:bg-[#D32F2F] shadow-2xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Company</span>
              </button>
            </ProtectedAction>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredModalCompanies.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">
                No matching companies found.
              </div>
            ) : (
              filteredModalCompanies.map((comp) => (
                <div
                  key={comp.id || comp._id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: comp.color || '#E53935' }}
                    >
                      {comp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{comp.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            comp.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {comp.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        Code: {comp.code || 'N/A'} • Format: {comp.sheetType || 'shadowfax'} • Riders: {comp.riders?.length || 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompanyId(comp.id || comp._id);
                        setIsViewCompaniesModalOpen(false);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-[#E53935] bg-red-50 hover:bg-red-100 rounded-md cursor-pointer transition-colors"
                    >
                      Configure Riders
                    </button>

                    <ProtectedAction actionName="toggle company status">
                      <button
                        type="button"
                        onClick={() => toggleCompanyStatus(comp.id || comp._id)}
                        className="px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-200/60 rounded cursor-pointer transition-colors"
                      >
                        {comp.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </ProtectedAction>

                    <ProtectedAction actionName="edit company">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(comp)}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded cursor-pointer"
                        title="Edit Company Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </ProtectedAction>

                    <ProtectedAction actionName="delete company">
                      <button
                        type="button"
                        onClick={() => setCompanyToDelete(comp)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                        title="Delete Company"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </ProtectedAction>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* ADD COMPANY MODAL */}
      <Modal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setIsAddCompanyModalOpen(false)}
        title="Add New Logistics Company"
        subtitle="Register a new delivery company/partner into the hub system"
        confirmLabel="Create Company"
        onConfirm={handleCreateCompanySubmit}
      >
        <form onSubmit={handleCreateCompanySubmit} className="space-y-4">
          <Input
            label="Company Name"
            placeholder="e.g. Shadowfax, Xpress Bees, Valmo, Delhivery"
            value={addCompanyFormData.name}
            onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, name: e.target.value })}
            required
          />
          <Input
            label="Company Code (Optional)"
            placeholder="e.g. XPRESSBEES, VALMO, SHADOWFAX"
            value={addCompanyFormData.code}
            onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, code: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              label="Excel Calculation Format"
              value={addCompanyFormData.sheetType || 'xpressbees'}
              onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, sheetType: e.target.value })}
              options={[
                { value: 'xpressbees', label: 'XpressBees (Delivered + Pickup Total)' },
                { value: 'valmo', label: 'Valmo (Standard Combined Format)' },
                { value: 'shadowfax', label: 'Shadowfax (Primary + Clubbed)' },
              ]}
            />
            <Select
              label="Initial Status"
              value={addCompanyFormData.status}
              onChange={(e) => setAddCompanyFormData({ ...addCompanyFormData, status: e.target.value })}
              options={[
                { value: 'Active', label: 'Active (Visible across all tabs)' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </div>
        </form>
      </Modal>

      {/* EDIT COMPANY MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Company Details"
        subtitle={`Updating ${selectedModalCompany?.name}`}
        confirmLabel="Save Changes"
        onConfirm={handleEditModalSubmit}
      >
        <form onSubmit={handleEditModalSubmit} className="space-y-4">
          <Input
            label="Company Name"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              label="Company Status"
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              options={[
                { value: 'Active', label: 'Active (Visible in Header Dropdown)' },
                { value: 'Inactive', label: 'Inactive (Hidden from Header Dropdown)' },
              ]}
            />
            <Select
              label="Excel Calculation Format"
              value={editFormData.sheetType || 'shadowfax'}
              onChange={(e) => setEditFormData({ ...editFormData, sheetType: e.target.value })}
              options={[
                { value: 'shadowfax', label: 'Shadowfax / Standard (Primary + Clubbed)' },
                { value: 'xpressbees', label: 'XpressBees (Delivered + Pickup Total)' },
                { value: 'valmo', label: 'Valmo (Standard Combined Format)' },
              ]}
            />
          </div>
        </form>
      </Modal>

      {/* DELETE COMPANY CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={!!companyToDelete}
        onClose={() => setCompanyToDelete(null)}
        onConfirm={async () => {
          if (companyToDelete) {
            await deleteCompany(companyToDelete.id || companyToDelete._id);
            setCompanyToDelete(null);
          }
        }}
        title="Delete Company"
        message={`Are you sure you want to delete company "${companyToDelete?.name}"? All associated settings will be removed.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
