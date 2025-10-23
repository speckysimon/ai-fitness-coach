# Weather Integration Proposal

## Overview
Integrate live weather data into the AI Training Coach to provide weather-aware training recommendations and automatic plan adjustments based on weather conditions.

## User Profile Location Setting

### Implementation
1. **Add Location Field to User Profile**
   - Add a location field in the user settings/profile page
   - Store location as city name or coordinates (lat/long)
   - Allow users to update their location at any time

2. **Database Schema Update**
   ```sql
   ALTER TABLE users ADD COLUMN location_city VARCHAR(255);
   ALTER TABLE users ADD COLUMN location_lat DECIMAL(10, 8);
   ALTER TABLE users ADD COLUMN location_lon DECIMAL(11, 8);
   ```

## Weather API Integration

### Recommended Weather API
**OpenWeatherMap API** (Free tier available)
- **Free Tier**: 1,000 calls/day, 60 calls/minute
- **Data Available**:
  - Current weather conditions
  - 5-day forecast (3-hour intervals)
  - Temperature, humidity, wind speed/direction
  - Precipitation probability
  - Weather conditions (rain, snow, clear, etc.)

**Alternative**: WeatherAPI.com (also has generous free tier)

### API Integration Points

1. **Backend Weather Service** (`/api/weather`)
   ```javascript
   // GET /api/weather/current
   // Returns current weather for user's location
   
   // GET /api/weather/forecast?days=7
   // Returns forecast for next N days
   ```

2. **Caching Strategy**
   - Cache weather data for 30 minutes to minimize API calls
   - Store in Redis or in-memory cache
   - Invalidate cache on user location change

## AI Coach Weather Integration

### 1. Weather-Aware Plan Adjustments

**Scenarios for Automatic Adjustments:**

- **Extreme Heat** (>30°C/86°F)
  - Suggest moving outdoor workouts to early morning/evening
  - Reduce intensity for outdoor sessions
  - Recommend indoor alternatives (Zwift, trainer)
  - Add hydration reminders

- **Heavy Rain/Storms**
  - Suggest indoor alternatives
  - Reschedule outdoor sessions to better weather windows
  - Recommend trainer workouts

- **Strong Winds** (>30 km/h)
  - Adjust route recommendations
  - Modify power/pace targets
  - Suggest sheltered routes

- **Extreme Cold** (<0°C/32°F)
  - Recommend indoor alternatives
  - Suggest appropriate gear
  - Adjust warm-up duration

- **Poor Air Quality** (if API provides AQI)
  - Recommend indoor training
  - Reduce intensity for outdoor sessions

### 2. UI Components

**Weather Widget in AI Training Coach Card**
```jsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Cloud className="w-5 h-5 text-blue-600" />
      <div>
        <p className="text-sm font-medium text-blue-900">
          Current: 22°C, Partly Cloudy
        </p>
        <p className="text-xs text-blue-700">
          Great conditions for outdoor training!
        </p>
      </div>
    </div>
  </div>
</div>
```

**Weather-Based Recommendations**
```jsx
{weatherAlert && (
  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
    <p className="text-sm text-orange-900 font-medium mb-1">
      ⚠️ Weather Alert
    </p>
    <p className="text-sm text-orange-800">
      Heavy rain expected this afternoon. Consider moving your 
      outdoor ride to the trainer.
    </p>
  </div>
)}
```

### 3. Enhanced AI Prompt Context

When user submits a prompt or triggers analysis, include weather context:

```javascript
const weatherContext = {
  current: {
    temp: 22,
    condition: 'partly_cloudy',
    windSpeed: 15,
    precipitation: 0
  },
  forecast: [
    { date: '2025-10-18', temp: 24, condition: 'sunny', precipProb: 10 },
    { date: '2025-10-19', temp: 18, condition: 'rain', precipProb: 80 },
    // ... next 5-7 days
  ]
};

// Include in AI analysis request
body: JSON.stringify({
  recentActivities: [],
  currentPlan: plan,
  currentFitness: { ctl: 0, atl: 0, tsb: 0 },
  upcomingRaces: [],
  userPrompt: coachPrompt,
  weatherContext: weatherContext // Add weather data
})
```

