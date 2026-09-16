export type UserRole = "ADMIN" | "SALES_USER";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface Product {
  id: number;
  productCode: string;
  productName: string;
  category: string;
  unit: string;
  basePrice: string | number;
}

export interface Inventory {
  id: number;
  productId: number;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  product: Product;
}

export interface Customer {
  id: number;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  city: string;
}

export interface EnquiryItem {
  id?: number;
  productId: number;
  quantity: number;
  product?: Product;
}

export interface Enquiry {
  id: number;
  enquiryNumber: string;
  customerId: number;
  enquiryDate: string;
  requiredDate: string;
  notes?: string;
  status: "NEW" | "QUOTED" | "WON" | "LOST";
  customer: Customer;
  items: EnquiryItem[];
}

export interface QuotationItem {
  id?: number;
  productId: number;
  quantity: number;
  unitPrice: string | number;
  discountPercent: string | number;
  gstPercent: string | number;
  lineAmount: string | number;
  product?: Product;
}

export interface Quotation {
  id: number;
  quotationNumber: string;
  enquiryId: number;
  customerId: number;
  quotationDate: string;
  validUntil: string;
  discountPercent: string | number;
  gstPercent: string | number;
  subtotal: string | number;
  discountAmount: string | number;
  taxableAmount: string | number;
  gstAmount: string | number;
  grandTotal: string | number;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
  customer: Customer;
  enquiry: Enquiry;
  items: QuotationItem[];
  salesOrder?: SalesOrder | null;
}

export interface SalesOrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: string | number;
  lineAmount: string | number;
  product: Product;
}

export interface Dispatch {
  id: number;
  dispatchNumber: string;
  dispatchDate: string;
  vehicleNumber: string;
  driverName: string;
  items: {
    id: number;
    productId: number;
    quantity: number;
    product: Product;
  }[];
}

export interface SalesOrder {
  id: number;
  orderNumber: string;
  customerId: number;
  quotationId: number;
  orderDate: string;
  totalAmount: string | number;
  status: "PENDING" | "CONFIRMED" | "DISPATCHED" | "CANCELLED";
  customer: Customer;
  quotation: Quotation;
  items: SalesOrderItem[];
  dispatch?: Dispatch | null;
}