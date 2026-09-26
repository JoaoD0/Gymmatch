from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_usuario_atual
from app.models.usuario import Usuario
from app.repositories.perfil_repository import PerfilRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.schemas import (
    CurtidasRecebidasResponse,
    CurtirRequest,
    CurtirResponse,
    PerfilParaDescobrirResponse,
    RecusarRequest,
)
from app.services.discover_service import (
    DesfazerNaoPermitidoError,
    DiscoverService,
    LimiteCurtidasError,
    LimiteMatchesError,
    SemAcademiaError,
)
from app.services.plano_service import PlanoService

router = APIRouter(prefix="/discover", tags=["discover"])
_discover = DiscoverService()
_perfis = PerfilRepository()
_usuarios = UsuarioRepository()
_planos = PlanoService()


@router.get("", response_model=list[PerfilParaDescobrirResponse])
def listar_para_descobrir(usuario: Usuario = Depends(get_usuario_atual)):
    try:
        candidatos = _discover.listar_com_presenca(usuario)
    except SemAcademiaError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    resultado = []
    for candidato, na_academia_agora in candidatos:
        perfil = _perfis.buscar_por_usuario(candidato.id)
        resultado.append({
            "usuario": candidato.to_dict(),
            "perfil": DiscoverService.perfil_para_descobrir(perfil) if perfil else None,
            "na_academia_agora": na_academia_agora,
        })
    return resultado


@router.post("/curtir", response_model=CurtirResponse)
def curtir(dados: CurtirRequest, usuario: Usuario = Depends(get_usuario_atual)):
    if dados.para_usuario_id == usuario.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="Não é possível curtir a si mesmo")

    plano = _planos.plano_atual(usuario.id)
    try:
        match = _discover.curtir(usuario.id, dados.para_usuario_id, plano)
    except LimiteCurtidasError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={
            "motivo": "limite_curtidas",
            "mensagem": "Você usou as 20 curtidas do dia. Volte amanhã ou assine para ter ilimitadas.",
        })
    except LimiteMatchesError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={
            "motivo": "limite_matches",
            "mensagem": "Você chegou no máximo de matches do seu plano.",
        })

    if match:
        return {"match": True, "match_id": match.id}
    return {"match": False, "match_id": None}


@router.post("/recusar", status_code=status.HTTP_204_NO_CONTENT)
def recusar(dados: RecusarRequest, usuario: Usuario = Depends(get_usuario_atual)):
    if dados.para_usuario_id == usuario.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                             detail="Não é possível recusar a si mesmo")
    _discover.recusar(usuario.id, dados.para_usuario_id)


@router.delete("/curtir/{para_usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def desfazer_curtida(para_usuario_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    plano = _planos.plano_atual(usuario.id)
    try:
        _discover.desfazer_curtida(usuario.id, para_usuario_id, plano)
    except DesfazerNaoPermitidoError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={
            "motivo": "desfazer",
            "mensagem": "Essa função é exclusiva dos planos Gold e Diamond.",
        })


@router.get("/curtidas-recebidas", response_model=CurtidasRecebidasResponse)
def listar_curtidas_recebidas(usuario: Usuario = Depends(get_usuario_atual)):
    plano = _planos.plano_atual(usuario.id)
    curtidas, total = _discover.listar_curtidas_recebidas(usuario.id, plano)

    resultado = []
    for c in curtidas:
        outro = _usuarios.buscar_por_id(c.de_usuario_id)
        if not outro:
            continue
        perfil = _perfis.buscar_por_usuario(outro.id)
        resultado.append({
            "usuario": outro.to_dict(),
            "perfil": DiscoverService.perfil_para_descobrir(perfil) if perfil else None,
        })

    return {"total": total, "curtidas": resultado}
