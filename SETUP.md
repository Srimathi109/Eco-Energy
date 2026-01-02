# Eco-Energy Application - Setup Guide

## Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- Python 3.x (for local server) OR Node.js (alternative)
- Internet connection (for Firebase services)

## Quick Start

### Option 1: Using Python HTTP Server (Recommended)

1. **Navigate to the firebase-login directory:**
   ```bash
   cd firebase-login
   ```

2. **Start a local web server:**
   ```bash
   # Python 3
   python3 -m http.server 8000
   
   # OR if python3 is not available, try:
   python -m http.server 8000
   ```

3. **Open your browser and visit:**
   ```
   http://localhost:8000
   ```

4. **Start with the login page:**
   ```
   http://localhost:8000/index.html
   ```

### Option 2: Using Node.js HTTP Server

1. **Install http-server globally (if not installed):**
   ```bash
   npm install -g http-server
   ```

2. **Navigate to the firebase-login directory:**
   ```bash
   cd firebase-login
   ```

3. **Start the server:**
   ```bash
   http-server -p 8000
   ```

4. **Open your browser:**
   ```
   http://localhost:8000
   ```

### Option 3: Using PHP Built-in Server

1. **Navigate to the firebase-login directory:**
   ```bash
   cd firebase-login
   ```

2. **Start PHP server:**
   ```bash
   php -S localhost:8000
   ```

3. **Open your browser:**
   ```
   http://localhost:8000
   ```

## Application Pages

Once the server is running, you can access:

- **Login Page:** `http://localhost:8000/index.html`
- **Sign Up Page:** `http://localhost:8000/signup.html`
- **Dashboard:** `http://localhost:8000/dashboard.html` (requires login)
- **Calculate:** `http://localhost:8000/calculate.html` (requires login)
- **Analytics:** `http://localhost:8000/analytics.html` (requires login)
- **History:** `http://localhost:8000/history.html` (requires login)
- **AI Insights:** `http://localhost:8000/ai-insights.html` (requires login)

## First Time Setup

1. **Create an account:**
   - Go to the Sign Up page
   - Enter your email and password
   - Or use "Sign up with Google"

2. **Login:**
   - Use your credentials to log in
   - You'll be redirected to the dashboard

3. **Start using the app:**
   - Navigate to "Calculate" to enter energy data manually
   - View analytics and insights on the respective pages

## Firebase Configuration

The application is already configured with Firebase:
- **Project ID:** ecoenergy-eb878
- **Auth Domain:** ecoenergy-eb878.firebaseapp.com

**Note:** The Firebase configuration is already set up in `app.js`. If you need to use your own Firebase project, update the configuration in `app.js`.

## Optional: Arduino/ESP32 Setup

If you want to use the Arduino component for automatic data collection:

1. **Hardware Required:**
   - ESP32 or compatible Arduino board
   - WiFi connection

2. **Setup:**
   - Copy the code from `computer_lab.txt`
   - Update WiFi credentials in the code:
     ```cpp
     const char* ssid = "YOUR_WIFI_SSID";
     const char* password = "YOUR_WIFI_PASSWORD";
     ```
   - Upload to your ESP32 board
   - The device will automatically send energy data every 10 seconds

3. **Important:** Make sure a user is logged in first, as the Arduino fetches the user UID from Firebase.

## Troubleshooting

### CORS Errors
- Make sure you're running the app through a web server (not opening HTML files directly)
- Use `localhost` or `127.0.0.1` (Firebase works with localhost)

### Firebase Authentication Errors
- Check your internet connection
- Verify Firebase project is active
- Check browser console for specific error messages

### Charts Not Displaying
- Ensure Chart.js CDN is loading (check browser console)
- Check internet connection for CDN resources

### AI Insights Not Working
- Verify Google Generative AI API key is valid
- Check browser console for API errors
- Ensure you have data in Firestore to analyze

## Stopping the Server

Press `Ctrl + C` in the terminal where the server is running.

## Production Deployment

For production, you can deploy to:
- **Firebase Hosting:** `firebase deploy`
- **GitHub Pages:** Push to GitHub and enable Pages
- **Netlify/Vercel:** Connect your repository
- **Any static hosting service**

Make sure to configure Firebase security rules for production use.


