# DriverThru — Your Licensing Best Friend

DriverThru is a custom internal web system designed to support and optimize NJMVC-related business workflows.  
The platform centralizes customer data, automates document generation, and reduces manual and repetitive operational tasks.

---

## Features

- Responsive web interface (desktop and mobile)
- Customer registration and management
- Storage of driver’s license information:
  - Brazilian Driver’s License
  - New Jersey Driver License
  - Passport data
- Automated PDF document filling using predefined templates:
  - BA-208
  - Affidavit
- Automatic reminders for customer license expiration dates
- Customer reports generation (TXT, CSV)

---

## Getting Started

### Prerequisites
- Docker
- Docker Compose

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mferrreira/DriverThru
   ```

2. Navigate to the project folder and start the containers:

   ```bash
   docker-compose up -d --build
   ```

3. Access the application in your browser:

   ```
   https://localhost/
   ```

4. Create your account and start using the system.

---

## Technologies

### Backend

* FastAPI
* SQLAlchemy
* Alembic
* PyPDF

### Frontend
* ReactJS
* React Router
* ShadCN
* TanStack Query

### Infrastructure

* Docker
* Docker Compose
* Reverse proxy (NGINX)

---

## Architecture

The system follows a **modular monolith architecture**, allowing fast development and simplified deployment while maintaining clear separation of concerns between modules (authentication, customers, documents, reports).

This approach supports future scalability and refactoring into distributed services if required.

---

## Contributing

1. Clone the repository
2. Create a new branch:

   ```bash
   git checkout -b feature/branch-name
   ```
3. Commit your changes:

   ```bash
   git commit -m "Describe your changes"
   ```
4. Push to your branch:

   ```bash
   git push origin feature/branch-name
   ```

---

## License

MIT License