// Export all entities for TypeORM
export { User } from './User';
export { Property, PropertyType } from './Property';
export { PropertyUnit } from './PropertyUnit';
export { Country } from './Country';
export { City } from './City';
export { Area } from './Area';
export { Developer } from './Developer';
export { Facility } from './Facility';
export { Course } from './Course';
export { CourseContent } from './CourseContent';
export { CourseLink } from './CourseLink';
export { News } from './News';
export { NewsContent } from './NewsContent';
export { SupportRequest } from './SupportRequest';
export { SupportResponse } from './SupportResponse';
export { ApiKey } from './ApiKey';

// Array of all entities for TypeORM DataSource
import { User } from './User';
import { Property } from './Property';
import { PropertyUnit } from './PropertyUnit';
import { Country } from './Country';
import { City } from './City';
import { Area } from './Area';
import { Developer } from './Developer';
import { Facility } from './Facility';
import { Course } from './Course';
import { CourseContent } from './CourseContent';
import { CourseLink } from './CourseLink';
import { News } from './News';
import { NewsContent } from './NewsContent';
import { SupportRequest } from './SupportRequest';
import { SupportResponse } from './SupportResponse';
import { ApiKey } from './ApiKey';

export const entities = [
  User,
  Property,
  PropertyUnit,
  Country,
  City,
  Area,
  Developer,
  Facility,
  Course,
  CourseContent,
  CourseLink,
  News,
  NewsContent,
  SupportRequest,
  SupportResponse,
  ApiKey,
];

