# UAT Plan — CogHealth EHR Web (COG-GTM/demos-coghealth-ehr-web)

Derived from the actual code paths in `src/App.tsx`, `src/pages/*`, `src/components/ui/*`, and `src/services/*`.
Existing suite (`tests/e2e.test.ts`, Puppeteer, 40-ish shallow tests) mostly asserts "page loaded / click didn't throw".
The UAT below is workflow- and outcome-based (asserts resulting state), and fills the gaps it misses.

Legend: **[NEW]** = not covered today, **[DEEPEN]** = exists but only smoke-level.

## UAT-1 Shell, navigation & session security (HIPAA safeguards)
| ID | Scenario | Expected result | |
|---|---|---|---|
| 1.1 | Navigate all 8 toolbar entries (Dashboard, Patients, Schedule, Labs, Vitals, Medications, Reports, Settings) | Correct route + page-specific status bar text; active tab highlighted | [DEEPEN] — Labs/Vitals routes untested today |
| 1.2 | Global patient search: type "smi" / "MRN0012" / "zzz" | Dropdown lists matching patients; "No patients found" for no match; <2 chars shows nothing | [DEEPEN] |
| 1.3 | Select patient from global search | Routes to `/patients/:id`, chart loads for that patient | covered |
| 1.4 | Logout → Cancel, then Logout → Confirm | Cancel keeps session; Confirm writes a `LOGOUT` audit event to `localStorage.coghealth_audit_log` and reloads | [NEW] (audit assertion) |
| 1.5 | Session timer counts down and resets on user activity | Timer decrements; click/keypress resets to 15:00 | [NEW] |
| 1.6 | Session-timeout warning + expiry dialogs (drive via clock manipulation / short-circuit) | Warning at 2:00 remaining with Continue/Logout; expiry dialog then logs `SESSION_TIMEOUT` and logs out | [NEW] |
| 1.7 | Status bar compliance indicators | "HIPAA Compliant", TLS 1.3, "Audit Logging: Active" always visible | covered |
| 1.8 | Mobile viewport (375px) | Hamburger opens nav; selecting an item navigates and closes menu | [NEW] |
| 1.9 | Unknown route (`/nope`) | Graceful behavior — no blank/crashed shell (documents current gap: no 404 route defined) | [NEW] |

## UAT-2 Clinical cockpit / Dashboard
| ID | Scenario | Expected result | |
|---|---|---|---|
| 2.1 | Inbox tab filters (All / Results / Messages / Tasks) with unread counts | Row set matches tab; counts equal unread items of that type | [DEEPEN] (counts asserted) |
| 2.2 | Priority filter (critical/high/routine) and read/unread filter, combined with tab | Intersection of filters applied | [DEEPEN] |
| 2.3 | Mark single item read / Mark All Read | Row style changes to read; unread badge decrements to 0; "Inbox Updated" confirmation | [DEEPEN] |
| 2.4 | Flag/unflag inbox item | Flag toggles and persists across tab switches | [DEEPEN] |
| 2.5 | Worklist type filter + sort by column (asc/desc toggle) | Rows filtered; order actually reverses on second click | [DEEPEN] (ordering asserted) |
| 2.6 | Critical alerts panel | Alerts render with type, patient, time, "Review required" action | [NEW] |
| 2.7 | Unsigned notes / pending orders panels | Counts + rows render; Sign / Sign All / Review controls present | [NEW] |
| 2.8 | Collapse/expand each panel | Body hidden/shown per panel independently | [DEEPEN] |
| 2.9 | Toolbar dialogs: e-Prescribe, Order Labs, Order Imaging, Print | Each opens the correct dialog; cancel closes with no side effect | [DEEPEN] (Imaging untested) |
| 2.10 | API unavailable | Page renders shell without crashing; empty panels (documents current no-error-surface behavior) | [NEW] |

## UAT-3 Patient search & selection
| ID | Scenario | Expected result | |
|---|---|---|---|
| 3.1 | Free-text search by last name, first name, MRN, phone, DOB | Result set matches each field type | [DEEPEN] |
| 3.2 | Advanced filters: status, gender, insurance type, PCP — via Apply Filters | Results narrow correctly; combined with text term | [DEEPEN] |
| 3.3 | Filters that match nothing | Empty-state, no stale rows | [NEW] |
| 3.4 | Select a patient row | Detail pane shows that patient's demographics/insurance/contact; expandable sections toggle | [DEEPEN] |
| 3.5 | Open chart from detail pane | Routes to that patient's chart; banner MRN matches selected row | [DEEPEN] |
| 3.6 | Refresh button | Re-fetches list and shows "Refreshed" confirmation | [NEW] |
| 3.7 | Quick actions from detail pane (e-Prescribe / Order Labs) | Dialogs open pre-scoped to the selected patient (name + MRN shown in dialog) | [NEW] |
| 3.8 | API failure | "Failed to load patients from server." error dialog, dismissible | [NEW] |

