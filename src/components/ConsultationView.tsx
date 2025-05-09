import PatientDetail from './PatientDetail';

interface ConsultationViewProps {
  patientId: string;
}

/**
 * Temporary compatibility wrapper: the full patient detail view already
 * includes a Consultation tab, so this simply delegates to it. This file is
 * kept to avoid breaking the `/consultation/[id]` route while we refactor the
 * navigation later.
 */
export default function ConsultationView({ patientId }: ConsultationViewProps) {
  return <PatientDetail patientId={patientId} />;
} 