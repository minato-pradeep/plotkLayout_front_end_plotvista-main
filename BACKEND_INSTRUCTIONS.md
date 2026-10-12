# PlotVista Prestige — Backend Developer Instructions

---

## 1. Project Overview

PlotVista Prestige is a **real estate housing layout management system**.

An admin uses this tool to:
- Draw a housing society map on a grid
- Assign each plot a type (house, apartment, shop, road, park, etc.)
- Manage residents (owners and tenants) for each plot
- Configure apartment buildings floor by floor with per-unit BHK, shops, rent, sqft
- View project area statistics

**Current State:** The frontend is 100% complete and working. All data is saved in the browser's `localStorage`. Your job is to build the backend so data is saved in a real database and multiple users/projects can be managed.

---

## 2. Tech Stack (Recommended)

| Layer          | Technology              |
|----------------|-------------------------|
| Runtime        | Node.js                 |
| Framework      | NestJS (preferred) or Express |
| Database       | PostgreSQL               |
| ORM            | Prisma                  |
| Auth           | JWT (Bearer token)      |
| API Style      | REST                    |
| File Storage   | AWS S3 (future, for exports) |

---

## 3. How The Frontend Works (What You Need to Know)

### 3.1 The Grid System

The map is a grid of **blocks** separated by **streets**.

```
[Block] --- [V-Road] --- [Block] --- [V-Road] --- [Block]
   |                        |                        |
[H-Road]                [H-Road]                [H-Road]
   |                        |                        |
[Block] --- [V-Road] --- [Block] --- [V-Road] --- [Block]
```

- `hStreets` = number of horizontal roads
- `vStreets` = number of vertical roads  
- `plotsPerBlock` = how many plots fit in one block (e.g. 2 = 2×2 grid per block)

Each plot cell has a **unique key** like: `r0c1pr2pc0`
- `r0` = block row 0
- `c1` = block column 1
- `pr2` = plot row 2 inside that block
- `pc0` = plot column 0 inside that block

### 3.2 Plot Types

Every cell on the map is one of these types:

| Type        | Description                              |
|-------------|------------------------------------------|
| `vacant`    | Empty plot, nothing assigned             |
| `house`     | Residential house with name/price/sqft   |
| `apartment` | Multi-floor tower with units inside      |
| `shop`      | Commercial shop (grocery, gym, etc.)     |
| `park`      | Green open area                          |
| `watertank` | Utility water tank                       |
| `hospital`  | Clinic or hospital                       |
| `road`      | Road strip (horizontal or vertical)      |

### 3.3 Special Plot Features

**Split Cell** — A single plot can be divided into 2 halves:
- `splitDirection: 'h'` = Top / Bottom halves
- `splitDirection: 'v'` = Left / Right halves
- Each half has its own type, name, and residents independently

**Merge** — Multiple adjacent plot cells can be visually merged into one large block. The first cell in the group is the "primary" (visible), the rest are hidden placeholders.

### 3.4 Apartment Structure

When a plot is set as `apartment`, it has an `aptConfig` object:

```json
{
  "blockName": "Prestige Tower A",
  "floors": 5,
  "unitsPerFloor": 4,
  "defaultBhk": "2BHK",
  "facilities": ["Gym", "Pool", "Parking"],
  "skippedUnits": ["2C"],
  "unitShops": {
    "G1": "pharmacy",
    "G2": "mini_market"
  },
  "unitBhk": {
    "1A": "1BHK",
    "2A": "2BHK",
    "3A": "3BHK"
  },
  "unitNames": {
    "1A": "101",
    "1B": "102"
  },
  "unitDetails": {
    "1A": { "rent": 8000, "sqft": 550 }
  },
  "mergeGroups": [
    ["1A", "1B"]
  ]
}
```

**Unit ID format:**
- Regular floors: `{floorNumber}{Letter}` → `1A`, `1B`, `2A`, `3C`
- Ground floor: `G{number}` → `G1`, `G2`, `G3`

### 3.5 Residents

A resident belongs to either:
- A **plot** directly (house, shop, vacant plot)
- A specific **unit inside an apartment** (identified by `unit` field like `"1A"`)

```json
{
  "name": "John Doe",
  "phone": "555-0101",
  "role": "owner",
  "unit": "1A",
  "note": "Moved in Jan 2024"
}
```

`role` is always either `"owner"` or `"tenant"`.

---

## 4. The Full JSON Structure (What Frontend Sends/Expects)

This is the exact shape of data the frontend currently saves to localStorage.  
Your API must **accept this exact structure** on save and **return this exact structure** on load.

