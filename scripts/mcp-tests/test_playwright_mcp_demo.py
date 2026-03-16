#!/usr/bin/env python3
"""
Comprehensive demonstration of Playwright MCP server capabilities.
This script connects to the Playwright MCP server and demonstrates browser automation.
"""

import subprocess
import json
import sys
import time

class PlaywrightMCPClient:
    def __init__(self):
        self.process = None
        self.request_id = 0
        
    def connect(self):
        """Start the MCP server process."""
        print("Starting Playwright MCP server...")
        self.process = subprocess.Popen(
            ["npx", "@playwright/mcp@latest"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=0
        )
        time.sleep(2)  # Give server time to start
        print("Server started!")
        
    def send_request(self, method, params=None):
        """Send a JSON-RPC request to the MCP server."""
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method
        }
        if params:
            request["params"] = params
            
        request_json = json.dumps(request)
        print(f"\n>>> {method}")
        print(f"    {json.dumps(params, indent=4) if params else '{}'}")
        
        try:
            self.process.stdin.write(request_json + "\n")
            self.process.stdin.flush()
            
            # Read response
            response_line = ""
            while True:
                char = self.process.stdout.read(1)
                if not char:
                    break
                response_line += char
                if char == "\n":
                    break
            
            response = json.loads(response_line.strip())
            
            if "result" in response:
                print(f"<<< Success")
                if response["result"]:
                    print(f"    {json.dumps(response['result'], indent=4)[:200]}")
                return response["result"]
            elif "error" in response:
                print(f"<<< Error: {response['error']}")
                return None
            else:
                print(f"<<< Response: {json.dumps(response, indent=4)[:200]}")
                return response
                
        except Exception as e:
            print(f"<<< Exception: {e}")
            return None
            
    def initialize(self):
        """Initialize the MCP connection."""
        print("\n" + "="*60)
        print("Initializing MCP connection...")
        print("="*60)
        return self.send_request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "playwright-demo",
                "version": "1.0.0"
            }
        })
        
    def list_tools(self):
        """List all available tools."""
        print("\n" + "="*60)
        print("Listing available tools...")
        print("="*60)
        result = self.send_request("tools/list")
        if result and "tools" in result:
            tools = result["tools"]
            print(f"\nFound {len(tools)} tools:")
            for i, tool in enumerate(tools, 1):
                print(f"  {i}. {tool['name']}")
                print(f"     {tool.get('description', 'No description')[:80]}")
            return tools
        return []
        
    def navigate(self, url):
        """Navigate to a URL."""
        print("\n" + "="*60)
        print(f"Navigating to {url}...")
        print("="*60)
        return self.send_request("tools/call", {
            "name": "browser_navigate",
            "arguments": {"url": url}
        })
        
    def take_snapshot(self):
        """Take an accessibility snapshot of the page."""
        print("\n" + "="*60)
        print("Taking page snapshot...")
        print("="*60)
        result = self.send_request("tools/call", {
            "name": "browser_snapshot",
            "arguments": {}
        })
        if result and "content" in result:
            # Display a preview of the snapshot
            content = result["content"][0].get("text", "")
            lines = content.split("\n")
            print(f"\nSnapshot preview (first 30 lines of {len(lines)} total):")
            print("-" * 60)
            for line in lines[:30]:
                print(line)
            if len(lines) > 30:
                print(f"\n... ({len(lines) - 30} more lines)")
        return result
        
    def take_screenshot(self):
        """Take a screenshot of the page."""
        print("\n" + "="*60)
        print("Taking screenshot...")
        print("="*60)
        return self.send_request("tools/call", {
            "name": "browser_take_screenshot",
            "arguments": {"type": "png", "filename": "demo-screenshot.png"}
        })
        
    def evaluate_js(self, code):
        """Evaluate JavaScript on the page."""
        print("\n" + "="*60)
        print("Evaluating JavaScript...")
        print("="*60)
        print(f"Code: {code}")
        return self.send_request("tools/call", {
            "name": "browser_evaluate",
            "arguments": {"function": code}
        })
        
    def close(self):
        """Close the browser."""
        print("\n" + "="*60)
        print("Closing browser...")
        print("="*60)
        return self.send_request("tools/call", {
            "name": "browser_close",
            "arguments": {}
        })
        
    def disconnect(self):
        """Close the MCP connection."""
        if self.process:
            print("\nClosing MCP connection...")
            self.process.terminate()
            self.process.wait()
            print("Connection closed!")

def main():
    client = PlaywrightMCPClient()
    
    try:
        # Connect to server
        client.connect()
        
        # Initialize
        client.initialize()
        
        # List tools
        tools = client.list_tools()
        
        # Navigate to example.com
        client.navigate("https://example.com")
        
        # Take a snapshot
        client.take_snapshot()
        
        # Evaluate some JavaScript
        client.evaluate_js("() => { return { title: document.title, url: window.location.href }; }")
        
        # Take a screenshot
        client.take_screenshot()
        
        # Close browser
        client.close()
        
        print("\n" + "="*60)
        print("Demo completed successfully!")
        print("="*60)
        print("\nFiles created:")
        print("  - demo-screenshot.png")
        
    except KeyboardInterrupt:
        print("\nDemo interrupted by user")
    except Exception as e:
        print(f"\nError during demo: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.disconnect()

if __name__ == "__main__":
    main()
