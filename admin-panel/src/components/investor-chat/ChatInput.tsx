import React, { useState, useRef, useEffect } from "react";
import ProjectSelector from "./ProjectSelector";

interface ChatInputProps {
    onSend: (payload: any) => void;
}

export default function ChatInput({ onSend }: ChatInputProps) {
    const [content, setContent] = useState("");
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        if (!content.trim()) return;
        onSend({ content, type: "TEXT" });
        setContent("");
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onSend({ file, type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE' });
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleProjectSelect = (project: any) => {
        onSend({ propertyId: project.id, type: "PROJECT" });
        setShowProjectSelector(false);
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [content]);

    return (
        <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-end gap-3 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl p-3 sm:p-4 rounded-[24px] border border-gray-200/50 dark:border-gray-700/50 shadow-2xl focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500/50 transition-all duration-300 ring-1 ring-black/5">
                <div className="flex items-center gap-1 self-center bg-gray-100/50 dark:bg-gray-900/50 p-1 rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
                    <button
                        onClick={() => setShowProjectSelector(!showProjectSelector)}
                        className={`p-2 rounded-xl transition-all duration-300 ${showProjectSelector ? "bg-brand-500 text-white shadow-lg" : "text-gray-500 hover:text-brand-500 hover:bg-white dark:hover:bg-gray-800"}`}
                        title="Attach Project"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:text-brand-500 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all duration-300"
                        title="Upload File"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        hidden
                        onChange={handleFileChange}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Message to investors..."
                        rows={1}
                        className="w-full bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 text-sm py-2 px-1 no-scrollbar resize-none placeholder:text-gray-400 font-medium"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                </div>

                <button
                    onClick={handleSend}
                    disabled={!content.trim()}
                    className={`flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-2xl shadow-xl transition-all duration-300 group ${content.trim()
                            ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-brand-500/30 active:scale-90"
                            : "bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed opacity-50"
                        }`}
                >
                    <svg className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${content.trim() ? "group-hover:translate-x-1 group-hover:-translate-y-1" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>

            {showProjectSelector && (
                <div className="absolute bottom-full left-0 mb-4 w-[calc(100vw-32px)] sm:w-[450px] z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <ProjectSelector onSelect={handleProjectSelect} onClose={() => setShowProjectSelector(false)} />
                </div>
            )}
        </div>
    );
}
