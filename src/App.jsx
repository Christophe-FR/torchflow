import React, { useState, useCallback } from 'react';
import { ReactFlow, addEdge, Background, Handle, useNodesState, useEdgesState } from '@xyflow/react';
import axios from 'axios';

import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [response, setResponse] = useState(null);

  const onConnect = useCallback((params) => {
    const updatedEdges = addEdge(params, edges);
    setEdges(updatedEdges);
  }, [edges]);

  const sendDataToBackend = () => {
    const flowData = {
      nodes: nodes.map((node) => ({
        id: node.id,
        label: node.data.label,
        type: node.type || 'default',
      })),
      edges: edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
      })),
    };

    axios.post('http://127.0.0.1:8000/api/operation', flowData, {
      headers: {
        'Content-Type': 'application/json',
      }
    })
    .then((res) => {
      console.log('Response:', res.data);
      setResponse(res.data.result.message); // Use the "message" property directly
    })
    .catch((error) => {
      console.error('Error:', error);
      setResponse('An error occurred while sending data to the backend.');
    });
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
      </ReactFlow>
      <button onClick={sendDataToBackend} style={{ position: 'absolute', top: 10, left: 10 }}>Send Data to Backend</button>
      {response && <p style={{ position: 'absolute', top: 50, left: 10 }}>Backend Response: {response}</p>}
    </div>
  );
}

export default App;