## UAT-4 Patient chart
| ID | Scenario | Expected result | |
|---|---|---|---|
| 4.1 | Chart loads for `/patients/1` | Banner shows name, MRN, DOB, age/sex; clinical flags (FALL/DNR/NPO/ISO/VIP) render | [DEEPEN] |
| 4.2 | Opening a chart writes `PATIENT_ACCESS` audit event | Audit log entry with patient MRN + timestamp (HIPAA PHI-access requirement) | [NEW] |
| 4.3 | Tab switching (Summary / Problems / Medications / Allergies / Encounters / Vitals / Labs) | Each tab renders its own content, not the previous tab's | [DEEPEN] (content asserted) |
| 4.4 | Allergy list vs e-Prescribe CDS | Prescribing a drug matching a documented allergy raises the allergy/interaction warning in the Rx dialog | [NEW] — highest-risk clinical path |
| 4.5 | Panel collapse/expand (Active Problems, Medications, Allergies…) | Independent toggling | covered |
| 4.6 | e-Prescribe from chart → complete flow | Success confirmation naming the medication; dialog closes | [DEEPEN] (only open/cancel today) |
| 4.7 | Order Labs from chart → complete flow | Success confirmation listing ordered test(s) | [DEEPEN] |
| 4.8 | Print chart | Print dialog with section selection; confirmation on Print | [NEW] |
| 4.9 | Invalid patient id (`/patients/99999`) | Stays on "Loading patient..." — documents missing error state | [NEW] |

## UAT-5 e-Prescribing dialog (PrescriptionDialog)
| ID | Scenario | Expected result | |
|---|---|---|---|
| 5.1 | Search formulary by drug name and by drug class ("statin") | Filtered medication list | [NEW] |
| 5.2 | Select drug → strength/form defaults populate | First strength preselected, form from formulary | [NEW] |
| 5.3 | SIG template selection, quantity, refills, DAW toggle, pharmacy selection, notes | Fields update and are carried into submission | [NEW] |
| 5.4 | Submit with no drug selected / missing strength | Submit is a no-op (no false success) | [NEW] |
| 5.5 | Valid submit | Success alert with drug + strength; form resets on next open | [NEW] |
| 5.6 | Allergy warning path | Warning banner displayed for allergy-conflicting drug | [NEW] |

## UAT-6 Orders dialog (OrderDialog — labs & imaging)
| ID | Scenario | Expected result | |
|---|---|---|---|
| 6.1 | Search/select one and multiple tests; deselect | Selection list updates both ways | [NEW] |
| 6.2 | Priority (routine/urgent/STAT), collection timing, diagnosis/indication, notes | Values captured in submission | [NEW] |
| 6.3 | Submit with nothing selected | Blocked, no success alert | [NEW] |
| 6.4 | Valid submit | Confirmation lists ordered tests and priority | [NEW] |

## UAT-7 Schedule
| ID | Scenario | Expected result | |
|---|---|---|---|
| 7.1 | Day grid renders appointments with time, patient, type, status | Rows match seeded appointments | [DEEPEN] |
| 7.2 | View mode switch (day/week/…) and date navigation | Grid updates to selected date/range | [DEEPEN] (result asserted) |
| 7.3 | Status filter (ARRIVED / TRIAGED / IN_PROGRESS / etc.) | Only matching encounters listed | [NEW] |
| 7.4 | Select appointment | Detail pane shows that appointment's patient + chief complaint | [NEW] |
| 7.5 | New Appointment: patient search, slot, chief complaint → Schedule | "Appointment Scheduled" confirmation; Cancel discards | [DEEPEN] |
| 7.6 | Quick actions from appointment (e-Prescribe / Order Labs) | Dialogs open scoped to that appointment's patient | [NEW] |
| 7.7 | Print day schedule | Print dialog + confirmation | [NEW] |

