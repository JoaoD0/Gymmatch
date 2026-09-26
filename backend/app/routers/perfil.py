import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.deps import get_usuario_atual
from app.models.foto_perfil import FotoPerfil
from app.models.perfil import Perfil
from app.models.usuario import Usuario
from app.repositories.foto_perfil_repository import FotoPerfilRepository
from app.repositories.perfil_repository import PerfilRepository
from app.schemas.schemas import (
    BoostResponse,
    FotoGaleriaResponse,
    FotoPerfilResponse,
    PerfilRequest,
    PerfilResponse,
    TrocarFotosRequest,
)
from app.services.boost_service import BoostJaAtivoError, BoostService
from app.services.feed_service import FeedService
from app.services.plano_service import PlanoService

router = APIRouter(prefix="/perfil", tags=["perfil"])
_perfis = PerfilRepository()
_fotos = FotoPerfilRepository()
_boosts = BoostService()
_planos = PlanoService()
_feed = FeedService()

EXERCICIOS_PR = {
    "pr_supino": "Supino",
    "pr_agachamento": "Agachamento",
    "pr_terra": "Terra",
}

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
EXTENSOES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}
TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024
MAXIMO_FOTOS_GALERIA = 6


def _validar_imagem(arquivo: UploadFile, conteudo: bytes) -> str:
    extensao = os.path.splitext(arquivo.filename or "")[1].lower()
    if extensao not in EXTENSOES_PERMITIDAS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="Formato de imagem não suportado (use jpg, png ou webp)")
    if len(conteudo) > TAMANHO_MAXIMO_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="Imagem excede o tamanho máximo de 5MB")
    return extensao


def _salvar_arquivo(usuario_id: int, extensao: str, conteudo: bytes) -> str:
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    nome_arquivo = f"usuario_{usuario_id}_{uuid.uuid4().hex}{extensao}"
    with open(os.path.join(UPLOADS_DIR, nome_arquivo), "wb") as f:
        f.write(conteudo)
    return f"/uploads/{nome_arquivo}"


@router.get("/me", response_model=PerfilResponse | None)
def obter_meu_perfil(usuario: Usuario = Depends(get_usuario_atual)):
    perfil = _perfis.buscar_por_usuario(usuario.id)
    if not perfil:
        return None
    dados = perfil.to_dict()
    boost = _boosts.buscar_ativo(usuario.id)
    dados["boost_expira_em"] = boost.expira_em.isoformat() if boost else None
    dados["plano"] = _planos.plano_atual(usuario.id).chave
    return dados


