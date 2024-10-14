from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging
import utils
import json

logging.basicConfig(level=logging.DEBUG)


app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = []

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logging.debug(data)
            # Broadcast to all connected clients except the sender
            for client in clients:
                if client != websocket:
                    await client.send_text(data)
    except WebSocketDisconnect:
        clients.remove(websocket)

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