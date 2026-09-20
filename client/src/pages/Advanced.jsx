import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Download,
  Plus,
  Search,
  FileText,
  Inbox,
  Trash2,
  ChevronDown,
  Calendar,
  User,
  Hash,
  DollarSign,
  MessageSquare,
  AlertCircle,
  Zap,
  Clock,
  ArrowRight,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConfirmationModal, Pagination, SampleTemplateDropdown, CustomDropdown } from '../components/common';
import { useCompany } from '../context/CompanyContext';
import { useLock } from '../context/LockContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/calculations';
import { downloadCSV, downloadExcel, downloadSampleTemplate } from '../utils/exportUtils';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

export const Advanced = () => {
  const { companies, selectedCompanyFilter, selectedMonthFilter, selectedFinancialYear } = useCompany();
  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [rowToDelete, setRowToDelete] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);

  // Outstanding advances from previous months state
  const [outstandingAdvances, setOutstandingAdvances] = useState([]);
  const [isCarryForwardModalOpen, setIsCarryForwardModalOpen] = useState(false);
  const [carryingForward, setCarryingForward] = useState(false);
  const [selectedCarryIds, setSelectedCarryIds] = useState([]);

  // New Record Form State for Add Modal
  const [newForm, setNewForm] = useState({
    date: new Date().toISOString().split('T')[0],
    riderName: '',
    riderId: '',
    advance: '',
    advanceCut: '',
    remark: '',
  });

  const [isRiderSuggestionsOpen, setIsRiderSuggestionsOpen] = useState(false);
  const riderComboboxRef = useRef(null);

  // Close rider suggestions on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (riderComboboxRef.current && !riderComboboxRef.current.contains(e.target)) {
        setIsRiderSuggestionsOpen(false);
      }
    };
    if (isRiderSuggestionsOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isRiderSuggestionsOpen]);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered active companies
  const activeCompanies = useMemo(() => {
    return companies.filter((c) => c.status === 'Active');
  }, [companies]);

  const currentCompany = useMemo(() => {
    return activeCompanies.find((c) => (c.id || c._id) === selectedCompanyFilter) || activeCompanies[0] || null;
  }, [activeCompanies, selectedCompanyFilter]);

  // Configured riders for the currently selected global company
  const companyRiders = useMemo(() => {
    if (!currentCompany || !Array.isArray(currentCompany.riders)) return [];
    return currentCompany.riders.filter((r) => r && (r.riderName || r.riderId));
  }, [currentCompany]);

  // Options formatted for CustomDropdown / Quick Selector
  const riderDropdownOptions = useMemo(() => {
    return companyRiders.map((r) => {
      const name = (r.riderName || '').trim();
      const id = (r.riderId || '').trim();
      const displayLabel = name && id ? `${name} (${id})` : name || id || 'Unknown Rider';
      return {
        value: id || name,
        label: displayLabel,
        badge: id ? `#${id}` : undefined,
        icon: User,
        riderName: name,
        riderId: id,
      };
    });
  }, [companyRiders]);

  // Filtered riders for the modal combobox
  const filteredModalRiders = useMemo(() => {
    if (!companyRiders || companyRiders.length === 0) return [];
    const q = (newForm.riderName || '').trim().toLowerCase();
    if (!q) return companyRiders;
    return companyRiders.filter(
      (r) =>
        (r.riderName && r.riderName.toLowerCase().includes(q)) ||
        (r.riderId && r.riderId.toLowerCase().includes(q))
    );
  }, [companyRiders, newForm.riderName]);

  // Fetch advance records from backend
  const fetchAdvances = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const params = {};
      if (selectedCompanyFilter && selectedCompanyFilter !== 'all') {
        params.companyId = selectedCompanyFilter;
      }
      if (selectedMonthFilter && selectedMonthFilter !== 'all') {
        params.month = selectedMonthFilter;
      }
      if (selectedFinancialYear && selectedFinancialYear !== 'all') {
        params.financialYear = selectedFinancialYear;
      }

      const res = await apiClient.get(ENDPOINTS.ADVANCES.GET_ALL, { params });
      if (res.success && Array.isArray(res.data)) {
        const formatted = res.data.map((item) => ({
          ...item,
          id: item._id || item.id,
          date: item.date || '',
          riderName: item.riderName || '',
          riderId: item.riderId || '',
          advance: Number(item.advance) || 0,
          advanceCut: Number(item.advanceCut) || 0,
          remainingAmount: Number(item.remainingAmount) || (Number(item.advance || 0) - Number(item.advanceCut || 0)),
          remark: item.remark || '',
        }));
        setRows(formatted);
      }
    } catch (error) {
      console.error('[Fetch Advances Error]:', error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedCompanyFilter, selectedMonthFilter, selectedFinancialYear]);

  // Fetch outstanding advances from prior months
  const fetchOutstandingAdvances = useCallback(async () => {
    if (!isAuthenticated || !selectedCompanyFilter || selectedCompanyFilter === 'all') {
      setOutstandingAdvances([]);
      return;
    }
    try {
      const params = {
        companyId: selectedCompanyFilter,
        month: selectedMonthFilter,
        financialYear: selectedFinancialYear,
      };
      const res = await apiClient.get(ENDPOINTS.ADVANCES.GET_OUTSTANDING, { params });
      if (res.success && Array.isArray(res.data)) {
        setOutstandingAdvances(res.data);
      } else {
        setOutstandingAdvances([]);
      }
    } catch (err) {
      console.error('[Fetch Outstanding Advances Error]:', err.message);
      setOutstandingAdvances([]);
    }
  }, [isAuthenticated, selectedCompanyFilter, selectedMonthFilter, selectedFinancialYear]);

  useEffect(() => {
    fetchAdvances();
    fetchOutstandingAdvances();
    setSelectedRowIds([]);
  }, [fetchAdvances, fetchOutstandingAdvances]);

  // Handle carry forward action
  const handleCarryForward = async (itemsToCarry = null) => {
    if (!canEdit) {
      notifyLocked('carry forward advances');
      return;
    }
    const targetCompanyId = selectedCompanyFilter || (activeCompanies[0]?.id || activeCompanies[0]?._id);
    if (!targetCompanyId) {
      toast.error('Please select an active company first.');
      return;
    }
    try {
      setCarryingForward(true);
      const recordsToCarry = itemsToCarry || outstandingAdvances.filter((o) => selectedCarryIds.length === 0 || selectedCarryIds.includes(o.id));
      const res = await apiClient.post(ENDPOINTS.ADVANCES.CARRY_FORWARD, {
        companyId: targetCompanyId,
        month: selectedMonthFilter,
        financialYear: selectedFinancialYear,
        records: recordsToCarry,
      });
      if (res.success) {
        toast.success(res.message || `Successfully carried forward advances to ${selectedMonthFilter}!`);
        setIsCarryForwardModalOpen(false);
        setSelectedCarryIds([]);
        fetchAdvances();
        fetchOutstandingAdvances();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to carry forward advances');
    } finally {
      setCarryingForward(false);
    }
  };

  // Detected outstanding advance for rider in new form
  const selectedRiderOutstanding = useMemo(() => {
    if (!outstandingAdvances || outstandingAdvances.length === 0) return null;
    const nameInput = (newForm.riderName || '').trim().toLowerCase();
    const idInput = (newForm.riderId || '').trim().toLowerCase();
    if (!nameInput && !idInput) return null;

    return outstandingAdvances.find((o) => {
      const oId = (o.riderId || '').trim().toLowerCase();
      const oName = (o.riderName || '').trim().toLowerCase();
      return (idInput && oId === idInput) || (nameInput && (oName === nameInput || oName.includes(nameInput)));
    });
  }, [outstandingAdvances, newForm.riderName, newForm.riderId]);

  // Filtered rows based on search
  const displayedRows = useMemo(() => {
    return rows.filter((r) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.riderName?.toLowerCase().includes(q) ||
        r.riderId?.toLowerCase().includes(q) ||
        r.date?.toLowerCase().includes(q) ||
        r.remark?.toLowerCase().includes(q) ||
        r.advance?.toString().includes(q) ||
        r.advanceCut?.toString().includes(q) ||
        r.remainingAmount?.toString().includes(q)
      );
    });
  }, [rows, searchQuery]);

  // Pagination calculation
  const totalItems = displayedRows.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return displayedRows.slice(start, start + pageSize);
  }, [displayedRows, safePage, pageSize]);

  // Select all on current page logic
  const allCurrentPageSelected = useMemo(() => {
    if (paginatedRows.length === 0) return false;
    return paginatedRows.every((r) => selectedRowIds.includes(r.id));
  }, [paginatedRows, selectedRowIds]);

  const handleHeaderSelectAll = () => {
    const pageIds = paginatedRows.map((r) => r.id);
    if (allCurrentPageSelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleRow = (id) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  // Handle cell edit in-place
  const handleCellChange = async (rowId, field, value) => {
    if (!canEdit) {
      notifyLocked('edit advance record');
      return;
    }

    let payload = { [field]: value };

    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: value };

        if (field === 'riderName') {
          const match = companyRiders.find(
            (cr) => cr.riderName && cr.riderName.toLowerCase() === String(value).trim().toLowerCase()
          );
          if (match?.riderId && !r.riderId) {
            updated.riderId = match.riderId;
            payload.riderId = match.riderId;
          }
        } else if (field === 'riderId') {
          const match = companyRiders.find(
            (cr) => cr.riderId && cr.riderId.toLowerCase() === String(value).trim().toLowerCase()
          );
          if (match?.riderName && !r.riderName) {
            updated.riderName = match.riderName;
            payload.riderName = match.riderName;
          }
        }

        if (field === 'advance' || field === 'advanceCut') {
          const adv = field === 'advance' ? Number(value) || 0 : Number(r.advance) || 0;
          const cut = field === 'advanceCut' ? Number(value) || 0 : Number(r.advanceCut) || 0;
          updated.remainingAmount = adv - cut;
        }
        return updated;
      })
    );

    try {
      await apiClient.patch(ENDPOINTS.ADVANCES.UPDATE(rowId), payload);
    } catch (error) {
      toast.error(error.message || 'Failed to update advance record');
      fetchAdvances();
    }
  };

  // Handle Create Advance from Modal
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      notifyLocked('add advance record');
      return;
    }

    const targetCompanyId = selectedCompanyFilter || (activeCompanies[0]?.id || activeCompanies[0]?._id);
    if (!targetCompanyId) {
      toast.error('Please create or select an active company first.');
      return;
    }

    if (!newForm.riderName.trim()) {
      toast.error('Rider Name is required.');
      return;
    }

    try {
      const payload = {
        companyId: targetCompanyId,
        month: selectedMonthFilter,
        financialYear: selectedFinancialYear,
        date: newForm.date || new Date().toISOString().split('T')[0],
        riderName: newForm.riderName.trim(),
        riderId: newForm.riderId.trim(),
        advance: Number(newForm.advance) || 0,
        advanceCut: Number(newForm.advanceCut) || 0,
        remark: newForm.remark.trim(),
      };

      const res = await apiClient.post(ENDPOINTS.ADVANCES.CREATE, payload);
      if (res.success && res.data) {
        const created = {
          ...res.data,
          id: res.data._id || res.data.id,
        };
        setRows((prev) => [created, ...prev]);
        toast.success(`Advance record for '${created.riderName}' created successfully!`);
        setIsAddModalOpen(false);
        setNewForm({
          date: new Date().toISOString().split('T')[0],
          riderName: '',
          riderId: '',
          advance: '',
          advanceCut: '',
          remark: '',
        });
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create advance record');
    }
  };

  // Delete single row
  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      await apiClient.delete(ENDPOINTS.ADVANCES.DELETE(rowToDelete.id));
      setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
      setSelectedRowIds((prev) => prev.filter((id) => id !== rowToDelete.id));
      toast.success('Advance record deleted successfully.');
    } catch (error) {
      toast.error(error.message || 'Failed to delete advance record');
    } finally {
      setRowToDelete(null);
    }
  };

  // Bulk delete selected rows
  const handleConfirmBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    try {
      await apiClient.post(ENDPOINTS.ADVANCES.BULK_DELETE, { ids: selectedRowIds });
      setRows((prev) => prev.filter((r) => !selectedRowIds.includes(r.id)));
      toast.success(`Deleted ${selectedRowIds.length} advance records.`);
      setSelectedRowIds([]);
    } catch (error) {
      toast.error(error.message || 'Failed to bulk delete records');
    } finally {
      setIsBulkDeleteModalOpen(false);
    }
  };

  // Sample template headers & download
  const templateHeaders = [
    'Date',
    'Rider Name',
    'Rider ID',
    'Advance',
    'Advance Cut',
    'Remaining Amount',
    'Remark',
  ];

  const handleDownloadSample = (format = 'xlsx', targetCompany = null) => {
    const comp = targetCompany || currentCompany;
    const compName = (comp?.name || 'Company').trim().replace(/\s+/g, '_');
    const filename = `${compName}_Advance_Sample_Template_${selectedMonthFilter}`;
    const sampleRows = [
      [new Date().toISOString().split('T')[0], 'Shubham Wasnik', '123456', 5000, 2000, 3000, 'payout cycle 1 cut'],
    ];

    if (format === 'xlsx') {
      downloadExcel(templateHeaders, sampleRows, filename);
    } else {
      downloadCSV(templateHeaders, sampleRows, filename);
    }
    toast.success(`Downloaded ${comp?.name || 'Company'} sample advance template (${format.toUpperCase()})`);
  };

  // Export Data
  const handleExport = (format) => {
    setIsExportMenuOpen(false);
    const compName = (currentCompany?.name || 'Company').replace(/\s+/g, '_');
    const filename = `${compName}_Advance_Details_${selectedMonthFilter}_${selectedFinancialYear}`;

    const headers = [
      'Date',
      'Rider Name',
      'Rider ID',
      'Advance',
      'Advance Cut',
      'Remaining Amount',
      'Remark',
    ];

    const dataRows = displayedRows.map((r) => [
      r.date || '',
      r.riderName || '',
      r.riderId || '',
      r.advance || 0,
      r.advanceCut || 0,
      (Number(r.advance) || 0) - (Number(r.advanceCut) || 0),
      r.remark || '',
    ]);

    if (format === 'xlsx') {
      downloadExcel(headers, dataRows, filename);
      toast.success(`Exported ${displayedRows.length} records to Excel.`);
    } else {
      downloadCSV(headers, dataRows, filename);
      toast.success(`Exported ${displayedRows.length} records to CSV.`);
    }
  };

  // Handle File Upload (Excel / CSV)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!canEdit) {
      notifyLocked('upload advance file');
      e.target.value = '';
      return;
    }

    const targetCompanyId = selectedCompanyFilter || (activeCompanies[0]?.id || activeCompanies[0]?._id);
    if (!targetCompanyId) {
      toast.error('Please select an active company first.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (json.length === 0) {
          toast.error('The selected file has no data rows to import.');
          return;
        }

        const mappedRows = json.map((row) => {
          const keys = Object.keys(row);
          const findVal = (possibleKeys) => {
            for (const key of possibleKeys) {
              const matched = keys.find((k) => k.trim().toLowerCase() === key.toLowerCase());
              if (matched && row[matched] !== undefined && row[matched] !== '') {
                return row[matched];
              }
            }
            return '';
          };

          const rawDate = findVal(['Date', 'date', 'Entry Date', 'Date of Advance']);
          const rawRiderName = findVal(['Rider Name', 'Rider', 'Name', 'riderName', 'RiderName']);
          const rawRiderId = findVal(['Rider ID', 'RiderId', 'ID', 'rider_id', 'riderId', 'Emp ID']);
          const rawAdvance = findVal(['Advance', 'Advance Amount', 'advance', 'Total Advance']);
          const rawAdvanceCut = findVal(['Advance Cut', 'Advacnce Cut', 'AdvanceCut', 'advanceCut', 'Cut', 'Deduction']);
          const rawRemark = findVal(['Remark', 'Remarks', 'remark', 'Note', 'Comments', 'Description']);

          return {
            date: rawDate ? String(rawDate).trim() : new Date().toISOString().split('T')[0],
            riderName: String(rawRiderName || '').trim() || 'Rider',
            riderId: String(rawRiderId || '').trim(),
            advance: Number(rawAdvance) || 0,
            advanceCut: Number(rawAdvanceCut) || 0,
            remark: String(rawRemark || '').trim(),
          };
        });

        const res = await apiClient.post(ENDPOINTS.ADVANCES.BULK_IMPORT, {
          companyId: targetCompanyId,
          month: selectedMonthFilter,
          financialYear: selectedFinancialYear,
          rows: mappedRows,
        });

        if (res.success) {
          toast.success(`Successfully imported ${res.count || mappedRows.length} advance records!`);
          fetchAdvances();
        }
      } catch (err) {
        console.error('File parsing error:', err);
        toast.error('Failed to parse file. Please check format and try again.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0 gap-2 animate-fade-in">
      {/* Main Container Card */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Action Toolbar */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search rider name, ID, date, remark..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all bg-gray-50/50 hover:bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Delete Button */}
            {selectedRowIds.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedRowIds.length})</span>
              </button>
            )}

            {/* Download Sample Template Dropdown */}
            <SampleTemplateDropdown
              currentCompany={currentCompany}
              companies={companies}
              onDownload={handleDownloadSample}
              label="Sample Sheet"
            />

            {/* Hidden File Input for Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv, .xlsx, .xls"
              className="hidden"
            />

            {/* Upload Excel / CSV */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Import File</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => handleExport('xlsx')}
                    className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>CSV (.csv)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add Record Button */}
            <button
              type="button"
              onClick={() => {
                if (!canEdit) {
                  notifyLocked('add advance record');
                  return;
                }
                setNewForm({
                  date: new Date().toISOString().split('T')[0],
                  riderName: '',
                  riderId: '',
                  advance: '',
                  advanceCut: '',
                  remark: '',
                });
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-black hover:bg-gray-800 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>
          </div>
        </div>

        {/* Outstanding Advance Balances Alert Banner from Previous Months */}
        {outstandingAdvances.length > 0 && (
          <div className="mx-4 mt-4 p-3.5 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-amber-950">
                    {outstandingAdvances.length} Unpaid Advance Balance{outstandingAdvances.length > 1 ? 's' : ''} from Previous Month
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-mono font-bold text-[10px]">
                    Total Pending: ₹{outstandingAdvances.reduce((s, o) => s + (Number(o.remainingAmount) || 0), 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  Rider(s) have remaining advance from earlier months. Carry forward into <strong>{selectedMonthFilter}</strong> to continue deductions.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedCarryIds(outstandingAdvances.map((o) => o.id));
                setIsCarryForwardModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Carry Forward to {selectedMonthFilter}</span>
            </button>
          </div>
        )}

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Total Advance Given</span>
            <span className="text-sm sm:text-base font-black text-gray-900">
              ₹{displayedRows.reduce((sum, r) => sum + (Number(r.advance) || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">Total Advance Cut</span>
            <span className="text-sm sm:text-base font-black text-emerald-700">
              ₹{displayedRows.reduce((sum, r) => sum + (Number(r.advanceCut) || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">Remaining Balance</span>
            <span className="text-sm sm:text-base font-black text-amber-700">
              ₹{displayedRows.reduce((sum, r) => sum + ((Number(r.advance) || 0) - (Number(r.advanceCut) || 0)), 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">Total Records</span>
            <span className="text-sm sm:text-base font-black text-blue-700">
              {displayedRows.length} Records
            </span>
          </div>
        </div>

        {/* Advance Table */}
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
              <tr className="bg-[#F8FAFC] border-b border-gray-200/80 text-[11px] font-semibold text-gray-500 uppercase tracking-wider select-none">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={handleHeaderSelectAll}
                    className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4 min-w-[130px]">Date</th>
                <th className="py-3.5 px-4 min-w-[170px]">Rider Name</th>
                <th className="py-3.5 px-4 min-w-[120px]">Rider ID</th>
                <th className="py-3.5 px-4 min-w-[130px]">Advance (₹)</th>
                <th className="py-3.5 px-4 min-w-[130px]">Advance Cut (₹)</th>
                <th className="py-3.5 px-4 min-w-[150px]">Remaining Amount (₹)</th>
                <th className="py-3.5 px-4 min-w-[200px]">Remark</th>
                <th className="py-3.5 px-4 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-black border-t-transparent mb-2" />
                    <p>Loading advance records...</p>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">No advance records found</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Use "Import File" with Excel/CSV or click "Add Record" to record advances for riders.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isSelected = selectedRowIds.includes(row.id);
                  const remAmt = (Number(row.advance) || 0) - (Number(row.advanceCut) || 0);

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50/70 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(row.id)}
                          className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={row.date?.slice(0, 10) || ''}
                          disabled={!canEdit}
                          onChange={(e) => handleCellChange(row.id, 'date', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg px-2 py-1 text-xs text-gray-900 focus:outline-none transition-all"
                        />
                      </td>

                      {/* Rider Name */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={row.riderName || ''}
                          disabled={!canEdit}
                          onChange={(e) => handleCellChange(row.id, 'riderName', e.target.value)}
                          placeholder="Rider Name"
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg px-2 py-1 text-xs font-semibold text-gray-900 focus:outline-none transition-all"
                        />
                      </td>

                      {/* Rider ID */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={row.riderId || ''}
                          disabled={!canEdit}
                          onChange={(e) => handleCellChange(row.id, 'riderId', e.target.value)}
                          placeholder="e.g. 123456"
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg px-2 py-1 text-xs font-mono font-medium text-gray-700 focus:outline-none transition-all"
                        />
                      </td>

                      {/* Advance Amount */}
                      <td className="py-3 px-4">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.advance === 0 ? '' : row.advance}
                            disabled={!canEdit}
                            placeholder="0"
                            onChange={(e) => handleCellChange(row.id, 'advance', e.target.value)}
                            className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg pl-6 pr-2 py-1 text-xs font-bold text-gray-900 focus:outline-none transition-all"
                          />
                        </div>
                      </td>

                      {/* Advance Cut */}
                      <td className="py-3 px-4">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-500 text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.advanceCut === 0 ? '' : row.advanceCut}
                            disabled={!canEdit}
                            placeholder="0"
                            onChange={(e) => handleCellChange(row.id, 'advanceCut', e.target.value)}
                            className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg pl-6 pr-2 py-1 text-xs font-bold text-emerald-700 focus:outline-none transition-all"
                          />
                        </div>
                      </td>

                      {/* Remaining Amount */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black ${
                          remAmt > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          ₹{remAmt.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={row.remark || ''}
                          disabled={!canEdit}
                          placeholder="e.g. mene 2000 sfx ki payout cycle 1..."
                          onChange={(e) => handleCellChange(row.id, 'remark', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none transition-all"
                        />
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canEdit) {
                              notifyLocked('delete advance record');
                              return;
                            }
                            setRowToDelete(row);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Built-in Common Pagination (Permanently pinned at bottom) */}
        <Pagination
          className="shrink-0"
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </div>

      {/* Add New Advance Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Add Advance Record</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {currentCompany?.name || 'Company'} • {selectedMonthFilter}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={newForm.date}
                    onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Rider Name with Sleek Searchable Combobox */}
                <div className="relative" ref={riderComboboxRef}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Rider Name *
                    </label>
                    {companyRiders.length > 0 && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        {currentCompany?.name} ({companyRiders.length})
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shubham Wasnik"
                      value={newForm.riderName}
                      onFocus={() => {
                        if (companyRiders.length > 0) setIsRiderSuggestionsOpen(true);
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matched = companyRiders.find(
                          (r) => r.riderName && r.riderName.toLowerCase() === val.trim().toLowerCase()
                        );
                        setNewForm((prev) => ({
                          ...prev,
                          riderName: val,
                          riderId: matched?.riderId ? matched.riderId : prev.riderId,
                        }));
                        if (companyRiders.length > 0) setIsRiderSuggestionsOpen(true);
                      }}
                      className="w-full pl-9 pr-7 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all bg-white font-medium"
                    />
                    {companyRiders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsRiderSuggestionsOpen(!isRiderSuggestionsOpen)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-150 ${
                            isRiderSuggestionsOpen ? 'rotate-180 text-black' : ''
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Custom Floating Suggestion Menu */}
                  {isRiderSuggestionsOpen && filteredModalRiders.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        {currentCompany?.name} Riders ({filteredModalRiders.length})
                      </div>
                      {filteredModalRiders.map((r, idx) => (
                        <button
                          key={r.riderId ? `rider-${r.riderId}` : `idx-${idx}`}
                          type="button"
                          onClick={() => {
                            setNewForm((prev) => ({
                              ...prev,
                              riderName: r.riderName || prev.riderName,
                              riderId: r.riderId || prev.riderId,
                            }));
                            setIsRiderSuggestionsOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-semibold text-gray-900 truncate">
                              {r.riderName || 'Unknown Rider'}
                            </span>
                          </div>
                          {r.riderId && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-mono font-bold shrink-0 ml-2">
                              #{r.riderId}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rider ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Rider ID
                    </label>
                    <span className="text-[10px] text-gray-400">Auto-filled</span>
                  </div>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. 123456"
                      value={newForm.riderId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matched = companyRiders.find(
                          (r) => r.riderId && r.riderId.toLowerCase() === val.trim().toLowerCase()
                        );
                        setNewForm((prev) => ({
                          ...prev,
                          riderId: val,
                          riderName: matched?.riderName ? matched.riderName : prev.riderName,
                        }));
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-mono bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Previous Unpaid Advance Detected Alert Card */}
              {selectedRiderOutstanding && (
                <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-amber-950">
                        Previous Pending Balance: <span className="font-black text-amber-700">₹{selectedRiderOutstanding.remainingAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-[10px] text-amber-700">
                        From {selectedRiderOutstanding.previousMonth} (Advance: ₹{selectedRiderOutstanding.previousAdvance}, Cut: ₹{selectedRiderOutstanding.previousAdvanceCut})
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewForm((prev) => ({
                        ...prev,
                        advance: selectedRiderOutstanding.remainingAmount,
                        advanceCut: '',
                        remark: `Carried forward from ${selectedRiderOutstanding.previousMonth} (Prev Bal: ₹${selectedRiderOutstanding.remainingAmount})`,
                      }));
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shadow-2xs shrink-0 cursor-pointer"
                  >
                    Use ₹{selectedRiderOutstanding.remainingAmount}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Advance Amount (₹)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="5000"
                      value={newForm.advance}
                      onChange={(e) => setNewForm({ ...newForm, advance: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Advance Cut (₹)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="2000"
                      value={newForm.advanceCut}
                      onChange={(e) => setNewForm({ ...newForm, advanceCut: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-bold text-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Remaining calculation preview */}
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                <span className="text-xs text-gray-500 font-medium">Remaining Balance Preview:</span>
                <span className="text-xs font-bold text-amber-600">
                  {formatCurrency((Number(newForm.advance) || 0) - (Number(newForm.advanceCut) || 0))}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Remark / Note
                </label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <textarea
                    rows="2"
                    placeholder="e.g. mene 2000 sfx ki payout cycle 1..."
                    value={newForm.remark}
                    onChange={(e) => setNewForm({ ...newForm, remark: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-black hover:bg-gray-800 rounded-xl shadow-xs transition-colors"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Carry Forward Pending Advances Modal */}
      {isCarryForwardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-amber-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Zap className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Carry Forward Advances</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Target Month: <strong className="text-gray-800">{selectedMonthFilter}</strong> • {currentCompany?.name || 'Company'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCarryForwardModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500 pb-1">
                <span>Select riders with unpaid balances to carry forward into {selectedMonthFilter}:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCarryIds.length === outstandingAdvances.length) {
                      setSelectedCarryIds([]);
                    } else {
                      setSelectedCarryIds(outstandingAdvances.map((o) => o.id));
                    }
                  }}
                  className="text-xs font-bold text-black hover:underline cursor-pointer"
                >
                  {selectedCarryIds.length === outstandingAdvances.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {outstandingAdvances.map((item) => {
                  const isChecked = selectedCarryIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedCarryIds((prev) =>
                          prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                        );
                      }}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-50/40 transition-colors ${
                        isChecked ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <span>{item.riderName}</span>
                            {item.riderId && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                #{item.riderId}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            From: <span className="font-semibold text-gray-600">{item.previousMonth}</span> (Adv: ₹{item.previousAdvance}, Cut: ₹{item.previousAdvanceCut})
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          ₹{item.remainingAmount.toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">Opening Bal</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 text-[11px] text-gray-600">
                💡 <strong>How it works:</strong> Each selected rider will get a new record in <strong>{selectedMonthFilter}</strong> with <em>Advance = ₹Remaining Amount</em>, <em>Advance Cut = ₹0</em>, and <em>Remaining = ₹Remaining Amount</em>. When they repay this month (e.g. ₹300), just enter 300 in Advance Cut and the remaining updates live!
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <div className="text-xs text-gray-500">
                Selected: <strong className="text-gray-900">{selectedCarryIds.length}</strong> of {outstandingAdvances.length} riders
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCarryForwardModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200/60 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedCarryIds.length === 0 || carryingForward}
                  onClick={() => handleCarryForward()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{carryingForward ? 'Carrying Forward...' : `Carry Forward (${selectedCarryIds.length})`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(rowToDelete)}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Advance Record"
        message={`Are you sure you want to delete the advance entry for "${rowToDelete?.riderName || 'this rider'}"? This action cannot be undone.`}
        confirmText="Delete Record"
        confirmVariant="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Bulk Delete Advance Records"
        message={`Are you sure you want to delete ${selectedRowIds.length} selected advance records? This cannot be undone.`}
        confirmText={`Delete ${selectedRowIds.length} Records`}
        confirmVariant="danger"
      />
    </div>
  );
};
