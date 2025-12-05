# Developers API - Complete Guide

## Base URL
```
https://admin.foryou-realestate.com/api/public/developers
```

## Authentication
All endpoints require authentication via **API Key**:
- Header: `x-api-key: <your-api-key>`

---

## 📋 Developer Entity Schema

```typescript
interface Developer {
  id: string;                    // UUID (auto-generated)
  name: string;                  // Unique developer name (required)
  logo: string | null;            // Logo URL (optional)
  description: string | null;     // Developer description text (optional)
  images: string[] | null;        // Array of photo URLs (optional)
  projectsCount: {                // Count of properties by type
    total: number;                // Total properties
    offPlan: number;              // Off-plan properties count
    secondary: number;            // Secondary properties count
  };
  createdAt: string;             // ISO 8601 date string
}
```

---

## 🔍 Endpoints

### 1. GET `/api/public/developers`
Get all developers with project counts.

**Request:**
```http
GET /api/public/developers
x-api-key: <your-api-key>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "155eaa8e-3708-449a-8348-16d25d0cf318",
      "name": "Emaar Properties",
      "logo": "https://picsum.photos/200/200?random=1",
      "description": "Emaar Properties is one of the world's most valuable and admired real estate development companies. Founded in 1997, Emaar has shaped the skylines of Dubai and established itself as a global leader in premium real estate development.\n\nWith a portfolio of iconic projects including Burj Khalifa, the world's tallest building, Dubai Mall, one of the world's largest shopping destinations, and the prestigious Dubai Marina, Emaar has redefined luxury living and commercial excellence.\n\n...",
      "images": [
        "https://picsum.photos/800/600?random=10",
        "https://picsum.photos/800/600?random=11",
        "https://picsum.photos/800/600?random=12",
        "https://picsum.photos/800/600?random=13"
      ],
      "projectsCount": {
        "total": 15,
        "offPlan": 10,
        "secondary": 5
      },
      "createdAt": "2025-12-04T14:19:38.740Z"
    },
    {
      "id": "15c2c5bc-f653-4991-9220-aa2699b2b8e7",
      "name": "DAMAC Properties",
      "logo": "https://picsum.photos/200/200?random=2",
      "description": "DAMAC Properties is a leading luxury real estate developer in the Middle East, with a strong presence in Dubai and expanding operations across the region. Established in 2002, DAMAC has delivered over 40,000 residential units and continues to shape the luxury real estate landscape.\n\n...",
      "images": [
        "https://picsum.photos/800/600?random=20",
        "https://picsum.photos/800/600?random=21",
        "https://picsum.photos/800/600?random=22",
        "https://picsum.photos/800/600?random=23",
        "https://picsum.photos/800/600?random=24"
      ],
      "projectsCount": {
        "total": 8,
        "offPlan": 6,
        "secondary": 2
      },
      "createdAt": "2025-12-05T11:16:25.774Z"
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (missing or invalid API key)
- `500` - Internal server error

---

### 2. GET `/api/public/developers/:id`
Get a single developer by ID with project counts.

**Request:**
```http
GET /api/public/developers/155eaa8e-3708-449a-8348-16d25d0cf318
x-api-key: <your-api-key>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "155eaa8e-3708-449a-8348-16d25d0cf318",
    "name": "Emaar Properties",
    "logo": "https://picsum.photos/200/200?random=1",
    "description": "Emaar Properties is one of the world's most valuable and admired real estate development companies. Founded in 1997, Emaar has shaped the skylines of Dubai and established itself as a global leader in premium real estate development.\n\nWith a portfolio of iconic projects including Burj Khalifa, the world's tallest building, Dubai Mall, one of the world's largest shopping destinations, and the prestigious Dubai Marina, Emaar has redefined luxury living and commercial excellence.\n\nThe company's commitment to innovation, quality, and sustainability has earned it numerous international awards and recognition. Emaar continues to expand its footprint globally while maintaining its core values of excellence, integrity, and customer satisfaction.\n\nKey Achievements:\n• Developer of Burj Khalifa - World's Tallest Building\n• Creator of Dubai Mall - World's Largest Shopping Destination\n• Over 100,000 residential units delivered\n• Presence in 10+ countries worldwide\n• Award-winning sustainable developments",
    "images": [
      "https://picsum.photos/800/600?random=10",
      "https://picsum.photos/800/600?random=11",
      "https://picsum.photos/800/600?random=12",
      "https://picsum.photos/800/600?random=13"
    ],
    "projectsCount": {
      "total": 15,
      "offPlan": 10,
      "secondary": 5
    },
    "createdAt": "2025-12-04T14:19:38.740Z"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (missing or invalid API key)
- `404` - Developer not found
- `500` - Internal server error

---

## 📝 Field Descriptions

### `id` (string, UUID)
Unique identifier for the developer. Auto-generated by the database.

### `name` (string, required)
Unique developer name. Used for identification and display.

### `logo` (string | null)
URL to the developer's logo image. Can be null if no logo is set.