```json
{
  "hStreets": 2,
  "vStreets": 3,
  "plotsPerBlock": 2,
  "hStreetNames": ["Maple Avenue", "Birch Lane"],
  "vStreetNames": ["Gold Crescent", "Silver Close", "Diamond Road"],
  "selectedKey": null,
  "selectedHalf": null,
  "mergeGroups": [
    ["r0c0pr0pc0", "r0c0pr0pc1"]
  ],
  "plots": {
    "r0c0pr0pc0": {
      "type": "apartment",
      "name": "Prestige Tower",
      "residents": [
        {
          "name": "John Doe",
          "phone": "555-0101",
          "role": "tenant",
          "unit": "1A",
          "note": ""
        }
      ],
      "aptConfig": {
        "blockName": "Tower A",
        "floors": 5,
        "unitsPerFloor": 4,
        "defaultBhk": "2BHK",
        "facilities": ["Gym", "Pool"],
        "skippedUnits": ["2C"],
        "unitShops": { "G1": "pharmacy" },
        "unitBhk": { "1A": "1BHK", "2A": "2BHK" },
        "unitNames": { "1A": "101" },
        "unitDetails": { "1A": { "rent": 8000, "sqft": 550 } },
        "mergeGroups": [["1A", "1B"]]
      }
    },
    "r0c1pr0pc0": {
      "type": "house",
      "name": "Villa 34",
      "price": 6000000,
      "sqft": 1200,
      "residents": [
        {
          "name": "Alice Bob",
          "phone": "555-9999",
          "role": "owner"
        }
      ]
    },
    "r0c1pr0pc1": {
      "type": "vacant",
      "splitDirection": "v",
      "splitData": {
        "a": {
          "type": "shop",
          "shopType": "grocery",
          "name": "Grocery Store",
          "residents": []
        },
        "b": {
          "type": "house",
          "name": "Villa 35",
          "residents": []
        }
      },
      "residents": []
    },
    "r1c0pr0pc0": {
      "type": "road",
      "roadDirection": "h",
      "name": "Main Street",
      "residents": []
    },
    "r1c0pr0pc1": {
      "type": "park",
      "name": "Central Park",
      "residents": []
    }
  },
  "projectMeta": {
    "totalLandArea": "82,223.377 Sq.Mts",
    "netPlotArea": "47,614.177 Sq.Mts",
    "plottedArea": "47,614.177 Sq.Mts",
    "roadArea": "22,742.200 Sq.Mts",
    "openArea": "8,224.000 Sq.Mts",
    "utilityArea": "852.000 Sq.Mts",
    "civicAmenities": "2,771.000 Sq.Mts"
  }
}
```

---

## 5. Database Tables

### Table: `projects`
One row = one housing layout project.

| Column           | Type         | Notes                          |
|------------------|--------------|--------------------------------|
| id               | UUID PK      | auto generated                 |
| name             | VARCHAR(255) | project name                   |
| h_streets        | INT          | horizontal street count        |
| v_streets        | INT          | vertical street count          |
| plots_per_block  | INT          | plots per block row/col        |
| h_street_names   | JSONB        | array of strings               |
| v_street_names   | JSONB        | array of strings               |
| merge_groups     | JSONB        | array of arrays of plot keys   |
| project_meta     | JSONB        | land area stats object         |
| created_by       | UUID FK      | → users.id                     |
| created_at       | TIMESTAMP    |                                |
| updated_at       | TIMESTAMP    |                                |

---

### Table: `plots`
One row = one cell on the grid.

| Column           | Type         | Notes                                      |
|------------------|--------------|--------------------------------------------|
| id               | UUID PK      |                                            |
| project_id       | UUID FK      | → projects.id                              |
| plot_key         | VARCHAR(50)  | e.g. `r0c1pr2pc0` — unique per project     |
| type             | VARCHAR(20)  | vacant/house/apartment/shop/park/road/etc  |
| name             | VARCHAR(255) |                                            |
| price            | DECIMAL      | house valuation                            |
| sqft             | INT          | floor area                                 |
| road_direction   | VARCHAR(1)   | 'h' or 'v', only for road type             |
| shop_type        | VARCHAR(50)  | grocery/gym/pharmacy etc.                  |
| split_direction  | VARCHAR(1)   | 'h' or 'v', null if not split              |
| split_data       | JSONB        | { a: {...}, b: {...} } when split          |
| apt_config       | JSONB        | full aptConfig object when apartment       |
| created_at       | TIMESTAMP    |                                            |
| updated_at       | TIMESTAMP    |                                            |

**Unique constraint:** `(project_id, plot_key)`

---

### Table: `residents`
One row = one person living in a plot or apartment unit.

