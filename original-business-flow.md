# Binary Placement Rule - User Creation Flow

## Overview

The user creation process establishes new members in the MLM system with proper sponsor relationships and binary tree placement validation.

## Business Logic Flow

### 1. User Registration Requirements

When creating a new user, the following information is required:

- **Username**: Unique identifier for the new user
- **Password**: Account security credentials
- **Sponsor Name**: The person who recruited this new user
- **Placement Name**: The person under whom this user will be placed in the binary tree
- **Position**: Either "L" (left) or "R" (right) position under the placement person
- **Request User ID**: The person making the registration request (must be authorized)

### 2. Sponsor Validation Rules

Before a user can sponsor someone new, several conditions must be met:

**Sponsor Must Exist and Be Active**

- The sponsor must be a valid user in the system
- The sponsor must be activated (have at least one active placement)
- Inactive sponsors cannot recruit new members

**Authorization Verification**

- The person requesting the registration must be in the sponsor's upline hierarchy
- This prevents unauthorized user creation by ensuring only qualified uplines can create accounts

### 3. Placement Validation Rules

The binary tree placement follows strict business rules:

**Placement Position Availability**

- The requested position (left or right) under the placement person must be empty
- If the position is already occupied, the registration fails

**Placement Person Requirements**

- The placement person must exist in the system
- The placement person must be activated (except for node 4 positions)

**Sponsor-Placement Relationship**

- The placement person must be somewhere in the sponsor's downline hierarchy
- This ensures sponsors can only place their recruits within their own network

### 4. User Creation Process

Once all validations pass, the system creates the new user:

**Account Setup**

- Creates user account with provided credentials
- Links the user to their sponsor
- Records the placement person and position
- Sets initial sponsor status as inactive (until first top-up/package purchase), only can sponsor user after first top-up

**Relationship Building**

- Updates sponsor's total recruit count
- Builds upline relationships for both sponsor hierarchy and placement hierarchy
- Updates community size counts throughout the upline chain

### 5. Network Updates

After successful user creation, the system automatically:

**Sponsor Network Updates**

- Increases the sponsor's total sponsored user count
- Updates sponsor size throughout the sponsor's upline chain
- Records the new relationship in the user-uplines table

**Placement Network Updates**

- Records placement relationships in the placement-uplines table
- Updates community size counts in the placement upline chain

## Technical Flow

Pairing - Create User - Technical Flow

---

# Top Up & Ranking Change Rule - Package Purchase Flow

## Overview

The package purchase process allows users to buy packages for their placements, which activates nodes, increases earning capacity, and potentially upgrades rankings in the MLM system.

## Business Logic Flow

### 1. Package Purchase Requirements

To purchase a package, the following conditions must be met:

**Basic Purchase Information**

- **Buyer ID**: The person paying for the package (must have sufficient wallet balance)
- **Placement ID**: The specific placement node where the package will be applied
- **Package ID**: The package being purchased (determines cost and benefits)

**System Status Check**

- System must not be in "stop top-up" mode (prevents purchases during system maintenance)
- Placement must not be in auto-reload status (prevents manual purchases when auto-reload is active)

### 2. Wallet & Package Validation Rules

**Buyer Wallet Requirements**

- Buyer must have sufficient wallet balance to cover the full package cost
- Wallet balance is checked to 4 decimal places for accuracy
- Insufficient balance prevents the purchase from proceeding

**Package & User Validation**

- Selected package must exist and be available
- Placement must belong to a valid user with exactly 7 placement nodes

### 3. Placement & Ranking Business Rules

**First Placement (Node 1) Rules**

- Cannot purchase a package lower than the user's historical highest package level
- This prevents users from downgrading their investment commitment
- Historical highest level is tracked and enforced permanently

**Secondary Placements (Nodes 2-7) Rules**

- First placement (Node 1) must be activated before purchasing for other nodes
- Cannot purchase packages higher than the first placement's level
- Only VIP packages (level 6+) can be purchased for Node 1
- All nodes must be empty (inactive) to purchase VIP packages

**Package Level Restrictions**

