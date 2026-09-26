import os
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.deps import get_usuario_atual
from app.models.usuario import Usuario
from app.repositories.perfil_repository import PerfilRepository
from app.schemas.schemas import CurtirPostResponse, FeedResponse, NovosPostsResponse, PostResponse
from app.services.feed_service import (
    DenunciarProprioPostError,
    FeedService,
    PostNaoEncontradoError,
    SemAcademiaError,
    SemPermissaoParaExcluirError,
)

router = APIRouter(prefix="/feed", tags=["feed"])
_feed = FeedService()
_perfis = PerfilRepository()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
FEED_DIR = os.path.join(UPLOADS_DIR, "feed")
EXTENSOES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}
TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024


@router.get("", response_model=FeedResponse)
def listar_feed(antes_de_id: int | None = None, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        return _feed.listar(usuario, antes_de_id)
    except SemAcademiaError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={
            "motivo": "sem_academia",
            "mensagem": str(e),
        })


@router.get("/novos", response_model=NovosPostsResponse)
def novos_posts(depois_de_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    return {"quantidade": _feed.contar_novos(usuario, depois_de_id)}


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def publicar_post(texto: str = Form(""), arquivo: UploadFile | None = File(None),
                         usuario: Usuario = Depends(get_usuario_atual)):
    foto_url = None
    caminho_arquivo = None

    if arquivo is not None and arquivo.filename:
        extensao = os.path.splitext(arquivo.filename)[1].lower()
        if extensao not in EXTENSOES_PERMITIDAS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                 detail="Formato de imagem não suportado (use jpg, png ou webp)")

        conteudo = await arquivo.read()
        if len(conteudo) > TAMANHO_MAXIMO_BYTES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                 detail="Imagem excede o tamanho máximo de 10MB")

        os.makedirs(FEED_DIR, exist_ok=True)
        nome_arquivo = f"post_{usuario.id}_{uuid.uuid4().hex}{extensao}"
        caminho_arquivo = os.path.join(FEED_DIR, nome_arquivo)
        with open(caminho_arquivo, "wb") as f:
            f.write(conteudo)
        foto_url = f"/uploads/feed/{nome_arquivo}"

    try:
        item = _feed.publicar(usuario, texto, foto_url)
    except SemAcademiaError as e:
        if caminho_arquivo and os.path.isfile(caminho_arquivo):
            os.remove(caminho_arquivo)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        if caminho_arquivo and os.path.isfile(caminho_arquivo):
            os.remove(caminho_arquivo)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    perfil = _perfis.buscar_por_usuario(usuario.id)
    item["autor"] = {"id": usuario.id, "nome": usuario.nome, "foto_url": perfil.foto_url if perfil else None}
    return item


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_post(post_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        post = _feed.excluir(usuario, post_id)
    except PostNaoEncontradoError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except SemPermissaoParaExcluirError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    if post.foto_url:
        caminho = os.path.join(FEED_DIR, os.path.basename(post.foto_url))
        if os.path.isfile(caminho):
            os.remove(caminho)


@router.post("/{post_id}/curtir", response_model=CurtirPostResponse)
def curtir_post(post_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        return _feed.curtir(usuario, post_id)
    except PostNaoEncontradoError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{post_id}/curtir", response_model=CurtirPostResponse)
def descurtir_post(post_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        return _feed.descurtir(usuario, post_id)
    except PostNaoEncontradoError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{post_id}/denunciar", status_code=status.HTTP_204_NO_CONTENT)
def denunciar_post(post_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        _feed.denunciar(usuario, post_id)
    except PostNaoEncontradoError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DenunciarProprioPostError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
