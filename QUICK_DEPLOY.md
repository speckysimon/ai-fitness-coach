# Quick Deploy Reference Card

**Choose your deployment method:**

---

## 🖥️ Option 1: Development (Windsurf on Another Computer)

```bash
git clone https://github.com/speckysimon/ai-fitness-coach.git
cd ai-fitness-coach
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
```

**Access:** http://localhost:5173

---

## 🥧 Option 2: Raspberry Pi (Automated)

```bash
# On your Raspberry Pi
git clone https://github.com/speckysimon/ai-fitness-coach.git
cd ai-fitness-coach
./scripts/setup-pi.sh
# Edit .env with your API keys
sudo systemctl start ai-fitness-coach
```

**Access:** http://your-pi-ip:5000

---

## 🐳 Option 3: Docker (Any Platform)

```bash
git clone https://github.com/speckysimon/ai-fitness-coach.git
cd ai-fitness-coach
cp .env.example .env
# Edit .env with your API keys
npm run docker:build
npm run docker:run
```

**Access:** http://localhost:5000

---

## 🔑 Required API Keys

Get these before deploying:

1. **Strava:** https://www.strava.com/settings/api
2. **OpenAI:** https://platform.openai.com/api-keys
3. **Session Secret:** Run `openssl rand -hex 32`

Add them to your `.env` file.

---

## 📚 Full Documentation

- **Complete Guide:** `DEPLOYMENT.md`
- **Docker Guide:** `DOCKER_DEPLOYMENT.md`
- **Checklist:** `DEPLOYMENT_CHECKLIST.md`
- **Overview:** `PACKAGING_SUMMARY.md`

---

## 🆘 Quick Troubleshooting

**Service won't start?**
```bash
sudo journalctl -u ai-fitness-coach -n 50
```

**Port already in use?**
```bash
sudo lsof -i :5000
```

**Check health:**
```bash
curl http://localhost:5000/api/health
```

---

**That's it! Pick your method and deploy in minutes.** 🚀