@router.put("/me", response_model=PerfilResponse)
def atualizar_meu_perfil(dados: PerfilRequest, usuario: Usuario = Depends(get_usuario_atual)):
    perfil_atual = _perfis.buscar_por_usuario(usuario.id)

    try:
        perfil = Perfil(
            usuario_id=usuario.id,
            bio=dados.bio,
            objetivo=dados.objetivo,
            nivel=dados.nivel,
            modalidades=dados.modalidades,
            idade=dados.idade,
            telefone=dados.telefone,
            cpf=dados.cpf,
            genero=dados.genero,
            orientacao_sexual=dados.orientacao_sexual,
            procurando=dados.procurando,
            aberto_a=dados.aberto_a,
            mostrar_para=dados.mostrar_para,
            quando_treina=dados.quando_treina,
            divisao_treino=dados.divisao_treino,
            interesses=dados.interesses,
            foto_url=perfil_atual.foto_url if perfil_atual else None,
            ocultar_objetivo=dados.ocultar_objetivo,
            ocultar_orientacao=dados.ocultar_orientacao,
            ocultar_horarios=dados.ocultar_horarios,
            pr_supino=dados.pr_supino,
            pr_agachamento=dados.pr_agachamento,
            pr_terra=dados.pr_terra,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    if dados.aceitar_termos:
        perfil.aceitar_termos()
    elif perfil_atual:
        perfil._termos_aceitos_em = perfil_atual.termos_aceitos_em

    _perfis.salvar(perfil)

    # publica um post de "novo recorde" no feed só para os PRs que SUBIRAM neste salvamento
    recordes_que_subiram = {}
    for campo, nome_exercicio in EXERCICIOS_PR.items():
        valor_novo = getattr(perfil, campo)
        valor_antigo = getattr(perfil_atual, campo) if perfil_atual else None
        if valor_novo is not None and (valor_antigo is None or valor_novo > valor_antigo):
            recordes_que_subiram[nome_exercicio] = valor_novo
    if recordes_que_subiram:
        _feed.publicar_recorde(usuario, recordes_que_subiram)

    dados_resposta = perfil.to_dict()
    boost = _boosts.buscar_ativo(usuario.id)
    dados_resposta["boost_expira_em"] = boost.expira_em.isoformat() if boost else None
    dados_resposta["plano"] = _planos.plano_atual(usuario.id).chave
    return dados_resposta


@router.post("/me/foto", response_model=FotoPerfilResponse)
async def enviar_foto_perfil(arquivo: UploadFile, usuario: Usuario = Depends(get_usuario_atual)):
    if not _perfis.buscar_por_usuario(usuario.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="Salve o restante do perfil antes de enviar a foto")

    conteudo = await arquivo.read()
    extensao = _validar_imagem(arquivo, conteudo)
    foto_url = _salvar_arquivo(usuario.id, extensao, conteudo)

    _perfis.salvar_foto_url(usuario.id, foto_url)
    return {"foto_url": foto_url}


# ---------- galeria ----------
@router.get("/me/fotos", response_model=list[FotoGaleriaResponse])
def listar_minhas_fotos(usuario: Usuario = Depends(get_usuario_atual)):
    return [f.to_dict() for f in _fotos.listar_por_usuario(usuario.id)]


@router.post("/me/fotos", response_model=FotoGaleriaResponse, status_code=status.HTTP_201_CREATED)
async def adicionar_foto_galeria(arquivo: UploadFile, usuario: Usuario = Depends(get_usuario_atual)):
    total_atual = _fotos.contar_por_usuario(usuario.id)
    if total_atual >= MAXIMO_FOTOS_GALERIA:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail=f"Máximo de {MAXIMO_FOTOS_GALERIA} fotos na galeria")

    conteudo = await arquivo.read()
    extensao = _validar_imagem(arquivo, conteudo)
    url = _salvar_arquivo(usuario.id, extensao, conteudo)

    foto = FotoPerfil(id=None, usuario_id=usuario.id, url=url, posicao=total_atual)
    _fotos.criar(foto)
    return foto.to_dict()


@router.delete("/me/fotos/{foto_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_foto_galeria(foto_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    foto = _fotos.buscar_por_id(foto_id)
    if not foto or foto.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foto não encontrada")

    _fotos.deletar(foto_id)
    caminho = os.path.join(UPLOADS_DIR, os.path.basename(foto.url))
    if os.path.isfile(caminho):
        os.remove(caminho)


@router.put("/me/fotos/trocar", response_model=list[FotoGaleriaResponse])
def trocar_posicao_fotos(dados: TrocarFotosRequest, usuario: Usuario = Depends(get_usuario_atual)):
    foto_a = _fotos.buscar_por_id(dados.foto_a)
    foto_b = _fotos.buscar_por_id(dados.foto_b)

    if not foto_a or not foto_b or foto_a.usuario_id != usuario.id or foto_b.usuario_id != usuario.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foto não encontrada")

    _fotos.trocar_posicoes(foto_a.id, foto_a.posicao, foto_b.id, foto_b.posicao)
    return [f.to_dict() for f in _fotos.listar_por_usuario(usuario.id)]


# ---------- boost ----------
@router.post("/me/boost", response_model=BoostResponse, status_code=status.HTTP_201_CREATED)
def ativar_boost(usuario: Usuario = Depends(get_usuario_atual)):
    try:
        boost = _boosts.ativar(usuario.id)
    except BoostJaAtivoError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return boost.to_dict()