| Column              | Type         | Notes                                    |
|---------------------|--------------|------------------------------------------|
| id                  | UUID PK      |                                          |
| plot_id             | UUID FK      | → plots.id                               |
| name                | VARCHAR(255) |                                          |
| phone               | VARCHAR(50)  |                                          |
| role                | VARCHAR(10)  | 'owner' or 'tenant'                      |
| unit                | VARCHAR(20)  | apartment unit id e.g. '1A', null if house |
| note                | TEXT         | optional notes                           |
| split_half          | VARCHAR(1)   | 'a' or 'b' if resident belongs to a split half |
| created_at          | TIMESTAMP    |                                          |

---

### Table: `users`
Admin users who manage projects.

| Column       | Type         | Notes                    |
|--------------|--------------|--------------------------|
| id           | UUID PK      |                          |
| email        | VARCHAR(255) | unique                   |
| password     | VARCHAR(255) | bcrypt hashed            |
| name         | VARCHAR(255) |                          |
| role         | VARCHAR(20)  | 'admin' or 'viewer'      |
| created_at   | TIMESTAMP    |                          |

---

## 6. API Endpoints

Base URL: `https://api.plotvista.com/v1`

All endpoints (except login) require:
```
Authorization: Bearer <jwt_token>
```

---

### Auth

| Method | Endpoint         | Description        | Body                          |
|--------|------------------|--------------------|-------------------------------|
| POST   | `/auth/login`    | Login              | `{ email, password }`         |
| POST   | `/auth/register` | Register admin     | `{ email, password, name }`   |
| GET    | `/auth/me`       | Get current user   | —                             |

**Login Response:**
```json
{
  "token": "eyJhbGci...",
  "user": { "id": "uuid", "name": "Admin", "email": "admin@example.com" }
}
```

---

### Projects

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | `/projects`           | List all projects for current user |
| POST   | `/projects`           | Create new project                 |
| GET    | `/projects/:id`       | Get full project with all plots    |
| PUT    | `/projects/:id`       | Update project settings            |
| DELETE | `/projects/:id`       | Delete project                     |

**POST /projects body:**
```json
{
  "name": "Prestige Patio Villas",
  "hStreets": 2,
  "vStreets": 3,
  "plotsPerBlock": 2
}
```

**GET /projects/:id response:**
Returns the full JSON structure shown in Section 4.

---

### Save Full State

| Method | Endpoint                    | Description                          |
|--------|-----------------------------|--------------------------------------|
| PUT    | `/projects/:id/state`       | Save entire project state at once    |
| GET    | `/projects/:id/state`       | Load entire project state            |

**PUT /projects/:id/state body:**
The full JSON from Section 4 (the entire state object).

> This is the **most important endpoint**. The frontend saves everything at once. You store it, you return it. Simple.

---

### Plots (Optional granular endpoints for future)

| Method | Endpoint                              | Description              |
|--------|---------------------------------------|--------------------------|
| GET    | `/projects/:id/plots`                 | Get all plots            |
| PUT    | `/projects/:id/plots/:plotKey`        | Create or update a plot  |
| DELETE | `/projects/:id/plots/:plotKey`        | Clear a plot to vacant   |

---

### Residents (Optional granular endpoints for future)

| Method | Endpoint                                          | Description           |
|--------|---------------------------------------------------|-----------------------|
| GET    | `/projects/:id/plots/:plotKey/residents`          | Get residents         |
| POST   | `/projects/:id/plots/:plotKey/residents`          | Add resident          |
| DELETE | `/projects/:id/plots/:plotKey/residents/:resId`   | Remove resident       |

---

## 7. Where To Connect In The Frontend

The frontend has one file that handles all state:

**`src/app/state.service.ts`**

Currently it uses Angular signals and localStorage. You need to add HTTP calls here.

### Current localStorage save (line to find):
```typescript
// In state.service.ts
saveState() {
  // currently saves to undoStack only
}
```

### What to add:
```typescript
import { HttpClient } from '@angular/common/http';

// Replace localStorage.setItem with:
this.http.put(`/api/projects/${projectId}/state`, this.state()).subscribe();

// Replace localStorage.getItem with:
this.http.get(`/api/projects/${projectId}/state`).subscribe(state => {
  this.state.set(state);
});
```

### In `app.component.ts`, the `loadHardcodedJson()` method:
```typescript
// Currently hardcoded data — replace with:
ngOnInit() {
  this.http.get(`/api/projects/${projectId}/state`).subscribe(state => {
    this.stateService.state.set(state);
  });
}
```

---

## 8. Business Rules to Enforce in Backend

1. **plot_key must be unique per project** — add a unique index on `(project_id, plot_key)`
2. **A plot cannot be both split AND in a merge group** — validate this before saving
3. **Resident role** must be exactly `"owner"` or `"tenant"` — validate with enum
4. **Apartment unit IDs** follow the pattern:
   - Regular: `{1-99}{A-Z}` e.g. `1A`, `12C`
   - Ground: `G{1-99}` e.g. `G1`, `G4`