- Regular placements cannot buy packages lower than their current ranking level
- Ensures users maintain or upgrade their investment level
- VIP packages (level 6+) have special placement rules

### 4. Package Activation Process

**Static & Dynamic Cap Distribution**
When a package is purchased, earning caps are distributed based on package specifications:

- **Single Placement Package**: Full caps go to the selected placement
- **Multi-Placement Package / VIP Packages**: Caps are divided equally among the specified number of placements (level 6+)

**Cap Allocation Logic**

- Static cap = Package static cap ÷ Number of activated placements
- Dynamic cap = Package dynamic cap ÷ Number of activated placements
- Additional placements are selected in node order (1, 2, 3, etc.)
- Each affected placement receives equal cap amounts

### 5. Ranking Upgrade Process

**Automatic Ranking Upgrade**

- Multi-placement packages automatically upgrade user and all affected placements to the package's upgrade level
- Single placement packages trigger individual placement ranking calculations
- Ranking upgrades are applied immediately upon successful purchase

**Ranking Validation Check**

- System checks if placement has exceeded its static cap before setting ranking
- If static cap is exceeded, ranking upgrade is postponed until cap issues are resolved
- This prevents over-qualified placements from receiving inappropriate rankings

### 6. Financial Transaction Processing

**Buyer Wallet Deduction**

- Full package amount is deducted from buyer's wallet
- Transaction is recorded with proper audit trail
- Deduction happens immediately upon purchase validation

**Company Revenue Recording**

- 50% of package amount goes to company sales revenue
- Company transaction is created for financial tracking
- Links the sale to the specific placement and user

**Pool Contributions**

- 2.5% of package amount goes to Bonus Pool (for binary distributions)
- 2.5% of package amount goes to Bonus Pool 1 (for alternative distributions)
- Pool contributions are tracked with proper transaction records

### 7. Network Value Updates

**PV (Point Value) Distribution**

- Package amount is converted to PV for binary tree calculations
- Multi-placement packages split PV equally among activated placements
- PV is added to placement's upline chain for bonus calculations

**Direct Reward Processing**

- Triggers direct reward calculations for the user's sponsor chain
- Distributes direct commissions based on sponsor qualifications
- Processes immediately after PV updates to ensure accurate calculations

**Sales Volume Tracking**

- Updates upline sales volumes for sponsor performance tracking
- Tracks community sales growth throughout the sponsor chain

### 8. User Status Updates

**Placement Activation**

- All affected placements are marked as "activated"
- Activated placements become eligible for bonus distributions
- User's total active placement count is updated

**User Summary Refresh**

- Recalculates user's total self top-up amount
- Updates user's highest achieved level if upgraded
- Refreshes user's activation status based on active placements

**VIP Cap Bonuses**

- Special VIP cap bonuses are applied for qualifying packages
- Additional earning capacity is granted for VIP level purchases
- VIP benefits are tracked separately from regular caps

## Technical Flow

Pairing - Top Up - Technical Flow

---

# Reward Distribution Rule

## Overview

The reward distribution system processes three main types of bonuses: Direct Rewards (sponsor commissions), Binary Pairing Bonuses, and Leadership Bonuses. These distributions happen automatically based on user activities and scheduled processes.

## Ranking Structure

| Level | Name | Direct Rate | Binary Rate | Daily Cap | VIP Cap |
| ----- | ---- | ----------- | ----------- | --------- | ------- |
| 1     | MET1 | 6%          | 6%          | $100      | -       |
| 2     | MET2 | 7%          | 7%          | $200      | -       |
| 3     | MET3 | 8%          | 8%          | $1,000    | -       |
| 4     | MET4 | 9%          | 9%          | $2,000    | -       |
| 5     | MET5 | 10%         | 10%         | $5,000    | -       |
| 6     | MET6 | 10%         | 10%         | $5,000    | $22,500 |
| 7     | MET7 | 10%         | 10%         | $5,000    | $70,000 |

## 1. Direct Reward Distribution

### **Direct Reward Calculation Logic**

**Rate Distribution System**

