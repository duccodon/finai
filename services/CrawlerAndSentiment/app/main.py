from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import main_router

app = FastAPI(
    title="Financial News Microservice",
    description="A microservice to fetch and serve real-time financial news for specific assets.",
    version="1.0.0",
)

# Critical for microservices: Allow frontend or other services to call this one.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development. Restrict this in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(main_router.main_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Financial News Microservice is operational"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "port": 5003}