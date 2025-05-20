import { redirect } from 'next/navigation';

export default function ConsultationRoute({ params }: { params: { id: string } }) {
  redirect(`/patients/${params.id}`);
  // Next.js redirects throw an error, so this component will not return JSX.
  // It's good practice to return null or an empty fragment if a return is syntactically required,
  // but redirect() makes that unreachable.
}
