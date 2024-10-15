# main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging
import utils
import json
import uuid

logging.basicConfig(level=logging.DEBUG)

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = {}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client_id = str(uuid.uuid4())
    clients[client_id] = websocket
    try:
        # Send the client its ID
        await websocket.send_json({"type": "client_id", "client_id": client_id})

        # Broadcast the updated list of client IDs to all clients
        await broadcast_client_list()

        while True:
            data = await websocket.receive_text()
            logging.debug(data)
            message = json.loads(data)
            message["sender_id"] = client_id

            # Broadcast to all connected clients except the sender
            disconnected_clients = []
            for cid, client in clients.items():
                if cid != client_id:
                    try:
                        await client.send_text(json.dumps(message))
                    except Exception as e:
                        logging.error(f"Error sending to client {cid}: {e}")
                        disconnected_clients.append(cid)
            for cid in disconnected_clients:
                del clients[cid]
    except WebSocketDisconnect:
        if client_id in clients:
            del clients[client_id]
        # Broadcast the updated list of client IDs to all clients
        await broadcast_client_list()
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        if client_id in clients:
            del clients[client_id]
        await broadcast_client_list()

async def broadcast_client_list():
    client_ids = list(clients.keys())
    message = json.dumps({"type": "client_list", "clients": client_ids})
    disconnected_clients = []
    for cid, client in clients.items():
        try:
            await client.send_text(message)
        except Exception as e:
            logging.error(f"Error sending client list to client {cid}: {e}")
            disconnected_clients.append(cid)
    for cid in disconnected_clients:
        del clients[cid]

@app.post("/api/operation")
async def perform_operation(flow_data: dict):
    print(flow_data)
    return {"status": "success", "result": json.dumps(utils.get_registered_node())}

@app.post("/api/registered-nodes")
async def perform_operation():
    return json.dumps(utils.get_registered_node())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
