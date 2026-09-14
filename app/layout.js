import './globals.css';
import { Inter, Poppins, Montserrat, Lato, Playfair_Display } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400','600','700','800'], variable: '--font-poppins', display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });
const lato = Lato({ subsets: ['latin'], weight: ['400','700','900'], variable: '--font-lato', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });

export const metadata = {
  title: 'Quiz SaaS',
  description: 'Sistema de quiz dinâmico de alta conversão'
};

export default function RootLayout({ children }) {
  const fontes = [inter, poppins, montserrat, lato, playfair]
    .map(f => f.variable)
    .join(' ');

  return (
    <html lang="pt-BR" className={fontes}>
      <body>{children}</body>
    </html>
  );
}