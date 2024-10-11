from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, you can restrict it to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/operation")
async def handle_operation(flow_data: dict):
    # For demonstration purposes, we'll just return a success message with node count
    result = {
        "message": "Flow data received successfully",
    }
    return {"result": result}

@app.get("/")
async def root():
    return {"message": "API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)