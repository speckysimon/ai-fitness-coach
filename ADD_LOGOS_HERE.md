# 🎨 Add Logo Files

Please add the following PNG files to the `/public` directory:

## Required Files:

1. **`/public/logo.png`** - Full logo with "RiderLabs" text (first image you provided)
2. **`/public/favicon.png`** - Icon-only logo (second image you provided)

## Steps:

1. Save the first image (with text) as `logo.png`
2. Save the second image (icon only) as `favicon.png`  
3. Copy both files to: `/Users/simonosx/CascadeProjects/ai-fitness-coach/public/`

## After Adding:

Run these commands to deploy:

```bash
cd ~/CascadeProjects/ai-fitness-coach
git add public/logo.png public/favicon.png
git commit -m "Add RiderLabs PNG logos"
git push origin main

# Then deploy to server
ssh root@riderlabs.io
su - riderlabs
cd ~/ai-fitness-coach
./QUICK_DEPLOY.sh
```

---

**Note**: The code has already been updated to use `.png` files instead of `.svg`
