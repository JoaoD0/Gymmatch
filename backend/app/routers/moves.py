import os
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status

from app.deps import get_usuario_atual
from app.models.move import TAGS_TREINO
from app.models.usuario import Usuario
from app.schemas.schemas import MoveResponse, MovesResponse
from app.services.move_service import (
    DenunciarProprioMoveError,
    LimiteMovesAtivosError,
    MoveNaoEncontradoError,
    MoveNaoPertenceAoUsuarioError,
    MoveService,
)

router = APIRouter(prefix="/moves", tags=["moves"])
_moves = MoveService()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
MOVES_DIR = os.path.join(UPLOADS_DIR, "moves")
EXTENSOES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}
TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024


@router.get("", response_model=MovesResponse)
def listar_moves(usuario: Usuario = Depends(get_usuario_atual)):
    return _moves.listar_para_usuario(usuario)


@router.post("", response_model=MoveResponse, status_code=status.HTTP_201_CREATED)
async def publicar_move(arquivo: UploadFile, texto: str = Form(""), tag: str | None = Form(None),
                         usuario: Usuario = Depends(get_usuario_atual)):
    extensao = os.path.splitext(arquivo.filename or "")[1].lower()
    if extensao not in EXTENSOES_PERMITIDAS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="Formato de imagem não suportado (use jpg, png ou webp)")

    conteudo = await arquivo.read()
    if len(conteudo) > TAMANHO_MAXIMO_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="Imagem excede o tamanho máximo de 10MB")

    tag_normalizada = tag or None
    if tag_normalizada and tag_normalizada not in TAGS_TREINO:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                             detail=f"Tag inválida: {tag_normalizada}")

    os.makedirs(MOVES_DIR, exist_ok=True)
    nome_arquivo = f"move_{usuario.id}_{uuid.uuid4().hex}.jpg"
    caminho_arquivo = os.path.join(MOVES_DIR, nome_arquivo)
    with open(caminho_arquivo, "wb") as f:
        f.write(conteudo)
    foto_url = f"/uploads/moves/{nome_arquivo}"

    try:
        move = _moves.criar(usuario.id, texto, tag_normalizada, foto_url)
    except LimiteMovesAtivosError as e:
        os.remove(caminho_arquivo)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        os.remove(caminho_arquivo)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    return move.to_dict()


@router.delete("/{move_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_move(move_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        move = _moves.deletar(move_id, usuario.id)
    except MoveNaoEncontradoError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except MoveNaoPertenceAoUsuarioError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    caminho = os.path.join(MOVES_DIR, os.path.basename(move.foto_url))
    if os.path.isfile(caminho):
        os.remove(caminho)


@router.post("/{move_id}/denunciar", status_code=status.HTTP_204_NO_CONTENT)
def denunciar_move(move_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        _moves.denunciar(usuario.id, move_id)
    except MoveNaoEncontradoError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DenunciarProprioMoveError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
