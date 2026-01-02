"use client";
import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

export default function InvestorChatContainer() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchUser = async () => {
        try {
            const { data } = await api.get('/auth/me');
            if (data.success) {
                setCurrentUserEmail(data.data.email);
            }
        } catch (error) {
            console.error("Error fetching user:", error);
        }
    };

    const fetchMessages = async () => {
        try {
            const { data } = await api.get('/chat');
            if (data.success) {
                setMessages(data.data);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (payload: any) => {
        try {
            const formData = new FormData();
            if (payload.content) formData.append("content", payload.content);
            if (payload.file) formData.append("file", payload.file);
            if (payload.propertyId) formData.append("propertyId", payload.propertyId);
            if (payload.type) formData.append("type", payload.type);

            const { data } = await api.post('/chat', formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                },
            });

            if (data.success) {
                setMessages((prev) => [...prev, data.data]);
            }
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-950/50 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-brand-500/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-brand-600/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar relative z-10"
            >
                {loading ? (
                    <div className="flex flex-col justify-center items-center h-full gap-4">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
                            <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-brand-500/30"></div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Establishing secure connection...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                        <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-[32px] shadow-2xl flex items-center justify-center mb-6 ring-1 ring-black/5 animate-bounce-slow">
                            <svg className="w-12 h-12 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Investor Chat</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            Start a conversation with your investors. Share properties, updates, and news.
                        </p>
                    </div>
                ) : (
                    <MessageList messages={messages} currentUserId={currentUserEmail} />
                )}
            </div>

            <div className="p-4 sm:p-6 relative z-20">
                <ChatInput onSend={handleSendMessage} />
            </div>
        </div>
    );
}
