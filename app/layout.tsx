import type {Metadata, Viewport} from 'next';
import {Source_Sans_3, Source_Serif_4} from 'next/font/google';
import type {ReactNode} from 'react';

import './globals.css';

// Source Serif 4 for long reading (its optical sizes tighten for display and
// open up for text); Source Sans 3 for UI, tables and numbers.
const serif = Source_Serif_4({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
});

const sans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
});

export const metadata: Metadata = {
  title: "Living Report concept: Japan's Silver Economy 2020–2050",
  description:
    'Unofficial concept by Uzo Okafor. Not affiliated with Lunon. Report text from Lunon Deep Research (MIT), unmodified.',
};

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: '#f4f5f4'},
    {media: '(prefers-color-scheme: dark)', color: '#131617'},
  ],
};

// Applies a saved theme before first paint, so a dark-theme reader never sees
// a light flash. Storage can be blocked, hence the try.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

// Next.js only reads a default export here (an exception to named exports).
export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{__html: themeScript}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
