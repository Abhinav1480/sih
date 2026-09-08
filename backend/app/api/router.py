from fastapi import APIRouter
from app.api.endpoints import query, conversations, layers, alerts, export

api_router = APIRouter()

api_router.include_router(query.router, tags=["Marine Query Engine"])
api_router.include_router(conversations.router, tags=["Conversations & Context"])
api_router.include_router(layers.router, tags=["Geospatial Layers"])
api_router.include_router(alerts.router, tags=["Marine Hazard Bulletins"])
api_router.include_router(export.router, tags=["Advisory Reports"])
