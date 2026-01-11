# Draft Email to David at Intervals.icu

**To:** david@intervals.icu  
**Subject:** OAuth App Registration Request - RiderLabs Training Platform

---

Hi David,

I'm building RiderLabs, an AI-powered cycling training platform that helps athletes analyze their performance and generate personalized training plans. I'd like to integrate Intervals.icu as a data source for our users and would appreciate your help registering an OAuth application.

## Application Details

**App Name:** RiderLabs

**Description:** RiderLabs is a data-driven cycling performance platform that integrates with training data sources to provide AI-powered insights, adaptive training plans, and performance analytics. We help cyclists optimize their training through smart metrics analysis and personalized coaching recommendations.

**Website URL:** https://riderlabs.io (currently in development)

**Logo Image URL:** [Will provide once finalized - square, 128x128+]

**Privacy Policy URL:** https://riderlabs.io/privacy (will be created before public launch)

**Redirect URIs:**
- `http://localhost:5001/api/intervals/callback` (development)
- `https://riderlabs.io/api/intervals/callback` (production - will update when live)

**My Intervals.icu ID:** [Your ID from /settings page]

**Requested Scopes:** `ACTIVITY:READ,WELLNESS:READ`

## Use Case

I'm currently building and testing the Intervals.icu integration for two purposes:

1. **Personal use:** I'll be testing with my own account initially, as my Strava API access is currently limited to personal use only
2. **Club testing:** I want to integrate this for our cycling club members to help them track and analyze their training data

The integration will allow users to:
- Sync their completed activities from Intervals.icu
- View performance metrics and trends
- Generate AI-powered training recommendations based on their activity history
- Track fitness progression over time

I'm following OAuth best practices for multi-user applications as outlined in your documentation, with proper token storage, user isolation, and secure credential management.

## Timeline

I'm ready to begin implementation as soon as the OAuth credentials are available. I'll start with development/testing using my personal account and a small group of club members before expanding to a wider user base.

Please let me know if you need any additional information or if there are any specific requirements I should be aware of for the integration.

Thank you for your time and for building such a great platform!

Best regards,
[Your Name]

---

## Notes for Sending

Before sending this email, make sure to:
1. ✅ Replace `[Your Name]` with your actual name
2. ✅ Add your Intervals.icu ID from the bottom of your /settings page
3. ✅ Update website URL if you have a staging/production URL ready
4. ✅ Prepare a logo image (128x128 minimum, square) and host it somewhere accessible
5. ✅ Consider creating a basic privacy policy page before sending (or mention it's in progress)
6. ✅ Adjust redirect URIs based on your actual deployment setup

## Expected Response Time

Based on forum discussions, this is a manual approval process that may take several days. Plan your development timeline accordingly.
