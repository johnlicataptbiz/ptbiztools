'use client';

import { useState } from 'react';
import { useMem0, Mem0Memory } from '@/hooks/useMem0';

export default function Mem0Example() {
  const { addMemory, searchMemories, isLoading, error } = useMem0();
  const [memoryText, setMemoryText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [memories, setMemories] = useState<Mem0Memory[]>([]);

  const handleAddMemory = async () => {
    if (!memoryText.trim()) return;
    
    try {
      await addMemory(memoryText, ['user_preference', 'demo']);
      setMemoryText('');
      alert('Memory added successfully!');
    } catch {
      alert('Failed to add memory');
    }
  };

  const handleSearchMemories = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await searchMemories(searchQuery, 5) as { result?: { result?: string } };
      const results = JSON.parse(response.result?.result || '{}');
      setMemories(results.results || []);
    } catch {
      alert('Failed to search memories');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Mem0 Memory Demo</h1>
      
      {/* Add Memory Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Add Memory</h2>
        <textarea
          value={memoryText}
          onChange={(e) => setMemoryText(e.target.value)}
          placeholder="Enter a memory to save..."
          className="w-full p-3 border rounded-lg mb-4"
          rows={3}
        />
        <button
          onClick={handleAddMemory}
          disabled={isLoading || !memoryText.trim()}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Adding...' : 'Add Memory'}
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {/* Search Memories Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Search Memories</h2>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for memories..."
          className="w-full p-3 border rounded-lg mb-4"
        />
        <button
          onClick={handleSearchMemories}
          disabled={isLoading || !searchQuery.trim()}
          className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Display Results */}
      {memories.length > 0 && (
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          <ul className="space-y-3">
            {memories.map((memory, index) => (
              <li key={index} className="p-3 bg-gray-50 rounded">
                <p className="text-gray-800">{memory.text}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Created: {new Date(memory.created_at).toLocaleString()}
                </p>
                {memory.tags && memory.tags.length > 0 && (
                  <div className="mt-2">
                    {memory.tags.map((tag: string, tagIndex: number) => (
                      <span
                        key={tagIndex}
                        className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
