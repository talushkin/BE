# recipes-BE
recipes backend server on port 3333 for vercel

## API Endpoints

### Auth
> All endpoints require `Authorization: Bearer <TOKEN>` header.

---



## 1. RECIPES Endpoints

### Recipe CRUD
- **GET** `/api/recipes`
- **POST** `/api/recipes`
```json
{
    "title": "Italian Pizza Margarita",
    "ingredients": [
        "b"
    ],
    "preparation": "c",
    "categoryId": "68205bf5f94da516687c5920",
    "categoryName": "Salads",
    "imageUrl": "https://oaidalleapiprodscus.blob.core.windows.net/private/org-vLDbTnoXHQHu7bgkVTWTfr2P/user-sOg65zcEkTmU6XRdI0JWQXHx/img-9TvuEO8rmMyFUHxq3Dg2xlKC.png?st=2025-05-13T11%3A21%3A13Z&se=2025-05-13T13%3A21%3A13Z&sp=r&sv=2024-08-04&sr=b&rscd=inline&rsct=image/png&skoid=cc612491-d948-4d2e-9821-2683df3719f5&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-05-12T23%3A24%3A10Z&ske=2025-05-13T23%3A24%3A10Z&sks=b&skv=2024-08-04&sig=wALLh1MxrFnzaXL8Sej1WD15Kzh5rqjmXqaoF%2BtXl4U%3D"
}
```
- **PUT** `/api/recipes/68205cfff94da516687c5924`
```json
{
  "title": "Updated Italian Pizza Margarita",
  "ingredients": [
    "tomato sauce",
    "mozzarella cheese",
    "fresh basil",
    "olive oil"
  ],
  "preparation": "Spread sauce over the dough, add cheese and basil, then bake at 425°F for 12-15 minutes until the crust is golden.",
  "categoryId": "68205bf5f94da516687c5920",
  "categoryName": "Salads",
  "imageUrl": "https://example.com/new-pizza-image.png"
}
```
- **DELETE** `/api/recipes/68205cfff94da516687c5923`

---

### Category CRUD
- **GET** `/api/categories`
- **POST** `/api/categories`
```json
{
  "category": "Main Course",
  "priority": -1,
  "createdAt": "11-05-2025"
}
```
- **PUT** `/api/categories/68205bf5f94da516687c5920`
```json
{
  "priority": 3,
  "createdAt": "2025-05-02",
  "category": "Salads",
  "translatedCategory": [
    { "lang": "en", "value": "Salads" },
    { "lang": "he", "value": " נסיון סלטים" },
    { "lang": "pt", "value": "Saladas" }
  ]
}
```
- **DELETE** `/api/categories/68205cfff94da516687c5921`

---

## 2. SPOTIT Music Endpoints

### Get Song List (YouTube/OpenAI)
**POST** `/api/ai/get-song-list`
By title:
```json
{
  "title": "Radioactive"
}
```
By artist:
```json
{
  "artist": "Sia"
}
```
By genre:
```json
{
  "genre": "pop"
}
```
By title and artist:
```json
{
  "artist": "Shlomo Artzi"
}
```

---

### Get SRT lyrics for a song
**POST** `/api/ai/get-song-lyrics-srt`
```json
{
  "title": "Radioactive",
  "artist": "Imagine Dragons"
}
```

---

### Get lyrics and chords for a song
**POST** `/api/ai/get-song-lyrics-chords`
```json
{
  "title": "Let It Be",
  "artist": "The Beatles"
}
```

---

## 3. AI Endpoints

### Translate Text
**POST** `/api/ai/translate`
```json
{
  "text": "Casseroles",
  "targetLanguage": "he"
}
```

---

### Create Picture from Text
**POST** `/api/ai/image`
```json
{
  "text": "flowers in a field"
}
```

---

### Fill Recipe (AI-generated ingredients & preparation)
**POST** `/api/ai/fill-recipe`
```json
{
  "recipeId": "6824b89071230ea2707f2280",
  "categoryName": "Pizzas",
  "targetLanguage": "en"
}
```
