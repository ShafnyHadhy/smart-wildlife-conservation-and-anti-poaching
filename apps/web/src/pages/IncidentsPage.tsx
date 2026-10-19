
import { useEffect, useState } from 'react';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { apiClient } from '../services/apiClient';
import { Incident } from '@wildlife/shared';

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadIncidents() {
      try {
        setLoading(true);
        setError(null);

        const data = await apiClient.get<Incident[]>('/incidents');
        setIncidents(data);
      } catch (err) {
        console.error('Failed to load incidents:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load incidents from the backend.'
        );
      } finally {
        setLoading(false);
      }
    }

    void loadIncidents();
  }, []);

  const handleConfirmIncident = async (incidentId: string) => {
    try {
      setReviewingId(incidentId);
      setError(null);

      const updatedIncident = await apiClient.patch<Incident>(
        `/incidents/${incidentId}/status`,
        { status: 'REVIEWED' }
      );

      setIncidents((previous) =>
        previous.map((incident) =>
          incident.id === incidentId ? updatedIncident : incident
        )
      );
    } catch (err) {
      console.error('Failed to review incident:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to confirm incident.'
      );
    } finally {
      setReviewingId(null);
    }
  };

  const filteredIncidents = incidents.filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  const submittedCount = incidents.filter(
    (item) => item.status === 'SUBMITTED'
  ).length;

  const reviewedCount = incidents.filter(
    (item) => item.status === 'REVIEWED'
  ).length;

  const columns: Column<Incident>[] = [
    {
      header: 'INCIDENT DETAILS',
      accessor: (item) => (
        <div className="py-1 space-y-1">
          <p className="font-semibold text-[#20372B] text-sm">
            {item.incidentType.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-stone-500 line-clamp-2 max-w-xs leading-relaxed">
            {item.description}
          </p>
        </div>
      ),
    },
    {
      header: 'REPORTED BY',
      accessor: (item) => (
        <div>
          <p className="text-sm font-medium text-[#34473B]">
            {item.rangerName ||
              item.rangerId?.slice(0, 8) ||
              'Field Ranger'}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            Wildlife Ranger
          </p>
        </div>
      ),
    },
    {
      header: 'GPS COORDINATES',
      accessor: (item) => (
        <span className="text-xs font-mono text-stone-600 whitespace-nowrap">
          {Number(item.latitude).toFixed(4)}, {' '}
          {Number(item.longitude).toFixed(4)}
        </span>
      ),
    },
    {
      header: 'DATE REPORTED',
      accessor: (item) => (
        <span className="text-sm text-stone-600 whitespace-nowrap">
          {item.reportedAt
            ? new Date(item.reportedAt).toLocaleDateString(
                'en-GB',
                {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }
              )
            : 'Recent'}
        </span>
      ),
    },
    {
      header: 'STATUS',
      accessor: (item) => (
        <StatusBadge status={item.status} size="sm" />
      ),
    },
    {
      header: 'ACTION',
      accessor: (item) =>
        item.status === 'SUBMITTED' ? (
          <button
            type="button"
            disabled={reviewingId !== null}
            onClick={() => void handleConfirmIncident(item.id)}
            className="
              min-w-[96px]
              rounded-lg
              bg-[#28563B]
              px-4 py-2
              text-xs font-semibold text-white
              transition-colors duration-150
              hover:bg-[#1D402B]
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {reviewingId === item.id
              ? 'Confirming...'
              : 'Confirm'}
          </button>
        ) : item.status === 'REVIEWED' ? (
          <span className="inline-flex items-center rounded-lg border border-[#C8DDD0] bg-[#EDF6EF] px-3 py-1.5 text-xs font-semibold text-[#28603D]">
            Confirmed
          </span>
        ) : (
          <span className="text-xs text-stone-400">
            —
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* Page header */}
      <div className="rounded-2xl border border-[#E5E8DE] bg-white px-6 py-6 shadow-sm sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#68836E]">
              Wildlife Conservation / Field Operations
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-[#20372B] sm:text-3xl">
              Incident Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              Monitor field incident reports, review wildlife-related
              activities, and confirm submitted ranger reports.
            </p>
          </div>

          <div className="self-start rounded-xl border border-[#DFE8DD] bg-[#F5F9F4] px-4 py-3 sm:self-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#69816F]">
              Total Reports
            </p>
            <p className="mt-1 text-2xl font-bold text-[#234832]">
              {incidents.length}
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Total Incidents',
            value: incidents.length,
            accent: 'bg-[#284C36]',
            textColor: 'text-[#20372B]',
          },
          {
            label: 'Awaiting Review',
            value: submittedCount,
            accent: 'bg-[#C6934E]',
            textColor: 'text-[#805D2D]',
          },
          {
            label: 'Reviewed Reports',
            value: reviewedCount,
            accent: 'bg-[#3C8862]',
            textColor: 'text-[#28603D]',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[#E5E8DE] bg-white px-5 py-5 shadow-sm"
          >
            <div className={`mb-4 h-1 w-9 rounded-full ${card.accent}`} />
            <p className="text-xs font-medium text-stone-500">
              {card.label}
            </p>
            <p className={`mt-2 text-3xl font-bold ${card.textColor}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main incident table panel */}
      <div className="overflow-hidden rounded-2xl border border-[#E5E8DE] bg-white shadow-sm">

        {/* Table heading and filters */}
        <div className="flex flex-col gap-4 border-b border-[#EDF0E9] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-[#20372B]">
              Ranger Incident Reports
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              View and confirm reports submitted by field rangers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'ALL', label: 'All Reports' },
              { key: 'SUBMITTED', label: 'Pending Review' },
              { key: 'REVIEWED', label: 'Reviewed' },
            ].map((statusFilter) => (
              <button
                key={statusFilter.key}
                type="button"
                onClick={() => setFilter(statusFilter.key)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  filter === statusFilter.key
                    ? 'bg-[#28563B] text-white shadow-sm'
                    : 'border border-[#E2E7DE] bg-[#F8FAF7] text-[#536558] hover:bg-[#EDF3EB]'
                }`}
              >
                {statusFilter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div
            role="alert"
            className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Incidents table */}
        <div className="p-3 sm:p-5">
          {loading ? (
            <LoadingState message="Fetching wildlife incident logs..." />
          ) : (
            <DataTable
              columns={columns}
              data={filteredIncidents}
              keyExtractor={(item) => item.id}
              emptyMessage="No incidents match the selected filter."
            />
          )}
        </div>

        {/* Table footer */}
        {!loading && (
          <div className="border-t border-[#EDF0E9] bg-[#FAFBF8] px-6 py-4">
            <p className="text-xs text-stone-500">
              Showing{' '}
              <span className="font-semibold text-[#28563B]">
                {filteredIncidents.length}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-[#28563B]">
                {incidents.length}
              </span>{' '}
              incident reports
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
