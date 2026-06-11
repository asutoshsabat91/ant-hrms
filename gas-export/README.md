# AntBox HRMS — Google Apps Script Deployment

## Files

| File | Purpose |
|------|---------|
| `appsscript.json` | GAS project manifest (OAuth scopes, runtime, webapp config) |
| `webapp.gs` | Main controller: doGet(), sync functions, daily trigger, Sheet menu |
| `setup.gs` | One-time setup: create sheets, seed holidays & leave types, install daily trigger |
| `sync.gs` | Additional sync helpers (can be merged into webapp.gs) |
| `automation.gs` | Automation: daily separation check, email digests |
| `index.html` | Web app UI — sync dashboard served via doGet() |

---

## Quick Deploy (clasp — recommended)

```bash
# 1. Install clasp globally
npm install -g @google/clasp

# 2. Login
clasp login

# 3. Create a new GAS project linked to your Spreadsheet
clasp create --type sheets --title "AntBox HRMS Tracker" --rootDir ./gas-export

# 4. Push all files
clasp push --rootDir ./gas-export

# 5. Open in browser to deploy
clasp open --rootDir ./gas-export
```

Then in the browser editor:
- **Deploy → New Deployment → Web App**
- Execute as: **Me**
- Access: **Anyone with Google Account**
- Copy the Web App URL

---

## Manual Deploy (copy-paste)

1. Open your Google Spreadsheet
2. **Extensions → Apps Script**
3. Create files matching each `.gs` filename (without the `.gs` extension in GAS)
4. Copy the content of each file into the corresponding GAS file
5. Copy `index.html` as a new HTML file named `index`
6. Copy `appsscript.json` into **Project Settings → Show appsscript.json manifest** and replace the content
7. **Deploy → New Deployment → Web App**

---

## Script Properties (required)

In Apps Script → **Project Settings → Script Properties**, add:

| Key | Value |
|-----|-------|
| `HRMS_BASE_URL` | `https://your-hrms-domain.com` (your deployed Next.js URL) |
| `HRMS_API_TOKEN` | Any secret string — also set as `HRMS_API_TOKEN` in your `.env` |
| `HR_EMAIL` | `hr@theantbox.com` — for daily separation digest emails |

---

## Employee Master Tracker Columns

The **Employees** sheet mirrors the HRMS database with these columns:

```
Employee ID | First Name | Last Name | Full Name | Email | Personal Email |
Phone | Gender | DOB | Blood Group | Address | City | State | Pincode |
Department | Designation | Employment Type | Status | Joining Date |
Last Working Date | CTC | Basic Salary | HRA | Bank Name | Account No |
IFSC | PAN | UAN
```

---

## Automation

The **daily trigger** (`onDailySeparationCheck`) runs at 9 AM IST every day:
1. Scans approved separations whose last working date has passed
2. POSTs to `/api/separation/{id}` with `action: "complete_offboarding"`
3. The HRMS creates offboarding tasks + document stubs and notifies the employee

---

## Sheets Created

| Sheet | Content |
|-------|---------|
| Employees | Full employee roster with all fields |
| Attendance | Daily attendance records |
| Reimbursements | Expense claims |
| Procurements | Procurement requests (separate from reimbursements) |
| Separations | Resignation requests + notice period |
| POSHReports | Protected — admin-only access |
| LeaveTypes | SL, PL, LOP, PTL, WFH |
| Holidays | Indian national holidays |
| OnboardingTasks | Per-employee onboarding checklist |
| OffboardingTasks | Per-employee offboarding checklist |
