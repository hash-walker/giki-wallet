import { useQuery } from '@tanstack/react-query';

interface GitHubContributor {
    login: string;
    avatar_url: string;
    contributions: number;
    html_url: string;
}

// Get repo from environment or use default
const getRepoPath = () => {
    // Try to get from environment variable
    const repo = import.meta.env.VITE_GITHUB_REPO;
    if (repo) return repo;
    
    // Default based on workspace path structure
    // Format: owner/repo (e.g., "hash-walker/transport-system")
    return 'hash-walker/transport-system';
};

const fetchContributors = async (): Promise<GitHubContributor[]> => {
    const repo = getRepoPath();
    
    // Optional: Add GitHub token for private repos
    // Get token from environment variable
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
    };
    
    // Add token if available (for private repos)
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }
    
    const response = await fetch(
        `https://api.github.com/repos/${repo}/contributors?per_page=10`,
        { headers }
    );
    
    // Handle different error cases
    if (response.status === 404) {
        // Repo not found or is private without token
        throw new Error('Repository not found or is private');
    }
    
    if (response.status === 403) {
        // Rate limit or access denied
        throw new Error('Access denied or rate limit exceeded');
    }
    
    if (!response.ok) {
        throw new Error('Failed to fetch contributors');
    }
    
    const data = await response.json();
    return data;
};

export const useGitHubContributors = () => {
    return useQuery({
        queryKey: ['github-contributors'],
        queryFn: fetchContributors,
        staleTime: 1000 * 60 * 60, // Cache for 1 hour
        retry: 1, // Only retry once
        refetchOnWindowFocus: false, // Don't refetch on window focus
    });
};

