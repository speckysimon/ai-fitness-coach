# API Documentation

This document describes the backend API endpoints for AI Fitness Coach.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication tokens from Strava or Google. These are passed as query parameters or in the request body.

---

## Strava Endpoints

### Get Strava Auth URL

Get the URL to initiate Strava OAuth flow.

**Endpoint**: `GET /strava/auth`

**Response**:
```json
{
  "authUrl": "https://www.strava.com/oauth/authorize?client_id=..."
}
```

### Strava OAuth Callback

Handle Strava OAuth callback (automatically called by Strava).

**Endpoint**: `GET /strava/callback?code={code}`

**Response**:
```json
{
  "success": true,
  "tokens": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_at": 1234567890
  },
  "athlete": {
    "id": 12345,
    "username": "athlete",
    "firstname": "John",
    "lastname": "Doe"
  }
}
```

### Get Activities

Fetch athlete activities from Strava.

**Endpoint**: `GET /strava/activities`

**Query Parameters**:
- `access_token` (required): Strava access token
- `before` (optional): Unix timestamp, activities before this time
- `after` (optional): Unix timestamp, activities after this time
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Results per page (default: 30, max: 200)

**Response**:
```json
[
  {
    "id": 123456789,
    "name": "Morning Ride",
    "type": "Ride",
    "sport_type": "Ride",
    "date": "2025-09-30T06:00:00Z",
    "duration": 3600,
    "distance": 30000,
    "elevation": 500,
    "avgHeartRate": 145,
    "maxHeartRate": 175,
    "avgPower": 200,
    "maxPower": 450,
    "normalizedPower": 210,
    "kilojoules": 720,
    "avgSpeed": 8.33,
    "maxSpeed": 15.5,
    "calories": 800,
    "sufferScore": 85,
    "trainer": false,
    "commute": false
  }
]
```

### Get Activity Details

Fetch detailed information for a specific activity.

**Endpoint**: `GET /strava/activities/:id`

**Query Parameters**:
- `access_token` (required): Strava access token

**Response**: Same as activity object above with additional details.

### Get Athlete Stats

Fetch athlete statistics from Strava.

**Endpoint**: `GET /strava/athlete/stats`

**Query Parameters**:
- `access_token` (required): Strava access token
- `athlete_id` (required): Athlete ID

**Response**: Strava athlete stats object.

---

## Google Calendar Endpoints

### Get Google Auth URL

Get the URL to initiate Google OAuth flow.

**Endpoint**: `GET /google/auth`

**Response**:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### Google OAuth Callback

Handle Google OAuth callback.

**Endpoint**: `GET /google/callback?code={code}`

**Response**:
```json
{
  "success": true,
  "tokens": {
    "access_token": "...",
    "refresh_token": "...",
    "scope": "https://www.googleapis.com/auth/calendar",
    "token_type": "Bearer",
    "expiry_date": 1234567890
  }
}
```

### Create Calendar Event

Create a single calendar event.

**Endpoint**: `POST /google/calendar/events`

**Request Body**:
```json
{
  "tokens": {
    "access_token": "...",
    "refresh_token": "..."
  },
  "event": {
    "title": "Morning Ride",
    "description": "Easy endurance ride in Zone 2",
    "startTime": "2025-10-01T07:00:00Z",
    "endTime": "2025-10-01T08:30:00Z",
    "timeZone": "America/New_York",
    "calendarId": "primary"
  }
}
```

**Response**: Google Calendar event object.

### Batch Create Calendar Events

Create multiple calendar events at once.

**Endpoint**: `POST /google/calendar/events/batch`

**Request Body**:
```json
{
  "tokens": {
    "access_token": "...",
    "refresh_token": "..."
  },
  "events": [
    {
      "title": "Morning Ride",
      "description": "Easy endurance ride",
      "startTime": "2025-10-01T07:00:00Z",
      "endTime": "2025-10-01T08:30:00Z",
      "timeZone": "America/New_York"
    }
  ]
}
```

**Response**: Array of created event objects.

### Get Calendar Events

Fetch calendar events within a time range.

**Endpoint**: `GET /google/calendar/events`

**Query Parameters**:
- `tokens` (required): JSON string of Google tokens
- `timeMin` (optional): ISO 8601 timestamp
- `timeMax` (optional): ISO 8601 timestamp

**Response**: Array of Google Calendar event objects.

---

## Training Plan Endpoints

### Generate Training Plan

Generate an AI-powered training plan.

**Endpoint**: `POST /training/plan/generate`

**Request Body**:
```json
{
  "activities": [...],
  "goals": {
    "eventName": "Spring Century",
    "eventDate": "2025-05-15",
    "eventType": "Endurance",
    "priority": "High",
    "duration": 8
  },
  "constraints": {
    "daysPerWeek": 5,
    "maxHoursPerWeek": 10,
    "preference": "Both"
  },
  "currentMetrics": {
    "ftp": 250
  }
}
```