- **Maximum Rate**: 10% (shared by Level 5, 6, and 7)
- **Progressive Distribution**: Each sponsor gets the difference between their level rate and previously distributed rates
- **Rate Protection**: Once a rate is distributed, it cannot be given again in the same chain

**Example Scenario 1: Mixed Level Sponsors**

- **User A** buys a $1,000 package
- **Sponsor Chain**: User A → User B (Level 2, 7%) → User C (Level 4, 9%) → User D (Level 6, 10%)

**Distribution Process:**

1. **User B receives**: 7% - 0% = 7% of $1,000 = $70
2. **User C receives**: 9% - 7% = 2% of $1,000 = $20
3. **User D receives**: 10% - 9% = 1% of $1,000 = $10
4. **Total Distributed**: $100 (10% of $1,000)

**Example Scenario 2: Same Level Sponsors**

- **User X** buys a $1,000 package
- **Sponsor Chain**: User X → User Y (Level 6, 10%) → User Z (Level 7, 10%)

**Distribution Process:**

1. **User Y receives**: 10% - 0% = 10% of $1,000 = $100
2. **User Z receives**: 10% - 10% = 0% of $1,000 = $0 (rate already distributed)
3. **Total Distributed**: $100 (maximum 10% reached)

**Example Scenario 3:**

- **User M** buys a $2,000 package
- **Sponsor Chain**: User M → User N (Level 3, 8%) → **Inactive User** (would be 10%) → User P (Level 7, 10%)

**Distribution Process:**

1. **User N receives**: 8% - 0% = 8% of $2,000 = $160
2. **Inactive User**: Misses their potential portion, but system continues
3. **User P receives**: 10% - 8% = 2% of $2,000 = $40 ✅ (still gets the remaining rate)
4. **Total Distributed**: $200 (full 10%)
5. **Missed Reward Record**: Created for the inactive user, but doesn't affect actual distribution

## 2. Binary Pairing Bonus Distribution

### **Pairing Calculation with Actual Rates**

**Example Scenario 1: Level 4 User Pairing**

- **User with Level 4 (MET4)**: binaryRate = 9%, dailyCap = $2,000
- **Placement amounts**: amountL = $5,000, amountR = $3,500
- **Pairing Calculation**:
  1. Paired Amount = $3,500 (smaller side)
  2. Base Bonus = $3,500 × 9% = $315
  3. Daily Cap Check = $315 < $2,000 ✅ (no capping needed)
  4. Final Bonus = $315
  5. Leader Bonus = $315 × 24% = $75.60
  6. Remaining Amounts = amountL: $1,500, amountR: $0

**Example Scenario 2: Daily Cap Applied**

- **User with Level 1 (MET1)**: binaryRate = 6%, dailyCap = $100
- **Placement amounts**: amountL = $2,000, amountR = $2,000
- **Pairing Calculation**:
  1. Paired Amount = $2,000 (equal amounts)
  2. Base Bonus = $2,000 × 6% = $120
  3. Daily Cap Check = $120 > $100 ❌ (capping applied)
  4. Final Bonus = $100 (capped to daily limit)
  5. Leader Bonus = $100 × 24% = $24
  6. Remaining Amounts = amountL: $0, amountR: $0

**Example Scenario 3: Inactive Ranking**

- **User with no ranking**: No valid binaryRate
- **Placement amounts**: amountL = $1,000, amountR = $800
- **Pairing Process**:
  1. Paired Amount = $800
  2. Missed Reward = $800 × 10% = $80 (recorded as type 1 missed reward)
  3. No bonus distributed to user
  4. Remaining Amounts = amountL: $200, amountR: $0

## 3. Leadership Bonus Distribution

### **Leadership Distribution with Actual Level Requirements**

**Distribution Pattern**: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7]

- **12 Fixed Portions** with level requirements
- **Equal Amount Distribution**: Total ÷ 12 = amount per portion

**Example Scenario: Leadership Bonus Distribution**

