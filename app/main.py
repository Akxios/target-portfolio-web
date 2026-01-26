from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymoex.exceptions import InstrumentNotFoundError
from starlette.responses import JSONResponse

from app.api.moex import router as api_moex_router
from app.api.portfolio import router as api_portfolio_router
from app.core.database import close_mongo_connection, connect_to_mongo

app = FastAPI(title="Target Portfolio API", description="API")

origins = ["http://localhost", "http://localhost:8000", "http://127.0.0.1:8000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_moex_router)
app.include_router(api_portfolio_router)


@app.exception_handler(InstrumentNotFoundError)
async def instrument_not_found_handler(request, exc: InstrumentNotFoundError):
    return JSONResponse(
        status_code=404,
        content={"detail": str(exc)},
    )


@app.on_event("startup")
async def startup():
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown():
    await close_mongo_connection()


@app.get("/")
def root():
    return {"status": "target-portfolio is running"}
