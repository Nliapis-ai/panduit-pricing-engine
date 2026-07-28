from fastapi import FastAPI
from app.api.health import router as health_router
from app.api.upload import router as upload_router
from app.api.process import router as process_router

app = FastAPI(title='Panduit Pricing Engine')
app.include_router(health_router)
app.include_router(upload_router)
app.include_router(process_router)
