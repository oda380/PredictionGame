import type { Metadata } from 'next'
import { Inter, Rajdhani } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const rajdhani = Rajdhani({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ['latin'],
    variable: '--font-rajdhani'
})

export const metadata: Metadata = {
    title: 'BitForecast | BTC Price Prediction Arena',
    description: 'Predict Bitcoin prices and compete for rewards in this premium Web3 prediction game on Base.',
    icons: {
        icon: '/favicon.png',
        apple: '/favicon.png',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} ${rajdhani.variable} font-sans antialiased selection:bg-brand-indigo/30 overflow-x-hidden min-h-screen`}>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}
