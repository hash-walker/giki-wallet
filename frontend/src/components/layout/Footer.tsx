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
    const { data: contributors, isLoading, isError } = useGitHubContributors();
    
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
        <footer className="bg-primary text-white mt-auto">
            <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
                <FooterHeader />

                <div className="border-t border-white/20 my-6" />

                <div className="mb-6">
                    <p className="text-sm text-white/70 text-center md:text-left">
                        <span className="font-semibold">Note:</span> In case of non-availability of a seat, please contact the Transport Supervisor to arrange an additional vehicle.
                    </p>
                </div>

                <div className="border-t border-white/20 my-6" />

                <ContributorsSection contributors={creators} isLoading={isLoading} />
            </div>

            <FooterCopyright />
        </footer>
    );
};
