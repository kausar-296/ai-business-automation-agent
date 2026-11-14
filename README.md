# NexusAI Enterprise: AI Business Automation Agent

NexusAI Enterprise is a browser-based, role-aware workspace that brings common business workflows into one application. It combines CRM-oriented sales and customer workflows with HRMS, project and task management, finance, operations, private notes, and a context-aware Gemini assistant.

The application is designed as an interactive enterprise prototype. Its users, projects, attendance, requests, reports, sales metrics, invoices, inventory, and notes are demonstration data stored in the browser.

## Table of contents

- [Project overview](#project-overview)
- [Problem identification](#problem-identification)
- [Project objectives](#project-objectives)
- [Technologies and tools](#technologies-and-tools)
- [Run the application](#run-the-application)
- [Solution architecture](#solution-architecture)
- [Roles and access](#roles-and-access)
- [Modules and features](#modules-and-features)
- [Mock user credentials](#mock-user-credentials-for-testing)
- [Gemini AI setup](#gemini-ai-setup)
- [Data, privacy, and security notes](#data-privacy-and-security-notes)
- [Learning outcomes and conclusion](#learning-outcomes-and-conclusion)

## Project overview

NexusAI Enterprise provides a unified interface for employees, managers, and HR managers to review their work, update task progress, track attendance, submit requests, and view role-appropriate business information. Managers and HR managers have additional project and administrative workflows; sensitive views are filtered according to the active role.

The app uses a single-page, multi-view experience: users sign in once and switch between authorized sections without navigating to separate application pages. A shared mock database keeps the module data aligned while preserving the storage interfaces used by the existing modules.

## Problem identification

> *Build an AI agent that automates practical business workflows for sales, hr, project management, finance, operations or customer support.*

Business workflows are often spread across disconnected tools. This fragments project status, attendance, requests, financial summaries, and operational information, making it harder for teams to find the current state of work or route decisions to the right people. A unified workspace can reduce that friction by presenting consistent, role-appropriate workflows and adding AI summaries based on the current view.

## Project objectives

- Create an interactive multi-role application for Managers, HR Managers, and Employees.
- Demonstrate role-based access control and user-scoped personal data.
- Keep task, project, attendance, leave, grievance, and finance data aligned in a shared state model.
- Record attendance when a signed-in user opens the dashboard.
- Support task progress updates, report and attachment submissions, and manager review loops.
- Provide leave and grievance workflows for staff and HR.
- Offer dynamic AI-powered executive briefings and summaries grounded in the active view.

## Technologies and tools

| Area | Technologies |
| --- | --- |
| Frontend | HTML5, CSS3, modern responsive CSS, vanilla JavaScript (ES6+) |
| Styling | CSS design tokens, component stylesheets, responsive layouts, dark and light themes |
| Persistence | Browser `localStorage` with a unified mock database architecture |
| AI | Google Gemini API using the REST `generateContent` endpoint and `gemini-2.5-flash` |
| Attachments | Browser file inputs, previews, and localStorage-backed mock records |

The application does not require a frontend framework, package manager, build process, or Tailwind dependency. Tailwind was an option for the project; the implementation uses modern custom CSS for its component styling.

## Run the application

1. Open `index.html` in a modern browser, or serve the project directory with a static file server.
2. Sign in using one of the accounts in [Mock user credentials](#mock-user-credentials-for-testing).
3. Navigate between the sections available to that role using the sidebar.
4. Select the floating assistant button in the bottom-right to open Gemini chat.

The app redirects authenticated users to `app.html`. The user's session is stored under `nexus-session`, and the chosen theme is saved as `nexus-theme`.

## Solution architecture

### Client-side application

`index.html` hosts the sign-in experience. `app.html` hosts the authenticated workspace and its role-aware views. The JavaScript modules initialize after the document loads and populate the relevant views from browser state.

### Unified mock database

`db.js` initializes the canonical `nexus-company-db` record. It contains the roster and shared business data, including projects, tasks, attendance history, HRMS records, sales metrics, finance data, operations inventory, and per-user notes. Existing module storage keys are presented as compatibility views, so modules continue to read and write their expected data shapes while the canonical state remains centralized.

The initial dataset includes nine users, linked projects and tasks, historical attendance, leave requests, grievances, project budgets, financial transaction history, sales trends, and operations metrics. Invoices are created through the Finance module. On first initialization, compatible state from the earlier module-specific storage keys is migrated and reconciled with the current roster and project records.

Key source files:

- `db.js` — centralized mock company data, initialization, migration, and compatibility views.
- `app.js` — sign-in, theme, session handling, attendance check-in, and role-based dashboard.
- `pms.js`, `sales.js`, `hrms.js`, `finance.js`, `operations.js`, and `notes.js` — module workflows and rendering.
- `assistant.js` and `assistant.css` — floating Gemini assistant, active-view context extraction, and widget styling.
- `app.html` and the CSS files — workspace structure and shared/module-specific presentation.

### Session and view access

After successful mock authentication, the app stores the active user's ID, name, and role in `nexus-session`. Module scripts use the session role to show or restrict views and actions. Personal Notes records are keyed to the active user ID and checked against their owner ID when read or changed.

The Gemini assistant reads only the rendered content of the active view and the current request. It does not submit the entire database or prior chat messages as context.

## Roles and access

| Module | Manager | HR Manager | Employee |
| --- | :---: | :---: | :---: |
| Dashboard | Yes | Yes | Yes |
| Projects & Tasks | Department projects and team reviews | HR projects and reviews | Assigned tasks only |
| Sales & Stocks | Yes | No | No |
| HRMS & Attendance | Personal self-service | Organization-wide HR administration | Personal self-service |
| Finance & Invoicing | Yes | Yes | No |
| Operations & Inventory | Yes | Yes | No |
| Notes & Files | Own notes only | Own notes only | Own notes only |
| Gemini assistant | Active-view context | Active-view context | Active-view context |

Managers work with their configured department scope. HR managers work with HR-specific project tasks and organization-wide HR workflows. Employees cannot create projects or assign tasks and see only work assigned to their user ID.

## Modules and features

### Authentication and dashboard

- Responsive login with inline validation and mock credential checking.
- Light and dark themes, with saved preference and system preference support.
- Automatic Present attendance entry and timestamp when the dashboard loads.
- Dashboard cards adapt to the active role and draw priority tasks, pending reviews, attendance, leave, and grievance summaries from shared records.
- Welcome banner automatically fades after a few seconds.

### Projects & Tasks (PMS)

- Managers and HR managers can create projects within their permitted department scope and assign tasks to eligible team members.
- Employees see tasks assigned to their account, update progress from 0% to 100%, submit work summaries, and attach files or images.
- Managers and HR managers review relevant submissions, approve work, or request changes with required feedback.
- A revision request returns the task to the employee with the reviewer's comment for resubmission.

### Sales & Stocks

- Manager-only analytics view with revenue, active stock, conversion, and margin metrics.
- Trend indicators, regional performance, inventory levels, and recent transactions.
- Simulated refresh action updates and persists the displayed data.

### HRMS & Attendance

- HR managers can review the organization roster, attendance history, leave requests, and employee grievance reports.
- HR can approve or reject leave, update grievance status, add internal notes, view grievance details, and delete reports.
- The grievance inbox is scrollable and includes a details dialog for reading the full report and submitter information.
- Employees and managers can view their own attendance history, submit leave requests, and send confidential reports to HR.

### Finance & Invoicing

- Available to Managers and HR Managers.
- Project budget utilization, accounts receivable/payable, payroll outlays, cash-flow summaries, and recent transactions.
- Generate and persist mock client invoices. Budget allocation controls are not provided.

### Operations & Inventory

- Available to Managers and HR Managers.
- Office hardware counts and low-stock alerts, license seat usage, and cloud/server uptime indicators.
- Mock refresh and inventory actions persist changes through the shared state.

### Personal Notes & Files

- Available to every signed-in role.
- Create, edit, search, and delete personal notes with file or image attachments.
- Notes remain scoped to the current user's ID; users cannot access another account's notes through the module.

### Context-aware Gemini AI assistant

- Floating bottom-right chat widget is available across authenticated views.
- Ask a question about the active view or select **Summarize Current View**.
- Each request includes the active view's rendered text, the current role, and the current question. Previous chat messages and the full database are excluded from request context.
- The assistant is instructed to refuse requests for information that is not present in the accessible view.

## Mock user credentials (for testing)

User IDs are case-insensitive. These demo credentials are configured in `db.js` and are also used by the login screen.

| User ID | Password | Name | Role |
| --- | --- | --- | --- |
| `MGR-ENG-001` | `NexusSarah!2026` | Sarah Jenkins | Manager — Engineering and Sales |
| `MGR-OPS-002` | `NexusRobert!2026` | Robert Vance | Manager — Operations, Support, QA, and Marketing |
| `HR-CHIEF-001` | `NexusElena!2026` | Elena Rostova | HR Manager — Chief HR |
| `HR-SPEC-002` | `NexusMarcus!2026` | Marcus Brody | HR Manager — HR Specialist |
| `EMP-SALES-001` | `NexusAlex!2026` | Alex Reed | Employee — Sales |
| `EMP-ENG-002` | `NexusDavid!2026` | David Kim | Employee — Engineering |
| `EMP-SUP-003` | `NexusJessica!2026` | Jessica Taylor | Employee — Support |
| `EMP-QA-004` | `NexusLiam!2026` | Liam Smith | Employee — QA |
| `EMP-MKT-005` | `NexusChloe!2026` | Chloe Bennett | Employee — Marketing |

## Gemini AI setup

1. Create a Gemini API key through Google AI Studio.
2. Open `assistant.js` and replace the placeholder value assigned to `GEMINI_API_KEY` on line 9 with your key.
3. Reload `app.html` while signed in and try the assistant.

The assistant calls Google's [`generateContent` REST endpoint](https://ai.google.dev/api/generate-content) using the `gemini-2.5-flash` model. If the key is missing or the request fails, the chat displays a helpful error message.

**API key handling:** `assistant.js` is client-side code, so any key placed there is visible to users in the browser. This setup is suitable only for local development or a controlled demonstration. For production, keep the key on a server and send requests through an authenticated backend proxy with rate limits and appropriate access controls.

## Data, privacy, and security notes

- All application data is mock data stored in the browser; it is not backed by a production database.
- Login credentials and role checks are implemented in client-side JavaScript. They demonstrate application behavior but are not production-grade authentication or security boundaries; a user who controls the browser can inspect or alter local state.
- User-scoped Notes and role-aware view filtering demonstrate data isolation patterns but do not replace server-side authorization.
- Uploaded attachments are stored in browser storage for the demo. PMS attachments are limited to 600 KB each; Notes attachments are limited to 500 KB each and four files per note.
- Avoid entering real employee, financial, customer, or confidential information.
- Gemini requests send the current active view's rendered text and the current user prompt to Google. Do not put secrets in page content. For a production deployment, use backend access checks and a server-side API key.

## Learning outcomes and conclusion

This project demonstrates client-side state management across multiple modules, preserving data consistency through a centralized mock database, and designing role-aware user experiences. It also explores user-scoped browser storage, dashboard and workflow UI design, attachment previews, and integration of an LLM API with limited, view-based context.

NexusAI Enterprise brings representative sales, people, project, finance, and operations workflows into one cohesive prototype. Its shared data model and context-aware assistant provide a foundation for future server-backed automation, while production use would require backend identity, authorization, persistence, and secret management.
