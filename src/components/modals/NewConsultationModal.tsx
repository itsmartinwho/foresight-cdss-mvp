'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { patientDataService } from '@/lib/patientDataService';
import type { Patient } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface Props {
  /** Controls open state from parent */
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function NewConsultationModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<'existing' | 'new'>('existing');
  const router = useRouter();

  // Existing patients search
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // New patient form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');

  // Shared fields
  const [reason, setReason] = useState('');
  const [scheduledStart, setScheduledStart] = useState(() => {
    // default to now in local datetime-local format
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // local
    return now.toISOString().slice(0, 16);
  });

  useEffect(() => {
    const load = async () => {
      if (patientDataService.getAllPatients().length === 0) {
        await patientDataService.loadPatientData();
      }
      setAllPatients(patientDataService.getAllPatients());
    };
    load();
  }, [open]);

  const filteredPatients = allPatients.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.firstName?.toLowerCase().includes(term) ||
      p.lastName?.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term)
    );
  });

  const handleCreate = async () => {
    try {
      if (tab === 'existing') {
        if (!selectedPatient) return;
        const ad = await patientDataService.createNewAdmission(selectedPatient.id, {
          reason: reason || undefined,
          scheduledStart: new Date(scheduledStart).toISOString(),
        });
        router.push(`/patients/${selectedPatient.id}?ad=${ad.id}`);
      } else {
        const { patient, admission } = await patientDataService.createNewPatientWithAdmission(
          { firstName, lastName, gender, dateOfBirth: dob || undefined },
          { reason: reason || undefined, scheduledStart: new Date(scheduledStart).toISOString() }
        );
        router.push(`/patients/${patient.id}?ad=${admission.id}`);
      }
      onOpenChange(false);
    } catch (e) {
      console.error('Failed to create consultation', e);
      alert('Could not start consultation. See console for details.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{/* hidden trigger; open controlled externally */}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start New Consultation</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="existing">Existing Patient</TabsTrigger>
            <TabsTrigger value="new">New Patient</TabsTrigger>
          </TabsList>

          {/* Existing patient tab */}
          <TabsContent value="existing">
            <div className="space-y-4">
              <Input
                placeholder="Search patient by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredPatients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`px-3 py-2 cursor-pointer hover:bg-muted/50 ${
                      selectedPatient?.id === p.id ? 'bg-muted' : ''
                    }`}
                  >
                    {p.name || `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.id}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* New patient tab */}
          <TabsContent value="new">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Input placeholder="Gender" value={gender} onChange={(e) => setGender(e.target.value)} />
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* shared fields */}
        <div className="space-y-3 mt-4">
          <Input
            placeholder="E.g., joint pain, generalized inflammation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Input
            type="datetime-local"
            value={scheduledStart}
            onChange={(e) => setScheduledStart(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={
            tab === 'existing' ? !selectedPatient : !firstName.trim() || !lastName.trim()
          }>
            Start Consultation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 