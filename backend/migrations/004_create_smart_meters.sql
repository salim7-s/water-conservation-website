USE watertracker;

-- Smart Meters table
CREATE TABLE IF NOT EXISTS smart_meters (
    meter_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    meter_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    total_usage FLOAT DEFAULT 0,
    install_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