- **User A's placement** generates $1,200 pairing bonus
- **Leadership Pool**: $1,200 × 24% = $288
- **Amount per Portion**: $288 ÷ 12 = $24
- **Sponsor Chain**: User A → User B (Level 1) → User C (Level 3) → User D (Level 5) → User E (Level 5) → User F (Level 7) → User G (Level 2) → User H (Level 7) → User I (Level 7) → User J (Level 7) → … till the first sponsor

**Distribution Process:**

1. **Portion 1** (Level 1 required): User B (Level 1) ✅ receives $24
2. **Portion 2** (Level 1 required): User C (Level 3) ✅ receives $24
3. **Portion 3** (Level 2 required): User D (Level 3) ✅ receives $24
4. **Portion 4** (Level 2 required): User E (Level 5) ✅ receives $24
5. **Portion 5** (Level 3 required): User F (Level 7) ✅ receives $24
6. **Portion 6** (Level 3 required): User H (Level 7) ✅ receives $24 (Skip User G)
7. **Portion 7** (Level 4 required): User I (Level 7) ✅ receives $24
8. **Portion 8** (Level 4 required): Next qualified sponsor...
9. **Continue** until all 12 portions distributed

## 4. Pool Distribution Systems

### **Company Pool (Bonus Pool) Distribution**

**Eligibility**: Level 6 (MET6) and Level 7 (MET7) users only

- **Level 6 Users**: Must have vipCap > 0 (up to $22,500)
- **Level 7 Users**: Must have vipCap > 0 (up to $70,000)

**Example Distribution:**

- **Pool Amount**: $10,000
- **Eligible Users**: 5 Level 6 users + 3 Level 7 users = 8 total
- **Average Amount**: $10,000 ÷ 8 = $1,250 per user

**VIP Cap Management:**

- **Level 6 User** with available vipCap = $1,000:
  - Receives: $1,000 (limited by available cap)
  - Company gets: $250 (insufficient cap amount)
- **Level 7 User** with available vipCap = $2,000:
  - Receives: $1,250 (within cap limit)
  - Company gets: $0

### **Company Pool 1 (Bonus Pool 1) Distribution**

**Eligibility**: Level 7 (MET7) users only

- **More Exclusive**: Higher individual shares
- **Same VIP Cap Logic**: Limited by available vipCap

## Technical Flow

Pairing - Reward Distribution - Technical Flow

# Cap Deduction Rule - Business Flow Documentation

## Overview

The cap deduction system manages how different types of earnings are applied against user earning limits. There are two types of caps: Static Cap (lifetime earning limit) and Dynamic Cap (renewable earning capacity). The deduction method varies based on the earning source.

## Cap Types and Structure

### **Static Cap**

- **Purpose**: Lifetime earning limit for each placement
- **Source**: Comes from package purchases
- **Usage**: Deducted for robot trading earnings and dynamic cap left over deduction
- **Renewal**: Must be increased through new packages

### **Dynamic Cap**

- **Purpose**: Renewable earning capacity for reward distributions
- **Source**: Comes from package purchases and system allocations
- **Usage**: Used for direct rewards, pairing, leader rewards
- **Renewal**: Must be increased through new packages / Can be added manually through system functions

## 1. Cap Deduction by Earning Type

### **Robot Trading Earnings (Static Cap Only)**

Robot trading profits are distributed equally across all user's active placements:

**Business Process:**

