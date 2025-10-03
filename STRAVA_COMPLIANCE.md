# Strava API Compliance Implementation

## Overview
This document outlines the implementation of Strava API compliance requirements for AI Fitness Coach.

**Implementation Date:** 2025-10-03  
**Status:** ✅ Complete

---

## 1. Strava Branding & Attribution ✅

### Implementation
- **Component Created:** `src/components/StravaAttribution.jsx`
  - Displays official Strava logo (SVG)
  - Shows "Powered by Strava" text
  - Reusable across the application

### Locations Added
1. **Layout (Sidebar Footer)**
   - File: `src/components/Layout.jsx`
   - Visible on all authenticated pages
   - Includes links to Privacy Policy and Terms of Service

2. **Settings Page**
   - File: `src/pages/Settings.jsx`
   - Displayed when Strava is connected
   - Shows attribution under Strava connection status

### Compliance
✅ Meets Strava's requirement to display "Powered by Strava"  
✅ Uses official Strava brand colors (#FC4C02)  
✅ Visible to all users when Strava data is being used

---

## 2. Rate Limiting ✅

### Implementation
- **File:** `server/services/stravaService.js`
- **Method:** `rateLimitDelay()`

### Rate Limits Enforced
| Limit Type | Strava Requirement | Our Implementation |
|------------|-------------------|-------------------|
| 15-minute window | 100 requests | ✅ 100 requests tracked |
| Daily window | 1,000 requests | ✅ 1,000 requests tracked |
| Request spacing | Not specified | ✅ 600ms minimum between requests |

### Features
- **Automatic Throttling:** Delays requests to stay within limits
- **Counter Reset:** Automatically resets counters after time windows
- **Error Handling:** Throws error if daily limit reached
- **Logging:** Warns when approaching limits

### Applied To
- `getActivities()` - Fetching athlete activities
- `getActivity()` - Fetching single activity details
- `getAthleteStats()` - Fetching athlete statistics

### Code Example
```javascript
async getActivities(accessToken, params = {}) {
  await this.rateLimitDelay(); // Rate limiting applied
  
  try {
    const response = await axios.get(`${this.baseUrl}/athlete/activities`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { ... }
    });
    return response.data.map(activity => this.normalizeActivity(activity));
  } catch (error) {
    console.error('Strava API error:', error.response?.data || error.message);
    throw error;
  }
}
```

### Compliance
✅ Respects Strava's 100 requests per 15 minutes limit  
✅ Respects Strava's 1,000 requests per day limit  
✅ Prevents API abuse  
✅ Provides user feedback when limits are reached

---

## 3. Privacy Policy & Terms of Service ✅

### Privacy Policy
- **File:** `src/pages/PrivacyPolicy.jsx`
- **Route:** `/privacy`

#### Sections Covered
1. **Information We Collect**
   - Account information
   - Strava data (activities, metrics)
   - Google Calendar data

2. **How We Use Your Information**
   - Training plan generation
   - Metrics calculation
   - Progress tracking

3. **Data Storage & Security**
   - Local storage (browser)
   - Server storage (minimal)
   - Security measures (OAuth, HTTPS)

4. **Third-Party Services**
   - Strava (with link to Strava's privacy policy)
   - Google Calendar (with link to Google's privacy policy)
   - OpenAI (with link to OpenAI's privacy policy)

5. **Your Rights**
   - Access, delete, disconnect, export, opt-out

6. **Data Sharing**
   - Explicitly states we do NOT sell data
   - No advertising use
   - No cross-user aggregation

### Terms of Service
- **File:** `src/pages/TermsOfService.jsx`
- **Route:** `/terms`

#### Sections Covered
1. **Acceptance of Terms**
2. **Service Description**
3. **Third-Party Services** (Strava, Google)
4. **User Responsibilities**
5. **Medical Disclaimer** ⚠️ (Important)
6. **Limitation of Liability**
7. **Data Usage & Privacy**
8. **Intellectual Property**
9. **Service Availability**
10. **Account Termination**
11. **Changes to Terms**
12. **Governing Law**
13. **Contact & Questions**

### Key Features
- ⚠️ **Medical Disclaimer:** Clear warning that app is not medical advice
- 🔗 **External Links:** Links to Strava, Google, and OpenAI policies
- 📱 **Responsive Design:** Mobile-friendly layout
- 🎨 **Visual Hierarchy:** Cards and icons for easy reading

### Compliance
✅ Transparent about data collection and usage  
✅ Links to third-party privacy policies (Strava, Google, OpenAI)  
✅ Clear user rights and responsibilities  
✅ Medical disclaimer to limit liability  
✅ Accessible from sidebar footer on all pages

---

## 4. Additional Compliance Measures

### Token Management
- **Secure Storage:** OAuth tokens encrypted in database
- **Auto-Refresh:** Tokens automatically refreshed when expired
- **Revocation:** Users can disconnect Strava anytime

### Data Handling
- **No Permanent Storage:** Activity data stored in browser localStorage
- **No Aggregation:** User data not combined across users
- **No Selling:** Data never sold to third parties
- **User Control:** Users can delete all data anytime

### Error Handling
- **File:** `server/routes/strava.js`
- Enhanced error messages for auth failures
- Proper HTTP status codes (401 for auth errors)
- User-friendly error messages

---

## Testing Checklist

### Visual Tests
- [ ] Strava attribution visible in sidebar
- [ ] Strava attribution visible on Settings page
- [ ] Privacy Policy page loads correctly
- [ ] Terms of Service page loads correctly
- [ ] Links work from sidebar footer

### Functional Tests
- [ ] Rate limiting prevents excessive requests
- [ ] Rate limit counters reset correctly
- [ ] Error shown when daily limit reached
- [ ] Strava connection shows attribution
- [ ] Privacy/Terms pages are accessible

### Compliance Tests
- [ ] "Powered by Strava" visible when using Strava data
- [ ] No more than 100 requests per 15 minutes
- [ ] No more than 1000 requests per day
- [ ] Privacy policy links to Strava's policy
- [ ] Terms mention Strava's terms

---

## Files Modified/Created

### Created Files
1. `src/components/StravaAttribution.jsx` - Attribution component
2. `src/pages/PrivacyPolicy.jsx` - Privacy policy page
3. `src/pages/TermsOfService.jsx` - Terms of service page
4. `STRAVA_COMPLIANCE.md` - This documentation

### Modified Files
1. `src/components/Layout.jsx` - Added attribution to footer
2. `src/pages/Settings.jsx` - Added attribution to Strava connection
3. `server/services/stravaService.js` - Added rate limiting
4. `server/routes/strava.js` - Enhanced error handling
5. `src/App.jsx` - Added routes for Privacy and Terms pages

---

## Strava API Agreement Compliance Summary

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Display Strava branding | ✅ Complete | StravaAttribution component in Layout & Settings |
| Respect rate limits | ✅ Complete | Rate limiting in stravaService.js |
| Link to Strava's privacy policy | ✅ Complete | Privacy Policy page includes link |
| Don't misrepresent data source | ✅ Complete | Clear "Powered by Strava" attribution |
| Don't sell user data | ✅ Complete | Stated in Privacy Policy |
| Secure token storage | ✅ Complete | OAuth 2.0, encrypted storage |
| User can revoke access | ✅ Complete | Disconnect button in Settings |
| Comply with Strava ToS | ✅ Complete | Mentioned in Terms of Service |

---

## Future Recommendations

### Optional Enhancements
1. **Rate Limit Dashboard**
   - Show users their current API usage
   - Display remaining requests

2. **Strava Status Page**
   - Show Strava API status
   - Alert users to Strava outages

3. **Enhanced Attribution**
   - Add "Connect with Strava" button with official styling
   - Use official Strava button assets

4. **Analytics**
   - Track API usage patterns
   - Optimize request batching

---

## Support & Maintenance

### Monitoring
- Check Strava API changelog for policy updates
- Monitor rate limit usage in production
- Review user feedback on data privacy

### Updates
- Update Privacy Policy when adding new features
- Update Terms when changing service offerings
- Keep Strava branding current with their guidelines

---

## References

- [Strava API Agreement](https://developers.strava.com/docs/getting-started/)
- [Strava Brand Guidelines](https://www.strava.com/about/brand)
- [Strava Privacy Policy](https://www.strava.com/legal/privacy)
- [Strava Terms of Service](https://www.strava.com/legal/terms)

---

**Implementation Complete** ✅  
**Compliance Status:** GOOD  
**Last Updated:** 2025-10-03
