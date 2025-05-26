"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Patient } from "@/lib/types" // Assuming Patient type is available
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Eye } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Helper to display name and avatar
const PatientNameCell = ({ row }: { row: any }) => {
  const patient = row.original as Patient;
  const name = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  const initial = name.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <div className="flex items-center space-x-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={patient.photo || undefined} alt={name} />
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <span>{name || 'Unknown Patient'}</span>
    </div>
  );
};


export const columns: ColumnDef<Patient>[] = [
  {
    accessorKey: "name", // Using "name" but rendered via PatientNameCell for avatar
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: PatientNameCell,
  },
  {
    accessorKey: "dateOfBirth",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date of Birth
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const dateOfBirth = row.getValue("dateOfBirth") as string;
      return dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : 'N/A';
    }
  },
  {
    accessorKey: "gender",
    header: "Gender",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const patient = row.original as Patient
      return (
        <Link href={`/patients/${patient.id}`}>
          <Button variant="outline" size="sm">
            <Eye className="mr-2 h-4 w-4" /> View Details
          </Button>
        </Link>
      )
    },
  },
] 