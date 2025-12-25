import { Mail, Bus } from 'lucide-react';

export const Footer = () => {
    return (
        <footer className="bg-primary text-white mt-auto">
            {/* Main Footer Content */}
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
                {/* Top Section */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Bus className="w-5 h-5" />
                        <span className="font-semibold">GIKI Transport</span>
                    </div>
                    <a 
                        href="mailto:abdullah@giki.edu.pk" 
                        className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
                    >
                        <Mail className="w-4 h-4" />
                        abdullah@giki.edu.pk
                    </a>
                </div>

                {/* Divider */}
                <div className="border-t border-white/20 mb-4" />

                {/* Disclaimer */}
                <p className="text-sm text-white/70 text-center md:text-left">
                    In case of non-availability of a seat, please contact the Transport Supervisor to arrange an additional vehicle.
                </p>
            </div>

            {/* Copyright Bar */}
            <div className="bg-primary/90 border-t border-white/10 py-3">
                <p className="text-center text-xs text-white/60">
                    © {new Date().getFullYear()} Microsoft Club GIKI. All Rights Reserved.
                </p>
            </div>
        </footer>
    );
};