### `description` (string | null)
Detailed description of the developer. Can include:
- Company history
- Key achievements
- Portfolio highlights
- Awards and recognition
- Values and mission

### `images` (string[] | null)
Array of photo URLs showcasing the developer's projects, offices, or other relevant images. Can be null or empty array.

### `projectsCount` (object)
Count of properties associated with this developer:
- `total` (number): Total number of properties
- `offPlan` (number): Number of off-plan properties
- `secondary` (number): Number of secondary properties

### `createdAt` (string, ISO 8601)
Date and time when the developer was created in the database.

---

## 🔧 Usage Examples

### JavaScript/TypeScript (Fetch API)
```typescript
// Get all developers
async function getAllDevelopers() {
  const response = await fetch('https://admin.foryou-realestate.com/api/public/developers', {
    headers: {
      'x-api-key': 'your-api-key-here'
    }
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('Developers:', result.data);
  }
}

// Get single developer
async function getDeveloperById(id: string) {
  const response = await fetch(`https://admin.foryou-realestate.com/api/public/developers/${id}`, {
    headers: {
      'x-api-key': 'your-api-key-here'
    }
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('Developer:', result.data);
  }
}
```

### JavaScript/TypeScript (Axios)
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://admin.foryou-realestate.com/api/public',
  headers: {
    'x-api-key': 'your-api-key-here'
  }
});

// Get all developers
async function getAllDevelopers() {
  try {
    const response = await api.get('/developers');
    console.log('Developers:', response.data.data);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get single developer
async function getDeveloperById(id: string) {
  try {
    const response = await api.get(`/developers/${id}`);
    console.log('Developer:', response.data.data);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### cURL
```bash
# Get all developers
curl -X GET "https://admin.foryou-realestate.com/api/public/developers" \
  -H "x-api-key: your-api-key-here"

# Get single developer
curl -X GET "https://admin.foryou-realestate.com/api/public/developers/155eaa8e-3708-449a-8348-16d25d0cf318" \
  -H "x-api-key: your-api-key-here"
```

### Python (requests)
```python
import requests

API_KEY = 'your-api-key-here'
BASE_URL = 'https://admin.foryou-realestate.com/api/public'

headers = {
    'x-api-key': API_KEY
}

# Get all developers
def get_all_developers():
    response = requests.get(f'{BASE_URL}/developers', headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            return data['data']
    return None

# Get single developer
def get_developer_by_id(developer_id):
    response = requests.get(f'{BASE_URL}/developers/{developer_id}', headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data['success']:
            return data['data']
    return None
```

---

## 🎯 Use Cases

### 1. Display Developer List
Use the `/developers` endpoint to show a list of all developers with their logos, names, and project counts.

```typescript
const developers = await getAllDevelopers();
developers.forEach(dev => {
  console.log(`${dev.name}: ${dev.projectsCount.total} projects`);
});
```

### 2. Developer Profile Page
Use the `/developers/:id` endpoint to show detailed information about a specific developer.

```typescript
const developer = await getDeveloperById('155eaa8e-3708-449a-8348-16d25d0cf318');
console.log(developer.description);
console.log(`Images: ${developer.images?.length || 0}`);
```

### 3. Filter Properties by Developer
Use the developer ID to filter properties in your application.

```typescript
// Get developer
const developer = await getDeveloperById(developerId);

// Filter properties by developer
const properties = allProperties.filter(p => p.developerId === developer.id);
```

### 4. Developer Gallery
Display developer images in a gallery format.

```typescript
const developer = await getDeveloperById(developerId);
if (developer.images && developer.images.length > 0) {
  developer.images.forEach(imageUrl => {
    // Display image in gallery
  });
}
```

---

## ⚠️ Important Notes

1. **API Key Required**: All endpoints require a valid API key in the `x-api-key` header.

2. **Description Format**: The `description` field is stored as plain text. If you need structured data, parse it accordingly.

3. **Images Array**: The `images` field is an array of URL strings. Always check if it's null or empty before iterating.

4. **Projects Count**: The `projectsCount` is calculated in real-time based on properties in the database. It may change as properties are added or removed.

5. **Logo and Images**: Currently using placeholder images from `picsum.photos`. In production, these should be replaced with actual developer logos and photos.

6. **Case Sensitivity**: Developer names are case-sensitive. "Emaar Properties" is different from "emaar properties".

---

## 🧪 Test Data

The API includes test data for 2 developers:

1. **Emaar Properties**
   - Logo: `https://picsum.photos/200/200?random=1`
   - 4 gallery images
   - Full description with achievements

2. **DAMAC Properties**
   - Logo: `https://picsum.photos/200/200?random=2`
   - 5 gallery images
   - Full description with highlights

---

## 🔗 Related Endpoints

- **Properties API**: Filter properties by developer ID
  - `/api/public/properties?developerId=<id>`

- **All Public Data**: Get all data including developers
  - `/api/public/data`

---

## 📞 Support

For API key issues or questions, contact the development team.

---

**Last Updated**: December 5, 2025