- **Earning Source**: Robot trading webhook delivers profit amounts
- **Distribution Method**: Total amount divided equally among all active placements
- **Cap Usage**: Only uses static caps (ignores dynamic caps completely)
- **Redistribution Logic**: If some placements cannot cover their portion, the uncovered amounts are redistributed to other placements that still have available static cap
- **Example Scenario: $1,200 Robot Trading Profit**
  **Initial Setup**
  - **User earns**: $1,200 from robot trading webhook
  - **Active placements**: 3 placements (Node 1, Node 2, Node 4)
  - **Equal distribution**: $1,200 ÷ 3 = $400 per placement initially
  **Placement Static Cap Status**
  - **Placement 1 (Node 1)**: Static cap available = $500
  - **Placement 2 (Node 2)**: Static cap available = $200
  - **Placement 4 (Node 4)**: Static cap available = $300
  **First Round Distribution Process**
  **Placement 1:**
  - Amount attempted: $400
  - Static cap available: $500
  - **Result**: $400 deducted from static cap, balance = $0
  - **Status**: Fully covered
  **Placement 2:**
  - Amount attempted: $400
  - Static cap available: $200
  - **Result**: $200 deducted from static cap, balance = $200
  - **Status**: Partially covered, $200 uncovered
  **Placement 4:**
  - Amount attempted: $400
  - Static cap available: $300
  - **Result**: $300 deducted from static cap, balance = $100
  - **Status**: Partially covered, $100 uncovered
  **First Round Summary:**
  - **Total distributed**: $400 + $200 + $300 = $900
  - **Total uncovered**: $200 + $100 = $300
  - **Remaining balance**: $300 needs redistribution
  ### **Second Round Redistribution Process**
  **Available Static Caps After First Round:**
  - **Placement 1**: $500 - $400 = $100 remaining
  - **Placement 2**: $200 - $200 = $0 remaining
  - **Placement 4**: $300 - $300 = $0 remaining
  **Redistribution Logic:** The system attempts to redistribute the $300 uncovered amount:
  **Placement 1 (Only placement with remaining cap):**
  - Amount to redistribute: $300
  - Static cap available: $100
  - **Result**: $100 deducted from static cap, balance = $200
  - **Status**: Partially covered, $200 still uncovered
  **Placements 2 & 4:**
  - Static cap available: $0 each
  - **Result**: Cannot accept any redistribution
  - **Status**: No further deduction possible
  ### **Final Business Outcome**
  **Total Amount Distributed:**
  - **First round**: $900
  - **Second round**: $100
  - **Total distributed to user**: $1,000
  **Uncovered Amount Handling:**
  - **Uncovered balance**: $200
  - **Goes to company**: **NO**
  - **Goes to user**: **NO** - User doesn't receive this amount
  - **What happens**: Amount simply **disappears from the system**
  - **User notification**: Suspend User from robot trading

### **Direct Reward Earnings (Dynamic Cap Priority)**

**Business Process:**

- **Earning Source**: Direct sponsor commissions from team member purchases or Leader commissions from pairing rewards
- **Distribution Method**: Total amount divided equally among all active placements
- **Cap Usage**: Uses dynamic cap first, then static cap for remaining amounts
- **Redistribution Logic**: Uncovered amounts are redistributed to other placements with available capacity
- **Example Scenario: $1,800 Direct Bonus Distribution**
  ### **Initial Setup**
  - **User receives**: $1,800 direct sponsor bonus
  - **Active placements**: 3 placements (Node 1, Node 3, Node 5)
  - **Equal distribution**: $1,800 ÷ 3 = $600 per placement initially
  ### **Placement Cap Status**
  - **Placement 1 (Node 1)**: Dynamic cap available = $200, Static cap available = $400
  - **Placement 3 (Node 3)**: Dynamic cap available = $300, Static cap available = $150
  - **Placement 5 (Node 5)**: Dynamic cap available = $100, Static cap available = $500
  ### **First Round Distribution Process**
  **Placement 1:**
  - Amount attempted: $600
  - Dynamic cap: $200 used, remaining $400
  - Static cap: $400 used, remaining $0
  - **Result**: $600 fully covered, balance = $0
  - **Status**: Fully covered
  **Placement 3:**
  - Amount attempted: $600
  - Dynamic cap: $300 used, remaining $300
  - Static cap: $150 used, remaining $150
  - **Result**: $450 covered from caps, balance = $150
  - **Status**: Partially covered, $150 uncovered
  **Placement 5:**
  - Amount attempted: $600
  - Dynamic cap: $100 used, remaining $500
  - Static cap: $500 used, remaining $0
  - **Result**: $600 fully covered, balance = $0
  - **Status**: Fully covered
  **First Round Summary:**
  - **Total distributed**: $600 + $450 + $600 = $1,650
  - **Total uncovered**: $0 + $150 + $0 = $150
  - **Remaining balance**: $150 needs redistribution
  ### **Second Round Redistribution Process**
  **Available Caps After First Round:**
  - **Placement 1**: Dynamic = $0, Static = $0 remaining
  - **Placement 3**: Dynamic = $0, Static = $0 remaining
  - **Placement 5**: Dynamic = $0, Static = $0 remaining
  **Redistribution Logic:** The system attempts to redistribute the $150 uncovered amount:
  **All Placements:**
  - Static and dynamic caps available: $0 each
  - **Result**: Cannot accept any redistribution
  - **Status**: No further deduction possible
  ### **Final Business Outcome**
  **Total Amount Distributed:**
  - **First round**: $1,650
  - **Second round**: $0
  - **Total distributed to user wallet**: $1,650
  **Uncovered Amount Handling:**
  - **Uncovered balance**: $150
  - **Goes to company**: **YES** - Company receives $150 as revenue
  - **Goes to user**: **NO** - User doesn't receive this uncovered amount
  - **What happens**: Amount goes to company
  - **User notification**: User receives $1,650 in wallet, company gets $150

