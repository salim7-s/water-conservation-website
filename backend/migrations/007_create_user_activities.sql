USE watertracker;

-- User Activities junction table
CREATE TABLE IF NOT EXISTS user_activities (
    user_id INT NOT NULL,
    activity_id INT NOT NULL,
    participation_date DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, activity_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES conservation_activities(activity_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_activity_id (activity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


