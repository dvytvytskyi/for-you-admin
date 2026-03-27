"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { Modal } from "@/components/ui/modal";
import { message } from "antd";
import Image from "next/image";

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<any>(null);

  // Form states
  const [nameEn, setNameEn] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [position, setPosition] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [socialLinks, setSocialLinks] = useState({ linkedin: "", instagram: "" });

  const loadAuthors = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/authors");
      setAuthors(data.data || []);
    } catch (error) {
      console.error("Error loading authors:", error);
      message.error("Failed to load authors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuthors();
  }, []);

  const handleOpenModal = (author: any = null) => {
    if (author) {
      setEditingAuthor(author);
      setNameEn(author.nameEn || "");
      setNameRu(author.nameRu || "");
      setPosition(author.position || "");
      setBio(author.bio || "");
      setPhoto(author.photo || "");
      setSocialLinks(author.socialLinks || { linkedin: "", instagram: "" });
    } else {
      setEditingAuthor(null);
      setNameEn("");
      setNameRu("");
      setPosition("");
      setBio("");
      setPhoto("");
      setSocialLinks({ linkedin: "", instagram: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!nameEn) {
      message.warning("Name (EN) is required");
      return;
    }

    const payload = {
      nameEn,
      nameRu,
      position,
      bio,
      photo,
      socialLinks,
    };

    try {
      if (editingAuthor) {
        await api.put(`/authors/${editingAuthor.id}`, payload);
        message.success("Author updated");
      } else {
        await api.post("/authors", payload);
        message.success("Author created");
      }
      setIsModalOpen(false);
      loadAuthors();
    } catch (error) {
      console.error("Error saving author:", error);
      message.error("Failed to save author");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this author?")) return;
    try {
      await api.delete(`/authors/${id}`);
      message.success("Author deleted");
      loadAuthors();
    } catch (error) {
      console.error("Error deleting author:", error);
      message.error("Failed to delete author");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/upload/image?folder=authors", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhoto(data.data.url);
      message.success("Photo uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      message.error("Upload failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Authors & Experts</h1>
          <p className="text-gray-500">Manage article authors and company experts</p>
        </div>
        <Button onClick={() => handleOpenModal()}>+ Add Author</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-10">Loading authors...</div>
        ) : authors.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-400">No authors found</div>
        ) : (
          authors.map((author) => (
            <div key={author.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  {author.photo ? (
                    <Image src={author.photo} alt={author.nameEn} fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xl font-bold">
                      {author.nameEn[0]}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{author.nameEn}</h3>
                  <p className="text-sm text-brand-600 dark:text-brand-400 font-medium">{author.position || "Expert"}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6">
                {author.bio || "No biography provided."}
              </p>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-2">
                  {author.socialLinks?.linkedin && (
                    <span className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">IN</span>
                  )}
                  {author.socialLinks?.instagram && (
                    <span className="w-6 h-6 rounded bg-pink-50 text-pink-600 flex items-center justify-center text-[10px] font-bold">IG</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(author)} className="text-sm font-semibold text-gray-600 hover:text-brand-600 transition-colors">Edit</button>
                  <button onClick={() => handleDelete(author.id)} className="text-sm font-semibold text-error-600 hover:text-error-700 transition-colors">Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-2xl">
        <div className="p-8 space-y-6">
          <h2 className="text-xl font-bold">{editingAuthor ? "Edit Author" : "New Author"}</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name (EN)</label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Full Name in English" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name (RU)</label>
              <Input value={nameRu} onChange={(e) => setNameRu(e.target.value)} placeholder="Имя на русском" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Position / Title</label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Senior Sales Broker" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Expert Photo</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-50 border border-dashed flex items-center justify-center overflow-hidden">
                {photo ? <img src={photo} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">Empty</span>}
              </div>
              <input type="file" onChange={handlePhotoUpload} className="text-sm" accept="image/*" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Biography / Expertise</label>
            <textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              rows={4} 
              className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent p-3 text-sm focus:border-brand-500 outline-none"
              placeholder="Tell about the expert's experience..."
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">LinkedIn URL</label>
              <Input value={socialLinks.linkedin} onChange={(e) => setSocialLinks({...socialLinks, linkedin: e.target.value})} placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Instagram URL</label>
              <Input value={socialLinks.instagram} onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})} placeholder="https://instagram.com/..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Expert</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
