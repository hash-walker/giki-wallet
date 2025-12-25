import { Github, Heart } from 'lucide-react';

interface Contributor {
    name: string;
    initials: string;
    avatar: string | null;
    url: string | null;
}

interface ContributorsSectionProps {
    contributors: Contributor[];
    isLoading: boolean;
}

export const ContributorsSection = ({ contributors, isLoading }: ContributorsSectionProps) => {
    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
                <Github className="w-4 h-4 text-white/60" />
                <p className="text-xs text-white/60">
                    Created with <Heart className="w-3 h-3 inline mx-1 text-red-400" /> by
                </p>
            </div>
            {isLoading ? (
                <div className="flex items-start gap-4 flex-wrap">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-white/20 animate-pulse" />
                            <div className="h-4 w-16 bg-white/20 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-start gap-4 flex-wrap">
                    {contributors.map((contributor, index) => {
                        const Component = contributor.url ? 'a' : 'div';
                        const props = contributor.url
                            ? { href: contributor.url, target: '_blank', rel: 'noopener noreferrer' }
                            : {};
                        
                        return (
                            <Component
                                key={index}
                                className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
                                {...props}
                            >
                                {contributor.avatar ? (
                                    <img
                                        src={contributor.avatar}
                                        alt={contributor.name}
                                        className="w-10 h-10 rounded-full border-2 border-white/30 object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold text-white border border-white/30">
                                        {contributor.initials}
                                    </div>
                                )}
                                <span className="text-sm text-white/90 font-medium text-center">
                                    {contributor.name}
                                </span>
                            </Component>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

