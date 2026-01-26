import { useGitHubContributors } from '@/hooks/useGitHubContributors';
import { FooterHeader, ContributorsSection, FooterCopyright } from './footer';

// Fallback creators if GitHub API fails or repo is private
const fallbackCreators = [
    { name: 'Abdullah', initials: 'A', avatar: null, url: null },
    { name: 'Hash Walker', initials: 'HW', avatar: null, url: null },
];

// Get initials from name
const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

export const Footer = () => {
    const { data: contributors, isLoading } = useGitHubContributors();

    // Use GitHub contributors if available, otherwise fallback
    const creators = contributors && contributors.length > 0
        ? contributors.map(contributor => ({
            name: contributor.login,
            initials: getInitials(contributor.login),
            avatar: contributor.avatar_url,
            url: contributor.html_url,
        }))
        : fallbackCreators;

    return (
        <footer className="mt-auto relative overflow-hidden bg-footer-bg text-white">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 lg:px-6 py-10 md:py-12">
                <FooterHeader />

                <div className="border-t border-white/10 my-8" />

                <div className="mb-8">
                    <p className="text-sm text-zinc-400 text-center md:text-left leading-relaxed">
                        <span className="font-semibold text-zinc-300">Note:</span> In case of non-availability of a seat, please contact the Transport Supervisor to arrange an additional vehicle.
                    </p>
                </div>

                <div className="border-t border-white/10 my-8" />

                <ContributorsSection contributors={creators} isLoading={isLoading} />
            </div>

            <FooterCopyright />
        </footer>
    );
};
