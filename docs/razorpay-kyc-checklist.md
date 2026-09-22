# Razorpay KYC checklist (Week 1)

Razorpay activation requires KYC and takes 3–7 business days even when everything is in order. **Start this in Week 1 of the build, not Week 11.**

## Documents to gather

- [ ] PAN card (business or proprietor)
- [ ] Bank account details (account no., IFSC, cancelled cheque or bank statement)
- [ ] Address proof for business (utility bill, rent agreement, or GST cert)
- [ ] GSTIN (optional but speeds activation — register at gst.gov.in if not already)
- [ ] Business / brand registration (sole proprietorship, partnership, LLP, or Pvt Ltd certificate)
- [ ] Website URL: https://qayra.in must be live with:
  - [ ] Privacy policy
  - [ ] Terms of service
  - [ ] Shipping & returns policy
  - [ ] Working contact page with phone/email

## Steps

1. Sign up at https://dashboard.razorpay.com
2. Choose "Standard Plan" (no setup fee, 2% + GST per txn)
3. Upload documents above in the Account Activation flow
4. Submit; check email for follow-ups

## Once approved

- Copy `Key Id` and `Key Secret` from Razorpay dashboard → Settings → API Keys
- Store as env vars (Week 3 wires these into checkout):
  - `RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`

## Until approved

You can do all Week 3 checkout work in **Test Mode** using the test API keys (visible in dashboard before KYC completes). Live mode just requires swapping the keys.
