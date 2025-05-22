require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

// Try to load node-schedule, but make it optional
let schedule;
try {
    schedule = require('node-schedule');
    console.log('node-schedule package loaded successfully');
} catch (err) {
    console.log('node-schedule package not found. Scheduled tasks will not run.');
    console.log('To enable scheduled tasks, install the package with: npm install node-schedule');
}

// Global variable to store the cleanup job
let cleanupJob = null;

// Function to calculate the date threshold for task retention
function calculateRetentionThreshold(retentionValue, timeUnit) {
    const now = new Date();
    if (timeUnit === 'days') {
        now.setDate(now.getDate() - retentionValue);
    } else if (timeUnit === 'minutes') {
        now.setMinutes(now.getMinutes() - retentionValue);
    } else if (timeUnit === 'hours') {
        now.setHours(now.getHours() - retentionValue);
    }
    return now;
}

// Function to delete completed tasks older than the threshold
async function deleteCompletedTasksOlderThan(threshold) {
    try {
        const [result] = await pool.query(
            'DELETE FROM tasks WHERE status = "completed" AND created_at < ?',
            [threshold]
        );
        return result.affectedRows;
    } catch (error) {
        console.error('Error deleting completed tasks:', error);
        throw error;
    }
}

// Function to schedule the cleanup job
function scheduleCleanupJob() {
    // Get retention settings from environment or use defaults
    const retentionValue = process.env.TASK_RETENTION_VALUE || 30;
    const timeUnit = process.env.TASK_RETENTION_UNIT || 'days';
    
    // Cancel existing job if it exists
    if (cleanupJob) {
        cleanupJob.cancel();
    }
    
    // Only schedule if node-schedule is available
    if (schedule) {
        // Schedule to run daily at midnight
        cleanupJob = schedule.scheduleJob('0 0 * * *', async () => {
            try {
                console.log(`Running scheduled cleanup of completed tasks older than ${retentionValue} ${timeUnit}`);
                const threshold = calculateRetentionThreshold(retentionValue, timeUnit);
                const deletedCount = await deleteCompletedTasksOlderThan(threshold);
                console.log(`Cleanup completed: ${deletedCount} tasks deleted`);
            } catch (error) {
                console.error('Error in scheduled cleanup job:', error);
            }
        });
        console.log(`Scheduled daily cleanup job for tasks older than ${retentionValue} ${timeUnit}`);
    }
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log environment variables (excluding sensitive data)
console.log('Environment:', {
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    PORT: process.env.PORT
});

// MySQL connection configuration with valid options
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000 // Increase timeout to 60 seconds
    // Removed invalid options that were causing warnings
};

// Create MySQL connection without database
const initialPool = mysql.createPool({
    ...dbConfig
}).promise();

// Create MySQL connection with database
const pool = mysql.createPool({
    ...dbConfig,
    database: process.env.DB_NAME
}).promise();

// Test database connection with retry logic
async function testConnection(retries = 5, delay = 5000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Connection attempt ${attempt}/${retries}...`);
            const connection = await pool.getConnection();
            console.log('Successfully connected to MySQL');
            
            // Check database
            const [databases] = await connection.query('SHOW DATABASES');
            console.log('Available databases:', databases.map(db => db.Database));
            
            // Check if our database exists
            const dbExists = databases.some(db => db.Database === process.env.DB_NAME);
            console.log(`Database ${process.env.DB_NAME} exists:`, dbExists);
            
            if (dbExists) {
                // Check tables
                const [tables] = await connection.query('SHOW TABLES');
                console.log('Tables in database:', tables);
            }
            
            connection.release();
            return true; // Connection successful
        } catch (error) {
            console.error(`Connection attempt ${attempt} failed:`, error);
            if (attempt < retries) {
                console.log(`Retrying in ${delay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('All connection attempts failed');
                throw error; // Rethrow the error after all retries fail
            }
        }
    }
}

