
- Public checkout calls (create payment, check status, get delivery) are bound to a per-purchase buyer token stored in `sales.access_token`; why: buyers are anonymous, so the token proves a sale belongs to this browser.
- Payment webhooks fail closed when their signing secret is missing; why: unsigned callbacks could approve unpaid sales.
