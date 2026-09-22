# 🧠 Agent Configuration — Admin Panel (Bangla Fashions)

## 🏷️ Brand

- **Company:** Bangla Fashions — a traditional clothing brand in Sylhet, trading
  since 1 September 2007. It sells retail and wholesale from three showrooms.
- **Tagline:** A Fashion House of Deshi Brand
- **Catalogue:** t-shirts, polo shirts, fotua, panjabi, formal & casual shirts,
  pants/chinos, jeans, and women's & kids' wear (kurti, three-piece, saree, kids sets).
- **Palette:** brand green `#128a44` (primary) + brand red `#ec1f28` (accent), both
  sampled from the client's logo in `docs/brand/logo-source.png`.
- **Currency:** BDT (৳) · **Country:** Bangladesh
- Bangla Fashions is a retailer and wholesaler, not a manufacturer. Never write copy
  that claims production, factories, fabric sourcing or stitching. Never invent
  delivery times, return windows, order minimums, opening hours or social handles —
  if the owner has not supplied a number, describe how it works or point at Contact.
- Site name and theme colours are admin-editable (Appearance tab); the values
  hardcoded in `src/app/layout.js` are fallbacks only.

---

## 📁 Repository Structure

Root contains:
- `/client` → ❌ DO NOT USE
- `/frontend` → ✅ Frontend (PRIMARY WORKSPACE)
- `/backend` → ✅ Backend (REFERENCE + LIMITED MODIFICATION)

---

## 🎯 Objective

Build a fully functional **Admin Panel frontend** for an e-commerce system using existing backend APIs.

---

## ⚠️ Hard Constraints (MANDATORY)

1. NEVER modify `/client`
2. ALWAYS inspect `/backend` before implementing API calls
3. If API does not match frontend needs → MODIFY backend accordingly
4. DO NOT assume API structure — VERIFY from code
5. DO NOT implement features outside defined scope
6. DO NOT skip phases
7. STOP after completing each phase and WAIT for instruction

---

## 🧩 Execution Model

- Work strictly in **phases**
- Each phase must be:
  - Fully functional
  - Tested (basic validation)
  - Cleanly structured
- After each phase:
  - Provide summary
  - List changed files
  - WAIT

---

## 🏗️ Frontend Architecture Rules (`/frontend`)

- Use modular folder structure
- Must include reusable components:
  - `Sidebar`
  - `Layout`
  - `Form Components`
  - `UI Cards`
- Maintain separation of concerns:
  - pages
  - components
  - services (API calls)
  - hooks (if needed)
- Ensure responsive design (mobile-first)
- Follow modern e-commerce UI patterns

---

## 🔌 Backend Rules (`/backend`)

- Read API controllers/routes before usage
- Modify ONLY when required
- Maintain consistency in:
  - request body
  - response format
- Do not introduce unnecessary complexity

---

# 🚀 PHASE 1 — Admin Authentication

## Route:
- `/admin/login`

## Requirements:
- Build login UI
- Integrate backend login API
- Handle success/failure states
- On success → redirect to `/admin/dashboard`

---

# 📊 PHASE 2 — Admin Dashboard

## Route:
- `/admin/dashboard`

## Layout:
- Left Sidebar (vertical navigation)
- Main content area

## Features:
- Display:
  - Total Products
  - Total Orders

## Sidebar Items:
- Create Category
- Upload Product
- All Products

---

# 🗂️ PHASE 3 — Category Management

## Routes:
- `/admin/dashboard/create-category`
- `/admin/dashboard/edit-category/:id`

## Features:
- Create category
- Edit category

## 🔴 REQUIRED BACKEND CHANGE:
- REMOVE sub-category functionality completely
- Only allow single-level category

---

# 📦 PHASE 4 — Product Management

## Routes:
- `/admin/dashboard/upload-product`
- `/admin/dashboard/all-products`
- `/admin/dashboard/all-products/:id`
- `/admin/dashboard/edit-product/:id`

## Features:
- Upload product (with image)
- List all products
- View single product details
- Edit product

---

## 🧪 Validation Rules (Per Phase)

Before marking a phase complete:
- No console errors
- API calls working correctly
- UI responsive (mobile + desktop)
- Code is modular and readable
- Reusable components are used

---

## ⛔ Out of Scope

DO NOT implement:
- Advanced analytics
- Order management विस्तार
- User management
- Any feature not explicitly listed

---

## 🧭 Agent Behavior Guidelines

- Think before coding
- Prefer incremental implementation
- Reuse existing components when possible
- If blocked → analyze `/backend` first
- If still blocked → ask for clarification
- Avoid overengineering

---

## ✅ Completion Protocol

After each phase:
1. Summarize completed work
2. List created/modified files
3. Highlight any backend changes
4. WAIT for next instruction