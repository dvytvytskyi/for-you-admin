import ProjectsList from '@/components/property-finder/ProjectsList'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PropertyFinderProjectsPage() {
    let initialProjects = [];
    let initialTotalCount = 0;
    let initialTotalPages = 1;

    try {
        // Fetch data from backend on the server
        // This makes the page load faster as it pre-populates the list
        const BE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://admin.foryou-realestate.com/api';
        
        console.log(`[SSR] Fetching projects from: ${BE_URL}/property-finder/projects`);
        
        const res = await fetch(`${BE_URL}/property-finder/projects?page=1&perPage=24`, {
            next: { revalidate: 0 },
            headers: {
                'Content-Type': 'application/json',
                // We don't have a JWT on the server easily, 
                // so this will only work if the endpoint is public or 
                // if we provide a system API key.
            }
        });

        if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
                initialProjects = data.data.items || [];
                initialTotalCount = data.data.pagination?.total || 0;
                initialTotalPages = data.data.pagination?.totalPages || 1;
                console.log(`[SSR] Successfully fetched ${initialProjects.length} projects`);
            }
        } else {
            console.error(`[SSR Error] Backend returned ${res.status}`);
        }
    } catch (error: any) {
        console.error('[SSR Error] Failed to fetch projects:', error.message);
        // Fallback to empty state which will then be loaded by client if backend comes back
    }

    return (
        <ProjectsList 
            initialProjects={initialProjects}
            initialTotalCount={initialTotalCount}
            initialTotalPages={initialTotalPages}
        />
    )
}
