'use client';
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { patientDataService } from "@/lib/patientDataService";
import type { Patient, Admission } from "@/lib/types";

// PatientsList function from ForesightApp.tsx (approx. lines 1034-1124)
export default function PatientsListView({ onSelect }: { onSelect: (p: Patient) => void }) {
  const [upcomingRows, setUpcomingRows] = useState<{ patient: Patient | null; visit: Admission }[]>([]);
  const [pastRows, setPastRows] = useState<{ patient: Patient | null; visit: Admission }[]>([]);
  // Add isLoading state for better UX
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      if (patientDataService.getAllPatients().length === 0) { // Avoid re-fetching if already loaded
        await patientDataService.loadPatientData();
      }
      const now = new Date();
      const upcoming: { patient: Patient | null; visit: Admission }[] = [];
      const past: { patient: Patient | null; visit: Admission }[] = [];

      patientDataService.getAllAdmissions().forEach(({ patient, admission }) => {
        const arr = new Date(admission.scheduledStart) > now ? upcoming : past;
        arr.push({ patient, visit: admission });
      });

      upcoming.sort((a, b) => new Date(a.visit.scheduledStart).getTime() - new Date(b.visit.scheduledStart).getTime());
      past.sort((a, b) => new Date(b.visit.scheduledStart).getTime() - new Date(a.visit.scheduledStart).getTime());

      setUpcomingRows(upcoming);
      setPastRows(past);
      setIsLoading(false);
    };
    load();
  }, []);

  const displayName = (p: Patient | null) => {
    if (p?.name) return p.name;
    if (p?.firstName || p?.lastName) return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    return p?.id || "Unknown Patient";
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading patient list...</div>;
  }

  return (
    <div className="p-6">
      <Card className="bg-glass glass-dense backdrop-blur-lg">
        <CardHeader>
          <CardTitle className="text-step-1">Consultations</CardTitle>
          <CardDescription className="text-step-0 text-muted-foreground/80">Click a patient to open the workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="text-step-0">
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead className="w-48">Scheduled date</TableHead>
                <TableHead>Reason for visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingRows.length > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold text-sm pt-4 pb-2 text-foreground/80">Upcoming visits</TableCell>
                </TableRow>
              )}
              {upcomingRows.map(({ patient, visit }) => (
                <TableRow key={`upcoming_${visit.id}_${patient?.id ?? 'no-patient'}`} onClick={() => patient && onSelect(patient)} className={patient ? "cursor-pointer hover:bg-foreground/5" : "opacity-60"}>
                  <TableCell className="flex items-center gap-2">
                    {patient?.photo && (
                      <img src={patient.photo} alt={displayName(patient)} className="h-6 w-6 rounded-full inline-block mr-2" />
                    )}
                    {displayName(patient)}
                  </TableCell>
                  <TableCell>{new Date(visit.scheduledStart).toLocaleString()}</TableCell>
                  <TableCell>{visit.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
              {upcomingRows.length === 0 && pastRows.length === 0 && (
                 <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No consultations found.</TableCell></TableRow>
              )}
              {pastRows.length > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold text-sm pt-6 pb-2 text-foreground/80">Past visits</TableCell>
                </TableRow>
              )}
              {pastRows.map(({ patient, visit }) => (
                <TableRow key={`past_${visit.id}_${patient?.id ?? 'no-patient'}`} onClick={() => patient && onSelect(patient)} className={patient ? "cursor-pointer hover:bg-foreground/5" : "opacity-60"}>
                  <TableCell className="flex items-center gap-2">
                    {patient?.photo && (
                      <img src={patient.photo} alt={displayName(patient)} className="h-6 w-6 rounded-full inline-block mr-2" />
                    )}
                    {displayName(patient)}
                  </TableCell>
                  <TableCell>{new Date(visit.scheduledStart).toLocaleString()}</TableCell>
                  <TableCell>{visit.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 