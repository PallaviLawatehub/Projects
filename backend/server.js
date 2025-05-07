require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

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
                    password VARCHAR(100) NOT NULL,
                    role ENUM('user', 'admin') DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Users table created successfully');
            
            // Insert default users
            await pool.query(`
                INSERT INTO users (name, email, password, role) VALUES
                ('John Doe', 'john@example.com', 'password123', 'admin'),
                ('Jane Smith', 'jane@example.com', 'password123', 'user'),
                ('Alex Johnson', 'alex@example.com', 'password123', 'user'),
                ('Sam Wilson', 'sam@example.com', 'password123', 'user')
            `);
            console.log('Default users created successfully');
        } else {
            console.log('Users table already exists');
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
                    assignee VARCHAR(100),
                    dueDate DATE,
                    userId INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
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
        const requiredColumns = ['id', 'title', 'description', 'status', 'priority', 'assignee', 'dueDate', 'userId', 'created_at'];
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
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
        const { title, description, status, priority, assignee, dueDate, userId } = req.body;
        console.log('Received task creation request:', req.body);

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const [result] = await pool.query(
            `INSERT INTO tasks (
                title, 
                description, 
                status, 
                priority, 
                assignee, 
                dueDate, 
                userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                description || '',
                status || 'pending',
                priority || 'medium',
                assignee || null,
                dueDate || null,
                userId || null
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
            filters.push('(title LIKE ? OR description LIKE ?)');
            const searchTerm = `%${req.query.search}%`;
            queryParams.push(searchTerm, searchTerm);
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
            filters.push('(title LIKE ? OR description LIKE ?)');
            const searchTerm = `%${req.query.search}%`;
            queryParams.push(searchTerm, searchTerm);
        }
        
        if (req.query.status) {
            filters.push('status = ?');
            queryParams.push(req.query.status);
        }
        
        if (req.query.priority) {
            filters.push('priority = ?');
            queryParams.push(req.query.priority);
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
        const { title, description, status, priority, assignee, dueDate, userId } = req.body;
        console.log('Received task update request:', { id: req.params.id, ...req.body });

        const [result] = await pool.query(
            `UPDATE tasks SET 
                title = ?, 
                description = ?, 
                status = ?, 
                priority = ?, 
                assignee = ?, 
                dueDate = ?, 
                userId = ? 
            WHERE id = ?`,
            [
                title,
                description || '',
                status || 'pending',
                priority || 'medium',
                assignee || null,
                dueDate || null,
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
            updateValues.push(req.body.dueDate);
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
        const { email, password } = req.body;
        console.log('Login attempt:', { email });
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // In a real app, you would use proper password hashing
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Don't send password back to client
        delete user.password;
        
        res.json({
            message: 'Login successful',
            user
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Error during login' });
    }
});

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        console.log('Registration attempt:', { name, email, role });
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        
        // Check if user already exists
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }
        
        // In a real app, you would hash the password
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, password, role || 'user']
        );
        
        const [newUser] = await pool.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
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

// Initialize database and start server
initializeDatabase().then(() => {
    // Explicitly use port 3000 to match frontend expectations
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
