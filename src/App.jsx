import React, { useState, useCallback, useEffect } from 'react';
import { ReactFlow, addEdge, Background, Handle, useNodesState, useEdgesState } from '@xyflow/react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import '@xyflow/react/dist/style.css';

const initialNodes = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: { label: 'Node 1' },
    type: 'custom',
  },
  {
    id: '2',
    position: { x: 0, y: 100 },
    data: { label: 'Node 2' },
    type: 'custom',
  },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

function CustomNode({ data }) {
  return (
    <div style={{ padding: 10, border: '1px solid #ddd', borderRadius: 5, background: '#fff' }}>
      <Handle type="target" position="top" id="port-1" style={{ background: '#555' }} />
      <div>{data.label}</div>
      <Handle type="source" position="bottom" id="port-2" style={{ background: '#555' }} />
    </div>
  );
}

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [response, setResponse] = useState(null);
  const [socket, setSocket] = useState(null);
  const [copiedNodes, setCopiedNodes] = useState([]);

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws');
    setSocket(ws);

    ws.onmessage = (event) => {
      const updatedFlow = JSON.parse(event.data);
      if (updatedFlow.nodes && updatedFlow.edges) {
        setNodes((prevNodes) => {
          const nodesMap = new Map(prevNodes.map((node) => [node.id, node]));
          updatedFlow.nodes.forEach((node) => {
            nodesMap.set(node.id, {
              ...nodesMap.get(node.id),
              ...node,
              data: {
                ...nodesMap.get(node.id)?.data,
                ...node.data,
              },
            });
          });
          return Array.from(nodesMap.values());
        });

        setEdges((prevEdges) => {
          const edgesMap = new Map(prevEdges.map((edge) => [edge.id, edge]));
          updatedFlow.edges.forEach((edge) => {
            edgesMap.set(edge.id, {
              ...edgesMap.get(edge.id),
              ...edge,
            });
          });
          return Array.from(edgesMap.values());
        });
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const onConnect = useCallback(
    (params) => {
      const updatedEdges = addEdge(params, edges);
      setEdges(updatedEdges);
      sendFlowToServer(nodes, updatedEdges);
    },
    [nodes, edges, socket]
  );

  const onNodeDoubleClick = useCallback(
    (event, node) => {
      const newLabel = prompt('Enter new label:', node.data.label);
      if (newLabel) {
        const updatedNodes = nodes.map((n) =>
          n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n
        );
        setNodes(updatedNodes);
        sendFlowToServer(updatedNodes, edges);
      }
    },
    [nodes, edges, socket]
  );

  const sendFlowToServer = (updatedNodes, updatedEdges) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    // Ensure that we're sending the latest version of nodes and edges to the server
    const flowData = {
      nodes: updatedNodes.map((node) => ({
        id: node.id,
        label: node.data.label,
        type: node.type || 'default',
        position: node.position,
        data: node.data,
      })),
      edges: updatedEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      })),
    };

    socket.send(JSON.stringify(flowData));
  };

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

    axios
      .post('http://127.0.0.1:8000/api/operation', flowData)
      .then((res) => {
        console.log('Response:', res.data);
        setResponse(res.data.result);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };

  const handleKeyDown = useCallback(
    (event) => {
      if (event.ctrlKey && event.key === 'c') {
        const selectedNodes = nodes.filter((node) => node.selected);
        setCopiedNodes(selectedNodes);
      }
      if (event.ctrlKey && event.key === 'v') {
        if (copiedNodes.length > 0) {
          const newNodes = copiedNodes.map((node) => ({
            ...node,
            id: uuidv4(),
            position: { x: node.position.x + 20, y: node.position.y + 20 }, // Offset copied node to make it visible
            selected: false,
          }));
          setNodes((nds) => nds.concat(newNodes));
          sendFlowToServer(nodes.concat(newNodes), edges);
        }
      }
    },
    [nodes, edges, copiedNodes, socket]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ custom: CustomNode }}
        onNodesChange={(changes) => {
          onNodesChange(changes);
          sendFlowToServer(nodes, edges);
        }}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
      >
        <Background />
      </ReactFlow>
      <button onClick={sendDataToBackend} style={{ position: 'absolute', top: 10, left: 10 }}>
        Send Data to Backend
      </button>
      {response && <p style={{ position: 'absolute', top: 50, left: 10 }}>Backend Response: {response}</p>}
    </div>
  );
}

export default App;