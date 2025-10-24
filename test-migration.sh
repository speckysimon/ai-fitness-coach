#!/bin/bash

# Database Migration Test Script
# Tests all new API endpoints to verify migration is working

echo "🧪 Testing Database Migration Endpoints"
echo "========================================"
echo ""

BASE_URL="http://localhost:5001"
TEST_USER_ID=1

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Response: $body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "1. Testing Health Check"
echo "----------------------"
test_endpoint "Health Check" "GET" "/api/health"
echo ""

echo "2. Testing Training Plan Endpoints"
echo "-----------------------------------"

# Test saving a plan
PLAN_DATA='{
  "userId": 1,
  "planData": {
    "weeks": [{"weekNumber": 1, "sessions": []}],
    "goals": "Test plan",
    "eventType": "Endurance"
  },
  "eventType": "Endurance",
  "durationWeeks": 12,
  "daysPerWeek": 5,
  "maxHoursPerWeek": 10,
  "goals": "Test plan",
  "generatedAt": "2025-10-24T18:00:00.000Z"
}'

test_endpoint "Save Training Plan" "POST" "/api/training/plan" "$PLAN_DATA"

# Test loading a plan
test_endpoint "Load Training Plan" "GET" "/api/training/plan/$TEST_USER_ID"

echo ""

echo "3. Testing Race Analysis Endpoints"
echo "-----------------------------------"

# Test saving a race analysis
ANALYSIS_DATA='{
  "userId": 1,
  "activityId": "test123",
  "raceName": "Test Race",
  "raceDate": "2025-10-24",
  "raceType": "Road Race",
  "overallScore": 85,
  "pacingScore": 80,
  "executionScore": 90,
  "tacticalScore": 85,
  "analysisData": {
    "feedback": {"overallFeeling": 4},
    "scores": {"overall": 85, "pacing": 80, "execution": 90, "tactical": 85}
  }
}'

test_endpoint "Save Race Analysis" "POST" "/api/race/analysis" "$ANALYSIS_DATA"

# Test loading analyses
test_endpoint "Load Race Analyses" "GET" "/api/race/analyses/$TEST_USER_ID"

echo ""

echo "4. Testing User Preferences Endpoints"
echo "--------------------------------------"

# Test saving preferences
PREFS_DATA='{
  "ftp": 250,
  "timezone": "Europe/Paris",
  "theme": "system"
}'

test_endpoint "Save User Preferences" "PUT" "/api/user/preferences/$TEST_USER_ID" "$PREFS_DATA"

# Test loading preferences
test_endpoint "Load User Preferences" "GET" "/api/user/preferences/$TEST_USER_ID"

# Test updating single field
FIELD_DATA='{"value": 260}'
test_endpoint "Update FTP Field" "PATCH" "/api/user/preferences/$TEST_USER_ID/ftp" "$FIELD_DATA"

echo ""
echo "========================================"
echo "📊 Test Results"
echo "========================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Migration is working correctly.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Check the output above.${NC}"
    exit 1
fi
