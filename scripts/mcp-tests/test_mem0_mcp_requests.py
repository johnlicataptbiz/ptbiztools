import requests
import json
import sys

def main():
    print("Testing Mem0 MCP Server with requests...")
    
    # MCP server endpoint
    mcp_url = "http://localhost:8081/mcp"
    
    # Add a memory
    print("\nAdding a memory...")
    add_memory_request = {
        "tool": "add_memory",
        "parameters": {
            "text": "This is a test memory created to demonstrate the Mem0 MCP server capabilities.",
            "tags": ["test", "demo"]
        }
    }
    
    try:
        add_response = requests.post(
            mcp_url,
            headers={"Content-Type": "application/json"},
            json=add_memory_request
        )
        
        if add_response.status_code == 200:
            add_result = add_response.json()
            print("Memory added successfully!")
            print(f"Response: {json.dumps(add_result, indent=2)}")
            
            memory_id = add_result.get("memory_id")
            
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
                
                search_response = requests.post(
                    mcp_url,
                    headers={"Content-Type": "application/json"},
                    json=search_request
                )
                
                if search_response.status_code == 200:
                    search_result = search_response.json()
                    print("Memory search successful!")
                    print(f"Search results: {json.dumps(search_result, indent=2)}")
                else:
                    print(f"Failed to search memory: {search_response.text}")
                    print(f"Status code: {search_response.status_code}")
            else:
                print("Could not extract memory_id from response")
        else:
            print(f"Failed to add memory: {add_response.text}")
            print(f"Status code: {add_response.status_code}")
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
