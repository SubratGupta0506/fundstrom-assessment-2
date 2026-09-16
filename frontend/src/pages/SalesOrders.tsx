import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Inventory, SalesOrder } from "../types";

export default function SalesOrders() {
  const { user } = useAuth();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [message, setMessage] = useState("");
  const [dispatchOrderId, setDispatchOrderId] = useState<number | null>(
    null
  );

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");

  const loadData = async () => {
    try {
      const [ordersResponse, inventoryResponse] =
        await Promise.all([
          api.get("/sales-orders"),
          api.get("/inventory"),
        ]);

      setOrders(ordersResponse.data.data);
      setInventory(inventoryResponse.data.data);
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
          "Failed to load sales orders."
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getAvailableStock = (productId: number) => {
    return (
      inventory.find(
        (entry) => entry.productId === productId
      )?.availableQty ?? 0
    );
  };

  const canConfirm = (order: SalesOrder) => {
    return order.items.every(
      (item) =>
        getAvailableStock(item.productId) >= item.quantity
    );
  };

  const confirmOrder = async (id: number) => {
    setMessage("");

    try {
      await api.post(`/sales-orders/${id}/confirm`);

      setMessage("Sales Order confirmed and inventory reserved.");
      await loadData();
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
          "Order confirmation failed."
      );
    }
  };

  const cancelOrder = async (id: number) => {
    setMessage("");

    try {
      await api.post(`/sales-orders/${id}/cancel`);

      setMessage("Sales Order cancelled and reservation released.");
      await loadData();
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
          "Order cancellation failed."
      );
    }
  };

  const dispatchOrder = async () => {
    if (!dispatchOrderId) return;

    if (!vehicleNumber.trim() || !driverName.trim()) {
      setMessage("Vehicle number and driver name are required.");
      return;
    }

    const order = orders.find(
      (item) => item.id === dispatchOrderId
    );

    if (!order) return;

    setMessage("");

    try {
      await api.post(
        `/sales-orders/${dispatchOrderId}/dispatch`,
        {
          vehicleNumber,
          driverName,
          items: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }
      );

      setMessage("Sales Order dispatched successfully.");

      setDispatchOrderId(null);
      setVehicleNumber("");
      setDriverName("");

      await loadData();
    } catch (err: any) {
      setMessage(
        err.response?.data?.message ||
          "Dispatch failed."
      );
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Sales Orders</h2>
          <p>
            Confirm orders, reserve stock and process dispatches.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={
            message.toLowerCase().includes("failed") ||
            message.toLowerCase().includes("required")
              ? "error-box"
              : "success-box"
          }
        >
          {message}
        </div>
      )}

      {dispatchOrderId && (
        <div className="card dispatch-card">
          <div className="section-title">
            <h3>Dispatch Sales Order</h3>

            <button
              className="secondary-button"
              onClick={() => setDispatchOrderId(null)}
            >
              Close
            </button>
          </div>

          <div className="form-grid">
            <div>
              <label>Vehicle Number</label>

              <input
                value={vehicleNumber}
                onChange={(e) =>
                  setVehicleNumber(e.target.value)
                }
                placeholder="KA01AB1234"
              />
            </div>

            <div>
              <label>Driver Name</label>

              <input
                value={driverName}
                onChange={(e) =>
                  setDriverName(e.target.value)
                }
                placeholder="Driver name"
              />
            </div>
          </div>

          <button
            className="primary-button"
            onClick={dispatchOrder}
          >
            Confirm Dispatch
          </button>
        </div>
      )}

      <div className="card">
        <div className="table-header">
          <h3>Order List</h3>
          <span>{orders.length} records</span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Quotation</th>
                <th>Products</th>
                <th>Total</th>
                <th>Status</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">
                    No sales orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const stockAvailable =
                    canConfirm(order);

                  return (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.orderNumber}</strong>
                      </td>

                      <td>{order.customer.companyName}</td>

                      <td>
                        {order.quotation.quotationNumber}
                      </td>

                      <td>{order.items.length}</td>

                      <td>
                        ₹
                        {Number(
                          order.totalAmount
                        ).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>

                      <td>
                        <span
                          className={`status status-${order.status.toLowerCase()}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td>
                        {order.status === "PENDING" ? (
                          <span
                            className={
                              stockAvailable
                                ? "stock-ok"
                                : "stock-low"
                            }
                          >
                            {stockAvailable
                              ? "Available"
                              : "Insufficient"}
                          </span>
                        ) : order.status === "CONFIRMED" ? (
                          <span className="stock-ok">
                            Reserved
                          </span>
                        ) : (
                          <span className="muted-text">
                            —
                          </span>
                        )}
                      </td>

                      <td>
                        {user?.role === "ADMIN" && (
                          <div className="action-group">
                            {order.status === "PENDING" && (
                              <>
                                <button
                                  className="small-button"
                                  disabled={!stockAvailable}
                                  onClick={() =>
                                    confirmOrder(order.id)
                                  }
                                >
                                  Confirm
                                </button>

                                <button
                                  className="small-button danger-button"
                                  onClick={() =>
                                    cancelOrder(order.id)
                                  }
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {order.status === "CONFIRMED" && (
                              <>
                                <button
                                  className="small-button"
                                  onClick={() =>
                                    setDispatchOrderId(
                                      order.id
                                    )
                                  }
                                >
                                  Dispatch
                                </button>

                                <button
                                  className="small-button danger-button"
                                  onClick={() =>
                                    cancelOrder(order.id)
                                  }
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {order.status === "DISPATCHED" && (
                              <span className="muted-text">
                                Dispatched
                              </span>
                            )}

                            {order.status === "CANCELLED" && (
                              <span className="muted-text">
                                Cancelled
                              </span>
                            )}
                          </div>
                        )}

                        {user?.role === "SALES_USER" && (
                          <span className="muted-text">
                            View only
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {orders.some(
        (order) =>
          order.status === "CONFIRMED" &&
          order.dispatch
      ) && (
        <div className="card">
          <div className="table-header">
            <h3>Dispatch Details</h3>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Dispatch No.</th>
                  <th>Sales Order</th>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                </tr>
              </thead>

              <tbody>
                {orders
                  .filter((order) => order.dispatch)
                  .map((order) => (
                    <tr key={order.id}>
                      <td>
                        {order.dispatch?.dispatchNumber}
                      </td>
                      <td>{order.orderNumber}</td>
                      <td>
                        {order.dispatch?.dispatchDate
                          ? new Date(
                              order.dispatch.dispatchDate
                            ).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>
                        {order.dispatch?.vehicleNumber}
                      </td>
                      <td>
                        {order.dispatch?.driverName}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}