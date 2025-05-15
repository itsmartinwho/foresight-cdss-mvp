'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { patientDataService } from '@/lib/patientDataService';
import type { Patient } from '@/lib/types';
import { useRouter } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
  const [scheduledDate, setScheduledDate] = useState<Date | null>(new Date());

  // Validation
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [shake, setShake] = useState(false);

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
    // reset errors
    const newErrors: Record<string, boolean> = {};
    if (tab === 'existing') {
      if (!selectedPatient) newErrors.selectedPatient = true;
    } else {
      if (!firstName.trim()) newErrors.firstName = true;
      if (!lastName.trim()) newErrors.lastName = true;
      if (!gender) newErrors.gender = true;
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      // trigger shake animation
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    try {
      if (tab === 'existing') {
        if (!selectedPatient) return;
        const ad = await patientDataService.createNewAdmission(selectedPatient.id, {
          reason: reason || undefined,
          scheduledStart: scheduledDate ? scheduledDate.toISOString() : undefined,
        });
        router.push(`/patients/${selectedPatient.id}?ad=${ad.id}`);
      } else {
        const { patient, admission } = await patientDataService.createNewPatientWithAdmission(
          { firstName, lastName, gender, dateOfBirth: dob || undefined },
          { reason: reason || undefined, scheduledStart: scheduledDate ? scheduledDate.toISOString() : undefined }
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
      <DialogContent className={`max-w-lg ${shake ? 'animate-shake' : ''}`}>
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
              <label className="font-semibold text-step--1 flex items-center">
                Select patient<span className="text-destructive ml-1">*</span>{errors.selectedPatient && <span className="text-destructive text-xs ml-2">Required field</span>}
              </label>
              <div className="border rounded-md overflow-hidden">
                <div className="border-b p-1">
                  <Input
                    placeholder="Search patient by name or ID..."
                    className="placeholder:text-muted-foreground text-step--1"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
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
              {/* Reason */}
              <div>
                <label className="font-semibold text-step--1">Reason for visit</label>
                <Input
                  placeholder="E.g., joint pain, generalized inflammation"
                  className="placeholder:text-muted-foreground text-step--1 mt-1"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              {/* Date time */}
              <div>
                <label className="font-semibold text-step--1">Date and time</label>
                <DatePicker
                  selected={scheduledDate}
                  onChange={(d) => setScheduledDate(d)}
                  showTimeSelect
                  dateFormat="Pp"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-step--1"
                />
              </div>
            </div>
          </TabsContent>

          {/* New patient tab */}
          <TabsContent value="new">
            <div className="space-y-3">
              <p className="font-semibold text-step--1">Patient info</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input placeholder="*First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  {errors.firstName && <span className="text-destructive text-xs ml-1">Required field</span>}
                </div>
                <div className="flex-1">
                  <Input placeholder="*Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  {errors.lastName && <span className="text-destructive text-xs ml-1">Required field</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="">*Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && <span className="text-destructive text-xs ml-1">Required field</span>}
                </div>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
              {/* Reason */}
              <div>
                <label className="font-semibold text-step--1">Reason for visit</label>
                <Input
                  placeholder="E.g., joint pain, generalized inflammation"
                  className="placeholder:text-muted-foreground text-step--1 mt-1"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              {/* Date time */}
              <div>
                <label className="font-semibold text-step--1">Date and time</label>
                <DatePicker
                  selected={scheduledDate}
                  onChange={(d) => setScheduledDate(d)}
                  showTimeSelect
                  dateFormat="Pp"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-step--1"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* shared fields now handled inside tabs */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} className="inline-flex items-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-4 py-1 text-xs font-medium text-white shadow-sm transition hover:brightness-110 focus:outline-none">
            Start Consultation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 