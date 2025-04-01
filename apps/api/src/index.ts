// apps/api/src/index.ts
import express, { Request, Response, NextFunction } from 'express';

// Import types and functions from the shared workspace packages.
import type { User } from '@gemwallet/types';
import { performSwap, greetUser } from '@gemwallet/swapper';

// Create an Express application instance.
const app = express();
// Define the port the server will listen on. Use environment variable or default.
const port = process.env.PORT || 3000;

// --- Middleware ---
// Enable parsing of JSON request bodies.
app.use(express.json());

// Basic logging middleware (example)
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next(); // Pass control to the next middleware or route handler
});

// --- Routes ---
// Root route handler.
app.get('/', (req: Request, res: Response) => {
    // Example usage of a shared function.
    const apiUser: User = { id: 'api-001', name: 'API Guest' };
    res.status(200).send(`✅ API Operational. ${greetUser(apiUser)}`);
});

// Route to demonstrate using the 'swapper' package.
app.post('/api/swap', (req: Request, res: Response) => {
    // It's crucial to validate request body in real applications.
    const { user1, user2 } = req.body;

    // Basic validation
    if (!user1 || !user2 || typeof user1 !== 'object' || typeof user2 !== 'object' || !user1.id || !user1.name || !user2.id || !user2.name) {
        console.warn('Swap request rejected due to missing/invalid user data.');
        return res.status(400).json({
            success: false,
            message: 'Bad Request: Both user1 and user2 objects with id and name are required in the request body.'
        });
    }

    try {
        // Use the imported function from the shared package.
        // Ensure the objects conform to the User type (TypeScript helps here).
        const result = performSwap(user1 as User, user2 as User);
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        console.error('Error during swap operation:', error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error during swap operation.'
        });
    }
});

// --- Error Handling ---
// Catch-all for 404 Not Found errors.
app.use((req: Request, res: Response) => {
    res.status(404).json({ message: 'Resource not found' });
});

// Basic global error handler.
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled Error:", err.stack || err);
    res.status(500).json({ message: 'Internal Server Error' });
});


// --- Server Activation ---
// Start the Express server and listen on the defined port.
app.listen(port, () => {
    console.log(`🚀 API server running at http://localhost:${port}`);
    console.log(`Current time in Tokyo: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })}`);
});

