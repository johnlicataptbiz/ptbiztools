#!/usr/bin/env python3
"""
Test script to demonstrate Playwright MCP server capabilities.
This script connects to the Playwright MCP server and demonstrates its tools.
"""

import subprocess
import json
import sys

def send_request(request):
    """Send a JSON-RPC request to the MCP server."""
    request_json = json.dumps(request)
    print(f"\n>>> Sending request: {request_json}")
    
    try:
        process = subprocess.Popen(
            ["npx", "@playwright/mcp@latest"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(input=request_json + "\n", timeout=10)
        
        if stdout:
            print(f"<<< Response: {stdout}")
            try:
                return json.loads(stdout)
            except json.JSONDecodeError:
                return {"raw_output": stdout}
        
        if stderr:
            print(f"<<< Error: {stderr}")
            return {"error": stderr}
            
    except subprocess.TimeoutExpired:
        process.kill()
        return {"error": "Request timed out"}
    except Exception as e:
        return {"error": str(e)}

def main():
    print("=" * 60)
    print("Playwright MCP Server Test")
    print("=" * 60)
    
    # Test 1: Initialize connection
    print("\n1. Initializing MCP connection...")
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
    
    response = send_request(init_request)
    print(f"Initialize response: {json.dumps(response, indent=2)}")
    
    # Test 2: List available tools
    print("\n2. Listing available tools...")
    tools_request = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list"
    }
    
    response = send_request(tools_request)
    if "result" in response and "tools" in response["result"]:
        tools = response["result"]["tools"]
        print(f"\nFound {len(tools)} tools:")
        for tool in tools[:10]:  # Show first 10 tools
            print(f"  - {tool['name']}: {tool.get('description', 'No description')}")
        if len(tools) > 10:
            print(f"  ... and {len(tools) - 10} more tools")
    else:
        print(f"Tools list response: {json.dumps(response, indent=2)}")
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()
