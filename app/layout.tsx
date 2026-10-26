import type {Metadata, Viewport} from 'next';
import localFont from 'next/font/local';
import type {ReactNode} from 'react';

import './globals.css';

// Source Serif 4 for long reading, subset to the characters report 51 uses
// (scripts/subset-serif.ts) so the first load stays small. Japanese falls
// back to the system's Mincho. UI, tables and numbers use the system face
// (see globals.css), so controls feel native and there's one font less.
const sourceSerif = localFont({
  src: './fonts/source-serif-4-report.woff2',
  weight: '200 900',
  variable: '--font-source-serif',
  // Size the stand-in shown while the font loads from a serif, not Arial.
  adjustFontFallback: 'Times New Roman',
});

// The italic sets 15 phrases deep in the report, so it isn't preloaded.
const sourceSerifItalic = localFont({
  src: './fonts/source-serif-4-report-italic.woff2',
  weight: '400',
  style: 'italic',
  variable: '--font-source-serif-italic',
  preload: false,
  adjustFontFallback: 'Times New Roman',
});

const SITE = 'https://uzookafor.com/lunon-living-report/';
const TITLE = "Living Report concept: Japan's Silver Economy 2020–2050";
const DESCRIPTION =
  'Unofficial concept by Uzo Okafor. Not affiliated with Lunon. Report text from Lunon Deep Research (MIT), unmodified.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  // What a shared link unfurls to in messages and posts.
  openGraph: {
    type: 'website',
    url: SITE,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: 'og.png',
        width: 2400,
        height: 1260,
        alt: 'The report with a source card open in the margin, beside a chart',
      },
    ],
  },
  twitter: {card: 'summary_large_image'},
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
      className={`${sourceSerif.variable} ${sourceSerifItalic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{__html: themeScript}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
