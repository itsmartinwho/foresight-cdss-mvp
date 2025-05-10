import { redirect } from 'next/navigation';

export default function ConsultationRoute({ params }: any) {
  redirect(`/patients/${params.id}`);
  return null;
}
