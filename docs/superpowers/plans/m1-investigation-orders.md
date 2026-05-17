# M1 Task 5: Order Table Investigation

**Date:** 2026-05-17
**Status:** 🔴 Major finding — payment integration likely broken

## Summary

14 Order rows exist in DB, all with status `pending`. **Zero successful payments.**
But these are NOT test data — they represent **2 real users who tried to pay and failed**.

## Details

| User | Email | Plan | Amount | Attempts | All-Pending? |
|---|---|---|---|---|---|
| p131101 | p131101@mail.cgust.edu.tw | BASIC | NT$299 | 5 | ✅ |
| a7614118 | a7614118@gmail.com | PRO | NT$399 | 9 | ✅ |

All attempts happened on 2026-04-17 / 2026-04-18 within a few minutes — meaning the user clicked "buy" multiple times because the previous attempts didn't complete.

## Signal

- **9 attempts by a7614118** = strongest possible "I want to pay you" signal
- Both users gave up after multiple tries → likely lost forever unless we reach out
- Payment integration (NewebPay) is the blocker preventing first revenue

## Action Items

### Immediate (this week)

1. **Email both users** with apology + 60-day free PRO:

   - p131101@mail.cgust.edu.tw (長庚大學學生 — perfect ICP!)
   - a7614118@gmail.com

2. **Investigate why payments are stuck in `pending`**:
   - Check NewebPay sandbox vs live mode setting
   - Check `app/api/payment/newebpay/notify` webhook — is it ever called?
   - Check Zeabur logs around 2026-04-17 ~ 2026-04-18 for payment errors

### Before M3 (paid launch)

3. End-to-end test of NewebPay flow with synthetic user
4. Add a `payment_attempt_log` table to track every checkout click
5. Alert in admin panel if any user has > 2 pending orders within 1 hour

## Why this matters strategically

- 21 registered users → 2 tried to pay → both blocked
- That's a **~10% payment-intent rate** with current product
- If we fix the payment bug, even baseline conversion suggests 2-3 paid users from existing alpha pool
- **Don't market harder until this is fixed** — every new visitor will hit the same wall

## Audit log

Investigation script: `/tmp/check-orders.mjs` (not committed)
Backup of Order table at the time: `.backups/2026-05-17/db-Order.json`
