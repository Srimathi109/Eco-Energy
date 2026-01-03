# Deployment Guide - Eco-Energy App

This guide provides deployment options for the Eco-Energy application. Since this is a static web application, you have several deployment options that don't require Node.js at runtime.

## Deployment Options

### Option 1: Firebase Hosting (Recommended)

Your Firebase project is already configured: `ecoenergy-eb878`

#### Method A: Using Firebase Console (No Local Node.js Required)

1. **Prepare your files:**
   - All files are already in the `firebase-login` directory (this is your public folder)
   - Configuration files (`firebase.json` and `.firebaserc`) are ready

2. **Deploy via Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `ecoenergy-eb878`
   - Go to "Hosting" in the left menu
   - Click "Get Started" if you haven't set up hosting yet
   - Use the Firebase Console to upload your `firebase-login` folder contents
   - Or connect a GitHub repository and deploy from there

#### Method B: One-time Firebase CLI Setup (Optional)

If you want to use Firebase CLI for easier deployments:

```bash
# One-time installation (requires Node.js temporarily)
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy --only hosting
```

### Option 2: GitHub Pages (No Node.js Required)

1. **Create a GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Select source branch (main/master)
   - Select folder: `/firebase-login`
   - Your app will be available at: `https://<username>.github.io/<repo-name>/`

**Note:** Update Firebase Auth domain to allow your GitHub Pages domain.

### Option 3: Netlify Drop (No Node.js Required)

1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag and drop your `firebase-login` folder
3. Your app will be deployed instantly
4. Update Firebase Auth domain to allow your Netlify domain

### Option 4: Vercel (No Node.js Required)

1. Go to [Vercel](https://vercel.com/)
2. Sign up/login
3. Click "New Project"
4. Import your repository or upload `firebase-login` folder
5. Set root directory to `firebase-login`
6. Deploy

### Option 5: Any Static Web Hosting Service

Since this is a pure static web application, you can deploy to:
- Any web server (Apache, Nginx)
- AWS S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps
- Any other static hosting provider

## Important: Firebase Configuration

After deploying, you may need to update Firebase Authentication settings:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `ecoenergy-eb878`
3. Go to Authentication → Settings → Authorized domains
4. Add your deployment domain (e.g., `your-app.netlify.app`, `your-app.vercel.app`)

## Current Firebase Configuration

- **Project ID:** ecoenergy-eb878
- **Auth Domain:** ecoenergy-eb878.firebaseapp.com
- **Public Folder:** firebase-login

## Testing Your Deployment

After deployment, test these features:
1. User signup and login
2. Dashboard data loading
3. Energy calculation and saving
4. Analytics charts
5. History viewing
6. AI insights (requires valid Google Generative AI API key)

## Security Note

Your Google Generative AI API key is currently in the code. For production:
- Consider using Firebase Functions as a proxy
- Or restrict the API key in Google Cloud Console to only allow requests from your domain
- Set usage quotas to prevent abuse

## Quick Deploy Checklist

- [ ] All files are in `firebase-login` directory
- [ ] Firebase configuration in `app.js` is correct
- [ ] Test locally using `start-server.sh`
- [ ] Choose deployment method
- [ ] Update Firebase authorized domains
- [ ] Test deployed application
- [ ] Verify all features work correctly

