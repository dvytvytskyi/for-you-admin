'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Badge from '@/components/ui/badge/Badge'

interface ProjectCardProps {
  project: any
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const imageUrl = project.coverImage || 
                   (project.images && project.images[0]) || 
                   project.fullData?.media?.images?.[0]?.original?.url || 
                   project.fullData?.images?.[0]?.url || 
                   null;
  const title = project.title?.en || project.title?.en_custom || 'Unnamed Project';
  const devName = project.developer?.name || project.developer || 'Various Developers';
  const location = project.location?.name || project.location?.path_name || 'Dubai, UAE';
  const price = project.startingPrice ? `${Number(project.startingPrice).toLocaleString()} AED` : 'TBA';
  const status = project.fullData?.completionStatus || 'off_plan';

  const placeholder = '/images/placeholder-property.jpg';
  const [imgSrc, setImgSrc] = useState(imageUrl || placeholder);

  useEffect(() => {
    setImgSrc(imageUrl || placeholder);
  }, [imageUrl]);

  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
      {/* Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={imgSrc}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setImgSrc(placeholder)}
        />
        
        {/* Badges on Image */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {status && (
            <Badge size="sm" color={status.includes('off_plan') ? 'warning' : 'success'}>
              {status.replace('_', ' ').toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                {devName}
            </span>
            <span className="text-xs text-gray-400">ID: {project.pfId}</span>
        </div>
        
        <h3 className="mb-2 line-clamp-1 text-base font-medium text-gray-900 dark:text-white">
          {title}
        </h3>
        
        <p className="mb-4 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {location}
        </p>
        
        <div className="mt-auto border-t border-gray-100 pt-4 dark:border-gray-800">
            <div className="flex items-center justify-between">
                <div>
                    <span className="block text-[10px] uppercase text-gray-400">Starting Price</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {price}
                    </span>
                </div>
                <a 
                    href={`/property-finder/${project.id}`}
                    className="rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-brand-500 hover:text-white dark:bg-gray-800 dark:text-gray-300"
                >
                    View Details
                </a>
            </div>
        </div>
      </div>
    </div>
  )
}
