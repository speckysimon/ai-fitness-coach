# 🚀 Quick Run Commands

Essential terminal commands to get the AI Fitness Coach app up and running.

## Full Command (Copy & Paste)

### First Time Setup
```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach && npm install && npm run dev
```

### Regular Start
```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach && npm run dev
```

## Available Commands

### Install Dependencies
```bash
npm install
```
Install all required npm packages (only needed once or after pulling updates).

### Start Development Server (Recommended)
```bash
npm run dev
```
Runs both backend (port 5001) and frontend (port 3000) concurrently. This is the main command you'll use.

### Start Backend Only
```bash
npm run server
```
Run only the Express server on port 5001.

### Start Frontend Only
```bash
npm run client
```
Run only the Vite dev server on port 3000.

### Build for Production
```bash
npm run build
```
Create optimized production build.

### Preview Production Build
```bash
npm run preview
```
Preview the production build locally.

### Lint Code
```bash
npm run lint
```
Check code for linting errors.

## Quick Start Steps

1. **Navigate to project directory**
   ```bash
   cd /Users/simonosx/CascadeProjects/ai-fitness-coach
   ```

2. **Install dependencies** (first time only)
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Make sure `.env` file exists and is configured with your API keys
   - See `SETUP_GUIDE.md` for details on getting API credentials

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5001

## Important Notes

- **Backend runs on port 5001**, Frontend on **port 3000**
- Make sure your `.env` file is configured before starting
- Use `npm run dev` for development (recommended)
- Check `SETUP_GUIDE.md` for detailed setup instructions
- If ports are in use, you may need to kill existing processes or change ports in `.env`

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 5001
lsof -ti:5001 | xargs kill -9

# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Clear Cache and Restart
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Check if Services are Running
```bash
# Check port 5001 (backend)
lsof -i :5001

# Check port 3000 (frontend)
lsof -i :3000
```

---

**For detailed setup instructions, see `SETUP_GUIDE.md`**
