# StockSense 📦

A modular Inventory Management System (IMS) designed to digitize and streamline stock operations, replacing manual registers and spreadsheets with real-time tracking.

---

## 🚀 Features

### 🔐 Authentication & Access
* **User Authentication**: Secure Signup and Login workflows[cite: 1].
* **Password Reset**: OTP-based identity verification for password recovery[cite: 1].
* **Role-Based Access**: Tailored for Inventory Managers and Warehouse Staff[cite: 1].

### 📊 Interactive Dashboard & Analytics
* **Key Performance Indicators (KPIs)**:
  * Total Products in Stock[cite: 1]
  * Low Stock / Out of Stock Items[cite: 1]
  * Pending Receipts & Pending Deliveries[cite: 1]
  * Internal Transfers Scheduled[cite: 1]
* **Dynamic Filters**: Filter operations by Document Type (Receipts, Delivery, Internal, Adjustments), Status (Draft, Waiting, Ready, Done, Canceled), Warehouse/Location, and Product Category[cite: 1].

### 📦 Core Inventory Operations
* **Product Management**: Create and track products with SKU/Code, Category, Unit of Measure, and Initial Stock[cite: 1].
* **Receipts (Incoming Stock)**: Process inbound vendor shipments with automatic stock increments upon validation[cite: 1].
* **Delivery Orders (Outgoing Stock)**: Manage picking, packing, and outbound shipments with automatic stock decrements[cite: 1].
* **Internal Transfers**: Log stock movements between internal locations (e.g., Main Warehouse → Production Floor)[cite: 1].
* **Stock Adjustments**: Reconcile physical inventory counts with system records, logging discrepancies automatically in the Stock Ledger[cite: 1].
* **Multi-Warehouse Support & Reordering Rules**: Track inventory levels across multiple warehouses and set low-stock automated alerts[cite: 1].

---

## 🛠️ Tech Stack

* **Frontend**: React.js / Next.js, Tailwind CSS
* **Backend**: Node.js, Express.js
* **Database**: MongoDB (MERN Stack Architecture)
* **Authentication**: JWT, OTP Verification Service

---

## ⚙️ Getting Started

### Prerequisites
* Node.js (v18 or higher)
* MongoDB database instance (Local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/samarthrbhatt10/StockSense.git](https://github.com/samarthrbhatt10/StockSense.git)
   cd StockSense
