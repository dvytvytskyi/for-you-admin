# Frontend Instructions: New URL Slug Format

We have updated the property URL structure to be more SEO-friendly and consistent. Please follow these steps to update the frontend.

## 1. New Slug Format
All property slugs generally follow this pattern:
- **Off-plan:** `/new-{slugified-name}-{short-id}`
  - Example: `/new-jumeirah-residences-231e`
- **Secondary:** `/used-{slugified-name}-{short-id}`
  - Example: `/used-downtown-views-8a9f`

## 2. Generating Links (Critical)
**Stop manually constructing slugs.** The backend now guarantees a valid, unique `slug` field for every project.
Use the `slug` field directly from the API response.

### ✅ Correct Approach:
```typescript
// Assuming project object comes from API
<Link href={`/properties/${project.slug}`}>
  {project.name}
</Link>
```

### ❌ Incorrect Approach (Do NOT do this):
```typescript
// Do not manually build slugs anymore
const slug = `${project.name}-${project.id}-foryou-realestate`; // THIS WILL BREAK
```

## 3. API Endpoints
The endpoints remain the same. You just need to pass the new slug.

- **Get Project Details:**
  `GET /api/public/projects/:slug`
  (e.g., `GET /api/public/projects/new-jumeirah-residences-231e`)

## 4. Handling Old Links (404s)
- Old links (e.g., `/some-project-name-uuid-foryou...`) will now return **404 Not Found**.
- **Action:** If you have hardcoded links in the frontend code (e.g., in a footer or "Featured" section), you MUST update them to the new format or fetch them dynamically from the API (`/api/public/projects`).
- **Recommendation:** Implement a 404 page that suggests "Search for properties" to help users who click old external links.

## 5. Summary Checklist
- [ ] Check `<Link>` components to ensure they use `project.slug`.
- [ ] Verify `getStaticPaths` / `getServerSideProps` (if using Next.js) uses the new slug.
- [ ] Update any hardcoded navigation links.
