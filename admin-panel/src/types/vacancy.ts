export enum VacancyStatus {
    PUBLISHED = 'published',
    PENDING = 'pending',
    WITHDRAWN = 'withdrawn',
}

export interface Vacancy {
    id: string;
    // English fields
    position_en: string;
    shortDescription_en: string;
    tasks_en: string;
    requirements_en: string;
    results_en: string;
    offers_en: string;

    // Russian fields
    position_ru: string;
    shortDescription_ru: string;
    tasks_ru: string;
    requirements_ru: string;
    results_ru: string;
    offers_ru: string;

    // Base fields (legacy or mapped)
    position: string;
    shortDescription: string;
    tasks: string;
    requirements: string;
    results: string;
    offers: string;

    status: VacancyStatus;
    viewsCount: number;
    applicationsCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface VacancyRequest {
    id: string;
    vacancyId: string;
    vacancy?: Vacancy;
    name: string;
    email: string;
    phone: string;
    cvUrl: string;
    message: string;
    createdAt: string;
}
