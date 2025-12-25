import { Mail, Bus } from 'lucide-react';

export const FooterHeader = () => {
    return (
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
                <span>abdullah@giki.edu.pk</span>
            </a>
        </div>
    );
};

