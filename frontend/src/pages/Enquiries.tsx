import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { Enquiry, Inventory, Product } from "../types";

interface EnquiryLine {
  productId: number;
  quantity: number;
}

interface InventoryRow {
  id: number;
  productId: number;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  product?: Product;
  productCode?: string;
  productName?: string;
  category?: string;
  unit?: string;
  basePrice?: string | number;
}

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<EnquiryLine[]>([
    {
      productId: 0,
      quantity: 1,
    },
  ]);

  const loadData = async () => {
    setLoadingData(true);
    setMessage("");

    try {
      const [enquiriesResponse, inventoryResponse] =
        await Promise.all([
          api.get("/enquiries"),
          api.get("/inventory"),
        ]);

      const enquiryData = enquiriesResponse.data?.data ?? [];
      const inventoryData = inventoryResponse.data?.data ?? [];

      setEnquiries(enquiryData);
      setInventory(inventoryData);
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load enquiries."
      );
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getProductCode = (entry: InventoryRow) => {
    return (
      entry.product?.productCode ||
      entry.productCode ||
      `PROD-${entry.productId}`
    );
  };

  const getProductName = (entry: InventoryRow) => {
    return (
      entry.product?.productName ||
      entry.productName ||
      "Industrial Product"
    );
  };

  const getProductLabel = (entry: InventoryRow) => {
    return `${getProductCode(entry)} - ${getProductName(entry)}`;
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        productId: 0,
        quantity: 1,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      return;
    }

    setItems(
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const updateItem = (
    index: number,
    field: "productId" | "quantity",
    value: number
  ) => {
    const updatedItems = [...items];

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    setItems(updatedItems);
  };

  const resetForm = () => {
    setCompanyName("");
    setContactPerson("");
    setMobile("");
    setEmail("");
    setCity("");
    setRequiredDate("");
    setNotes("");

    setItems([
      {
        productId: 0,
        quantity: 1,
      },
    ]);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setMessage("");

    if (
      !companyName.trim() ||
      !contactPerson.trim() ||
      !mobile.trim() ||
      !email.trim() ||
      !city.trim() ||
      !requiredDate
    ) {
      setMessage("Please fill all required customer details.");
      return;
    }

    if (
      items.length === 0 ||
      items.some(
        (item) =>
          !item.productId ||
          item.productId <= 0 ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0
      )
    ) {
      setMessage(
        "Please select valid products and quantities."
      );
      return;
    }

    const productIds = items.map(
      (item) => item.productId
    );

    if (
      new Set(productIds).size !== productIds.length
    ) {
      setMessage(
        "A product can only be added once to an enquiry."
      );
      return;
    }

    setLoading(true);

    try {
      await api.post("/enquiries", {
  companyName: companyName.trim(),
  contactPerson: contactPerson.trim(),
  mobile: mobile.trim(),
  email: email.trim(),
  city: city.trim(),
  requiredDate: new Date(
    `${requiredDate}T00:00:00.000Z`
  ).toISOString(),
  notes: notes.trim() || undefined,
  items: items.map((item) => ({
    productId: Number(item.productId),
    quantity: Number(item.quantity),
  })),
});

      setMessage("Enquiry created successfully.");

      resetForm();
      setShowForm(false);

      await loadData();
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to create enquiry."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Customer Enquiries</h2>
          <p>
            Create and track customer product requirements.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            setShowForm((current) => !current);
            setMessage("");
          }}
        >
          {showForm ? "Close" : "+ New Enquiry"}
        </button>
      </div>

      {message && (
        <div
          className={
            message.toLowerCase().includes("failed") ||
            message.toLowerCase().includes("please") ||
            message.toLowerCase().includes("valid") ||
            message.toLowerCase().includes("only")
              ? "error-box"
              : "success-box"
          }
        >
          {message}
        </div>
      )}

      {showForm && (
        <div className="card form-card">
          <div className="section-title">
            <h3>New Customer Enquiry</h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label>Company Name</label>

                <input
                  value={companyName}
                  onChange={(event) =>
                    setCompanyName(event.target.value)
                  }
                  placeholder="Company name"
                  required
                />
              </div>

              <div>
                <label>Contact Person</label>

                <input
                  value={contactPerson}
                  onChange={(event) =>
                    setContactPerson(event.target.value)
                  }
                  placeholder="Contact person"
                  required
                />
              </div>

              <div>
                <label>Mobile</label>

                <input
                  value={mobile}
                  onChange={(event) =>
                    setMobile(event.target.value)
                  }
                  placeholder="9876543210"
                  required
                />
              </div>

              <div>
                <label>Email</label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="customer@company.com"
                  required
                />
              </div>

              <div>
                <label>City</label>

                <input
                  value={city}
                  onChange={(event) =>
                    setCity(event.target.value)
                  }
                  placeholder="Bengaluru"
                  required
                />
              </div>

              <div>
                <label>Required Date</label>

                <input
                  type="date"
                  value={requiredDate}
                  onChange={(event) =>
                    setRequiredDate(event.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="items-header">
              <h3>Products</h3>

              <button
                type="button"
                className="secondary-button"
                onClick={addItem}
              >
                + Add Product
              </button>
            </div>

            {items.map((item, index) => (
              <div className="item-row" key={index}>
                <select
                  value={item.productId}
                  onChange={(event) =>
                    updateItem(
                      index,
                      "productId",
                      Number(event.target.value)
                    )
                  }
                  required
                >
                  <option value={0}>
                    Select product
                  </option>

                  {inventory.map((entry) => (
                    <option
                      key={entry.productId}
                      value={entry.productId}
                    >
                      {getProductLabel(entry)}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(
                      index,
                      "quantity",
                      Number(event.target.value)
                    )
                  }
                  required
                />

                <button
                  type="button"
                  className="danger-outline"
                  onClick={() => removeItem(index)}
                >
                  Remove
                </button>
              </div>
            ))}

            <div>
              <label>Notes</label>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                rows={3}
                placeholder="Additional customer requirements..."
              />
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={loading || inventory.length === 0}
            >
              {loading
                ? "Creating..."
                : "Create Enquiry"}
            </button>

            {inventory.length === 0 && (
              <div className="error-box">
                No products are available. Please check the
                inventory service.
              </div>
            )}
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-header">
          <h3>Enquiry List</h3>

          <span>
            {loadingData
              ? "Loading..."
              : `${enquiries.length} records`}
          </span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Enquiry No.</th>
                <th>Customer</th>
                <th>Required Date</th>
                <th>Products</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loadingData ? (
                <tr>
                  <td
                    colSpan={5}
                    className="empty-state"
                  >
                    Loading enquiries...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="empty-state"
                  >
                    No enquiries found.
                  </td>
                </tr>
              ) : (
                enquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td>
                      <strong>
                        {enquiry.enquiryNumber}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {enquiry.customer?.companyName ||
                          "—"}
                      </strong>

                      <small>
                        {enquiry.customer?.contactPerson ||
                          "—"}
                      </small>
                    </td>

                    <td>
                      {enquiry.requiredDate
                        ? new Date(
                            enquiry.requiredDate
                          ).toLocaleDateString("en-IN")
                        : "—"}
                    </td>

                    <td>
                      {enquiry.items?.length ?? 0} product(s)
                    </td>

                    <td>
                      <span
                        className={`status status-${String(
                          enquiry.status
                        ).toLowerCase()}`}
                      >
                        {enquiry.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}