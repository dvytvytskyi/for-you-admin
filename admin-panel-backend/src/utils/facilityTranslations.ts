export interface FacilityTranslation {
  nameRu: string;
  nameAr: string;
}

export const FACILITY_TRANSLATIONS: Record<string, FacilityTranslation> = {
  '24/7 Security': { nameRu: 'Охрана 24/7', nameAr: 'أمن 24/7' },
  'Balcony': { nameRu: 'Балкон', nameAr: 'شرفة' },
  'BBQ Area': { nameRu: 'Зона барбекю', nameAr: 'منطقة شواء' },
  'Built-in Wardrobes': { nameRu: 'Встроенные шкафы', nameAr: 'خزائن مدمجة' },
  'Central A/C': { nameRu: 'Центральный кондиционер', nameAr: 'تكييف مركزي' },
  'Concierge': { nameRu: 'Консьерж', nameAr: 'الكونسيرج' },
  'Gym': { nameRu: 'Тренажёрный зал', nameAr: 'صالة رياضية' },
  'Kids Play Area': { nameRu: 'Детская игровая площадка', nameAr: 'منطقة لعب الأطفال' },
  'Kids Pool': { nameRu: 'Детский бассейн', nameAr: 'مسبح للأطفال' },
  'Kitchen Appliances': { nameRu: 'Кухонная техника', nameAr: 'أجهزة المطبخ' },
  'Landmark View': { nameRu: 'Вид на достопримечательность', nameAr: 'إطلالة على معلم' },
  'Lobby': { nameRu: 'Лобби', nameAr: 'ردهة' },
  'Maid Service': { nameRu: 'Услуги горничной', nameAr: 'خدمة الخادمة' },
  'Maids Room': { nameRu: 'Комната для прислуги', nameAr: 'غرفة خادمة' },
  'Parking': { nameRu: 'Парковка', nameAr: 'موقف سيارات' },
  'Pets Allowed': { nameRu: 'Разрешено с питомцами', nameAr: 'يسمح بالحيوانات الأليفة' },
  'Private Garden': { nameRu: 'Частный сад', nameAr: 'حديقة خاصة' },
  'Private Gym': { nameRu: 'Частный тренажёрный зал', nameAr: 'صالة ألعاب رياضية خاصة' },
  'Private Jacuzzi': { nameRu: 'Частный джакузи', nameAr: 'جاكوزي خاص' },
  'Private Pool': { nameRu: 'Частный бассейн', nameAr: 'مسبح خاص' },
  'Spa': { nameRu: 'СПА', nameAr: 'سبا' },
  'Study': { nameRu: 'Кабинет', nameAr: 'غرفة دراسة' },
  'Swimming Pool': { nameRu: 'Бассейн', nameAr: 'مسبح' },
  'Vastu-compliant': { nameRu: 'Соответствует Васту', nameAr: 'مطابق لفاستو' },
  'Walk-in Closet': { nameRu: 'Гардеробная', nameAr: 'غرفة ملابس' },
  'Water View': { nameRu: 'Вид на воду', nameAr: 'إطلالة على الماء' },
};

export function getFacilityTranslations(nameEn: string): FacilityTranslation {
  return FACILITY_TRANSLATIONS[nameEn] || { nameRu: nameEn, nameAr: nameEn };
}
