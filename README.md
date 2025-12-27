# Etherbill Engine (v1.0.0-Launch) 🚀

The high-performance, automated backend engine powering **Etherbill** — a financial operating system for freelancers and agencies. Built for high-reliability payments, automated billing, and secure financial operations.

## 🌟 Strategic Core Features

### 1. Automated Billing & Recurring Revenue
- **Automated Generation**: Background cron engine (`node-cron`) that automatically generates and sends invoices based on user-defined frequencies (Weekly/Monthly).
- **Smart Next-Run Logic**: Intelligent scheduling that ensures precise billing cycles without manual intervention.

### 2. The "Auto-Chasing" Intelligence
- **Payment Reminders**: Automated follow-ups for overdue invoices.
- **24-Hour Smart Filter**: Prevents customer annoyance by ensuring reminders are only sent once every 24 hours.
- **Professional Templates**: High-conversion HTML email templates designed for both mobile and desktop.

### 3. Industrial-Grade Payment Infrastructure
- **Flutterwave Integration**: Global payment support with automated subaccount creation and merchant payouts.
- **Transaction Idempotency**: Cryptographic protection against duplicate payments and accidental double-charging via `X-Idempotency-Key`.
- **Atomic State Transitions**: Ensuring invoices move from `sent` to `paid` only once, regardless of network failures.

### 4. Technical Excellence
- **Multi-Core Architecture**: Built with a cluster-aware logger and load-balancing support to utilize 100% of CPU resources.
- **Email Deliverability**: Optimized Resend integration for high-priority transactional emails.
- **Security**: JWT-based authentication with cryptographically secure password handling.

---

## 🛠 Tech Stack
- **Runtime**: Node.js v20+
- **Framework**: Express.js
- **Database**: MongoDB (Native Driver)
- **Scheduling**: Node-Cron
- **Payments**: Flutterwave SDK
- **Email**: Resend API

---

## 🚀 Deployment & Environment

To run this engine, configure the following variables in your `.env` file:

```env
# SERVER INFO
PORT=8080
EMAILPASS= <JWT_SECRET_KEY>

# DATABASE
# (Provide your MongoDB connection string)

# PAYMENTS (Flutterwave)
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=

# EMAIL (Resend)
RESEND_API_KEY=
EMAIL_FROM= "Etherbill <billing@yourdomain.com>"
```

### Setup Instructions
1. `npm install`
2. `node App.js`

---

## 📁 Repository Structure
- `/API`: Endpoints and Route definitions.
- `/controller`: Business logic and database operations.
- `/cron`: Scheduled jobs for recurring billing and auto-chasing.
- `/utils`: Helper services (Email, MongoDB, Flutterwave).

---

## 🔗 Social & Contact
- **Project Lead**: [Chris Ayo](https://google.com/search?q=Alfred+Chris+ayo)
- **Twitter**: [@ayo_cosmos](https://x.com/ayo_cosmos)
- **LinkedIn**: [Adewale Ayomide Chris](https://linkedin.com/in/adewale-ayomide-chris)

---
*Created with focus on financial reliability and user experience.*
