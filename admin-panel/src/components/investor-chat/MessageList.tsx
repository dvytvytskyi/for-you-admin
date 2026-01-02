import React from "react";
import MessageItem from "./MessageItem";

interface MessageListProps {
    messages: any[];
    currentUserId: string | null | undefined;
}

export default function MessageList({ messages, currentUserId }: MessageListProps) {
    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10">
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
                    {/* Simple Chat Icon Placeholder */}
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <p className="font-medium">No messages yet</p>
                <p className="text-sm">Be the first to start the conversation!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {messages.map((message) => (
                <MessageItem
                    key={message.id}
                    message={message}
                    isMe={message.sender?.email === currentUserId}
                />
            ))}
        </div>
    );
}
