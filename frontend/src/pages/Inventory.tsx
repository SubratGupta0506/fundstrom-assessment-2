import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Inventory } from "../types";

export default function Inventory() {
  const { user } = useAuth();

  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [physicalQty, setPhysicalQty] = useState(0);
  const [reservedQty, setReservedQty] = useState(0);

  const [message, setMessage] = useState("");

  const loadInventory = async () => {
    try {
      const response = await api.get("/inventory");
      setInventory(response.data.data ?? []);
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
          "Failed to load inventory."
      );
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const startEdit = (item: Inventory) => {
    setEditingId(item.productId);
    setPhysicalQty(item.physicalQty);
    setReservedQty(item.reservedQty);
    setMessage("");
  };

  const saveInventory = async (productId: number) => {
    if (physicalQty < 0 || reservedQty < 0) {
      setMessage("Quantities cannot be negative.");
      return;
    }

    if (reservedQty > physicalQty) {
      setMessage(
        "Reserved quantity cannot exceed physical quantity."
      );
      return;
    }

    try {
      await api.patch(`/inventory/${productId}`, {
        physicalQty,
        reservedQty,
      });

      setMessage("Inventory updated successfully.");
      setEditingId(null);

      await loadInventory();
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
          "Failed to update inventory."
      );
    }
  };

  const getProductCode = (item: Inventory) => {
    return (
      item.product?.productCode ||
      (item as any).productCode ||
      `PROD-${item.productId}`
    );
  };

  const getProductName = (item: Inventory) => {
    return (
      item.product?.productName ||
      (item as any).productName ||
      "Industrial Product"
    );
  };

  const getCategory = (item: Inventory) => {
    return (
      item.product?.category ||
      (item as any).category ||
      "—"
    );
  };

  const getUnit = (item: Inventory) => {
    return (
      item.product?.unit ||
      (item as any).unit ||
      "—"
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Inventory</h2>
          <p>
            Monitor physical, reserved and available quantities.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={
            message.toLowerCase().includes("failed") ||
            message.toLowerCase().includes("cannot")
              ? "error-box"
              : "success-box"
          }
        >
          {message}
        </div>
      )}

      <div className="card">
        <div className="table-header">
          <h3>Stock Availability</h3>
          <span>{inventory.length} products</span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Physical</th>
                <th>Reserved</th>
                <th>Available</th>

                {user?.role === "ADMIN" && (
                  <th>Actions</th>
                )}
              </tr>
            </thead>

            <tbody>
              {inventory.length === 0 ? (
                <tr>
                  <td
                    colSpan={user?.role === "ADMIN" ? 7 : 6}
                    className="empty-state"
                  >
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                inventory.map((item) => {
                  const availableQty =
                    item.physicalQty - item.reservedQty;

                  return (
                    <tr key={item.productId}>
                      <td>
                        <strong>
                          {getProductCode(item)}
                        </strong>

                        <small>
                          {getProductName(item)}
                        </small>
                      </td>

                      <td>{getCategory(item)}</td>

                      <td>{getUnit(item)}</td>

                      <td>
                        {editingId === item.productId ? (
                          <input
                            className="table-input"
                            type="number"
                            min="0"
                            value={physicalQty}
                            onChange={(e) =>
                              setPhysicalQty(
                                Number(e.target.value)
                              )
                            }
                          />
                        ) : (
                          item.physicalQty
                        )}
                      </td>

                      <td>
                        {editingId === item.productId ? (
                          <input
                            className="table-input"
                            type="number"
                            min="0"
                            value={reservedQty}
                            onChange={(e) =>
                              setReservedQty(
                                Number(e.target.value)
                              )
                            }
                          />
                        ) : (
                          item.reservedQty
                        )}
                      </td>

                      <td>
                        <strong
                          className={
                            (
                              editingId === item.productId
                                ? physicalQty - reservedQty
                                : availableQty
                            ) <= 0
                              ? "stock-low"
                              : "stock-ok"
                          }
                        >
                          {editingId === item.productId
                            ? physicalQty - reservedQty
                            : availableQty}
                        </strong>
                      </td>

                      {user?.role === "ADMIN" && (
                        <td>
                          {editingId === item.productId ? (
                            <div className="action-group">
                              <button
                                className="small-button success-button"
                                onClick={() =>
                                  saveInventory(
                                    item.productId
                                  )
                                }
                              >
                                Save
                              </button>

                              <button
                                className="small-button"
                                onClick={() => {
                                  setEditingId(null);
                                  setMessage("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              className="small-button"
                              onClick={() =>
                                startEdit(item)
                              }
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="inventory-note">
        Available Quantity = Physical Quantity − Reserved Quantity
      </div>
    </div>
  );
}