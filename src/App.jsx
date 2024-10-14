// App.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  Handle,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { FaBars, FaPlay, FaSearch } from 'react-icons/fa'; // Importing icons from react-icons

import '@xyflow/react/dist/style.css';

// Define the CustomNode component
function CustomNode({ data }) {
  const { label, in: inputs, out: outputs } = data;

  return (
    <div
      style={{
        padding: 10,
        border: '1px solid #ddd',
        borderRadius: 5,
        background: '#fff',
        position: 'relative',
      }}
    >
      {inputs &&
        inputs.map((input, index) => (
          <Handle
            key={`in-${index}`}
            type="target"
            position="left"
            id={`in-${input}`}
            style={{ top: 10 + index * 20 }}
          />
        ))}
      <div>{label}</div>
      {outputs &&
        outputs.map((output, index) => (
          <Handle
            key={`out-${index}`}
            type="source"
            position="right"
            id={`out-${output}`}
            style={{ top: 10 + index * 20 }}
          />
        ))}
    </div>
  );
}

// Define nodeTypes outside the App component
const nodeTypes = { custom: CustomNode };

// Start with empty initial nodes and edges
const initialNodes = [];
const initialEdges = [];

// Sidebar component
const Sidebar = ({ availableNodes }) => {
  const onDragStart = (event, nodeData) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside
      style={{
        width: '200px',
        padding: '10px',
        borderRight: '1px solid #ddd',
        background: '#f0f0f0',
      }}
    >
      <div className="description">Drag and drop these nodes to the canvas:</div>
      {Array.isArray(availableNodes) && availableNodes.length > 0 ? (
        availableNodes.map((node) => (
          <div
            key={node.class}
            onDragStart={(event) => onDragStart(event, node)}
            draggable
            style={{
              margin: '10px 0',
              padding: '10px',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: '5px',
              cursor: 'grab',
            }}
          >
            {node.class}
          </div>
        ))
      ) : (
        <div>No nodes available</div>
      )}
    </aside>
  );
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [response, setResponse] = useState(null);
  const [socket, setSocket] = useState(null);
  const [copiedNodes, setCopiedNodes] = useState([]);
  const [availableNodes, setAvailableNodes] = useState([]); // Initialize as empty array
  const reactFlowWrapper = useRef(null);

  // Fetch available nodes from the backend
  useEffect(() => {
    axios
      .post('http://127.0.0.1:8000/api/registered-nodes')
      .then((response) => {
        console.log('Registered Nodes Response:', response.data);
        let data = response.data;

        // If the response is a string, parse it
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (error) {
            console.error('Error parsing response data:', error);
            setAvailableNodes([]);
            return;
          }
        }

        if (Array.isArray(data)) {
          setAvailableNodes(data);
        } else {
          console.error('Unexpected response format:', data);
          setAvailableNodes([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching registered nodes:', error);
        setAvailableNodes([]); // Ensure availableNodes is always an array
      });
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws');

    ws.onopen = () => {
      console.log('WebSocket connection established');
      setSocket(ws);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.warn('WebSocket connection closed');
      setSocket(null);
    };

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

  const sendFlowToServer = (updatedNodes, updatedEdges) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not open. Cannot send flow data to server.');
      return;
    }

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
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })),
    };

    socket.send(JSON.stringify(flowData));
  };

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
      if (newLabel !== null) {
        const updatedNodes = nodes.map((n) =>
          n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n
        );
        setNodes(updatedNodes);
        sendFlowToServer(updatedNodes, edges);
      }
    },
    [nodes, edges, socket]
  );

  const sendDataToBackend = () => {
    const flowData = {
      nodes: nodes.map((node) => ({
        id: node.id,
        label: node.data.label,
        type: node.type || 'default',
        data: node.data,
      })),
      edges: edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
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
            position: { x: node.position.x + 20, y: node.position.y + 20 }, // Offset copied node
            selected: false,
          }));
          const updatedNodes = nodes.concat(newNodes);
          setNodes(updatedNodes);
          sendFlowToServer(updatedNodes, edges);
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

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const nodeDataString = event.dataTransfer.getData('application/reactflow');

      if (!nodeDataString) {
        return;
      }

      const nodeData = JSON.parse(nodeDataString);

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };
      
      const newNode = {
        id: uuidv4(),
        type: 'custom',
        position,
        data: {
          label: nodeData.class,
          class: nodeData.class,
          params: nodeData.params,
          in: nodeData.in,
          out: nodeData.out,
        },
      };

      const updatedNodes = nodes.concat(newNode);
      setNodes(updatedNodes);
      sendFlowToServer(updatedNodes, edges);
    },
    [nodes, edges, socket]
  );

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px',
          background: '#282c34',
          color: 'white',
          height: '50px',
        }}
      >
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            marginRight: '20px',
          }}
          aria-label="Menu"
        >
          <FaBars />
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            marginRight: '20px',
          }}
          aria-label="Play"
        >
          <FaPlay />
        </button>
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
          }}
          aria-label="Search"
        >
          <FaSearch />
        </button>
      </div>
      
      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar availableNodes={availableNodes} />
        <div ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={(changes) => {
              const updatedNodes = applyNodeChanges(changes, nodes);
              setNodes(updatedNodes);
              sendFlowToServer(updatedNodes, edges);
            }}
            onEdgesChange={(changes) => {
              const updatedEdges = applyEdgeChanges(changes, edges);
              setEdges(updatedEdges);
              sendFlowToServer(nodes, updatedEdges);
            }}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
          >
            <Background />
          </ReactFlow>
          <button
            onClick={sendDataToBackend}
            style={{ position: 'absolute', top: 10, left: 10 }}
          >
            Send Data to Backend
          </button>
          {response && (
            <p style={{ position: 'absolute', top: 50, left: 10 }}>
              Backend Response: {response}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
