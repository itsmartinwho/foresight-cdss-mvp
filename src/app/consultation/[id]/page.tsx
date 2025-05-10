import { redirect } from 'next/navigation';

export default function ConsultationRoute({ params }: { params: { id: string } }) {
  redirect(`/patients/${params.id}`);
  return null;
}
