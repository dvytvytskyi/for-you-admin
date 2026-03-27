"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import { message, Select } from "antd";
import Image from "next/image";
import axios from "axios";

const { Option } = Select;

// Constants for character limits
const limits = {
  devDescription: { min: 2500, max: 3500 },
  avgPriceDescription: { min: 1000, max: 2000 },
  communityDescription: { min: 1500, max: 2000 },
};

export default function DeveloperEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [areas, setAreas] = useState<any[]>([]);
  const [developer, setDeveloper] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [logo, setLogo] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionRu, setDescriptionRu] = useState("");
  const [avgPricesDescription, setAvgPricesDescription] = useState("");
  const [avgPrices, setAvgPrices] = useState<{ text: string; price: string }[]>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: devData }, { data: locationsData }] = await Promise.all([
        api.get(`/settings/developers/${id}`),
        api.get("/settings/locations"),
      ]);

      const dev = devData.data;
      setDeveloper(dev);
      setName(dev.name || "");
      setNameRu(dev.nameRu || "");
      setNameAr(dev.nameAr || "");
      setLogo(dev.logo || "");
      setDescription(dev.description || "");
      setDescriptionRu(dev.descriptionRu || "");
      setAvgPricesDescription(dev.avgPricesDescription || "");
      setAvgPrices(dev.avgPrices || []);
      setSelectedAreaIds(dev.areas?.map((a: any) => a.id) || []);
      setCommunities(dev.communities || []);
      setImages(dev.images || []);

      setAreas(locationsData.data?.areas || []);
    } catch (error) {
      console.error("Error loading developer data:", error);
      message.error("Failed to load developer data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const seoName = `${name.toLowerCase().replace(/\s+/g, "-")}-logo`;
      const { data } = await api.post(`/upload/image?folder=developers&filename=${seoName}`, formData);
      setLogo(data.data.url);
      message.success("Logo uploaded");
    } catch (error) {
      console.error("Logo upload error:", error);
      message.error("Failed to upload logo");
    }
  };

  const handleCommunityImageUpload = async (commIndex: number, type: "general" | "exterior" | "interior", e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const comm = communities[commIndex];
    const newCommunities = [...communities];
    
    const limit = type === 'general' ? 6 : 2;
    const currentCount = newCommunities[commIndex].images?.[type]?.length || 0;
    
    if (currentCount + files.length > limit) {
      message.error(`Maximum ${limit} photos allowed for ${type}`);
      return;
    }

    try {
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        const seoName = `${name.toLowerCase().replace(/\s+/g, "-")}-${comm.title?.toLowerCase().replace(/\s+/g, "-") || 'community'}-${type}-${currentCount + i + 1}`;
        const { data } = await api.post(`/upload/image?folder=communities&filename=${seoName}`, formData);
        uploadedUrls.push(data.data.url);
      }

      if (!newCommunities[commIndex].images) newCommunities[commIndex].images = {};
      if (!newCommunities[commIndex].images[type]) newCommunities[commIndex].images[type] = [];
      newCommunities[commIndex].images[type].push(...uploadedUrls);
      
      setCommunities(newCommunities);
      message.success(`Uploaded ${uploadedUrls.length} image(s)`);
    } catch (error) {
      console.error("Community image upload error:", error);
      message.error("Failed to upload images");
    }
  };

  const handleAddAvgPrice = () => {
    setAvgPrices([...avgPrices, { text: "", price: "" }]);
  };

  const handleRemoveAvgPrice = (index: number) => {
    setAvgPrices(avgPrices.filter((_, i) => i !== index));
  };

  const handleAddCommunity = () => {
    setCommunities([
      ...communities,
      {
        title: "",
        areaId: "",
        mapPoint: "",
        priceRange: { from: 0, to: 0 },
        unitAvailabilities: [],
        propertyTypes: [],
        icp: [],
        description: "",
        images: { general: [], exterior: [], interior: [] }
      }
    ]);
  };

  const handleRemoveCommunity = (index: number) => {
    setCommunities(communities.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/settings/developers/${id}`, {
        name,
        nameRu,
        nameAr,
        logo,
        description,
        descriptionRu,
        avgPricesDescription,
        avgPrices,
        areas: selectedAreaIds,
        communities,
        images
      });
      message.success("Developer updated successfully");
      router.push("/settings");
    } catch (error: any) {
      console.error("Save error:", error);
      const msg = error.response?.data?.message || "Failed to save developer details";
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 pb-20 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 sticky top-0 z-20 transition-all">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Developer</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure developer details, pricing, and communities</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push("/settings")}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Basic Information */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-6 bg-brand-500 rounded-full"></span>
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Name (EN)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Developer Name" />
              </div>
              <div className="space-y-2">
                <Label>Name (RU)</Label>
                <Input value={nameRu} onChange={(e) => setNameRu(e.target.value)} placeholder="Забудовник" />
              </div>
              <div className="space-y-2">
                <Label>Name (AR)</Label>
                <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مطور" />
              </div>
            </div>

            <div className="mt-8">
              <Label>Developer Logo</Label>
              <div className="mt-4 flex items-center gap-6">
                <div className="relative w-28 h-28 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                  {logo ? (
                    <Image src={logo} alt="Logo" fill className="object-contain p-2" />
                  ) : (
                    <span className="text-gray-400 text-xs font-medium">No Logo</span>
                  )}
                </div>
                <div className="space-y-3">
                  <input
                    type="file"
                    id="logo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:opacity-90 cursor-pointer transition-all text-sm font-semibold"
                  >
                    Change Logo
                  </label>
                  <p className="text-xs text-gray-500 max-w-[200px]">Recommended: JPG/PNG/WebP, 1:1 ratio, max 2MB</p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Description (EN)</Label>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    description.length >= limits.devDescription.min && description.length <= limits.devDescription.max
                    ? "bg-success-50 text-success-600"
                    : "bg-amber-50 text-amber-600"
                  }`}>
                    {description.length} symbols ({limits.devDescription.min}-{limits.devDescription.max})
                  </span>
                </div>
                <TextArea
                  value={description}
                  onChange={setDescription}
                  rows={8}
                  placeholder="Describe the developer..."
                  className={`dark:bg-gray-800/50 ${description.length < limits.devDescription.min || description.length > limits.devDescription.max ? "border-amber-400 focus:border-amber-500" : ""}`}
                />
              </div>
            </div>
          </section>

          {/* Average Pricing */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-6 bg-brand-500 rounded-full"></span>
              Average Project Pricing
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Pricing Description</Label>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    avgPricesDescription.length >= limits.avgPriceDescription.min && avgPricesDescription.length <= limits.avgPriceDescription.max
                    ? "bg-success-50 text-success-600"
                    : "bg-amber-50 text-amber-600"
                  }`}>
                    {avgPricesDescription.length} symbols ({limits.avgPriceDescription.min}-{limits.avgPriceDescription.max})
                  </span>
                </div>
                <TextArea
                  value={avgPricesDescription}
                  onChange={setAvgPricesDescription}
                  rows={4}
                  placeholder="General info about pricing..."
                  className={`dark:bg-gray-800/50 ${avgPricesDescription.length < limits.avgPriceDescription.min || avgPricesDescription.length > limits.avgPriceDescription.max ? "border-amber-400 focus:border-amber-500" : ""}`}
                />
              </div>
              
              <div className="space-y-4">
                <Label>Pricing Options (AED)</Label>
                <div className="grid grid-cols-1 gap-4">
                  {avgPrices.map((opt, idx) => (
                    <div key={idx} className="flex gap-4 items-end p-5 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-700/50 group">
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-400">Unit Type</Label>
                        <Input
                          value={opt.text}
                          onChange={(e) => {
                            const newPrices = [...avgPrices];
                            newPrices[idx].text = e.target.value;
                            setAvgPrices(newPrices);
                          }}
                          placeholder="e.g. 1 Bedroom"
                          className="bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div className="w-48 space-y-2">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-400">Average Price</Label>
                        <Input
                          value={opt.price}
                          onChange={(e) => {
                            const newPrices = [...avgPrices];
                            newPrices[idx].price = e.target.value;
                            setAvgPrices(newPrices);
                          }}
                          placeholder="e.g. 1,200,000"
                          className="bg-white dark:bg-gray-800"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveAvgPrice(idx)}
                        className="mb-1 p-2 text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddAvgPrice}
                  className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-500 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-500/5 transition-all font-semibold text-sm"
                >
                  + Add Price Configuration
                </button>
              </div>
            </div>
          </section>

          {/* Communities */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-brand-500 rounded-full"></span>
                Featured Communities
              </h2>
              <button 
                onClick={handleAddCommunity}
                className="px-4 py-2 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-xl text-xs font-bold hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-all border border-brand-100 dark:border-brand-500/30"
              >
                + ADD NEW COMMUNITY
              </button>
            </div>

            <div className="space-y-10">
              {communities.map((comm, idx) => (
                <div key={idx} className="p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 space-y-8 relative bg-gray-50/30 dark:bg-gray-800/10 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-bold shadow-lg shadow-gray-200 dark:shadow-none">{idx + 1}</span>
                      <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                        {comm.title || 'Untitled Community'}
                      </h3>
                    </div>
                    <button 
                      onClick={() => handleRemoveCommunity(idx)} 
                      className="px-3 py-1.5 text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all border border-transparent hover:border-error-100 dark:hover:border-error-500/20"
                    >
                      Delete Block
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label>Community Title</Label>
                      <Input
                        value={comm.title}
                        onChange={(e) => {
                          const newComm = [...communities];
                          newComm[idx].title = e.target.value;
                          setCommunities(newComm);
                        }}
                        placeholder="e.g. Sobha Hartland"
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Area / Location</Label>
                      <Select
                        className="w-full h-11"
                        placeholder="Select Primary Area"
                        value={comm.areaId}
                        onChange={(value) => {
                          const newComm = [...communities];
                          newComm[idx].areaId = value;
                          setCommunities(newComm);
                        }}
                        showSearch
                        optionFilterProp="label"
                        options={areas.map(a => ({ value: a.id, label: a.nameEn }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Map Pin (Coordinates)</Label>
                      <Input
                        value={comm.mapPoint}
                        onChange={(e) => {
                          const newComm = [...communities];
                          newComm[idx].mapPoint = e.target.value;
                          setCommunities(newComm);
                        }}
                        placeholder="25.2048, 55.2708"
                        className="bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-4">
                      <Label className="text-gray-400 tracking-wide">Investment Suitability (ICP)</Label>
                      <Select
                        mode="multiple"
                        className="w-full"
                        placeholder="Select ICP(s)"
                        value={comm.icp || []}
                        onChange={(values) => {
                          const newComm = [...communities];
                          newComm[idx].icp = values;
                          setCommunities(newComm);
                        }}
                      >
                        {["Investment for resale", "Investment for rent out", "Living couple", "Living with family", "Retirement"].map(i => (
                          <Option key={i} value={i}>{i}</Option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-gray-400 tracking-wide">Property & Unit Details</Label>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                          {["Studio", "1", "2", "3", "4", "5", "6+"].map(u => (
                            <button
                              key={u}
                              onClick={() => {
                                const newComm = [...communities];
                                const units = newComm[idx].unitAvailabilities || [];
                                if (units.includes(u)) {
                                  newComm[idx].unitAvailabilities = units.filter((x: string) => x !== u);
                                } else {
                                  newComm[idx].unitAvailabilities = [...units, u];
                                }
                                setCommunities(newComm);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${
                                comm.unitAvailabilities?.includes(u) 
                                ? "bg-brand-500 text-white shadow-sm" 
                                : "bg-white dark:bg-gray-800 text-gray-500 border border-gray-100 dark:border-gray-700"
                              }`}
                            >
                              {u === 'Studio' ? 'STUDIO' : `${u} BEDS`}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-4">
                          <Input
                            placeholder="Price From"
                            value={comm.priceRange?.from}
                            onChange={(e) => {
                              const newComm = [...communities];
                              if (!newComm[idx].priceRange) newComm[idx].priceRange = {};
                              newComm[idx].priceRange.from = e.target.value;
                              setCommunities(newComm);
                            }}
                            className="text-xs bg-white dark:bg-gray-800"
                          />
                          <Input
                            placeholder="Price To"
                            value={comm.priceRange?.to}
                            onChange={(e) => {
                              const newComm = [...communities];
                              if (!newComm[idx].priceRange) newComm[idx].priceRange = {};
                              newComm[idx].priceRange.to = e.target.value;
                              setCommunities(newComm);
                            }}
                            className="text-xs bg-white dark:bg-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <div className="flex justify-between items-center">
                      <Label>Community Description</Label>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        (comm.description?.length || 0) >= limits.communityDescription.min && (comm.description?.length || 0) <= limits.communityDescription.max
                        ? "bg-success-50 text-success-600"
                        : "bg-amber-50 text-amber-600"
                      }`}>
                        {comm.description?.length || 0} symbols ({limits.communityDescription.min}-{limits.communityDescription.max})
                      </span>
                    </div>
                    <TextArea
                      value={comm.description}
                      onChange={(v) => {
                        const newComm = [...communities];
                        newComm[idx].description = v;
                        setCommunities(newComm);
                      }}
                      rows={6}
                      placeholder="High-level description of the community..."
                      className={`bg-white dark:bg-gray-800 ${(comm.description?.length || 0) < limits.communityDescription.min || (comm.description?.length || 0) > limits.communityDescription.max ? "border-amber-400" : ""}`}
                    />
                  </div>

                  {/* Community Photos Section */}
                  <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <Label className="text-gray-400">Media Assets Selection</Label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                      {/* General */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">General ({comm.images?.general?.length || 0}/6)</span>
                          <label className="cursor-pointer text-brand-500 hover:text-brand-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" strokeLinecap="round"/></svg>
                            <input type="file" className="hidden" multiple accept="image/*" onChange={(e) => handleCommunityImageUpload(idx, 'general', e)} />
                          </label>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(comm.images?.general || []).map((img : any, iIndex: number) => (
                            <div key={iIndex} className="relative aspect-square rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden group/img">
                              <Image src={img} alt="General" fill className="object-cover" />
                              <button 
                                onClick={() => {
                                  const newComm = [...communities];
                                  newComm[idx].images.general.splice(iIndex, 1);
                                  setCommunities(newComm);
                                }}
                                className="absolute inset-0 bg-error-600/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white font-bold"
                              >
                                REMOVE
                              </button>
                            </div>
                          ))}
                          {Array.from({ length: Math.max(0, 3 - (comm.images?.general?.length || 0)) }).map((_, i) => (
                            <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"></div>
                          ))}
                        </div>
                      </div>

                      {/* Exterior */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Exterior ({comm.images?.exterior?.length || 0}/2)</span>
                          <label className="cursor-pointer text-brand-500 hover:text-brand-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" strokeLinecap="round"/></svg>
                            <input type="file" className="hidden" multiple accept="image/*" onChange={(e) => handleCommunityImageUpload(idx, 'exterior', e)} />
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(comm.images?.exterior || []).map((img: any, iIndex: number) => (
                            <div key={iIndex} className="relative aspect-square rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden group/img">
                              <Image src={img} alt="Exterior" fill className="object-cover" />
                              <button 
                                onClick={() => {
                                  const newComm = [...communities];
                                  newComm[idx].images.exterior.splice(iIndex, 1);
                                  setCommunities(newComm);
                                }}
                                className="absolute inset-0 bg-error-600/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white font-bold"
                              >
                                REMOVE
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Interior */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Interior ({comm.images?.interior?.length || 0}/2)</span>
                          <label className="cursor-pointer text-brand-500 hover:text-brand-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" strokeLinecap="round"/></svg>
                            <input type="file" className="hidden" multiple accept="image/*" onChange={(e) => handleCommunityImageUpload(idx, 'interior', e)} />
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(comm.images?.interior || []).map((img: any, iIndex: number) => (
                            <div key={iIndex} className="relative aspect-square rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden group/img">
                              <Image src={img} alt="Interior" fill className="object-cover" />
                              <button 
                                onClick={() => {
                                  const newComm = [...communities];
                                  newComm[idx].images.interior.splice(iIndex, 1);
                                  setCommunities(newComm);
                                }}
                                className="absolute inset-0 bg-error-600/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white font-bold"
                              >
                                REMOVE
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Operating Areas */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-6 bg-brand-500 rounded-full"></span>
              Active Areas
            </h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">Select locations where this developer builds</p>
            
            <div className="space-y-4">
              <Select
                mode="multiple"
                className="w-full h-auto min-h-[44px]"
                placeholder="Search and add areas..."
                value={selectedAreaIds}
                onChange={setSelectedAreaIds}
                showSearch
                optionFilterProp="label"
                options={areas.map(area => ({
                  value: area.id,
                  label: area.nameEn
                }))}
              />
            </div>
          </section>

          {/* Developer Portfolio Display */}
          <section className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-6 bg-brand-500 rounded-full"></span>
                Public Gallery
              </h2>
              <label className="cursor-pointer text-xs font-bold text-brand-600 hover:underline">
                Upload New
                <input type="file" multiple className="hidden" accept="image/*" onChange={async (e) => {
                  const files = e.target.files;
                  if (!files) return;
                  const newImages = [...images];
                  for(let i=0; i<files.length; i++) {
                    const formData = new FormData();
                    formData.append("file", files[i]);
                    const seoName = `${name.toLowerCase().replace(/\s+/g, "-")}-gallery-${images.length + i + 1}`;
                    const { data } = await api.post(`/upload/image?folder=developers&filename=${seoName}`, formData);
                    newImages.push(data.data.url);
                  }
                  setImages(newImages);
                }} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 group">
                  <Image src={img} alt={`Dev Image ${idx}`} fill className="object-cover" />
                  <button 
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                    className="absolute inset-0 bg-error-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold"
                  >
                    REMOVE
                  </button>
                </div>
              ))}
              <div className="aspect-video flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
                <span className="text-[10px] font-bold text-gray-400">EMPTY SLOT</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
