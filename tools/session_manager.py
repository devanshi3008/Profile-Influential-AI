import os
import argparse
from playwright.sync_api import sync_playwright

SESSION_DIR = "session"
SESSION_FILE = os.path.join(SESSION_DIR, "session.json")

def create_session():
    """Opens a visible browser for manual login and saves the session."""
    os.makedirs(SESSION_DIR, exist_ok=True)
    print("Opening browser for manual LinkedIn login. Please log in.")
    print("Once logged in and on the feed page (or if you see successful auth), close the browser or press Ctrl+C here.")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        page.goto("https://www.linkedin.com/login")
        
        try:
            # Wait for user to log in and reach the feed
            page.wait_for_url("https://www.linkedin.com/feed/*", timeout=0)
            print("Login detected! Saving session...")
            context.storage_state(path=SESSION_FILE)
            print(f"Session saved successfully to {SESSION_FILE}")
        except KeyboardInterrupt:
            print("\nInterrupted by user. Saving current session state...")
            context.storage_state(path=SESSION_FILE)
            print(f"Session saved to {SESSION_FILE}")
        except Exception as e:
            print(f"Error occurred: {e}")
            try:
                context.storage_state(path=SESSION_FILE)
                print(f"Saved current state before exiting to {SESSION_FILE}")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LinkedIn Session Manager")
    parser.add_argument("--login", action="store_true", help="Open browser to login and save session.")
    args = parser.parse_args()
    
    if args.login:
        create_session()
    else:
        print("Run with --login to create a new session.")
