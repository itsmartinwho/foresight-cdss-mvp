'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { UnifiedAlert, AlertType, AlertSeverity, AlertStatus, AlertFilterOptions } from '@/types/alerts';
import AlertList from './AlertList';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  MoreHorizontal
} from 'lucide-react';

interface AlertDashboardProps {
  patientId?: string;
  encounterId?: string;
  initialAlerts?: UnifiedAlert[];
  onAlertAccept?: (alertId: string) => void;
  onAlertDismiss?: (alertId: string) => void;
  onNavigate?: (target: string) => void;
  onRefresh?: () => void;
  showFilters?: boolean;
  showSearch?: boolean;
  compact?: boolean;
}

type SortField = 'created' | 'severity' | 'type' | 'confidence';
type SortDirection = 'asc' | 'desc';

export const AlertDashboard: React.FC<AlertDashboardProps> = ({
  patientId,
  encounterId,
  initialAlerts = [],
  onAlertAccept,
  onAlertDismiss,
  onNavigate,
  onRefresh,
  showFilters = true,
  showSearch = true,
  compact = false
}) => {
  const [alerts, setAlerts] = useState<UnifiedAlert[]>(initialAlerts);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<AlertFilterOptions>({
    statuses: [AlertStatus.ACTIVE]
  });
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Update alerts when initialAlerts changes
  useEffect(() => {
    setAlerts(initialAlerts);
  }, [initialAlerts]);

  // Filter and sort alerts
  const filteredAndSortedAlerts = useMemo(() => {
    let filtered = alerts;

    // Apply text search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(alert =>
        alert.title.toLowerCase().includes(searchLower) ||
        alert.message.toLowerCase().includes(searchLower) ||
        alert.suggestion?.toLowerCase().includes(searchLower) ||
        alert.alertType.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    if (filters.alertTypes?.length) {
      filtered = filtered.filter(alert => filters.alertTypes!.includes(alert.alertType));
    }
    
    if (filters.severities?.length) {
      filtered = filtered.filter(alert => filters.severities!.includes(alert.severity));
    }
    
    if (filters.statuses?.length) {
      filtered = filtered.filter(alert => filters.statuses!.includes(alert.status));
    }
    
    if (filters.categories?.length) {
      filtered = filtered.filter(alert => 
        alert.category && filters.categories!.includes(alert.category)
      );
    }

    if (filters.isRealTime !== undefined) {
      filtered = filtered.filter(alert => alert.isRealTime === filters.isRealTime);
    }

    if (filters.isPostConsultation !== undefined) {
      filtered = filtered.filter(alert => alert.isPostConsultation === filters.isPostConsultation);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'severity':
          const severityOrder = { 
            [AlertSeverity.CRITICAL]: 3, 
            [AlertSeverity.WARNING]: 2, 
            [AlertSeverity.INFO]: 1 
          };
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'type':
          comparison = a.alertType.localeCompare(b.alertType);
          break;
        case 'confidence':
          comparison = (a.confidenceScore || 0) - (b.confidenceScore || 0);
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [alerts, searchTerm, filters, sortField, sortDirection]);

  // Get alert statistics
  const alertStats = useMemo(() => {
    const active = alerts.filter(a => a.status === AlertStatus.ACTIVE);
    const critical = active.filter(a => a.severity === AlertSeverity.CRITICAL);
    const warning = active.filter(a => a.severity === AlertSeverity.WARNING);
    const info = active.filter(a => a.severity === AlertSeverity.INFO);

    return {
      total: alerts.length,
      active: active.length,
      critical: critical.length,
      warning: warning.length,
      info: info.length
    };
  }, [alerts]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleFilterChange = (newFilters: Partial<AlertFilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await onRefresh?.();
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({ statuses: [AlertStatus.ACTIVE] });
    setSearchTerm('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {patientId ? 'Patient Alerts' : 'All Alerts'}
          </h2>
          <p className="text-sm text-gray-600">
            {alertStats.active} active alert{alertStats.active !== 1 ? 's' : ''} 
            {alertStats.critical > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                {alertStats.critical} critical
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
            title="Refresh alerts"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          {showFilters && (
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`p-2 rounded-md transition-colors ${
                showFiltersPanel 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Toggle filters"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-gray-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{alertStats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-semibold text-blue-600">{alertStats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Critical</p>
              <p className="text-2xl font-semibold text-red-600">{alertStats.critical}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Warning</p>
              <p className="text-2xl font-semibold text-amber-600">{alertStats.warning}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="bg-white border rounded-lg p-4">
          {/* Search Bar */}
          {showSearch && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Filters Panel */}
          {showFiltersPanel && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Alert Types Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Types
                  </label>
                  <select
                    multiple
                    value={filters.alertTypes || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value as AlertType);
                      handleFilterChange({ alertTypes: selected });
                    }}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    size={4}
                  >
                    {Object.values(AlertType).map(type => (
                      <option key={type} value={type}>
                        {type.split('_').join(' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity
                  </label>
                  <div className="space-y-2">
                    {Object.values(AlertSeverity).map(severity => (
                      <label key={severity} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.severities?.includes(severity) || false}
                          onChange={(e) => {
                            const current = filters.severities || [];
                            const updated = e.target.checked
                              ? [...current, severity]
                              : current.filter(s => s !== severity);
                            handleFilterChange({ severities: updated });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{severity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="space-y-2">
                    {Object.values(AlertStatus).map(status => (
                      <label key={status} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.statuses?.includes(status) || false}
                          onChange={(e) => {
                            const current = filters.statuses || [];
                            const updated = e.target.checked
                              ? [...current, status]
                              : current.filter(s => s !== status);
                            handleFilterChange({ statuses: updated });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex items-center space-x-4 pt-2 border-t">
                <button
                  onClick={() => handleFilterChange({ isRealTime: true, isPostConsultation: undefined })}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    filters.isRealTime === true
                      ? 'bg-orange-100 text-orange-800 border-orange-200'
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Real-time only
                </button>
                
                <button
                  onClick={() => handleFilterChange({ isPostConsultation: true, isRealTime: undefined })}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    filters.isPostConsultation === true
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Post-consultation only
                </button>
                
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-gray-500">Sort by:</span>
        
        {(['created', 'severity', 'type', 'confidence'] as SortField[]).map(field => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
              sortField === field
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span className="capitalize">{field}</span>
            {sortField === field && (
              sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
            )}
          </button>
        ))}
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {filteredAndSortedAlerts.length} of {alerts.length} alerts
      </div>

      {/* Alert List */}
      <AlertList
        alerts={filteredAndSortedAlerts}
        onAccept={onAlertAccept}
        onDismiss={onAlertDismiss}
        onNavigate={onNavigate}
        compact={compact}
      />
    </div>
  );
};

export default AlertDashboard; 