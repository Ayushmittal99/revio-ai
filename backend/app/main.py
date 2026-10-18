import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import get_settings
from app.core.errors import AppError
from app.services.sentiment import engine
from app.services.store import store

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Revio AI API", version="0.1.0",
              description="Independent prototype: customer review intelligence. Not an official Cynbit feature.")
app.add_middleware(CORSMiddleware, allow_origins=get_settings().allowed_origins, allow_methods=["GET", "POST", "DELETE"],
                   allow_headers=["*"])


@app.exception_handler(AppError)
async def app_error(_: Request, exc: AppError):
    return JSONResponse(status_code=exc.status, content={"error": {"code": exc.code, "message": exc.message}})


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": {"code": "validation_error", "message": "Invalid request parameters."}})


@app.exception_handler(Exception)
async def unexpected(_: Request, exc: Exception):
    logging.getLogger("revio").exception("Unhandled error")
    return JSONResponse(status_code=500, content={"error": {"code": "internal_error", "message": "Something went wrong on the server."}})


@app.get("/health")
def health():
    s = get_settings()
    return {"status": "ok", "version": "0.1.0", "sentiment": engine.status(),
            "llm": {"configured": s.llm_configured, "enabled": s.llm_enabled},
            "has_dataset": store.dataset is not None,
            "privacy": "Data stays in this server's memory. Review text is sent to an external service only if an LLM is configured."}


app.include_router(router)
