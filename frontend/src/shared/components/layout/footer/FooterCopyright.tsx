export const FooterCopyright = () => {
    return (
        <div className="relative z-10 bg-black/20 border-t border-white/10 py-4">
            <div className="max-w-5xl mx-auto px-4 lg:px-6">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
                    <p className="text-xs text-zinc-400">
                        © {new Date().getFullYear()} Microsoft Club GIKI. All Rights Reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

