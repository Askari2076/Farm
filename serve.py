import http.server
import socketserver
import webbrowser
import sys

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

class CustomHandler(Handler):
    # Quiet server logs to keep terminal clean
    def log_message(self, format, *args):
        pass

print("-" * 55)
print(f"Farm House Expense Tracker local server is launching...")
print(f"Serving at: http://localhost:{PORT}")
print("-" * 55)

try:
    # Set up reuse address so the port clears quickly on restart
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), CustomHandler) as httpd:
        # Open in default system browser
        webbrowser.open(f"http://localhost:{PORT}")
        print("Press Ctrl+C in this terminal window to stop the server.")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped. Have a wonderful Farm House event!")
    sys.exit(0)
except Exception as e:
    print(f"\nError launching server: {e}")
    sys.exit(1)
