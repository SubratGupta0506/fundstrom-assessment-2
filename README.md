# SupplyFlow ERP

A full-stack ERP application for managing the industrial sales workflow from customer enquiry through quotation, sales order, inventory reservation, and dispatch.

## Live Application

**Deployable Application:**

https://supplyflow-erp.vercel.app/login


## Business Workflow

```text
Customer
   ↓
Enquiry
   ↓
Quotation
   ↓
Accepted Quotation
   ↓
Sales Order
   ↓
Admin Confirmation
   ↓
Inventory Reservation
   ↓
Dispatch
   ↓
Physical Stock Updated
```

## Features

### Authentication & Authorization
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- ADMIN and SALES_USER roles
- Protected backend APIs
- Backend-enforced authorization

### Customer Enquiries
- Create and view customer enquiries
- Customer information:
  - Company Name
  - Contact Person
  - Mobile
  - Email
  - City
- Required date and notes
- Multiple products and quantities per enquiry
- Enquiry status workflow:
  `NEW → QUOTED → WON / LOST`

### Quotations
- Create quotations from enquiries
- Multiple quotation line items
- Server-side price and total calculation
- Discount and GST calculation
- Valid-until date
- Quotation status workflow:
  `DRAFT → SENT → ACCEPTED / REJECTED`
- Accepted quotations can be converted into Sales Orders
- Rejected or draft quotations cannot be converted

### Sales Orders
- Convert accepted quotations into Sales Orders
- One quotation can generate at most one Sales Order
- Sales Order traceability to the originating quotation and enquiry
- Status workflow:
  `PENDING → CONFIRMED → DISPATCHED`
- Confirmed orders can be cancelled according to workflow rules

### Inventory
- Physical quantity tracking
- Reserved quantity tracking
- Available quantity calculated as:

```text
Available = Physical Quantity - Reserved Quantity
```

- Admin inventory updates
- Prevention of negative quantities
- Prevention of reserved quantity exceeding physical quantity
- Stock validation during order confirmation

### Reservation & Dispatch
- Inventory is reserved when an ADMIN confirms a Sales Order
- Physical stock remains unchanged during reservation
- Dispatch decreases physical stock
- Dispatch also decreases reserved stock
- Duplicate dispatch is prevented
- Dispatch is restricted to confirmed orders
- Transactional inventory updates protect stock consistency

## Roles & Permissions

| Operation | ADMIN | SALES_USER |
|---|---:|---:|
| Login | ✓ | ✓ |
| View enquiries | ✓ | ✓ |
| Create enquiries | ✓ | ✓ |
| View quotations | ✓ | ✓ |
| Create quotations | ✓ | ✓ |
| Update quotation status | ✓ | ✓ |
| Convert accepted quotation | ✓ | ✓ |
| View sales orders | ✓ | ✓ |
| View inventory | ✓ | ✓ |
| Confirm Sales Order | ✓ | — |
| Cancel confirmed Sales Order | ✓ | — |
| Update inventory | ✓ | — |
| Dispatch Sales Order | ✓ | — |

Authorization is enforced on the backend; frontend restrictions are not used as the security boundary.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Axios
- React Router

### Backend
- Node.js
- Express.js
- TypeScript
- JWT
- bcrypt
- Zod

### Database
- PostgreSQL
- Prisma ORM

### Testing & API Documentation
- Jest
- Supertest
- Postman

## Project Structure

```text
fundstrom-assessment-2/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   └── server.ts
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── styles.css
│   │   └── types.ts
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── docs/
│   ├── postman/
│   │   └── SupplyFlow_ERP_Postman_Collection.json
│   └── ER-DIAGRAM.md
│
└── README.md
```

## Database Design

The application uses a relational PostgreSQL database with Prisma ORM.

Main entities:

```text
Users
Customers
Products
Inventory
Enquiries
EnquiryItems
Quotations
QuotationItems
SalesOrders
SalesOrderItems
Dispatches
DispatchItems
```

The database uses primary keys, foreign keys, unique constraints, indexes, and transactional operations to maintain workflow and inventory consistency.

See:

`docs/ER-DIAGRAM.md`

## API Endpoints

### Authentication

```http
POST /api/auth/login
```

### Enquiries

```http
POST /api/enquiries
GET  /api/enquiries
```

### Quotations

```http
POST  /api/quotations
GET   /api/quotations
PATCH /api/quotations/:id/status
POST  /api/quotations/:id/convert
```

### Sales Orders

```http
GET  /api/sales-orders
POST /api/sales-orders/:id/confirm
POST /api/sales-orders/:id/cancel
POST /api/sales-orders/:id/dispatch
```

### Inventory

```http
GET   /api/inventory
PATCH /api/inventory/:productId
```

All protected endpoints require a JWT Bearer token.

## Environment Variables

