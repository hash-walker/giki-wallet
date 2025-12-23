import { Navbar } from './Navbar';
import {Footer} from "@/components/layout/Footer";
import {ReactNode} from "react";

interface PageLayoutProps {
    children?: ReactNode;
}

export const PageLayout = ({children}: PageLayoutProps) => {

    return (
        <div className="min-h-screen flex flex-col bg-light-background font-inter">
            {/* 1. Header (Fixed at top) */}
            <Navbar />

            {/* 2. Main Content (Grows to fill space) */}
            {/* 'flex-1' pushes the footer down if content is short */}
            <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
                {children}
            </main>
            <Footer />
        </div>
    );
};