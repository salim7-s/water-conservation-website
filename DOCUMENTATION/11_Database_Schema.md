# Database Schema — Complete Reference

**Database:** `watertracker` | **Engine:** InnoDB | **Charset:** utf8mb4

---

## Entity Relationship Overview

```
users ──────────┬──< smart_meters
                ├──< water_usage >──── water_source
                ├──< goals
                ├──< alerts (user_id)
                ├──< alerts (admin_id)  [SET NULL on delete]
                └──< user_activities >── conservation_activities
```

---

## Table 1: `users`

**Purpose:** Stores all user accounts — both regular users and admins.

```sql
CREATE TABLE users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    firstname     VARCHAR(100) NOT NULL,
    lastname      VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,          -- bcrypt, 10 salt rounds
    contact_no    VARCHAR(20),
    address       VARCHAR(255),
    role          ENUM('user', 'admin') DEFAULT 'user',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | INT PK | Auto-increment |
| `email` | VARCHAR(255) UNIQUE | Indexed — fast login lookups |
| `password_hash` | VARCHAR(255) | Never store plain text |
| `role` | ENUM | Controls RBAC throughout API |

---

## Table 2: `water_source`

**Purpose:** Lookup/reference table for water sources.

```sql
CREATE TABLE water_source (
    source_id   INT AUTO_INCREMENT PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    location    VARCHAR(255),
    source_type VARCHAR(50),                     -- municipal, groundwater, rainwater, recycled, surface_water
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_source_type (source_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Seeded data (7 sources):**
| source_id | source_name | source_type |
|-----------|-------------|-------------|
| 1 | City Municipal Supply | municipal |
| 2 | Borewell — Sector 7 | groundwater |
| 3 | Rainwater Harvesting Tank | rainwater |
| 4 | Godavari River Intake | surface_water |
| 5 | Recycled Greywater Plant | recycled |
| 6 | Rooftop Collection System | rainwater |
| 7 | Deep Aquifer Borewell | groundwater |

---

## Table 3: `smart_meters`

**Purpose:** Tracks IoT water meters installed for users. Totals auto-sync after every usage insert.

```sql
CREATE TABLE smart_meters (
    meter_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    meter_type  VARCHAR(50),                     -- residential, commercial
    status      VARCHAR(50) DEFAULT 'active',    -- active, inactive, maintenance
    total_usage FLOAT DEFAULT 0,                 -- auto-updated by scheduler
    install_date DATE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design note:** `total_usage` is a denormalized aggregate — updated by the scheduler every 30 minutes via `SUM(quantity_used)` from `water_usage`. This avoids expensive aggregation on every dashboard load.

---

## Table 4: `water_usage` ⭐ (Core Fact Table)

**Purpose:** Every water consumption record. Contains 3,640+ rows of seeded historical data.

```sql
CREATE TABLE water_usage (
    usage_id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    source_id     INT NOT NULL,
    purpose       VARCHAR(100),                  -- drinking, cooking, bathing, washing, gardening, cleaning, domestic
    date          DATE NOT NULL,
    cost          FLOAT DEFAULT 0,
    quantity_used FLOAT NOT NULL,                -- in litres
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)   REFERENCES users(user_id)        ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES water_source(source_id) ON DELETE RESTRICT,
    INDEX idx_user_id  (user_id),
    INDEX idx_source_id (source_id),
    INDEX idx_date     (date)         -- most queries filter by date range
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key design decisions:**
- `source_id` uses `ON DELETE RESTRICT` — cannot delete a water source that has usage records (data integrity)
- `idx_date` index essential for stats queries: `WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
- `purpose` stored as VARCHAR (not ENUM) to allow future extensibility

---

## Table 5: `conservation_activities`

**Purpose:** Catalogue of conservation actions users can adopt.

```sql
CREATE TABLE conservation_activities (
    activity_id   INT AUTO_INCREMENT PRIMARY KEY,
    activity_name VARCHAR(100) NOT NULL,
    description   TEXT,
    category      VARCHAR(50),                   -- household, outdoor, advanced, community, technology
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Table 6: `user_activities` (Junction Table)

**Purpose:** Many-to-many link between users and conservation activities.

```sql
CREATE TABLE user_activities (
    user_id            INT NOT NULL,
    activity_id        INT NOT NULL,
    participation_date DATE DEFAULT (CURRENT_DATE),
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, activity_id),           -- composite PK prevents duplicate joins
    FOREIGN KEY (user_id)     REFERENCES users(user_id)                  ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES conservation_activities(activity_id) ON DELETE CASCADE,
    INDEX idx_user_id     (user_id),
    INDEX idx_activity_id (activity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design note:** Composite primary key `(user_id, activity_id)` replaces a surrogate PK and automatically prevents a user from joining the same activity twice (more efficient than a UNIQUE constraint on an auto-increment PK).

---

## Table 7: `goals`

**Purpose:** User-defined water conservation targets with auto-calculated progress.

```sql
CREATE TABLE goals (
    goal_id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    goal_type       VARCHAR(50),                  -- reduce_consumption, save_money, conserve_water, reduce_monthly
    target_quantity FLOAT,                        -- target in litres
    deadline        DATE,
    status          VARCHAR(50) DEFAULT 'active', -- active, completed, failed
    progress        VARCHAR(255),                 -- stored as "72%" string
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id  (user_id),
    INDEX idx_status   (status),
    INDEX idx_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Progress calculation:** After every water usage INSERT/UPDATE/DELETE, `calculateGoalProgress.js` runs. It queries total usage within the goal's timeframe and computes `progress` as a percentage of `target_quantity`. Status flips to `completed` at 100%, `failed` if deadline passes without reaching 100%.

---

## Table 8: `alerts`

**Purpose:** Anomaly-detected alerts (auto) and user-reported leak alerts.

```sql
CREATE TABLE alerts (
    alert_id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    status        VARCHAR(50) DEFAULT 'reported',  -- active, reported, read, resolved
    alert_date    DATE DEFAULT (CURRENT_DATE),
    alert_type    VARCHAR(50),                     -- high_usage, goal_at_risk, leak_report
    message       TEXT,
    location      VARCHAR(255),
    severity      VARCHAR(20) DEFAULT 'medium',    -- low, medium, high
    admin_id      INT NULL,                        -- which admin processed it
    admin_comment TEXT,
    action_date   TIMESTAMP NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL,  -- preserve audit trail
    INDEX idx_user_id    (user_id),
    INDEX idx_status     (status),
    INDEX idx_alert_date (alert_date),
    INDEX idx_alert_type (alert_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Alert lifecycle:**
```
Auto-detected:  [backend scheduler] → INSERT (active)
User-reported:  [user form]         → INSERT (reported)
Admin action:   [admin panel]       → UPDATE status → (resolved/read)
```

**Key design:** `admin_id` FK uses `ON DELETE SET NULL` — if an admin account is deleted, the alert record is preserved with `admin_id = NULL` (audit trail intact).

---

## Indexes Summary

| Table | Index | Columns | Reason |
|-------|-------|---------|--------|
| users | idx_email | email | Login lookup |
| water_usage | idx_date | date | Date-range stats queries |
| water_usage | idx_user_id | user_id | Per-user filtering |
| smart_meters | idx_user_id | user_id | Meter lookup by user |
| goals | idx_deadline | deadline | Goal risk scheduler query |
| goals | idx_status | status | Filter active goals |
| alerts | idx_alert_type | alert_type | Admin filter charts |
| user_activities | PRIMARY | (user_id, activity_id) | Prevent duplicate joins |

---

## Migration Files

Run in order (or use `00_complete_schema.sql` for one-step setup):

```
001_create_database.sql          → CREATE DATABASE IF NOT EXISTS watertracker
002_create_users.sql             → users table + idx_email
003_create_water_source.sql      → water_source table
004_create_smart_meters.sql      → smart_meters table + FK
005_create_water_usage.sql       → water_usage table + FKs + indexes
006_create_conservation_activities.sql
007_create_user_activities.sql   → composite PK junction table
008_create_goals.sql             → goals table + indexes
009_create_alerts.sql            → alerts table + dual FKs
```
