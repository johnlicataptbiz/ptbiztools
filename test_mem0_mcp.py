import os
import json
import subprocess
import time
import sys

def main():
    print("Testing Mem0 MCP Server...")
    
    # Check if we're in the virtual environment
    if not os.environ.get('VIRTUAL_ENV'):
        print("Please run this script in the virtual environment where mem0-mcp-server is installed.")
        print("Activate with: source .venv/bin/activate")
        sys.exit(1)
    
    # Start the MCP server in the background
    print("Starting Mem0 MCP server...")
    server_process = subprocess.Popen(
        ["mem0-mcp-server"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Give the server a moment to start
    time.sleep(2)
    
    # Check if the server started successfully
    if server_process.poll() is not None:
        stdout, stderr = server_process.communicate()
        print("Failed to start MCP server:")
        print(f"STDOUT: {stdout}")
        print(f"STDERR: {stderr}")
        sys.exit(1)
    
    print("MCP server started successfully!")
    
    # Create a simple client to interact with the server
    try:
        # Add a memory
        print("\nAdding a memory...")
        add_memory_request = {
            "tool": "add_memory",
            "parameters": {
                "text": "This is a test memory created to demonstrate the Mem0 MCP server capabilities.",
                "tags": ["test", "demo"]
            }
        }
        
        # Use curl to send the request to the MCP server
        add_result = subprocess.run(
            ["curl", "-s", "http://localhost:8081/mcp", 
             "-H", "Content-Type: application/json",
             "-d", json.dumps(add_memory_request)],
            capture_output=True,
            text=True
        )
        
        if add_result.returncode == 0:
            print("Memory added successfully!")
            print(f"Response: {add_result.stdout}")
            
            # Parse the memory ID from the response
            try:
                response_data = json.loads(add_result.stdout)
                memory_id = response_data.get("memory_id")
                
                if memory_id:
                    # Search for the memory
                    print("\nSearching for the memory...")
                    search_request = {
                        "tool": "search_memories",
                        "parameters": {
                            "query": "test memory",
                            "limit": 5
                        }
                    }
                    
                    search_result = subprocess.run(
                        ["curl", "-s", "http://localhost:8081/mcp", 
                         "-H", "Content-Type: application/json",
                         "-d", json.dumps(search_request)],
                        capture_output=True,
                        text=True
                    )
                    
                    if search_result.returncode == 0:
                        print("Memory search successful!")
                        print(f"Search results: {search_result.stdout}")
                    else:
                        print(f"Failed to search memory: {search_result.stderr}")
                else:
                    print("Could not extract memory_id from response")
            except json.JSONDecodeError:
                print(f"Failed to parse response: {add_result.stdout}")
        else:
            print(f"Failed to add memory: {add_result.stderr}")
    
    finally:
        # Terminate the server
        print("\nStopping MCP server...")
        server_process.terminate()
        server_process.wait()
        print("MCP server stopped.")

if __name__ == "__main__":
    main()
