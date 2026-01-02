// @ts-nocheck
"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import ProjectSelector from "../investor-chat/ProjectSelector";
import { ChevronDownIcon } from "@/icons";

interface PortfolioManagerProps {
    userId: any;
}

const OPERATIONAL_STATUSES = [
    'Under construction',
    'Waiting for rent out',
    'Renting out',
    'Pending to be sold',
    'Empty'
];

const UNIT_TYPES = ['Apartment', 'Penthouse', 'Townhouse', 'Villa', 'Duplex'];

const NumericInput = ({ label, value, onChange, placeholder }: any) => {
    // We handle the numeric value but display a formatted string with spaces
    const [displayValue, setDisplayValue] = useState(value === 0 ? "" : value.toLocaleString('ru-RU').replace(/,/g, ' '));

    useEffect(() => {
        setDisplayValue(value === 0 ? "" : value.toLocaleString('ru-RU').replace(/,/g, ' '));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
        if (raw === "" || /^\d+$/.test(raw)) {
            const num = raw === "" ? 0 : parseInt(raw);
            setDisplayValue(raw === "" ? "" : num.toLocaleString('ru-RU').replace(/,/g, ' '));
            onChange(num);
        }
    };

    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            <div className="relative group">
                <input
                    type="text"
                    value={displayValue}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-black/40 dark:text-white"
                />
                {displayValue && (
                    <button
                        type="button"
                        onClick={() => { setDisplayValue(""); onChange(0); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default function PortfolioManager({ userId }: PortfolioManagerProps) {
    const [portfolio, setPortfolio] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<any>(null);
    const [editingItem, setEditingItem] = useState<any>(null);

    const [formData, setFormData] = useState({
        unitName: "",
        unitType: "Apartment",
        purchasePrice: 0,
        annualCashFlow: 0,
        estimatedSellingValue: 0,
        size: "",
        amenities: "",
        operationalStatus: "Under construction",
        purchaseDate: "",
        plannedSaleDate: "",
        photos: [] as string[],
        floorPlans: [] as string[],
        advisorWhatsapp: "",
        documents: [] as { name: string; description: string; url: string }[]
    });

    const fetchPortfolio = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/portfolio/${userId}`);
            if (data.success) {
                setPortfolio(data.data);
            }
        } catch (error) {
            console.error("Error fetching portfolio:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolio();
    }, [userId]);

    const handlePropertySelect = (property: any) => {
        setSelectedProperty(property);
        setShowProjectSelector(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                propertyId: selectedProperty?.id,
            };

            if (isEditModalOpen) {
                await api.patch(`/portfolio/${editingItem.id}`, payload);
            } else {
                await api.post(`/portfolio/${userId}`, payload);
            }

            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setEditingItem(null);
            setSelectedProperty(null);
            resetForm();
            fetchPortfolio();
        } catch (error) {
            console.error("Error saving portfolio item:", error);
        }
    };

    const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 2) {
            val = val.substring(0, 2) + '/' + val.substring(2, 6);
        }
        setFormData({ ...formData, [field]: val });
    };

    const handlePlannedSaleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleDateInputChange(e, 'plannedSaleDate');
    };

    const handlePurchaseDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleDateInputChange(e, 'purchaseDate');
    };

    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'photos' | 'floorPlans') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploadFormData = new FormData();
            if (field === 'photos') {
                Array.from(files).forEach(file => uploadFormData.append('files', file));
                const { data } = await api.post('/upload/images', uploadFormData);
                if (data.success) {
                    setFormData(prev => ({
                        ...prev,
                        photos: [...prev.photos, ...data.data.urls]
                    }));
                }
            } else {
                uploadFormData.append('file', files[0]);
                const { data } = await api.post('/upload/image', uploadFormData);
                if (data.success) {
                    setFormData(prev => ({
                        ...prev,
                        floorPlans: [...prev.floorPlans, data.data.url]
                    }));
                }
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload image");
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            const { data } = await api.post('/upload/document', uploadFormData);

            if (data.success) {
                const newDoc = {
                    name: file.name.split('.')[0],
                    description: "",
                    url: data.data.url
                };
                setFormData(prev => ({
                    ...prev,
                    documents: [...prev.documents, newDoc]
                }));
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload document");
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const updateDocument = (index: number, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.map((doc, i) =>
                i === index ? { ...doc, [field]: value } : doc
            )
        }));
    };

    const removeDocument = (index: number) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.filter((_, i) => i !== index)
        }));
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            await api.delete(`/portfolio/${id}`);
            fetchPortfolio();
        } catch (error) {
            console.error("Error deleting portfolio item:", error);
        }
    };

    const openEdit = (item: any) => {
        setEditingItem(item);
        setSelectedProperty(item.property);
        setFormData({
            unitName: item.unitName || "",
            unitType: item.unitType || "Apartment",
            purchasePrice: Number(item.purchasePrice) || 0,
            annualCashFlow: Number(item.annualCashFlow) || 0,
            estimatedSellingValue: Number(item.estimatedSellingValue) || 0,
            size: item.size || "",
            amenities: item.amenities || "",
            operationalStatus: item.operationalStatus || "Under construction",
            purchaseDate: item.purchaseDate || "",
            plannedSaleDate: item.plannedSaleDate || "",
            photos: item.photos || [],
            floorPlans: item.floorPlans || [],
            advisorWhatsapp: item.advisorWhatsapp || "",
            documents: item.documents || []
        });
        setIsEditModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            unitName: "",
            unitType: "Apartment",
            purchasePrice: 0,
            annualCashFlow: 0,
            estimatedSellingValue: 0,
            size: "",
            amenities: "",
            operationalStatus: "Under construction",
            purchaseDate: "",
            plannedSaleDate: "",
            photos: [],
            floorPlans: [],
            advisorWhatsapp: "",
            documents: []
        });
    };

    const handlePhotoAdd = (url: string) => {
        if (!url) return;
        setFormData(prev => ({
            ...prev,
            photos: [...prev.photos, url]
        }));
    };

    const handlePhotoRemove = (index: number) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading portfolio...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Investment Portfolio</h3>
                <Button onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
                    + Add to Portfolio
                </Button>
            </div>

            {/* Analytics Summary */}
            {portfolio?.analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total Purchase</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">
                            ${portfolio.analytics.totalPurchasePrice.toLocaleString('ru-RU').replace(/,/g, ' ')}
                        </p>
                    </div>
                    <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Annual Cash Flow</p>
                        <p className="text-2xl font-black text-brand-500">
                            ${portfolio.analytics.totalAnnualCashFlow.toLocaleString('ru-RU').replace(/,/g, ' ')}
                        </p>
                    </div>
                    <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">3y Rent Est.</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">
                            ${portfolio.analytics.annualCashFlowIn3Years.toLocaleString('ru-RU').replace(/,/g, ' ')}
                        </p>
                    </div>
                    <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Avg. Appreciation</p>
                        <p className="text-2xl font-black text-green-500">
                            +{portfolio.analytics.totalAppreciationPercentage}%
                        </p>
                    </div>
                </div>
            )}

            {/* Items Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {portfolio?.items?.map((item: any) => (
                    <div key={item.id} className="group relative bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col sm:flex-row">
                        <div className="relative w-full sm:w-48 h-48 sm:h-auto">
                            <img
                                src={item.photos?.[0] || item.property?.photos?.[0] || 'https://via.placeholder.com/400'}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute top-3 left-3">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter shadow-lg ${item.operationalStatus === 'Renting out' ? 'bg-green-500 text-white' : 'bg-brand-500 text-white'
                                    }`}>
                                    {item.operationalStatus}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{item.unitName || 'Main Unit'}</h4>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        {item.property?.name} ({item.unitType})
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-xl transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H3.862a2 2 0 01-1.995-1.858L10 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">ROI / Yield</p>
                                    <p className="text-lg font-black text-brand-500">+{item.roi}%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Appreciation</p>
                                    <p className="text-lg font-black text-green-500">+{item.appreciation}%</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Timeline</p>
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Bought: {item.purchaseDate || 'TBD'}</p>
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Exit: {item.plannedSaleDate || 'TBD'}</p>
                                    {item.floorPlans && item.floorPlans.length > 0 && (
                                        <a href={item.floorPlans[0]} target="_blank" className="flex items-center gap-1 text-[10px] text-brand-500 hover:underline font-bold">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                            View Layout
                                        </a>
                                    )}
                                    {item.documents && item.documents.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {item.documents.map((doc: any, i: number) => (
                                                <a
                                                    key={i}
                                                    href={doc.url}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-[9px] font-bold text-gray-500 dark:text-gray-400 hover:text-brand-500 transition-colors"
                                                    title={doc.description || doc.name}
                                                >
                                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    {doc.name}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase font-bold text-gray-400">Purchase Price</p>
                                    <p className="text-base font-black text-gray-900 dark:text-white">${Number(item.purchasePrice).toLocaleString('ru-RU').replace(/,/g, ' ')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {(!portfolio?.items || portfolio.items.length === 0) && (
                    <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-800/20 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
                        No projects in portfolio yet. Click "Add to Portfolio" to start.
                    </div>
                )}
            </div>

            {/* Modals */}
            <Modal
                isOpen={isAddModalOpen || isEditModalOpen}
                onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setEditingItem(null); setSelectedProperty(null); }}
                className="max-w-5xl dark:bg-[#0B0B0F] border border-white/5" // Much darker background
                overlayClassName="fixed inset-0 h-full w-full bg-black/90 backdrop-blur-md" // Very dark overlay
            >
                <div className="p-6 sm:p-10 no-scrollbar overflow-y-auto max-h-[90vh]">
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                        <div className="w-2 h-8 bg-brand-500 rounded-full" />
                        {isEditModalOpen ? "Edit Portfolio Item" : "Add Property to Portfolio"}
                    </h2>

                    <form onSubmit={handleSave} className="space-y-8">
                        {/* Property Selection */}
                        <div className="space-y-2">
                            <Label>Select Project</Label>
                            {selectedProperty ? (
                                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 transition-all hover:border-brand-500/50">
                                    <img src={selectedProperty.photos?.[0]} className="w-16 h-16 rounded-xl object-cover shadow-lg" />
                                    <div className="flex-1">
                                        <p className="font-black text-base text-gray-900 dark:text-white uppercase tracking-tight">{selectedProperty.name}</p>
                                        <p className="text-xs text-brand-500 font-bold">{selectedProperty.area?.nameEn || selectedProperty.area}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setShowProjectSelector(true)}>Change Project</Button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="w-full flex items-center justify-center gap-3 py-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-brand-500 hover:border-brand-500 transition-all"
                                    onClick={() => setShowProjectSelector(true)}
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    <span className="font-bold">Click to Search and Select Project...</span>
                                </button>
                            )}
                        </div>

                        {showProjectSelector && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                                <div className="w-full max-w-xl">
                                    <ProjectSelector onSelect={handlePropertySelect} onClose={() => setShowProjectSelector(false)} />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <Label>Unit Name/ID</Label>
                                <Input value={formData.unitName} onChange={(e) => setFormData({ ...formData, unitName: e.target.value })} placeholder="e.g. Apt 402" className="h-11 rounded-xl dark:bg-black/40 dark:border-gray-800" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Unit Type</Label>
                                <div className="relative">
                                    <select
                                        className="h-11 w-full appearance-none bg-gray-50/50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:text-white"
                                        value={formData.unitType}
                                        onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                                    >
                                        {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDownIcon />
                                    </span>
                                </div>
                            </div>

                            <NumericInput
                                label="Purchase Price ($)"
                                value={formData.purchasePrice}
                                onChange={(val: number) => setFormData({ ...formData, purchasePrice: val })}
                                placeholder="0"
                            />

                            <NumericInput
                                label="Estimated Selling Price ($)"
                                value={formData.estimatedSellingValue}
                                onChange={(val: number) => setFormData({ ...formData, estimatedSellingValue: val })}
                                placeholder="0"
                            />

                            <NumericInput
                                label="Annual Cash Flow ($)"
                                value={formData.annualCashFlow}
                                onChange={(val: number) => setFormData({ ...formData, annualCashFlow: val })}
                                placeholder="0"
                            />
                            <div className="space-y-1.5">
                                <Label>Operational Status</Label>
                                <div className="relative">
                                    <select
                                        className="h-11 w-full appearance-none bg-gray-50/50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:text-white"
                                        value={formData.operationalStatus}
                                        onChange={(e) => setFormData({ ...formData, operationalStatus: e.target.value })}
                                    >
                                        {OPERATIONAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <ChevronDownIcon />
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Purchase Date (MM/YYYY)</Label>
                                <Input
                                    value={formData.purchaseDate}
                                    onChange={handlePurchaseDateChange}
                                    placeholder="MM/YYYY"
                                    maxLength={7}
                                    className="h-11 rounded-xl dark:bg-black/40 dark:border-gray-800"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Planned Sale Date (MM/YYYY)</Label>
                                <Input
                                    value={formData.plannedSaleDate}
                                    onChange={handlePlannedSaleDateChange}
                                    placeholder="MM/YYYY"
                                    maxLength={7}
                                    className="h-11 rounded-xl dark:bg-black/40 dark:border-gray-800"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Advisor WhatsApp (Link)</Label>
                                <Input value={formData.advisorWhatsapp} onChange={(e) => setFormData({ ...formData, advisorWhatsapp: e.target.value })} placeholder="https://wa.me/..." className="h-11 rounded-xl dark:bg-black/40 dark:border-gray-800" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Size (sqft/sqm)</Label>
                                <Input value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} className="h-11 rounded-xl dark:bg-black/40 dark:border-gray-800" />
                            </div>
                        </div>

                        {/* Documents Section */}
                        <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                            <h4 className="text-lg font-bold text-brand-500 uppercase tracking-tight">Documents & Files</h4>

                            <div className="space-y-4">
                                <label className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand-500 hover:border-brand-500 transition-all cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    <span className="font-bold text-sm">{uploading ? 'Uploading...' : 'Upload Document (PDF, Excel, CSV)'}</span>
                                    <input
                                        type="file"
                                        accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,image/*"
                                        className="hidden"
                                        onChange={handleDocumentUpload}
                                    />
                                </label>

                                <div className="space-y-3">
                                    {formData.documents && formData.documents.length > 0 ? (
                                        formData.documents.map((doc, index) => (
                                            <div key={index} className="p-4 bg-gray-50 dark:bg-black/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3 shadow-sm">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex-1">
                                                        <Input
                                                            value={doc.name}
                                                            onChange={(e) => updateDocument(index, 'name', e.target.value)}
                                                            placeholder="Document Name"
                                                            className="h-10 text-sm font-bold bg-white dark:bg-black/60 rounded-lg"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeDocument(index)}
                                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-red-50 dark:bg-red-900/10 rounded-lg"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H3.862a2 2 0 01-1.995-1.858L10 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                                <TextArea
                                                    value={doc.description}
                                                    onChange={(val: string) => updateDocument(index, 'description', val)}
                                                    placeholder="Short description..."
                                                    className="min-h-[60px] text-sm bg-white dark:bg-black/60 rounded-lg"
                                                />
                                                <div className="flex items-center justify-between gap-4 px-1">
                                                    <a href={doc.url} target="_blank" className="text-[10px] text-brand-500 font-bold hover:underline truncate max-w-[200px]">View: {doc.url.split('/').pop()}</a>
                                                    <Badge color="gray" size="sm" className="text-[9px]">{doc.url.split('.').pop()?.toUpperCase()}</Badge>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-100 dark:border-gray-800 rounded-xl">No documents added yet</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Media Section */}
                        <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white font-black uppercase tracking-tight">Media & Layout</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Multiple Photos */}
                                <div className="space-y-3">
                                    <Label>Unit Photos</Label>
                                    <div className="flex gap-2">
                                        <label className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand-500 hover:border-brand-500 transition-all cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                            <span className="font-bold text-sm">{uploading ? 'Uploading...' : 'Upload Photos (Multiple)'}</span>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, 'photos')}
                                            />
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                        {formData.photos.map((url, i) => (
                                            <div key={i} className="relative group w-full aspect-square rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handlePhotoRemove(i)}
                                                    className="absolute top-1 right-1 bg-black/50 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Floor Plan */}
                                <div className="space-y-3">
                                    <Label>Unit Layout / Floor Plan</Label>
                                    <label className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 hover:text-brand-500 hover:border-brand-500 transition-all cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                        <span className="font-bold text-sm">{uploading ? 'Uploading...' : 'Upload Layout'}</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, 'floorPlans')}
                                        />
                                    </label>
                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                        {formData.floorPlans.map((url, i) => (
                                            <div key={i} className="relative group w-full aspect-square rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, floorPlans: prev.floorPlans.filter((_, idx) => idx !== i) }))}
                                                    className="absolute top-1 right-1 bg-black/50 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>


                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); setEditingItem(null); setSelectedProperty(null); }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!selectedProperty} className="px-10 h-11 font-bold">
                                {isEditModalOpen ? "Save Changes" : "Confirm and Add"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}
