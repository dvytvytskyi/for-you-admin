"use client";
import React from "react";
import dayjs from "dayjs";

interface MessageItemProps {
    message: any;
    isMe: boolean;
}

export default function MessageItem({ message, isMe }: MessageItemProps) {
    const senderName = isMe ? "You" : `${message.sender?.firstName || ''} ${message.sender?.lastName || ''}`;
    const time = dayjs(message.createdAt).format("HH:mm");

    return (
        <div className={`flex ${isMe ? "justify-end" : "justify-start"} w-full group animate-in fade-in slide-in-from-bottom-1 duration-300`}>
            <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`flex items-center gap-2 mb-1.5 px-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{senderName}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{time}</span>
                </div>

                <div className={`relative p-3.5 rounded-2xl shadow-sm transition-all duration-200 ${isMe
                    ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-tr-none shadow-brand-500/10 ring-1 ring-white/10"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none ring-1 ring-gray-100 dark:ring-gray-700/50"
                    }`}>

                    {message.type === 'TEXT' && (
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
                    )}

                    {message.type === 'IMAGE' && (
                        <div className="space-y-2.5">
                            <div className="relative group/img overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-900 ring-1 ring-black/5">
                                <img
                                    src={message.fileUrl}
                                    alt="Shared image"
                                    className="max-h-80 w-full object-cover cursor-pointer transition-transform duration-500 group-hover/img:scale-105"
                                    onClick={() => window.open(message.fileUrl, '_blank')}
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            {message.content && <p className="text-[14px] leading-relaxed font-medium">{message.content}</p>}
                        </div>
                    )}

                    {message.type === 'FILE' && (
                        <div className={`flex items-center gap-4 p-3 rounded-xl ring-1 ${isMe ? "bg-white/10 ring-white/20" : "bg-gray-50 dark:bg-gray-900/50 ring-gray-100 dark:ring-gray-700"}`}>
                            <div className={`p-2.5 rounded-lg ${isMe ? "bg-white/20" : "bg-brand-50 dark:bg-brand-500/10"}`}>
                                <svg className={`w-6 h-6 ${isMe ? "text-white" : "text-brand-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                                <p className={`text-sm font-bold truncate ${isMe ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>
                                    {message.fileName || 'Document'}
                                </p>
                                <p className={`text-[10px] uppercase tracking-tighter font-bold ${isMe ? "text-white/60" : "text-gray-400"}`}>
                                    {message.fileName?.split('.').pop() || 'FILE'}
                                </p>
                            </div>
                            <a
                                href={message.fileUrl}
                                target="_blank"
                                className={`p-2 rounded-lg transition-colors ${isMe ? "hover:bg-white/20 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-500"}`}
                                title="Download"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </a>
                        </div>
                    )}

                    {message.type === 'PROJECT' && message.property && (
                        <div className={`rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-lg ${isMe
                                ? "bg-white/10 border-white/20 text-white"
                                : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white"
                            } max-w-sm`}>
                            <div className="relative group/proj h-44 overflow-hidden">
                                <img src={message.property.photos?.[0]} className="h-full w-full object-cover transition-transform duration-700 group-hover/proj:scale-110" />
                                <div className="absolute top-3 left-3">
                                    <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter shadow-lg">Featured Project</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-base truncate mb-1">{message.property.name}</h4>
                                <div className="flex items-center gap-1.5 text-xs opacity-70 mb-4">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    {message.property.area}
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-current opacity-20 border-opacity-10">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold opacity-60">Starting from</p>
                                        <span className="font-black text-lg">{message.property.price || message.property.priceFrom ? (message.property.price || message.property.priceFrom).toLocaleString() : 'P.O.A'}</span>
                                    </div>
                                    <button
                                        onClick={() => window.open(`/properties/${message.property.id}`, '_blank')}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all transform active:scale-95 shadow-md ${isMe
                                                ? "bg-white text-brand-600 hover:bg-gray-100"
                                                : "bg-brand-500 text-white hover:bg-brand-600 shadow-brand-500/20"
                                            }`}
                                    >
                                        Details →
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
