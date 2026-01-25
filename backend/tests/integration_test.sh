#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:8080"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test.user${TIMESTAMP}@giki.edu.pk"
TEST_PASSWORD="SecurePassword123!"
TEST_PHONE="0300${TIMESTAMP: -7}"  # Generate unique phone number

echo -e "${YELLOW}=== GIKI Wallet Auth Flow Integration Tests ===${NC}\n"

# Function to make HTTP requests and check response
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_code="$5"
    
    echo -e "${YELLOW}Testing: $name${NC}"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        echo ""
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_code, got $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        echo ""
        return 1
    fi
}

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}\n"
        break
    fi
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    exit 1
fi

# Test counters
PASSED=0
FAILED=0

# ============================================================================
# TEST 1: Register Student User
# ============================================================================
echo -e "${YELLOW}=== Test 1: Register Student User ===${NC}"
REG_ID="2024-CS-${TIMESTAMP: -3}"
if test_endpoint "Register Student" "POST" "/auth/register" \
    "{\"name\":\"Test Student\",\"email\":\"$TEST_EMAIL\",\"user_type\":\"student\",\"reg_id\":\"$REG_ID\",\"password\":\"$TEST_PASSWORD\",\"phone_number\":\"$TEST_PHONE\"}" \
    201; then
    
    # Check for Email Job
    echo -e "${YELLOW}Verifying Email Job Creation...${NC}"
    JOB_CHECK=$(docker-compose exec -T db psql -U giki -d giki_wallet_db -c "SELECT COUNT(*) FROM giki_wallet.jobs WHERE job_type = 'SEND_STUDENT_VERIFY_EMAIL' AND payload->>'email' = '$TEST_EMAIL';" -t | xargs)
    
    if [ "$JOB_CHECK" -eq "1" ]; then
        echo -e "${GREEN}✓ Job Created for Student Verification${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ Job NOT Created${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# TEST 2: Login with Registered User
# ============================================================================
echo -e "${YELLOW}=== Test 2: Login with Registered Credentials ===${NC}"
LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "$BASE_URL/auth/signin")

if echo "$LOGIN_RESPONSE" | jq -e '.auth.access_token' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC} (Login successful)"
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.auth.access_token')
    echo "Access Token: ${ACCESS_TOKEN:0:30}..."
    echo "$LOGIN_RESPONSE" | jq '.'
    echo ""
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAILED${NC} (Login failed)"
    echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
    echo ""
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# TEST 3: Register Employee User
# ============================================================================
echo -e "${YELLOW}=== Test 3: Register Employee User ===${NC}"
EMPLOYEE_EMAIL="employee.$(date +%s)@giki.edu.pk"
EMPLOYEE_PHONE="0312$(date +%s | tail -c 7)"
if test_endpoint "Register Employee" "POST" "/auth/register" \
    "{\"name\":\"Test Employee\",\"email\":\"$EMPLOYEE_EMAIL\",\"user_type\":\"employee\",\"password\":\"$TEST_PASSWORD\",\"phone_number\":\"$EMPLOYEE_PHONE\"}" \
    201; then

    # Check for Email Job
    echo -e "${YELLOW}Verifying Email Job Creation...${NC}"
    JOB_CHECK=$(docker-compose exec -T db psql -U giki -d giki_wallet_db -c "SELECT COUNT(*) FROM giki_wallet.jobs WHERE job_type = 'SEND_EMPLOYEE_WAIT_EMAIL' AND payload->>'email' = '$EMPLOYEE_EMAIL';" -t | xargs)
    
    if [ "$JOB_CHECK" -eq "1" ]; then
        echo -e "${GREEN}✓ Job Created for Employee Verification${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ Job NOT Created${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# TEST 4: Invalid Email Domain
# ============================================================================
echo -e "${YELLOW}=== Test 4: Reject Invalid Email Domain ===${NC}"
if test_endpoint "Invalid Email Domain" "POST" "/auth/register" \
    "{\"name\":\"Test User\",\"email\":\"test@gmail.com\",\"user_type\":\"student\",\"reg_id\":\"2024-CS-002\",\"password\":\"$TEST_PASSWORD\",\"phone_number\":\"03001234567\"}" \
    403; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# TEST 5: Student Missing RegID
# ============================================================================
echo -e "${YELLOW}=== Test 5: Reject Student Without RegID ===${NC}"
if test_endpoint "Missing RegID" "POST" "/auth/register" \
    "{\"name\":\"Test Student\",\"email\":\"student.$(date +%s)@giki.edu.pk\",\"user_type\":\"student\",\"password\":\"$TEST_PASSWORD\",\"phone_number\":\"03001234567\"}" \
    400; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# TEST 6: Invalid User Type
# ============================================================================
echo -e "${YELLOW}=== Test 6: Reject Invalid User Type ===${NC}"
if test_endpoint "Invalid User Type" "POST" "/auth/register" \
    "{\"name\":\"Test User\",\"email\":\"invalid.$(date +%s)@giki.edu.pk\",\"user_type\":\"admin\",\"password\":\"$TEST_PASSWORD\",\"phone_number\":\"03001234567\"}" \
    400; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# TEST 7: Login with Non-Existent User
# ============================================================================
echo -e "${YELLOW}=== Test 7: Reject Non-Existent User ===${NC}"
if test_endpoint "Non-Existent User" "POST" "/auth/signin" \
    "{\"email\":\"nonexistent@giki.edu.pk\",\"password\":\"$TEST_PASSWORD\"}" \
    404; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# TEST 8: Login with Wrong Password
# ============================================================================
echo -e "${YELLOW}=== Test 8: Reject Wrong Password ===${NC}"
if test_endpoint "Wrong Password" "POST" "/auth/signin" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"WrongPassword123!\"}" \
    401; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# TEST 9: Missing Required Fields
# ============================================================================
echo -e "${YELLOW}=== Test 9: Reject Missing Fields ===${NC}"
if test_endpoint "Missing Password" "POST" "/auth/signin" \
    "{\"email\":\"$TEST_EMAIL\"}" \
    400; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# TEST 10: Invalid JSON
# ============================================================================
echo -e "${YELLOW}=== Test 10: Reject Invalid JSON ===${NC}"
if test_endpoint "Invalid JSON" "POST" "/auth/signin" \
    "{\"email\":\"test@giki.edu.pk\",\"password\":" \
    400; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi

# ============================================================================
# Summary
# ============================================================================
echo -e "\n${YELLOW}=== Test Summary ===${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
TOTAL=$((PASSED + FAILED))
echo -e "Total:  $TOTAL"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
