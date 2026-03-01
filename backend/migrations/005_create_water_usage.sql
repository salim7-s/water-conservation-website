USE watertracker;

-- Water Usage table
CREATE TABLE IF NOT EXISTS water_usage (
    usage_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    source_id INT NOT NULL,
    purpose VARCHAR(100),
    date DATE NOT NULL,
    cost FLOAT DEFAULT 0,
    quantity_used FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES water_source(source_id) ON DELETE RESTRICT,
    INDEX idx_user_id (user_id),
    INDEX idx_source_id (source_id),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


