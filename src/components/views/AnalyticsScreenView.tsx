'use client';
import React from "react";
import ContentSurface from '@/components/layout/ContentSurface';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

// Placeholder data for analytics view - define a type for this
interface AnalyticsEntry {
  date: string;
  consults: number;
  timeSaved: number;
  accuracyGain: number;
}

// Copied analyticsData from ForesightApp.tsx
const analyticsData: AnalyticsEntry[] = [
  { date: "Apr 18", consults: 14, timeSaved: 132, accuracyGain: 0.11 },
  { date: "Apr 19", consults: 18, timeSaved: 162, accuracyGain: 0.14 },
  { date: "Apr 20", consults: 20, timeSaved: 180, accuracyGain: 0.12 },
  { date: "Apr 21", consults: 16, timeSaved: 144, accuracyGain: 0.1 },
  { date: "Apr 22", consults: 21, timeSaved: 198, accuracyGain: 0.15 },
  { date: "Apr 23", consults: 19, timeSaved: 171, accuracyGain: 0.13 },
  { date: "Apr 24", consults: 7, timeSaved: 63, accuracyGain: 0.12 },
];

// AnalyticsView function from ForesightApp.tsx (approx. lines 979-1011)
export default function AnalyticsScreenView() {
  return (
    <ContentSurface fullBleed className="p-6 flex flex-col">
      <div className="mb-6">
        <h1 className="text-step-1 font-semibold">Usage Analytics (Mock)</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Table className="text-step-0">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Consults</TableHead>
              <TableHead>Minutes Saved</TableHead>
              <TableHead>Accuracy Gain</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analyticsData.map((d) => (
              <TableRow key={d.date}>
                <TableCell>{d.date}</TableCell>
                <TableCell>{d.consults}</TableCell>
                <TableCell>{d.timeSaved}</TableCell>
                <TableCell>{(d.accuracyGain * 100).toFixed(0)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ContentSurface>
  );
} 