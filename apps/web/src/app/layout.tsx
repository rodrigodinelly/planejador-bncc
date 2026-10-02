import React from 'react';

export const metadata = {
  title: 'Planejador BNCC',
  description: 'Planejador pedagógico alinhado à BNCC com auxílio de IA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