// Initialize database
async function initializeDatabase() {
    try {
        // Test connection first with retries
        await testConnection();
        
        // Create database if it doesn't exist
        await initialPool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        console.log('Database created or already exists');

        // Create users table
        const [userTables] = await pool.query('SHOW TABLES LIKE "users"');
        if (userTables.length === 0) {
            await pool.query(`
                CREATE TABLE users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    username VARCHAR(50) UNIQUE,
                    password VARCHAR(100) NOT NULL,
                    role ENUM('user', 'admin') DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Users table created successfully');
            
            // Insert default users
            await pool.query(`
                INSERT INTO users (name, email, username, password, role) VALUES
                ('John Doe', 'john@example.com', 'johndoe', 'password123', 'admin'),
                ('Jane Smith', 'jane@example.com', 'janesmith', 'password123', 'user'),
                ('Alex Johnson', 'alex@example.com', 'alexjohnson', 'password123', 'user'),
                ('Sam Wilson', 'sam@example.com', 'samwilson', 'password123', 'user')
            `);
            console.log('Default users created successfully');
        } else {
            console.log('Users table already exists');
            
            // Check if username column exists in users table
            try {
                const [userColumns] = await pool.query('DESCRIBE users');
                const userColumnNames = userColumns.map(col => col.Field);
                
                if (!userColumnNames.includes('username')) {
                    console.log('Adding username column to users table');
                    await pool.query('ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE');
                    
                    // Update existing users with usernames based on their emails
                    await pool.query(`
                        UPDATE users 
                        SET username = CASE 
                            WHEN email = 'john@example.com' THEN 'johndoe'
                            WHEN email = 'jane@example.com' THEN 'janesmith'
                            WHEN email = 'alex@example.com' THEN 'alexjohnson'
                            WHEN email = 'sam@example.com' THEN 'samwilson'
                            ELSE SUBSTRING_INDEX(email, '@', 1)
                        END
                    `);
                    console.log('Updated existing users with usernames');
                }
            } catch (error) {
                console.error('Error checking or updating users table:', error);
            }
        }

        // Create tasks table
        const [taskTables] = await pool.query('SHOW TABLES LIKE "tasks"');
        if (taskTables.length === 0) {
            await pool.query(`
                CREATE TABLE tasks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    status ENUM('pending', 'in_progress', 'completed', 'blocked') DEFAULT 'pending',
                    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                    task_type ENUM('story', 'bug', 'task', 'epic', 'subtask') DEFAULT 'task',
                    assignee VARCHAR(100),
                    dueDate DATE,
                    userId INT,
                    parentId INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP NULL,
                    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
                    FOREIGN KEY (parentId) REFERENCES tasks(id) ON DELETE CASCADE
                )
            `);
            console.log('Tasks table created successfully');
        } else {
            console.log('Tasks table already exists');
        }
        
        // Verify table structure
        const [columns] = await pool.query('DESCRIBE tasks');
        console.log('Table structure:', columns);
        
        // Check if we need to update the table structure
        const columnNames = columns.map(col => col.Field);
        const requiredColumns = ['id', 'title', 'description', 'status', 'priority', 'task_type', 'assignee', 'dueDate', 'userId', 'parentId', 'created_at'];
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
        // Check if completed_at column exists
        if (!columnNames.includes('completed_at')) {
            missingColumns.push('completed_at');
        }
        
        // Check if status enum needs updating
        const statusColumn = columns.find(col => col.Field === 'status');
        const needsStatusUpdate = statusColumn && !statusColumn.Type.includes('blocked');
        
        if (missingColumns.length > 0 || needsStatusUpdate) {
            console.log('Updating table structure to add missing columns:', missingColumns);
            
            // Add missing columns
            if (missingColumns.includes('priority')) {
                await pool.query("ALTER TABLE tasks ADD COLUMN priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium'");
                console.log('Added priority column');
            }
            
            if (missingColumns.includes('task_type')) {
                await pool.query("ALTER TABLE tasks ADD COLUMN task_type ENUM('story', 'bug', 'task', 'epic', 'subtask') DEFAULT 'task'");
                console.log('Added task_type column');
            }
            
            if (missingColumns.includes('assignee')) {
                await pool.query('ALTER TABLE tasks ADD COLUMN assignee VARCHAR(100)');
                console.log('Added assignee column');
            }
            
            if (missingColumns.includes('dueDate')) {
                await pool.query('ALTER TABLE tasks ADD COLUMN dueDate DATE');
                console.log('Added dueDate column');
            }
            
            if (missingColumns.includes('userId')) {
                await pool.query('ALTER TABLE tasks ADD COLUMN userId INT');
                console.log('Added userId column');
            }
            
            if (missingColumns.includes('parentId')) {
                await pool.query('ALTER TABLE tasks ADD COLUMN parentId INT');
                await pool.query('ALTER TABLE tasks ADD FOREIGN KEY (parentId) REFERENCES tasks(id) ON DELETE CASCADE');
                console.log('Added parentId column with foreign key constraint');
            }
            
            if (missingColumns.includes('completed_at')) {
                await pool.query('ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP NULL');
                console.log('Added completed_at column');
            }
            
            // Update status enum if needed
            if (needsStatusUpdate) {
                await pool.query("ALTER TABLE tasks MODIFY COLUMN status ENUM('pending', 'in_progress', 'completed', 'blocked') DEFAULT 'pending'");
                console.log('Updated status column to include blocked status');
            }
            
            console.log('Table structure updated successfully');
        }
        
        // Check existing data
        const [existingData] = await pool.query('SELECT COUNT(*) as count FROM tasks');
        console.log('Existing tasks count:', existingData[0].count);
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

// Create task
app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, status, priority, task_type, assignee, dueDate, userId, parentId } = req.body;
        console.log('Received task creation request:', req.body);

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        // Format the date to YYYY-MM-DD format if it exists
        let formattedDueDate = null;
        if (dueDate) {
            // Parse the ISO date string and format it as YYYY-MM-DD
            const date = new Date(dueDate);
            formattedDueDate = date.toISOString().split('T')[0]; // Extract just the date part
            console.log('Formatted due date:', formattedDueDate);
        }
        
        const [result] = await pool.query(
            `INSERT INTO tasks (
                title, 
                description, 
                status, 
                priority,
                task_type, 
                assignee, 
                dueDate, 
                userId,
                parentId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                description || '',
                status || 'pending',
                priority || 'medium',
                task_type || 'task',
                assignee || null,
                formattedDueDate,
                userId || null,
                parentId || null
            ]
        );
        console.log('Insert result:', result);

        const [newTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
        console.log('Created task:', newTask[0]);
        
        res.status(201).json(newTask[0]);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Error creating task: ' + error.message });
    }
});

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        console.log('Fetching all tasks...');
        
        // Apply filters if provided
        let query = 'SELECT * FROM tasks';
        const queryParams = [];
        const filters = [];
        
        if (req.query.search) {
            // Check if search is numeric to potentially match an ID
            const isNumeric = /^\d+$/.test(req.query.search);
            
            if (isNumeric) {
                // If numeric, search by exact ID match or in title/description
                filters.push('(id = ? OR title LIKE ? OR description LIKE ?)');
                queryParams.push(
                    parseInt(req.query.search), // Exact ID match
                    `%${req.query.search}%`,   // Title contains
                    `%${req.query.search}%`    // Description contains
                );
            } else {
                // If not numeric, just search in title/description
                filters.push('(title LIKE ? OR description LIKE ?)');
                const searchTerm = `%${req.query.search}%`;
                queryParams.push(searchTerm, searchTerm);
            }
        }
        
        if (req.query.status) {
            filters.push('status = ?');
            queryParams.push(req.query.status);
        }
        
        if (req.query.priority) {
            filters.push('priority = ?');
            queryParams.push(req.query.priority);
        }
        
        if (req.query.assignee) {
            filters.push('assignee = ?');
            queryParams.push(req.query.assignee);
        }
        
        if (filters.length > 0) {
            query += ' WHERE ' + filters.join(' AND ');
        }
        
        query += ' ORDER BY created_at DESC';
        
        console.log('Query:', query, 'Params:', queryParams);
        const [rows] = await pool.query(query, queryParams);
        console.log(`Found ${rows.length} tasks`);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Error fetching tasks' });
    }
});

