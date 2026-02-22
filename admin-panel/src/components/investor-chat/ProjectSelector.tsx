import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface ProjectSelectorProps {
    onSelect: (project: any) => void;
    onClose: () => void;
}

export default function ProjectSelector({ onSelect, onClose }: ProjectSelectorProps) {
    const [projects, setProjects] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            setLoading(true);
            try {
                // The structure is data.data.data according to properties.routes.ts
                const { data } = await api.get(`/properties?limit=100&search=${search}`);
                if (data.success) {
                    // Fix: data.data is an object { data: properties[], pagination: {} }
                    setProjects(data.data.data || []);
                }
            } catch (error) {
                console.error("Error fetching projects:", error);
            } finally {
                setLoading(false);
            }
        };

        const delayDebounce = setTimeout(fetchProjects, 300);
        return () => clearTimeout(delayDebounce);
    }, [search]);

    return (
        <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-5 max-h-[450px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
            <div className="flex justify-between items-center mb-5">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Attach Project</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Select a property to share</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Search by name or description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                    className="w-full bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all dark:text-white"
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pr-1">
                {loading ? (
                    <div className="flex flex-col justify-center items-center py-12 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                        <p className="text-xs text-gray-400 animate-pulse">Searching properties...</p>
                    </div>
                ) : projects.length > 0 ? (
                    projects.map((project: any) => (
                        <div
                            key={project.id}
                            onClick={() => onSelect(project)}
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-brand-50 shadow-sm hover:shadow-md dark:hover:bg-brand-500/10 cursor-pointer transition-all group border border-transparent hover:border-brand-200 dark:hover:border-brand-500/30"
                        >
                            <div className="relative h-14 w-14 flex-shrink-0">
                                <img
                                    src={project.photos?.[0] || 'https://via.placeholder.com/150'}
                                    className="h-full w-full rounded-lg object-cover ring-1 ring-black/5"
                                />
                                {project.isForYouChoice && (
                                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-brand-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                        {project.name}
                                    </p>
                                    <span className="text-[10px] font-bold text-brand-500 bg-brand-50 dark:bg-brand-500/20 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                                        {project.price || project.priceFrom ? (project.price || project.priceFrom).toLocaleString() : 'P.O.A'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
                                    <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {project.area?.nameEn || project.area || 'Unknown Area'}
                                </p>
                            </div>
                            <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-400 group-hover:bg-brand-500 group-hover:text-white transition-all transform group-hover:scale-110 shadow-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-full mb-4">
                            <svg className="w-10 h-10 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">No projects found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your search terms</p>
                    </div>
                )}
            </div>
        </div>
    );
}
