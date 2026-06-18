# Basic Wireframes

These wireframes show the first version of the Technology Operations Directory. They are intentionally simple so the team can review workflows before visual design begins.

## Dashboard

```text
+--------------------------------------------------------------------------------+
| Technology Operations Directory                                      [Add Asset] |
+--------------------------------------------------------------------------------+
| Search assets...                                               [Search] [Reset]  |
+--------------------------------------------------------------------------------+
| Total Assets | Production | Needs Review | Critical | Retired | Vendor Hosted   |
|     248      |    72      |     31       |    18    |   22    |      46         |
+--------------------------------------------------------------------------------+
| Review Queue                         | Category Summary                         |
| - Payroll API          Due today     | Software Applications      58             |
| - Payment Gateway      Due this week | Websites                   31             |
| - Reporting Database   Overdue       | Servers                    44             |
| - Vendor Portal        Due soon      | Databases                  19             |
|                                      | Integrations               26             |
+--------------------------------------------------------------------------------+
| Recently Updated Assets                                                       |
| Name                  Category              Owner Team          Status          |
| Payroll API           Software Application  App Development     Active          |
| Public Website        Website               Technology Ops      Active          |
| Payment Gateway       Payment Service       Finance Systems     Active          |
+--------------------------------------------------------------------------------+
```

## Asset Search and List

```text
+--------------------------------------------------------------------------------+
| Technology Operations Directory                                      [Add Asset] |
+--------------------------------------------------------------------------------+
| Search: [ payroll                                               ] [Search]      |
| Category [All v] Status [All v] Criticality [All v] Owner [All v] Tag [All v]   |
+--------------------------------------------------------------------------------+
| Name                Category             Owner Team       Criticality  Status    |
| Payroll API         Software Application App Development  Critical     Active    |
| Payroll Database    Database             Data Services    High         Active    |
| Payroll SFTP Job    Scheduled Process    Data Services    Medium       Active    |
+--------------------------------------------------------------------------------+
| [Previous]                                                         [Next]        |
+--------------------------------------------------------------------------------+
```

## Asset Detail

```text
+--------------------------------------------------------------------------------+
| Payroll API                                             [Edit] [Review] [Retire] |
+--------------------------------------------------------------------------------+
| Category: Software Application       Status: Active       Criticality: Critical  |
| Owner Team: Application Development  Technical Owner: Jordan Lee                 |
| Business Owner: HR Operations        Data Classification: Confidential           |
+--------------------------------------------------------------------------------+
| Purpose                                                                        |
| Provides payroll data services to internal HR and finance systems.              |
+--------------------------------------------------------------------------------+
| Links                      | Operations                                         |
| Production URL             | Support Channel                                   |
| Repository                 | Runbook                                           |
| Documentation              | Monitoring                                        |
+--------------------------------------------------------------------------------+
| Environments                | Integrations                                      |
| Production - api.company... | Payroll DB -> Payroll API                         |
| Staging - staging-api...    | Payroll API -> Finance Reporting                  |
+--------------------------------------------------------------------------------+
| Review History                                                                  |
| Date          Reviewer       Result          Notes                               |
| 2026-06-01    M. Benitez     Approved        Ownership confirmed                 |
+--------------------------------------------------------------------------------+
```

## Add or Edit Asset

```text
+--------------------------------------------------------------------------------+
| Add Asset                                                        [Cancel] [Save] |
+--------------------------------------------------------------------------------+
| Basic Information                                                               |
| Asset Key [                 ] Name [                                      ]     |
| Category  [Select category v] Status [Active v] Criticality [Medium v]          |
| Data Classification [Internal v]                                                |
+--------------------------------------------------------------------------------+
| Ownership                                                                       |
| Owner Team [Select team v] Technical Owner [Select person v]                    |
| Business Owner [Select person v] Primary Vendor [Select vendor v]               |
+--------------------------------------------------------------------------------+
| Operational Links                                                               |
| Production URL [                                                            ]   |
| Repository URL [                                                            ]   |
| Documentation URL [                                                         ]   |
| Runbook URL [                                                               ]   |
+--------------------------------------------------------------------------------+
| Category Details                                                                |
| Fields change based on selected category.                                       |
+--------------------------------------------------------------------------------+
```

## Review Workflow

```text
+--------------------------------------------------------------------------------+
| Review Asset: Payment Gateway                                  [Cancel] [Submit] |
+--------------------------------------------------------------------------------+
| Current Status: Active       Last Reviewed: 2026-01-15       Due: 2026-07-15     |
+--------------------------------------------------------------------------------+
| Checklist                                                                       |
| [ ] Ownership is correct                                                        |
| [ ] Vendor and support details are current                                      |
| [ ] Documentation and runbook links work                                        |
| [ ] Criticality and data classification are correct                             |
| [ ] Integrations and scheduled processes are current                            |
+--------------------------------------------------------------------------------+
| Result [Approved v]                                                             |
| Notes                                                                          |
| [                                                                            ] |
+--------------------------------------------------------------------------------+
| Next Review Due [2026-12-15]                                                    |
+--------------------------------------------------------------------------------+
```

