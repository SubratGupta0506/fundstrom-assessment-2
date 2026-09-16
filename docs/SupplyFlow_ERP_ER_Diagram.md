# SupplyFlow ERP — Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        enum role
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    CUSTOMERS {
        int id PK
        string company_name
        string contact_person
        string mobile
        string email
        string city
        datetime created_at
        datetime updated_at
    }

    PRODUCTS {
        int id PK
        string product_code UK
        string product_name
        string category
        string unit
        decimal base_price
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    INVENTORY {
        int id PK
        int product_id FK,UK
        int physical_quantity
        int reserved_quantity
        datetime created_at
        datetime updated_at
    }

    ENQUIRIES {
        int id PK
        string enquiry_number UK
        int customer_id FK
        int created_by_id FK
        datetime enquiry_date
        datetime required_date
        string notes
        enum status
        datetime created_at
        datetime updated_at
    }

    ENQUIRY_ITEMS {
        int id PK
        int enquiry_id FK
        int product_id FK
        int quantity
    }

    QUOTATIONS {
        int id PK
        string quotation_number UK
        int enquiry_id FK,UK
        int customer_id FK
        int created_by_id FK
        datetime quotation_date
        datetime valid_until
        decimal discount_percent
        decimal gst_percent
        decimal subtotal
        decimal discount_amount
        decimal taxable_amount
        decimal gst_amount
        decimal grand_total
        enum status
        datetime created_at
        datetime updated_at
    }

    QUOTATION_ITEMS {
        int id PK
        int quotation_id FK
        int product_id FK
        int quantity
        decimal unit_price
        decimal discount_percent
        decimal gst_percent
        decimal line_amount
    }

    SALES_ORDERS {
        int id PK
        string order_number UK
        int customer_id FK
        int quotation_id FK,UK
        datetime order_date
        decimal total_amount
        enum status
        datetime confirmed_at
        datetime dispatched_at
        datetime cancelled_at
        datetime created_at
        datetime updated_at
    }

    SALES_ORDER_ITEMS {
        int id PK
        int sales_order_id FK
        int product_id FK
        int quantity
        decimal unit_price
        decimal line_amount
    }

    DISPATCHES {
        int id PK
        string dispatch_number UK
        int sales_order_id FK,UK
        datetime dispatch_date
        string vehicle_number
        string driver_name
        datetime created_at
    }

    DISPATCH_ITEMS {
        int id PK
        int dispatch_id FK
        int product_id FK
        int quantity
    }

    USERS ||--o{ ENQUIRIES : creates
    USERS ||--o{ QUOTATIONS : creates

    CUSTOMERS ||--o{ ENQUIRIES : has
    CUSTOMERS ||--o{ QUOTATIONS : receives
    CUSTOMERS ||--o{ SALES_ORDERS : places

    PRODUCTS ||--o| INVENTORY : has
    PRODUCTS ||--o{ ENQUIRY_ITEMS : requested_in
    PRODUCTS ||--o{ QUOTATION_ITEMS : quoted_in
    PRODUCTS ||--o{ SALES_ORDER_ITEMS : ordered_in
    PRODUCTS ||--o{ DISPATCH_ITEMS : dispatched_in

    ENQUIRIES ||--|{ ENQUIRY_ITEMS : contains
    ENQUIRIES ||--o| QUOTATIONS : generates

    QUOTATIONS ||--|{ QUOTATION_ITEMS : contains
    QUOTATIONS ||--o| SALES_ORDERS : converts_to

    SALES_ORDERS ||--|{ SALES_ORDER_ITEMS : contains
    SALES_ORDERS ||--o| DISPATCHES : generates

    DISPATCHES ||--|{ DISPATCH_ITEMS : contains
```

## Workflow Traceability

**Customer → Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch**

- `CUSTOMERS` stores customer master data.
- `ENQUIRIES` stores customer requirements and references `ENQUIRY_ITEMS`.
- `QUOTATIONS` belongs to one enquiry and references `QUOTATION_ITEMS`.
- An accepted quotation can generate at most one `SALES_ORDER`.
- `SALES_ORDERS` references `SALES_ORDER_ITEMS` and controls confirmation, reservation, cancellation, and dispatch.
- `INVENTORY` maintains physical and reserved quantities for each product.
- `DISPATCHES` belongs to one sales order and references `DISPATCH_ITEMS`.
- Product references are maintained through foreign keys across all transaction item tables.

## Key Database Constraints

- User email is unique.
- Product code is unique.
- Enquiry number is unique.
- One quotation per enquiry.
- One sales order per quotation.
- One dispatch per sales order.
- One inventory record per product.
- Duplicate product lines are prevented within each transaction using composite unique constraints.
- Foreign keys enforce relationships between master and transaction records.