### **Placement-Specific Earnings (Dynamic Cap Priority)**

Binary bonuses and leadership bonuses are tied to specific placements:

**Business Process:**

- **Earning Source**: Binary pairing bonuses from specific placement performance
- **Distribution Method**: Deducted from the earning placement only (no distribution to other placements)
- **Cap Usage**: Uses dynamic cap first, then static cap
- **No Redistribution**: Any insufficient cap amount goes directly to company
- **Example Scenario: $800 Binary Bonus from Specific Placement**
  ### **Initial Setup**
  - **User receives**: $800 binary bonus from Placement Node 2 pairing
  - **Earning placement**: Node 2 only (no other placements involved)
  - **Single placement distribution**: Full $800 applies to Node 2 only
  ### **Placement Cap Status**
  - **Placement 2 (Node 2)**: Dynamic cap available = $300, Static cap available = $200
  ### **Single Placement Distribution Process**
  **Placement 2 (Node 2):**
  - Amount attempted: $800
  - Dynamic cap: $300 used, remaining $500
  - Static cap: $200 used, remaining $300
  - **Result**: $500 covered from caps, balance = $300
  - **Status**: Partially covered, $300 uncovered
  ### **No Redistribution Process**
  **Other Placements:**
  - **Node 1, 3, 4, 5, 6, 7**: Not involved in binary bonus distribution
  - **Available caps**: Not considered for redistribution
  - **System logic**: Binary bonus stays with earning placement only
  ### **Final Business Outcome**
  **Total Amount Distributed:**
  - **Single placement**: $500 (what Node 2 caps could cover)
  - **No redistribution**: $0 (binary bonuses don't redistribute)
  - **Total distributed to user wallet**: $500
  **Uncovered Amount Handling:**
  - **Uncovered balance**: $300
  - **Goes to company**: **YES** - Company receives $300 as revenue
  - **Goes to user**: **NO** - User doesn't receive this uncovered amount
  - **What happens**: Amount goes to company
  - **User notification**: User receives $500 in wallet, company gets $300

## 2. Static Cap Monitoring and Management

### **Automatic Ranking Reset System**

When a placement's static cap is fully depleted:

**Business Rules:**

- **Node 1 Impact**: If the first placement runs out of static cap, the user's ranking is reset to null
- **Placement Deactivation**: The specific placement's ranking is set to null (becomes inactive)
- **Grace Period**: Placement gets a 2-day grace period before permanent deactivation (reset PV)
- **Recovery**: If static cap is added during grace period, ranking is restored

### **Auto-Reload System**

Users can set up automatic package purchases when static cap is nearly depleted:

**Business Process:**

- **Threshold Monitoring**: System monitors when static cap usage reaches preset percentage
- **Automatic Purchase**: System automatically purchases new package to add static cap
- **User Notification**: User receives notification about automatic reload
- **Manual Override**: Users can disable auto-reload if they prefer manual management
