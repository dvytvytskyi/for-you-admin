type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  // Calculate which pages to show (max 5 pages visible at once)
  const getVisiblePages = () => {
    if (totalPages === 0) {
      return [1]
    }
    
    if (totalPages <= 5) {
      // Show all pages if 5 or less
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | string)[] = []
    
    if (currentPage <= 3) {
      // Near the start: show 1, 2, 3, 4, 5 ... last
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      if (totalPages > 5) {
        pages.push('...')
        pages.push(totalPages)
      }
    } else if (currentPage >= totalPages - 2) {
      // Near the end: show 1 ... last-4, last-3, last-2, last-1, last
      pages.push(1)
      pages.push('...')
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // In the middle: show 1 ... current-1, current, current+1 ... last
      pages.push(1)
      pages.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(totalPages)
    }
    
    return pages
  }

  const visiblePages = getVisiblePages()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center h-10 justify-center rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] text-sm"
      >
        Previous
      </button>
      <div className="flex items-center gap-1">
        {visiblePages.map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500 dark:text-gray-400">
                ...
              </span>
            )
          }
          return (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`flex w-10 items-center justify-center h-10 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? "bg-brand-500 text-white"
                  : "text-gray-700 dark:text-gray-400 hover:bg-blue-500/[0.08] hover:text-brand-500 dark:hover:text-brand-500 border border-gray-300 dark:border-gray-700"
              }`}
            >
              {page}
            </button>
          )
        })}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-gray-700 shadow-theme-xs text-sm hover:bg-gray-50 h-10 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
