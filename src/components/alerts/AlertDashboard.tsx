'use client';

import React, { useState, useEffect } from 'react';
import { UnifiedAlert, AlertType, AlertSeverity } from '@/types/alerts';
import { UnifiedAlertsService } from '@/lib/unifiedAlertsService';
import AlertList from './AlertList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  BarChart3, 
  AlertTriangle, 
  Pill, 
  Stethoscope,
  FileQuestion,
  TrendingUp,
  Brain
} from 'lucide-react';

interface AlertDashboardProps {
  patientId?: string;
  consultationId?: string;
  onAlertAction?: (alertId: string, action: string) => void;
}

interface AlertsByType {
  [key: string]: UnifiedAlert[];
}

export const AlertDashboard: React.FC<AlertDashboardProps> = ({
  patientId,
  consultationId,
  onAlertAction
}) => {
  const [alerts, setAlerts] = useState<UnifiedAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<UnifiedAlert[]>([]);
  const [alertsByType, setAlertsByType] = useState<AlertsByType>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'severity' | 'type'>('date');
  const [alertsService] = useState(() => new UnifiedAlertsService());
  const [refreshing, setRefreshing] = useState(false);

  const alertTypeConfig = {
    [AlertType.DRUG_INTERACTION]: {
      label: 'Drug Interactions',
      icon: Pill,
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    [AlertType.COMORBIDITY]: {
      label: 'Comorbidity Analysis',
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    [AlertType.ASSESSMENT_QUESTION]: {
      label: 'Assessment Questions',
      icon: FileQuestion,
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    [AlertType.DIAGNOSTIC_GAP]: {
      label: 'Diagnostic Gaps',
      icon: Brain,
      color: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    [AlertType.COMPLEX_CONDITION]: {
      label: 'Complex Conditions',
      icon: Stethoscope,
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    },
    [AlertType.MISSING_LAB_RESULT]: {
      label: 'Missing Lab Results',
      icon: AlertTriangle,
      color: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    [AlertType.CLINICAL_GUIDELINE]: {
      label: 'Clinical Guidelines',
      icon: FileQuestion,
      color: 'bg-cyan-100 text-cyan-800 border-cyan-200'
    },
    [AlertType.ABNORMAL_VITAL]: {
      label: 'Abnormal Vitals',
      icon: AlertTriangle,
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    [AlertType.COMORBIDITY_REMINDER]: {
      label: 'Comorbidity Reminders',
      icon: TrendingUp,
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  };

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      
      let loadedAlerts: UnifiedAlert[] = [];
      
      if (consultationId) {
        // Use encounterId filter since the service uses that field name
        const result = await alertsService.getAlerts({ encounterId: consultationId });
        loadedAlerts = result.alerts;
      } else if (patientId) {
        const result = await alertsService.getAlerts({ patientId });
        loadedAlerts = result.alerts;
      } else {
        // Load all alerts for overview
        const result = await alertsService.getAlerts();
        loadedAlerts = result.alerts;
      }
      
      // Only show post-consultation alerts (active status)
      const postConsultationAlerts = loadedAlerts.filter(alert => 
        alert.status === 'active' && !alert.isRealTime
      );
      
      setAlerts(postConsultationAlerts);
      
      // Group by type
      const grouped = postConsultationAlerts.reduce((acc, alert) => {
        const type = alert.alertType;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(alert);
        return acc;
      }, {} as AlertsByType);
      
      setAlertsByType(grouped);
      
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAlerts = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  useEffect(() => {
    loadAlerts();
  }, [patientId, consultationId]);

  useEffect(() => {
    let filtered = [...alerts];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(alert =>
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(alert => alert.alertType === selectedType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'severity':
          const severityOrder = { [AlertSeverity.CRITICAL]: 3, [AlertSeverity.WARNING]: 2, [AlertSeverity.INFO]: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        case 'type':
          return a.alertType.localeCompare(b.alertType);
        default:
          return 0;
      }
    });

    setFilteredAlerts(filtered);
  }, [alerts, searchQuery, selectedType, sortBy]);

  const getAlertTypeIcon = (type: AlertType) => {
    const config = alertTypeConfig[type];
    if (!config) return AlertTriangle;
    return config.icon;
  };

  const getAlertTypeLabel = (type: AlertType) => {
    const config = alertTypeConfig[type];
    return config?.label || type.replace(/_/g, ' ');
  };

  const getAlertTypeColor = (type: AlertType) => {
    const config = alertTypeConfig[type];
    return config?.color || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const totalAlerts = alerts.length;
  const uniqueTypes = Object.keys(alertsByType).length;

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                <p className="text-2xl font-bold">{totalAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Alert Types</p>
                <p className="text-2xl font-bold">{uniqueTypes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-sm text-gray-500">
                  {alerts.length > 0 
                    ? new Date(Math.max(...alerts.map(a => new Date(a.createdAt).getTime()))).toLocaleString()
                    : 'No alerts'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Post-Consultation Alerts
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAlerts}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              {Object.entries(alertTypeConfig).map(([type, config]) => (
                <option key={type} value={type}>
                  {config.label}
                </option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'severity' | 'type')}
              className="px-3 py-2 border border-gray-200 rounded-md text-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="severity">Sort by Severity</option>
              <option value="type">Sort by Type</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Alert Content */}
      <Tabs value={selectedType} onValueChange={setSelectedType} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="all" className="text-xs">
            All ({totalAlerts})
          </TabsTrigger>
          {Object.entries(alertsByType).map(([type, typeAlerts]) => {
            const config = alertTypeConfig[type as AlertType];
            const IconComponent = config?.icon || AlertTriangle;
            
            return (
              <TabsTrigger key={type} value={type} className="text-xs flex items-center gap-1">
                <IconComponent className="h-3 w-3" />
                {config?.label || type} ({typeAlerts.length})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {selectedType === 'all' && (
            <div className="space-y-6">
              {Object.entries(alertsByType).map(([type, typeAlerts]) => {
                const config = alertTypeConfig[type as AlertType];
                const IconComponent = config?.icon || AlertTriangle;
                
                return (
                  <Card key={type}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <IconComponent className="h-5 w-5" />
                        {config?.label || type.replace(/_/g, ' ')}
                        <Badge variant="outline" className="ml-auto">
                          {typeAlerts.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AlertList
                        alerts={typeAlerts}
                        onAction={onAlertAction}
                        showGrouping={false}
                      />
                    </CardContent>
                  </Card>
                );
              })}
              
              {Object.keys(alertsByType).length === 0 && !isLoading && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No alerts found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {Object.entries(alertsByType).map(([type, typeAlerts]) => (
          <TabsContent key={type} value={type}>
            <AlertList
              alerts={typeAlerts}
              onAction={onAlertAction}
              showGrouping={false}
            />
          </TabsContent>
        ))}
      </Tabs>

      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Loading alerts...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AlertDashboard; 