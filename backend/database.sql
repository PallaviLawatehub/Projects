CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role ENUM('admin', 'manager', 'developer') DEFAULT 'developer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pending', 'in_progress', 'completed', 'blocked') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    assignee VARCHAR(100),
    dueDate DATE,
    userId INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert sample users
INSERT INTO users (username, password, fullName, email, role) VALUES
('john.doe', 'password123', 'John Doe', 'john.doe@example.com', 'admin'),
('jane.smith', 'password123', 'Jane Smith', 'jane.smith@example.com', 'manager'),
('alex.johnson', 'password123', 'Alex Johnson', 'alex.johnson@example.com', 'developer');

-- Insert sample tasks
INSERT INTO tasks (title, description, status, priority, assignee, dueDate, userId) VALUES
('Setup CI/CD Pipeline', 'Configure Jenkins for automated builds and deployments', 'pending', 'high', 'John Doe', '2025-05-15', 1),
('Update Documentation', 'Update API documentation with new endpoints', 'pending', 'medium', 'Jane Smith', '2025-05-20', 2),
('Design Database Schema', 'Create ERD and implement database migrations', 'in_progress', 'high', 'Jane Smith', '2025-05-10', 2),
('Fix Navigation Bug', 'Fix issue with navigation menu in mobile view', 'blocked', 'medium', 'Alex Johnson', '2025-05-08', 3),
('Implement Login Page', 'Create login page with authentication', 'completed', 'low', 'John Doe', '2025-05-05', 1);
