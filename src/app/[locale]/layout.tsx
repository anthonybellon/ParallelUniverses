import { NextIntlClientProvider } from 'next-intl';
import { IBM_Plex_Mono, VT323 } from 'next/font/google';
import { getMessages } from 'next-intl/server';
import '../../styles/globals.css';
import StoreHydrator from '@components/providers/StoreHydrator';
import Toaster from '@components/molecules/Toaster';

const terminalFont = VT323({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  variable: '--font-terminal',
  display: 'swap',
});

const textFont = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${terminalFont.variable} ${textFont.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <StoreHydrator />
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
