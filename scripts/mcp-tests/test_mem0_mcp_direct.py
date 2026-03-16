import subprocess
import json
import sys
import os

def send_request(process, request):
    """Send a JSON-RPC request to the MCP server."""
    request_json = json.dumps(request)
    process.stdin.write(request_json + "\n")
    process.stdin.flush()
    
    # Read the response
    response_line = process.stdout.readline()
    return json.loads(response_line)

def main():
    print("Testing Mem0 MCP Server with direct MCP protocol...")
    
    # Start the MCP server
    print("Starting Mem0 MCP server...")
    env = {
        "MEM0_API_KEY": "m0-d9UBw839tmNCpej40X3wurtLJR2zRS4wHVad1FnK",
        "MEM0_DEFAULT_USER_ID": "mem0-mcp"
    }
    
    server_process = subprocess.Popen(
        [".venv/bin/mem0-mcp-server"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env={**env, **dict(os.environ)}
    )
    
    try:
        # Initialize the MCP connection
        print("Initializing MCP connection...")
        init_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }
        
        init_response = send_request(server_process, init_request)
        print(f"Initialization response: {json.dumps(init_response, indent=2)}")
        
        # List available tools
        print("\nListing available tools...")
        list_tools_request = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {}
        }
        
        tools_response = send_request(server_process, list_tools_request)
        print(f"Available tools: {json.dumps(tools_response, indent=2)}")
        
        # Add a memory
        print("\nAdding a memory...")
        add_memory_request = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "add_memory",
                "arguments": {
                    "text": "This is a test memory created to demonstrate the Mem0 MCP server capabilities.",
                    "tags": ["test", "demo"]
                }
            }
        }
        
        add_response = send_request(server_process, add_memory_request)
        print(f"Add memory response: {json.dumps(add_response, indent=2)}")
        
        # Search for memories
        print("\nSearching for memories...")
        search_request = {
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {
                "name": "search_memories",
                "arguments": {
                    "query": "test memory",
                    "limit": 5
                }
            }
        }
        
        search_response = send_request(server_process, search_request)
        print(f"Search memories response: {json.dumps(search_response, indent=2)}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Terminate the server
        print("\nStopping MCP server...")
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
        print("MCP server stopped.")

if __name__ == "__main__":
    main()