**Response**:
```json
{
  "planSummary": "8-week progressive endurance plan...",
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "Base Building",
      "totalHours": 8,
      "sessions": [
        {
          "day": "Monday",
          "type": "Recovery",
          "duration": 60,
          "title": "Easy Spin",
          "description": "Light recovery ride in Zone 1-2",
          "targets": "Zone 1-2, <65% FTP",
          "indoor": false,
          "date": "2025-10-01T00:00:00Z",
          "dateFormatted": "2025-10-01"
        }
      ]
    }
  ],
  "notes": "Focus on consistency and building aerobic base...",
  "generatedAt": "2025-09-30T21:00:00Z",
  "goals": {...}
}
```

### Adapt Training Plan

Adapt an existing plan based on completed activities.

**Endpoint**: `POST /training/plan/adapt`

**Request Body**:
```json
{
  "currentPlan": {...},
  "completedActivities": [...],
  "upcomingActivities": [...]
}
```

**Response**:
```json
{
  "analysis": "You've completed 4 of 5 planned sessions this week...",
  "recommendations": [
    {
      "sessionId": "week2-day3",
      "originalPlan": "90min Tempo",
      "adaptation": "Reduce to 75min Tempo",
      "reason": "Accumulated fatigue from weekend rides"
    }
  ]
}
```

### Recommend Session

Get a detailed session recommendation.

**Endpoint**: `POST /training/session/recommend`

**Request Body**:
```json
{
  "recentActivities": [...],
  "targetType": "Threshold",
  "constraints": {
    "duration": 60,
    "location": "Indoor"
  }
}
```

**Response**:
```json
{
  "title": "FTP Intervals",
  "duration": 60,
  "description": "Classic threshold interval session...",
  "structure": [
    {
      "phase": "Warm-up",
      "duration": 10,
      "intensity": "Easy"
    },
    {
      "phase": "Main Set",
      "duration": 40,
      "intensity": "4x8min @ FTP with 4min recovery"
    },
    {
      "phase": "Cool-down",
      "duration": 10,
      "intensity": "Easy"
    }
  ],
  "keyPoints": [
    "Focus on smooth pedaling",
    "Stay seated during intervals",
    "Monitor heart rate drift"
  ]
}
```

---

## Analytics Endpoints

### Calculate FTP

Calculate estimated FTP from activities.

**Endpoint**: `POST /analytics/ftp`

**Request Body**:
```json
{
  "activities": [...]
}
```

**Response**:
```json
{
  "ftp": 250
}
```

### Calculate Training Load

Calculate training load metrics.

**Endpoint**: `POST /analytics/load`

**Request Body**:
```json
{
  "activities": [...],
  "ftp": 250
}
```

**Response**:
```json
{
  "currentWeek": {
    "tss": 450,
    "time": 8,
    "distance": 200,
    "elevation": 1500,
    "activities": 5
  },
  "fourWeekAverage": {
    "tss": 400,
    "time": 7
  },
  "loadRatio": 1.13
}
```

### Get Weekly Summary

Get summary for a specific week.

**Endpoint**: `POST /analytics/weekly-summary`

**Request Body**:
```json
{
  "activities": [...],
  "weekStart": "2025-09-30"
}
```

**Response**:
```json
{
  "weekStart": "2025-09-30T00:00:00Z",
  "weekEnd": "2025-10-06T23:59:59Z",
  "totalActivities": 5,
  "totalTime": 8,
  "totalDistance": 200,
  "totalElevation": 1500,
  "byType": {
    "Ride": {
      "count": 4,
      "time": 7200,
      "distance": 180000
    },
    "Run": {
      "count": 1,
      "time": 1800,
      "distance": 10000
    }
  }
}
```

### Get Trends

Get trend analysis over multiple weeks.

**Endpoint**: `POST /analytics/trends`

**Request Body**:
```json
{
  "activities": [...],
  "weeks": 6
}
```

**Response**:
```json
[
  {
    "week": "2025-09-02",
    "activities": 4,
    "time": 7,
    "distance": 180,
    "elevation": 1200
  },
  {
    "week": "2025-09-09",
    "activities": 5,
    "time": 8,
    "distance": 200,
    "elevation": 1500
  }
]
```

---

## Health Check

### Server Health

Check if the server is running.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-09-30T21:00:00Z"
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing or invalid parameters)
- `401`: Unauthorized (missing or invalid tokens)
- `500`: Internal Server Error

---

## Rate Limiting

Be mindful of rate limits from external APIs:
- **Strava**: 100 requests per 15 minutes, 1000 per day
- **OpenAI**: Depends on your plan
- **Google Calendar**: 1,000,000 requests per day

---

## Notes

- All timestamps are in ISO 8601 format
- Distances are in meters
- Durations are in seconds
- Power is in watts
- Heart rate is in beats per minute
- Elevation is in meters
