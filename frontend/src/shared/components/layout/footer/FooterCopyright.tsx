import { Github, ExternalLink } from 'lucide-react';

export const FooterCopyright = () => {
    return (
        <div className="relative z-10 bg-black/20 border-t border-white/10 py-4">
            <div className="max-w-5xl mx-auto px-4 lg:px-6">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
                    <p className="text-xs text-zinc-400">
                        © {new Date().getFullYear()} Microsoft Club GIKI. All Rights Reserved.
                    </p>
                    <div className="hidden md:block w-1 h-1 rounded-full bg-zinc-700" />
                    <a
                        href="https://github.com/hash-walker/transport-system"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
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

