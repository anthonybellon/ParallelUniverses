import { redirect } from 'next/navigation';
import { logHref } from '@utils/routes';

/** The book became the log; old links still work. */
export default function BookRedirect({
  params,
  searchParams,
}: {
  params: { locale: string; id: string };
  searchParams: { event?: string };
}) {
  redirect(
    logHref(params.locale, decodeURIComponent(params.id), searchParams.event),
  );
}
