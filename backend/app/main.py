import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import academia, auth, chat, discover, feed, lucia, matches, moves, perfil, planos, treino
from app.services.move_service import MoveService

_uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
_move_service = MoveService()

INTERVALO_LIMPEZA_SEGUNDOS = 3600


async def _limpar_moves_periodicamente():
    while True:
        try:
            await run_in_threadpool(_move_service.limpar_expirados, _uploads_dir)
        except Exception:
            pass
        await asyncio.sleep(INTERVALO_LIMPEZA_SEGUNDOS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    tarefa = asyncio.create_task(_limpar_moves_periodicamente())
    yield
    tarefa.cancel()
    try:
        await tarefa
    except asyncio.CancelledError:
        pass


app = FastAPI(title="GymMatch API", description="Trabalho de POO — back-end em Python/FastAPI",
              lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(_uploads_dir, exist_ok=True)
os.makedirs(os.path.join(_uploads_dir, "moves"), exist_ok=True)
os.makedirs(os.path.join(_uploads_dir, "feed"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")

app.include_router(auth.router)
app.include_router(perfil.router)
app.include_router(academia.router)
app.include_router(discover.router)
app.include_router(matches.router)
app.include_router(chat.router)
app.include_router(planos.router)
app.include_router(moves.router)
app.include_router(feed.router)
app.include_router(treino.router)
app.include_router(lucia.router)


@app.get("/")
def raiz():
    return {"status": "ok", "app": "GymMatch API"}
