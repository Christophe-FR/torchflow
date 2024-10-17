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
import { FaBars, FaPlay, FaSearch } from 'react-icons/fa';

import '@xyflow/react/dist/style.css';

// Define the CustomNode component
function CustomNode({ data }) {
  const { label, in: inputs, out: outputs } = data;

  // Configuration for port spacing
  const portSpacing = 20; // Pixels between ports
  const baseHeight = 40; // Base height of the node

  // Determine the maximum number of ports on either side
  const maxPorts = Math.max(inputs.length, outputs.length, 1); // Ensure at least 1

  // Calculate the node's height dynamically
  const nodeHeight = baseHeight + (maxPorts - 1) * portSpacing;

  // Function to calculate the top position in percentage based on index and total ports
  const computeTopPercentage = (index, total) => {
    if (total === 1) return '50%';
    return `${((index + 1) / (total + 1)) * 100}%`;
  };

  return (
    <div
      style={{
        padding: 10,
        border: '1px solid #ddd',
        borderRadius: 5,
        background: '#fff',
        position: 'relative',
        width: '150px', // Optional: Set a fixed width for consistency
        height: `${nodeHeight}px`, // Dynamic height based on ports
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Input Handles */}
      {inputs &&
        inputs.map((input, index) => (
          <Handle
            key={`in-${index}`}
            type="target"
            position="left"
            id={`in-${input}`}
            style={{
              top: computeTopPercentage(index, inputs.length),
              background: '#555',
            }}
          />
        ))}

      {/* Node Label */}
      <div
        style={{
          textAlign: 'center',
          pointerEvents: 'none', // Allows clicking through the label if necessary
          zIndex: 1, // Ensure label is above handles
        }}
      >
        {label}
      </div>

      {/* Output Handles */}
      {outputs &&
        outputs.map((output, index) => (
          <Handle
            key={`out-${index}`}
            type="source"
            position="right"
            id={`out-${output}`}
            style={{
              top: computeTopPercentage(index, outputs.length),
              background: '#555',
            }}
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
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const [response, setResponse] = useState(null);
  const socketRef = useRef(null); // Use useRef to hold the WebSocket
  const [copiedNodes, setCopiedNodes] = useState([]);
  const [availableNodes, setAvailableNodes] = useState([]);
  const reactFlowWrapper = useRef(null);
  const [clientId, setClientId] = useState(null);
  const [connectedClients, setConnectedClients] = useState([]);
  const clientColors = useRef({});

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
        setAvailableNodes([]);
      });
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    if (socketRef.current) return; // Prevent multiple connections

    socketRef.current = new WebSocket('ws://127.0.0.1:8000/ws');

    socketRef.current.onopen = () => {
      console.log('WebSocket connection established');
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socketRef.current.onclose = () => {
      console.warn('WebSocket connection closed');
    };

    socketRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'client_id') {
          setClientId(message.client_id);
        } else if (message.type === 'client_list') {
          const uniqueClients = Array.from(new Set(message.clients));
          setConnectedClients(uniqueClients);

          // Assign colors to new clients
          uniqueClients.forEach((id) => {
            if (!clientColors.current[id]) {
              // Assign a random color
              clientColors.current[id] = '#' + Math.floor(Math.random() * 16777215).toString(16);
            }
          });
        } else if (message.type === 'flow_update') {
          const updatedFlow = message.data;
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
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, []);

  const sendFlowToServer = (updatedNodes, updatedEdges) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not open. Cannot send flow data to server.');
      return;
    }

    const flowData = {
      type: 'flow_update',
      data: {
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
      },
    };

    socketRef.current.send(JSON.stringify(flowData));
  };

  const onConnect = useCallback(
    (params) => {
      const updatedEdges = addEdge(params, edges);
      setEdges(updatedEdges);
      sendFlowToServer(nodes, updatedEdges);
    },
    [nodes, edges]
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
    [nodes, edges]
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
            position: { x: node.position.x + 20, y: node.position.y + 20 },
            selected: false,
          }));
          const updatedNodes = nodes.concat(newNodes);
          setNodes(updatedNodes);
          sendFlowToServer(updatedNodes, edges);
        }
      }
    },
    [nodes, edges, copiedNodes]
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
    [nodes, edges]
  );

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px',
          background: 'linear-gradient(to left, #d4d3d3, #ee5d5b)',
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
          onClick={() => window.open('http://127.0.0.1:5000', '_blank')}
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
        {/* Display connected clients as overlapping circles */}
        <div
          style={{
            display: 'flex',
            marginLeft: 'auto',
            marginRight: '20px',
          }}
        >
          {connectedClients.map((id, index) => (
            <div
              key={id}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: clientColors.current[id] || '#61dafb',
                border: id === clientId ? '2px solid #fff' : 'none',
                marginLeft: index === 0 ? 0 : -10,
              }}
            ></div>
          ))}
        </div>
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
