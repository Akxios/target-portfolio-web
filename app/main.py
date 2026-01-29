from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pymoex.exceptions import InstrumentNotFoundError
from starlette.responses import JSONResponse

from app.api.moex import router as api_moex_router
from app.api.portfolio import router as api_portfolio_router
from app.core.database import close_mongo_connection, connect_to_mongo
from app.web.router import router as web_router

app = FastAPI(title="Target Portfolio API")

origins = ["http://localhost", "http://localhost:8000", "http://127.0.0.1:8000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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


@app.on_event("startup")
async def startup():
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()
