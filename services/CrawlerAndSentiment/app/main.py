from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import main_router

#from apscheduler.schedulers.asyncio import AsyncIOScheduler
#from controllers.NewsController import load_crypto_map

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

# scheduler = AsyncIOScheduler()

# @app.lifespan("startup")
# async def startup_event():
#     scheduler.start()
#     load_crypto_map()  # Ensure crypto_map is loaded at startup

@app.get("/health")
async def health_check():
    return {"status": "healthy", "port": 5003}