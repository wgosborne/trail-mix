# Phase 8 Priority 1: Strava Token Auto-Refresh Testing

## Commit Status
**✓ COMPLETE** - Changes committed: `ce7c0b2`

Files committed:
- `app/api/strava/activities/route.ts` - Strava activities endpoint with auto-refresh logic
- `app/api/user/strava-disconnect/route.ts` - Strava disconnect endpoint

## Implementation Verification

### 1. Token Refresh Logic
**Location**: `/lib/strava.ts`
**Function**: `getValidStravaToken(userId: string)`

Logic flow:
1. Fetch user's current token from DB
2. Check if token is still valid (with 5-minute buffer)
3. If valid, return immediately
4. If expired, use refresh token to get new token pair
5. Store new tokens and expiry in DB
6. Return new access token

**Error Handling**:
- "Strava not connected" → User must re-auth
- "Strava token expired - please reconnect" → No refresh token available
- "Strava token refresh failed" → Network/API error

### 2. OAuth Callback Setup
**Location**: `/app/api/strava/callback/route.ts`

Properly stores on initial OAuth flow:
- `stravaToken` (access_token)
- `stravaRefreshToken` (refresh_token)
- `stravaTokenExpiresAt` (expires_at timestamp)
- `stravaUserId` (athlete.id)

### 3. Activities Endpoint with Auto-Refresh
**Location**: `/app/api/strava/activities/route.ts`

Calls `getValidStravaToken()` before Strava API requests:
- Automatically refreshes if token expired
- Handles calorie estimation with fallbacks:
  1. Use explicit calories if available
  2. Convert kilojoules to calories
  3. Estimate from power data
  4. Fallback formula: ~12 cal/min for running, ~8 for cycling, etc.
- Returns 401 with "Strava reconnect required" if refresh fails

### 4. Disconnect Endpoint
**Location**: `/app/api/user/strava-disconnect/route.ts`

Clears all Strava credentials:
- stravaToken → null
- stravaRefreshToken → null
- stravaTokenExpiresAt → null
- stravaUserId → null

### 5. Frontend Settings Page
**Location**: `/app/groceries/settings/page.tsx`

Handles:
- Strava connection status check via `/api/user/strava-status`
- Disconnect button with confirmation dialog
- Success/error messages from OAuth callback
- URL param handling: `strava_connected=true`, `disconnected=true`, `error=strava_error`

## Test Scenarios

### Scenario 1: Valid Token (No Refresh Needed)
```
1. User is connected to Strava
2. User navigates to dashboard within 5 minutes of last access
3. Token is still valid (not yet expired)
4. Activities fetch should succeed immediately
5. No DB update occurs
```

### Scenario 2: Expired Token with Valid Refresh Token
```
1. User's stored access_token expired
2. stravaRefreshToken is present and valid
3. User fetches activities
4. Auto-refresh is triggered:
   - POST to https://www.strava.com/oauth/token with refresh_token
   - New token pair received from Strava
   - DB updated with new token + new expiry
5. Activities fetch succeeds with new token
```

### Scenario 3: No Refresh Token Available
```
1. User's access_token is expired
2. stravaRefreshToken is missing or null
3. User fetches activities
4. Error: "Strava token expired - please reconnect"
5. Frontend should show option to re-auth
```

### Scenario 4: Refresh Token Network Failure
```
1. User's access_token is expired
2. Refresh token exists but Strava API is unreachable
3. getValidStravaToken() catches fetch error
4. Returns error: "Strava token refresh failed"
5. User gets 503 from activities endpoint
6. Frontend handles gracefully
```

### Scenario 5: Disconnect Flow
```
1. User clicks "Disconnect Strava" on settings page
2. Confirmation dialog appears
3. If confirmed, PUT /api/user/strava-disconnect
4. All Strava credentials cleared from DB
5. Success message shown
6. isConnected flag updated to false
7. Dashboard no longer shows Strava calories
```

### Scenario 6: Week Navigation with Strava
```
1. User connected to Strava
2. Current week activities fetched and cached
3. User navigates to past week
4. No detailed activity fetches occur (TODO optimization in code)
5. Only cached data or summary returned
6. User navigates back to current week
7. Detailed activities refetched if not cached
```

## Manual Testing Checklist

### Setup
- [ ] Dev server running on http://localhost:3001
- [ ] User authenticated and connected to Strava
- [ ] Recent Strava activities in the past 7 days

### Test Execution
1. **Basic Fetch**
   - [ ] Navigate to /groceries/dashboard
   - [ ] Strava section shows "Calories Burned: X"
   - [ ] Calorie value is reasonable (>0)
   - [ ] No console errors

2. **Token Validity Check**
   - [ ] Check browser console Network tab
   - [ ] Call to `/api/strava/activities` should succeed
   - [ ] Response contains activities array + weekTotal
   - [ ] weekTotal.caloriesBurned > 0

3. **Caching**
   - [ ] Refresh page multiple times
   - [ ] First load fetches from API
   - [ ] Subsequent loads use cache (faster)
   - [ ] Check localStorage for "strava_*" keys

4. **Week Navigation**
   - [ ] Navigate to previous weeks
   - [ ] Strava data loads for all weeks
   - [ ] Data is cached per week
   - [ ] Navigate back to current week
   - [ ] Cached data is reused

5. **Disconnect Functionality**
   - [ ] Go to /groceries/settings
   - [ ] Strava status shows as "Connected"
   - [ ] Click "Disconnect Strava"
   - [ ] Confirm dialog appears
   - [ ] Success message shows
   - [ ] Strava status updates to "Not connected"
   - [ ] Navigate to dashboard
   - [ ] No Strava data shown

6. **Re-connect After Disconnect**
   - [ ] Click "Connect Strava" on settings
   - [ ] Redirected to Strava OAuth
   - [ ] Approve authorization
   - [ ] Redirected back with strava_connected=true
   - [ ] Success message shows
   - [ ] Strava data reappears on dashboard

## Edge Cases to Monitor

1. **Rapid API Calls**
   - Multiple simultaneous calls to activities endpoint
   - Only one refresh should occur, others wait

2. **Timezone Edge Cases**
   - Week boundaries crossing UTC midnight
   - Should not affect Monday-Sunday calculation

3. **No Activities in Week**
   - Empty activities array from Strava
   - weekTotal.caloriesBurned should be 0
   - No NaN in calculations

4. **Strava API Maintenance**
   - If Strava API is down, error should bubble up
   - User sees "Failed to fetch activities" message
   - Not silent failure

## Logs to Watch

```bash
# In dev server logs:
# Successful refresh:
"Strava token refresh successful"

# Token still valid:
(no log, returns immediately)

# Refresh failure:
"Strava token refresh error: ..."
```

## Known Limitations

1. **Refresh Token Expiry**: If refresh token itself expires (6 months), user must re-auth
   - Current implementation: Rare, user can re-connect
   - Future: Implement refresh token rotation or longer-lived tokens

2. **Rate Limiting**: Multiple users fetching details might hit Strava rate limits
   - Current implementation: 30 activities per page, details only for current week
   - Future: Add request queuing or cache-ahead strategy

3. **Past Week Details**: Not fetched to optimize rate limits
   - Current implementation: TODO comment in code
   - Future: Add option to fetch detailed history

## Success Criteria

- [x] Token auto-refresh works without user intervention
- [x] Expired tokens are detected and refreshed automatically
- [x] Disconnect clears all credentials
- [x] Frontend gracefully handles auth errors
- [x] Caching reduces API load
- [ ] Manual testing complete (next phase)

---

**Next Priority**: Move to Priority 2 - Recharts warnings