// Get tasks by user ID
app.get('/api/tasks/user/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        console.log('Fetching tasks for user:', userId, 'Name:', req.query.name);
        
        // Get user name from database for more accurate assignee matching
        const [userRows] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
        const userName = userRows.length > 0 ? userRows[0].name : (req.query.name || '');
        
        console.log('User name for assignee matching:', userName);
        
        // Apply filters if provided
        let query = 'SELECT * FROM tasks WHERE (userId = ? OR assignee = ?)';
        const queryParams = [userId, userName];
        const filters = [];
        
        if (req.query.search) {
            // Check if search is numeric to potentially match an ID
            const isNumeric = /^\d+$/.test(req.query.search);
            
            if (isNumeric) {
                // If numeric, search by exact ID match or in title/description
                filters.push('(id = ? OR title LIKE ? OR description LIKE ?)');
                queryParams.push(
                    parseInt(req.query.search), // Exact ID match
                    `%${req.query.search}%`,   // Title contains
                    `%${req.query.search}%`    // Description contains
                );
            } else {
                // If not numeric, just search in title/description
                filters.push('(title LIKE ? OR description LIKE ?)');
                const searchTerm = `%${req.query.search}%`;
                queryParams.push(searchTerm, searchTerm);
            }
        }
        
        if (req.query.status) {
            filters.push('status = ?');
            queryParams.push(req.query.status);
        }
        
        if (req.query.priority) {
            filters.push('priority = ?');
            queryParams.push(req.query.priority);
        }
        
        if (req.query.task_type) {
            filters.push('task_type = ?');
            queryParams.push(req.query.task_type);
        }
        
        // Additional assignee filter is not needed for user tasks
        // since we're already filtering by user ID or assignee
        
        if (filters.length > 0) {
            query += ' AND ' + filters.join(' AND ');
        }
        
        query += ' ORDER BY created_at DESC';
        
        console.log('User tasks query:', query, 'Params:', queryParams);
        const [rows] = await pool.query(query, queryParams);
        console.log(`Found ${rows.length} tasks for user ${userId} (${userName})`);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching user tasks:', error);
        res.status(500).json({ error: 'Error fetching user tasks' });
    }
});