## UAT-8 Medications management
| ID | Scenario | Expected result | |
|---|---|---|---|
| 8.1 | Search by medication, patient, Rx# | Matching orders only | [DEEPEN] |
| 8.2 | Status filter (active/pending/expired/discontinued) + view mode (all/by patient) | Grouping and filtering correct; patient groups expand/collapse | [DEEPEN] |
| 8.3 | Select medication order | Detail pane shows SIG, quantity, refills, DAW, prescriber, pharmacy for that order | [DEEPEN] |
| 8.4 | New Rx from Medications page → full flow | Success confirmation | [DEEPEN] |
| 8.5 | Print medication list | Print dialog + confirmation | [NEW] |

## UAT-9 Lab results
| ID | Scenario | Expected result | |
|---|---|---|---|
| 9.1 | Panels list and expand/collapse individual panels | Component results shown with value, units, ref range | [NEW] (whole page untested) |
| 9.2 | Filter: All / Abnormal / Critical | Only matching results; abnormal/critical visually flagged (H/L/critical styling) | [NEW] |
| 9.3 | Patient filter + date range (today/week/month/all) | Result set changes accordingly | [NEW] |
| 9.4 | Select an individual result | Detail pane with reference range, collection/resulted time, status | [NEW] |

## UAT-10 Vitals / flowsheet
| ID | Scenario | Expected result | |
|---|---|---|---|
| 10.1 | Flowsheet grid renders readings across time columns | Values present per vital row | [NEW] (whole page untested) |
| 10.2 | Date range switch (24h/48h/7d/30d) | Column set changes | [NEW] |
| 10.3 | Out-of-range values flagged | Abnormal styling vs normal range | [NEW] |
| 10.4 | Add Vitals: enter values + notes → Save / Cancel | Dialog closes; Cancel discards (documents that Save currently only closes the dialog) | [NEW] |
| 10.5 | Select a reading | Detail pane for that reading | [NEW] |

## UAT-11 Reports
| ID | Scenario | Expected result | |
|---|---|---|---|
| 11.1 | Category filter (clinical/operational/financial/compliance) + category expand/collapse | Report list matches | [DEEPEN] |
| 11.2 | Run report | Running/complete confirmation for the selected report | [DEEPEN] |
| 11.3 | Download/export report | Confirmation shown (and `PHI_EXPORT`-class action surfaced) | [DEEPEN] |
| 11.4 | Print all reports from toolbar | Print dialog opens with no report preselected | [NEW] |

## UAT-12 Settings
| ID | Scenario | Expected result | |
|---|---|---|---|
| 12.1 | Tab switching (Profile / Notifications / Security / Appearance) | Correct panel content per tab | [DEEPEN] |
| 12.2 | Edit profile fields → Save Changes | "Saved" state; values persist across tab switch and reload (localStorage) | [DEEPEN] — persistence is the real assertion |
| 12.3 | Notification toggles per channel/alert | Toggle state persists after save + reload | [DEEPEN] |
| 12.4 | Appearance settings | Applied/persisted | [NEW] |
| 12.5 | Security section: Change Password, View Active Sessions | Informational dialogs open and dismiss | [NEW] |
| 12.6 | Settings change is audited | `SETTINGS_CHANGE` audit event recorded | [NEW] |

## UAT-13 Modal/dialog contract (cross-cutting)
| ID | Scenario | Expected result | |
|---|---|---|---|
| 13.1 | Close via Cancel, X, Escape, backdrop click | Modal removed from DOM in all four cases | [DEEPEN] (X/Escape currently unasserted; backdrop untested) |
| 13.2 | Cancel discards entered data | Reopening shows a clean form | [NEW] |
| 13.3 | Only one modal at a time / no scroll-lock leak after close | Page interactive again after close | [NEW] |

---

## Open question before implementation
Dashboard, Patient Search and Patient Chart fetch live data from `demos-coghealth-ehr-api` (`VITE_API_URL`, default `http://localhost:8080/api`, needs Neon Postgres). The rest of the pages use in-file seed data. Two options for the E2E run:

- **A (recommended): mock the API at the network layer** in the test harness (Puppeteer request interception with fixed patient fixtures). Deterministic, no DB creds, and lets me assert exact rows/counts. Also gives me an honest "API down" negative path.
- **B: stand up the real API + Neon DB** — needs a Neon connection string from you; slower and data-dependent assertions become fragile.

## Deliverables once approved
- Puppeteer E2E suite in `tests/` (extending the existing harness), plus `npm run test:e2e`
- UAT results document (per-ID pass/fail, defects found, screenshots)
- Screen-recorded video walking the application
- PR against `main`

Decision: Approved — mock at the network layer.