5. **skippedUnits** are soft-deleted — never hard delete them, just mark `is_skipped: true`
6. **mergeGroups** — the first key in each array is the "primary" (visible) cell
7. **selectedKey and selectedHalf** are UI-only state — do NOT save these to the database
8. **Undo history** is frontend-only (50 steps in memory) — backend does not store undo history

---

## 9. Shop Types Reference

These are the valid values for `shopType` field:

| Value            | Label            |
|------------------|------------------|
| `grocery`        | Grocery Store    |
| `gym`            | Gym              |
| `playstation`    | PlayStation      |
| `pharmacy`       | Pharmacy         |
| `restaurant`     | Restaurant       |
| `bakery`         | Bakery           |
| `salon`          | Salon / Spa      |
| `laundry`        | Laundry          |
| `stationery`     | Stationery       |
| `tailoring`      | Tailoring        |
| `clinic`         | Mini Clinic      |
| `atm`            | ATM / Bank       |

Community shops inside apartments use these values:

| Value              | Label            |
|--------------------|------------------|
| `community_hall`   | Community Hall   |
| `mini_market`      | Mini Market      |
| `pharmacy`         | Pharmacy         |
| `laundry`          | Laundry          |
| `gym_room`         | Gym Room         |
| `salon`            | Salon            |
| `cafe`             | Café             |
| `library`          | Library          |
| `kids_play`        | Kids Play        |
| `office`           | Office Space     |
| `clinic`           | Clinic           |
| `atm`              | ATM              |

---

## 10. BHK Types Reference

| Value   | Bedrooms | Bathrooms | Hall | Kitchen | Approx Sqft  |
|---------|----------|-----------|------|---------|--------------|
| `1BHK`  | 1        | 1         | 1    | 1       | 450–600      |
| `2BHK`  | 2        | 2         | 1    | 1       | 750–1000     |
| `3BHK`  | 3        | 2         | 1    | 1       | 1100–1400    |

---

## 11. Development Phases

### Phase 1 — MVP (Do This First)
- [ ] User registration and login (JWT)
- [ ] Create project endpoint
- [ ] Save full state endpoint (`PUT /projects/:id/state`)
- [ ] Load full state endpoint (`GET /projects/:id/state`)
- [ ] List projects endpoint

This alone makes the app fully functional with a real database.

### Phase 2 — Granular APIs
- [ ] Individual plot CRUD endpoints
- [ ] Individual resident CRUD endpoints
- [ ] Project delete

### Phase 3 — Advanced
- [ ] Multi-user project sharing
- [ ] Project export to PDF/Excel
- [ ] Audit log (who changed what, when)
- [ ] Image upload for plots (floor plan images)

---

## 12. Environment Variables Needed

```env
DATABASE_URL=postgresql://user:password@localhost:5432/plotvista
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
PORT=3000
FRONTEND_URL=http://localhost:4200
```

---

## 13. CORS Setup

The frontend runs on `http://localhost:4200` in development.
Allow these origins:

```javascript
// NestJS example
app.enableCors({
  origin: ['http://localhost:4200', 'https://yourdomain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

## 14. Quick Start Checklist for Backend Developer

```
Day 1:
  ✅ Set up NestJS project
  ✅ Connect PostgreSQL with Prisma
  ✅ Create users table + auth endpoints (register/login/me)
  ✅ Test JWT works

Day 2:
  ✅ Create projects table
  ✅ POST /projects — create project
  ✅ GET /projects — list projects
  ✅ GET /projects/:id/state — return empty state
  ✅ PUT /projects/:id/state — save full JSON blob

Day 3:
  ✅ Create plots table + residents table
  ✅ Parse the state JSON and store plots + residents in proper tables
  ✅ On GET /state, reconstruct the JSON from tables and return it
  ✅ Test with frontend — replace localStorage with API calls

Day 4+:
  ✅ Granular plot/resident endpoints
  ✅ Validation and error handling
  ✅ Deploy
```

---

## 15. Contact / Questions

If anything in the frontend data structure is unclear, check these files:

| File | What It Contains |
|------|-----------------|
| `src/types.ts` | All TypeScript interfaces — the exact shape of every data object |
| `src/app/state.service.ts` | All state mutations — shows exactly what data changes and when |
| `src/app/app.component.ts` | Main app logic — shows all user actions and what they trigger |
| `src/app/components/apt-modal/` | Apartment configuration form |
| `src/app/components/apt-detail-modal/` | Apartment schematic viewer |
| `src/app/components/res-modal/` | Add resident form |

The `src/types.ts` file is the **single source of truth** for all data shapes.
Start there before writing any database schema.
