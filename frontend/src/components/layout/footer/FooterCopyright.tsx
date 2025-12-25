import { Github, ExternalLink } from 'lucide-react';

export const FooterCopyright = () => {
    return (
        <div className="bg-primary border-t border-white/10 py-3">
            <div className="max-w-5xl mx-auto px-4 md:px-6">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
                    <p className="text-xs text-white/60">
                        © {new Date().getFullYear()} Microsoft Club GIKI. All Rights Reserved.
                    </p>
                    <div className="hidden md:block w-1 h-1 rounded-full bg-white/40" />
                    <a
                        href="https://github.com/hash-walker/transport-system"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80 transition-colors"
                    >
                        <Github className="w-3.5 h-3.5" />
                        <span>View on GitHub</span>
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </div>
    );
};

