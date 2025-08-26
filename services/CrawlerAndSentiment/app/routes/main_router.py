from fastapi import APIRouter
from app.routes import news

main_router = APIRouter()


ROUTES = [news.router]

for route in ROUTES:
    main_router.include_router(route, tags=route.tags)