### 4. AI Prompt Enhancement

The AI will receive weather context and can provide responses like:

**User**: "I have a 2-hour ride planned for tomorrow"

**AI Response** (with weather context):
"I see you have a 2-hour endurance ride planned for tomorrow. However, the forecast shows heavy rain (80% probability) with temperatures around 18°C. I recommend:

1. **Option A**: Move the ride to today (sunny, 24°C) and swap with tomorrow's recovery session
2. **Option B**: Convert to an indoor trainer session with the same TSS target
3. **Option C**: Postpone to Sunday when conditions improve

Which would you prefer?"

## Implementation Phases

### Phase 1: Basic Weather Display (Week 1)
- Add location field to user profile
- Integrate weather API
- Display current weather in AI Coach card
- Cache weather data

### Phase 2: Weather Alerts (Week 2)
- Implement weather condition detection
- Show alerts for extreme conditions
- Suggest indoor/outdoor alternatives

### Phase 3: AI Integration (Week 3)
- Pass weather context to AI analysis
- Update AI prompts to consider weather
- Generate weather-aware recommendations

### Phase 4: Advanced Features (Week 4+)
- Historical weather correlation with performance
- Optimal training time suggestions based on forecast
- Route recommendations based on wind direction
- Gear recommendations based on temperature

## Technical Considerations

### Security
- Store API keys in environment variables
- Never expose API keys to frontend
- Implement rate limiting on weather endpoints

### Privacy
- Make location optional
- Allow users to set approximate location (city-level)
- Don't store precise GPS coordinates unless necessary

### Performance
- Implement aggressive caching (30-60 min)
- Use background jobs to pre-fetch weather for active users
- Lazy load weather widget (don't block page load)

### Error Handling
- Graceful degradation if weather API is unavailable
- Show cached data with timestamp
- Don't block training plan adjustments if weather unavailable

## Cost Estimation

**OpenWeatherMap Free Tier:**
- 1,000 calls/day = ~40 calls/hour
- If 100 active users, ~2.4 calls/user/day (with 30-min caching)
- **Sufficient for MVP and small user base**

**Paid Tier** (if needed later):
- $40/month for 100,000 calls/month
- Supports ~3,300 calls/day
- Sufficient for ~1,000 active users

## Dependencies

```json
{
  "axios": "^1.6.0",  // For API calls
  "node-cache": "^5.1.2"  // For in-memory caching
}
```

## Example API Endpoints

### Backend Routes
```javascript
// routes/weather.js
router.get('/current', authenticateToken, async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user.location_lat || !user.location_lon) {
    return res.status(400).json({ error: 'Location not set' });
  }
  
  const weather = await getWeather(user.location_lat, user.location_lon);
  res.json(weather);
});

router.get('/forecast', authenticateToken, async (req, res) => {
  const days = req.query.days || 5;
  const user = await getUserById(req.user.id);
  const forecast = await getForecast(user.location_lat, user.location_lon, days);
  res.json(forecast);
});
```

## UI Icons Needed

From lucide-react:
- `Cloud` - General weather
- `CloudRain` - Rainy conditions
- `CloudSnow` - Snow
- `Sun` - Sunny/clear
- `Wind` - Windy conditions
- `Thermometer` - Temperature
- `Droplets` - Humidity/precipitation

## Success Metrics

1. **User Engagement**
   - % of users who set their location
   - Weather widget interaction rate
   - Weather-based plan adjustments accepted

2. **Training Quality**
   - Reduction in missed workouts due to weather
   - Increase in indoor/outdoor workout swaps
   - User satisfaction with weather-aware recommendations

3. **Technical**
   - API response time < 200ms (with caching)
   - Cache hit rate > 90%
   - Zero weather-related errors blocking core features
