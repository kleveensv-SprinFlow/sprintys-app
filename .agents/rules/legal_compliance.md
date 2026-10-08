---
name: legal_compliance
description: Strict constraint preventing automatic or placeholder modifications to legal documents
trigger: always_on
---

# Legal and Regulatory Notice Constraints

1. NEVER write placeholder, fictitious, or speculative editor/company data into legal notice files (e.g. `src/legal/notices.ts`, privacy policies, terms of service).
2. All technical implementations (Edge Functions, migrations, UI, TypeScript fixes) must proceed autonomously, while leaving legal identifier fields explicitly untouched until the user supplies official legal entities.
