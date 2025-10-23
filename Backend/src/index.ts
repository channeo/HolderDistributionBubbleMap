import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import tokenRoutes from '../src/routes/tokenRoutes';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api', tokenRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

const port = 3000;
app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));