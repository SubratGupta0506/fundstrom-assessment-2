import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { Enquiry, Quotation } from "../types";

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [enquiryId, setEnquiryId] = useState(0);
  const [validUntil, setValidUntil] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [gstPercent, setGstPercent] = useState(18);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      const [quotationResponse, enquiryResponse] =
        await Promise.all([
          api.get("/quotations"),
          api.get("/enquiries"),
        ]);

      setQuotations(quotationResponse.data.data);
      setEnquiries(enquiryResponse.data.data);
    } catch (err: any) {
      setMessage(
        err.response?.data?.message || "Failed to load quotations."
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedEnquiry = enquiries.find(
    (enquiry) => enquiry.id === enquiryId
  );

  const createQuotation = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedEnquiry) {
      setMessage("Please select an enquiry.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await api.post("/quotations", {
        enquiryId,
        validUntil,
        discountPercent,
        gstPercent,
        items: selectedEnquiry.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      setMessage("Quotation created successfully.");
      setShowForm(false);
      setEnquiryId(0);
      setValidUntil("");
      setDiscountPercent(0);
      setGstPercent(18);

      await loadData();
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to create quotation."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (
    id: number,
    status: "SENT" | "ACCEPTED" | "REJECTED"
  ) => {
    setMessage("");

    try {
      await api.patch(`/quotations/${id}/status`, {
        status,
      });

      setMessage(`Quotation marked as ${status}.`);
      await loadData();
    } catch (err: any) {
      setMessage(
        err.response?.data?.message || "Failed to update quotation."
      );
    }
  };

  const convertToOrder = async (id: number) => {
    setMessage("");

    try {
      await api.post(`/quotations/${id}/convert`);

      setMessage("Sales Order created successfully.");
      await loadData();
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
          "Quotation could not be converted."
      );
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Quotations</h2>
          <p>Create quotations and move accepted business to orders.</p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            setShowForm(!showForm);
            setMessage("");
          }}
        >
          {showForm ? "Close" : "+ New Quotation"}
        </button>
      </div>

      {message && (
        <div
          className={
            message.toLowerCase().includes("failed") ||
            message.toLowerCase().includes("could not")
              ? "error-box"
              : "success-box"
          }
        >
          {message}
        </div>
      )}

      {showForm && (
        <div className="card form-card">
          <h3>Create Quotation</h3>

          <form onSubmit={createQuotation}>
            <div className="form-grid">
              <div>
                <label>Enquiry</label>

                <select
                  value={enquiryId}
                  onChange={(e) =>
                    setEnquiryId(Number(e.target.value))
                  }
                  required
                >
                  <option value={0}>Select enquiry</option>

                  {enquiries
                    .filter(
                      (enquiry) =>
                        enquiry.status === "NEW"
                    )
                    .map((enquiry) => (
                      <option
                        key={enquiry.id}
                        value={enquiry.id}
                      >
                        {enquiry.enquiryNumber} -{" "}
                        {enquiry.customer.companyName}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label>Valid Until</label>

                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) =>
                    setValidUntil(e.target.value)
                  }
                  required
                />
              </div>

              <div>
                <label>Discount %</label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={discountPercent}
                  onChange={(e) =>
                    setDiscountPercent(Number(e.target.value))
                  }
                />
              </div>

              <div>
                <label>GST %</label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={gstPercent}
                  onChange={(e) =>
                    setGstPercent(Number(e.target.value))
                  }
                />
              </div>
            </div>

            {selectedEnquiry && (
              <div className="selected-info">
                <strong>Customer:</strong>{" "}
                {selectedEnquiry.customer.companyName}

                <br />

                <strong>Products:</strong>{" "}
                {selectedEnquiry.items.length}
              </div>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Quotation"}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-header">
          <h3>Quotation List</h3>
          <span>{quotations.length} records</span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Customer</th>
                <th>Enquiry</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No quotations found.
                  </td>
                </tr>
              ) : (
                quotations.map((quotation) => (
                  <tr key={quotation.id}>
                    <td>
                      <strong>
                        {quotation.quotationNumber}
                      </strong>
                    </td>

                    <td>
                      {quotation.customer.companyName}
                    </td>

                    <td>
                      {quotation.enquiry.enquiryNumber}
                    </td>

                    <td>
                      ₹
                      {Number(
                        quotation.grandTotal
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>

                    <td>
                      <span
                        className={`status status-${quotation.status.toLowerCase()}`}
                      >
                        {quotation.status}
                      </span>
                    </td>

                    <td>
                      <div className="action-group">
                        {quotation.status === "DRAFT" && (
                          <button
                            className="small-button"
                            onClick={() =>
                              updateStatus(
                                quotation.id,
                                "SENT"
                              )
                            }
                          >
                            Send
                          </button>
                        )}

                        {quotation.status === "SENT" && (
                          <>
                            <button
                              className="small-button success-button"
                              onClick={() =>
                                updateStatus(
                                  quotation.id,
                                  "ACCEPTED"
                                )
                              }
                            >
                              Accept
                            </button>

                            <button
                              className="small-button danger-button"
                              onClick={() =>
                                updateStatus(
                                  quotation.id,
                                  "REJECTED"
                                )
                              }
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {quotation.status === "ACCEPTED" &&
                          !quotation.salesOrder && (
                            <button
                              className="small-button"
                              onClick={() =>
                                convertToOrder(
                                  quotation.id
                                )
                              }
                            >
                              Create Order
                            </button>
                          )}

                        {quotation.salesOrder && (
                          <span className="muted-text">
                            Order Created
                          </span>
                        )}
                      </div>
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