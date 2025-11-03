'use client'
import React, { useState } from 'react'

interface TooltipProps {
  children: React.ReactNode
  content: string
  disabled?: boolean
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, disabled = false }) => {
  const [show, setShow] = useState(false)

  if (!content || disabled) {
    return <>{children}</>
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  )
}

export default Tooltip
