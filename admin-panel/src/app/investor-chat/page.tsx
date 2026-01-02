"use client";
import React from "react";
import InvestorChatContainer from "@/components/investor-chat/InvestorChatContainer";

export default function InvestorChatPage() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Investor Chat</h1>
                <p className="text-gray-500 dark:text-gray-400">Exclusive channel for investors and brokers</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-220px)]">
                <InvestorChatContainer />
            </div>
        </div>
    );
}