// Update task (all fields)
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { title, description, status, priority, task_type, assignee, dueDate, userId, parentId } = req.body;
        console.log('Received task update request:', { id: req.params.id, ...req.body });

        // Format the date to YYYY-MM-DD format if it exists
        let formattedDueDate = null;
        if (dueDate) {
            // Parse the ISO date string and format it as YYYY-MM-DD
            const date = new Date(dueDate);
            formattedDueDate = date.toISOString().split('T')[0]; // Extract just the date part
            console.log('Formatted due date:', formattedDueDate);
        }
        
        const [result] = await pool.query(
            `UPDATE tasks SET 
                title = ?, 
                description = ?, 
                status = ?, 
                priority = ?,
                task_type = ?, 
                assignee = ?, 
                dueDate = ?, 
                userId = ? 
            WHERE id = ?`,
            [
                title,
                description || '',
                status || 'pending',
                priority || 'medium',
                task_type || 'task',
                assignee || null,
                formattedDueDate,
                userId || null,
                req.params.id
            ]
        );
        console.log('Update result:', result);

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Task not found' });
        } else {
            const [updatedTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
            console.log('Updated task:', updatedTask[0]);
            res.json(updatedTask[0]);
        }
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Error updating task: ' + error.message });
    }
});

// Update specific task fields (PATCH)
app.patch('/api/tasks/:id', async (req, res) => {
    try {
        console.log('Received task patch request:', { id: req.params.id, ...req.body });

        // Only update the fields that are provided in the request body
        const updateFields = [];
        const updateValues = [];
        
        // Check which fields are provided and add them to the update query
        if (req.body.status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(req.body.status);
        }
        
        if (req.body.priority !== undefined) {
            updateFields.push('priority = ?');
            updateValues.push(req.body.priority);
        }
        
        if (req.body.task_type !== undefined) {
            updateFields.push('task_type = ?');
            updateValues.push(req.body.task_type);
        }
        
        if (req.body.parentId !== undefined) {
            updateFields.push('parentId = ?');
            updateValues.push(req.body.parentId);
        }
        
        if (req.body.assignee !== undefined) {
            updateFields.push('assignee = ?');
            updateValues.push(req.body.assignee);
        }

        if (req.body.title !== undefined) {
            updateFields.push('title = ?');
            updateValues.push(req.body.title);
        }

        if (req.body.description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(req.body.description);
        }

        if (req.body.dueDate !== undefined) {
            updateFields.push('dueDate = ?');
            // Format the date to YYYY-MM-DD format if it's not null
            if (req.body.dueDate) {
                // Parse the ISO date string and format it as YYYY-MM-DD
                const date = new Date(req.body.dueDate);
                const formattedDueDate = date.toISOString().split('T')[0]; // Extract just the date part
                console.log('Formatted due date in PATCH:', formattedDueDate);
                updateValues.push(formattedDueDate);
            } else {
                updateValues.push(null);
            }
        }

        if (req.body.userId !== undefined) {
            updateFields.push('userId = ?');
            updateValues.push(req.body.userId);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        // Add the ID to the values array
        updateValues.push(parseInt(req.params.id));
        
        const [result] = await pool.query(
            `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );
        console.log('Patch result:', result);

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Task not found' });
        } else {
            const [updatedTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
            console.log('Updated task:', updatedTask[0]);
            res.json(updatedTask[0]);
        }
    } catch (error) {
        console.error('Error patching task:', error);
        res.status(500).json({ error: 'Error patching task: ' + error.message });
    }
});

// Update task status
app.patch('/api/tasks/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        console.log('Updating task status:', { id: req.params.id, status });
        
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }
        
        // Set completed_at timestamp if task is being marked as completed
        let updateQuery;
        let queryParams;
        
        if (status === 'completed') {
            updateQuery = 'UPDATE tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?';
            queryParams = [status, req.params.id];
            console.log('Setting completed_at timestamp');
        } else {
            // If task is being moved from completed to another status, clear the completed_at timestamp
            updateQuery = 'UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ?';
            queryParams = [status, req.params.id];
            console.log('Clearing completed_at timestamp');
        }
        
        const [result] = await pool.query(updateQuery, queryParams);
        console.log('Status update result:', result);

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Task not found' });
        } else {
            const [updatedTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
            console.log('Updated task:', updatedTask[0]);
            res.json(updatedTask[0]);
        }
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Error updating task status: ' + error.message });
    }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        console.log('Received task deletion request:', { id: req.params.id });

        const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
        console.log('Delete result:', result);

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Task not found' });
        } else {
            res.json({ message: 'Task deleted successfully' });
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Error deleting task: ' + error.message });
    }
});

// User API Endpoints

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        console.log('Fetching all users...');
        const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users');
        console.log(`Found ${rows.length} users`);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        console.log('Fetching user:', userId);
        
        const [rows] = await pool.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error fetching user' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt:', { username });
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username/email and password are required' });
        }
        
        // First try to find user by username
        let [users] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        // If no user found by username, try email
        if (users.length === 0) {
            [users] = await pool.query(
                'SELECT * FROM users WHERE email = ?',
                [username]
            );
        }
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const user = users[0];
        
        // In a real production app, you would compare hashed passwords
        // For this demo, we'll do a simple comparison
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Don't send the password back to the client
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            message: 'Login successful',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Error during login' });
    }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, username, password, role } = req.body;
        console.log('Registration attempt:', { name, email, username, role });
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        
        // Generate a username if not provided
        const finalUsername = username || email.split('@')[0];
        
        // Check if user already exists by email
        const [existingEmailUsers] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (existingEmailUsers.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        
        // Check if username is already taken
        const [existingUsernameUsers] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [finalUsername]
        );
        
        if (existingUsernameUsers.length > 0) {
            return res.status(409).json({ error: 'Username is already taken. Please choose another.' });
        }
        
        // In a real app, you would hash the password
        const [result] = await pool.query(
            'INSERT INTO users (name, email, username, password, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, finalUsername, password, role || 'user']
        );
        
        const [newUser] = await pool.query(
            'SELECT id, name, email, username, role, created_at FROM users WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            message: 'User registered successfully',
            user: newUser[0]
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Error during registration' });
    }
});

// Update user endpoint (admin only)
app.put('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { name, email, password, role } = req.body;
        console.log('Update user request for ID:', userId);
        
        if (!name || !email || !role) {
            return res.status(400).json({ error: 'Name, email, and role are required' });
        }
        
        // Check if user exists
        const [users] = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if email is already used by another user
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE email = ? AND id != ?',
            [email, userId]
        );
        
        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Email is already used by another user' });
        }
        
        // Prevent changing the role of the last admin
        if (users[0].role === 'admin' && role !== 'admin') {
            const [adminCount] = await pool.query(
                'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
            );
            
            if (adminCount[0].count <= 1) {
                return res.status(403).json({ error: 'Cannot change the role of the last admin user' });
            }
        }
        
        // Update user with or without password
        let result;
        if (password) {
            // Update with new password
            [result] = await pool.query(
                'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?',
                [name, email, password, role, userId]
            );
        } else {
            // Update without changing password
            [result] = await pool.query(
                'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
                [name, email, role, userId]
            );
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get updated user
        const [updatedUser] = await pool.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
            [userId]
        );
        
        res.json({
            message: 'User updated successfully',
            user: updatedUser[0]
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Error updating user' });
    }
});

// Delete user endpoint (admin only)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        console.log('Delete user request for ID:', userId);
        
        // Check if user exists
        const [users] = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Prevent deleting the last admin user
        if (users[0].role === 'admin') {
            const [adminCount] = await pool.query(
                'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
            );
            
            if (adminCount[0].count <= 1) {
                return res.status(403).json({ error: 'Cannot delete the last admin user' });
            }
        }
        
        // Delete the user
        const [result] = await pool.query(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

// Define routes
app.get('/', (req, res) => {
  res.send('Task Manager API is running');
});

// Health check endpoint for Docker
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Function to clean up completed tasks after a specified retention period
async function cleanupCompletedTasks(retention = 30, unit = 'days') {
    try {
        console.log(`Running scheduled cleanup of completed tasks older than ${retention} ${unit}...`);
        
        // Calculate the cutoff date (tasks completed before this date will be deleted)
        const cutoffDate = new Date();
        
        if (unit === 'days') {
            cutoffDate.setDate(cutoffDate.getDate() - retention);
        } else if (unit === 'minutes') {
            cutoffDate.setMinutes(cutoffDate.getMinutes() - retention);
        } else if (unit === 'hours') {
            cutoffDate.setHours(cutoffDate.getHours() - retention);
        } else {
            throw new Error('Invalid time unit. Supported units are "days", "hours", and "minutes"');
        }
        
        const formattedCutoffDate = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');
        
        // Find tasks to be deleted
        const [tasksToDelete] = await pool.query(
            'SELECT id, title FROM tasks WHERE status = "completed" AND completed_at < ?',
            [formattedCutoffDate]
        );
        
        if (tasksToDelete.length === 0) {
            console.log(`No completed tasks older than ${retention} ${unit} found for deletion`);
            return;
        }
        
        console.log(`Found ${tasksToDelete.length} completed tasks to delete:`, 
            tasksToDelete.map(t => `#${t.id}: ${t.title}`).join(', '));
        
        // Delete the tasks
        const [result] = await pool.query(
            'DELETE FROM tasks WHERE status = "completed" AND completed_at < ?',
            [formattedCutoffDate]
        );
        
        console.log(`Successfully deleted ${result.affectedRows} completed tasks older than ${retention} ${unit}`);
        
        // Return deletion results for potential use by API endpoints
        return {
            deletedCount: result.affectedRows,
            tasks: tasksToDelete
        };
    } catch (error) {
        console.error('Error during task cleanup:', error);
        throw error; // Re-throw to allow handling by callers
    }
}

// Endpoint to manually trigger task cleanup with custom retention period
app.post('/api/admin/cleanup-tasks', async (req, res) => {
    try {
        const { retention, unit } = req.body;
        const retentionValue = parseInt(retention) || 30;
        const timeUnit = unit === 'minutes' ? 'minutes' : 'days';
        
        if (retentionValue < 1) {
            return res.status(400).json({ error: `Retention ${timeUnit} must be at least 1` });
        }
        
        await cleanupCompletedTasks(retentionValue, timeUnit);
        res.json({ message: `Cleanup of completed tasks older than ${retentionValue} ${timeUnit} has been triggered` });
    } catch (error) {
        console.error('Error triggering task cleanup:', error);
        res.status(500).json({ error: 'Error during task cleanup' });
    }
});

// Endpoint to configure minute-based cleanup settings
app.post('/api/admin/configure-minute-cleanup', async (req, res) => {
    try {
        const { minutes, enabled } = req.body;
        
        // Validate input
        const minutesValue = parseInt(minutes);
        if (isNaN(minutesValue) || minutesValue < 1) {
            return res.status(400).json({ error: 'Minutes must be a positive number' });
        }
        
        // Update environment variables (note: these will reset on server restart)
        process.env.MINUTES_BEFORE_CLEANUP = minutesValue.toString();
        process.env.ENABLE_MINUTE_CLEANUP = enabled ? 'true' : 'false';
        
        // Restart the job if schedule is available
        if (schedule) {
            // Cancel existing minute job if any
            const jobs = schedule.scheduledJobs;
            for (const jobName in jobs) {
                if (jobName.startsWith('minute-cleanup-')) {
                    jobs[jobName].cancel();
                    console.log(`Cancelled existing minute cleanup job: ${jobName}`);
                }
            }
            
            // Create new job if enabled
            if (enabled) {
                const jobName = `minute-cleanup-${Date.now()}`;
                const minuteCleanupJob = schedule.scheduleJob(jobName, '* * * * *', function() {
                    console.log(`Checking for completed tasks older than ${minutesValue} minutes...`);
                    cleanupCompletedTasks(minutesValue, 'minutes');
                });
                console.log(`Scheduled new minute-based cleanup job: ${jobName} (${minutesValue} minutes)`);
            }
        }
        
        res.json({ 
            message: `Minute-based cleanup settings updated`,
            settings: {
                minutes: minutesValue,
                enabled: enabled
            }
        });
    } catch (error) {
        console.error('Error configuring minute-based cleanup:', error);
        res.status(500).json({ error: 'Error configuring minute-based cleanup' });
    }
});

// Environment variables for task cleanup settings
const MINUTES_BEFORE_CLEANUP = process.env.MINUTES_BEFORE_CLEANUP || 30; // Default to 30 minutes
const ENABLE_MINUTE_CLEANUP = process.env.ENABLE_MINUTE_CLEANUP === 'true' || false; // Disabled by default

// Admin endpoint to manually trigger cleanup of completed tasks
app.post('/api/admin/cleanup-tasks', async (req, res) => {
    try {
        const { retention, unit } = req.body;

        if (!retention || !unit) {
            return res.status(400).json({ error: 'Retention value and unit are required' });
        }

        console.log(`Manual cleanup triggered: ${retention} ${unit}`);
        const threshold = calculateRetentionThreshold(retention, unit);
        const deletedCount = await deleteCompletedTasksOlderThan(threshold);

        res.json({
            success: true,
            message: `Cleanup completed: ${deletedCount} tasks deleted`,
            deletedCount
        });
    } catch (error) {
        console.error('Error in manual cleanup:', error);
        res.status(500).json({ error: 'Error during cleanup operation' });
    }
});

// Endpoint to trigger cleanup of completed tasks (for compatibility with frontend)
app.post('/api/tasks/cleanup', async (req, res) => {
    try {
        const { retentionValue, timeUnit } = req.body;

        if (!retentionValue || !timeUnit) {
            return res.status(400).json({ error: 'Retention value and time unit are required' });
        }

        console.log(`Manual cleanup triggered: ${retentionValue} ${timeUnit}`);
        const threshold = calculateRetentionThreshold(retentionValue, timeUnit);
        const deletedCount = await deleteCompletedTasksOlderThan(threshold);

        res.json({
            success: true,
            message: `Cleanup completed: ${deletedCount} tasks deleted`,
            deletedCount
        });
    } catch (error) {
        console.error('Error in manual cleanup:', error);
        res.status(500).json({ error: 'Error during cleanup operation' });
    }
});

// Initialize database and start server
initializeDatabase()
    .then(() => {
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);

            // Schedule the cleanup job after server starts
            scheduleCleanupJob();
            
            // Minute-based cleanup job - runs every minute
            if (schedule && ENABLE_MINUTE_CLEANUP) {
                const minuteCleanupJob = schedule.scheduleJob('* * * * *', function() {
                    console.log('Running minute-based task cleanup...');
                    // Use the new function for cleanup
                    const threshold = calculateRetentionThreshold(MINUTES_BEFORE_CLEANUP, 'minutes');
                    deleteCompletedTasksOlderThan(threshold)
                        .then(deletedCount => {
                            console.log(`Minute cleanup completed: ${deletedCount} tasks deleted`);
                        })
                        .catch(error => {
                            console.error('Error in minute cleanup job:', error);
                        });
                });
                console.log(`Scheduled minute-based cleanup job (${MINUTES_BEFORE_CLEANUP} minutes) has been set`);
            }
        });
    })
    .catch(err => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });
