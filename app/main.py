from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pymoex.exceptions import InstrumentNotFoundError
from starlette.responses import JSONResponse

from app.api.moex import router as api_moex_router
from app.api.portfolio import router as api_portfolio_router
from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo
from app.web.router import router as web_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(title="Target Portfolio API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WEB
app.include_router(web_router)

# API
app.include_router(api_portfolio_router, prefix="/api")
app.include_router(api_moex_router, prefix="/api")

# STATIC
app.mount("/static", StaticFiles(directory="app/web/static"), name="static")


@app.exception_handler(InstrumentNotFoundError)
async def instrument_not_found_handler(request, exc: InstrumentNotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})