### Backend

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/supplyflow_erp"
JWT_SECRET="your-secure-jwt-secret"
PORT=5000
```

Do not commit `.env` files.

### Frontend

Create:

```text
frontend/.env
```

Example:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Prerequisites

Install:

- Node.js
- npm
- PostgreSQL

Verify Node.js:

```cmd
node -v
npm -v
```

## Installation

Clone the repository and enter the project:

```cmd
git clone <repository-url>
cd fundstrom-assessment-2
```

### Backend Setup

```cmd
cd backend
npm install
```

Configure:

```text
backend/.env
```

Run Prisma client generation:

```cmd
npx prisma generate
```

Run database migrations:

```cmd
npx prisma migrate deploy
```

Seed the database:

```cmd
npx prisma db seed
```

Start the backend:

```cmd
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

### Frontend Setup

Open another CMD window:

```cmd
cd fundstrom-assessment-2\frontend
npm install
```

Configure:

```text
frontend/.env
```

Start the frontend:

```cmd
npm run dev
```

Open the Vite URL shown in the terminal.

## Database Commands

From `backend`:

Generate Prisma client:

```cmd
npx prisma generate
```

Create a development migration:

```cmd
npx prisma migrate dev
```

Deploy existing migrations:

```cmd
npx prisma migrate deploy
```

Seed database:

```cmd
npx prisma db seed
```

Open Prisma Studio:

```cmd
npx prisma studio
```

## Test Credentials

Seeded accounts:

### ADMIN

```text
Email: admin@supplyflow.com
Password: Admin@123
Role: ADMIN
```

### SALES USER

```text
Email: sales@supplyflow.com
Password: Sales@123
Role: SALES_USER
```

For production use, these credentials should be replaced with secure credentials.

## Testing

Backend automated tests:

```cmd
cd backend
npm test
```

The test suite covers:

- Authentication
- Role-based authorization
- Quotation total calculation
- Draft quotation conversion rejection
- Rejected quotation conversion rejection
- Duplicate Sales Order prevention
- Reservation beyond available inventory
- Unauthorized restricted operations
- Sales Order cancellation and reservation release

The API can also be tested using the Postman collection:

```text
docs/postman/SupplyFlow_ERP_Postman_Collection.json
```

## Build Verification

Backend production build:

```cmd
cd backend
npm run build
```

Frontend production build:

```cmd
cd frontend
npm run build
```

## Inventory Consistency

The backend validates inventory operations using database transactions and guarded updates.

During reservation:

```text
Reserved Quantity increases
Physical Quantity remains unchanged
Available Quantity decreases
```

During dispatch:

```text
Physical Quantity decreases
Reserved Quantity decreases
```

Inventory updates are validated to prevent:

- Negative physical quantity
- Negative reserved quantity
- Reserved quantity greater than physical quantity
- Reservation beyond available stock
- Dispatch beyond reserved stock

## Security

- Passwords are hashed using bcrypt.
- Authentication uses JWT.
- Protected routes require valid Bearer tokens.
- Role authorization is enforced by backend middleware.
- Request validation uses Zod.
- Sensitive environment variables are stored outside source control.
- Database operations use Prisma and transactions where workflow consistency is required.

## API Documentation

Import the Postman collection into Postman:

```text
docs/postman/SupplyFlow_ERP_Postman_Collection.json
```

The collection contains requests for:

- Authentication
- Enquiries
- Quotations
- Sales Orders
- Inventory
- Reservation
- Dispatch
- RBAC/error scenarios

## ER Diagram

The database ER diagram is available at:

```text
docs/ER-DIAGRAM.md
```

It documents the entities, primary keys, foreign keys, unique constraints, and relationships used by SupplyFlow ERP.

## Demo Flow

The recommended demonstration sequence is:

```text
1. Login as SALES_USER
2. Create a Customer Enquiry
3. Add multiple products and quantities
4. Create a Quotation
5. Send and accept the Quotation
6. Convert the accepted Quotation to a Sales Order
7. Login as ADMIN
8. Confirm the Sales Order
9. Verify inventory reservation
10. Dispatch the Sales Order
11. Verify physical and reserved inventory changes
```

## Repository Documentation

```text
README.md
    ↓
Project setup, workflow, APIs and testing

docs/ER-DIAGRAM.md
    ↓
Database relationships and constraints

docs/postman/SupplyFlow_ERP_Postman_Collection.json
    ↓
API testing and documentation
```

## Project Status

SupplyFlow ERP implements the core industrial sales workflow with:

- React frontend
- Express/Node.js backend
- PostgreSQL database
- Prisma ORM
- JWT authentication
- Backend RBAC
- Transactional inventory reservation
- Sales order cancellation
- Dispatch processing
- Automated API/workflow tests
- Postman API collection
- ER diagram documentation
