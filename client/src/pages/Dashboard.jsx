import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  PackageCheck,
  IndianRupee,
  TrendingDown,
  Coins,
  Wallet,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useRiders } from '../context/RiderContext';
import { useLock } from '../context/LockContext';
import { useTabRefresh } from '../context/RefreshContext';
import { formatCurrency, formatNumber, calculateCompanyStats } from '../utils/calculations';
import {
  PageHeader,
  StatCard,
  Card,
  DataTable,
  Button,
  IconButton,
  Badge,
  DatePicker,
  ProtectedAction,
  Modal,
  ConfirmationModal,
  Input,
  Select,
} from '../components/common';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { companies, fetchCompanies } = useCompany();
  const { riders, addRider, updateRider, deleteRider } = useRiders();
  const { canEdit } = useLock();

  // Tab Refresh Hook
  useTabRefresh(() => {
    if (typeof fetchCompanies === 'function') fetchCompanies();
  });

  // Filters
  const [dateFilter, setDateFilter] = useState('this_month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);

  // Rider Form State (No Phone)
  const initialFormState = {
    riderName: '',
    riderId: '',
    companyId: companies[0]?.id || '',
    vehicleNumber: '',
    deliveredPickupTotal: '',
    primary: '',
    clubbed: '',
    rateCard: '14',
    payout: '',
    loss: '0',
    advance: '0',
    finalPayout: '',
    paymentStatus: 'Pending',
    status: 'Active',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});

  // Computed Dashboard Aggregates
  const totalDeliveries = useMemo(
    () => riders.reduce((sum, r) => sum + (Number(r.deliveredPickupTotal) || 0), 0),
    [riders]
  );
  const totalPayout = useMemo(
    () => riders.reduce((sum, r) => sum + (Number(r.payout) || 0), 0),
    [riders]
  );
  const totalLoss = useMemo(
    () => riders.reduce((sum, r) => sum + (Number(r.loss) || 0), 0),
    [riders]
  );
  const totalAdvance = useMemo(
    () => riders.reduce((sum, r) => sum + (Number(r.advance) || 0), 0),
    [riders]
  );
  const finalPayoutTotal = useMemo(
    () => riders.reduce((sum, r) => sum + (Number(r.finalPayout) || 0), 0),
    [riders]
  );
  const pendingPaymentsTotal = useMemo(
    () =>
      riders
        .filter((r) => r.paymentStatus === 'Pending' || r.paymentStatus === 'Hold')
        .reduce((sum, r) => sum + (Number(r.finalPayout) || 0), 0),
    [riders]
  );

  // Filtered Riders for Excel-style table
  const filteredRiders = useMemo(() => {
    return riders.filter((r) => {
      const matchSearch =
        searchQuery === '' ||
        r.riderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.riderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.vehicleNumber && r.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCompany =
        selectedCompany === 'all' || r.companyId === selectedCompany;

      const matchStatus =
        selectedStatus === 'all' || r.paymentStatus === selectedStatus;

      return matchSearch && matchCompany && matchStatus;
    });
  }, [riders, searchQuery, selectedCompany, selectedStatus]);

  // Form Handlers
  const validateForm = () => {
    const errors = {};
    if (!formData.riderName.trim()) errors.riderName = 'Rider name is required';
    if (!formData.companyId) errors.companyId = 'Please select a company';
    if (!formData.deliveredPickupTotal && formData.deliveredPickupTotal !== 0)
      errors.deliveredPickupTotal = 'Deliveries count is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAdd = () => {
    setFormData({
      ...initialFormState,
      companyId: companies[0]?.id || '',
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (rider) => {
    setSelectedRider(rider);
    setFormData({
      riderName: rider.riderName || '',
      riderId: rider.riderId || '',
      companyId: rider.companyId || '',
      vehicleNumber: rider.vehicleNumber || '',
      deliveredPickupTotal: rider.deliveredPickupTotal || '',
      primary: rider.primary || '',
      clubbed: rider.clubbed || '',
      rateCard: rider.rateCard || '14',
      payout: rider.payout || '',
      loss: rider.loss || '0',
      advance: rider.advance || '0',
      finalPayout: rider.finalPayout || '',
      paymentStatus: rider.paymentStatus || 'Pending',
      status: rider.status || 'Active',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleOpenView = (rider) => {
    setSelectedRider(rider);
    setIsViewModalOpen(true);
  };

  const handleOpenDelete = (rider) => {
    setSelectedRider(rider);
    setIsDeleteModalOpen(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const success = addRider(formData);
    if (success) {
      setIsAddModalOpen(false);
    }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const success = updateRider(selectedRider.id, formData);
    if (success) {
      setIsEditModalOpen(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (!selectedRider) return;
    const success = deleteRider(selectedRider.id);
    if (success) {
      setIsDeleteModalOpen(false);
      setSelectedRider(null);
    }
  };

  // Rider Table Columns (No Phone)
  const columns = [
    {
      key: 'riderName',
      label: 'Rider Name',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-gray-900">{val}</div>
          <div className="text-[11px] text-gray-500">{row.vehicleNumber || 'No vehicle registered'}</div>
        </div>
      ),
    },
    {
      key: 'riderId',
      label: 'Rider ID',
      sortable: true,
      render: (val) => <span className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{val}</span>,
    },
    {
      key: 'companyId',
      label: 'Company',
      sortable: true,
      render: (val) => {
        const comp = companies.find((c) => c.id === val);
        return <span className="font-medium text-gray-700">{comp ? comp.name : 'Unknown'}</span>;
      },
    },
    {
      key: 'deliveredPickupTotal',
      label: 'Total Pickups',
      sortable: true,
      align: 'center',
      render: (val) => <span className="font-semibold text-gray-900">{val}</span>,
    },
    {
      key: 'primary',
      label: 'Primary',
      sortable: true,
      align: 'center',
    },
    {
      key: 'clubbed',
      label: 'Clubbed',
      sortable: true,
      align: 'center',
    },
    {
      key: 'rateCard',
      label: 'Rate (₹)',
      sortable: true,
      align: 'right',
      render: (val) => `₹${val}`,
    },
    {
      key: 'payout',
      label: 'Payout',
      sortable: true,
      align: 'right',
      render: (val) => <span className="font-medium text-gray-900">{formatCurrency(val)}</span>,
    },
    {
      key: 'loss',
      label: 'Loss',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={Number(val) > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
          {Number(val) > 0 ? `-₹${val}` : '₹0'}
        </span>
      ),
    },
    {
      key: 'advance',
      label: 'Advance',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className={Number(val) > 0 ? 'text-amber-700 font-medium' : 'text-gray-400'}>
          {Number(val) > 0 ? `-₹${val}` : '₹0'}
        </span>
      ),
    },
    {
      key: 'finalPayout',
      label: 'Final Payout',
      sortable: true,
      align: 'right',
      render: (val) => (
        <span className="font-bold text-[#E53935]">{formatCurrency(val)}</span>
      ),
    },
    {
      key: 'paymentStatus',
      label: 'Status',
      sortable: true,
      align: 'center',
      render: (val) => <Badge variant={val} dot>{val}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Eye}
            size="sm"
            title="View details"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenView(row);
            }}
          />
          <ProtectedAction actionName="edit rider details">
            <IconButton
              icon={Edit2}
              size="sm"
              title="Edit rider"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(row);
              }}
            />
          </ProtectedAction>
          <ProtectedAction actionName="delete this rider">
            <IconButton
              icon={Trash2}
              variant="danger"
              size="sm"
              title="Delete rider"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDelete(row);
              }}
            />
          </ProtectedAction>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Good Morning, Admin"
        subtitle="Rider Management Overview & Operations Summary"
        actions={
          <div className="flex items-center gap-3">
            <DatePicker
              preset={dateFilter}
              onPresetChange={(p) => setDateFilter(p)}
              isRange
            />
            <ProtectedAction actionName="add a new rider">
              <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
                Add Rider
              </Button>
            </ProtectedAction>
          </div>
        }
      />

      {/* 8 Statistics StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Companies"
          value={companies.length}
          description="Active contracted logistics partners"
          icon={Building2}
          trend={{ value: '+1 new', isPositive: true, label: 'this quarter' }}
        />
        <StatCard
          title="Total Riders"
          value={riders.length}
          description="Active delivery fleet personnel"
          icon={Users}
          trend={{ value: '+8.4%', isPositive: true, label: 'vs last month' }}
        />
        <StatCard
          title="Total Deliveries"
          value={formatNumber(totalDeliveries)}
          description="Completed pickup & drops"
          icon={PackageCheck}
          trend={{ value: '+14.2%', isPositive: true, label: 'vs last week' }}
        />
        <StatCard
          title="Total Payout"
          value={formatCurrency(totalPayout)}
          description="Gross rider compensation"
          icon={IndianRupee}
          trend={{ value: '+6.1%', isPositive: true, label: 'gross' }}
        />
        <StatCard
          title="Total Loss"
          value={formatCurrency(totalLoss)}
          description="Penalties & transit damage"
          icon={TrendingDown}
          iconColor="text-[#DC2626]"
          iconBg="bg-red-50"
          trend={{ value: '-2.4%', isPositive: true, label: 'deductions' }}
        />
        <StatCard
          title="Total Advance"
          value={formatCurrency(totalAdvance)}
          description="Disbursed fuel & emergency cash"
          icon={Coins}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          trend={{ value: '₹0 pending', isNeutral: true }}
        />
        <StatCard
          title="Final Payout"
          value={formatCurrency(finalPayoutTotal)}
          description="Net payable after deductions"
          icon={Wallet}
          iconColor="text-[#E53935]"
          iconBg="bg-[#FFEBEE]"
          trend={{ value: '₹12.4k avg/wk', isNeutral: true }}
        />
        <StatCard
          title="Pending Payments"
          value={formatCurrency(pendingPaymentsTotal)}
          description="Pending & hold payment balance"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          trend={{ value: 'Action required', isPositive: false }}
        />
      </div>

      {/* Company Overview Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1F2937]">Company Overview</h2>
            <p className="text-xs text-gray-500">Summary performance across partner fleets</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowRight}
            iconPosition="right"
            onClick={() => navigate('/companies')}
          >
            All Companies
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {companies.map((company) => {
            const stats = calculateCompanyStats(company.id, riders);
            return (
              <Card key={company.id} padding="normal" className="flex flex-col justify-between hover:border-gray-300">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{company.name}</h3>
                      <span className="text-[11px] font-mono text-gray-500">{company.code}</span>
                    </div>
                    <Badge variant={company.status} size="sm">
                      {company.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-gray-100 mb-4">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Riders</span>
                      <strong className="text-gray-800 text-sm font-semibold">{stats.totalRiders}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Deliveries</span>
                      <strong className="text-gray-800 text-sm font-semibold">{formatNumber(stats.totalDeliveries)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Payout</span>
                      <strong className="text-gray-800 text-sm font-semibold">{formatCurrency(stats.totalPayout)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Pending</span>
                      <strong className="text-amber-700 text-sm font-semibold">{formatCurrency(stats.pendingPayments)}</strong>
                    </div>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon={ArrowRight}
                  iconPosition="right"
                  onClick={() => navigate(`/companies/${company.id}`)}
                >
                  View Details
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Excel-Style Rider Management Table */}
      <Card
        title="Rider Management"
        subtitle="Manage fleet personnel, delivery logs, rate cards, and calculated payouts"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <ProtectedAction actionName="add a new rider">
              <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
                + Add Rider
              </Button>
            </ProtectedAction>
          </div>
        }
      >
        <div className="mb-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-72">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rider name, ID, bike..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="w-40">
              <Select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                options={[
                  { value: 'all', label: 'All Companies' },
                  ...companies.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>

            <div className="w-36">
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Hold', label: 'Hold' },
                ]}
              />
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredRiders}
          emptyTitle="No riders matching your filters"
          emptyDescription="Try clearing your search query or company filters to view fleet riders."
          emptyActionLabel="Reset Filters"
          onEmptyAction={() => {
            setSearchQuery('');
            setSelectedCompany('all');
            setSelectedStatus('all');
          }}
        />
      </Card>

      {/* ADD RIDER MODAL (NO PHONE FIELD) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Rider"
        subtitle="Register fleet rider with rate card and initial delivery logs"
        confirmLabel="Save Rider"
        onConfirm={handleAddSubmit}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Rider Full Name"
              value={formData.riderName}
              onChange={(e) => setFormData({ ...formData, riderName: e.target.value })}
              placeholder="e.g. Shubham Wasnik"
              error={formErrors.riderName}
              required
            />
            <Input
              label="Rider ID (Optional)"
              value={formData.riderId}
              onChange={(e) => setFormData({ ...formData, riderId: e.target.value })}
              placeholder="Auto-generated if empty"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Assigned Company"
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              error={formErrors.companyId}
              required
            />
            <Input
              label="Vehicle Registration No"
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
              placeholder="e.g. MH 02 CK 9942"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Total Pickups/Deliveries"
              type="number"
              value={formData.deliveredPickupTotal}
              onChange={(e) => setFormData({ ...formData, deliveredPickupTotal: e.target.value })}
              placeholder="e.g. 20"
              error={formErrors.deliveredPickupTotal}
              required
            />
            <Input
              label="Primary"
              type="number"
              value={formData.primary}
              onChange={(e) => setFormData({ ...formData, primary: e.target.value })}
              placeholder="e.g. 15"
            />
            <Input
              label="Clubbed"
              type="number"
              value={formData.clubbed}
              onChange={(e) => setFormData({ ...formData, clubbed: e.target.value })}
              placeholder="e.g. 5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Rate Card (₹/delivery)"
              type="number"
              value={formData.rateCard}
              onChange={(e) => setFormData({ ...formData, rateCard: e.target.value })}
              placeholder="12"
            />
            <Input
              label="Loss / Penalties (₹)"
              type="number"
              value={formData.loss}
              onChange={(e) => setFormData({ ...formData, loss: e.target.value })}
              placeholder="0"
            />
            <Input
              label="Advance Cash (₹)"
              type="number"
              value={formData.advance}
              onChange={(e) => setFormData({ ...formData, advance: e.target.value })}
              placeholder="0"
            />
          </div>

          <Select
            label="Payment Status"
            value={formData.paymentStatus}
            onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
            options={[
              { value: 'Paid', label: 'Paid' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Hold', label: 'Hold' },
            ]}
          />
        </form>
      </Modal>

      {/* EDIT RIDER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Rider Details"
        subtitle={`Updating record for ${selectedRider?.riderName}`}
        confirmLabel="Update Rider"
        onConfirm={handleEditSubmit}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Rider Full Name"
              value={formData.riderName}
              onChange={(e) => setFormData({ ...formData, riderName: e.target.value })}
              error={formErrors.riderName}
              required
            />
            <Input
              label="Rider ID"
              value={formData.riderId}
              onChange={(e) => setFormData({ ...formData, riderId: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Company"
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
            <Input
              label="Vehicle No"
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Total Pickups"
              type="number"
              value={formData.deliveredPickupTotal}
              onChange={(e) => setFormData({ ...formData, deliveredPickupTotal: e.target.value })}
              required
            />
            <Input
              label="Primary"
              type="number"
              value={formData.primary}
              onChange={(e) => setFormData({ ...formData, primary: e.target.value })}
            />
            <Input
              label="Clubbed"
              type="number"
              value={formData.clubbed}
              onChange={(e) => setFormData({ ...formData, clubbed: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Rate Card (₹)"
              type="number"
              value={formData.rateCard}
              onChange={(e) => setFormData({ ...formData, rateCard: e.target.value })}
            />
            <Input
              label="Loss (₹)"
              type="number"
              value={formData.loss}
              onChange={(e) => setFormData({ ...formData, loss: e.target.value })}
            />
            <Input
              label="Advance (₹)"
              type="number"
              value={formData.advance}
              onChange={(e) => setFormData({ ...formData, advance: e.target.value })}
            />
          </div>

          <Select
            label="Payment Status"
            value={formData.paymentStatus}
            onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
            options={[
              { value: 'Paid', label: 'Paid' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Hold', label: 'Hold' },
            ]}
          />
        </form>
      </Modal>

      {/* VIEW RIDER MODAL */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Rider Profile"
        subtitle={selectedRider?.riderName}
        maxWidth="max-w-xl"
        cancelLabel="Close"
      >
        {selectedRider && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <h4 className="text-base font-bold text-gray-900">{selectedRider.riderName}</h4>
                <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {selectedRider.riderId}</p>
              </div>
              <Badge variant={selectedRider.paymentStatus} dot>
                {selectedRider.paymentStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-gray-200 rounded-lg">
                <span className="text-gray-400 block text-[11px]">Company</span>
                <span className="font-semibold text-gray-800">
                  {companies.find((c) => c.id === selectedRider.companyId)?.name || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-lg">
                <span className="text-gray-400 block text-[11px]">Vehicle No</span>
                <span className="font-semibold text-gray-800">{selectedRider.vehicleNumber || 'N/A'}</span>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-lg">
                <span className="text-gray-400 block text-[11px]">Total Deliveries</span>
                <span className="font-bold text-gray-900 text-sm">{selectedRider.deliveredPickupTotal}</span>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-lg">
                <span className="text-gray-400 block text-[11px]">Gross Payout</span>
                <span className="font-semibold text-gray-800">{formatCurrency(selectedRider.payout)}</span>
              </div>
            </div>

            <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl space-y-2">
              <div className="text-xs font-bold text-gray-900">Payout Breakdown</div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Gross Payout:</span>
                <span>{formatCurrency(selectedRider.payout)}</span>
              </div>
              <div className="flex justify-between text-xs text-red-600">
                <span>Loss Deduction:</span>
                <span>-₹{selectedRider.loss}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-700">
                <span>Advance Deduction:</span>
                <span>-₹{selectedRider.advance}</span>
              </div>
              <div className="pt-2 border-t border-red-200 flex justify-between text-sm font-bold text-[#E53935]">
                <span>Final Net Payout:</span>
                <span>{formatCurrency(selectedRider.finalPayout)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Rider Record"
        message={`Are you sure you want to remove rider "${selectedRider?.riderName}"?`}
        confirmLabel="Delete Rider"
        variant="danger"
      />
    </div>
  );
};
