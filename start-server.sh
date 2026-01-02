#!/bin/bash

# Eco-Energy Application Server Startup Script

echo "==================================="
echo "  Eco-Energy Application Server"
echo "==================================="
echo ""

# Check if we're in the right directory
if [ ! -f "firebase-login/index.html" ]; then
    echo "Error: Please run this script from the Eco-Energy project root directory"
    exit 1
fi

# Navigate to firebase-login directory
cd firebase-login

# Check for Python 3
if command -v python3 &> /dev/null; then
    echo "Starting Python HTTP server on port 8000..."
    echo "Open your browser to: http://localhost:8000"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    python3 -m http.server 8000
# Check for Python 2
elif command -v python &> /dev/null; then
    echo "Starting Python HTTP server on port 8000..."
    echo "Open your browser to: http://localhost:8000"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    python -m SimpleHTTPServer 8000
# Check for Node.js http-server
elif command -v http-server &> /dev/null; then
    echo "Starting Node.js http-server on port 8000..."
    echo "Open your browser to: http://localhost:8000"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    http-server -p 8000
# Check for PHP
elif command -v php &> /dev/null; then
    echo "Starting PHP server on port 8000..."
    echo "Open your browser to: http://localhost:8000"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    php -S localhost:8000
else
    echo "Error: No suitable server found!"
    echo ""
    echo "Please install one of the following:"
    echo "  - Python 3: sudo apt-get install python3"
    echo "  - Node.js: https://nodejs.org/"
    echo "  - PHP: sudo apt-get install php"
    echo ""
    echo "Or manually start a server in the firebase-login directory"
    exit 1
fi

