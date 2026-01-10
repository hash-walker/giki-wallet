import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '@/shared/components/layout';
import { BaseNavbar } from '@/shared/components/layout/navbar/BaseNavbar';
import { Button } from '@/shared/components/ui/button';

interface AuthLayoutProps {
    children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
    return (
        <div className="min-h-screen bg-light-background font-inter flex flex-col">
            <BaseNavbar
                logoLink="/"
                rightActions={
                    <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 font-medium">
                        <Link to="/">Back to Home</Link>
                    </Button>
                }
                maxWidth="default"
            />

            <main className="flex-1 max-w-5xl mx-auto px-4 py-6 md:py-12 w-full">
                {/* Mobile-friendly back button (navbar rightActions are desktop-only) */}
                <div className="lg:hidden mb-4">
                    <Button asChild variant="outline" size="sm" className="font-semibold">
                        <Link to="/">Back to Home</Link>
                    </Button>
                </div>

                {children}
            </main>

            <Footer />
        </div>
    );
};


