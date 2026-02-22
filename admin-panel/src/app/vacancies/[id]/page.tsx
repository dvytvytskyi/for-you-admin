'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { api } from '@/lib/api'
import Form from '@/components/form/Form'
import Label from '@/components/form/Label'
import Input from '@/components/form/input/InputField'
import TextArea from '@/components/form/input/TextArea'
import RichTextEditor from '@/components/form/RichTextEditor'
import Select from '@/components/form/Select'
import Button from '@/components/ui/button/Button'
import { VacancyStatus } from '@/types/vacancy'

export default function EditVacancyPage() {
    const router = useRouter()
    const params = useParams()
    const vacancyId = params.id as string

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeLang, setActiveLang] = useState<'en' | 'ru'>('en')

    const [formData, setFormData] = useState({
        position_en: '',
        position_ru: '',
        shortDescription_en: '',
        shortDescription_ru: '',
        tasks_en: '',
        tasks_ru: '',
        requirements_en: '',
        requirements_ru: '',
        results_en: '',
        results_ru: '',
        offers_en: '',
        offers_ru: '',
        status: VacancyStatus.PENDING,
    })

    const statusOptions = [
        { value: VacancyStatus.PUBLISHED, label: 'Published' },
        { value: VacancyStatus.PENDING, label: 'Pending' },
        { value: VacancyStatus.WITHDRAWN, label: 'Withdrawn' },
    ]

    useEffect(() => {
        const fetchVacancy = async () => {
            try {
                const response = await api.get(`/vacancies/${vacancyId}`)
                if (response.data.success) {
                    const vacancy = response.data.data
                    setFormData({
                        position_en: vacancy.position_en || vacancy.position || '',
                        position_ru: vacancy.position_ru || '',
                        shortDescription_en: vacancy.shortDescription_en || vacancy.shortDescription || '',
                        shortDescription_ru: vacancy.shortDescription_ru || '',
                        tasks_en: vacancy.tasks_en || vacancy.tasks || '',
                        tasks_ru: vacancy.tasks_ru || '',
                        requirements_en: vacancy.requirements_en || vacancy.requirements || '',
                        requirements_ru: vacancy.requirements_ru || '',
                        results_en: vacancy.results_en || vacancy.results || '',
                        results_ru: vacancy.results_ru || '',
                        offers_en: vacancy.offers_en || vacancy.offers || '',
                        offers_ru: vacancy.offers_ru || '',
                        status: vacancy.status || VacancyStatus.PENDING,
                    })
                }
            } catch (error) {
                console.error('Error fetching vacancy:', error)
                setError('Error loading vacancy')
            } finally {
                setFetching(false)
            }
        }

        if (vacancyId) {
            fetchVacancy()
        }
    }, [vacancyId])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleRichTextChange = (name: string) => (value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleStatusChange = (value: string) => {
        setFormData(prev => ({ ...prev, status: value as VacancyStatus }))
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        // Validation - at least English version should be filled
        if (!formData.position_en || !formData.tasks_en || !formData.requirements_en || !formData.results_en || !formData.offers_en) {
            setError('Please fill in all required fields in English')
            setLoading(false)
            setActiveLang('en')
            return
        }

        try {
            // Include legacy fields as English version for backward compatibility
            const dataToSubmit = {
                ...formData,
                position: formData.position_en,
                shortDescription: formData.shortDescription_en,
                tasks: formData.tasks_en,
                requirements: formData.requirements_en,
                results: formData.results_en,
                offers: formData.offers_en,
            }

            const response = await api.patch(`/vacancies/${vacancyId}`, dataToSubmit)
            if (response.data.success) {
                router.push('/vacancies')
            }
        } catch (err: any) {
            console.error('Error updating vacancy:', err)
            setError(err.response?.data?.message || 'Error updating vacancy. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin h-8 w-8 text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
                        Edit Vacancy
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Update vacancy information in English and Russian
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Back
                </Button>
            </div>

            {/* Language Switcher */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
                <button
                    onClick={() => setActiveLang('en')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeLang === 'en'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    English
                </button>
                <button
                    onClick={() => setActiveLang('ru')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeLang === 'ru'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    Russian
                </button>
            </div>

            {/* Form */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
                <Form onSubmit={handleSubmit}>
                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-error-50 border border-error-200 dark:bg-error-900/20 dark:border-error-800">
                            <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Position */}
                        <div>
                            <Label htmlFor="position">Position ({activeLang.toUpperCase()}) *</Label>
                            <Input
                                id={`position_${activeLang}`}
                                name={`position_${activeLang}`}
                                type="text"
                                placeholder={`Vacancy title in ${activeLang === 'en' ? 'English' : 'Russian'}`}
                                value={activeLang === 'en' ? formData.position_en : formData.position_ru}
                                onChange={handleChange}
                                required={activeLang === 'en'}
                                className="text-lg font-semibold"
                            />
                        </div>

                        {/* Short Description */}
                        <div>
                            <Label htmlFor="shortDescription">Description Header ({activeLang.toUpperCase()})</Label>
                            <TextArea
                                id={`shortDescription_${activeLang}`}
                                name={`shortDescription_${activeLang}`}
                                placeholder={`Description header in ${activeLang === 'en' ? 'English' : 'Russian'}`}
                                value={activeLang === 'en' ? formData.shortDescription_en : formData.shortDescription_ru}
                                onChange={handleRichTextChange(`shortDescription_${activeLang}`)}
                                rows={4}
                            />
                        </div>

                        {/* Tasks */}
                        <div>
                            <Label htmlFor="tasks">Tasks ({activeLang.toUpperCase()}) *</Label>
                            <RichTextEditor
                                placeholder={`Describe main tasks in ${activeLang === 'en' ? 'English' : 'Russian'}...`}
                                value={activeLang === 'en' ? formData.tasks_en : formData.tasks_ru}
                                onChange={handleRichTextChange(`tasks_${activeLang}`)}
                            />
                        </div>

                        {/* Requirements */}
                        <div>
                            <Label htmlFor="requirements">Requirements ({activeLang.toUpperCase()}) *</Label>
                            <RichTextEditor
                                placeholder={`Describe candidate requirements in ${activeLang === 'en' ? 'English' : 'Russian'}...`}
                                value={activeLang === 'en' ? formData.requirements_en : formData.requirements_ru}
                                onChange={handleRichTextChange(`requirements_${activeLang}`)}
                            />
                        </div>

                        {/* Results */}
                        <div>
                            <Label htmlFor="results">Expected Results ({activeLang.toUpperCase()}) *</Label>
                            <RichTextEditor
                                placeholder={`What results do we expect in ${activeLang === 'en' ? 'English' : 'Russian'}...`}
                                value={activeLang === 'en' ? formData.results_en : formData.results_ru}
                                onChange={handleRichTextChange(`results_${activeLang}`)}
                            />
                        </div>

                        {/* Offers */}
                        <div>
                            <Label htmlFor="offers">We Offer ({activeLang.toUpperCase()}) *</Label>
                            <RichTextEditor
                                placeholder={`Working conditions in ${activeLang === 'en' ? 'English' : 'Russian'}...`}
                                value={activeLang === 'en' ? formData.offers_en : formData.offers_ru}
                                onChange={handleRichTextChange(`offers_${activeLang}`)}
                            />
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                            {/* Status */}
                            <div>
                                <Label>Status *</Label>
                                <Select
                                    options={statusOptions}
                                    placeholder="Select status"
                                    defaultValue={formData.status}
                                    onChange={handleStatusChange}
                                />
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Form>
            </div>
        </div>
    )
}
